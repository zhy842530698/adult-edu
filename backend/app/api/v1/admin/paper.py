"""Admin paper CRUD + publish."""
from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFound, PermissionDenied
from app.database import get_db
from app.deps import resolve_admin
from app.models import AdminUser, Paper, PaperQuestion, PaperVersion, Question, QuestionVersion
from app.services import idempotency
from app.services.audit import write_audit
from app.services.rbac import has_permission

router = APIRouter()


class PaperIn(BaseModel):
    exam_id: int
    title: str
    paper_type: str = "PRACTICE"
    description: str | None = None
    pass_score: float = 0
    duration_minutes: int = 0
    answer_display_rule: str = "AFTER_SUBMIT"
    available_from: datetime | None = None
    available_to: datetime | None = None
    question_version_ids: list[int]


def _check(db: Session, admin: AdminUser, code: str) -> None:
    if not has_permission(db, admin.id, code):
        raise PermissionDenied(f"缺少权限 {code}")


@router.get("")
def list_papers(db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _check(db, admin, "paper.query")
    return {"items": [
        {"id": p.id, "title": p.title, "paper_type": p.paper_type, "is_published": p.is_published,
         "exam_id": p.exam_id, "created_at": p.created_at.isoformat() if p.created_at else None}
        for p in db.execute(select(Paper).order_by(Paper.id.desc())).scalars()
    ]}


@router.post("")
def create_paper(payload: PaperIn, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _check(db, admin, "paper.create")
    p = Paper(
        exam_id=payload.exam_id, title=payload.title, paper_type=payload.paper_type,
        description=payload.description, is_published=False, created_by=admin.id,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    pv = PaperVersion(
        paper_id=p.id, version_no=1,
        total_questions=len(payload.question_version_ids),
        total_score=0,
        pass_score=payload.pass_score,
        duration_minutes=payload.duration_minutes,
        answer_display_rule=payload.answer_display_rule,
        available_from=payload.available_from,
        available_to=payload.available_to,
    )
    db.add(pv)
    db.flush()
    total_score = 0.0
    for idx, qv_id in enumerate(payload.question_version_ids, start=1):
        qv = db.get(QuestionVersion, qv_id)
        if qv is None:
            continue
        db.add(PaperQuestion(paper_version_id=pv.id, question_version_id=qv_id, sequence_no=idx, score=qv.score))
        total_score += qv.score
    pv.total_score = total_score
    db.commit()
    return {"id": p.id, "version_id": pv.id, "total_score": total_score}


@router.post("/{pid}/publish")
def publish(
    pid: int,
    request=None,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(resolve_admin),
):
    _check(db, admin, "paper.publish")
    p = db.get(Paper, pid)
    if p is None:
        raise NotFound("试卷不存在")
    pv = db.execute(select(PaperVersion).where(PaperVersion.paper_id == pid).order_by(PaperVersion.id.desc()).limit(1)).scalar_one_or_none()
    if pv is None:
        raise NotFound("试卷版本不存在")
    p.is_published = True
    p.current_version_id = pv.id
    pv.published_by = admin.id
    pv.published_at = datetime.utcnow()
    db.commit()
    write_audit(db, admin_user_id=admin.id, action="paper.publish", target_type="Paper", target_id=str(pid), after={"version_id": pv.id})
    return {"id": pid, "is_published": True, "version_id": pv.id}
