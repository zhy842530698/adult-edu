"""Admin question CRUD + submit-review + offline."""
from __future__ import annotations

import json

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFound, PermissionDenied
from app.database import get_db
from app.deps import resolve_admin
from app.models import AdminUser, Question, QuestionOption, QuestionVersion
from app.services.audit import write_audit
from app.services.question_service import (
    create_draft,
    edit_question,
    offline_question,
    submit_for_review,
)
from app.services.rbac import has_permission

router = APIRouter()


class QuestionIn(BaseModel):
    question_type: str = Field(..., description="SINGLE_CHOICE / MULTIPLE_CHOICE")
    exam_id: int
    subject_id: int
    chapter_id: int | None = None
    difficulty: int = 3
    tags: str | None = None
    stem: str
    analysis: str
    options: list[dict]  # [{"option_code": "A", "content": "..."}]
    correct_options: list[str]
    score: float = 1.0
    source_name: str
    source_year: int | None = None
    source_question_no: str | None = None
    license_type: str
    external_ref: str | None = None
    knowledge_point_ids: list[int] | None = None
    assets: list[dict] | None = None


def _check_perm(db: Session, admin: AdminUser, code: str) -> None:
    if not has_permission(db, admin.id, code):
        raise PermissionDenied(f"缺少权限 {code}")


@router.get("")
def list_questions(
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(resolve_admin),
    exam_id: int | None = None,
    subject_id: int | None = None,
    chapter_id: int | None = None,
    question_type: str | None = None,
    difficulty: int | None = None,
    status: str | None = None,
    keyword: str | None = None,
    page: int = 1,
    page_size: int = 20,
):
    _check_perm(db, admin, "question.query")
    stmt = select(Question).order_by(Question.id.desc())
    if exam_id:
        stmt = stmt.where(Question.exam_id == exam_id)
    if subject_id:
        stmt = stmt.where(Question.subject_id == subject_id)
    if chapter_id:
        stmt = stmt.where(Question.chapter_id == chapter_id)
    if question_type:
        stmt = stmt.where(Question.question_type == question_type)
    if difficulty:
        stmt = stmt.where(Question.difficulty == difficulty)
    if keyword:
        # search in question_versions via stem
        qv_ids = {
            r[0] for r in db.execute(
                select(QuestionVersion.id).where(QuestionVersion.stem.contains(keyword))
            ).all()
        }
        if qv_ids:
            stmt = stmt.where(or_(Question.id.in_(qv_ids), Question.tags.contains(keyword)))
        else:
            stmt = stmt.where(Question.tags.contains(keyword))

    total = db.execute(select(Question).where(*stmt.whereclause.children) if stmt.whereclause is not None else select(Question)).all()
    total_count = len(total)
    rows = list(db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars())
    # Filter by version status if requested (post-filter for simplicity)
    items = []
    for q in rows:
        cur = db.get(QuestionVersion, q.current_version_id) if q.current_version_id else None
        latest = db.execute(
            select(QuestionVersion).where(
                QuestionVersion.question_id == q.id,
                QuestionVersion.version_no == q.latest_version_no,
            )
        ).scalar_one_or_none()
        ver_status = (latest.status if latest else None) or (cur.status if cur else None)
        if status and ver_status != status:
            continue
        items.append({
            "id": q.id,
            "question_type": q.question_type,
            "exam_id": q.exam_id,
            "subject_id": q.subject_id,
            "difficulty": q.difficulty,
            "current_version_id": q.current_version_id,
            "latest_version_no": q.latest_version_no,
            "version_status": ver_status,
            "tags": q.tags,
        })
    return {"items": items, "total": total_count, "page": page, "page_size": page_size}


@router.post("")
def create(payload: QuestionIn, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _check_perm(db, admin, "question.create")
    qv = create_draft(db, actor_id=admin.id, payload=payload.model_dump())
    write_audit(db, admin_user_id=admin.id, action="question.create", target_type="Question", target_id=str(qv.question_id), after={"version_id": qv.id})
    return {"id": qv.question_id, "version_id": qv.id, "status": qv.status}


@router.get("/{qid}")
def get_question(qid: int, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _check_perm(db, admin, "question.query")
    q = db.get(Question, qid)
    if q is None:
        raise NotFound("题目不存在")
    cur = db.get(QuestionVersion, q.current_version_id) if q.current_version_id else None
    latest = db.execute(
        select(QuestionVersion).where(
            QuestionVersion.question_id == q.id,
            QuestionVersion.version_no == q.latest_version_no,
        )
    ).scalar_one_or_none()
    target = latest or cur
    options = [{"option_code": o.option_code, "content": o.content} for o in target.options] if target else []
    return {
        "id": q.id,
        "question_type": q.question_type,
        "exam_id": q.exam_id,
        "subject_id": q.subject_id,
        "chapter_id": q.chapter_id,
        "difficulty": q.difficulty,
        "tags": q.tags,
        "current_version_id": q.current_version_id,
        "latest_version_no": q.latest_version_no,
        "version": {
            "id": target.id if target else None,
            "version_no": target.version_no if target else None,
            "status": target.status if target else None,
            "stem": target.stem if target else None,
            "analysis": target.analysis if target else None,
            "correct_options": json.loads(target.correct_options) if target else [],
            "score": target.score if target else None,
            "options": options,
            "source_name": target.source_name if target else None,
            "license_type": target.license_type if target else None,
        } if target else None,
    }


@router.put("/{qid}")
def edit(qid: int, payload: QuestionIn, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _check_perm(db, admin, "question.edit")
    qv = edit_question(db, question_id=qid, actor_id=admin.id, payload=payload.model_dump())
    write_audit(db, admin_user_id=admin.id, action="question.edit", target_type="Question", target_id=str(qid), after={"new_version_id": qv.id})
    return {"id": qid, "version_id": qv.id, "status": qv.status}


@router.delete("/{qid}")
def delete(qid: int, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _check_perm(db, admin, "question.delete")
    q = db.get(Question, qid)
    if q is None:
        raise NotFound("题目不存在")
    # FR §7.2: only allow physical delete if draft and never referenced
    if q.current_version_id is not None:
        raise PermissionDenied("已发布题目不可删除")
    db.delete(q)
    db.commit()
    write_audit(db, admin_user_id=admin.id, action="question.delete", target_type="Question", target_id=str(qid))
    return {"id": qid}


@router.post("/{qid}/submit-review")
def submit_review(qid: int, version_id: int = Query(...), db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _check_perm(db, admin, "question.submit_review")
    rec = submit_for_review(db, question_id=qid, version_id=version_id, actor_id=admin.id)
    write_audit(db, admin_user_id=admin.id, action="question.submit_review", target_type="Question", target_id=str(qid), after={"review_id": rec.id})
    return {"review_id": rec.id, "status": "REVIEW_PENDING"}


@router.post("/{qid}/offline")
def offline(qid: int, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _check_perm(db, admin, "question.offline")
    q = offline_question(db, question_id=qid, actor_id=admin.id)
    write_audit(db, admin_user_id=admin.id, action="question.offline", target_type="Question", target_id=str(qid))
    return {"id": q.id, "current_version_id": q.current_version_id}


@router.post("/batch")
def batch_action(
    payload: dict,
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(resolve_admin),
):
    """Batch set is_active etc. payload: {ids: [...], action: 'enable'|'disable', tag?: str, difficulty?: int}"""
    _check_perm(db, admin, "question.edit")
    ids = payload.get("ids") or []
    action = payload.get("action")
    if action == "tag":
        tag = payload.get("tag")
        for qid in ids:
            q = db.get(Question, qid)
            if q:
                tags = set((q.tags or "").split(",")) - {""}
                tags.add(tag)
                q.tags = ",".join(sorted(tags))
        db.commit()
        return {"affected": len(ids)}
    return {"affected": 0}
