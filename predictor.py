"""
Sigma Edge — Live Prediction Pipeline.

Uses the proven Dixon-Coles model from backtest_v2 to generate
real-time signals from live odds data.

Architecture:
    1. Load all historical CSV data to build the StrengthModel
    2. Fit IsotonicCalibrators per league from all historical data
    3. Fetch live odds from The Odds API
    4. Run each fixture through the same signal pipeline as backtest
    5. Output actionable signals with Kelly sizing

Usage:
    python predictor.py                     # Scan all active leagues
    python predictor.py --bankroll 500      # Custom bankroll
    python predictor.py --json              # Output JSON for frontend
"""

from __future__ import annotations

import argparse
import json
import logging
import math
import os
import sys
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from datetime import datetime

from csv_loader import load_all_matches
from backtest_v2 import (
    StrengthModel,
    IsotonicCalibrator,
    LeagueParams,
    LEAGUE_PARAMS,
    DEFAULT_PARAMS,
    dixon_coles_wdl,
    EPSILON,
)

log = logging.getLogger(__name__)

# Map The Odds API sport keys to our league names (matching csv_loader)
SPORT_TO_LEAGUE = {
    "soccer_epl": "Premier League",
    "soccer_spain_la_liga": "La Liga",
    "soccer_france_ligue_one": "Ligue 1",
    # Serie A and Bundesliga disabled — no proven edge
}

# Map CSV league_id to our league name
LEAGUE_ID_TO_NAME = {
    "E0": "Premier League",
    "SP1": "La Liga",
    "I1": "Serie A",
    "D1": "Bundesliga",
    "F1": "Ligue 1",
}

# Team name mapping: Odds API names → CSV names (common differences)
TEAM_ALIASES = {
    # Premier League
    "Manchester United": "Man United",
    "Manchester City": "Man City",
    "Wolverhampton Wanderers": "Wolves",
    "Brighton and Hove Albion": "Brighton",
    "Nottingham Forest": "Nott'm Forest",
    "West Ham United": "West Ham",
    "Tottenham Hotspur": "Tottenham",
    "Newcastle United": "Newcastle",
    "Leicester City": "Leicester",
    "Sheffield United": "Sheffield United",
    "Leeds United": "Leeds",
    "AFC Bournemouth": "Bournemouth",
    "Ipswich Town": "Ipswich",
    "Luton Town": "Luton",
    # La Liga
    "Atletico Madrid": "Ath Madrid",
    "Athletic Bilbao": "Ath Bilbao",
    "Celta Vigo": "Celta",
    "Real Betis": "Betis",
    "Rayo Vallecano": "Vallecano",
    "Deportivo Alaves": "Alaves",
    "Real Valladolid": "Valladolid",
    "Real Sociedad": "Real Sociedad",
    # Ligue 1
    "Paris Saint Germain": "Paris SG",
    "Olympique Lyonnais": "Lyon",
    "Olympique de Marseille": "Marseille",
    "AS Monaco": "Monaco",
    "OGC Nice": "Nice",
    "Stade Rennais FC": "Rennes",
    "Stade de Reims": "Reims",
    "RC Strasbourg Alsace": "Strasbourg",
    "RC Lens": "Lens",
    "FC Lorient": "Lorient",
    "FC Nantes": "Nantes",
    "Toulouse FC": "Toulouse",
    "Montpellier HSC": "Montpellier",
    "Clermont Foot": "Clermont",
    "FC Metz": "Metz",
    "Stade Brestois 29": "Brest",
    "Le Havre AC": "Le Havre",
    "AJ Auxerre": "Auxerre",
    "Angers SCO": "Angers",
    "AS Saint-Etienne": "St Etienne",
}


@dataclass
class LiveSignal:
    """An actionable betting signal."""
    home_team: str
    away_team: str
    league: str
    sport_key: str
    commence_time: str
    outcome: str          # "Home", "Draw", "Away"
    model_prob: float
    calibrated_prob: float
    market_prob: float
    decimal_odds: float
    bookmaker: str
    ev: float
    edge: float
    kelly_pct: float
    stake_amount: float
    confidence: float     # calibrated / market ratio


def _resolve_team(name: str) -> str:
    """Map Odds API team name to CSV team name."""
    return TEAM_ALIASES.get(name, name)


def _best_odds(bookmakers: list[dict], outcome_idx: int) -> tuple[float, str]:
    """Find the best (highest) odds for a given outcome across bookmakers.
    outcome_idx: 0=home, 1=draw, 2=away in h2h market.
    """
    best_price = 0.0
    best_book = ""
    for bm in bookmakers:
        for market in bm.get("markets", []):
            if market.get("key") != "h2h":
                continue
            outcomes = market.get("outcomes", [])
            if len(outcomes) < 3:
                continue
            price = outcomes[outcome_idx].get("price", 0)
            if price > best_price:
                best_price = price
                best_book = bm.get("title", "Unknown")
    return best_price, best_book


class LivePredictor:
    """
    Production prediction engine using the proven backtest model.

    Loads historical data, builds strength model + calibrators,
    then applies to live fixtures with real odds.
    """

    def __init__(self, bankroll: float = 1000.0, n_seasons: int = 5):
        self.bankroll = bankroll
        self.n_seasons = n_seasons
        self.model = StrengthModel()
        self.calibrators: dict[str, IsotonicCalibrator] = {}
        self._ready = False

    def initialize(self) -> None:
        """Load historical data and build model + calibrators."""
        log.info("Loading %d seasons of historical data...", self.n_seasons)

        leagues = list(LEAGUE_ID_TO_NAME.keys())
        matches = load_all_matches(leagues, self.n_seasons)
        log.info("Loaded %d historical matches.", len(matches))

        # Collect calibration data while recording matches
        cal_data: dict[str, list[tuple[float, bool]]] = defaultdict(list)

        for match in matches:
            league = match["league"]
            home = match["home_team"]
            away = match["away_team"]

            # Attempt prediction before recording (no look-ahead)
            lam_h = self.model.predict_lambda(home, away, True, league)
            lam_a = self.model.predict_lambda(away, home, False, league)

            if lam_h is not None and lam_a is not None:
                params = LEAGUE_PARAMS.get(league, DEFAULT_PARAMS)
                ph, pd, pa = dixon_coles_wdl(lam_h, lam_a, rho=params.rho)

                actual = match["result"]
                cal_data[league].append((ph, actual == "H"))
                cal_data[league].append((pd, actual == "D"))
                cal_data[league].append((pa, actual == "A"))

            self.model.record(match)

        # Fit calibrators
        for league, data in cal_data.items():
            cal = IsotonicCalibrator()
            cal.fit(data)
            self.calibrators[league] = cal
            if cal._fitted:
                log.info("  ✓ %s calibrator fitted on %d samples, %d bins",
                         league, len(data), len(cal.bins))

        self._ready = True
        log.info("Model ready. %d teams tracked.", len(self.model.teams))

    def scan_fixture(self, event: dict) -> list[LiveSignal]:
        """
        Scan a single fixture from The Odds API and return signals.

        event: dict from The Odds API sport/{key}/odds response
        """
        if not self._ready:
            raise RuntimeError("Call initialize() first")

        sport_key = event.get("sport_key", "")
        league = SPORT_TO_LEAGUE.get(sport_key)
        if not league:
            return []

        params = LEAGUE_PARAMS.get(league, DEFAULT_PARAMS)

        home_api = event.get("home_team", "")
        away_api = event.get("away_team", "")
        home = _resolve_team(home_api)
        away = _resolve_team(away_api)
        commence = event.get("commence_time", "")

        # Predict lambdas
        lam_h = self.model.predict_lambda(home, away, True, league)
        lam_a = self.model.predict_lambda(away, home, False, league)

        if lam_h is None or lam_a is None:
            log.debug("No strength data for %s vs %s", home, away)
            return []

        # Dixon-Coles WDL
        ph, pd, pa = dixon_coles_wdl(lam_h, lam_a, rho=params.rho)
        raw_probs = {"Home": ph, "Draw": pd, "Away": pa}

        # Get best odds per outcome
        bookmakers = event.get("bookmakers", [])
        if not bookmakers:
            return []

        signals = []
        outcome_map = {"Home": 0, "Draw": 1, "Away": 2}

        for outcome_name, outcome_idx in outcome_map.items():
            # Check if outcome allowed
            if outcome_name == "Home" and not params.allow_home:
                continue
            if outcome_name == "Draw" and not params.allow_draw:
                continue
            if outcome_name == "Away" and not params.allow_away:
                continue

            odds, bookmaker = _best_odds(bookmakers, outcome_idx)
            if odds <= 0:
                continue

            # Odds range filter
            if odds < params.odds_floor or odds > params.odds_ceiling:
                continue

            # Market implied probability (overround-removed)
            # Get all 3 implied probs for normalization
            odds_h, _ = _best_odds(bookmakers, 0)
            odds_d, _ = _best_odds(bookmakers, 1)
            odds_a, _ = _best_odds(bookmakers, 2)

            if odds_h <= 0 or odds_d <= 0 or odds_a <= 0:
                continue

            imp_h = 1.0 / odds_h
            imp_d = 1.0 / odds_d
            imp_a = 1.0 / odds_a
            overround = imp_h + imp_d + imp_a

            market_probs = {
                "Home": imp_h / overround,
                "Draw": imp_d / overround,
                "Away": imp_a / overround,
            }
            market_prob = market_probs[outcome_name]

            # Calibrate model probability
            raw_prob = raw_probs[outcome_name]
            cal = self.calibrators.get(league)
            calibrated_prob = cal.calibrate(raw_prob) if cal and cal._fitted else raw_prob

            # Blend model with market
            blended = params.model_weight * calibrated_prob + (1 - params.model_weight) * market_prob

            # Normalize blended across outcomes
            blended_all = {}
            for on in ["Home", "Draw", "Away"]:
                rp = raw_probs[on]
                cp = cal.calibrate(rp) if cal and cal._fitted else rp
                blended_all[on] = params.model_weight * cp + (1 - params.model_weight) * market_probs[on]

            total_b = sum(blended_all.values())
            if total_b > 0:
                blended = blended_all[outcome_name] / total_b

            # EV calculation
            ev = blended * odds - 1.0

            # Apply outcome-specific EV multiplier
            ev_threshold = params.ev_threshold
            if outcome_name == "Draw":
                ev_threshold *= params.draw_ev_mult
            elif outcome_name == "Home":
                ev_threshold *= params.home_ev_mult

            if ev < ev_threshold:
                continue

            # Edge filter
            edge = blended - market_prob
            if edge < params.min_edge:
                continue

            # Confidence filter
            confidence = blended / max(market_prob, EPSILON)
            if confidence < params.confidence_filter:
                continue

            # Kelly sizing
            q = 1 - blended
            kelly = (blended * odds - 1) / (odds - 1) if odds > 1 else 0
            kelly = max(0, kelly)
            kelly_used = kelly * params.kelly_fraction
            stake_pct = min(kelly_used, params.max_stake)
            stake_amount = self.bankroll * stake_pct

            if stake_amount < 1.0:
                continue

            signals.append(LiveSignal(
                home_team=home_api,
                away_team=away_api,
                league=league,
                sport_key=sport_key,
                commence_time=commence,
                outcome=outcome_name,
                model_prob=round(raw_prob, 4),
                calibrated_prob=round(calibrated_prob, 4),
                market_prob=round(market_prob, 4),
                decimal_odds=round(odds, 2),
                bookmaker=bookmaker,
                ev=round(ev, 4),
                edge=round(edge, 4),
                kelly_pct=round(stake_pct, 4),
                stake_amount=round(stake_amount, 2),
                confidence=round(confidence, 3),
            ))

        return signals

    def scan_all(self) -> list[LiveSignal]:
        """
        Fetch live odds from The Odds API and scan all fixtures.
        Returns sorted list of signals (best EV first).
        """
        try:
            from odds_api import get_odds
        except ImportError:
            log.error("odds_api module not available")
            return []

        all_signals = []

        for sport_key, league_name in SPORT_TO_LEAGUE.items():
            try:
                log.info("Fetching odds for %s (%s)...", league_name, sport_key)
                events = get_odds(sport_key)

                for event in events:
                    signals = self.scan_fixture(event)
                    all_signals.extend(signals)

                log.info("  → %d events, %d signals", len(events), len([s for s in all_signals if s.league == league_name]))

            except Exception as e:
                log.warning("Failed to fetch %s: %s", sport_key, e)

        # Sort by EV descending
        all_signals.sort(key=lambda s: s.ev, reverse=True)
        return all_signals

    def scan_from_events(self, events: list[dict]) -> list[LiveSignal]:
        """
        Scan pre-fetched events (for testing or when odds are
        supplied by the API backend directly).
        """
        all_signals = []
        for event in events:
            signals = self.scan_fixture(event)
            all_signals.extend(signals)
        all_signals.sort(key=lambda s: s.ev, reverse=True)
        return all_signals


def print_signals(signals: list[LiveSignal], bankroll: float) -> None:
    """Pretty-print signals to terminal."""
    if not signals:
        print("\n  No signals found. Markets are efficient right now.")
        return

    total_stake = sum(s.stake_amount for s in signals)
    total_exposure = total_stake / bankroll * 100

    print(f"\n{'═' * 78}")
    print(f"  SIGMA EDGE — LIVE SIGNALS")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M')} | Bankroll: ${bankroll:,.0f} | "
          f"Exposure: ${total_stake:,.0f} ({total_exposure:.1f}%)")
    print(f"{'═' * 78}")

    for i, s in enumerate(signals, 1):
        match = f"{s.home_team} vs {s.away_team}"
        print(f"\n  [{i}] {match}")
        print(f"      {s.league} | {s.commence_time[:16] if s.commence_time else 'TBD'}")
        print(f"      Signal: {s.outcome} @ {s.decimal_odds:.2f} ({s.bookmaker})")
        print(f"      Model: {s.model_prob*100:.1f}% → Cal: {s.calibrated_prob*100:.1f}% → "
              f"Blend: {(s.market_prob + s.edge)*100:.1f}% | Market: {s.market_prob*100:.1f}%")
        print(f"      EV: +{s.ev*100:.1f}% | Edge: +{s.edge*100:.1f}% | "
              f"Confidence: {s.confidence:.2f}x")
        print(f"      Stake: ${s.stake_amount:.0f} ({s.kelly_pct*100:.2f}% Kelly)")

    print(f"\n{'─' * 78}")
    print(f"  Total: {len(signals)} signals | ${total_stake:,.0f} staked | "
          f"{total_exposure:.1f}% exposure")
    print(f"{'═' * 78}\n")


def main():
    parser = argparse.ArgumentParser(description="Sigma Edge — Live Predictor")
    parser.add_argument("--bankroll", type=float, default=1000.0)
    parser.add_argument("--seasons", type=int, default=5,
                        help="Historical seasons for model training")
    parser.add_argument("--json", action="store_true",
                        help="Output JSON instead of pretty-print")
    parser.add_argument("--dry-run", action="store_true",
                        help="Initialize model only (skip live odds fetch)")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-7s  %(message)s",
        datefmt="%H:%M:%S",
    )

    predictor = LivePredictor(bankroll=args.bankroll, n_seasons=args.seasons)
    predictor.initialize()

    if args.dry_run:
        print(f"\nModel ready. {len(predictor.model.teams)} teams loaded.")
        print(f"Calibrators: {', '.join(f'{k} ({len(v.bins)} bins)' for k, v in predictor.calibrators.items() if v._fitted)}")
        return

    signals = predictor.scan_all()

    if args.json:
        output = {
            "generated_at": datetime.now().isoformat(),
            "bankroll": args.bankroll,
            "total_signals": len(signals),
            "total_exposure_pct": round(sum(s.kelly_pct for s in signals) * 100, 2),
            "signals": [asdict(s) for s in signals],
        }
        # Save to data/
        os.makedirs("data", exist_ok=True)
        path = os.path.join("data", "live_signals.json")
        with open(path, "w") as f:
            json.dump(output, f, indent=2)
        print(json.dumps(output, indent=2))
    else:
        print_signals(signals, args.bankroll)


if __name__ == "__main__":
    main()
