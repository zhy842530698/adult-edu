"""add user_sequential_progress (per-user/scope cursor for sequential modes)

Stores the last_question_id the user has reached under each (scope, scope_id)
combination so we can pick the next batch in deterministic order and avoid
re-minting identical sessions.

scope values:
    EXAM       - SEQUENTIAL mode   (scope_id = exam.id)
    CHAPTER    - CHAPTER  mode    (scope_id = chapter.id)
    KNOWLEDGE  - KNOWLEDGE mode   (scope_id = knowledge_point.id)
    PAPER      - MOCK + paper_id  (scope_id = paper.id)

Revision ID: 0005_sequential_progress
Revises: 0004_user_onboarding_fields
Create Date: 2026-07-14 15:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = "0005_sequential_progress"
down_revision = "0004_user_onboarding_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_sequential_progress",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("scope", sa.String(16), nullable=False),
        sa.Column("scope_id", sa.Integer(), nullable=False),
        sa.Column("last_question_id", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("user_id", "scope", "scope_id",
                            name="uq_user_scope_scopeid"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_usp_user_id"),
        sa.ForeignKeyConstraint(["last_question_id"], ["questions.id"],
                                name="fk_usp_last_question_id"),
    )
    op.create_index(
        "ix_user_sequential_progress_user",
        "user_sequential_progress",
        ["user_id", "scope"],
    )

    # Data backfill — only safe inside an alembic context that already has all
    # models registered on Base.metadata. Imported lazily so the migration
    # file itself stays declarative-only when used by downstream tooling.
    import sqlalchemy as _sa
    bind = op.get_bind()
    try:
        from app.database import Base as _Base  # noqa: WPS433
        from app.services.practice_service import (  # noqa: WPS433
            backfill_stale_in_progress_and_cursor,
        )
        # Make sure every model class is registered.
        from app import models as _models  # noqa: F401,WPS433
        with _sa.orm.Session(bind=bind) as session:
            stats = backfill_stale_in_progress_and_cursor(session)
            print(
                f"[0005 backfill] closed={stats['closed_submitted']} "
                f"deleted={stats['deleted_empty']} "
                f"cursor_rows={stats['cursor_rows']}"
            )
    except Exception as exc:  # pragma: no cover — diagnostic only
        print(f"[0005 backfill] skipped: {exc!r}")


def downgrade() -> None:
    op.drop_index("ix_user_sequential_progress_user",
                  table_name="user_sequential_progress")
    op.drop_table("user_sequential_progress")
