"""One-shot smoke data cleanup.

Removes data created by the end-to-end smoke test (questions, versions,
options, review records, papers, paper versions, paper questions, import
jobs, import job rows, and the audit log rows for those actions). Keeps
seed data (admin user, roles, permissions, sample catalog).

Idempotent: re-running on an already-clean DB is a no-op.

Usage:
    python -m scripts.cleanup_smoke
"""
from __future__ import annotations

import sys
from pathlib import Path

# Allow running as `python scripts/cleanup_smoke.py` from the backend dir.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import bindparam, inspect, text  # noqa: E402

from app.database import SessionLocal, engine  # noqa: E402
from app.models import (  # noqa: E402
    AuditLog,
    ImportJob,
    ImportJobRow,
    Paper,
    PaperQuestion,
    PaperVersion,
    Question,
    QuestionKnowledgePoint,
    QuestionOption,
    QuestionReviewRecord,
    QuestionVersion,
)


# Audit actions we drop together with the smoke data so the audit log
# doesn't keep stale references to deleted rows.
SMOKE_AUDIT_ACTIONS = (
    "question.create",
    "question.edit",
    "question.submit_review",
    "question.approve",
    "question.reject",
    "question.offline",
    "import.create",
    "import.confirm",
    "paper.publish",
)


def _count(db, model) -> int:
    return db.execute(text(f"SELECT COUNT(*) FROM {model.__tablename__}")).scalar_one()


def _truncate_smoke(db) -> dict[str, tuple[int, int]]:
    """Delete in FK-safe order. Returns {table: (before, after)} counts."""
    targets = [
        ImportJobRow.__table__.name,
        ImportJob.__table__.name,
        PaperQuestion.__table__.name,
        PaperVersion.__table__.name,
        Paper.__table__.name,
        QuestionReviewRecord.__table__.name,
        QuestionKnowledgePoint.__table__.name,
        QuestionOption.__table__.name,
        QuestionVersion.__table__.name,
        Question.__table__.name,
    ]
    before = {t: db.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar_one() for t in targets}

    # 1) Drop per-row child data and audit rows that point at these jobs.
    db.query(ImportJobRow).delete(synchronize_session=False)
    db.execute(
        text("DELETE FROM audit_logs WHERE action IN :actions").bindparams(
            bindparam("actions", value=tuple(SMOKE_AUDIT_ACTIONS), expanding=True)
        )
    )

    # 2) Paper tree.
    db.query(PaperQuestion).delete(synchronize_session=False)
    db.query(PaperVersion).delete(synchronize_session=False)
    db.query(Paper).delete(synchronize_session=False)

    # 3) Question tree (review records + KPs + options + versions + masters).
    db.query(QuestionReviewRecord).delete(synchronize_session=False)
    db.query(QuestionKnowledgePoint).delete(synchronize_session=False)
    db.query(QuestionOption).delete(synchronize_session=False)
    db.query(QuestionVersion).delete(synchronize_session=False)
    db.query(Question).delete(synchronize_session=False)

    # 4) The import jobs themselves (after rows are gone).
    db.query(ImportJob).delete(synchronize_session=False)

    db.commit()

    after = {t: db.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar_one() for t in targets}
    return {t: (before[t], after[t]) for t in targets}


def _reset_sqlite_sequences(db) -> list[str]:
    """Reset AUTOINCREMENT counters so the next row in each cleaned table
    starts from id=1 again. SQLite-only; no-op on other dialects.

    Note: `sqlite_sequence` only exists once any AUTOINCREMENT table has
    been created in the database. We also only delete rows for tables that
    actually appear there — silently skipping missing ones avoids spurious
    "no such table" failures.
    """
    insp = inspect(engine)
    if not insp.dialect.name.startswith("sqlite"):
        return []
    has_seq = db.execute(
        text("SELECT 1 FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'")
    ).first()
    if not has_seq:
        return []
    candidates = [
        ImportJobRow.__tablename__,
        ImportJob.__tablename__,
        PaperQuestion.__tablename__,
        PaperVersion.__tablename__,
        Paper.__tablename__,
        QuestionReviewRecord.__tablename__,
        QuestionKnowledgePoint.__tablename__,
        QuestionOption.__tablename__,
        QuestionVersion.__tablename__,
        Question.__tablename__,
    ]
    existing = {
        row[0]
        for row in db.execute(text("SELECT name FROM sqlite_sequence")).all()
    }
    reset: list[str] = []
    for t in candidates:
        if t in existing:
            db.execute(
                text("DELETE FROM sqlite_sequence WHERE name = :t"), {"t": t}
            )
            reset.append(t)
    db.commit()
    return reset


def main() -> int:
    db = SessionLocal()
    try:
        before_audit = db.query(AuditLog).count()
        diff = _truncate_smoke(db)
        reset = _reset_sqlite_sequences(db)
        after_audit = db.query(AuditLog).count()

        print("== cleanup summary ==")
        for t, (b, a) in diff.items():
            print(f"  {t:<32s}  {b:>5d} -> {a:>5d}")
        print(f"  {'audit_logs':<32s}  {before_audit:>5d} -> {after_audit:>5d}  (filtered by action)")
        if reset:
            print(f"  sqlite_sequence reset for: {', '.join(reset)}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
