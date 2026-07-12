"""PracticeSession / SessionQuestion / UserAnswer."""
from __future__ import annotations

from datetime import datetime

from typing import Optional
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _now() -> datetime:
    return datetime.utcnow()


class PracticeSession(Base):
    __tablename__ = "practice_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    exam_id: Mapped[Optional[int]] = mapped_column(ForeignKey("exams.id"))
    paper_id: Mapped[Optional[int]] = mapped_column(ForeignKey("papers.id"))
    mode: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="CREATED", nullable=False)
    total_score: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    awarded_score: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    correct_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    wrong_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unanswered_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now, nullable=False)


class SessionQuestion(Base):
    __tablename__ = "session_questions"
    __table_args__ = (UniqueConstraint("session_id", "sequence_no", name="uq_sq_session_seq"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("practice_sessions.id"), nullable=False)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"), nullable=False)
    question_version_id: Mapped[int] = mapped_column(ForeignKey("question_versions.id"), nullable=False)
    sequence_no: Mapped[int] = mapped_column(Integer, nullable=False)
    score: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    scoring_rule: Mapped[str] = mapped_column(String(32), default="EXACT_MATCH", nullable=False)
    analysis_display_rule: Mapped[str] = mapped_column(String(32), default="INSTANT", nullable=False)


class UserAnswer(Base):
    __tablename__ = "user_answers"
    __table_args__ = (UniqueConstraint("session_id", "question_version_id", name="uq_ua_session_qv"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("practice_sessions.id"), nullable=False)
    question_version_id: Mapped[int] = mapped_column(ForeignKey("question_versions.id"), nullable=False)
    selected_options: Mapped[str] = mapped_column(Text, nullable=False)  # JSON-encoded list
    is_correct: Mapped[Optional[bool]] = mapped_column(Boolean)
    awarded_score: Mapped[Optional[float]] = mapped_column(Float)
    time_spent_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    submit_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    answered_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)