"""
Configuration for the data ingestion engine.
API keys are read from environment variables for security.
"""

import os

# ── API Keys (set these as environment variables) ─────────────────────────
API_FOOTBALL_KEY = os.environ.get("API_FOOTBALL_KEY", "")
THE_ODDS_API_KEY = os.environ.get("THE_ODDS_API_KEY", "")

# ── API-Football settings ─────────────────────────────────────────────────
API_FOOTBALL_BASE = "https://v3.football.api-sports.io"
API_FOOTBALL_HEADERS = {
    "x-apisports-key": API_FOOTBALL_KEY,
}

# Top 5 European leagues + Champions League
# league_id: (name, country)
LEAGUES = {
    39:  ("Premier League", "England"),
    140: ("La Liga", "Spain"),
    135: ("Serie A", "Italy"),
    78:  ("Bundesliga", "Germany"),
    61:  ("Ligue 1", "France"),
    2:   ("Champions League", "Europe"),
}

# Current season (update each year)
CURRENT_SEASON = 2025

# ── The Odds API settings ─────────────────────────────────────────────────
ODDS_API_BASE = "https://api.the-odds-api.com/v4"

# Sport keys for The Odds API matching our leagues
ODDS_SPORT_KEYS = [
    "soccer_epl",
    "soccer_spain_la_liga",
    "soccer_italy_serie_a",
    "soccer_germany_bundesliga",
    "soccer_france_ligue_one",
    "soccer_uefa_champs_league",
]

# ── Database ──────────────────────────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(__file__), "bet_data.db")

# ── Lineup trigger ────────────────────────────────────────────────────────
LINEUP_PREFETCH_MINUTES = 60  # minutes before kickoff to fetch lineups
