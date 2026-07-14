"""C-end user onboarding wizard (5 步问卷) + 推荐方案生成。"""
from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import resolve_user
from app.models import Exam, User, UserExamTarget
from app.core.exceptions import NotFound, ValidationFailed

router = APIRouter()


# 枚举值固定，前端对齐使用
PURPOSE_VALUES = {"EXAM_PREP", "SKILL_UP", "KEEP_FRESH"}
DAILY_GOAL_VALUES = {"FAST", "STEADY", "MAINTAIN"}
STUDY_PACE_OPTIONS = (10, 20, 30, 45)


PURPOSE_LABEL = {
    "EXAM_PREP": "备战考试",
    "SKILL_UP":  "提升技能",
    "KEEP_FRESH": "保持手感",
}
DAILY_GOAL_LABEL = {
    "FAST":     "很快提升",
    "STEADY":   "稳步提升",
    "MAINTAIN": "保持手感",
}


class OnboardingIn(BaseModel):
    purpose: Literal["EXAM_PREP", "SKILL_UP", "KEEP_FRESH"]
    exam_id: int
    daily_goal: Literal["FAST", "STEADY", "MAINTAIN"]
    study_pace_minutes: int = Field(..., ge=5, le=180)


def _build_recommended_plan(purpose: str, daily_goal: str, pace: int) -> list[dict]:
    """根据问卷输入生成 3 条推荐方案（前端原型 5/5 展示）。"""
    # 每日刷题题量：受 pace 和 daily_goal 影响
    base = max(5, pace // 2)  # pace/2 题为基线
    if daily_goal == "FAST":
        daily_q = base + 10
    elif daily_goal == "STEADY":
        daily_q = base
    else:
        daily_q = max(5, base - 5)
    # 错题复盘：与 pace 联动，5/10/15 分钟
    if pace <= 15:
        review_min = 5
    elif pace <= 30:
        review_min = 10
    else:
        review_min = 15
    # 每周模考：purpose=EXAM_PREP 才推，否则不推
    plan = [
        {
            "type": "DAILY_PRACTICE",
            "title": f"每日刷题 {daily_q} 题",
            "desc": "精选高频考点，稳步提升",
            "amount": daily_q,
            "unit": "题",
        },
        {
            "type": "WRONG_REVIEW",
            "title": f"错题复盘 {review_min} 分钟",
            "desc": "定期回顾错题，攻克薄弱点",
            "amount": review_min,
            "unit": "分钟",
        },
    ]
    if purpose == "EXAM_PREP":
        plan.append({
            "type": "WEEKLY_MOCK",
            "title": "每周模考 1 次",
            "desc": "全真模拟演练，检验学习效果",
            "amount": 1,
            "unit": "次",
        })
    return plan


@router.get("/onboarding-status")
def onboarding_status(db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    """检查用户是否完成过 onboarding 问卷；返回上次答案（如有）。"""
    primary = db.execute(
        select(UserExamTarget).where(
            UserExamTarget.user_id == user.id, UserExamTarget.is_primary.is_(True)
        )
    ).scalar_one_or_none()
    snapshot = None
    if primary is not None:
        snapshot = {
            "purpose": primary.purpose,
            "exam_id": primary.exam_id,
            "daily_goal": primary.daily_goal,
            "study_pace_minutes": primary.study_pace_minutes,
        }
    return {
        "completed": bool(user.onboarding_completed),
        "snapshot": snapshot,
    }


@router.post("/onboarding")
def submit_onboarding(payload: OnboardingIn, db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    """一次性保存 5 步问卷答案，并把用户标记为 onboarding_completed=true。"""
    if not db.get(Exam, payload.exam_id):
        raise NotFound("考试不存在")
    if payload.study_pace_minutes not in STUDY_PACE_OPTIONS:
        raise ValidationFailed(f"学习节奏必须为 {STUDY_PACE_OPTIONS} 之一")

    # upsert 主目标：
    #  - 若新 exam_id 已有 row：把那条改为主、写入问卷字段、删除其他 row
    #  - 若没有：直接把当前主目标改 exam_id 即可（但可能撞唯一约束）
    #  安全做法：先把所有同 user 的旧 row 删掉（onboarding 是"全部重置"语义），再插入新主目标
    db.query(UserExamTarget).filter(
        UserExamTarget.user_id == user.id,
    ).delete(synchronize_session=False)

    primary = UserExamTarget(
        user_id=user.id,
        exam_id=payload.exam_id,
        is_primary=True,
        purpose=payload.purpose,
        daily_goal=payload.daily_goal,
        study_pace_minutes=payload.study_pace_minutes,
        daily_question_goal=max(5, int(payload.study_pace_minutes * 0.8)),
    )
    db.add(primary)

    user.onboarding_completed = True

    db.commit()
    db.refresh(primary)
    db.refresh(user)

    return {
        "ok": True,
        "primary_target": {
            "id": primary.id,
            "exam_id": primary.exam_id,
            "purpose": primary.purpose,
            "daily_goal": primary.daily_goal,
            "study_pace_minutes": primary.study_pace_minutes,
            "daily_question_goal": primary.daily_question_goal,
        },
        "recommended_plan": _build_recommended_plan(
            primary.purpose, primary.daily_goal, primary.study_pace_minutes,
        ),
    }
