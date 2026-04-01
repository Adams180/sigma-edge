"""
Thin HTTP wrapper around API-Football (v3).
Handles rate-limiting, retries, and response validation.
"""

import logging
import time
from typing import Any

import requests

from config import API_FOOTBALL_BASE, API_FOOTBALL_HEADERS, API_FOOTBALL_KEY

log = logging.getLogger(__name__)

# API-Football free tier: 100 req/day — be conservative
_REQUEST_INTERVAL = 6.5  # seconds between calls
_last_call: float = 0.0


def _throttle() -> None:
    global _last_call
    elapsed = time.monotonic() - _last_call
    if elapsed < _REQUEST_INTERVAL:
        time.sleep(_REQUEST_INTERVAL - elapsed)
    _last_call = time.monotonic()


def _validate_key() -> None:
    if not API_FOOTBALL_KEY:
        raise RuntimeError(
            "API_FOOTBALL_KEY is not set. "
            "Export it as an environment variable before running."
        )


def get(endpoint: str, params: dict[str, Any] | None = None) -> list[dict]:
    """
    GET request to API-Football.  Returns the 'response' array.
    Raises on HTTP or API errors.
    """
    _validate_key()
    _throttle()

    url = f"{API_FOOTBALL_BASE}/{endpoint.lstrip('/')}"
    log.debug("API-Football GET %s  params=%s", url, params)

    resp = requests.get(url, headers=API_FOOTBALL_HEADERS, params=params, timeout=30)
    resp.raise_for_status()
    body = resp.json()

    errors = body.get("errors")
    if errors:
        log.error("API-Football errors: %s", errors)
        raise RuntimeError(f"API-Football returned errors: {errors}")

    results = body.get("response", [])
    remaining = body.get("paging", {}).get("total", len(results))
    log.info(
        "API-Football %s → %d results (total %s)",
        endpoint,
        len(results),
        remaining,
    )
    return results


# ─── Convenience helpers ──────────────────────────────────────────────────

def get_fixtures(league_id: int, season: int, **extra) -> list[dict]:
    """Return fixtures for a league/season."""
    params = {"league": league_id, "season": season, **extra}
    return get("fixtures", params)


def get_fixture_stats(fixture_id: int) -> list[dict]:
    """Return per-team statistics for a single fixture."""
    return get("fixtures/statistics", {"fixture": fixture_id})


def get_fixture_lineups(fixture_id: int) -> list[dict]:
    """Return lineups for a fixture (available ~60 min before KO)."""
    return get("fixtures/lineups", {"fixture": fixture_id})


def get_fixture_xg(fixture_id: int) -> list[dict]:
    """
    xG is embedded in predictions endpoint on API-Football.
    Returns the predictions/response array.
    """
    return get("predictions", {"fixture": fixture_id})


def get_teams(league_id: int, season: int) -> list[dict]:
    """Return all teams in a league-season."""
    return get("teams", {"league": league_id, "season": season})


def get_fixture_detail(fixture_id: int) -> list[dict]:
    """Return full fixture detail (includes referee info)."""
    return get("fixtures", {"id": fixture_id})


def get_player_stats(player_id: int, season: int) -> list[dict]:
    """Return season-level stats for a player."""
    return get("players", {"id": player_id, "season": season})


def get_team_players(team_id: int, season: int, page: int = 1) -> list[dict]:
    """Return squad / player stats for a team in a season."""
    return get("players", {"team": team_id, "season": season, "page": page})
