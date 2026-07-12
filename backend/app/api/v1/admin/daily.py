"""Admin daily practice config."""
from __future__ import annotations

from datetime import date as date_type

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFound, PermissionDenied
from app.database import get_db
from app.deps import resolve_admin
from app.models import AdminUser, DailyPracticeConfig
from app.services.rbac import has_permission

router = APIRouter()


class DailyConfigIn(BaseModel):
    config_date: date_type
    exam_id: int
    question_count: int = 10
    auto_pick_rule: str = "RANDOM"
    manual_question_version_ids: list[int] | None = None


@router.get("")
def list_configs(db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    if not has_permission(db, admin.id, "ops.query"):
        raise PermissionDenied()
    return {"items": [
        {
            "id": c.id, "config_date": c.config_date.isoformat(), "exam_id": c.exam_id,
            "question_count": c.question_count, "auto_pick_rule": c.auto_pick_rule,
        }
        for c in db.execute(select(DailyPracticeConfig).order_by(DailyPracticeConfig.config_date.desc())).scalars()
    ]}


@router.post("")
def upsert(payload: DailyConfigIn, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    if not has_permission(db, admin.id, "ops.edit"):
        raise PermissionDenied()
    existing = db.execute(
        select(DailyPracticeConfig).where(DailyPracticeConfig.config_date == payload.config_date)
    ).scalar_one_or_none()
    if existing:
        for k, v in payload.model_dump().items():
            setattr(existing, k, v)
        c = existing
    else:
        c = DailyPracticeConfig(created_by=admin.id, **payload.model_dump())
        db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id}
