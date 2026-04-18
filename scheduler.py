"""
Background data refresh scheduler.

Runs an APScheduler background thread inside the FastAPI process:

  • On startup      : seed DB from CSV + fetch upcoming fixtures (if empty)
  • Every 30 min    : refresh upcoming fixtures & odds from The Odds API
  • Daily at 04:00  : re-download historical CSV data

This keeps Render's ephemeral environment reasonably fresh.
After a cold-start wake, the in-memory APScheduler is re-created and
the startup seed runs again — so data is always available within seconds.
"""

from __future__ import annotations

import logging
import threading
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

log = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None
_lock = threading.Lock()


# ── Jobs ──────────────────────────────────────────────────────────────────

def _job_seed_csv() -> None:
    """One-time seed from football-data.co.uk CSV files."""
    try:
        from ingest_csv import ingest_csv_all
        log.info("[scheduler] CSV seed start")
        n = ingest_csv_all()
        log.info("[scheduler] CSV seed done — %d fixtures", n)
    except Exception:
        log.exception("[scheduler] CSV seed failed")


def _job_upcoming() -> None:
    """Refresh upcoming fixtures + odds from The Odds API."""
    try:
        from ingest_upcoming import ingest_upcoming
        log.info("[scheduler] Upcoming refresh start")
        n = ingest_upcoming()
        log.info("[scheduler] Upcoming refresh done — %d fixtures", n)
    except Exception:
        log.exception("[scheduler] Upcoming refresh failed")


def _job_daily_csv() -> None:
    """Daily CSV re-download to pick up newly completed fixtures."""
    try:
        from ingest_csv import ingest_csv_all
        log.info("[scheduler] Daily CSV refresh start")
        ingest_csv_all()
        log.info("[scheduler] Daily CSV refresh done")
    except Exception:
        log.exception("[scheduler] Daily CSV refresh failed")


# ── Startup ───────────────────────────────────────────────────────────────

def start_scheduler() -> None:
    """
    Initialise and start the background scheduler.
    Safe to call multiple times — idempotent.
    """
    global _scheduler
    with _lock:
        if _scheduler is not None and _scheduler.running:
            return

        _scheduler = BackgroundScheduler(timezone="UTC")

        # Refresh upcoming odds every 30 minutes
        _scheduler.add_job(
            _job_upcoming,
            trigger=IntervalTrigger(minutes=30),
            id="upcoming_refresh",
            replace_existing=True,
            misfire_grace_time=120,
        )

        # Full CSV re-download daily at 04:15 UTC
        _scheduler.add_job(
            _job_daily_csv,
            trigger=CronTrigger(hour=4, minute=15, timezone="UTC"),
            id="daily_csv",
            replace_existing=True,
            misfire_grace_time=3600,
        )

        # Re-sync team logos weekly (Monday 05:00 UTC) to catch newly added teams
        def _job_logos():
            try:
                from ingest_logos import ingest_logos
                ingest_logos()
            except Exception:
                log.exception("[scheduler] Weekly logo refresh failed")

        _scheduler.add_job(
            _job_logos,
            trigger=CronTrigger(day_of_week="mon", hour=5, minute=0, timezone="UTC"),
            id="weekly_logos",
            replace_existing=True,
            misfire_grace_time=3600,
        )

        _scheduler.start()
        log.info("[scheduler] Started (upcoming every 30min, CSV daily at 04:15 UTC)")

    # Run initial seeding in a daemon thread so startup is non-blocking
    def _initial_seed() -> None:
        from ingest_csv import db_has_data
        if not db_has_data():
            log.info("[scheduler] DB empty — running initial CSV seed")
            _job_seed_csv()
        else:
            log.info("[scheduler] DB already has data — skipping CSV seed")
        # Always refresh upcoming fixtures on start
        _job_upcoming()
        # Seed team logos from API-Football (only updates rows where logo_url IS NULL)
        try:
            from ingest_logos import ingest_logos
            log.info("[scheduler] Logo seed start")
            n = ingest_logos()
            log.info("[scheduler] Logo seed done — %d teams updated", n)
        except Exception:
            log.exception("[scheduler] Logo seed failed")

    t = threading.Thread(target=_initial_seed, daemon=True, name="initial-seed")
    t.start()


def stop_scheduler() -> None:
    global _scheduler
    with _lock:
        if _scheduler and _scheduler.running:
            _scheduler.shutdown(wait=False)
            _scheduler = None
            log.info("[scheduler] Stopped")


def scheduler_status() -> dict:
    """Return current scheduler state for the health endpoint."""
    if _scheduler is None or not _scheduler.running:
        return {"running": False, "jobs": []}
    jobs = []
    for job in _scheduler.get_jobs():
        next_run = job.next_run_time
        jobs.append({
            "id": job.id,
            "next_run": next_run.isoformat() if next_run else None,
        })
    return {"running": True, "jobs": jobs}
