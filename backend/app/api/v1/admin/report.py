"""Admin reports — question-level rollups."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import resolve_admin
from app.models import AdminUser, Question, QuestionFeedback, QuestionVersion, UserAnswer

router = APIRouter()


@router.get("/questions")
def question_report(
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(resolve_admin),
    page: int = 1,
    page_size: int = 20,
    exam_id: int | None = None,
):
    stmt = select(Question).order_by(Question.id.desc())
    if exam_id:
        stmt = stmt.where(Question.exam_id == exam_id)
    rows = list(db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars())
    items = []
    for q in rows:
        answer_count = db.execute(
            select(func.count()).select_from(UserAnswer).where(UserAnswer.question_version_id == q.current_version_id)
        ).scalar() or 0
        correct_count = db.execute(
            select(func.count()).select_from(UserAnswer).where(
                UserAnswer.question_version_id == q.current_version_id, UserAnswer.is_correct.is_(True)
            )
        ).scalar() or 0
        feedback_count = db.execute(
            select(func.count()).select_from(QuestionFeedback).where(QuestionFeedback.question_id == q.id)
        ).scalar() or 0
        items.append({
            "question_id": q.id,
            "question_type": q.question_type,
            "answer_count": answer_count,
            "correct_count": correct_count,
            "accuracy": (correct_count / answer_count) if answer_count else None,
            "feedback_count": feedback_count,
        })
    total = db.execute(select(func.count()).select_from(Question)).scalar() or 0
    return {"items": items, "total": total, "page": page, "page_size": page_size}
