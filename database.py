"""
SQLite database initialisation and helper utilities.
Tables are designed for Bayesian updates — each row stores
per-fixture granular data so priors can be recomputed easily.
"""

import sqlite3
from contextlib import contextmanager
from config import DB_PATH

SCHEMA = """
-- ─── Teams ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
    team_id     INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    logo_url    TEXT
);

-- ─── Fixtures ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fixtures (
    fixture_id  INTEGER PRIMARY KEY,
    league_id   INTEGER NOT NULL,
    season      INTEGER NOT NULL,
    date_utc    TEXT    NOT NULL,          -- ISO-8601
    home_id     INTEGER NOT NULL REFERENCES teams(team_id),
    away_id     INTEGER NOT NULL REFERENCES teams(team_id),
    status      TEXT    DEFAULT 'NS',      -- NS / LIVE / FT …
    home_goals  INTEGER,
    away_goals  INTEGER
);

-- ─── Historical Team Stats (per fixture) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS fixture_stats (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    fixture_id      INTEGER NOT NULL REFERENCES fixtures(fixture_id),
    team_id         INTEGER NOT NULL REFERENCES teams(team_id),
    corners         INTEGER,
    yellow_cards    INTEGER,
    red_cards       INTEGER,
    xg              REAL,                  -- expected goals
    fetched_at      TEXT NOT NULL,          -- ISO-8601
    UNIQUE(fixture_id, team_id)
);

-- ─── Market Odds snapshots ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS odds_snapshots (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    fixture_id      INTEGER REFERENCES fixtures(fixture_id),
    sport_key       TEXT    NOT NULL,
    bookmaker       TEXT    NOT NULL,
    market          TEXT    NOT NULL,       -- h2h | totals_corners | totals_cards
    outcome_name    TEXT    NOT NULL,       -- Home / Draw / Away / Over / Under
    outcome_point   REAL,                  -- line (e.g. 9.5 corners)
    price           REAL    NOT NULL,
    fetched_at      TEXT    NOT NULL,
    UNIQUE(fixture_id, bookmaker, market, outcome_name, outcome_point, fetched_at)
);

-- ─── Live Lineups ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lineups (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    fixture_id      INTEGER NOT NULL REFERENCES fixtures(fixture_id),
    team_id         INTEGER NOT NULL REFERENCES teams(team_id),
    player_id       INTEGER NOT NULL,
    player_name     TEXT    NOT NULL,
    position        TEXT,
    grid_pos        TEXT,                  -- e.g. "1:1"
    is_starter      INTEGER NOT NULL DEFAULT 1,
    fetched_at      TEXT    NOT NULL,
    UNIQUE(fixture_id, team_id, player_id, fetched_at)
);

-- ─── Referees ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referees (
    referee_id          INTEGER PRIMARY KEY,
    name                TEXT NOT NULL,
    total_matches       INTEGER DEFAULT 0,
    avg_yellow_per_match REAL DEFAULT 0.0,
    avg_red_per_match   REAL DEFAULT 0.0,
    fetched_at          TEXT
);

-- ─── Fixture ↔ Referee mapping ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fixture_referees (
    fixture_id  INTEGER PRIMARY KEY REFERENCES fixtures(fixture_id),
    referee_id  INTEGER NOT NULL REFERENCES referees(referee_id)
);

-- ─── Player season-level stats (for key-player detection) ────────────────
CREATE TABLE IF NOT EXISTS player_stats (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id   INTEGER NOT NULL,
    player_name TEXT    NOT NULL,
    team_id     INTEGER NOT NULL REFERENCES teams(team_id),
    league_id   INTEGER NOT NULL,
    season      INTEGER NOT NULL,
    total_xg    REAL    DEFAULT 0.0,
    total_assists INTEGER DEFAULT 0,
    appearances INTEGER DEFAULT 0,
    fetched_at  TEXT    NOT NULL,
    UNIQUE(player_id, team_id, season)
);

-- ─── Indexes for fast Bayesian queries ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_stats_team   ON fixture_stats(team_id);
CREATE INDEX IF NOT EXISTS idx_stats_fix    ON fixture_stats(fixture_id);
CREATE INDEX IF NOT EXISTS idx_odds_fix     ON odds_snapshots(fixture_id);
CREATE INDEX IF NOT EXISTS idx_lineups_fix  ON lineups(fixture_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_dt  ON fixtures(date_utc);
CREATE INDEX IF NOT EXISTS idx_player_team  ON player_stats(team_id, season);
CREATE INDEX IF NOT EXISTS idx_fix_ref      ON fixture_referees(referee_id);
"""


def init_db() -> None:
    """Create all tables if they don't yet exist."""
    with get_conn() as conn:
        conn.executescript(SCHEMA)


@contextmanager
def get_conn():
    """Yield a SQLite connection with WAL mode for concurrent reads."""
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
