"""Practice session lifecycle — create snapshot, save answer, submit, scoring."""
from __future__ import annotations

import json
import random
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import (
    InsufficientQuestions,
    InvalidSelectedOptions,
    NotFound,
    SessionAlreadySubmitted,
)
from app.models import (
    Paper,
    PracticeSession,
    Question,
    QuestionVersion,
    SessionQuestion,
    User,
    UserAnswer,
    UserDailyStat,
    UserQuestionState,
)
from app.services.scoring import score_multi, score_single


MODES_REQUIRING_PUBLISHED = {
    "SEQUENTIAL", "RANDOM", "CHAPTER", "KNOWLEDGE", "WRONG", "FAVORITE", "DAILY", "MOCK",
}


def _pick_questions_for_mode(
    db: Session,
    *,
    user: User,
    mode: str,
    exam_id: int | None,
    chapter_id: int | None,
    knowledge_point_id: int | None,
    count: int,
) -> list[Question]:
    """Return published question masters in the requested order. Caller freezes version IDs."""
    stmt = select(Question).where(Question.current_version_id.isnot(None))
    if exam_id:
        stmt = stmt.where(Question.exam_id == exam_id)
    if chapter_id:
        stmt = stmt.where(Question.chapter_id == chapter_id)
    if knowledge_point_id:
        from app.models import QuestionKnowledgePoint
        stmt = stmt.join(
            QuestionKnowledgePoint,
            QuestionKnowledgePoint.question_version_id == Question.current_version_id,
        ).where(QuestionKnowledgePoint.knowledge_point_id == knowledge_point_id)

    questions = list(db.execute(stmt).scalars())

    if mode == "WRONG":
        wrong_qids = {
            r[0]
            for r in db.execute(
                select(UserQuestionState.question_id).where(
                    UserQuestionState.user_id == user.id,
                    UserQuestionState.wrong_count > 0,
                )
            ).all()
        }
        questions = [q for q in questions if q.id in wrong_qids]
    elif mode == "FAVORITE":
        fav_qids = {
            r[0]
            for r in db.execute(
                select(UserQuestionState.question_id).where(
                    UserQuestionState.user_id == user.id,
                    UserQuestionState.is_favorite.is_(True),
                )
            ).all()
        }
        questions = [q for q in questions if q.id in fav_qids]
    elif mode == "RANDOM":
        random.shuffle(questions)
    # SEQUENTIAL/CHAPTER/KNOWLEDGE/DAILY/MOCK keep natural order

    return questions[:count]


def create_session(
    db: Session,
    *,
    user: User,
    mode: str,
    count: int,
    exam_id: int | None = None,
    chapter_id: int | None = None,
    knowledge_point_id: int | None = None,
    paper_id: int | None = None,
) -> PracticeSession:
    """Create a session and freeze question versions in order."""
    questions = _pick_questions_for_mode(
        db,
        user=user,
        mode=mode,
        exam_id=exam_id,
        chapter_id=chapter_id,
        knowledge_point_id=knowledge_point_id,
        count=count,
    )
    actual = len(questions)
    if actual < count and mode != "DAILY":
        # Spec FR-C-PRAC-006 — return actual count via InsufficientQuestions
        raise InsufficientQuestions(
            message=f"题量不足，请求 {count} 道，实际可用 {actual} 道",
            actual_available=actual,
        )

    analysis_rule = "AFTER_SUBMIT" if mode == "MOCK" else "INSTANT"
    session = PracticeSession(
        user_id=user.id,
        exam_id=exam_id,
        paper_id=paper_id,
        mode=mode,
        status="CREATED",
        total_score=0,
        awarded_score=0,
        correct_count=0,
        wrong_count=0,
        unanswered_count=actual,
        started_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(session)
    db.flush()

    for idx, q in enumerate(questions, start=1):
        qv = db.get(QuestionVersion, q.current_version_id)
        sq = SessionQuestion(
            session_id=session.id,
            question_id=q.id,
            question_version_id=qv.id,
            sequence_no=idx,
            score=qv.score,
            scoring_rule=qv.scoring_rule,
            analysis_display_rule=analysis_rule,
        )
        db.add(sq)
        session.total_score += qv.score

    session.status = "IN_PROGRESS"
    db.commit()
    db.refresh(session)
    return session


def save_answer(
    db: Session,
    *,
    user: User,
    session_id: int,
    question_version_id: int,
    selected_options: list[str],
    time_spent_seconds: int,
) -> UserAnswer:
    session = db.get(PracticeSession, session_id)
    if session is None or session.user_id != user.id:
        raise NotFound("会话不存在")
    if session.status == "SUBMITTED":
        raise SessionAlreadySubmitted("会话已交卷，不能继续作答")

    sq = db.execute(
        select(SessionQuestion).where(
            SessionQuestion.session_id == session_id,
            SessionQuestion.question_version_id == question_version_id,
        )
    ).scalar_one_or_none()
    if sq is None:
        raise NotFound("题目不在本会话中")

    qv = db.get(QuestionVersion, question_version_id)
    valid_codes = {o.option_code for o in qv.options}
    norm = sorted({c.upper().strip() for c in (selected_options or [])})
    if not norm or any(c not in valid_codes for c in norm):
        raise InvalidSelectedOptions("选项不合法")
    if qv.question.question_type == "SINGLE_CHOICE" and len(norm) != 1:
        raise InvalidSelectedOptions("单选题只能提交 1 个选项")

    correct_set = set(json.loads(qv.correct_options))
    ua = db.execute(
        select(UserAnswer).where(
            UserAnswer.session_id == session_id,
            UserAnswer.question_version_id == question_version_id,
        )
    ).scalar_one_or_none()

    if ua is None:
        ua = UserAnswer(
            session_id=session_id,
            question_version_id=question_version_id,
            selected_options=json.dumps(norm),
            time_spent_seconds=int(time_spent_seconds or 0),
            submit_count=1,
            answered_at=datetime.utcnow(),
        )
        db.add(ua)
    else:
        ua.selected_options = json.dumps(norm)
        ua.time_spent_seconds = int(time_spent_seconds or ua.time_spent_seconds)
        ua.submit_count += 1
        ua.answered_at = datetime.utcnow()

    session.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ua)
    return ua


def submit_session(db: Session, *, user: User, session_id: int) -> PracticeSession:
    session = db.get(PracticeSession, session_id)
    if session is None or session.user_id != user.id:
        raise NotFound("会话不存在")
    if session.status == "SUBMITTED":
        return session  # idempotent replay returns existing session

    sqs = list(
        db.execute(
            select(SessionQuestion).where(SessionQuestion.session_id == session_id).order_by(
                SessionQuestion.sequence_no
            )
        ).scalars()
    )

    correct_count = 0
    wrong_count = 0
    unanswered = 0
    awarded = 0.0
    for sq in sqs:
        qv = db.get(QuestionVersion, sq.question_version_id)
        ua = db.execute(
            select(UserAnswer).where(
                UserAnswer.session_id == session_id,
                UserAnswer.question_version_id == sq.question_version_id,
            )
        ).scalar_one_or_none()
        correct_set = set(json.loads(qv.correct_options))
        if ua is None:
            unanswered += 1
            continue
        user_set = set(json.loads(ua.selected_options))
        if qv.question.question_type == "SINGLE_CHOICE":
            ok, _ = score_single(next(iter(user_set)) if user_set else "", correct_set)
        else:
            ok, _ = score_multi(user_set, correct_set)
        ua.is_correct = ok
        ua.awarded_score = sq.score if ok else 0.0
        if ok:
            correct_count += 1
            awarded += sq.score
        else:
            wrong_count += 1
        # Update per-question state (wrongbook, mastery, review schedule)
        _update_user_question_state(db, user_id=user.id, question_id=sq.question_id, correct=ok)

    # Update daily stat
    today = datetime.utcnow().date()
    stat = db.execute(
        select(UserDailyStat).where(
            UserDailyStat.user_id == user.id, UserDailyStat.stat_date == today
        )
    ).scalar_one_or_none()
    if stat is None:
        stat = UserDailyStat(
            user_id=user.id, stat_date=today, answer_count=len(sqs),
            correct_count=correct_count, duration_seconds=sum(
                (db.get(UserAnswer, ua.id).time_spent_seconds if ua else 0) for ua in []  # noqa
            ),
        )
        db.add(stat)
    else:
        stat.answer_count += len(sqs)
        stat.correct_count += correct_count

    session.status = "SUBMITTED"
    session.correct_count = correct_count
    session.wrong_count = wrong_count
    session.unanswered_count = unanswered
    session.awarded_score = awarded
    session.submitted_at = datetime.utcnow()
    session.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(session)
    return session


def _update_user_question_state(db: Session, *, user_id: int, question_id: int, correct: bool) -> None:
    state = db.execute(
        select(UserQuestionState).where(
            UserQuestionState.user_id == user_id,
            UserQuestionState.question_id == question_id,
        )
    ).scalar_one_or_none()
    now = datetime.utcnow()
    if state is None:
        state = UserQuestionState(
            user_id=user_id,
            question_id=question_id,
            wrong_count=0 if correct else 1,
            correct_count=1 if correct else 0,
            consecutive_correct=1 if correct else 0,
            mastered=False,
            first_wrong_at=None if correct else now,
            last_wrong_at=None if correct else now,
            next_review_at=None if correct else now + timedelta(days=1),
        )
        db.add(state)
    else:
        if correct:
            state.correct_count += 1
            state.consecutive_correct += 1
            if state.consecutive_correct >= 3:
                state.mastered = True
            # Push next review further if previously wrong
            if state.last_wrong_at:
                # 1d, 3d, 7d, 30d cadence based on consecutive_correct
                days = {1: 3, 2: 7}.get(state.consecutive_correct, 30)
                state.next_review_at = now + timedelta(days=days)
        else:
            state.wrong_count += 1
            state.consecutive_correct = 0
            state.mastered = False
            state.last_wrong_at = now
            if state.first_wrong_at is None:
                state.first_wrong_at = now
            state.next_review_at = now + timedelta(days=1)
    db.flush()


def session_to_dict(db: Session, session: PracticeSession, *, reveal_answers: bool) -> dict:
    """Serialize session for client. Hides correct/analysis for MOCK before submit."""
    sqs = list(
        db.execute(
            select(SessionQuestion).where(SessionQuestion.session_id == session.id).order_by(
                SessionQuestion.sequence_no
            )
        ).scalars()
    )
    items = []
    for sq in sqs:
        qv = db.get(QuestionVersion, sq.question_version_id)
        q = db.get(Question, sq.question_id)
        options = [{"option_code": o.option_code, "content": o.content} for o in qv.options]
        ua = db.execute(
            select(UserAnswer).where(
                UserAnswer.session_id == session.id,
                UserAnswer.question_version_id == sq.question_version_id,
            )
        ).scalar_one_or_none()
        item = {
            "sequence_no": sq.sequence_no,
            "question_id": q.id,
            "question_version_id": qv.id,
            "question_type": q.question_type,
            "stem": qv.stem,
            "options": options,
            "score": sq.score,
            "selected_options": json.loads(ua.selected_options) if ua else [],
            "submit_count": ua.submit_count if ua else 0,
            "is_correct": ua.is_correct if ua else None,
            "awarded_score": ua.awarded_score if ua else None,
            "time_spent_seconds": ua.time_spent_seconds if ua else 0,
        }
        if reveal_answers:
            item["correct_options"] = json.loads(qv.correct_options)
            item["analysis"] = qv.analysis
        items.append(item)
    return {
        "id": session.id,
        "mode": session.mode,
        "status": session.status,
        "total_score": session.total_score,
        "awarded_score": session.awarded_score,
        "correct_count": session.correct_count,
        "wrong_count": session.wrong_count,
        "unanswered_count": session.unanswered_count,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "submitted_at": session.submitted_at.isoformat() if session.submitted_at else None,
        "items": items,
    }
