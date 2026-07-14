"""C-end practice: session lifecycle + answer + submit + result + daily-task."""
from __future__ import annotations

import json
from typing import Annotated

from fastapi import APIRouter, Body, Depends, Header, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import IdempotencyConflict
from app.database import get_db
from app.deps import resolve_user
from app.models import (
    DailyPracticeConfig,
    Exam,
    Paper,
    PracticeSession,
    Question,
    QuestionVersion,
    SessionQuestion,
    Subject,
    User,
    UserAnswer,
)
from app.services import idempotency
from app.services.practice_service import (
    create_session,
    save_answer,
    session_to_dict,
    submit_session,
)
from datetime import datetime

router = APIRouter()


class CreateSessionReq(BaseModel):
    mode: str = Field(..., description="SEQUENTIAL/RANDOM/CHAPTER/KNOWLEDGE/WRONG/FAVORITE/MOCK/DAILY")
    count: int | None = Field(None, ge=1, le=200, description="DAILY 模式可省略，从今日配置读取")
    exam_id: int | None = None
    subject_id: int | None = None
    chapter_id: int | None = None
    knowledge_point_id: int | None = None
    paper_id: int | None = None


@router.post("")
def create(
    payload: CreateSessionReq,
    db: Session = Depends(get_db),
    user: User = Depends(resolve_user),
):
    exam_id = payload.exam_id
    subject_id = payload.subject_id
    count = payload.count
    # DAILY 模式：从今天的配置读 exam/subject/count（payload 可以省略）
    if payload.mode == "DAILY":
        cfg = db.execute(
            select(DailyPracticeConfig).where(
                DailyPracticeConfig.config_date == datetime.utcnow().date()
            )
        ).scalar_one_or_none()
        if cfg is None:
            return {"code": "NO_DAILY_TASK", "message": "今日暂无每日一练"}
        exam_id = cfg.exam_id
        subject_id = cfg.subject_id
        count = cfg.question_count
    if count is None:
        return {"code": "VALIDATION_FAILED", "message": "count 不能为空"}
    sess = create_session(
        db,
        user=user,
        mode=payload.mode,
        count=count,
        exam_id=exam_id,
        subject_id=subject_id,
        chapter_id=payload.chapter_id,
        knowledge_point_id=payload.knowledge_point_id,
        paper_id=payload.paper_id,
    )
    # 答案仅在交卷后才返回，避免提前泄露（前端也按 status === 'SUBMITTED' 来 reveal）
    return session_to_dict(db, sess, reveal_answers=sess.status == "SUBMITTED")


@router.get("/daily-task")
def daily_task(db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    today = datetime.utcnow().date()
    cfg = db.execute(
        select(DailyPracticeConfig).where(DailyPracticeConfig.config_date == today)
    ).scalar_one_or_none()
    if cfg is None:
        return {"has_task": False, "message": "今日暂无每日一练"}

    exam = db.get(Exam, cfg.exam_id)
    subject = db.get(Subject, cfg.subject_id) if cfg.subject_id else None
    return {
        "has_task": True,
        "config_id": cfg.id,
        "exam_id": cfg.exam_id,
        "exam_name": exam.name if exam else None,
        "subject_id": cfg.subject_id,
        "subject_name": subject.name if subject else None,
        "count": cfg.question_count,
    }


@router.get("/{session_id}")
def get_session(session_id: int, db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    sess = db.get(PracticeSession, session_id)
    if sess is None or sess.user_id != user.id:
        return {"code": "NOT_FOUND", "message": "会话不存在"}
    # 答案仅在交卷后才返回，避免提前泄露
    return session_to_dict(db, sess, reveal_answers=sess.status == "SUBMITTED")


class SaveAnswerReq(BaseModel):
    selected_options: list[str]
    time_spent_seconds: int = 0


@router.put("/{session_id}/answers/{question_version_id}")
def save(
    session_id: int,
    question_version_id: int,
    payload: SaveAnswerReq,
    request: Request,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
    db: Session = Depends(get_db),
    user: User = Depends(resolve_user),
):
    endpoint = f"PUT /practice-sessions/{session_id}/answers/{question_version_id}"
    body_for_hash = {"selected_options": sorted(payload.selected_options), "time_spent_seconds": payload.time_spent_seconds}
    request_hash = idempotency.hash_request(body_for_hash)

    if idempotency_key:
        replay = idempotency.lookup(
            db, key=idempotency_key, endpoint=endpoint,
            subject_type="USER", subject_id=user.id, request_hash=request_hash,
        )
        if replay is not None:
            status_code, body = replay
            return body
    ua = save_answer(
        db,
        user=user,
        session_id=session_id,
        question_version_id=question_version_id,
        selected_options=payload.selected_options,
        time_spent_seconds=payload.time_spent_seconds,
    )
    result = {
        "selected_options": json.loads(ua.selected_options),
        "submit_count": ua.submit_count,
        "answered_at": ua.answered_at.isoformat(),
    }
    if idempotency_key:
        idempotency.record(
            db, key=idempotency_key, endpoint=endpoint,
            subject_type="USER", subject_id=user.id, request_hash=request_hash,
            status_code=200, response_body=result,
        )
        db.commit()
    return result


@router.post("/{session_id}/submit")
def submit(
    session_id: int,
    request: Request,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
    db: Session = Depends(get_db),
    user: User = Depends(resolve_user),
):
    endpoint = f"POST /practice-sessions/{session_id}/submit"
    request_hash = idempotency.hash_request({})
    if idempotency_key:
        replay = idempotency.lookup(
            db, key=idempotency_key, endpoint=endpoint,
            subject_type="USER", subject_id=user.id, request_hash=request_hash,
        )
        if replay is not None:
            status_code, body = replay
            return body
    sess = submit_session(db, user=user, session_id=session_id)
    result = session_to_dict(db, sess, reveal_answers=True)
    if idempotency_key:
        idempotency.record(
            db, key=idempotency_key, endpoint=endpoint,
            subject_type="USER", subject_id=user.id, request_hash=request_hash,
            status_code=200, response_body=result,
        )
        db.commit()
    return result


@router.get("/{session_id}/result")
def result(session_id: int, db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    sess = db.get(PracticeSession, session_id)
    if sess is None or sess.user_id != user.id:
        return {"code": "NOT_FOUND", "message": "会话不存在"}
    return session_to_dict(db, sess, reveal_answers=True)
