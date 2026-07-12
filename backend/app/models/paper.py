"""Paper / PaperVersion / PaperQuestion."""
from __future__ import annotations

from datetime import datetime

from typing import Optional
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _now() -> datetime:
    return datetime.utcnow()


class Paper(Base):
    __tablename__ = "papers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    paper_type: Mapped[str] = mapped_column(String(32), default="PRACTICE", nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    current_version_id: Mapped[Optional[int]] = mapped_column(ForeignKey("paper_versions.id"))
    created_by: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now, nullable=False)


class PaperVersion(Base):
    __tablename__ = "paper_versions"
    __table_args__ = (UniqueConstraint("paper_id", "version_no", name="uq_pv_paper_version"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    paper_id: Mapped[int] = mapped_column(ForeignKey("papers.id"), nullable=False)
    version_no: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_score: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    pass_score: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    answer_display_rule: Mapped[str] = mapped_column(String(32), default="AFTER_SUBMIT", nullable=False)
    available_from: Mapped[Optional[datetime]] = mapped_column(DateTime)
    available_to: Mapped[Optional[datetime]] = mapped_column(DateTime)
    published_by: Mapped[Optional[int]] = mapped_column(Integer)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)


class PaperQuestion(Base):
    __tablename__ = "paper_questions"
    __table_args__ = (UniqueConstraint("paper_version_id", "sequence_no", name="uq_pq_paper_seq"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    paper_version_id: Mapped[int] = mapped_column(ForeignKey("paper_versions.id"), nullable=False)
    question_version_id: Mapped[int] = mapped_column(ForeignKey("question_versions.id"), nullable=False)
    sequence_no: Mapped[int] = mapped_column(Integer, nullable=False)
    score: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)