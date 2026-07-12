"""FastAPI dependencies — auth resolution (admin + user)."""
from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security.utils import get_authorization_scheme_param
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AuthRequired
from app.core.security import decode_token
from app.database import get_db
from app.models import AdminUser, User


def _extract_bearer(authorization: str | None) -> str:
    if not authorization:
        raise AuthRequired()
    scheme, token = get_authorization_scheme_param(authorization)
    if scheme.lower() != "bearer" or not token:
        raise AuthRequired()
    return token


def resolve_user(request: Request, db: Session = Depends(get_db), authorization: Annotated[str | None, Header()] = None) -> User:
    token = _extract_bearer(authorization)
    try:
        payload = decode_token(token)
    except ValueError:
        raise AuthRequired()
    if payload.get("sub_type") != "USER":
        raise AuthRequired("需要 USER token")
    user = db.get(User, payload["sub_id"])
    if user is None:
        raise AuthRequired()
    if user.is_banned:
        raise AuthRequired("账号已封禁")
    request.state.user = user
    return user


def resolve_admin(request: Request, db: Session = Depends(get_db), authorization: Annotated[str | None, Header()] = None) -> AdminUser:
    token = _extract_bearer(authorization)
    try:
        payload = decode_token(token)
    except ValueError:
        raise AuthRequired()
    if payload.get("sub_type") != "ADMIN":
        raise AuthRequired("需要 ADMIN token")
    admin = db.get(AdminUser, payload["sub_id"])
    if admin is None or not admin.is_active:
        raise AuthRequired()
    request.state.admin = admin
    return admin


def optional_admin(request: Request, db: Session = Depends(get_db), authorization: Annotated[str | None, Header()] = None) -> AdminUser | None:
    if not authorization:
        return None
    try:
        return resolve_admin(request, db, authorization)
    except AuthRequired:
        return None


def optional_user(request: Request, db: Session = Depends(get_db), authorization: Annotated[str | None, Header()] = None) -> User | None:
    if not authorization:
        return None
    try:
        return resolve_user(request, db, authorization)
    except AuthRequired:
        return None
