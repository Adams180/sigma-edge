"""
Logo seeder — fetches team logos from API-Football and updates the teams table.

Uses GET /fixtures?league=X&season=Y (5 requests total for Top 5 leagues)
to extract team name → logo mappings, then matches against the DB teams
by normalised name and updates logo_url.

Free tier: 100 req/day — this uses just 5.
"""

from __future__ import annotations

import logging
import re

from config import LEAGUES, CURRENT_SEASON, API_FOOTBALL_KEY
from database import get_conn

log = logging.getLogger(__name__)


def _normalise(name: str) -> str:
    """Lowercase, strip punctuation/accents for fuzzy matching."""
    name = name.lower().strip()
    name = re.sub(r"[^\w\s]", "", name)          # remove punctuation
    name = re.sub(r"\s+", " ", name)             # collapse spaces
    # common abbreviation normalisations
    replacements = {
        "manchester united": "man united",
        "manchester city": "man city",
        "newcastle united": "newcastle",
        "tottenham hotspur": "tottenham",
        "wolverhampton wanderers": "wolves",
        "west ham united": "west ham",
        "nottingham forest": "nott'm forest",
        "atletico madrid": "atletico madrid",
        "atletico de madrid": "atletico madrid",
        "inter": "inter milan",
        "internazionale": "inter milan",
        "ac milan": "milan",
        "bayer leverkusen": "leverkusen",
        "borussia dortmund": "dortmund",
        "rb leipzig": "rb leipzig",
        "paris saint-germain": "psg",
        "paris sg": "psg",
        "olympique de marseille": "marseille",
        "olympique marseille": "marseille",
        "olympique lyonnais": "lyon",
    }
    return replacements.get(name, name)


def ingest_logos() -> int:
    """
    Fetch team logos from API-Football and update the DB.
    Returns the number of teams updated.
    """
    if not API_FOOTBALL_KEY:
        log.warning("[logos] API_FOOTBALL_KEY not set — skipping logo seed")
        return 0

    from api_football import get_fixtures as apif_get_fixtures

    # Build name→logo map from API-Football fixture responses
    logo_map: dict[str, str] = {}   # normalised_name → logo_url

    for league_id, (league_name, _) in LEAGUES.items():
        try:
            fixtures = apif_get_fixtures(league_id, CURRENT_SEASON)
            for f in fixtures:
                teams = f.get("teams", {})
                for side in ("home", "away"):
                    t = teams.get(side, {})
                    name = t.get("name", "")
                    logo = t.get("logo", "")
                    if name and logo:
                        logo_map[_normalise(name)] = logo
            log.info("[logos] %s — %d team logos collected", league_name, len(logo_map))
        except Exception as exc:
            log.warning("[logos] Failed to fetch %s: %s", league_name, exc)

    if not logo_map:
        log.warning("[logos] No logos fetched from API-Football")
        return 0

    # Match against DB teams and update logo_url
    updated = 0
    with get_conn() as conn:
        rows = conn.execute("SELECT team_id, name FROM teams WHERE logo_url IS NULL").fetchall()
        for row in rows:
            key = _normalise(row["name"])
            logo = logo_map.get(key)

            # If exact match fails, try partial containment
            if not logo:
                for api_name, api_logo in logo_map.items():
                    if api_name in key or key in api_name:
                        logo = api_logo
                        break

            if logo:
                conn.execute(
                    "UPDATE teams SET logo_url = ? WHERE team_id = ?",
                    (logo, row["team_id"]),
                )
                updated += 1

    log.info("[logos] Updated %d teams with logos", updated)
    return updated


if __name__ == "__main__":
    import logging as _logging
    _logging.basicConfig(level=_logging.INFO, format="%(levelname)s %(message)s")
    n = ingest_logos()
    print(f"Updated {n} team logos.")
