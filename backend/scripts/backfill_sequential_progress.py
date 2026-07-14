"""One-shot backfill script for UserSequentialProgress + stale IN_PROGRESS cleanup.

Run after upgrading to alembic revision 0005 (or any DB whose state predates
the cursor support). It is idempotent — safe to run multiple times. Use when
the `_pick_questions_for_mode` of the pre-cursor era has left stale
un-submitted sessions trapping users in identical SEQUENTIAL batches.

Usage (from backend/):
    ../.venv/bin/python -m scripts.backfill_sequential_progress
"""
from __future__ import annotations

import sys

# Allow running as `python scripts/backfill_sequential_progress.py` without -m
if __package__ in (None, ""):
    sys.path.insert(0, ".")

from app.database import SessionLocal  # noqa: E402
from app.services.practice_service import (  # noqa: E402
    backfill_stale_in_progress_and_cursor,
)


def main() -> int:
    db = SessionLocal()
    try:
        stats = backfill_stale_in_progress_and_cursor(db)
    finally:
        db.close()
    print("[backfill_sequential_progress] done:", stats)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
