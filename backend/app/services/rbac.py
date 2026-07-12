"""RBAC — permission lookup + require_perm dependency."""
from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AuthRequired, NotFound, PermissionDenied
from app.database import get_db
from app.models import AdminUser, Permission, RolePermission


def admin_permissions(db: Session, admin_id: int) -> set[str]:
    """Return set of permission codes for an admin user."""
    rows = db.execute(
        select(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(AdminUser, AdminUser.id == RolePermission.role_id)
        .where(AdminUser.id == admin_id)
    ).all()
    return {r[0] for r in rows}


def has_permission(db: Session, admin_id: int, code: str) -> bool:
    admin = db.get(AdminUser, admin_id)
    if admin is None:
        return False
    if admin.is_super_admin:
        return True
    return code in admin_permissions(db, admin_id)


def current_admin(request: Request, db: Session = Depends(get_db)) -> AdminUser:
    admin = getattr(request.state, "admin", None)
    if admin is None:
        raise AuthRequired()
    # Admins don't have is_banned; placeholder for future.
    # refresh to ensure is_active
    fresh = db.get(AdminUser, admin.id)
    if fresh is None or not fresh.is_active:
        raise AuthRequired()
    return fresh


def require_perm(code: str) -> Callable:
    def _dep(admin: AdminUser = Depends(current_admin), db: Session = Depends(get_db)) -> AdminUser:
        if not has_permission(db, admin.id, code):
            raise PermissionDenied(f"缺少权限：{code}")
        return admin

    return _dep
