"""add onboarding fields: users.onboarding_completed + user_exam_targets.{purpose,daily_goal,study_pace_minutes}

Revision ID: 0004_user_onboarding_fields
Revises: 0003_daily_practice_subject
Create Date: 2026-07-14 13:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = "0004_user_onboarding_fields"
down_revision = "0003_daily_practice_subject"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users", recreate="always") as batch:
        batch.add_column(
            sa.Column(
                "onboarding_completed",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("0"),
            )
        )
    with op.batch_alter_table("user_exam_targets", recreate="always") as batch:
        batch.add_column(sa.Column("purpose", sa.String(32), nullable=True))
        batch.add_column(sa.Column("daily_goal", sa.String(32), nullable=True))
        batch.add_column(sa.Column("study_pace_minutes", sa.Integer(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("user_exam_targets", recreate="always") as batch:
        batch.drop_column("study_pace_minutes")
        batch.drop_column("daily_goal")
        batch.drop_column("purpose")
    with op.batch_alter_table("users", recreate="always") as batch:
        batch.drop_column("onboarding_completed")
