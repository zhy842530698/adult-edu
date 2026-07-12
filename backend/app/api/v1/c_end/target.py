"""C-end user exam-target + daily-target + me/agreement."""
from __future__ import annotations

from datetime import date as date_type, datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import resolve_user
from app.models import Exam, User, UserExamTarget

router = APIRouter()


class TargetIn(BaseModel):
    exam_id: int
    is_primary: bool = True
    target_exam_date: date_type | None = None


class DailyTargetIn(BaseModel):
    count: int
    exam_id: int | None = None


@router.get("/exam-targets")
def list_targets(db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    rows = db.execute(
        select(UserExamTarget, Exam)
        .join(Exam, Exam.id == UserExamTarget.exam_id)
        .where(UserExamTarget.user_id == user.id)
        .order_by(UserExamTarget.is_primary.desc(), UserExamTarget.id.asc())
    ).all()
    items = []
    for t, e in rows:
        items.append({
            "id": t.id,
            "exam_id": t.exam_id,
            "exam_name": e.name,
            "is_primary": t.is_primary,
            "daily_question_goal": t.daily_question_goal,
            "target_exam_date": t.target_exam_date.isoformat() if t.target_exam_date else None,
        })
    return {"items": items}


@router.post("/exam-targets")
def upsert_target(payload: TargetIn, db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    """Create or update an exam target. If is_primary=True, demote others."""
    if not db.get(Exam, payload.exam_id):
        return {"code": "NOT_FOUND", "message": "考试不存在"}
    existing = db.execute(
        select(UserExamTarget).where(
            UserExamTarget.user_id == user.id, UserExamTarget.exam_id == payload.exam_id
        )
    ).scalar_one_or_none()
    if existing is None:
        existing = UserExamTarget(
            user_id=user.id, exam_id=payload.exam_id,
            is_primary=payload.is_primary, target_exam_date=payload.target_exam_date,
        )
        db.add(existing)
    else:
        existing.is_primary = payload.is_primary
        existing.target_exam_date = payload.target_exam_date
    if payload.is_primary:
        # demote others
        db.query(UserExamTarget).filter(
            UserExamTarget.user_id == user.id,
            UserExamTarget.exam_id != payload.exam_id,
        ).update({UserExamTarget.is_primary: False})
    db.commit()
    db.refresh(existing)
    return {"id": existing.id, "exam_id": existing.exam_id, "is_primary": existing.is_primary}


@router.delete("/exam-targets/{tid}")
def delete_target(tid: int, db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    t = db.get(UserExamTarget, tid)
    if t is None or t.user_id != user.id:
        return {"code": "NOT_FOUND", "message": "目标不存在"}
    db.delete(t)
    db.commit()
    return {"id": tid}


@router.put("/daily-target")
def set_daily_target(payload: DailyTargetIn, db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    """Update daily question goal on (optionally scoped) exam target."""
    if payload.count < 1 or payload.count > 200:
        return {"code": "INVALID_ARG", "message": "每日题量必须在 1-200 之间"}
    stmt = select(UserExamTarget).where(UserExamTarget.user_id == user.id)
    if payload.exam_id:
        stmt = stmt.where(UserExamTarget.exam_id == payload.exam_id)
    else:
        stmt = stmt.where(UserExamTarget.is_primary.is_(True))
    t = db.execute(stmt.limit(1)).scalar_one_or_none()
    if t is None:
        return {"code": "NO_TARGET", "message": "请先设置目标考试"}
    t.daily_question_goal = payload.count
    db.commit()
    return {"id": t.id, "daily_question_goal": t.daily_question_goal}


class AgreeIn(BaseModel):
    privacy_version: str


@router.post("/agreement")
def agree(payload: AgreeIn, db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    user.agreed_privacy_version = payload.privacy_version
    user.agreed_at = datetime.utcnow()
    db.commit()
    return {"agreed_privacy_version": user.agreed_privacy_version, "agreed_at": user.agreed_at.isoformat()}


@router.post("/logout")
def logout(db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    """Anonymize per FR §5.2 — keep audit rows but drop PII."""
    user.openid = f"anon-{user.id}-{int(datetime.utcnow().timestamp())}"
    user.nickname = "已注销"
    user.avatar_url = None
    user.anonymized_at = datetime.utcnow()
    db.commit()
    return {"anonymized_at": user.anonymized_at.isoformat()}