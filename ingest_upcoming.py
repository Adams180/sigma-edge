"""
Ingest upcoming fixtures and live h2h odds.

Primary source: The Odds API (provides fixtures + odds together).
Fallback source: API-Football /fixtures?next=N (fixtures only, no odds).

When The Odds API quota is exhausted the fallback ensures the app still
shows upcoming matches.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import odds_api
import api_football
from config import ODDS_SPORT_KEYS, LEAGUES, CURRENT_SEASON, WORLD_CUP_SEASON
from database import get_conn
from ingest_csv import team_id_from_name, fixture_id_from_parts

log = logging.getLogger(__name__)

# Mapping: Odds API sport key → our league_id
_SPORT_TO_LEAGUE: dict[str, int] = {
    "soccer_epl":                   39,
    "soccer_spain_la_liga":         140,
    "soccer_italy_serie_a":         135,
    "soccer_germany_bundesliga":    78,
    "soccer_france_ligue_one":      61,
    "soccer_uefa_champs_league":    2,
    "soccer_uefa_europa_league":    3,
    "soccer_fifa_world_cup":        1,
}

# Odds API sometimes uses different team names than football-data.co.uk.
# This map normalises their names so IDs stay consistent.
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
    "atletico madrid":          "Atletico Madrid",  # already consistent
    "real madrid":              "Real Madrid",
    "fc barcelona":             "Barcelona",
    "paris saint-germain":      "Paris SG",
    "paris sg":                 "Paris SG",
    "inter milan":              "Inter",
    "ac milan":                 "Milan",
    "as roma":                  "Roma",
    "ss lazio":                 "Lazio",
    "bayer leverkusen":         "Leverkusen",
    "borussia dortmund":        "Dortmund",
    "rb leipzig":               "RB Leipzig",
    "eintracht frankfurt":      "Ein Frankfurt",
}


def _normalise(name: str) -> str:
    return _NAME_NORM.get(name.strip().lower(), name.strip())


def ingest_upcoming() -> int:
    """
    Pull upcoming events from The Odds API, upsert fixture records,
    and store h2h odds.  Returns total fixtures processed.
    """
    now = datetime.now(timezone.utc).isoformat()
    total = 0

    for sport_key in ODDS_SPORT_KEYS:
        league_id = _SPORT_TO_LEAGUE.get(sport_key)
        if not league_id:
            continue

        try:
            events = odds_api.get_odds(sport_key, markets="h2h", regions="uk,eu")
        except Exception as exc:
            log.warning("Odds API failed for %s: %s", sport_key, exc)
            continue

        with get_conn() as conn:
            for ev in events:
                home_raw = ev.get("home_team", "")
                away_raw = ev.get("away_team", "")
                commence = ev.get("commence_time", "")  # ISO-8601 UTC

                if not home_raw or not away_raw or not commence:
                    continue

                home_name = _normalise(home_raw)
                away_name = _normalise(away_raw)

                home_tid = team_id_from_name(home_name)
                away_tid = team_id_from_name(away_name)

                # Date key for fixture ID (just the date portion)
                date_key = commence[:10]  # "2026-04-05"
                fix_id   = fixture_id_from_parts(league_id, home_tid, away_tid, date_key)

                # Upsert teams
                conn.execute(
                    "INSERT INTO teams (team_id, name) VALUES (?, ?)"
                    " ON CONFLICT(team_id) DO UPDATE SET name=excluded.name",
                    (home_tid, home_name),
                )
                conn.execute(
                    "INSERT INTO teams (team_id, name) VALUES (?, ?)"
                    " ON CONFLICT(team_id) DO UPDATE SET name=excluded.name",
                    (away_tid, away_name),
                )

                # Upsert fixture (status NS = not started)
                conn.execute(
                    """INSERT INTO fixtures
                           (fixture_id, league_id, season, date_utc,
                            home_id, away_id, status)
                       VALUES (?, ?, 2025, ?, ?, ?, 'NS')
                       ON CONFLICT(fixture_id) DO UPDATE SET
                           date_utc=excluded.date_utc""",
                    (fix_id, league_id, commence, home_tid, away_tid),
                )

                # Store h2h odds from each bookmaker
                for bookmaker in ev.get("bookmakers", []):
                    bk_name = bookmaker.get("key", "unknown")
                    for market in bookmaker.get("markets", []):
                        if market.get("key") != "h2h":
                            continue
                        for outcome in market.get("outcomes", []):
                            name   = outcome.get("name", "")
                            # Map home/away team names to Home/Draw/Away
                            if name == home_raw or name == home_name:
                                label = "Home"
                            elif name == away_raw or name == away_name:
                                label = "Away"
                            elif name.lower() == "draw":
                                label = "Draw"
                            else:
                                label = name
                            price = outcome.get("price")
                            if price:
                                conn.execute(
                                    """INSERT INTO odds_snapshots
                                           (fixture_id, sport_key, bookmaker, market,
                                            outcome_name, price, fetched_at)
                                       VALUES (?, ?, ?, 'h2h', ?, ?, ?)
                                       ON CONFLICT DO NOTHING""",
                                    (fix_id, sport_key, bk_name,
                                     label, price, now),
                                )

                total += 1

        log.info("Upcoming ingest: %s → %d events", sport_key, len(events))

    log.info("Upcoming ingest complete: %d fixtures total", total)

    # If Odds API returned nothing (quota exhausted?), fall back to API-Football
    if total == 0:
        log.warning("Odds API returned 0 fixtures — falling back to API-Football")
        total = _fallback_api_football()

    return total


def _fallback_api_football() -> int:
    """
    Pull next upcoming fixtures from API-Football for each league.
    No odds data — just ensures the fixture list is populated.
    Uses ~8 API calls (1 per league), well within 100/day free tier.
    """
    total = 0
    for league_id, (league_name, _country) in LEAGUES.items():
        season = WORLD_CUP_SEASON if league_id == 1 else CURRENT_SEASON
        try:
            fixtures = api_football.get_fixtures(league_id, season, next="10")
        except Exception as exc:
            log.warning("API-Football fallback failed for %s: %s", league_name, exc)
            continue

        with get_conn() as conn:
            for fx in fixtures:
                info = fx.get("fixture", {})
                teams = fx.get("teams", {})
                league = fx.get("league", {})

                home_raw = teams.get("home", {}).get("name", "")
                away_raw = teams.get("away", {}).get("name", "")
                date_utc = info.get("date", "")  # ISO-8601

                if not home_raw or not away_raw or not date_utc:
                    continue

                home_name = _normalise(home_raw)
                away_name = _normalise(away_raw)

                home_tid = team_id_from_name(home_name)
                away_tid = team_id_from_name(away_name)

                date_key = date_utc[:10]
                fix_id = fixture_id_from_parts(league_id, home_tid, away_tid, date_key)

                # Upsert teams (with logo if available)
                home_logo = teams.get("home", {}).get("logo", "")
                away_logo = teams.get("away", {}).get("logo", "")

                conn.execute(
                    "INSERT INTO teams (team_id, name, logo_url) VALUES (?, ?, ?)"
                    " ON CONFLICT(team_id) DO UPDATE SET name=excluded.name,"
                    " logo_url=COALESCE(NULLIF(excluded.logo_url,''), teams.logo_url)",
                    (home_tid, home_name, home_logo),
                )
                conn.execute(
                    "INSERT INTO teams (team_id, name, logo_url) VALUES (?, ?, ?)"
                    " ON CONFLICT(team_id) DO UPDATE SET name=excluded.name,"
                    " logo_url=COALESCE(NULLIF(excluded.logo_url,''), teams.logo_url)",
                    (away_tid, away_name, away_logo),
                )

                conn.execute(
                    """INSERT INTO fixtures
                           (fixture_id, league_id, season, date_utc,
                            home_id, away_id, status)
                       VALUES (?, ?, ?, ?, ?, ?, 'NS')
                       ON CONFLICT(fixture_id) DO UPDATE SET
                           date_utc=excluded.date_utc""",
                    (fix_id, league_id, season, date_utc, home_tid, away_tid),
                )
                total += 1

        log.info("API-Football fallback: %s → %d fixtures", league_name, len(fixtures))

    log.info("API-Football fallback complete: %d fixtures total", total)
    return total
