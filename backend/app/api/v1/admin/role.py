"""Admin role + permission management."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFound, PermissionDenied
from app.database import get_db
from app.deps import resolve_admin
from app.models import AdminUser, Permission, Role, RolePermission
from app.services.audit import write_audit
from app.services.rbac import has_permission

router = APIRouter()


@router.get("")
def list_roles(db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    if not has_permission(db, admin.id, "admin.query"):
        raise PermissionDenied()
    rows = list(db.execute(select(Role)).scalars())
    items = []
    for r in rows:
        perms = db.execute(
            select(Permission.code).join(RolePermission, RolePermission.permission_id == Permission.id).where(RolePermission.role_id == r.id)
        ).all()
        items.append({"id": r.id, "code": r.code, "name": r.name, "permissions": [p[0] for p in perms]})
    return {"items": items}


@router.get("/permissions")
def list_perms(db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    if not has_permission(db, admin.id, "admin.query"):
        raise PermissionDenied()
    return {"items": [
        {"id": p.id, "code": p.code, "name": p.name, "module": p.module}
        for p in db.execute(select(Permission).order_by(Permission.module, Permission.code)).scalars()
    ]}


class RoleIn(BaseModel):
    code: str
    name: str
    description: str | None = None
    permission_ids: list[int] = []


@router.post("")
def create_role(payload: RoleIn, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    if not has_permission(db, admin.id, "admin.create"):
        raise PermissionDenied()
    r = Role(code=payload.code, name=payload.name, description=payload.description)
    db.add(r)
    db.commit()
    db.refresh(r)
    for pid in payload.permission_ids or []:
        db.add(RolePermission(role_id=r.id, permission_id=pid))
    db.commit()
    write_audit(db, admin_user_id=admin.id, action="role.create", target_type="Role", target_id=str(r.id), after=payload.model_dump())
    return {"id": r.id}


@router.put("/{rid}")
def update_role(rid: int, payload: RoleIn, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    if not has_permission(db, admin.id, "admin.edit"):
        raise PermissionDenied()
    r = db.get(Role, rid)
    if r is None:
        raise NotFound("角色不存在")
    r.code = payload.code
    r.name = payload.name
    r.description = payload.description
    db.query(RolePermission).filter(RolePermission.role_id == rid).delete()
    for pid in payload.permission_ids or []:
        db.add(RolePermission(role_id=rid, permission_id=pid))
    db.commit()
    return {"id": rid}
