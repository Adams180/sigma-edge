"""
Ingest market odds from The Odds API into SQLite.

Pulls current prices for:
  • Win / Draw / Loss  (h2h market)
  • Over/Under 9.5 Corners
  • Over 3.5 Cards

Note: The Odds API free tier only supports h2h and totals for the
main match result.  Corner and card totals are available on paid plans
(alternate_totals_corners, alternate_totals_cards).  The code below is
written for the full API — it will gracefully skip markets that return
empty data on a free key.
"""

import logging
from datetime import datetime, timezone

import odds_api
from config import ODDS_SPORT_KEYS
from database import get_conn

log = logging.getLogger(__name__)

# Markets to request per sport key
_MARKET_CONFIGS = [
    {
        "markets": "h2h",
        "label": "h2h",
    },
    {
        # Alternate corners totals — not every bookmaker offers 9.5
        "markets": "alternate_totals_corners",
        "label": "totals_corners",
    },
    {
        # Alternate cards totals
        "markets": "alternate_totals_cards",
        "label": "totals_cards",
    },
]


def _match_fixture_id(conn, home_team: str, away_team: str, commence: str) -> int | None:
    """
    Attempt to link an Odds-API event to an API-Football fixture
    by fuzzy team-name + date matching.
    Returns fixture_id or None.
    """
    # Strip time, compare date only
    event_date = commence[:10]  # "2025-03-08"
    row = conn.execute(
        """SELECT f.fixture_id
           FROM fixtures f
           JOIN teams th ON f.home_id = th.team_id
           JOIN teams ta ON f.away_id = ta.team_id
           WHERE f.date_utc LIKE ?
             AND (   LOWER(th.name) LIKE ? OR LOWER(ta.name) LIKE ?
                  OR LOWER(th.name) LIKE ? OR LOWER(ta.name) LIKE ? )
           LIMIT 1""",
        (
            f"{event_date}%",
            f"%{home_team.lower().split()[-1]}%",
            f"%{home_team.lower().split()[-1]}%",
            f"%{away_team.lower().split()[-1]}%",
            f"%{away_team.lower().split()[-1]}%",
        ),
    ).fetchone()
    return row["fixture_id"] if row else None


def _store_odds(conn, fixture_id: int | None, sport_key: str,
                bookmaker_name: str, market_key: str,
                outcomes: list[dict], fetched_at: str) -> int:
    """Insert outcome rows. Returns count stored."""
    count = 0
    for outcome in outcomes:
        name = outcome.get("name", "")
        point = outcome.get("point")
        price = outcome.get("price")
        if price is None:
            continue

        # For corners market, only keep the 9.5 line
        if market_key == "totals_corners" and point is not None and float(point) != 9.5:
            continue
        # For cards market, only keep the 3.5 line
        if market_key == "totals_cards" and point is not None and float(point) != 3.5:
            continue

        conn.execute(
            """INSERT INTO odds_snapshots
                   (fixture_id, sport_key, bookmaker, market,
                    outcome_name, outcome_point, price, fetched_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT DO NOTHING""",
            (fixture_id, sport_key, bookmaker_name, market_key,
             name, point, price, fetched_at),
        )
        count += 1
    return count


def ingest_odds_for_sport(sport_key: str) -> int:
    """
    Fetch and store all configured markets for a single sport key.
    Returns total outcomes stored.
    """
    total = 0
    now_iso = datetime.now(timezone.utc).isoformat()

    for mcfg in _MARKET_CONFIGS:
        try:
            events = odds_api.get_odds(
                sport_key,
                markets=mcfg["markets"],
            )
        except Exception as exc:
            log.warning("Odds fetch failed for %s / %s: %s", sport_key, mcfg["markets"], exc)
            continue

        with get_conn() as conn:
            for event in events:
                home = event.get("home_team", "")
                away = event.get("away_team", "")
                commence = event.get("commence_time", "")

                fixture_id = _match_fixture_id(conn, home, away, commence)

                for bm in event.get("bookmakers", []):
                    for mkt in bm.get("markets", []):
                        stored = _store_odds(
                            conn,
                            fixture_id,
                            sport_key,
                            bm["title"],
                            mcfg["label"],
                            mkt.get("outcomes", []),
                            now_iso,
                        )
                        total += stored

    log.info("Stored %d odds outcomes for %s", total, sport_key)
    return total


def ingest_all_odds() -> None:
    """Pull odds for every configured sport key."""
    for sport_key in ODDS_SPORT_KEYS:
        log.info("═══ Ingesting odds: %s ═══", sport_key)
        try:
            ingest_odds_for_sport(sport_key)
        except Exception as exc:
            log.error("Failed odds for %s: %s", sport_key, exc)


# ─── Bayesian-friendly query helper ──────────────────────────────────────

def latest_odds(fixture_id: int) -> list[dict]:
    """
    Return the most recent odds snapshot for every bookmaker × market × outcome
    for a given fixture.
    """
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT bookmaker, market, outcome_name, outcome_point, price, fetched_at
               FROM odds_snapshots
               WHERE fixture_id = ?
               ORDER BY fetched_at DESC""",
            (fixture_id,),
        ).fetchall()
    return [dict(r) for r in rows]
