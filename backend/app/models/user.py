"""User (C 端) + UserExamTarget."""
from __future__ import annotations

from datetime import date, datetime

from typing import Optional
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _now() -> datetime:
    return datetime.utcnow()


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    openid: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    nickname: Mapped[Optional[str]] = mapped_column(String(128))
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512))
    agreed_privacy_version: Mapped[Optional[str]] = mapped_column(String(32))
    agreed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    is_banned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    banned_reason: Mapped[Optional[str]] = mapped_column(String(256))
    anonymized_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now, nullable=False)


class UserExamTarget(Base):
    __tablename__ = "user_exam_targets"
    __table_args__ = (UniqueConstraint("user_id", "exam_id", name="uq_user_exam_target"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id"), nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    daily_question_goal: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
    target_exam_date: Mapped[Optional[date]] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now, nullable=False)