"""ImportJob + ImportJobRow."""
from __future__ import annotations

from datetime import datetime

from typing import Optional
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _now() -> datetime:
    return datetime.utcnow()


class ImportJob(Base):
    __tablename__ = "import_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    uploaded_by: Mapped[int] = mapped_column(Integer, nullable=False)
    filename: Mapped[str] = mapped_column(String(256), nullable=False)
    file_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="PENDING", nullable=False)
    total_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    ok_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    warn_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    confirmed_question_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_report_path: Mapped[Optional[str]] = mapped_column(String(512))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now, nullable=False)


class ImportJobRow(Base):
    __tablename__ = "import_job_rows"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("import_jobs.id"), nullable=False)
    row_no: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="OK", nullable=False)
    payload_json = mapped_column(Text, nullable=True)
    errors_json = mapped_column(Text, nullable=True)
    created_question_version_id = mapped_column(ForeignKey("question_versions.id"), nullable=True)
