"""Admin dashboard / workbench summary."""
from __future__ import annotations

from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import resolve_admin
from app.models import (
    AdminUser,
    ImportJob,
    PracticeSession,
    Question,
    QuestionFeedback,
    QuestionReviewRecord,
    QuestionVersion,
    User,
)

router = APIRouter()


@router.get("/summary")
def summary(db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time())
    week_ago = today_start - timedelta(days=7)

    new_users_today = db.execute(
        select(func.count()).select_from(User).where(User.created_at >= today_start)
    ).scalar() or 0
    active_users_today = db.execute(
        select(func.count(func.distinct(PracticeSession.user_id))).where(
            PracticeSession.started_at >= today_start
        )
    ).scalar() or 0
    answers_today = db.execute(
        select(func.coalesce(func.sum(PracticeSession.correct_count + PracticeSession.wrong_count + PracticeSession.unanswered_count), 0)).where(
            PracticeSession.started_at >= today_start
        )
    ).scalar() or 0
    sessions_today = db.execute(
        select(func.count()).select_from(PracticeSession).where(PracticeSession.started_at >= today_start)
    ).scalar() or 0
    pending_reviews = db.execute(
        select(func.count()).select_from(QuestionReviewRecord).where(QuestionReviewRecord.decision == "PENDING")
    ).scalar() or 0
    failed_imports = db.execute(
        select(func.count()).select_from(ImportJob).where(ImportJob.status == "FAILED")
    ).scalar() or 0
    open_feedbacks = db.execute(
        select(func.count()).select_from(QuestionFeedback).where(QuestionFeedback.status.in_(["OPEN", "PROCESSING"]))
    ).scalar() or 0

    # Question stats — derived from each Question's latest_version_no, which is
    # the canonical "the question's current state" (matches the list page).
    latest_status = (
        select(QuestionVersion.status)
        .where(
            QuestionVersion.question_id == Question.id,
            QuestionVersion.version_no == Question.latest_version_no,
        )
        .scalar_subquery()
    )
    question_total = db.execute(select(func.count(Question.id))).scalar() or 0
    question_approved = db.execute(
        select(func.count(Question.id)).where(latest_status == "PUBLISHED")
    ).scalar() or 0
    question_pending = db.execute(
        select(func.count(Question.id)).where(latest_status == "REVIEW_PENDING")
    ).scalar() or 0
    question_draft = db.execute(
        select(func.count(Question.id)).where(latest_status == "DRAFT")
    ).scalar() or 0

    total_users = db.execute(select(func.count(User.id))).scalar() or 0

    # Trend last 7 days
    trend_rows = db.execute(
        select(func.date(PracticeSession.started_at).label("d"), func.count().label("n")).where(
            PracticeSession.started_at >= week_ago
        ).group_by(func.date(PracticeSession.started_at))
    ).all()
    trend_7d = [{"date": str(r.d), "sessions": r.n} for r in trend_rows]

    return {
        "today": {
            "new_users": new_users_today,
            "active_users": active_users_today,
            "answer_count": int(answers_today),
            "session_count": sessions_today,
        },
        "queues": {
            "pending_reviews": pending_reviews,
            "failed_imports": failed_imports,
            "open_feedbacks": open_feedbacks,
        },
        "questions": {
            "total": question_total,
            "approved": question_approved,   # PUBLISHED
            "pending": question_pending,     # REVIEW_PENDING (待审核)
            "draft": question_draft,         # DRAFT
        },
        "users": {
            "total": total_users,
        },
        "trend_7d": trend_7d,
    }
