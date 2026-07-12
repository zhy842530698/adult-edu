"""Question master + QuestionVersion (immutable) + options/KP/assets/review."""
from __future__ import annotations

from datetime import datetime

from typing import Optional
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _now() -> datetime:
    return datetime.utcnow()


class Question(Base):
    """Master record. Holds stable id + current_version_id once published."""

    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_type: Mapped[str] = mapped_column(String(32), nullable=False)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id"), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), nullable=False)
    chapter_id: Mapped[Optional[int]] = mapped_column(ForeignKey("chapters.id"))
    difficulty: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    tags: Mapped[Optional[str]] = mapped_column(String(512))
    current_version_id: Mapped[Optional[int]] = mapped_column(ForeignKey("question_versions.id"))
    latest_version_no: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_by: Mapped[Optional[int]] = mapped_column(Integer)
    last_editor_admin_id: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now, nullable=False)

    versions: Mapped[list["QuestionVersion"]] = relationship(
        "QuestionVersion",
        back_populates="question",
        cascade="all,delete-orphan",
        foreign_keys="QuestionVersion.question_id",
    )


class QuestionVersion(Base):
    """Immutable once status leaves DRAFT."""

    __tablename__ = "question_versions"
    __table_args__ = (UniqueConstraint("question_id", "version_no", name="uq_qv_question_version"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"), nullable=False)
    version_no: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="DRAFT", nullable=False)
    stem: Mapped[str] = mapped_column(Text, nullable=False)
    analysis: Mapped[str] = mapped_column(Text, nullable=False)
    correct_options: Mapped[str] = mapped_column(String(64), nullable=False)
    score: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    scoring_rule: Mapped[str] = mapped_column(String(32), default="EXACT_MATCH", nullable=False)
    source_name: Mapped[str] = mapped_column(String(256), nullable=False)
    source_year: Mapped[Optional[int]] = mapped_column(Integer)
    source_question_no: Mapped[Optional[str]] = mapped_column(String(64))
    license_type: Mapped[str] = mapped_column(String(64), nullable=False)
    external_ref: Mapped[Optional[str]] = mapped_column(String(256))
    published_by: Mapped[Optional[int]] = mapped_column(Integer)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_by: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)

    question: Mapped["Question"] = relationship(
        "Question",
        back_populates="versions",
        foreign_keys=[question_id],
    )
    options: Mapped[list["QuestionOption"]] = relationship(
        "QuestionOption", back_populates="question_version", cascade="all,delete-orphan"
    )
    kps: Mapped[list["QuestionKnowledgePoint"]] = relationship(
        "QuestionKnowledgePoint", back_populates="question_version", cascade="all,delete-orphan"
    )
    assets: Mapped[list["QuestionAsset"]] = relationship(
        "QuestionAsset", back_populates="question_version", cascade="all,delete-orphan"
    )


class QuestionOption(Base):
    __tablename__ = "question_options"
    __table_args__ = (UniqueConstraint("question_version_id", "option_code", name="uq_qo_version_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_version_id: Mapped[int] = mapped_column(ForeignKey("question_versions.id"), nullable=False)
    option_code: Mapped[str] = mapped_column(String(4), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    question_version: Mapped["QuestionVersion"] = relationship("QuestionVersion", back_populates="options")


class QuestionKnowledgePoint(Base):
    __tablename__ = "question_knowledge_points"
    __table_args__ = (UniqueConstraint("question_version_id", "knowledge_point_id", name="uq_qkp_version_kp"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_version_id: Mapped[int] = mapped_column(ForeignKey("question_versions.id"), nullable=False)
    knowledge_point_id: Mapped[int] = mapped_column(ForeignKey("knowledge_points.id"), nullable=False)

    question_version: Mapped["QuestionVersion"] = relationship("QuestionVersion", back_populates="kps")


class QuestionAsset(Base):
    __tablename__ = "question_assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_version_id: Mapped[int] = mapped_column(ForeignKey("question_versions.id"), nullable=False)
    asset_type: Mapped[str] = mapped_column(String(16), nullable=False)
    url: Mapped[str] = mapped_column(String(512), nullable=False)
    file_name: Mapped[Optional[str]] = mapped_column(String(256))
    file_size: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)

    question_version: Mapped["QuestionVersion"] = relationship("QuestionVersion", back_populates="assets")


class QuestionReviewRecord(Base):
    __tablename__ = "question_review_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_version_id: Mapped[int] = mapped_column(ForeignKey("question_versions.id"), nullable=False)
    submitted_by: Mapped[int] = mapped_column(Integer, nullable=False)
    reviewer_id: Mapped[Optional[int]] = mapped_column(Integer)
    decision: Mapped[str] = mapped_column(String(16), nullable=False)
    reject_reason: Mapped[Optional[str]] = mapped_column(Text)
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)