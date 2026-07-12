"""C-end user feedback."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.exceptions import NotFound
from app.database import get_db
from app.deps import resolve_user
from app.models import Question, QuestionFeedback, User

router = APIRouter()


class FeedbackReq(BaseModel):
    question_id: int
    question_version_id: int
    exam_id: int | None = None
    session_id: int | None = None
    user_answer_snapshot: list[str] | None = None
    feedback_type: str
    content: str


@router.post("")
def create(payload: FeedbackReq, db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    q = db.get(Question, payload.question_id)
    if q is None:
        raise NotFound("题目不存在")
    fb = QuestionFeedback(
        user_id=user.id,
        exam_id=payload.exam_id,
        question_id=payload.question_id,
        question_version_id=payload.question_version_id,
        session_id=payload.session_id,
        user_answer_snapshot=str(payload.user_answer_snapshot) if payload.user_answer_snapshot else None,
        feedback_type=payload.feedback_type,
        content=payload.content,
        status="OPEN",
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return {"id": fb.id, "status": fb.status}
