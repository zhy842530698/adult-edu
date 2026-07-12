"""AuditLog + LoginLog + IdempotencyKey."""
from __future__ import annotations

from datetime import datetime

from typing import Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _now() -> datetime:
    return datetime.utcnow()


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    admin_user_id = mapped_column(ForeignKey("admin_users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    target_type = mapped_column(String(64), nullable=True)
    target_id = mapped_column(String(64), nullable=True)
    before_json = mapped_column(Text, nullable=True)
    after_json = mapped_column(Text, nullable=True)
    ip: Mapped[Optional[str]] = mapped_column(String(64))
    user_agent = mapped_column(String(512), nullable=True)
    request_id = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False, index=True)


class LoginLog(Base):
    __tablename__ = "login_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    subject_type: Mapped[str] = mapped_column(String(16), nullable=False)
    subject_id = mapped_column(Integer, nullable=True)
    username_or_openid = mapped_column(String(128), nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    fail_reason = mapped_column(String(256), nullable=True)
    ip = mapped_column(String(64), nullable=True)
    user_agent = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)


class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    endpoint: Mapped[str] = mapped_column(String(256), nullable=False)
    subject_type: Mapped[str] = mapped_column(String(16), nullable=False)
    subject_id: Mapped[int] = mapped_column(Integer, nullable=False)
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    response_json: Mapped[str] = mapped_column(Text, nullable=False)
    status_code: Mapped[int] = mapped_column(Integer, default=200, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
