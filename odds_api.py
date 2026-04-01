"""
Thin HTTP wrapper around The Odds API (v4).
"""

import logging
import time
from typing import Any

import requests

from config import ODDS_API_BASE, THE_ODDS_API_KEY

log = logging.getLogger(__name__)

_REQUEST_INTERVAL = 1.0  # The Odds API is more generous on rate limits
_last_call: float = 0.0


def _throttle() -> None:
    global _last_call
    elapsed = time.monotonic() - _last_call
    if elapsed < _REQUEST_INTERVAL:
        time.sleep(_REQUEST_INTERVAL - elapsed)
    _last_call = time.monotonic()


def _validate_key() -> None:
    if not THE_ODDS_API_KEY:
        raise RuntimeError(
            "THE_ODDS_API_KEY is not set. "
            "Export it as an environment variable before running."
        )


def get(endpoint: str, params: dict[str, Any] | None = None) -> list[dict]:
    """
    GET request to The Odds API.  Returns the JSON array response.
    """
    _validate_key()
    _throttle()

    url = f"{ODDS_API_BASE}/{endpoint.lstrip('/')}"
    all_params = {"apiKey": THE_ODDS_API_KEY}
    if params:
        all_params.update(params)

    log.debug("Odds API GET %s  params=%s", url, {k: v for k, v in all_params.items() if k != "apiKey"})

    resp = requests.get(url, params=all_params, timeout=30)
    resp.raise_for_status()

    remaining = resp.headers.get("x-requests-remaining", "?")
    log.info("Odds API %s → %d results  (quota remaining: %s)", endpoint, len(resp.json()), remaining)

    return resp.json()


# ─── Convenience helpers ──────────────────────────────────────────────────

def get_odds(
    sport_key: str,
    regions: str = "uk,eu",
    markets: str = "h2h",
    odds_format: str = "decimal",
) -> list[dict]:
    """
    Fetch current odds for a sport.
    markets: comma-sep list, e.g. "h2h,totals"
    """
    return get(
        f"sports/{sport_key}/odds",
        {
            "regions": regions,
            "markets": markets,
            "oddsFormat": odds_format,
        },
    )


def get_events(sport_key: str) -> list[dict]:
    """Return upcoming events for a sport."""
    return get(f"sports/{sport_key}/events")
