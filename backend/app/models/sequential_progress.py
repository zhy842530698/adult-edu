"""UserSequentialProgress — per-user "where I left off" cursor.

Each row tracks the last question_id a user has reached under a particular
(scope, scope_id) combination, so the next SEQUENTIAL/CHAPTER/KNOWLEDGE/MOCK
session can be served the next batch in deterministic order instead of always
restarting from the first row of the question bank.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _now() -> datetime:
    return datetime.utcnow()


class UserSequentialProgress(Base):
    __tablename__ = "user_sequential_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "scope", "scope_id",
                         name="uq_user_scope_scopeid"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    # EXAM | CHAPTER | KNOWLEDGE | PAPER
    scope: Mapped[str] = mapped_column(String(16), nullable=False)
    # exam.id / chapter.id / knowledge_point.id / paper.id depending on scope
    scope_id: Mapped[int] = mapped_column(Integer, nullable=False)
    last_question_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("questions.id"), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=_now, onupdate=_now, nullable=False
    )
