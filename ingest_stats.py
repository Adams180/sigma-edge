"""
Ingest historical team statistics from API-Football into SQLite.

Pulls per-fixture data for every finished match in the configured
leagues/season:  corners, yellow cards, red cards, and xG.
"""

import logging
from datetime import datetime, timezone

import api_football
from config import CURRENT_SEASON, LEAGUES
from database import get_conn

log = logging.getLogger(__name__)


def _upsert_team(conn, team_id: int, name: str, logo: str | None = None) -> None:
    conn.execute(
        """INSERT INTO teams (team_id, name, logo_url) VALUES (?, ?, ?)
           ON CONFLICT(team_id) DO UPDATE SET name=excluded.name, logo_url=excluded.logo_url""",
        (team_id, name, logo),
    )


def _upsert_fixture(conn, fix: dict) -> None:
    f = fix["fixture"]
    teams = fix["teams"]
    goals = fix["goals"]
    league = fix["league"]
    conn.execute(
        """INSERT INTO fixtures (fixture_id, league_id, season, date_utc,
                                  home_id, away_id, status, home_goals, away_goals)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(fixture_id) DO UPDATE SET
               status=excluded.status,
               home_goals=excluded.home_goals,
               away_goals=excluded.away_goals""",
        (
            f["id"],
            league["id"],
            league["season"],
            f["date"],
            teams["home"]["id"],
            teams["away"]["id"],
            f["status"]["short"],
            goals["home"],
            goals["away"],
        ),
    )
    # Ensure teams exist
    _upsert_team(conn, teams["home"]["id"], teams["home"]["name"], teams["home"].get("logo"))
    _upsert_team(conn, teams["away"]["id"], teams["away"]["name"], teams["away"].get("logo"))


def _extract_stat(stats_list: list[dict], stat_type: str) -> int | None:
    """Pull a numeric stat from the API-Football statistics array."""
    for item in stats_list:
        if item["type"] == stat_type:
            val = item["value"]
            if val is None:
                return None
            # Sometimes returned as "75%" etc — strip non-numeric
            if isinstance(val, str):
                val = val.replace("%", "").strip()
                try:
                    return int(val)
                except ValueError:
                    return None
            return int(val)
    return None


def ingest_fixtures(league_id: int, season: int) -> int:
    """
    Download all finished fixtures for a league-season and store them.
    Returns the count of fixtures persisted.
    """
    log.info("Fetching fixtures for league %d season %d …", league_id, season)
    fixtures = api_football.get_fixtures(league_id, season, status="FT")
    now_iso = datetime.now(timezone.utc).isoformat()

    stored = 0
    with get_conn() as conn:
        for fix in fixtures:
            _upsert_fixture(conn, fix)
            stored += 1

    log.info("Stored %d fixtures for league %d", stored, league_id)
    return stored


def ingest_stats_for_fixture(fixture_id: int) -> None:
    """
    Fetch and store corners, cards, and xG for a single fixture.
    """
    stats_data = api_football.get_fixture_stats(fixture_id)
    now_iso = datetime.now(timezone.utc).isoformat()

    # Attempt to get xG from predictions endpoint
    xg_map: dict[int, float | None] = {}
    try:
        preds = api_football.get_fixture_xg(fixture_id)
        if preds:
            pred = preds[0]
            for side in ("home", "away"):
                team_data = pred.get("teams", {}).get(side, {})
                tid = team_data.get("id")
                # xG might be nested in different locations
                league_stats = pred.get("league", {})
                # Some endpoints put xG directly
                xg_val = None
                if "goals" in pred:
                    xg_val = pred["goals"].get(side)
                xg_map[tid] = xg_val
    except Exception as exc:
        log.warning("Could not fetch xG for fixture %d: %s", fixture_id, exc)

    with get_conn() as conn:
        for team_stats in stats_data:
            team = team_stats["team"]
            team_id = team["id"]
            stats = team_stats.get("statistics", [])

            corners = _extract_stat(stats, "Corner Kicks")
            yellows = _extract_stat(stats, "Yellow Cards")
            reds = _extract_stat(stats, "Red Cards")
            xg = xg_map.get(team_id)

            conn.execute(
                """INSERT INTO fixture_stats
                       (fixture_id, team_id, corners, yellow_cards, red_cards, xg, fetched_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(fixture_id, team_id) DO UPDATE SET
                       corners=excluded.corners,
                       yellow_cards=excluded.yellow_cards,
                       red_cards=excluded.red_cards,
                       xg=excluded.xg,
                       fetched_at=excluded.fetched_at""",
                (fixture_id, team_id, corners, yellows, reds, xg, now_iso),
            )
    log.debug("Stats stored for fixture %d", fixture_id)


def ingest_all_historical_stats() -> None:
    """
    Full pipeline: for every configured league, pull all finished fixtures
    and then fetch detailed stats for each.
    """
    for league_id, (name, _country) in LEAGUES.items():
        log.info("═══ Ingesting historical stats: %s ═══", name)
        ingest_fixtures(league_id, CURRENT_SEASON)

        # Now fetch per-fixture stats for those fixtures missing data
        with get_conn() as conn:
            rows = conn.execute(
                """SELECT f.fixture_id
                   FROM fixtures f
                   LEFT JOIN fixture_stats s ON f.fixture_id = s.fixture_id
                   WHERE f.league_id = ? AND f.season = ? AND f.status = 'FT'
                         AND s.fixture_id IS NULL""",
                (league_id, CURRENT_SEASON),
            ).fetchall()

        fixture_ids = [r["fixture_id"] for r in rows]
        log.info("Need stats for %d fixtures in %s", len(fixture_ids), name)

        for fid in fixture_ids:
            try:
                ingest_stats_for_fixture(fid)
            except Exception as exc:
                log.error("Failed stats for fixture %d: %s", fid, exc)


# ─── Bayesian-friendly query helpers ─────────────────────────────────────

def team_stat_history(team_id: int, stat: str = "corners") -> list[dict]:
    """
    Return per-match values for a stat (corners | yellow_cards | red_cards | xg)
    ordered chronologically.  Useful for computing Bayesian priors.
    """
    col = stat if stat in ("corners", "yellow_cards", "red_cards", "xg") else "corners"
    with get_conn() as conn:
        rows = conn.execute(
            f"""SELECT f.date_utc, f.fixture_id, fs.{col} AS value,
                       f.home_id, f.away_id
                FROM fixture_stats fs
                JOIN fixtures f ON fs.fixture_id = f.fixture_id
                WHERE fs.team_id = ? AND fs.{col} IS NOT NULL
                ORDER BY f.date_utc""",
            (team_id,),
        ).fetchall()
    return [dict(r) for r in rows]
