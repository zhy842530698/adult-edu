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
    Paper,
    PracticeSession,
    Question,
    QuestionVersion,
    SessionQuestion,
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
    count: int = Field(..., ge=1, le=200)
    exam_id: int | None = None
    chapter_id: int | None = None
    knowledge_point_id: int | None = None
    paper_id: int | None = None


@router.post("")
def create(
    payload: CreateSessionReq,
    db: Session = Depends(get_db),
    user: User = Depends(resolve_user),
):
    sess = create_session(
        db,
        user=user,
        mode=payload.mode,
        count=payload.count,
        exam_id=payload.exam_id,
        chapter_id=payload.chapter_id,
        knowledge_point_id=payload.knowledge_point_id,
        paper_id=payload.paper_id,
    )
    # daily-task mode: ignore payload.count and use config count
    return session_to_dict(db, sess, reveal_answers=sess.mode != "MOCK" or sess.status == "SUBMITTED")


@router.get("/{session_id}")
def get_session(session_id: int, db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    sess = db.get(PracticeSession, session_id)
    if sess is None or sess.user_id != user.id:
        return {"code": "NOT_FOUND", "message": "会话不存在"}
    reveal = sess.mode != "MOCK" or sess.status == "SUBMITTED"
    return session_to_dict(db, sess, reveal_answers=reveal)


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


@router.get("/daily-task")
def daily_task(db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    today = datetime.utcnow().date()
    cfg = db.execute(
        select(DailyPracticeConfig).where(DailyPracticeConfig.config_date == today)
    ).scalar_one_or_none()
    if cfg is None:
        # auto-create a default daily task if any exam exists
        first_exam = db.execute(select(Question).limit(1)).scalar_one_or_none()
        return {"has_task": False, "message": "今日暂无每日一练"}
    return {"has_task": True, "config_id": cfg.id, "exam_id": cfg.exam_id, "count": cfg.question_count}
