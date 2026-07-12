"""UserQuestionState + UserDailyStat."""
from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _now() -> datetime:
    return datetime.utcnow()


class UserQuestionState(Base):
    __tablename__ = "user_question_states"
    __table_args__ = (UniqueConstraint("user_id", "question_id", name="uq_uqs_user_question"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"), nullable=False)
    first_wrong_at = mapped_column(DateTime, nullable=True)
    last_wrong_at = mapped_column(DateTime, nullable=True)
    wrong_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    correct_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    consecutive_correct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    mastered: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    next_review_at = mapped_column(DateTime, nullable=True)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now, nullable=False)


class UserDailyStat(Base):
    __tablename__ = "user_daily_stats"
    __table_args__ = (UniqueConstraint("user_id", "stat_date", name="uq_uds_user_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    stat_date = mapped_column(Date, nullable=False)
    answer_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    correct_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
