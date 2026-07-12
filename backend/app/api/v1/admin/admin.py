"""Admin admin-user CRUD."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import Conflict, NotFound, PermissionDenied
from app.core.security import hash_password
from app.database import get_db
from app.deps import resolve_admin
from app.models import AdminUser, AdminUserRole, Role
from app.services.audit import write_audit
from app.services.rbac import has_permission

router = APIRouter()


class AdminUserIn(BaseModel):
    username: str
    password: str
    display_name: str | None = None
    is_super_admin: bool = False
    role_ids: list[int] = []


@router.get("")
def list_admins(db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    if not has_permission(db, admin.id, "admin.query"):
        raise PermissionDenied()
    rows = list(db.execute(select(AdminUser)).scalars())
    items = []
    for u in rows:
        roles = db.execute(
            select(Role.code).join(AdminUserRole, AdminUserRole.role_id == Role.id).where(AdminUserRole.admin_user_id == u.id)
        ).all()
        items.append({
            "id": u.id, "username": u.username, "display_name": u.display_name,
            "is_active": u.is_active, "is_super_admin": u.is_super_admin,
            "roles": [r[0] for r in roles],
        })
    return {"items": items}


@router.post("")
def create_admin(payload: AdminUserIn, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    if not has_permission(db, admin.id, "admin.create"):
        raise PermissionDenied()
    if db.execute(select(AdminUser).where(AdminUser.username == payload.username)).scalar_one_or_none():
        raise Conflict(f"用户名已存在 {payload.username}")
    u = AdminUser(
        username=payload.username,
        password_hash=hash_password(payload.password),
        display_name=payload.display_name,
        is_super_admin=payload.is_super_admin,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    for rid in payload.role_ids or []:
        db.add(AdminUserRole(admin_user_id=u.id, role_id=rid))
    db.commit()
    write_audit(db, admin_user_id=admin.id, action="admin_user.create", target_type="AdminUser", target_id=str(u.id), after={"username": payload.username})
    return {"id": u.id}


@router.delete("/{aid}")
def delete_admin(aid: int, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    if not has_permission(db, admin.id, "admin.delete"):
        raise PermissionDenied()
    if aid == admin.id:
        raise PermissionDenied("不能删除自己")
    u = db.get(AdminUser, aid)
    if u is None:
        raise NotFound("管理员不存在")
    db.delete(u)
    db.commit()
    write_audit(db, admin_user_id=admin.id, action="admin_user.delete", target_type="AdminUser", target_id=str(aid))
    return {"id": aid}
