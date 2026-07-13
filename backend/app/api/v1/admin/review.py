"""Admin review approve / reject."""
from __future__ import annotations

import json
import re

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import Conflict, NotFound, PermissionDenied
from app.database import get_db
from app.deps import resolve_admin
from app.models import AdminUser, Question, QuestionReviewRecord, QuestionVersion
from app.services.audit import write_audit
from app.services.question_service import approve_review, reject_review
from app.services.rbac import has_permission

router = APIRouter()


_HTML_TAG_RE = re.compile(r"<[^>]+>")


def _plain_text(s: str | None, limit: int = 80) -> str | None:
    """Strip HTML tags and truncate for list display."""
    if not s:
        return None
    plain = _HTML_TAG_RE.sub("", s).strip()
    if len(plain) <= limit:
        return plain
    return plain[:limit] + "…"


def _user_name(user: AdminUser | None) -> str | None:
    if user is None:
        return None
    return user.display_name or user.username


@router.get("")
def list_reviews(db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    if not has_permission(db, admin.id, "question.query"):
        raise PermissionDenied()
    rows = list(
        db.execute(
            select(QuestionReviewRecord).order_by(QuestionReviewRecord.submitted_at.desc())
        ).scalars()
    )

    # Bulk lookups to keep this O(1) per row instead of N+1.
    qv_ids = {r.question_version_id for r in rows}
    user_ids = {r.submitted_by for r in rows if r.submitted_by}
    user_ids |= {r.reviewer_id for r in rows if r.reviewer_id}

    qvs: dict[int, QuestionVersion] = {}
    q_ids = set()
    if qv_ids:
        qvs = {
            qv.id: qv
            for qv in db.execute(
                select(QuestionVersion).where(QuestionVersion.id.in_(qv_ids))
            ).scalars()
        }
        q_ids = {qv.question_id for qv in qvs.values()}
    questions: dict[int, str] = {}
    if q_ids:
        # question_type lives on the master Question, not on the version.
        questions = {
            q.id: q.question_type
            for q in db.execute(
                select(Question).where(Question.id.in_(q_ids))
            ).scalars()
        }
    users: dict[int, AdminUser] = {}
    if user_ids:
        users = {
            u.id: u
            for u in db.execute(
                select(AdminUser).where(AdminUser.id.in_(user_ids))
            ).scalars()
        }

    items = []
    for r in rows:
        qv = qvs.get(r.question_version_id)
        submitter = users.get(r.submitted_by)
        reviewer = users.get(r.reviewer_id) if r.reviewer_id else None
        try:
            correct_options = json.loads(qv.correct_options) if qv and qv.correct_options else []
        except (TypeError, ValueError):
            correct_options = []
        items.append({
            "id": r.id,
            "question_id": qv.question_id if qv else None,
            "question_version_id": r.question_version_id,
            "question_type": questions.get(qv.question_id) if qv else None,
            "question_stem": _plain_text(qv.stem if qv else None),
            "correct_options": correct_options,
            "source_type": qv.source_type if qv else None,
            "real_exam_year": qv.real_exam_year if qv else None,
            "submitted_by": r.submitted_by,
            "submitter_name": _user_name(submitter),
            "decision": r.decision,
            "reject_reason": r.reject_reason,
            "reviewer_id": r.reviewer_id,
            "reviewer_name": _user_name(reviewer),
            "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None,
            "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
        })
    return {"items": items}


@router.post("/batch/approve")
def batch_approve(
    payload: dict,
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(resolve_admin),
):
    """Bulk approve multiple review records.

    payload: {"ids": [1, 2, 3]}
    Returns per-id results so the UI can show partial-failure (e.g. a review
    that was already processed, or the reviewer being the last editor).
    """
    if not has_permission(db, admin.id, "question.review_approve"):
        raise PermissionDenied()
    ids = payload.get("ids") or []
    results: list[dict] = []
    for raw in ids:
        try:
            rid = int(raw)
        except (TypeError, ValueError):
            results.append({"id": raw, "status": "error", "reason": "id 非法"})
            continue
        try:
            qv = approve_review(db, review_id=rid, actor_id=admin.id)
        except NotFound as exc:
            results.append({"id": rid, "status": "error", "reason": str(exc)})
            continue
        except Conflict as exc:
            results.append({"id": rid, "status": "skipped", "reason": str(exc)})
            continue
        except PermissionDenied as exc:
            results.append({"id": rid, "status": "skipped", "reason": str(exc)})
            continue
        write_audit(
            db,
            admin_user_id=admin.id,
            action="question.approve",
            target_type="QuestionVersion",
            target_id=str(qv.id),
            after={"status": qv.status, "batch": True},
        )
        results.append({
            "id": rid,
            "status": "approved",
            "question_id": qv.question_id,
            "version_id": qv.id,
        })
    return {"results": results}


class RejectReq(BaseModel):
    reason: str


@router.post("/{rid}/approve")
def approve(rid: int, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    if not has_permission(db, admin.id, "question.review_approve"):
        raise PermissionDenied()
    qv = approve_review(db, review_id=rid, actor_id=admin.id)
    write_audit(db, admin_user_id=admin.id, action="question.approve", target_type="QuestionVersion", target_id=str(qv.id), after={"status": qv.status})
    return {"question_id": qv.question_id, "version_id": qv.id, "status": qv.status}


@router.post("/{rid}/reject")
def reject(rid: int, payload: RejectReq, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    if not has_permission(db, admin.id, "question.review_reject"):
        raise PermissionDenied()
    qv = reject_review(db, review_id=rid, actor_id=admin.id, reason=payload.reason)
    write_audit(db, admin_user_id=admin.id, action="question.reject", target_type="QuestionVersion", target_id=str(qv.id), after={"status": qv.status, "reason": payload.reason})
    return {"question_id": qv.question_id, "version_id": qv.id, "status": qv.status}
