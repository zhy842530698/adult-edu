"""Admin feedback/ticket endpoints."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFound, PermissionDenied
from app.database import get_db
from app.deps import resolve_admin
from app.models import AdminUser, FeedbackReply, QuestionFeedback
from app.services.audit import write_audit
from app.services.rbac import has_permission

router = APIRouter()


@router.get("")
def list_feedback(
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(resolve_admin),
    status: str | None = None,
    feedback_type: str | None = None,
):
    if not has_permission(db, admin.id, "feedback.query"):
        raise PermissionDenied()
    stmt = select(QuestionFeedback).order_by(QuestionFeedback.created_at.desc())
    if status:
        stmt = stmt.where(QuestionFeedback.status == status)
    if feedback_type:
        stmt = stmt.where(QuestionFeedback.feedback_type == feedback_type)
    rows = list(db.execute(stmt.limit(200)).scalars())
    return {"items": [
        {
            "id": r.id, "question_id": r.question_id, "question_version_id": r.question_version_id,
            "feedback_type": r.feedback_type, "content": r.content,
            "status": r.status, "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]}


class ReplyReq(BaseModel):
    content: str


@router.post("/{fid}/reply")
def reply(fid: int, payload: ReplyReq, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    if not has_permission(db, admin.id, "feedback.process"):
        raise PermissionDenied()
    fb = db.get(QuestionFeedback, fid)
    if fb is None:
        raise NotFound("反馈不存在")
    db.add(FeedbackReply(feedback_id=fid, replier_id=admin.id, replier_type="ADMIN", content=payload.content))
    if fb.status == "OPEN":
        fb.status = "PROCESSING"
        fb.assigned_to = admin.id
        fb.first_response_at = datetime.utcnow()
    db.commit()
    return {"id": fid, "status": fb.status}


class ResolveReq(BaseModel):
    resolution_note: str | None = None
    link_revision_version_id: int | None = None


@router.post("/{fid}/resolve")
def resolve(fid: int, payload: ResolveReq, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    if not has_permission(db, admin.id, "feedback.process"):
        raise PermissionDenied()
    fb = db.get(QuestionFeedback, fid)
    if fb is None:
        raise NotFound("反馈不存在")
    fb.status = "RESOLVED"
    fb.resolved_at = datetime.utcnow()
    fb.resolution_note = payload.resolution_note
    if payload.link_revision_version_id:
        fb.linked_revision_version_id = payload.link_revision_version_id
    db.commit()
    write_audit(db, admin_user_id=admin.id, action="feedback.resolve", target_type="QuestionFeedback", target_id=str(fid))
    return {"id": fid, "status": fb.status}
