"""
Backtest Harness — Replay Historical Matches Through the Model.

Uses FREE CSV data from football-data.co.uk to:
  1. Build rolling Poisson priors from past N games
  2. Generate signals by comparing model prob vs bookmaker odds
  3. Apply fractional Kelly staking
  4. Track every signal outcome (W/L/P)
  5. Compute P&L, hit rate, ROI, max drawdown

This is a STANDALONE backtest — it does NOT depend on the SQLite database.
It replays CSV data chronologically, building history as it goes.

Usage:
    python backtest.py                     # Run with defaults
    python backtest.py --seasons 3         # Last 3 seasons
    python backtest.py --league E0         # Premier League only
    python backtest.py --ev-threshold 0.05 # 5% minimum edge
"""

from __future__ import annotations

import json
import logging
import math
import os
from collections import defaultdict
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Sequence

from csv_loader import load_all_matches

log = logging.getLogger(__name__)

# ─── Constants ────────────────────────────────────────────────────────────
WINDOW = 10                # Rolling window for Poisson λ
MIN_HISTORY = 6            # Minimum games before we generate signals
KELLY_FRACTION = 0.06      # ~1/16 Kelly (conservative until model proven)
MAX_STAKE_PCT = 0.025      # 2.5% max per bet
MIN_EV = 0.10              # 10% minimum edge (high selectivity)
MODEL_WEIGHT = 0.25        # 25% model, 75% market (market is sharper)
ODDS_FLOOR = 1.50          # Ignore odds below 1.50 (too juiceless)
ODDS_CEILING = 6.0         # Ignore longshots > 6.0 (too noisy)
EPSILON = 1e-12


# ─── Math utilities ──────────────────────────────────────────────────────

def _log_poisson_pmf(k: int, lam: float) -> float:
    if lam <= 0:
        return math.log(EPSILON)
    return k * math.log(lam) - lam - math.lgamma(k + 1)


def _logsumexp(terms: Sequence[float]) -> float:
    if not terms:
        return math.log(EPSILON)
    m = max(terms)
    return m + math.log(sum(math.exp(t - m) for t in terms))


def poisson_wdl(lam_home: float, lam_away: float, max_g: int = 8) -> tuple[float, float, float]:
    """Compute P(home_win), P(draw), P(away_win) from two Poisson goal processes."""
    log_h, log_d, log_a = [], [], []
    for h in range(max_g + 1):
        lp_h = _log_poisson_pmf(h, lam_home)
        for a in range(max_g + 1):
            lp_a = _log_poisson_pmf(a, lam_away)
            joint = lp_h + lp_a
            if h > a:
                log_h.append(joint)
            elif h == a:
                log_d.append(joint)
            else:
                log_a.append(joint)

    log_z = _logsumexp(log_h + log_d + log_a)
    p_h = math.exp(_logsumexp(log_h) - log_z)
    p_d = math.exp(_logsumexp(log_d) - log_z)
    p_a = math.exp(_logsumexp(log_a) - log_z)
    return p_h, p_d, p_a


def poisson_over_prob(lam: float, threshold: int, max_k: int = 30) -> float:
    """P(X >= threshold) under Poisson(lam)."""
    terms = [_log_poisson_pmf(k, lam) for k in range(threshold, max_k + 1)]
    return math.exp(_logsumexp(terms))


def kelly_fraction_calc(p: float, odds: float, fraction: float = KELLY_FRACTION) -> float:
    """Fractional Kelly stake as % of bankroll."""
    if odds <= 1.0 or p <= 0:
        return 0.0
    f = (p * odds - 1.0) / (odds - 1.0)
    f = max(0.0, min(f, 1.0))
    return min(f * fraction, MAX_STAKE_PCT)


# ─── Data containers ─────────────────────────────────────────────────────

@dataclass
class Signal:
    """A single backtest signal with outcome tracking."""
    date: str
    home_team: str
    away_team: str
    league: str

    market: str           # "h2h"
    outcome: str          # "Home" / "Draw" / "Away"
    model_prob: float
    market_prob: float
    decimal_odds: float
    ev: float
    kelly_pct: float
    stake_amount: float

    # Outcome (filled after match)
    actual_result: str    # "H" / "D" / "A"
    won: bool = False
    pnl: float = 0.0


@dataclass
class BacktestResult:
    """Complete backtest output."""
    start_date: str = ""
    end_date: str = ""
    total_matches: int = 0
    matches_with_signals: int = 0

    initial_bankroll: float = 1000.0
    final_bankroll: float = 1000.0

    signals: list[Signal] = field(default_factory=list)

    # Aggregate metrics
    total_signals: int = 0
    wins: int = 0
    losses: int = 0
    hit_rate: float = 0.0
    total_staked: float = 0.0
    total_pnl: float = 0.0
    roi_pct: float = 0.0
    max_drawdown_pct: float = 0.0
    best_streak: int = 0
    worst_streak: int = 0

    # Per-league breakdown
    league_stats: dict = field(default_factory=dict)
    # Per-market breakdown
    market_stats: dict = field(default_factory=dict)
    # Monthly P&L
    monthly_pnl: dict = field(default_factory=dict)
    # Bankroll history for charting
    bankroll_history: list[tuple[str, float]] = field(default_factory=list)

    # Calibration data: (predicted_prob, actual_outcome_bool) pairs
    calibration_data: list[tuple[float, bool]] = field(default_factory=list)


# ─── Core Backtest Engine ─────────────────────────────────────────────────

class BacktestEngine:
    """
    Replays historical matches chronologically, building rolling
    Poisson priors and scanning for EV edges vs bookmaker odds.
    """

    def __init__(
        self,
        bankroll: float = 1000.0,
        window: int = WINDOW,
        min_history: int = MIN_HISTORY,
        ev_threshold: float = MIN_EV,
        kelly_scale: float = KELLY_FRACTION,
        model_weight: float = MODEL_WEIGHT,
    ):
        self.initial_bankroll = bankroll
        self.bankroll = bankroll
        self.window = window
        self.min_history = min_history
        self.ev_threshold = ev_threshold
        self.kelly_scale = kelly_scale
        self.model_weight = model_weight

        # Rolling team history: team_name → list of match dicts (most recent last)
        self.team_goals: dict[str, list[int]] = defaultdict(list)
        self.team_conceded: dict[str, list[int]] = defaultdict(list)
        self.team_corners: dict[str, list[int]] = defaultdict(list)
        self.team_yellows: dict[str, list[int]] = defaultdict(list)
        self.team_reds: dict[str, list[int]] = defaultdict(list)
        self.team_home_goals: dict[str, list[int]] = defaultdict(list)
        self.team_away_goals: dict[str, list[int]] = defaultdict(list)

        # Referee history: referee_name → list of (total_yellows_in_match,)
        self.referee_cards: dict[str, list[int]] = defaultdict(list)

        # League averages (running) for strength adjustment
        self.league_goals: dict[str, list[float]] = defaultdict(list)

    def _team_lambda(self, team: str, stat_dict: dict[str, list[int]]) -> float | None:
        """Get rolling average (Poisson λ) for a team's stat."""
        history = stat_dict.get(team, [])
        if len(history) < self.min_history:
            return None
        recent = history[-self.window:]
        return sum(recent) / len(recent)

    def _record_match(self, match: dict) -> None:
        """Update rolling history after a match is played."""
        home = match["home_team"]
        away = match["away_team"]
        league = match["league"]

        self.team_goals[home].append(match["home_goals"])
        self.team_goals[away].append(match["away_goals"])
        self.team_conceded[home].append(match["away_goals"])
        self.team_conceded[away].append(match["home_goals"])
        self.team_home_goals[home].append(match["home_goals"])
        self.team_away_goals[away].append(match["away_goals"])

        # League average for strength calibration
        self.league_goals[league].append(match["home_goals"] + match["away_goals"])

        if match["home_corners"] is not None:
            self.team_corners[home].append(match["home_corners"])
        if match["away_corners"] is not None:
            self.team_corners[away].append(match["away_corners"])

        if match["home_yellows"] is not None:
            self.team_yellows[home].append(match["home_yellows"])
        if match["away_yellows"] is not None:
            self.team_yellows[away].append(match["away_yellows"])

        if match["home_reds"] is not None:
            self.team_reds[home].append(match["home_reds"])
        if match["away_reds"] is not None:
            self.team_reds[away].append(match["away_reds"])

        # Referee cards
        ref = match.get("referee")
        if ref and match["home_yellows"] is not None and match["away_yellows"] is not None:
            total_cards = (match["home_yellows"] + match["away_yellows"] +
                          (match["home_reds"] or 0) + (match["away_reds"] or 0))
            self.referee_cards[ref].append(total_cards)

    def _attack_defense_lambda(self, team: str, opponent: str, is_home: bool, league: str) -> float | None:
        """Compute strength-adjusted Poisson λ using attack/defense ratings.

        Instead of raw goal averages (which don't account for opponent quality),
        we use the Dixon-Coles style attack/defense strength model:
            λ_home = league_avg * attack_home * defense_away * home_advantage
        """
        scored = self.team_goals.get(team, [])
        conceded = self.team_conceded.get(team, [])
        opp_scored = self.team_goals.get(opponent, [])
        opp_conceded = self.team_conceded.get(opponent, [])

        if (len(scored) < self.min_history or len(opp_scored) < self.min_history):
            return None

        # League average goals per team per game
        league_history = self.league_goals.get(league, [])
        if len(league_history) < 20:
            league_avg = 1.35  # sensible default
        else:
            recent_league = league_history[-200:]
            league_avg = sum(recent_league) / len(recent_league) / 2.0  # per-team

        # Attack strength = team's goals / league average
        team_attack = (sum(scored[-self.window:]) / len(scored[-self.window:])) / max(league_avg, 0.5)
        # Defense weakness = opponent's conceded / league average
        opp_defense = (sum(opp_conceded[-self.window:]) / len(opp_conceded[-self.window:])) / max(league_avg, 0.5)

        lam = league_avg * team_attack * opp_defense

        # Home advantage adjustment (~+15%)
        if is_home:
            lam *= 1.15
        else:
            lam *= 0.88

        return max(lam, 0.1)

    def _scan_h2h(self, match: dict) -> list[Signal]:
        """Scan match-result (1X2) market for edges."""
        signals = []
        home = match["home_team"]
        away = match["away_team"]
        league = match["league"]

        lam_h = self._attack_defense_lambda(home, away, is_home=True, league=league)
        lam_a = self._attack_defense_lambda(away, home, is_home=False, league=league)
        if lam_h is None or lam_a is None:
            return signals

        # Model probabilities from Poisson
        p_home, p_draw, p_away = poisson_wdl(lam_h, lam_a)

        odds_h = match.get("odds_home")
        odds_d = match.get("odds_draw")
        odds_a = match.get("odds_away")

        if not odds_h or not odds_d or not odds_a:
            return signals
        if odds_h <= 1.0 or odds_d <= 1.0 or odds_a <= 1.0:
            return signals

        # Market-implied probs (remove overround)
        imp_h = 1.0 / odds_h
        imp_d = 1.0 / odds_d
        imp_a = 1.0 / odds_a
        total_imp = imp_h + imp_d + imp_a
        imp_h /= total_imp
        imp_d /= total_imp
        imp_a /= total_imp

        # Bayesian blend: lean on market (it's sharper), model only nudges
        mw = 1.0 - self.model_weight  # market weight
        blend_h = self.model_weight * p_home + mw * imp_h
        blend_d = self.model_weight * p_draw + mw * imp_d
        blend_a = self.model_weight * p_away + mw * imp_a

        # Calibration correction: shrink extreme model probs towards 1/3
        # This corrects the systematic overconfidence shown in backtest v1-v3
        BASE = 1.0 / 3.0
        SHRINK = 0.15  # 15% shrinkage towards uniform
        blend_h = blend_h * (1 - SHRINK) + BASE * SHRINK
        blend_d = blend_d * (1 - SHRINK) + BASE * SHRINK
        blend_a = blend_a * (1 - SHRINK) + BASE * SHRINK

        # Normalize blend
        total_blend = blend_h + blend_d + blend_a
        blend_h /= total_blend
        blend_d /= total_blend
        blend_a /= total_blend

        actual = match["result"]  # H / D / A

        for outcome, our_p, odds, result_char in [
            ("Home", blend_h, odds_h, "H"),
            ("Draw", blend_d, odds_d, "D"),
            ("Away", blend_a, odds_a, "A"),
        ]:
            # Filter: skip extreme odds
            if odds < ODDS_FLOOR or odds > ODDS_CEILING:
                continue

            market_p = 1.0 / odds
            ev = (our_p * odds) - 1.0

            if ev < self.ev_threshold:
                continue

            # Confidence filter: model must independently rate this outcome
            # at least 15% higher than the market to generate a signal.
            # This ensures we only bet when THE MODEL (not just the blend) sees value.
            model_prob_for_outcome = {"Home": p_home, "Draw": p_draw, "Away": p_away}[outcome]
            if model_prob_for_outcome < market_p * 1.15:
                continue

            kelly = kelly_fraction_calc(our_p, odds, self.kelly_scale)
            if kelly <= 0:
                continue
            stake = self.bankroll * kelly
            won = (actual == result_char)
            pnl = stake * (odds - 1.0) if won else -stake

            signals.append(Signal(
                date=match["date"],
                home_team=home,
                away_team=away,
                league=match["league"],
                market="h2h",
                outcome=outcome,
                model_prob=our_p,
                market_prob=market_p,
                decimal_odds=odds,
                ev=ev,
                kelly_pct=kelly,
                stake_amount=stake,
                actual_result=actual,
                won=won,
                pnl=pnl,
            ))

        return signals

    def _scan_corners(self, match: dict, line: float = 9.5) -> list[Signal]:
        """Scan corners over/under market."""
        signals = []
        home = match["home_team"]
        away = match["away_team"]

        lam_h = self._team_lambda(home, self.team_corners)
        lam_a = self._team_lambda(away, self.team_corners)
        if lam_h is None or lam_a is None:
            return signals

        combined_lam = lam_h + lam_a
        threshold = math.ceil(line)
        p_over = poisson_over_prob(combined_lam, threshold)
        p_under = 1.0 - p_over

        # We don't have corner market odds in basic CSV, but we can still
        # track model accuracy. Use synthetic odds based on fair probability
        # with a 5% margin to test calibration.
        # If actual corner odds were available, we'd use them.
        actual_corners = (match.get("home_corners") or 0) + (match.get("away_corners") or 0)
        if match.get("home_corners") is None:
            return signals

        actual_over = actual_corners >= threshold

        # For now, just record calibration data (no staking without real odds)
        # We can still measure if the model is well-calibrated
        return signals  # Corners staking requires real odds — skip for P&L

    def _scan_cards(self, match: dict, line: float = 3.5) -> list[Signal]:
        """Scan cards over/under market."""
        home = match["home_team"]
        away = match["away_team"]

        lam_h = self._team_lambda(home, self.team_yellows)
        lam_a = self._team_lambda(away, self.team_yellows)
        if lam_h is None or lam_a is None:
            return []

        # Blend with referee tendency if available
        ref = match.get("referee")
        ref_lam = None
        if ref and ref in self.referee_cards:
            ref_history = self.referee_cards[ref]
            if len(ref_history) >= 3:
                ref_lam = sum(ref_history[-10:]) / len(ref_history[-10:])

        # Blend team avg with referee: 65% team, 35% referee
        team_combined = lam_h + lam_a
        if ref_lam is not None:
            combined_lam = 0.65 * team_combined + 0.35 * ref_lam
        else:
            combined_lam = team_combined

        threshold = math.ceil(line)
        p_over = poisson_over_prob(combined_lam, threshold)

        actual_cards = ((match.get("home_yellows") or 0) + (match.get("away_yellows") or 0) +
                        (match.get("home_reds") or 0) + (match.get("away_reds") or 0))
        if match.get("home_yellows") is None:
            return []

        # Same issue — no card odds in basic CSV. Track calibration only.
        return []  # Cards staking requires real odds — skip for P&L

    def run(
        self,
        matches: list[dict],
    ) -> BacktestResult:
        """
        Run the full backtest on a sorted list of matches.

        Process:
        1. For each match (chronologically):
           a. Check if we have enough history for both teams
           b. If yes, scan for EV edges vs bookmaker odds
           c. Record any signals with outcomes
           d. Update bankroll
           e. Add match to rolling history
        """
        result = BacktestResult(
            initial_bankroll=self.initial_bankroll,
            final_bankroll=self.bankroll,
        )

        if not matches:
            return result

        result.start_date = matches[0]["date"]
        result.end_date = matches[-1]["date"]
        result.total_matches = len(matches)

        peak_bankroll = self.bankroll
        max_dd = 0.0
        current_streak = 0
        best_streak = 0
        worst_streak = 0

        for match in matches:
            # Scan for signals BEFORE recording the match (no future data leak)
            match_signals = self._scan_h2h(match)
            # Also collect calibration data from corners/cards models
            self._collect_calibration(match, result)

            if match_signals:
                result.matches_with_signals += 1

            for sig in match_signals:
                result.signals.append(sig)
                self.bankroll += sig.pnl
                result.total_staked += sig.stake_amount
                result.total_pnl += sig.pnl

                if sig.won:
                    result.wins += 1
                    current_streak = max(1, current_streak + 1) if current_streak >= 0 else 1
                else:
                    result.losses += 1
                    current_streak = min(-1, current_streak - 1) if current_streak <= 0 else -1

                best_streak = max(best_streak, current_streak)
                worst_streak = min(worst_streak, current_streak)

                # Track peak and drawdown
                peak_bankroll = max(peak_bankroll, self.bankroll)
                dd = (peak_bankroll - self.bankroll) / peak_bankroll if peak_bankroll > 0 else 0
                max_dd = max(max_dd, dd)

                # Monthly P&L
                month_key = match["date"][:7]  # "YYYY-MM"
                result.monthly_pnl[month_key] = result.monthly_pnl.get(month_key, 0) + sig.pnl

                # League breakdown
                league = match["league"]
                if league not in result.league_stats:
                    result.league_stats[league] = {"signals": 0, "wins": 0, "pnl": 0.0, "staked": 0.0}
                result.league_stats[league]["signals"] += 1
                result.league_stats[league]["wins"] += int(sig.won)
                result.league_stats[league]["pnl"] += sig.pnl
                result.league_stats[league]["staked"] += sig.stake_amount

                # Market breakdown
                mkt = sig.market
                if mkt not in result.market_stats:
                    result.market_stats[mkt] = {"signals": 0, "wins": 0, "pnl": 0.0, "staked": 0.0}
                result.market_stats[mkt]["signals"] += 1
                result.market_stats[mkt]["wins"] += int(sig.won)
                result.market_stats[mkt]["pnl"] += sig.pnl
                result.market_stats[mkt]["staked"] += sig.stake_amount

            # Record bankroll history (one point per match day)
            result.bankroll_history.append((match["date"], round(self.bankroll, 2)))

            # NOW record the match into history (after scanning)
            self._record_match(match)

        # Final metrics
        result.final_bankroll = self.bankroll
        result.total_signals = len(result.signals)
        result.hit_rate = result.wins / result.total_signals if result.total_signals > 0 else 0.0
        result.roi_pct = (result.total_pnl / result.total_staked * 100) if result.total_staked > 0 else 0.0
        result.max_drawdown_pct = max_dd * 100
        result.best_streak = best_streak
        result.worst_streak = abs(worst_streak)

        # Compute league-level hit rates
        for stats in result.league_stats.values():
            stats["hit_rate"] = stats["wins"] / stats["signals"] if stats["signals"] > 0 else 0.0
            stats["roi_pct"] = (stats["pnl"] / stats["staked"] * 100) if stats["staked"] > 0 else 0.0

        for stats in result.market_stats.values():
            stats["hit_rate"] = stats["wins"] / stats["signals"] if stats["signals"] > 0 else 0.0
            stats["roi_pct"] = (stats["pnl"] / stats["staked"] * 100) if stats["staked"] > 0 else 0.0

        return result

    def _collect_calibration(self, match: dict, result: BacktestResult) -> None:
        """Collect model vs actual data for calibration analysis."""
        home = match["home_team"]
        away = match["away_team"]
        league = match["league"]

        lam_h = self._attack_defense_lambda(home, away, is_home=True, league=league)
        lam_a = self._attack_defense_lambda(away, home, is_home=False, league=league)
        if lam_h is None or lam_a is None:
            return

        p_home, p_draw, p_away = poisson_wdl(lam_h, lam_a)
        actual = match["result"]

        result.calibration_data.append((p_home, actual == "H"))
        result.calibration_data.append((p_draw, actual == "D"))
        result.calibration_data.append((p_away, actual == "A"))


# ─── Report Rendering ────────────────────────────────────────────────────

def print_report(result: BacktestResult) -> None:
    """Print a beautiful ASCII report of backtest results."""
    print()
    print("╔══════════════════════════════════════════════════════════════════════╗")
    print("║               SIGMA EDGE — BACKTEST REPORT                         ║")
    print("╠══════════════════════════════════════════════════════════════════════╣")
    print(f"║  Period       : {result.start_date} → {result.end_date:<37}║")
    print(f"║  Matches      : {result.total_matches:<50}║")
    print(f"║  w/ Signals   : {result.matches_with_signals:<50}║")
    print("╠══════════════════════════════════════════════════════════════════════╣")
    print(f"║  Initial Bank : ${result.initial_bankroll:>10.2f}{'':<36}║")
    print(f"║  Final Bank   : ${result.final_bankroll:>10.2f}{'':<36}║")
    profit_str = f"{'+'if result.total_pnl >=0 else ''}{result.total_pnl:.2f}"
    print(f"║  Total P&L    : ${profit_str:>10}{'':<36}║")
    print(f"║  ROI          : {result.roi_pct:>+.2f}%{'':<43}║")
    print("╠══════════════════════════════════════════════════════════════════════╣")
    print(f"║  Total Signals: {result.total_signals:<50}║")
    print(f"║  Wins         : {result.wins:<50}║")
    print(f"║  Losses       : {result.losses:<50}║")
    print(f"║  Hit Rate     : {result.hit_rate:.1%}{'':<45}║")
    print(f"║  Max Drawdown : {result.max_drawdown_pct:.1f}%{'':<44}║")
    print(f"║  Best Streak  : {result.best_streak} wins{'':<42}║")
    print(f"║  Worst Streak : {result.worst_streak} losses{'':<40}║")
    print("╠══════════════════════════════════════════════════════════════════════╣")
    print("║  PER-LEAGUE BREAKDOWN                                              ║")
    print("╠══════════════════════════════════════════════════════════════════════╣")
    for league, stats in sorted(result.league_stats.items()):
        pnl_str = f"{'+'if stats['pnl']>=0 else ''}{stats['pnl']:.2f}"
        print(f"║  {league:<18} Signals: {stats['signals']:>4}  "
              f"Hit: {stats['hit_rate']:.0%}  "
              f"ROI: {stats['roi_pct']:>+6.1f}%  "
              f"P&L: ${pnl_str:>8} ║")
    print("╠══════════════════════════════════════════════════════════════════════╣")
    print("║  MONTHLY P&L                                                       ║")
    print("╠══════════════════════════════════════════════════════════════════════╣")
    for month, pnl in sorted(result.monthly_pnl.items()):
        bar_len = int(abs(pnl) / max(abs(v) for v in result.monthly_pnl.values()) * 30) if result.monthly_pnl else 0
        bar = ("█" * bar_len) if pnl >= 0 else ("░" * bar_len)
        print(f"║  {month}  {'+'if pnl>=0 else ''}{pnl:>8.2f}  {bar:<30}   ║")
    print("╠══════════════════════════════════════════════════════════════════════╣")
    print("║  CALIBRATION (model accuracy)                                      ║")
    print("╠══════════════════════════════════════════════════════════════════════╣")
    print_calibration(result.calibration_data)
    print("╚══════════════════════════════════════════════════════════════════════╝")


def print_calibration(calibration_data: list[tuple[float, bool]]) -> None:
    """Print a calibration table: predicted prob buckets vs actual frequency."""
    if not calibration_data:
        print("║  No calibration data available.                                    ║")
        return

    # Bucket into 10% bands
    buckets: dict[int, list[bool]] = defaultdict(list)
    for pred, actual in calibration_data:
        bucket = min(int(pred * 10), 9)  # 0-9 representing 0-10%, 10-20%, etc.
        buckets[bucket].append(actual)

    print("║  Predicted    Actual     Count   Diff                               ║")
    for i in range(10):
        outcomes = buckets.get(i, [])
        if not outcomes:
            continue
        pred_mid = (i * 10 + 5)
        actual_pct = sum(outcomes) / len(outcomes) * 100
        diff = actual_pct - pred_mid
        bar = "█" * int(abs(diff) / 2)
        sign = "+" if diff >= 0 else "-"
        print(f"║  {i*10:>3}-{(i+1)*10:<3}%    {actual_pct:>5.1f}%    {len(outcomes):>5}   "
              f"{sign}{abs(diff):.1f}% {bar:<20}   ║")


def save_report_json(result: BacktestResult, path: str) -> None:
    """Save backtest results as JSON for the frontend to consume."""
    out = {
        "period": {"start": result.start_date, "end": result.end_date},
        "summary": {
            "total_matches": result.total_matches,
            "matches_with_signals": result.matches_with_signals,
            "initial_bankroll": result.initial_bankroll,
            "final_bankroll": result.final_bankroll,
            "total_signals": result.total_signals,
            "wins": result.wins,
            "losses": result.losses,
            "hit_rate": round(result.hit_rate, 4),
            "total_staked": round(result.total_staked, 2),
            "total_pnl": round(result.total_pnl, 2),
            "roi_pct": round(result.roi_pct, 2),
            "max_drawdown_pct": round(result.max_drawdown_pct, 2),
            "best_streak": result.best_streak,
            "worst_streak": result.worst_streak,
        },
        "league_stats": result.league_stats,
        "market_stats": result.market_stats,
        "monthly_pnl": result.monthly_pnl,
        "bankroll_history": result.bankroll_history[-500:],  # Last 500 data points
        "signals": [
            {
                "date": s.date,
                "match": f"{s.home_team} vs {s.away_team}",
                "league": s.league,
                "market": s.market,
                "outcome": s.outcome,
                "model_prob": round(s.model_prob, 4),
                "market_prob": round(s.market_prob, 4),
                "odds": s.decimal_odds,
                "ev": round(s.ev, 4),
                "kelly_pct": round(s.kelly_pct, 4),
                "stake": round(s.stake_amount, 2),
                "won": s.won,
                "pnl": round(s.pnl, 2),
            }
            for s in result.signals[-200:]  # Last 200 signals for JSON size
        ],
    }

    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w") as f:
        json.dump(out, f, indent=2)
    log.info("Report saved to %s", path)


# ─── CLI ──────────────────────────────────────────────────────────────────

def main() -> None:
    import argparse

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-7s  %(message)s",
        datefmt="%H:%M:%S",
    )

    parser = argparse.ArgumentParser(description="Sigma Edge — Backtest Engine")
    parser.add_argument("--bankroll", type=float, default=1000.0, help="Initial bankroll")
    parser.add_argument("--seasons", type=int, default=2, help="Number of seasons to backtest")
    parser.add_argument("--league", type=str, nargs="*", help="League codes (E0, SP1, I1, D1, F1)")
    parser.add_argument("--ev-threshold", type=float, default=0.05, help="Min EV threshold")
    parser.add_argument("--kelly", type=float, default=0.125, help="Kelly fraction scale")
    parser.add_argument("--window", type=int, default=10, help="Rolling window for Poisson λ")
    parser.add_argument("--output", type=str, default=None, help="JSON output path")
    args = parser.parse_args()

    print("\n  ⚡ SIGMA EDGE — Backtest Engine")
    print("  ─────────────────────────────────")
    print(f"  Bankroll  : ${args.bankroll:.0f}")
    print(f"  Seasons   : {args.seasons}")
    print(f"  Leagues   : {args.league or 'All Top 5'}")
    print(f"  EV Thresh : {args.ev_threshold:.0%}")
    print(f"  Kelly     : {args.kelly}x")
    print(f"  Window    : {args.window} games")
    print()

    # Load free CSV data
    print("  📥 Downloading historical data (free)...")
    matches = load_all_matches(leagues=args.league, n_seasons=args.seasons)
    print(f"  ✓ Loaded {len(matches)} matches")
    print()

    # Run backtest
    print("  🔬 Running backtest...\n")
    engine = BacktestEngine(
        bankroll=args.bankroll,
        window=args.window,
        ev_threshold=args.ev_threshold,
        kelly_scale=args.kelly,
    )
    result = engine.run(matches)

    # Print report
    print_report(result)

    # Save JSON
    output_path = args.output or os.path.join(os.path.dirname(__file__), "data", "backtest_results.json")
    save_report_json(result, output_path)
    print(f"\n  📊 JSON report saved to: {output_path}")
    print()


if __name__ == "__main__":
    main()
