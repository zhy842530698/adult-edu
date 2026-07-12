"""C-end progress summary."""
from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import resolve_user
from app.models import PracticeSession, User, UserDailyStat

router = APIRouter()


@router.get("/summary")
def summary(db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    total_sessions = db.execute(
        select(func.count()).select_from(PracticeSession).where(PracticeSession.user_id == user.id)
    ).scalar() or 0
    last7 = db.execute(
        select(func.coalesce(func.sum(UserDailyStat.answer_count), 0)).where(
            UserDailyStat.user_id == user.id, UserDailyStat.stat_date >= datetime.utcnow().date() - timedelta(days=7)
        )
    ).scalar() or 0
    return {
        "total_sessions": total_sessions,
        "last7_answer_count": int(last7),
        "streak_days": 0,
    }
