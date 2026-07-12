"""Admin login + me."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import resolve_admin
from app.models import AdminUser
from app.services.auth_service import admin_login
from app.services.rbac import admin_permissions

router = APIRouter()


class AdminLoginReq(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(payload: AdminLoginReq, request: Request, db: Session = Depends(get_db)):
    token, admin = admin_login(
        db, username=payload.username, password=payload.password,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return {
        "token": token,
        "admin": {
            "id": admin.id,
            "username": admin.username,
            "display_name": admin.display_name,
            "is_super_admin": admin.is_super_admin,
            "permissions": sorted(admin_permissions(db, admin.id)),
        },
    }


@router.get("/me")
def me(admin: AdminUser = Depends(resolve_admin), db: Session = Depends(get_db)):
    return {
        "id": admin.id,
        "username": admin.username,
        "display_name": admin.display_name,
        "is_super_admin": admin.is_super_admin,
        "permissions": sorted(admin_permissions(db, admin.id)),
    }
