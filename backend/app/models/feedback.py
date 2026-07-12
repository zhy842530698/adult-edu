"""QuestionFeedback + FeedbackReply."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _now() -> datetime:
    return datetime.utcnow()


class QuestionFeedback(Base):
    __tablename__ = "question_feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    exam_id = mapped_column(ForeignKey("exams.id"), nullable=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"), nullable=False)
    question_version_id: Mapped[int] = mapped_column(ForeignKey("question_versions.id"), nullable=False)
    session_id = mapped_column(ForeignKey("practice_sessions.id"), nullable=True)
    user_answer_snapshot = mapped_column(Text, nullable=True)
    feedback_type: Mapped[str] = mapped_column(String(32), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="OPEN", nullable=False)
    assigned_to = mapped_column(Integer, nullable=True)
    first_response_at = mapped_column(DateTime, nullable=True)
    resolved_at = mapped_column(DateTime, nullable=True)
    resolution_note = mapped_column(Text, nullable=True)
    linked_revision_version_id = mapped_column(ForeignKey("question_versions.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now, nullable=False)


class FeedbackReply(Base):
    __tablename__ = "feedback_replies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    feedback_id: Mapped[int] = mapped_column(ForeignKey("question_feedback.id"), nullable=False)
    replier_id: Mapped[int] = mapped_column(Integer, nullable=False)
    replier_type: Mapped[str] = mapped_column(String(16), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
