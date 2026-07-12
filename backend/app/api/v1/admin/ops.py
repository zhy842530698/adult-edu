"""Admin ops: home banners + announcements."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFound, PermissionDenied
from app.database import get_db
from app.deps import resolve_admin
from app.models import AdminUser, Announcement, HomeBanner
from app.services.rbac import has_permission

router = APIRouter()


class BannerIn(BaseModel):
    title: str
    image_url: str
    link_type: str = "EXAM"
    link_target: str | None = None
    sort_order: int = 0
    is_active: bool = True


@router.get("/banners")
def list_banners(db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    if not has_permission(db, admin.id, "ops.query"):
        raise PermissionDenied()
    return {"items": [
        {"id": b.id, "title": b.title, "image_url": b.image_url, "is_active": b.is_active, "sort_order": b.sort_order}
        for b in db.execute(select(HomeBanner).order_by(HomeBanner.sort_order)).scalars()
    ]}


@router.post("/banners")
def create_banner(payload: BannerIn, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    if not has_permission(db, admin.id, "ops.edit"):
        raise PermissionDenied()
    b = HomeBanner(**payload.model_dump())
    db.add(b)
    db.commit()
    db.refresh(b)
    return {"id": b.id}


@router.put("/banners/{bid}")
def update_banner(bid: int, payload: BannerIn, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    if not has_permission(db, admin.id, "ops.edit"):
        raise PermissionDenied()
    b = db.get(HomeBanner, bid)
    if b is None:
        raise NotFound("banner 不存在")
    for k, v in payload.model_dump().items():
        setattr(b, k, v)
    db.commit()
    return {"id": bid}


@router.delete("/banners/{bid}")
def delete_banner(bid: int, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    if not has_permission(db, admin.id, "ops.delete"):
        raise PermissionDenied()
    b = db.get(HomeBanner, bid)
    if b is None:
        raise NotFound()
    db.delete(b)
    db.commit()
    return {"id": bid}


class AnnouncementIn(BaseModel):
    title: str
    content: str
    is_active: bool = True


@router.get("/announcements")
def list_ann(db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    if not has_permission(db, admin.id, "ops.query"):
        raise PermissionDenied()
    return {"items": [
        {"id": a.id, "title": a.title, "is_active": a.is_active, "created_at": a.created_at.isoformat() if a.created_at else None}
        for a in db.execute(select(Announcement).order_by(Announcement.id.desc())).scalars()
    ]}


@router.post("/announcements")
def create_ann(payload: AnnouncementIn, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    if not has_permission(db, admin.id, "ops.edit"):
        raise PermissionDenied()
    a = Announcement(**payload.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return {"id": a.id}


@router.delete("/announcements/{aid}")
def delete_ann(aid: int, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    if not has_permission(db, admin.id, "ops.delete"):
        raise PermissionDenied()
    a = db.get(Announcement, aid)
    if a is None:
        raise NotFound()
    db.delete(a)
    db.commit()
    return {"id": aid}
