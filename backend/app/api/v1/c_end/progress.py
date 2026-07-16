"""C-end progress summary."""
from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import resolve_user
from app.models import (
    Chapter,
    PracticeSession,
    Question,
    SessionQuestion,
    User,
    UserAnswer,
    UserDailyStat,
    UserExamTarget,
    UserSequentialProgress,
)

router = APIRouter()


@router.get("/summary")
def summary(db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    total_sessions = db.execute(
        select(func.count()).select_from(PracticeSession).where(PracticeSession.user_id == user.id)
    ).scalar() or 0
    # 实际作答过的题数（去重：同一题多次作答只算一次；通过 session 关联到 user）
    total_answered = db.execute(
        select(func.count(func.distinct(UserAnswer.question_version_id)))
        .join(PracticeSession, PracticeSession.id == UserAnswer.session_id)
        .where(PracticeSession.user_id == user.id)
    ).scalar() or 0
    # 7 天内实际作答的去重题数：同一题多次作答只算一次，避免错题重做/顺序练习回绕
    # 把"重复刷"的题反复计入。
    last7 = db.execute(
        select(func.count(func.distinct(UserAnswer.question_version_id)))
        .join(PracticeSession, PracticeSession.id == UserAnswer.session_id)
        .where(
            PracticeSession.user_id == user.id,
            UserAnswer.answered_at >= datetime.utcnow() - timedelta(days=7),
        )
    ).scalar() or 0

    # 累计正确率（仅统计 SUBMITTED 会话里被判定过的题）
    correct_total, wrong_total = db.execute(
        select(
            func.coalesce(func.sum(PracticeSession.correct_count), 0),
            func.coalesce(func.sum(PracticeSession.wrong_count), 0),
        ).where(
            PracticeSession.user_id == user.id,
            PracticeSession.status == "SUBMITTED",
        )
    ).one()
    cum_accuracy = (
        round(correct_total * 100.0 / (correct_total + wrong_total))
        if (correct_total + wrong_total) > 0 else None
    )

    # 累计学习时长（秒）—— 来源 UserAnswer.time_spent_seconds，包括未交卷会话
    study_seconds = db.execute(
        select(func.coalesce(func.sum(UserAnswer.time_spent_seconds), 0))
        .join(PracticeSession, PracticeSession.id == UserAnswer.session_id)
        .where(PracticeSession.user_id == user.id)
    ).scalar() or 0

    # 最近一次会话（含主目标信息）
    last_sess = db.execute(
        select(PracticeSession)
        .where(PracticeSession.user_id == user.id)
        .order_by(PracticeSession.started_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    last_session_dict = None
    if last_sess is not None:
        # 最近一次会话的最后一题的 chapter 名称（用作"上次做到"显示）
        last_qv = db.execute(
            select(SessionQuestion, Question, Chapter)
            .join(Question, Question.id == SessionQuestion.question_id)
            .outerjoin(Chapter, Chapter.id == Question.chapter_id)
            .where(SessionQuestion.session_id == last_sess.id)
            .order_by(SessionQuestion.sequence_no.desc())
            .limit(1)
        ).first()
        chapter_name = last_qv[2].name if last_qv and last_qv[2] else None
        last_sequence_no = last_qv[0].sequence_no if last_qv else None
        last_total = db.execute(
            select(func.count()).select_from(SessionQuestion).where(
                SessionQuestion.session_id == last_sess.id
            )
        ).scalar() or 0
        last_session_dict = {
            "id": last_sess.id,
            "mode": last_sess.mode,
            "status": last_sess.status,
            "exam_id": last_sess.exam_id,
            "paper_id": last_sess.paper_id,
            "started_at": last_sess.started_at.isoformat() if last_sess.started_at else None,
            "submitted_at": last_sess.submitted_at.isoformat() if last_sess.submitted_at else None,
            "chapter_name": chapter_name,
            "last_sequence_no": last_sequence_no,
            "total_questions": int(last_total),
            "accuracy": (
                round((last_sess.correct_count / max(last_sess.correct_count + last_sess.wrong_count, 1)) * 100)
                if last_sess.correct_count + last_sess.wrong_count > 0 else None
            ),
        }

    # 主目标 + 今日进度
    primary = db.execute(
        select(UserExamTarget).where(
            UserExamTarget.user_id == user.id, UserExamTarget.is_primary.is_(True)
        )
    ).scalar_one_or_none()
    today = datetime.utcnow().date()
    today_count = db.execute(
        select(func.coalesce(func.sum(UserDailyStat.answer_count), 0)).where(
            UserDailyStat.user_id == user.id, UserDailyStat.stat_date == today
        )
    ).scalar() or 0
    progress_percent = 0
    if primary and primary.daily_question_goal > 0:
        progress_percent = min(100, round(today_count / primary.daily_question_goal * 100))

    # 主目标考试下"已发布"的题库总数（供前端展示固定值"题库总数"和计算已刷/总进度比）。
    pool_size = 0
    if primary and primary.exam_id:
        pool_size = db.execute(
            select(func.count()).select_from(Question).where(
                Question.exam_id == primary.exam_id,
                Question.current_version_id.isnot(None),
            )
        ).scalar() or 0

    return {
        "total_sessions": total_sessions,
        "total_answered": int(total_answered),
        "last7_answer_count": int(last7),
        "accuracy": cum_accuracy,
        "study_minutes": int(study_seconds),
        "streak_days": 0,
        "today_count": int(today_count),
        "progress_percent": progress_percent,
        "pool_size": int(pool_size),
        "pool_progress_percent": (
            min(100, round(int(total_answered) * 100.0 / pool_size))
            if pool_size > 0 else 0
        ),
        "last_session": last_session_dict,
    }

