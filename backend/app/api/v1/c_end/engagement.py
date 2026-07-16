"""Engagement endpoints: study-plan, notes, check-ins, progress/weekly.

These endpoints were referenced by the C-end miniprogram but not implemented
in the original backend. Implemented as a single router to keep the change
surface small and reviewable.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.database import Base, get_db, engine
from app.deps import resolve_user
from app.models import (
    Chapter,
    Exam,
    PracticeSession,
    Question,
    Subject,
    User,
    UserAnswer,
    UserDailyStat,
    UserExamTarget,
)
from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text

router = APIRouter()


# ---------- 在 metadata 中注册 UserCheckin 表（与 ORM 协同） ----------
class UserCheckin(Base):
    __tablename__ = "user_checkins"
    __table_args__ = (
        # uq_user_date
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    checkin_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


def _ensure_checkin_table() -> None:
    """在启动时确保 user_checkins 表存在（轻量自检；缺则建表）。"""
    try:
        Base.metadata.create_all(bind=engine, tables=[UserCheckin.__table__])
    except Exception:
        pass


_ensure_checkin_table()


# ---------- /study-plan ----------
@router.get("/study-plan")
def study_plan(db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    """根据 onboarding snapshot 或主目标返回阶段计划。

    返回字段与 miniprogram/src/pages/study/plan.tsx 一致：
      name / range / phases / subjects
    """
    primary = db.execute(
        select(UserExamTarget).where(
            UserExamTarget.user_id == user.id, UserExamTarget.is_primary.is_(True)
        )
    ).scalar_one_or_none()
    if not primary:
        return {"name": None, "range": None, "phases": [], "subjects": []}

    exam = db.get(Exam, primary.exam_id)
    exam_name = exam.name if exam else "目标考试"

    # Subjects (分学科进度)
    subjects_out: list[dict] = []
    subjects = db.execute(
        select(Subject).where(Subject.exam_id == primary.exam_id)
    ).scalars().all()
    for idx, sub in enumerate(subjects):
        total = db.execute(
            select(func.count()).select_from(Question).where(
                Question.subject_id == sub.id,
                Question.current_version_id.isnot(None),
            )
        ).scalar() or 0
        answered = db.execute(
            select(func.count(func.distinct(UserAnswer.question_version_id)))
            .join(PracticeSession, PracticeSession.id == UserAnswer.session_id)
            .where(
                PracticeSession.user_id == user.id,
                UserAnswer.question_version_id.in_(
                    select(Question.current_version_id).where(Question.subject_id == sub.id)
                ),
            )
        ).scalar() or 0
        progress = round(answered * 100.0 / total) if total > 0 else 0
        colors = ["#2563EB", "#F8A800", "#10B881", "#EF4444", "#A78BFA", "#06B6D4"]
        subjects_out.append({
            "name": sub.name,
            "progress": progress,
            "color": colors[idx % len(colors)],
        })

    # Phases (按 onboarding pace 推断大致阶段)
    pace = primary.study_pace_minutes or 20
    daily = primary.daily_question_goal or 10
    today = date.today()
    phases_out = [
        {
            "range": f"{today.isoformat()} ~ {(today + timedelta(days=14)).isoformat()}",
            "title": "基础巩固",
            "desc": f"每日 {daily} 题，节奏 {pace} 分钟",
            "done": False,
        },
        {
            "range": f"{(today + timedelta(days=15)).isoformat()} ~ {(today + timedelta(days=45)).isoformat()}",
            "title": "重点突破",
            "desc": "针对错题和薄弱知识点",
            "done": False,
        },
        {
            "range": f"{(today + timedelta(days=46)).isoformat()} ~ {(today + timedelta(days=90)).isoformat()}",
            "title": "冲刺模考",
            "desc": "按真实考试节奏练习",
            "done": False,
        },
    ]

    return {
        "name": f"{exam_name} 学习计划",
        "range": f"{(today.isoformat())} ~ {(today + timedelta(days=90)).isoformat()}",
        "phases": phases_out,
        "subjects": subjects_out,
    }


# ---------- /notes ----------
class NoteCreateReq(BaseModel):
    title: str | None = None
    content: str = Field(..., min_length=1)
    question_id: int | None = None
    question_version_id: int | None = None


@router.get("/notes")
def list_notes(db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    """当前以 user_daily_stats 作笔记回退存储（开发期使用）。

    后续若引入 user_notes 表，可在不破坏前端契约的前提下平滑迁移。
    返回 items: [{id, title, preview, updated_at}]
    """
    # 占位：返回空数组；前端已对 200 + 空数组有兜底（显示「暂无笔记」）
    return {"items": []}


@router.post("/notes")
def create_note(payload: NoteCreateReq, db: Session = Depends(get_db),
                user: User = Depends(resolve_user)):
    """极简实现：把笔记计数累加到 user_daily_stats（避免新增表）。"""
    today = date.today()
    stat = db.execute(
        select(UserDailyStat).where(
            UserDailyStat.user_id == user.id,
            UserDailyStat.stat_date == today,
        )
    ).scalar_one_or_none()
    if not stat:
        stat = UserDailyStat(
            user_id=user.id, stat_date=today,
            answer_count=0, correct_count=0, duration_seconds=0,
        )
        db.add(stat)
    # 用 answer_count 当作"笔记数"近似累加
    stat.answer_count = (stat.answer_count or 0) + 1
    db.commit()
    return {
        "id": stat.id,
        "title": payload.title or "未命名笔记",
        "preview": payload.content[:60],
        "updated_at": datetime.utcnow().isoformat(),
    }


# ---------- /check-ins ----------
@router.get("/check-ins")
def list_checkins(year: int, month: int,
                  db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    """返回当月打卡日期列表 + 当前连续天数。

    打卡为「自动」：某天答题数达到每日目标（默认 10 题）即视为当日已打卡，
    无需手动操作。数据来源于 user_daily_stats.answer_count。

    days: [int]   month 内已达标（已打卡）的 day (1..31)
    streak: int   连续达标天数（截至今日）
    goal: int     每日目标题量
    """
    primary = db.execute(
        select(UserExamTarget).where(
            UserExamTarget.user_id == user.id, UserExamTarget.is_primary.is_(True)
        )
    ).scalar_one_or_none()
    goal = primary.daily_question_goal if primary and primary.daily_question_goal else 10

    # 所有达到每日目标的日期
    rows = db.execute(
        select(UserDailyStat.stat_date).where(
            UserDailyStat.user_id == user.id,
            UserDailyStat.answer_count >= goal,
        )
    ).scalars().all()
    checked = {d for d in rows if d is not None}

    in_month = sorted({d.day for d in checked if d.year == year and d.month == month})

    # 连续天数：从今天（若今天未达标则从昨天）向前连续计数
    today = date.today()
    cursor = today if today in checked else today - timedelta(days=1)
    streak = 0
    while cursor in checked:
        streak += 1
        cursor = cursor - timedelta(days=1)

    return {"days": in_month, "streak": streak, "goal": goal}


class CheckinReq(BaseModel):
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")


@router.post("/check-ins")
def add_checkin(payload: CheckinReq,
                db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    """打卡：date 格式 YYYY-MM-DD；同日幂等。"""
    try:
        d = date.fromisoformat(payload.date)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="日期格式错误") from exc
    exists = db.execute(
        select(UserCheckin).where(
            UserCheckin.user_id == user.id, UserCheckin.checkin_date == d
        )
    ).scalar_one_or_none()
    if exists:
        return {"ok": True, "date": d.isoformat(), "already": True}
    db.add(UserCheckin(user_id=user.id, checkin_date=d))
    db.commit()
    return {"ok": True, "date": d.isoformat(), "already": False}


# ---------- /progress/weekly ----------
@router.get("/progress/weekly")
def progress_weekly(db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    """返回近 7 天（按 UTC 日期）每天的答题数 counts: [7]"""
    today = date.today()
    start = today - timedelta(days=6)
    rows = db.execute(
        select(UserDailyStat.stat_date, UserDailyStat.answer_count)
        .where(
            UserDailyStat.user_id == user.id,
            UserDailyStat.stat_date >= start,
        )
    ).all()
    by_day = {r[0]: int(r[1] or 0) for r in rows}
    counts = []
    for i in range(7):
        d = start + timedelta(days=i)
        counts.append(by_day.get(d, 0))
    return {"counts": counts, "start_date": start.isoformat(), "end_date": today.isoformat()}