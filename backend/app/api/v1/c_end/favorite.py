"""C-end favorite."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import resolve_user
from app.models import Question, User, UserQuestionState

router = APIRouter()


@router.get("/favorites")
def list_fav(db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    rows = db.execute(
        select(UserQuestionState, Question)
        .join(Question, Question.id == UserQuestionState.question_id)
        .where(UserQuestionState.user_id == user.id, UserQuestionState.is_favorite.is_(True))
    ).all()
    return {"items": [{"question_id": q.id} for _, q in rows]}


@router.put("/questions/{question_id}/favorite")
def add_fav(question_id: int, db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    state = db.execute(
        select(UserQuestionState).where(
            UserQuestionState.user_id == user.id, UserQuestionState.question_id == question_id,
        )
    ).scalar_one_or_none()
    if state is None:
        state = UserQuestionState(user_id=user.id, question_id=question_id, is_favorite=True)
        db.add(state)
    else:
        state.is_favorite = True
    db.commit()
    return {"question_id": question_id, "is_favorite": True}


@router.delete("/questions/{question_id}/favorite")
def remove_fav(question_id: int, db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    state = db.execute(
        select(UserQuestionState).where(
            UserQuestionState.user_id == user.id, UserQuestionState.question_id == question_id,
        )
    ).scalar_one_or_none()
    if state:
        state.is_favorite = False
        db.commit()
    return {"question_id": question_id, "is_favorite": False}
