"""Admin audit log query."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import PermissionDenied
from app.database import get_db
from app.deps import resolve_admin
from app.models import AdminUser, AuditLog
from app.services.rbac import has_permission

router = APIRouter()


@router.get("")
def list_logs(
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(resolve_admin),
    action: str | None = None,
    page: int = 1,
    page_size: int = 50,
):
    if not has_permission(db, admin.id, "audit.query"):
        raise PermissionDenied()
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc())
    if action:
        stmt = stmt.where(AuditLog.action == action)
    rows = list(db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars())
    return {
        "items": [
            {
                "id": r.id, "admin_user_id": r.admin_user_id, "action": r.action,
                "target_type": r.target_type, "target_id": r.target_id,
                "ip": r.ip, "request_id": r.request_id,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
        "page": page, "page_size": page_size,
    }
