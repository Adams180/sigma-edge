"""
Live-lineup watcher.

Runs a scheduler that checks for fixtures kicking off within
LINEUP_PREFETCH_MINUTES and fetches/stores the starting XI.
Detects changes vs. the previously stored lineup and logs diffs.
"""

import logging
import threading
import time
from datetime import datetime, timedelta, timezone

import api_football
from config import CURRENT_SEASON, LEAGUES, LINEUP_PREFETCH_MINUTES
from database import get_conn

log = logging.getLogger(__name__)


def _upcoming_fixtures(within_minutes: int) -> list[dict]:
    """
    Return fixtures from the DB whose kickoff is between now
    and now + within_minutes.
    """
    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(minutes=within_minutes)

    with get_conn() as conn:
        rows = conn.execute(
            """SELECT fixture_id, home_id, away_id, date_utc
               FROM fixtures
               WHERE status = 'NS'
                 AND date_utc >= ? AND date_utc <= ?""",
            (now.isoformat(), cutoff.isoformat()),
        ).fetchall()
    return [dict(r) for r in rows]


def _previous_lineup(conn, fixture_id: int, team_id: int) -> set[int]:
    """Return the set of player_ids from the most recent lineup fetch."""
    rows = conn.execute(
        """SELECT player_id FROM lineups
           WHERE fixture_id = ? AND team_id = ? AND is_starter = 1
           ORDER BY fetched_at DESC""",
        (fixture_id, team_id),
    ).fetchall()
    return {r["player_id"] for r in rows}


def fetch_and_store_lineups(fixture_id: int) -> dict:
    """
    Call API-Football for lineups, store them, and return a change summary.
    Returns {"fixture_id": …, "changes": [{"team_id": …, "in": [], "out": []}]}
    """
    log.info("Fetching lineups for fixture %d", fixture_id)
    data = api_football.get_fixture_lineups(fixture_id)
    now_iso = datetime.now(timezone.utc).isoformat()

    changes: list[dict] = []

    with get_conn() as conn:
        for team_block in data:
            team = team_block["team"]
            team_id = team["id"]

            old_starters = _previous_lineup(conn, fixture_id, team_id)

            start_xi = team_block.get("startXI", [])
            subs = team_block.get("substitutes", [])

            new_starter_ids: set[int] = set()
            for entry in start_xi:
                p = entry["player"]
                pid = p["id"]
                new_starter_ids.add(pid)
                conn.execute(
                    """INSERT INTO lineups
                           (fixture_id, team_id, player_id, player_name,
                            position, grid_pos, is_starter, fetched_at)
                       VALUES (?, ?, ?, ?, ?, ?, 1, ?)
                       ON CONFLICT(fixture_id, team_id, player_id, fetched_at)
                       DO NOTHING""",
                    (
                        fixture_id,
                        team_id,
                        pid,
                        p.get("name", "Unknown"),
                        p.get("pos"),
                        entry.get("player", {}).get("grid"),
                        now_iso,
                    ),
                )

            for entry in subs:
                p = entry["player"]
                conn.execute(
                    """INSERT INTO lineups
                           (fixture_id, team_id, player_id, player_name,
                            position, grid_pos, is_starter, fetched_at)
                       VALUES (?, ?, ?, ?, ?, ?, 0, ?)
                       ON CONFLICT(fixture_id, team_id, player_id, fetched_at)
                       DO NOTHING""",
                    (
                        fixture_id,
                        team_id,
                        p["id"],
                        p.get("name", "Unknown"),
                        p.get("pos"),
                        None,
                        now_iso,
                    ),
                )

            # Detect changes
            if old_starters:
                dropped = old_starters - new_starter_ids
                added = new_starter_ids - old_starters
                if dropped or added:
                    changes.append({
                        "team_id": team_id,
                        "team_name": team.get("name", "?"),
                        "players_in": list(added),
                        "players_out": list(dropped),
                    })
                    log.warning(
                        "LINEUP CHANGE fixture %d %s: IN=%s  OUT=%s",
                        fixture_id,
                        team.get("name"),
                        added,
                        dropped,
                    )

    return {"fixture_id": fixture_id, "changes": changes}


def poll_upcoming_lineups() -> list[dict]:
    """
    One-shot poll: find all fixtures kicking off within the
    configured window and fetch their lineups.
    Returns list of change summaries.
    """
    upcoming = _upcoming_fixtures(LINEUP_PREFETCH_MINUTES)
    log.info("Found %d upcoming fixtures within %d min", len(upcoming), LINEUP_PREFETCH_MINUTES)

    results = []
    for fix in upcoming:
        try:
            result = fetch_and_store_lineups(fix["fixture_id"])
            results.append(result)
        except Exception as exc:
            log.error("Lineup fetch failed for fixture %d: %s", fix["fixture_id"], exc)
    return results


def start_lineup_watcher(interval_seconds: int = 300, stop_event: threading.Event | None = None) -> None:
    """
    Background loop: every `interval_seconds` check for imminent fixtures
    and pull their lineups.  Pass a threading.Event to signal a clean stop.
    """
    stop = stop_event or threading.Event()
    log.info("Lineup watcher started (interval=%ds)", interval_seconds)

    while not stop.is_set():
        try:
            poll_upcoming_lineups()
        except Exception as exc:
            log.error("Lineup watcher error: %s", exc)
        stop.wait(interval_seconds)

    log.info("Lineup watcher stopped.")
