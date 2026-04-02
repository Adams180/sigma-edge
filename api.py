"""
FastAPI backend for the BET Dashboard.

Endpoints:
    /api/fixtures/upcoming     — live feed of upcoming matches
    /api/value-scanner         — markets with >7 % Bayesian edge
    /api/ref-watch             — referee card profiles for upcoming fixtures
    /api/lineup-alerts         — key-player benchings + win-prob shift
    /api/fixture/{id}/detail   — full evaluation for a single fixture
"""

from __future__ import annotations

import logging
from dataclasses import asdict
from datetime import datetime, timezone

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from config import CURRENT_SEASON, LEAGUES
from database import get_conn, init_db
from inefficiency_scanner import InefficiencyScanner
from probability_engine import ProbabilityEngine
from billing import router as billing_router
from scheduler import start_scheduler, stop_scheduler, scheduler_status

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(name)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

# ── App setup ─────────────────────────────────────────────────────────────
app = FastAPI(title="BET Dashboard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://sigma-edge.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

engine = ProbabilityEngine()

LEAGUE_NAMES = {lid: name for lid, (name, _) in LEAGUES.items()}

app.include_router(billing_router)


@app.on_event("startup")
def _startup() -> None:
    init_db()
    log.info("Database ready.")
    start_scheduler()


@app.on_event("shutdown")
def _shutdown() -> None:
    stop_scheduler()


# ──────────────────────────────────────────────────────────────────────────
#  1. Live Feed — upcoming matches
# ──────────────────────────────────────────────────────────────────────────

@app.get("/api/fixtures/upcoming")
def upcoming_fixtures(limit: int = Query(50, ge=1, le=200)):
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT f.fixture_id, f.league_id, f.date_utc, f.status,
                      f.home_goals, f.away_goals,
                      th.name AS home_team, th.logo_url AS home_logo,
                      ta.name AS away_team, ta.logo_url AS away_logo
               FROM fixtures f
               JOIN teams th ON f.home_id = th.team_id
               JOIN teams ta ON f.away_id = ta.team_id
               WHERE f.status IN ('NS', 'LIVE', '1H', '2H', 'HT')
               ORDER BY f.date_utc
               LIMIT ?""",
            (limit,),
        ).fetchall()

    fixtures = []
    for r in rows:
        fixtures.append({
            "fixture_id": r["fixture_id"],
            "league": LEAGUE_NAMES.get(r["league_id"], f"League {r['league_id']}"),
            "league_id": r["league_id"],
            "kickoff": r["date_utc"],
            "status": r["status"],
            "home_team": r["home_team"],
            "home_logo": r["home_logo"],
            "away_team": r["away_team"],
            "away_logo": r["away_logo"],
            "score": {
                "home": r["home_goals"],
                "away": r["away_goals"],
            },
        })
    return {"count": len(fixtures), "fixtures": fixtures}


# ──────────────────────────────────────────────────────────────────────────
#  2. Value Scanner — markets with edge > threshold
# ──────────────────────────────────────────────────────────────────────────

@app.get("/api/value-scanner")
def value_scanner(
    bankroll: float = Query(1000.0, ge=1),
    threshold: float = Query(0.07, ge=0.0, le=1.0),
):
    scanner = InefficiencyScanner(
        bankroll=bankroll,
        ev_threshold=threshold,
        engine=engine,
    )
    report = scanner.scan()
    signals = []
    for s in report.signals:
        signals.append({
            "fixture_id": s.fixture_id,
            "match": f"{s.home_team} vs {s.away_team}",
            "home_team": s.home_team,
            "away_team": s.away_team,
            "league": s.league,
            "kickoff": s.kickoff_utc,
            "market": s.market,
            "outcome": s.outcome,
            "line": s.line,
            "our_prob": round(s.our_prob, 4),
            "market_prob": round(s.market_prob, 4),
            "decimal_odds": round(s.decimal_odds, 2),
            "bookmaker": s.bookmaker,
            "ev": round(s.ev, 4),
            "kelly_full": round(s.kelly_full, 4),
            "kelly_used": round(s.kelly_used, 4),
            "stake_pct": round(s.stake_pct, 4),
            "stake_amount": round(bankroll * s.stake_pct, 2),
            "is_high_variance": s.is_high_variance,
        })
    return {
        "generated": report.generated_utc,
        "bankroll": bankroll,
        "threshold": threshold,
        "total_signals": len(signals),
        "total_exposure_pct": round(report.total_staked_pct, 4),
        "signals": signals,
    }


# ──────────────────────────────────────────────────────────────────────────
#  3. Ref Watch — referee card profiles for upcoming fixtures
# ──────────────────────────────────────────────────────────────────────────

@app.get("/api/ref-watch")
def ref_watch(limit: int = Query(30, ge=1, le=100)):
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT f.fixture_id, f.date_utc,
                      th.name AS home_team, ta.name AS away_team,
                      f.league_id,
                      r.referee_id, r.name AS referee_name,
                      r.total_matches, r.avg_yellow_per_match, r.avg_red_per_match
               FROM fixtures f
               JOIN teams th ON f.home_id = th.team_id
               JOIN teams ta ON f.away_id = ta.team_id
               JOIN fixture_referees fr ON f.fixture_id = fr.fixture_id
               JOIN referees r ON fr.referee_id = r.referee_id
               WHERE f.status = 'NS'
               ORDER BY r.avg_yellow_per_match DESC
               LIMIT ?""",
            (limit,),
        ).fetchall()

    items = []
    for r in rows:
        fid = r["fixture_id"]
        # Compute model card predictions
        try:
            card_info = engine.cards_over_prob(fid, line=3.5)
        except Exception:
            card_info = {}

        items.append({
            "fixture_id": fid,
            "match": f"{r['home_team']} vs {r['away_team']}",
            "home_team": r["home_team"],
            "away_team": r["away_team"],
            "league": LEAGUE_NAMES.get(r["league_id"], ""),
            "kickoff": r["date_utc"],
            "referee": {
                "id": r["referee_id"],
                "name": r["referee_name"],
                "matches": r["total_matches"],
                "avg_yellows": round(r["avg_yellow_per_match"], 2),
                "avg_reds": round(r["avg_red_per_match"], 2),
            },
            "model_cards": {
                "over_3_5_prob": round(card_info.get("over", 0), 4),
                "under_3_5_prob": round(card_info.get("under", 0), 4),
                "combined_lambda": round(card_info.get("combined_lambda", 0), 2),
            },
        })
    return {"count": len(items), "matches": items}


# ──────────────────────────────────────────────────────────────────────────
#  4. Lineup Alerts — key-player missing → win-prob shift
# ──────────────────────────────────────────────────────────────────────────

@app.get("/api/lineup-alerts")
def lineup_alerts():
    alerts = []

    with get_conn() as conn:
        fixtures = conn.execute(
            """SELECT f.fixture_id, f.home_id, f.away_id, f.date_utc,
                      f.league_id,
                      th.name AS home_team, ta.name AS away_team
               FROM fixtures f
               JOIN teams th ON f.home_id = th.team_id
               JOIN teams ta ON f.away_id = ta.team_id
               WHERE f.status = 'NS'
               ORDER BY f.date_utc
               LIMIT 50""",
        ).fetchall()

    for fix in fixtures:
        fid = fix["fixture_id"]
        try:
            probs = engine.evaluate(fid)
        except Exception:
            continue

        # Check both sides
        for side, team_name, team_id, missing in [
            ("home", fix["home_team"], fix["home_id"], probs.missing_key_home),
            ("away", fix["away_team"], fix["away_id"], probs.missing_key_away),
        ]:
            if not missing:
                continue

            # Compute what probs would be WITHOUT the dock
            # (re-evaluate is expensive — approximate by reversing the dock)
            dock_pct = len(missing) * 5.4

            alerts.append({
                "fixture_id": fid,
                "match": f"{fix['home_team']} vs {fix['away_team']}",
                "league": LEAGUE_NAMES.get(fix["league_id"], ""),
                "kickoff": fix["date_utc"],
                "team": team_name,
                "side": side,
                "missing_players": missing,
                "count_missing": len(missing),
                "win_prob_current": round(
                    probs.p_home_win if side == "home" else probs.p_away_win, 4,
                ),
                "prob_dock_pct": round(dock_pct, 1),
                "probabilities": {
                    "home_win": round(probs.p_home_win, 4),
                    "draw": round(probs.p_draw, 4),
                    "away_win": round(probs.p_away_win, 4),
                },
            })

    return {"count": len(alerts), "alerts": alerts}


# ──────────────────────────────────────────────────────────────────────────
#  5. Single fixture deep-dive
# ──────────────────────────────────────────────────────────────────────────

@app.get("/api/fixture/{fixture_id}/detail")
def fixture_detail(fixture_id: int):
    with get_conn() as conn:
        fix = conn.execute(
            """SELECT f.*, th.name AS home_team, ta.name AS away_team
               FROM fixtures f
               JOIN teams th ON f.home_id = th.team_id
               JOIN teams ta ON f.away_id = ta.team_id
               WHERE f.fixture_id = ?""",
            (fixture_id,),
        ).fetchone()

    if not fix:
        return {"error": "Fixture not found"}

    try:
        probs = engine.evaluate(fixture_id)
    except Exception as exc:
        return {"error": str(exc)}

    corners = engine.corners_over_prob(fixture_id, 9.5)
    cards = engine.cards_over_prob(fixture_id, 3.5)

    def _prior_dict(p):
        if p is None:
            return None
        return {"lambda": round(p.lam, 2), "n_games": p.n_games}

    def _card_dict(c):
        if c is None:
            return None
        return {
            "team_avg": round(c.team_avg, 2),
            "referee_avg": round(c.referee_avg, 2),
            "blended_lambda": round(c.blended_lambda, 2),
        }

    return {
        "fixture_id": fixture_id,
        "home_team": fix["home_team"],
        "away_team": fix["away_team"],
        "league": LEAGUE_NAMES.get(fix["league_id"], ""),
        "kickoff": fix["date_utc"],
        "status": fix["status"],
        "probabilities": {
            "home_win": round(probs.p_home_win, 4),
            "draw": round(probs.p_draw, 4),
            "away_win": round(probs.p_away_win, 4),
        },
        "poisson": {
            "home_goals": _prior_dict(probs.home_goals),
            "away_goals": _prior_dict(probs.away_goals),
            "home_corners": _prior_dict(probs.home_corners),
            "away_corners": _prior_dict(probs.away_corners),
        },
        "corners_market": {
            "line": 9.5,
            "over": round(corners.get("over", 0), 4),
            "under": round(corners.get("under", 0), 4),
            "combined_lambda": round(corners.get("combined_lambda", 0), 2),
        },
        "cards_market": {
            "line": 3.5,
            "over": round(cards.get("over", 0), 4),
            "under": round(cards.get("under", 0), 4),
            "combined_lambda": round(cards.get("combined_lambda", 0), 2),
            "referee": cards.get("referee"),
        },
        "cards_model": {
            "home": _card_dict(probs.home_cards),
            "away": _card_dict(probs.away_cards),
        },
        "injury_impact": {
            "missing_key_home": probs.missing_key_home,
            "missing_key_away": probs.missing_key_away,
        },
    }


# ──────────────────────────────────────────────────────────────────────────
#  Health check
# ──────────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    with get_conn() as conn:
        fixture_count  = conn.execute("SELECT COUNT(*) AS n FROM fixtures").fetchone()["n"]
        ft_count       = conn.execute("SELECT COUNT(*) AS n FROM fixtures WHERE status='FT'").fetchone()["n"]
        upcoming_count = conn.execute("SELECT COUNT(*) AS n FROM fixtures WHERE status='NS'").fetchone()["n"]
        odds_count     = conn.execute("SELECT COUNT(*) AS n FROM odds_snapshots").fetchone()["n"]
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "db": {
            "total_fixtures": fixture_count,
            "finished": ft_count,
            "upcoming": upcoming_count,
            "odds_snapshots": odds_count,
        },
        "scheduler": scheduler_status(),
    }


@app.post("/api/admin/refresh")
def admin_refresh():
    """Manually trigger a data refresh (upcoming fixtures + odds)."""
    from ingest_upcoming import ingest_upcoming
    try:
        n = ingest_upcoming()
        return {"ok": True, "fixtures_refreshed": n}
    except Exception as exc:
        log.exception("Manual refresh failed")
        return {"ok": False, "error": str(exc)}


# ──────────────────────────────────────────────────────────────────────────
#  V2: Dixon-Coles signals (powered by backtest_v2 model)
# ──────────────────────────────────────────────────────────────────────────

_predictor = None


def _get_predictor():
    global _predictor
    if _predictor is None:
        from predictor import LivePredictor
        _predictor = LivePredictor(bankroll=1000.0, n_seasons=5)
        _predictor.initialize()
        log.info("V2 predictor initialized with %d teams.", len(_predictor.model.teams))
    return _predictor


@app.get("/api/v2/signals")
def v2_signals(bankroll: float = Query(1000.0, ge=1)):
    """
    Live signals from the proven Dixon-Coles engine.
    Fetches real-time odds from The Odds API and runs
    through the backtested model pipeline.
    """
    predictor = _get_predictor()
    predictor.bankroll = bankroll

    try:
        signals = predictor.scan_all()
    except Exception as e:
        log.exception("V2 signal scan failed")
        return {"error": str(e), "signals": []}

    return {
        "generated": datetime.now(timezone.utc).isoformat(),
        "bankroll": bankroll,
        "total_signals": len(signals),
        "total_exposure_pct": round(sum(s.kelly_pct for s in signals) * 100, 2),
        "engine": "v2-dixon-coles",
        "signals": [
            {
                "match": f"{s.home_team} vs {s.away_team}",
                "home_team": s.home_team,
                "away_team": s.away_team,
                "league": s.league,
                "kickoff": s.commence_time,
                "outcome": s.outcome,
                "model_prob": s.model_prob,
                "calibrated_prob": s.calibrated_prob,
                "market_prob": s.market_prob,
                "decimal_odds": s.decimal_odds,
                "bookmaker": s.bookmaker,
                "ev": s.ev,
                "edge": s.edge,
                "kelly_pct": s.kelly_pct,
                "stake_amount": round(bankroll * s.kelly_pct, 2),
                "confidence": s.confidence,
            }
            for s in signals
        ],
    }


@app.get("/api/v2/backtest")
def v2_backtest():
    """Serve the latest backtest results JSON."""
    import os, json as _json
    path = os.path.join(os.path.dirname(__file__), "data", "backtest_v2_results.json")
    if not os.path.exists(path):
        return {"error": "No backtest results found. Run backtest_v2.py first."}
    with open(path) as f:
        return _json.load(f)
