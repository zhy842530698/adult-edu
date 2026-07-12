"""Catalog models — exam_category → exam → subject → chapter → knowledge_point."""
from __future__ import annotations

from datetime import datetime

from typing import Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _now() -> datetime:
    return datetime.utcnow()


class ExamCategory(Base):
    __tablename__ = "exam_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    icon_url: Mapped[Optional[str]] = mapped_column(String(512))
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now, nullable=False)

    exams: Mapped[list["Exam"]] = relationship("Exam", back_populates="category", cascade="all,delete-orphan")


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("exam_categories.id"), nullable=False)
    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    icon_url: Mapped[Optional[str]] = mapped_column(String(512))
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now, nullable=False)

    category: Mapped["ExamCategory"] = relationship("ExamCategory", back_populates="exams")
    subjects: Mapped[list["Subject"]] = relationship("Subject", back_populates="exam", cascade="all,delete-orphan")


class Subject(Base):
    __tablename__ = "subjects"
    __table_args__ = (UniqueConstraint("exam_id", "code", name="uq_subjects_exam_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id"), nullable=False)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now, nullable=False)

    exam: Mapped["Exam"] = relationship("Exam", back_populates="subjects")
    chapters: Mapped[list["Chapter"]] = relationship("Chapter", back_populates="subject", cascade="all,delete-orphan")


class Chapter(Base):
    __tablename__ = "chapters"
    __table_args__ = (UniqueConstraint("subject_id", "code", name="uq_chapters_subject_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), nullable=False)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now, nullable=False)

    subject: Mapped["Subject"] = relationship("Subject", back_populates="chapters")
    knowledge_points: Mapped[list["KnowledgePoint"]] = relationship(
        "KnowledgePoint", back_populates="chapter", cascade="all,delete-orphan"
    )


class KnowledgePoint(Base):
    __tablename__ = "knowledge_points"
    __table_args__ = (UniqueConstraint("chapter_id", "code", name="uq_kp_chapter_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    chapter_id: Mapped[int] = mapped_column(ForeignKey("chapters.id"), nullable=False)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now, nullable=False)

    chapter: Mapped["Chapter"] = relationship("Chapter", back_populates="knowledge_points")