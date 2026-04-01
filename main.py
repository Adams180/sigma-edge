#!/usr/bin/env python3
"""
BET Data Ingestion Engine — main entry point.

Usage:
    python main.py --all              # run every pipeline once
    python main.py --stats            # historical stats only
    python main.py --odds             # current odds only
    python main.py --lineups          # one-shot lineup poll
    python main.py --watch-lineups    # continuous lineup watcher
    python main.py --init-db          # create tables only

Environment variables required:
    API_FOOTBALL_KEY   — key for api-football.com
    THE_ODDS_API_KEY   — key for the-odds-api.com
"""

import argparse
import logging
import signal
import sys
import threading

from database import init_db
from ingest_lineups import poll_upcoming_lineups, start_lineup_watcher
from ingest_odds import ingest_all_odds
from ingest_stats import ingest_all_historical_stats

log = logging.getLogger("bet")


def _setup_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s  %(levelname)-7s  %(name)s  %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="BET Data Ingestion Engine")
    parser.add_argument("--all", action="store_true", help="Run all pipelines once")
    parser.add_argument("--stats", action="store_true", help="Ingest historical stats")
    parser.add_argument("--odds", action="store_true", help="Ingest current market odds")
    parser.add_argument("--lineups", action="store_true", help="One-shot lineup poll")
    parser.add_argument("--watch-lineups", action="store_true", help="Continuous lineup watcher")
    parser.add_argument("--init-db", action="store_true", help="Initialise database only")
    parser.add_argument("-v", "--verbose", action="store_true", help="Debug logging")
    args = parser.parse_args()

    _setup_logging(args.verbose)

    # Always ensure DB exists
    init_db()
    log.info("Database initialised at %s", __import__("config").DB_PATH)

    if args.init_db:
        return

    ran_something = False

    if args.stats or args.all:
        ran_something = True
        log.info("══════ Ingesting Historical Stats ══════")
        ingest_all_historical_stats()

    if args.odds or args.all:
        ran_something = True
        log.info("══════ Ingesting Market Odds ══════")
        ingest_all_odds()

    if args.lineups or args.all:
        ran_something = True
        log.info("══════ Polling Upcoming Lineups ══════")
        results = poll_upcoming_lineups()
        for r in results:
            if r["changes"]:
                log.warning("Lineup changes detected: %s", r)

    if args.watch_lineups:
        ran_something = True
        stop_event = threading.Event()

        def _signal_handler(sig, frame):
            log.info("Shutdown signal received — stopping lineup watcher …")
            stop_event.set()

        signal.signal(signal.SIGINT, _signal_handler)
        signal.signal(signal.SIGTERM, _signal_handler)

        log.info("══════ Starting Lineup Watcher (Ctrl+C to stop) ══════")
        start_lineup_watcher(interval_seconds=300, stop_event=stop_event)

    if not ran_something:
        parser.print_help()
        sys.exit(1)

    log.info("Done.")


if __name__ == "__main__":
    main()
