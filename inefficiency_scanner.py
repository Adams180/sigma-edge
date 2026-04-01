"""
Inefficiency Scanner — Expected Value & Fractional Kelly Staking.

Scans every upcoming fixture for market inefficiencies across all
supported bet types (W/D/L, Over/Under Corners, Over/Under Cards).

Core formula:
    EV = (p̂ × decimal_odds) − 1

Staking — Fractional Kelly (0.25 scale by default):
    f* = (p̂ × odds − 1) / (odds − 1)          # full Kelly fraction
    stake = bankroll × kelly_fraction × f*       # fractional Kelly

Safety rule:
    NEVER full Kelly on live / 5-minute / high-variance markets.
    Those markets are hard-capped at 0.10× Kelly regardless of edge.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Sequence

from database import get_conn
from probability_engine import ProbabilityEngine

log = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────
#  Constants
# ──────────────────────────────────────────────────────────────────────────
MIN_EV_THRESHOLD = 0.05        # 5 % edge required
KELLY_FRACTION   = 0.25        # quarter-Kelly (default)
HIGH_VAR_KELLY   = 0.10        # hard cap for high-variance / live markets
MAX_STAKE_PCT    = 0.05        # never risk > 5 % of bankroll on one bet

# Markets classified as high-variance (never full Kelly)
HIGH_VARIANCE_MARKETS = frozenset({
    "5min_corners",
    "5min_cards",
    "live_h2h",
    "live_totals",
    "next_goal",
    "both_teams_to_score",
})


# ──────────────────────────────────────────────────────────────────────────
#  Data containers
# ──────────────────────────────────────────────────────────────────────────

@dataclass
class TradeSignal:
    """A single identified edge."""
    fixture_id: int
    home_team: str
    away_team: str
    kickoff_utc: str
    league: str

    market: str              # e.g. "h2h", "totals_corners", "totals_cards"
    outcome: str             # e.g. "Home", "Over", "Under"
    line: float | None       # e.g. 9.5 for corners

    our_prob: float          # p̂  (model probability)
    market_prob: float       # implied from decimal odds
    decimal_odds: float
    bookmaker: str

    ev: float                # (p̂ × odds) − 1
    kelly_full: float        # full Kelly fraction
    kelly_used: float        # fraction actually applied (0.25× or capped)
    stake_pct: float         # % of bankroll to wager
    is_high_variance: bool


@dataclass
class TradeReport:
    """Collection of trade signals for a single scan run."""
    generated_utc: str
    bankroll: float
    signals: list[TradeSignal] = field(default_factory=list)
    total_staked_pct: float = 0.0

    # ── Rendering ────────────────────────────────────────────────────────

    def summary_text(self) -> str:
        lines = [
            "╔══════════════════════════════════════════════════════════════════╗",
            "║                    TRADE REPORT — INEFFICIENCY SCAN            ║",
            f"║  Generated: {self.generated_utc:<50} ║",
            f"║  Bankroll : {self.bankroll:>10.2f}                                       ║",
            "╠══════════════════════════════════════════════════════════════════╣",
        ]

        if not self.signals:
            lines.append("║  No actionable edges found (EV > 5 % threshold).              ║")
        else:
            for i, s in enumerate(self.signals, 1):
                lines.append(f"║  #{i}  {s.home_team} vs {s.away_team}")
                lines.append(f"║      League  : {s.league}")
                lines.append(f"║      Kickoff : {s.kickoff_utc}")
                lines.append(f"║      Market  : {_market_label(s.market, s.outcome, s.line)}")
                lines.append(f"║      Book    : {s.bookmaker}  @ {s.decimal_odds:.2f}")
                lines.append(f"║      Our Prob: {s.our_prob:.1%}   vs   Market: {s.market_prob:.1%}")
                lines.append(f"║      EV      : {s.ev:+.2%}")
                lines.append(f"║      Kelly   : {s.kelly_full:.2%} full → {s.kelly_used:.2%} applied")
                lines.append(f"║      Stake   : {s.stake_pct:.2%} of bankroll"
                             f" = {self.bankroll * s.stake_pct:.2f}")
                if s.is_high_variance:
                    lines.append("║      ⚠  HIGH-VARIANCE market — Kelly hard-capped")
                lines.append("║  ────────────────────────────────────────────────────────────  ║")

            lines.append(f"║  TOTAL EXPOSURE: {self.total_staked_pct:.2%} of bankroll"
                         f" = {self.bankroll * self.total_staked_pct:.2f}")

        lines.append("╚══════════════════════════════════════════════════════════════════╝")
        return "\n".join(lines)


def _market_label(market: str, outcome: str, line: float | None) -> str:
    if market == "h2h":
        return f"Match Result — {outcome}"
    if market == "totals_corners":
        return f"{outcome} {line} Corners"
    if market == "totals_cards":
        return f"{outcome} {line} Cards"
    return f"{market} — {outcome} {line or ''}"


# ──────────────────────────────────────────────────────────────────────────
#  Kelly math
# ──────────────────────────────────────────────────────────────────────────

def kelly_fraction(p: float, odds: float) -> float:
    """
    Full Kelly criterion:
        f* = (p × odds − 1) / (odds − 1)
    Clamped to [0, 1].
    """
    if odds <= 1.0 or p <= 0:
        return 0.0
    f = (p * odds - 1.0) / (odds - 1.0)
    return max(0.0, min(f, 1.0))


def fractional_kelly(
    p: float,
    odds: float,
    fraction: float = 0.125,  # 1/8 Kelly
    is_high_var: bool = False,
) -> tuple[float, float]:
    """
    Returns (full_kelly, applied_kelly).
    If high-variance market, caps at HIGH_VAR_KELLY instead of `fraction`.
    Final result also capped at MAX_STAKE_PCT.
    """
    full = kelly_fraction(p, odds)
    scale = HIGH_VAR_KELLY if is_high_var else fraction
    applied = full * scale
    applied = min(applied, 0.0125)  # 1.25% max stake
    return full, applied


# ──────────────────────────────────────────────────────────────────────────
#  Core scanner
# ──────────────────────────────────────────────────────────────────────────

class InefficiencyScanner:
    """
    Scans upcoming fixtures for EV > threshold, sizes bets with
    fractional Kelly, and produces a TradeReport.
    """

    def __init__(
        self,
        bankroll: float = 1000.0,
        kelly_scale: float = KELLY_FRACTION,
        ev_threshold: float = MIN_EV_THRESHOLD,
        engine: ProbabilityEngine | None = None,
    ):
        self.bankroll = bankroll
        self.kelly_scale = kelly_scale
        self.ev_threshold = ev_threshold
        self.engine = engine or ProbabilityEngine()

    # ── Scan entry point ─────────────────────────────────────────────────

    def scan(self, fixture_ids: list[int] | None = None) -> TradeReport:
        """
        Scan fixtures for inefficiencies.  If ``fixture_ids`` is None,
        scan all upcoming (status = 'NS') fixtures in the database.
        """
        if fixture_ids is None:
            fixture_ids = self._upcoming_fixture_ids()

        report = TradeReport(
            generated_utc=datetime.now(timezone.utc).isoformat(),
            bankroll=self.bankroll,
        )

        for fid in fixture_ids:
            try:
                signals = self._scan_fixture(fid)
                report.signals.extend(signals)
            except Exception as exc:
                log.error("Scan failed for fixture %d: %s", fid, exc)

        # Sort by EV descending (best edges first)
        report.signals.sort(key=lambda s: s.ev, reverse=True)

        # Accumulate total exposure
        report.total_staked_pct = sum(s.stake_pct for s in report.signals)

        return report

    # ── Per-fixture scan ─────────────────────────────────────────────────

    def _scan_fixture(self, fixture_id: int) -> list[TradeSignal]:
        """Evaluate all markets for one fixture and return any edges."""
        signals: list[TradeSignal] = []

        # Fixture metadata
        meta = self._fixture_meta(fixture_id)
        if not meta:
            return signals

        # Full Bayesian evaluation (W/D/L + sub-models)
        match_probs = self.engine.evaluate(fixture_id)

        # Collect latest odds from every bookmaker × market
        odds_rows = self._latest_odds(fixture_id)

        for row in odds_rows:
            market = row["market"]
            outcome = row["outcome_name"]
            line = row["outcome_point"]
            dec_odds = row["price"]
            bookmaker = row["bookmaker"]

            if dec_odds <= 1.0:
                continue

            # Derive our model probability for this specific outcome
            our_p = self._model_prob(
                match_probs, market, outcome, line, fixture_id,
            )
            if our_p is None or our_p <= 0:
                continue

            # Market implied probability
            market_p = 1.0 / dec_odds

            # Expected Value
            ev = (our_p * dec_odds) - 1.0

            if ev < self.ev_threshold:
                continue

            # Classify high-variance
            is_hv = market in HIGH_VARIANCE_MARKETS

            # Fractional Kelly stake
            full_k, applied_k = fractional_kelly(
                our_p, dec_odds, self.kelly_scale, is_hv,
            )

            signals.append(TradeSignal(
                fixture_id=fixture_id,
                home_team=meta["home_name"],
                away_team=meta["away_name"],
                kickoff_utc=meta["date_utc"],
                league=meta["league_name"],
                market=market,
                outcome=outcome,
                line=line,
                our_prob=our_p,
                market_prob=market_p,
                decimal_odds=dec_odds,
                bookmaker=bookmaker,
                ev=ev,
                kelly_full=full_k,
                kelly_used=applied_k,
                stake_pct=applied_k,
                is_high_variance=is_hv,
            ))

        return signals

    # ── Model probability dispatcher ─────────────────────────────────────

    def _model_prob(
        self,
        mp,       # MatchProbabilities
        market: str,
        outcome: str,
        line: float | None,
        fixture_id: int,
    ) -> float | None:
        """Map a market/outcome to the correct model probability."""

        # ── W / D / L ────────────────────────────────────────────────────
        if market == "h2h":
            mapping = {
                "Home": mp.p_home_win, "1": mp.p_home_win,
                "Draw": mp.p_draw,     "X": mp.p_draw,
                "Away": mp.p_away_win, "2": mp.p_away_win,
            }
            return mapping.get(outcome)

        # ── Over / Under Corners ─────────────────────────────────────────
        if market == "totals_corners" and line is not None:
            info = self.engine.corners_over_prob(fixture_id, line)
            if outcome == "Over":
                return info["over"]
            if outcome == "Under":
                return info["under"]

        # ── Over / Under Cards ───────────────────────────────────────────
        if market == "totals_cards" and line is not None:
            info = self.engine.cards_over_prob(fixture_id, line)
            if outcome == "Over":
                return info["over"]
            if outcome == "Under":
                return info["under"]

        return None

    # ── DB helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _upcoming_fixture_ids() -> list[int]:
        with get_conn() as conn:
            rows = conn.execute(
                """SELECT fixture_id FROM fixtures
                   WHERE status = 'NS'
                   ORDER BY date_utc""",
            ).fetchall()
        return [r["fixture_id"] for r in rows]

    @staticmethod
    def _fixture_meta(fixture_id: int) -> dict | None:
        with get_conn() as conn:
            row = conn.execute(
                """SELECT f.fixture_id, f.date_utc, f.league_id,
                          th.name AS home_name, ta.name AS away_name
                   FROM fixtures f
                   JOIN teams th ON f.home_id = th.team_id
                   JOIN teams ta ON f.away_id = ta.team_id
                   WHERE f.fixture_id = ?""",
                (fixture_id,),
            ).fetchone()
        if not row:
            return None

        from config import LEAGUES
        lid = row["league_id"]
        league_name = LEAGUES.get(lid, (f"League {lid}", ""))[0]

        return {
            "fixture_id": row["fixture_id"],
            "date_utc": row["date_utc"],
            "home_name": row["home_name"],
            "away_name": row["away_name"],
            "league_name": league_name,
        }

    @staticmethod
    def _latest_odds(fixture_id: int) -> list[dict]:
        """
        For each bookmaker × market × outcome × line, keep only the
        most recent price.
        """
        with get_conn() as conn:
            rows = conn.execute(
                """SELECT bookmaker, market, outcome_name, outcome_point, price,
                          MAX(fetched_at) AS fetched_at
                   FROM odds_snapshots
                   WHERE fixture_id = ?
                   GROUP BY bookmaker, market, outcome_name, outcome_point
                   ORDER BY market, outcome_name""",
                (fixture_id,),
            ).fetchall()
        return [dict(r) for r in rows]


# ──────────────────────────────────────────────────────────────────────────
#  CLI entry point
# ──────────────────────────────────────────────────────────────────────────

def main() -> None:
    import argparse
    import sys

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-7s  %(name)s  %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    parser = argparse.ArgumentParser(
        description="Scan for betting market inefficiencies",
    )
    parser.add_argument(
        "--bankroll", type=float, default=1000.0,
        help="Current bankroll (default: 1000)",
    )
    parser.add_argument(
        "--kelly", type=float, default=KELLY_FRACTION,
        help=f"Kelly fraction scale (default: {KELLY_FRACTION})",
    )
    parser.add_argument(
        "--threshold", type=float, default=MIN_EV_THRESHOLD,
        help=f"Minimum EV threshold (default: {MIN_EV_THRESHOLD})",
    )
    parser.add_argument(
        "--fixture", type=int, nargs="*",
        help="Specific fixture IDs to scan (default: all upcoming)",
    )
    args = parser.parse_args()

    # Ensure DB exists
    from database import init_db
    init_db()

    scanner = InefficiencyScanner(
        bankroll=args.bankroll,
        kelly_scale=args.kelly,
        ev_threshold=args.threshold,
    )
    report = scanner.scan(fixture_ids=args.fixture)

    print(report.summary_text())
    print(f"\n{len(report.signals)} signal(s) found.")


if __name__ == "__main__":
    main()
