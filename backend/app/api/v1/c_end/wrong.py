"""C-end wrong question list + re-practice."""
from __future__ import annotations

from fastapi import APIRouter, Body, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import resolve_user
from app.models import Question, User, UserQuestionState
from app.services.practice_service import create_session

router = APIRouter()


@router.get("")
def list_wrong(db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    rows = db.execute(
        select(UserQuestionState, Question)
        .join(Question, Question.id == UserQuestionState.question_id)
        .where(UserQuestionState.user_id == user.id, UserQuestionState.wrong_count > 0)
        .order_by(UserQuestionState.last_wrong_at.desc())
    ).all()
    items = []
    for state, q in rows:
        items.append({
            "question_id": q.id,
            "wrong_count": state.wrong_count,
            "last_wrong_at": state.last_wrong_at.isoformat() if state.last_wrong_at else None,
            "next_review_at": state.next_review_at.isoformat() if state.next_review_at else None,
            "mastered": state.mastered,
            "consecutive_correct": state.consecutive_correct,
        })
    return {"items": items}


class RepracticeReq(BaseModel):
    count: int = 10


@router.post("/practice")
def repractice(payload: RepracticeReq, db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    sess = create_session(db, user=user, mode="WRONG", count=payload.count)
    return {"session_id": sess.id, "total_questions": sess.total_score}
