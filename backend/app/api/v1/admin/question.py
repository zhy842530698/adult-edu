"""Admin question CRUD + submit-review + offline."""
from __future__ import annotations

import json
from datetime import date

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.exceptions import Conflict, NotFound, PermissionDenied
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
    source_type: str = "PLATFORM_ORIGINAL"
    real_exam_year: int | None = None
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
    source_type: str | None = Query(None, description="PLATFORM_ORIGINAL / REAL_EXAM / MOCK / COMPILATION"),
    created_from: date | None = Query(None, description="题目最新版本创建时间下界 (含)"),
    created_to: date | None = Query(None, description="题目最新版本创建时间上界 (含)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    _check_perm(db, admin, "question.query")

    # Build base WHERE on Question (catalog + difficulty + keyword).
    base_filters = []
    if exam_id:
        base_filters.append(Question.exam_id == exam_id)
    if subject_id:
        base_filters.append(Question.subject_id == subject_id)
    if chapter_id:
        base_filters.append(Question.chapter_id == chapter_id)
    if question_type:
        base_filters.append(Question.question_type == question_type)
    if difficulty:
        base_filters.append(Question.difficulty == difficulty)
    if keyword:
        # A question matches if any of its versions' stem contains the keyword
        # OR its tags contains the keyword. We resolve stem matches via a subquery.
        stem_q = select(QuestionVersion.question_id).where(QuestionVersion.stem.contains(keyword))
        base_filters.append(or_(Question.id.in_(stem_q), Question.tags.contains(keyword)))

    if source_type:
        # Filter by the latest version's source_type (structured classification
        # such as REAL_EXAM / MOCK). Lives on QuestionVersion, not on Question.
        latest_source_type = (
            select(QuestionVersion.source_type)
            .where(
                QuestionVersion.question_id == Question.id,
                QuestionVersion.version_no == Question.latest_version_no,
            )
            .scalar_subquery()
        )
        base_filters.append(latest_source_type == source_type)

    if created_from or created_to:
        # Filter by the question's latest version created_at — i.e. when the
        # question was last (re)created. This is the closest "submission time"
        # for a Question master, since Question itself only has updated_at.
        latest_created_at = (
            select(QuestionVersion.created_at)
            .where(
                QuestionVersion.question_id == Question.id,
                QuestionVersion.version_no == Question.latest_version_no,
            )
            .scalar_subquery()
        )
        if created_from:
            base_filters.append(latest_created_at >= created_from)
        if created_to:
            # inclusive end-of-day: bump to next day's 00:00 and use <.
            from datetime import timedelta
            base_filters.append(latest_created_at < (created_to + timedelta(days=1)))

    # status is a runtime-derived field (current_version_id when published,
    # otherwise the row keyed by latest_version_no). We resolve it via a
    # subquery and feed it into both the count and the items query so the
    # two stay in lock-step.
    effective_version_status = (
        select(QuestionVersion.status)
        .where(
            QuestionVersion.question_id == Question.id,
            QuestionVersion.version_no == Question.latest_version_no,
        )
        .scalar_subquery()
    )

    rows_stmt = select(Question).where(*base_filters).order_by(Question.id.desc())
    total_stmt = select(func.count(Question.id)).where(*base_filters)

    if status:
        # If there's a current_version_id, that takes precedence over the
        # "latest" fallback we just computed — mirror the Python branch below.
        cur_status = (
            select(QuestionVersion.status)
            .where(QuestionVersion.id == Question.current_version_id)
            .scalar_subquery()
        )
        status_expr = func.coalesce(cur_status, effective_version_status)
        rows_stmt = rows_stmt.where(status_expr == status)
        total_stmt = total_stmt.where(status_expr == status)

    total_count = db.execute(total_stmt).scalar_one()
    rows = list(
        db.execute(
            rows_stmt.offset((page - 1) * page_size).limit(page_size)
        ).scalars()
    )

    items: list[dict] = []
    for q in rows:
        cur = db.get(QuestionVersion, q.current_version_id) if q.current_version_id else None
        latest = db.execute(
            select(QuestionVersion).where(
                QuestionVersion.question_id == q.id,
                QuestionVersion.version_no == q.latest_version_no,
            )
        ).scalar_one_or_none()
        ver_status = (cur.status if cur else None) or (latest.status if latest else None)
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
            "source_type": latest.source_type if latest else None,
            "real_exam_year": latest.real_exam_year if latest else None,
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
            "source_year": target.source_year if target else None,
            "source_question_no": target.source_question_no if target else None,
            "license_type": target.license_type if target else None,
            "source_type": target.source_type if target else None,
            "real_exam_year": target.real_exam_year if target else None,
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


@router.post("/batch/submit-review")
def batch_submit_review(
    payload: dict,
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(resolve_admin),
):
    """Bulk submit latest DRAFT versions of multiple questions for review.

    payload: {"ids": [1, 2, 3]}
    Returns per-id results so the UI can show partial-failure clearly.
    """
    _check_perm(db, admin, "question.submit_review")
    ids = payload.get("ids") or []
    results: list[dict] = []
    for raw in ids:
        try:
            qid = int(raw)
        except (TypeError, ValueError):
            results.append({"id": raw, "status": "error", "reason": "id 非法"})
            continue
        try:
            rec = submit_for_review(db, question_id=qid, version_id=None, actor_id=admin.id)
        except NotFound as exc:
            results.append({"id": qid, "status": "error", "reason": str(exc)})
            continue
        except Conflict as exc:
            results.append({"id": qid, "status": "skipped", "reason": str(exc)})
            continue
        write_audit(
            db,
            admin_user_id=admin.id,
            action="question.submit_review",
            target_type="Question",
            target_id=str(qid),
            after={"review_id": rec.id, "batch": True},
        )
        results.append({"id": qid, "status": "submitted", "review_id": rec.id})
    return {"results": results}


@router.post("/{qid}/submit-review")
def submit_review(
    qid: int,
    version_id: int | None = Query(
        None, description="题目版本 id；省略时按 latest_version_no 自动解析"
    ),
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(resolve_admin),
):
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
