"""add daily_practice_configs.subject_id

Revision ID: 0003_daily_practice_subject
Revises: 0002_question_source_type
Create Date: 2026-07-14 11:50:00
"""
from alembic import op
import sqlalchemy as sa


revision = "0003_daily_practice_subject"
down_revision = "0002_question_source_type"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # SQLite doesn't support adding FKs via ALTER TABLE; add the column without
    # an inline FK constraint and rely on application-layer integrity. The
    # model still declares the FK for non-SQLite dialects.
    with op.batch_alter_table("daily_practice_configs", recreate="always") as batch:
        batch.add_column(
            sa.Column("subject_id", sa.Integer(), nullable=True)
        )


def downgrade() -> None:
    with op.batch_alter_table("daily_practice_configs", recreate="always") as batch:
        batch.drop_column("subject_id")
