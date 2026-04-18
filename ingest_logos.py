"""
Logo seeder — fetches team logos from API-Football /teams endpoint
and updates the teams table by matching normalised names.

Uses GET /teams?league=X&season=Y — one request per league.
Free tier: 100 req/day — this uses 6-7 requests.
"""

from __future__ import annotations

import logging

from config import LEAGUES, CURRENT_SEASON, WORLD_CUP_SEASON, API_FOOTBALL_KEY
from database import get_conn
import api_football

log = logging.getLogger(__name__)

# Same normalisation as ingest_upcoming so names align
_NAME_NORM: dict[str, str] = {
    "manchester united":        "Man United",
    "manchester city":          "Man City",
    "wolverhampton wanderers":  "Wolves",
    "tottenham hotspur":        "Tottenham",
    "nottingham forest":        "Nott'm Forest",
    "newcastle united":         "Newcastle",
    "west ham united":          "West Ham",
    "leeds united":             "Leeds",
    "leicester city":           "Leicester",
    "sheffield united":         "Sheffield Utd",
    "atletico madrid":          "Atletico Madrid",
    "atletico de madrid":       "Atletico Madrid",
    "real madrid":              "Real Madrid",
    "fc barcelona":             "Barcelona",
    "paris saint-germain":      "Paris SG",
    "paris saint germain":      "Paris SG",
    "inter milan":              "Inter",
    "internazionale":           "Inter",
    "fc internazionale milano": "Inter",
    "ac milan":                 "Milan",
    "as roma":                  "Roma",
    "ss lazio":                 "Lazio",
    "bayer 04 leverkusen":      "Leverkusen",
    "bayer leverkusen":         "Leverkusen",
    "borussia dortmund":        "Dortmund",
    "rb leipzig":               "RB Leipzig",
    "eintracht frankfurt":      "Ein Frankfurt",
    "olympique de marseille":   "Marseille",
    "olympique marseille":      "Marseille",
    "olympique lyonnais":       "Lyon",
    "olympique lyon":           "Lyon",
    "as monaco":                "Monaco",
    "ssc napoli":               "Napoli",
    "atalanta bc":              "Atalanta",
    "hellas verona":            "Verona",
    "sc freiburg":              "Freiburg",
    "1. fc union berlin":       "Union Berlin",
    "1. fc heidenheim 1846":    "Heidenheim",
    "1. fsv mainz 05":          "Mainz",
    "fc augsburg":              "Augsburg",
    "vfb stuttgart":             "Stuttgart",
    "vfl wolfsburg":            "Wolfsburg",
    "vfl bochum 1848":          "Bochum",
    "tsg 1899 hoffenheim":      "Hoffenheim",
    "sv werder bremen":         "Werder Bremen",
    "borussia monchengladbach": "M'Gladbach",
    "borussia mönchengladbach": "M'Gladbach",
    "fc bayern münchen":        "Bayern Munich",
    "fc bayern munich":         "Bayern Munich",
    "bayern munich":            "Bayern Munich",
    "real sociedad":            "Real Sociedad",
    "real betis":               "Real Betis",
    "rcd mallorca":             "Mallorca",
    "deportivo alaves":         "Alaves",
    "athletic bilbao":          "Ath Bilbao",
    "athletic club":            "Ath Bilbao",
    "rc celta de vigo":         "Celta",
    "celta vigo":               "Celta",
    "getafe cf":                "Getafe",
    "ca osasuna":               "Osasuna",
    "ud las palmas":            "Las Palmas",
    "rayo vallecano":           "Vallecano",
    "cd leganes":               "Leganes",
    "real valladolid":          "Valladolid",
    "girona fc":                "Girona",
    "valencia cf":              "Valencia",
    "villarreal cf":            "Villarreal",
    "sevilla fc":               "Sevilla",
    "rcd espanyol":             "Espanyol",
    "real betis balompie":      "Real Betis",
}


def _norm(name: str) -> str:
    """Normalise API-Football team name to match our DB names."""
    return _NAME_NORM.get(name.strip().lower(), name.strip())


def ingest_logos() -> int:
    """
    Fetch team logos from API-Football /teams endpoint and update the DB.
    Returns the number of teams updated.
    """
    if not API_FOOTBALL_KEY:
        log.warning("[logos] API_FOOTBALL_KEY not set — skipping logo seed")
        return 0

    # Build normalised_name → logo_url from API-Football /teams
    logo_map: dict[str, str] = {}  # normalised name → logo URL

    for league_id, (league_name, _) in LEAGUES.items():
        try:
            season = WORLD_CUP_SEASON if league_id == 1 else CURRENT_SEASON
            results = api_football.get("teams", {"league": league_id, "season": season})
            for item in results:
                team = item.get("team", {})
                name = team.get("name", "")
                logo = team.get("logo", "")
                if name and logo:
                    logo_map[_norm(name)] = logo
            log.info("[logos] %s — %d teams fetched", league_name, len(results))
        except Exception as exc:
            log.warning("[logos] Failed to fetch teams for %s: %s", league_name, exc)

    if not logo_map:
        log.warning("[logos] No logos fetched from API-Football")
        return 0

    log.info("[logos] Total unique team→logo mappings: %d", len(logo_map))

    # Match against DB teams by name (exact match first, then case-insensitive)
    updated = 0
    with get_conn() as conn:
        rows = conn.execute("SELECT team_id, name FROM teams").fetchall()
        for row in rows:
            db_name = row["name"]
            # Try exact match
            logo = logo_map.get(db_name)
            # Try case-insensitive
            if not logo:
                logo = logo_map.get(db_name.strip())
            # Try normalising the DB name through the same map
            if not logo:
                logo = logo_map.get(_norm(db_name))
            # Try substring containment as last resort
            if not logo:
                db_lower = db_name.lower()
                for api_name, api_logo in logo_map.items():
                    api_lower = api_name.lower()
                    if api_lower == db_lower or api_lower in db_lower or db_lower in api_lower:
                        logo = api_logo
                        break

            if logo:
                conn.execute(
                    "UPDATE teams SET logo_url = ? WHERE team_id = ?",
                    (logo, row["team_id"]),
                )
                updated += 1
            else:
                log.debug("[logos] No logo match for DB team: %r", db_name)

    log.info("[logos] Updated %d / %d teams with logos", updated, len(rows))
    return updated


if __name__ == "__main__":
    import logging as _logging
    _logging.basicConfig(level=_logging.INFO, format="%(levelname)s %(message)s")
    n = ingest_logos()
    print(f"Updated {n} team logos.")
