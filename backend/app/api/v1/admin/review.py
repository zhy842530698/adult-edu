"""Admin review approve / reject."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import PermissionDenied
from app.database import get_db
from app.deps import resolve_admin
from app.models import AdminUser, QuestionReviewRecord, QuestionVersion
from app.services.audit import write_audit
from app.services.question_service import approve_review, reject_review
from app.services.rbac import has_permission

router = APIRouter()


@router.get("")
def list_reviews(db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    if not has_permission(db, admin.id, "question.query"):
        raise PermissionDenied()
    rows = list(db.execute(select(QuestionReviewRecord).order_by(QuestionReviewRecord.submitted_at.desc())).scalars())
    items = []
    for r in rows:
        qv = db.get(QuestionVersion, r.question_version_id)
        items.append({
            "id": r.id,
            "question_id": qv.question_id if qv else None,
            "question_version_id": r.question_version_id,
            "submitted_by": r.submitted_by,
            "decision": r.decision,
            "reject_reason": r.reject_reason,
            "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None,
            "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
        })
    return {"items": items}


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
