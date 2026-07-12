"""Audit logging + login logging."""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditLog, LoginLog
from app.request_id import get_request_id


def write_audit(
    db: Session,
    *,
    admin_user_id: int | None,
    action: str,
    target_type: str | None = None,
    target_id: str | None = None,
    before: Any | None = None,
    after: Any | None = None,
    ip: str | None = None,
    user_agent: str | None = None,
    commit: bool = True,
) -> AuditLog:
    row = AuditLog(
        admin_user_id=admin_user_id,
        action=action,
        target_type=target_type,
        target_id=str(target_id) if target_id is not None else None,
        before_json=json.dumps(before, default=str) if before is not None else None,
        after_json=json.dumps(after, default=str) if after is not None else None,
        ip=ip,
        user_agent=user_agent,
        request_id=get_request_id() or None,
        created_at=datetime.utcnow(),
    )
    db.add(row)
    if commit:
        db.commit()
    return row


def write_login_log(
    db: Session,
    *,
    subject_type: str,
    subject_id: int | None,
    username_or_openid: str | None,
    success: bool,
    fail_reason: str | None = None,
    ip: str | None = None,
    user_agent: str | None = None,
    commit: bool = True,
) -> None:
    db.add(
        LoginLog(
            subject_type=subject_type,
            subject_id=subject_id,
            username_or_openid=username_or_openid,
            success=success,
            fail_reason=fail_reason,
            ip=ip,
            user_agent=user_agent,
            created_at=datetime.utcnow(),
        )
    )
    if commit:
        db.commit()
