"""Admin user management."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFound, PermissionDenied
from app.database import get_db
from app.deps import resolve_admin
from app.models import AdminUser, User
from app.services.audit import write_audit
from app.services.rbac import has_permission

router = APIRouter()


@router.get("")
def list_users(
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(resolve_admin),
    page: int = 1,
    page_size: int = 20,
    keyword: str | None = None,
):
    if not has_permission(db, admin.id, "user.query"):
        raise PermissionDenied()
    stmt = select(User).order_by(User.id.desc())
    if keyword:
        stmt = stmt.where(User.nickname.contains(keyword))
    rows = list(db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars())
    total = db.execute(select(User)).all()
    return {
        "items": [
            {
                "id": u.id, "openid": u.openid[:10] + "...", "nickname": u.nickname,
                "is_banned": u.is_banned, "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in rows
        ],
        "total": len(total),
    }


class BanReq(BaseModel):
    reason: str


@router.post("/{uid}/ban")
def ban(uid: int, payload: BanReq, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    if not has_permission(db, admin.id, "user.ban"):
        raise PermissionDenied()
    u = db.get(User, uid)
    if u is None:
        raise NotFound("用户不存在")
    u.is_banned = True
    u.banned_reason = payload.reason
    db.commit()
    write_audit(db, admin_user_id=admin.id, action="user.ban", target_type="User", target_id=str(uid), after={"reason": payload.reason})
    return {"id": uid, "is_banned": True}


@router.post("/{uid}/unban")
def unban(uid: int, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    if not has_permission(db, admin.id, "user.ban"):
        raise PermissionDenied()
    u = db.get(User, uid)
    if u is None:
        raise NotFound("用户不存在")
    u.is_banned = False
    u.banned_reason = None
    db.commit()
    write_audit(db, admin_user_id=admin.id, action="user.unban", target_type="User", target_id=str(uid))
    return {"id": uid, "is_banned": False}
