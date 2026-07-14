"""HomeBanner / Announcement / DailyPracticeConfig."""
from __future__ import annotations

from datetime import date, datetime

from typing import Optional
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _now() -> datetime:
    return datetime.utcnow()


class HomeBanner(Base):
    __tablename__ = "home_banners"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    image_url: Mapped[str] = mapped_column(String(512), nullable=False)
    link_type: Mapped[str] = mapped_column(String(32), default="EXAM", nullable=False)
    link_target: Mapped[Optional[str]] = mapped_column(String(256))
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    starts_at = mapped_column(DateTime, nullable=True)
    ends_at = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now, nullable=False)


class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    starts_at = mapped_column(DateTime, nullable=True)
    ends_at = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now, nullable=False)


class DailyPracticeConfig(Base):
    __tablename__ = "daily_practice_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    config_date = mapped_column(Date, nullable=False, unique=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id"), nullable=False)
    subject_id: Mapped[Optional[int]] = mapped_column(ForeignKey("subjects.id"), nullable=True)
    question_count: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    auto_pick_rule: Mapped[str] = mapped_column(String(64), default="RANDOM", nullable=False)
    manual_question_version_ids = mapped_column(Text, nullable=True)
    created_by: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
