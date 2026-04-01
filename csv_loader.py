"""
CSV Data Loader — Free Historical Football Data.

Downloads and loads match data from football-data.co.uk.
This provides complete match results, corners, cards, referee names,
and bookmaker odds for all major European leagues — completely FREE.

Data columns available:
    - Date, HomeTeam, AwayTeam, FTHG, FTAG, FTR (Full time result)
    - HC, AC (Home/Away Corners)
    - HY, AY, HR, AR (Yellow/Red cards Home/Away)
    - Referee
    - Bookmaker odds: B365H, B365D, B365A, PSH, PSD, PSA, etc.

Source: https://www.football-data.co.uk/data.php
"""

from __future__ import annotations

import csv
import logging
import os
import requests
from datetime import datetime
from typing import Generator

log = logging.getLogger(__name__)

# ─── Data source URLs ────────────────────────────────────────────────────
# football-data.co.uk CSV format: season code = 2-digit years
# e.g. 2425 = 2024/2025 season

BASE_URL = "https://www.football-data.co.uk/mmz4281"

LEAGUE_CSV_MAP = {
    "E0": "Premier League",      # England Premier League
    "SP1": "La Liga",            # Spain Primera
    "I1": "Serie A",             # Italy Serie A
    "D1": "Bundesliga",          # Germany Bundesliga
    "F1": "Ligue 1",             # France Ligue 1
}

# Map to our internal league IDs (matching config.py LEAGUES)
LEAGUE_TO_ID = {
    "E0": 39,     # Premier League
    "SP1": 140,   # La Liga
    "I1": 135,    # Serie A
    "D1": 78,     # Bundesliga
    "F1": 61,     # Ligue 1
}


def season_codes(n_seasons: int = 3) -> list[str]:
    """Generate season codes for the last N seasons.
    e.g. for 2025/2026: '2526', '2425', '2324'
    """
    current_year = datetime.now().year
    codes = []
    for i in range(n_seasons):
        start = current_year - 1 - i
        end = start + 1
        codes.append(f"{start % 100:02d}{end % 100:02d}")
    return codes


def download_csv(league_code: str, season_code: str, data_dir: str) -> str | None:
    """Download a single CSV file. Returns local path or None on failure."""
    url = f"{BASE_URL}/{season_code}/{league_code}.csv"
    os.makedirs(data_dir, exist_ok=True)
    local_path = os.path.join(data_dir, f"{league_code}_{season_code}.csv")

    if os.path.exists(local_path):
        log.info("Cache hit: %s", local_path)
        return local_path

    log.info("Downloading %s → %s", url, local_path)
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        with open(local_path, "w", encoding="utf-8", newline="") as f:
            f.write(resp.text)
        return local_path
    except requests.RequestException as e:
        log.warning("Failed to download %s: %s", url, e)
        return None


def download_all(
    leagues: list[str] | None = None,
    n_seasons: int = 3,
    data_dir: str | None = None,
) -> list[str]:
    """Download CSV files for all leagues and seasons. Returns list of paths."""
    if data_dir is None:
        data_dir = os.path.join(os.path.dirname(__file__), "data", "csv")
    if leagues is None:
        leagues = list(LEAGUE_CSV_MAP.keys())

    codes = season_codes(n_seasons)
    paths = []
    for league in leagues:
        for code in codes:
            path = download_csv(league, code, data_dir)
            if path:
                paths.append(path)
    return paths


def _safe_int(val: str | None) -> int | None:
    """Convert to int, return None on failure."""
    if val is None or val.strip() == "":
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


def _safe_float(val: str | None) -> float | None:
    """Convert to float, return None on failure."""
    if val is None or val.strip() == "":
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _parse_date(date_str: str) -> str | None:
    """Parse various date formats to ISO-8601."""
    for fmt in ("%d/%m/%Y", "%d/%m/%y", "%Y-%m-%d"):
        try:
            return datetime.strptime(date_str.strip(), fmt).strftime("%Y-%m-%d")
        except (ValueError, AttributeError):
            continue
    return None


def parse_csv(filepath: str, league_code: str) -> Generator[dict, None, None]:
    """
    Parse a football-data.co.uk CSV into standardized match dicts.

    Yields dicts with:
        date, home_team, away_team, home_goals, away_goals, result,
        home_corners, away_corners, home_yellows, away_yellows,
        home_reds, away_reds, referee,
        odds_home, odds_draw, odds_away (best available),
        league, league_id
    """
    league_name = LEAGUE_CSV_MAP.get(league_code, league_code)
    league_id = LEAGUE_TO_ID.get(league_code, 0)

    with open(filepath, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Skip empty rows
            if not row.get("HomeTeam") or not row.get("AwayTeam"):
                continue

            date = _parse_date(row.get("Date", ""))
            if not date:
                continue

            home_goals = _safe_int(row.get("FTHG"))
            away_goals = _safe_int(row.get("FTAG"))
            if home_goals is None or away_goals is None:
                continue

            # Best available odds: Pinnacle > Bet365 > market average
            odds_home = (
                _safe_float(row.get("PSH")) or
                _safe_float(row.get("B365H")) or
                _safe_float(row.get("AvgH"))
            )
            odds_draw = (
                _safe_float(row.get("PSD")) or
                _safe_float(row.get("B365D")) or
                _safe_float(row.get("AvgD"))
            )
            odds_away = (
                _safe_float(row.get("PSA")) or
                _safe_float(row.get("B365A")) or
                _safe_float(row.get("AvgA"))
            )

            yield {
                "date": date,
                "home_team": row["HomeTeam"].strip(),
                "away_team": row["AwayTeam"].strip(),
                "home_goals": home_goals,
                "away_goals": away_goals,
                "result": row.get("FTR", "").strip(),  # H / D / A
                "home_corners": _safe_int(row.get("HC")),
                "away_corners": _safe_int(row.get("AC")),
                "home_yellows": _safe_int(row.get("HY")),
                "away_yellows": _safe_int(row.get("AY")),
                "home_reds": _safe_int(row.get("HR")),
                "away_reds": _safe_int(row.get("AR")),
                "referee": (row.get("Referee") or "").strip() or None,
                "odds_home": odds_home,
                "odds_draw": odds_draw,
                "odds_away": odds_away,
                # Corner odds (if available in some datasets)
                "odds_corners_over": _safe_float(row.get("AHCh")),
                "odds_corners_under": _safe_float(row.get("AHCa")),
                "league": league_name,
                "league_id": league_id,
                "league_code": league_code,
            }


def load_all_matches(
    leagues: list[str] | None = None,
    n_seasons: int = 3,
    data_dir: str | None = None,
) -> list[dict]:
    """Download + parse all CSV data into a flat list of match dicts."""
    paths = download_all(leagues, n_seasons, data_dir)
    matches = []
    for path in paths:
        # Extract league code from filename: "E0_2425.csv" → "E0"
        fname = os.path.basename(path)
        league_code = fname.split("_")[0]
        for match in parse_csv(path, league_code):
            matches.append(match)

    # Sort by date
    matches.sort(key=lambda m: m["date"])
    log.info("Loaded %d matches from %d CSV files", len(matches), len(paths))
    return matches


# ── CLI test ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    matches = load_all_matches(n_seasons=2)
    print(f"\nLoaded {len(matches)} matches")
    if matches:
        print(f"Date range: {matches[0]['date']} → {matches[-1]['date']}")
        # Show sample
        for m in matches[:5]:
            print(f"  {m['date']}  {m['home_team']} {m['home_goals']}-{m['away_goals']} {m['away_team']}  "
                  f"Corners: {m['home_corners']}-{m['away_corners']}  "
                  f"Cards: {m['home_yellows']}-{m['away_yellows']}  "
                  f"Ref: {m['referee']}  "
                  f"Odds: {m['odds_home']}/{m['odds_draw']}/{m['odds_away']}")
