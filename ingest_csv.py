"""
Free data loader — football-data.co.uk CSV ingestion.

Downloads historical match CSV files (NO API KEY required) and loads
teams, fixtures, per-game stats, referees, and Bet365 h2h odds into
the local SQLite database.

Sources (updated daily during season):
  https://www.football-data.co.uk/mmz4281/{SSSS}/{DIV}.csv

Seasons loaded: current 2025/26 + previous 2024/25 for deeper priors.
"""

from __future__ import annotations

import csv
import hashlib
import io
import logging
from datetime import datetime, timezone

import requests

from database import get_conn

log = logging.getLogger(__name__)

# ── CSV sources ───────────────────────────────────────────────────────────
_BASE_URL = "https://www.football-data.co.uk/mmz4281/{season}/{code}.csv"

_SOURCES = [
    # Current season 2025/26
    {"league_id": 39,  "code": "E0",  "season_code": "2526", "season": 2025},
    {"league_id": 140, "code": "SP1", "season_code": "2526", "season": 2025},
    {"league_id": 135, "code": "I1",  "season_code": "2526", "season": 2025},
    {"league_id": 78,  "code": "D1",  "season_code": "2526", "season": 2025},
    {"league_id": 61,  "code": "F1",  "season_code": "2526", "season": 2025},
    # Previous season 2024/25 for Bayesian priors
    {"league_id": 39,  "code": "E0",  "season_code": "2425", "season": 2024},
    {"league_id": 140, "code": "SP1", "season_code": "2425", "season": 2024},
    {"league_id": 135, "code": "I1",  "season_code": "2425", "season": 2024},
    {"league_id": 78,  "code": "D1",  "season_code": "2425", "season": 2024},
    {"league_id": 61,  "code": "F1",  "season_code": "2425", "season": 2024},
]


# ── Helpers ───────────────────────────────────────────────────────────────

def team_id_from_name(name: str) -> int:
    """Stable integer team ID from name (md5-based, collision-safe for ~10k teams)."""
    h = hashlib.md5(name.strip().lower().encode()).hexdigest()[:8]
    return int(h, 16) % 9_000_000 + 1_000_000


def fixture_id_from_parts(league_id: int, home_id: int, away_id: int, date_str: str) -> int:
    key = f"{league_id}_{home_id}_{away_id}_{date_str}"
    h = hashlib.md5(key.encode()).hexdigest()[:8]
    return int(h, 16) % 90_000_000 + 10_000_000


def _parse_date(date_str: str) -> str | None:
    """Parse DD/MM/YY or DD/MM/YYYY → ISO-8601."""
    for fmt in ("%d/%m/%Y", "%d/%m/%y"):
        try:
            return datetime.strptime(date_str.strip(), fmt).strftime("%Y-%m-%dT12:00:00+00:00")
        except ValueError:
            continue
    return None


def _int(val: str) -> int | None:
    try:
        return int(float(val)) if val and val.strip() else None
    except (ValueError, TypeError):
        return None


def _float(val: str) -> float | None:
    try:
        return float(val) if val and val.strip() else None
    except (ValueError, TypeError):
        return None


def _fetch_csv(url: str) -> list[dict]:
    """Download and parse CSV. Returns list of row dicts."""
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        content = resp.content.decode("utf-8", errors="replace")
        reader = csv.DictReader(io.StringIO(content))
        rows = [r for r in reader if r.get("HomeTeam") and r.get("AwayTeam")]
        log.info("  Fetched %d rows from %s", len(rows), url)
        return rows
    except Exception as exc:
        log.warning("  Skipped %s — %s", url, exc)
        return []


# ── Core ingestion ────────────────────────────────────────────────────────

def _ingest_source(src: dict) -> int:
    url = _BASE_URL.format(season=src["season_code"], code=src["code"])
    rows = _fetch_csv(url)
    if not rows:
        return 0

    league_id = src["league_id"]
    season = src["season"]
    now = datetime.now(timezone.utc).isoformat()
    count = 0

    with get_conn() as conn:
        for row in rows:
            home_name = row.get("HomeTeam", "").strip()
            away_name = row.get("AwayTeam", "").strip()
            date_str  = row.get("Date", "").strip()

            if not home_name or not away_name or not date_str:
                continue

            date_iso = _parse_date(date_str)
            if not date_iso:
                continue

            home_tid = team_id_from_name(home_name)
            away_tid = team_id_from_name(away_name)
            fix_id   = fixture_id_from_parts(league_id, home_tid, away_tid, date_str)

            # Teams
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

            # Fixture
            ftr    = row.get("FTR", "").strip()
            hg     = _int(row.get("FTHG", ""))
            ag     = _int(row.get("FTAG", ""))
            status = "FT" if ftr in ("H", "D", "A") else "NS"

            conn.execute(
                """INSERT INTO fixtures
                       (fixture_id, league_id, season, date_utc,
                        home_id, away_id, status, home_goals, away_goals)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(fixture_id) DO UPDATE SET
                       status=excluded.status,
                       home_goals=excluded.home_goals,
                       away_goals=excluded.away_goals""",
                (fix_id, league_id, season, date_iso,
                 home_tid, away_tid, status, hg, ag),
            )

            # Per-team fixture stats (corners, cards)
            for tid, prefix in [(home_tid, "H"), (away_tid, "A")]:
                corners = _int(row.get(f"{prefix}C", ""))
                yellows = _int(row.get(f"{prefix}Y", ""))
                reds    = _int(row.get(f"{prefix}R", ""))
                if any(v is not None for v in [corners, yellows, reds]):
                    conn.execute(
                        """INSERT INTO fixture_stats
                               (fixture_id, team_id, corners,
                                yellow_cards, red_cards, fetched_at)
                           VALUES (?, ?, ?, ?, ?, ?)
                           ON CONFLICT(fixture_id, team_id) DO UPDATE SET
                               corners=excluded.corners,
                               yellow_cards=excluded.yellow_cards,
                               red_cards=excluded.red_cards""",
                        (fix_id, tid, corners, yellows, reds, now),
                    )

            # Referee
            ref_name = row.get("Referee", "").strip()
            if ref_name:
                ref_id = team_id_from_name("ref_" + ref_name)
                conn.execute(
                    "INSERT INTO referees (referee_id, name, fetched_at)"
                    " VALUES (?, ?, ?) ON CONFLICT(referee_id) DO NOTHING",
                    (ref_id, ref_name, now),
                )
                conn.execute(
                    "INSERT INTO fixture_referees (fixture_id, referee_id)"
                    " VALUES (?, ?) ON CONFLICT(fixture_id) DO NOTHING",
                    (fix_id, ref_id),
                )

            # Bet365 h2h odds from CSV columns B365H / B365D / B365A
            b365h = _float(row.get("B365H", ""))
            b365d = _float(row.get("B365D", ""))
            b365a = _float(row.get("B365A", ""))
            if b365h and b365d and b365a:
                for outcome, price in [("Home", b365h), ("Draw", b365d), ("Away", b365a)]:
                    conn.execute(
                        """INSERT INTO odds_snapshots
                               (fixture_id, sport_key, bookmaker, market,
                                outcome_name, price, fetched_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?)
                           ON CONFLICT DO NOTHING""",
                        (fix_id, str(league_id), "bet365", "h2h",
                         outcome, price, date_iso),
                    )

            count += 1

    log.info("  Loaded %d fixtures — league=%d season=%d", count, league_id, season)
    return count


def ingest_csv_all() -> int:
    """Download and ingest all CSV sources. Returns total fixtures upserted."""
    total = 0
    for src in _SOURCES:
        log.info("CSV ingest — league=%d season=%d", src["league_id"], src["season"])
        total += _ingest_source(src)
    log.info("CSV ingest complete: %d total fixtures", total)
    return total


def db_has_data() -> bool:
    """Return True if the DB already has meaningful historical data."""
    with get_conn() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS n FROM fixtures WHERE status='FT'"
        ).fetchone()
        return (row["n"] or 0) > 20
