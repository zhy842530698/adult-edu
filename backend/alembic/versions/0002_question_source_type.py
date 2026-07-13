"""add question_versions.source_type + real_exam_year

Revision ID: 0002_question_source_type
Revises: 0001_initial
Create Date: 2026-07-13 22:30:00
"""
from alembic import op
import sqlalchemy as sa


revision = "0002_question_source_type"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("question_versions") as batch:
        batch.add_column(
            sa.Column(
                "source_type",
                sa.String(32),
                nullable=False,
                server_default="PLATFORM_ORIGINAL",
            )
        )
        batch.add_column(
            sa.Column("real_exam_year", sa.Integer, nullable=True)
        )


def downgrade() -> None:
    with op.batch_alter_table("question_versions") as batch:
        batch.drop_column("real_exam_year")
        batch.drop_column("source_type")
