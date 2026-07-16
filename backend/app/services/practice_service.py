"""Practice session lifecycle — create snapshot, save answer, submit, scoring."""
from __future__ import annotations

import json
import random
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import (
    InsufficientQuestions,
    InvalidSelectedOptions,
    NotFound,
    PoolCompleted,
    SessionAlreadySubmitted,
)
from app.models import (
    Paper,
    PaperQuestion,
    PracticeSession,
    Question,
    QuestionVersion,
    SessionQuestion,
    User,
    UserAnswer,
    UserDailyStat,
    UserQuestionState,
    UserSequentialProgress,
)
from app.services.scoring import score_multi, score_single


MODES_REQUIRING_PUBLISHED = {
    "SEQUENTIAL", "RANDOM", "CHAPTER", "KNOWLEDGE", "WRONG", "FAVORITE", "DAILY", "MOCK",
}

# Modes that drive selection by a "where I left off" cursor + reuse the
# user's IN_PROGRESS session when one exists for the same scope. WRONG/
# FAVORITE/RANDOM/DAILY opt out — they don't follow a linear order.
CURSOR_MODES = {"SEQUENTIAL", "CHAPTER", "KNOWLEDGE", "MOCK"}


def _scope_for_mode(
    mode: str,
    *,
    exam_id: int | None,
    chapter_id: int | None,
    knowledge_point_id: int | None,
    paper_id: int | None,
) -> tuple[str, int | None] | None:
    """Return (scope, scope_id) for the per-user cursor table, or None.

    Reuse key is the smallest (scope, scope_id) combination that uniquely
    identifies the user's "where I left off" within that mode.
    """
    if mode == "SEQUENTIAL":
        return ("EXAM", exam_id) if exam_id else None
    if mode == "CHAPTER":
        return ("CHAPTER", chapter_id) if chapter_id else None
    if mode == "KNOWLEDGE":
        return ("KNOWLEDGE", knowledge_point_id) if knowledge_point_id else None
    if mode == "MOCK":
        return ("PAPER", paper_id) if paper_id else None
    return None


def _apply_cursor(
    questions: list[Question], cursor_id: int | None, count: int
) -> list[Question]:
    """Pick count questions in id order starting after cursor_id, wrapping around.

    `questions` is expected to already be sorted ascending by Question.id. If
    no cursor exists yet, just return the leading count. When the tail is
    shorter than count, prepend the head (wrap-around) so the user is always
    served a full batch.
    """
    if not questions:
        return []
    ordered = sorted(questions, key=lambda q: q.id)
    if cursor_id is None:
        return ordered[:count]
    ahead = [q for q in ordered if q.id > cursor_id]
    behind = [q for q in ordered if q.id <= cursor_id]
    return (ahead + behind)[:count]


def _pick_questions_for_mode(
    db: Session,
    *,
    user: User,
    mode: str,
    exam_id: int | None,
    subject_id: int | None = None,
    chapter_id: int | None,
    knowledge_point_id: int | None,
    paper_id: int | None,
    count: int,
    cursor_id: int | None = None,
    fallback: bool = True,
) -> list[Question]:
    """Return published question masters in the requested order. Caller freezes version IDs.

    SEQUENTIAL/CHAPTER/KNOWLEDGE/MOCK honour a per-user cursor (cursor_id) so
    the next batch starts after the user's last reached question, with wrap-
    around to the head when the tail is too short.
    """
    # MOCK + paper_id: pull the actual paper's ordered questions.
    if mode == "MOCK" and paper_id:
        paper = db.get(Paper, paper_id)
        pv_id = paper.current_version_id if paper else None
        if pv_id:
            qids = list(
                db.execute(
                    select(PaperQuestion.question_id)
                    .where(PaperQuestion.paper_version_id == pv_id)
                    .order_by(PaperQuestion.sequence_no.asc())
                ).scalars()
            )
            questions = list(
                db.execute(
                    select(Question).where(
                        Question.id.in_(qids),
                        Question.current_version_id.isnot(None),
                    )
                ).scalars()
            )
            # Re-order according to paper sequence rather than Question.id.
            order = {qid: i for i, qid in enumerate(qids)}
            questions.sort(key=lambda q: order.get(q.id, 1 << 30))
        else:
            questions = []
    else:
        stmt = select(Question).where(Question.current_version_id.isnot(None))
        if exam_id:
            stmt = stmt.where(Question.exam_id == exam_id)
        if subject_id:
            stmt = stmt.where(Question.subject_id == subject_id)
        if chapter_id:
            stmt = stmt.where(Question.chapter_id == chapter_id)
        if knowledge_point_id:
            from app.models import QuestionKnowledgePoint
            stmt = stmt.join(
                QuestionKnowledgePoint,
                QuestionKnowledgePoint.question_version_id
                == Question.current_version_id,
            ).where(QuestionKnowledgePoint.knowledge_point_id == knowledge_point_id)
        # Deterministic natural order for all "ordered" modes.
        stmt = stmt.order_by(Question.id.asc())
        questions = list(db.execute(stmt).scalars())

    # 兜底：仅在用户**没有指定 exam_id**、且是 SEQUENTIAL 时放宽到全题库。
    # 例外：用户没有设置主目标时点 home 页的"顺序练习"，exam_id 是 None，得有题才行。
    # 一旦用户/前端明确带了 exam_id（比如从 catalog 点 大学英语 进去），就老老实实按
    # 指定范围挑题 —— 没题就报 InsufficientQuestions，绝不允许悄悄塞行测的题进来。
    if (
        not questions
        and fallback
        and mode == "SEQUENTIAL"
        and exam_id is None
    ):
        questions = list(
            db.execute(
                select(Question)
                .where(Question.current_version_id.isnot(None))
                .order_by(Question.id.asc())
            ).scalars()
        )

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
    # SEQUENTIAL/CHAPTER/KNOWLEDGE/MOCK keep ascending id order

    return _apply_cursor(questions, cursor_id, count)


def _resume_in_progress_session(
    db: Session,
    *,
    user: User,
    mode: str,
    exam_id: int | None,
    subject_id: int | None,
    chapter_id: int | None,
    knowledge_point_id: int | None,
    paper_id: int | None,
) -> PracticeSession | None:
    """Return the user's un-submitted session for the same scope, if any.

    Used to stop the home-screen "继续练习" button from minting N identical
    sessions when the previous one was never submitted.
    """
    if mode not in CURSOR_MODES:
        return None
    stmt = select(PracticeSession).where(
        PracticeSession.user_id == user.id,
        PracticeSession.mode == mode,
        PracticeSession.status == "IN_PROGRESS",
    )
    if mode == "SEQUENTIAL":
        if exam_id is None:
            return None
        stmt = stmt.where(PracticeSession.exam_id == exam_id)
    elif mode == "CHAPTER":
        if chapter_id is None:
            return None
        stmt = stmt.where(
            PracticeSession.id.in_(
                select(SessionQuestion.session_id)
                .join(Question, Question.id == SessionQuestion.question_id)
                .where(Question.chapter_id == chapter_id)
            )
        )
    elif mode == "KNOWLEDGE":
        if knowledge_point_id is None:
            return None
        from app.models import QuestionKnowledgePoint, QuestionVersion as _QV
        stmt = stmt.where(
            PracticeSession.id.in_(
                select(SessionQuestion.session_id)
                .join(_QV, _QV.id == SessionQuestion.question_version_id)
                .join(
                    QuestionKnowledgePoint,
                    QuestionKnowledgePoint.question_version_id == _QV.id,
                )
                .where(QuestionKnowledgePoint.knowledge_point_id == knowledge_point_id)
            )
        )
    elif mode == "MOCK":
        stmt = stmt.where(PracticeSession.paper_id == paper_id)
    existing = db.execute(
        stmt.order_by(PracticeSession.started_at.desc()).limit(1)
    ).scalar_one_or_none()
    return existing


def _get_cursor(
    db: Session, *, user_id: int, scope: str, scope_id: int
) -> int | None:
    row = db.execute(
        select(UserSequentialProgress).where(
            UserSequentialProgress.user_id == user_id,
            UserSequentialProgress.scope == scope,
            UserSequentialProgress.scope_id == scope_id,
        )
    ).scalar_one_or_none()
    return row.last_question_id if row else None


def _set_cursor(
    db: Session, *, user_id: int, scope: str, scope_id: int, question_id: int
) -> None:
    row = db.execute(
        select(UserSequentialProgress).where(
            UserSequentialProgress.user_id == user_id,
            UserSequentialProgress.scope == scope,
            UserSequentialProgress.scope_id == scope_id,
        )
    ).scalar_one_or_none()
    now = datetime.utcnow()
    if row is None:
        row = UserSequentialProgress(
            user_id=user_id,
            scope=scope,
            scope_id=scope_id,
            last_question_id=question_id,
            updated_at=now,
        )
        db.add(row)
    else:
        row.last_question_id = question_id
        row.updated_at = now


def _is_sequential_pool_exhausted(db: Session, *, user_id: int, exam_id: int) -> bool:
    """Return True iff the user has answered at least every published question
    in the given exam.

    近似判断 —— 与 progress.summary 的 pool_size / total_answered 同口径：admin
    新发布题目会让 pool_size 上涨并可能短暂回到非通关态；这是有意的产品取舍，
    不做反向补偿。pool_size == 0 视作"题库为空"而非"已通关"，由上游
    InsufficientQuestions 处理。
    """
    pool_size = db.execute(
        select(func.count()).select_from(Question).where(
            Question.exam_id == exam_id,
            Question.current_version_id.isnot(None),
        )
    ).scalar() or 0
    if pool_size <= 0:
        return False
    answered = db.execute(
        select(func.count(func.distinct(UserAnswer.question_version_id)))
        .join(PracticeSession, PracticeSession.id == UserAnswer.session_id)
        .where(
            PracticeSession.user_id == user_id,
            PracticeSession.exam_id == exam_id,
        )
    ).scalar() or 0
    return answered >= pool_size


def create_session(
    db: Session,
    *,
    user: User,
    mode: str,
    count: int,
    exam_id: int | None = None,
    subject_id: int | None = None,
    chapter_id: int | None = None,
    knowledge_point_id: int | None = None,
    paper_id: int | None = None,
    restart: bool = False,
) -> PracticeSession:
    """Create a session and freeze question versions in order.

    For SEQUENTIAL/CHAPTER/KNOWLEDGE/MOCK, an in-progress session for the
    same scope is reused (returned as-is) so the user can keep picking up
    where they left off rather than minting a duplicate.

    `restart=True` 仅对 SEQUENTIAL 有意义：题库已通关时，用户点"重新练习"会显式
    跳过 PoolCompleted 拦截并清掉该 scope 的 cursor，让下一批题从题库头部重新
    开始。其余模式忽略此参数。
    """
    # 0. IN_PROGRESS reuse — short-circuit before any selection work.
    reused = _resume_in_progress_session(
        db,
        user=user,
        mode=mode,
        exam_id=exam_id,
        subject_id=subject_id,
        chapter_id=chapter_id,
        knowledge_point_id=knowledge_point_id,
        paper_id=paper_id,
    )
    if reused is not None:
        return reused

    # 0.5 SEQUENTIAL 已通关拦截：仅当用户在该 exam 下答过的题目数已覆盖
    # 已发布题库时才阻止新会话创建，让"从第一道重新刷"的 wrap-around 不再发生。
    # 必须在 _resume_in_progress_session 之后——未交卷的会话应继续走"继续"路径。
    # restart=True 时显式绕过并清掉 cursor，从头开始新一轮。
    if (
        mode == "SEQUENTIAL"
        and exam_id is not None
        and _is_sequential_pool_exhausted(db, user_id=user.id, exam_id=exam_id)
    ):
        if not restart:
            raise PoolCompleted("已通关该考试全部题目")
        db.query(UserSequentialProgress).filter(
            UserSequentialProgress.user_id == user.id,
            UserSequentialProgress.scope == "EXAM",
            UserSequentialProgress.scope_id == exam_id,
        ).delete(synchronize_session=False)
        db.commit()

    # 1. Look up cursor (last_question_id reached) from prior rounds.
    cursor_id: int | None = None
    cursor_pair = _scope_for_mode(
        mode,
        exam_id=exam_id,
        chapter_id=chapter_id,
        knowledge_point_id=knowledge_point_id,
        paper_id=paper_id,
    )
    if cursor_pair:
        _, scope_id = cursor_pair
        cursor_id = _get_cursor(
            db, user_id=user.id, scope=cursor_pair[0], scope_id=scope_id
        )

    # 2. Pick questions, advancing past the cursor with wrap-around.
    questions = _pick_questions_for_mode(
        db,
        user=user,
        mode=mode,
        exam_id=exam_id,
        subject_id=subject_id,
        chapter_id=chapter_id,
        knowledge_point_id=knowledge_point_id,
        paper_id=paper_id,
        count=count,
        cursor_id=cursor_id,
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
    session_duration = db.execute(
        select(func.coalesce(func.sum(UserAnswer.time_spent_seconds), 0))
        .where(UserAnswer.session_id == session_id)
    ).scalar() or 0
    stat = db.execute(
        select(UserDailyStat).where(
            UserDailyStat.user_id == user.id, UserDailyStat.stat_date == today
        )
    ).scalar_one_or_none()
    if stat is None:
        stat = UserDailyStat(
            user_id=user.id, stat_date=today, answer_count=len(sqs),
            correct_count=correct_count, duration_seconds=session_duration,
        )
        db.add(stat)
    else:
        stat.answer_count += len(sqs)
        stat.correct_count += correct_count
        stat.duration_seconds = (stat.duration_seconds or 0) + session_duration

    session.status = "SUBMITTED"
    session.correct_count = correct_count
    session.wrong_count = wrong_count
    session.unanswered_count = unanswered
    session.awarded_score = awarded
    session.submitted_at = datetime.utcnow()
    session.updated_at = datetime.utcnow()
    db.commit()

    # Advance per-user cursor so the next SEQUENTIAL/CHAPTER/KNOWLEDGE/MOCK
    # session picks up after the last question just answered.
    if sqs and session.mode in CURSOR_MODES:
        cursor_pair = _scope_for_mode(
            session.mode,
            exam_id=session.exam_id,
            chapter_id=None,
            knowledge_point_id=None,
            paper_id=session.paper_id,
        )
        # CHAPTER / KNOWLEDGE need to be resolved from the session's questions
        # because session rows don't store those ids directly.
        if cursor_pair is None and session.mode in ("CHAPTER", "KNOWLEDGE"):
            last_sq = sqs[-1]
            last_q = db.get(Question, last_sq.question_id)
            if session.mode == "CHAPTER":
                cursor_pair = ("CHAPTER", last_q.chapter_id)
            else:
                from app.models import QuestionKnowledgePoint as _QKP
                kp_ids = list(
                    db.execute(
                        select(_QKP.knowledge_point_id).where(
                            _QKP.question_version_id == last_sq.question_version_id
                        )
                    ).scalars()
                )
                if kp_ids:
                    cursor_pair = ("KNOWLEDGE", kp_ids[0])
        if cursor_pair and cursor_pair[1] is not None:
            _set_cursor(
                db,
                user_id=session.user_id,
                scope=cursor_pair[0],
                scope_id=cursor_pair[1],
                question_id=sqs[-1].question_id,
            )
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


# ---------------------------------------------------------------------------
# One-shot data backfill: clean up stale IN_PROGRESS sessions left behind by
# the pre-cursor `_pick_questions_for_mode` and seed UserSequentialProgress
# with the highest question_id the user has reached under each scope.
#
# Designed to be called from alembic migration `0005_sequential_progress` so
# fresh deploys inherit the same fix, and from
# scripts/backfill_sequential_progress.py for retro-fitting existing DBs.
# ---------------------------------------------------------------------------


from sqlalchemy import func as _func  # noqa: E402
from app.models import Question as _Question  # noqa: E402
from app.models import QuestionKnowledgePoint as _QKP  # noqa: E402


def backfill_stale_in_progress_and_cursor(db: Session) -> dict[str, int]:
    """Idempotent cleanup + cursor backfill. Returns counters for logging."""
    stats = {"closed_submitted": 0, "deleted_empty": 0, "cursor_rows": 0}

    # 0) Snapshot SessionQuestion rows for every IN_PROGRESS cursor-mode session
    # BEFORE we touch them, so the cursor recompute has the right max question_id
    # even when we end up deleting the session.
    stale = db.execute(
        select(PracticeSession).where(
            PracticeSession.status == "IN_PROGRESS",
            PracticeSession.mode.in_(CURSOR_MODES),
        )
    ).scalars().all()

    # (session_id) -> max question_id from SessionQuestion (already frozen at session create time)
    session_max_qid: dict[int, int | None] = {}
    for s in stale:
        mq = db.execute(
            select(_func.max(SessionQuestion.question_id)).where(
                SessionQuestion.session_id == s.id
            )
        ).scalar()
        session_max_qid[s.id] = mq

    # 1) Resolve every un-submitted cursor-mode session.
    for s in stale:
        has_answers = db.execute(
            select(_func.count()).select_from(UserAnswer).where(
                UserAnswer.session_id == s.id
            )
        ).scalar() or 0
        if has_answers:
            # User partially answered; close out as SUBMITTED with zeros so
            # answered-count aggregates stay consistent, but DON'T credit any
            # points (we don't know if the user got them right).
            total = db.execute(
                select(_func.count()).select_from(SessionQuestion).where(
                    SessionQuestion.session_id == s.id
                )
            ).scalar() or 0
            s.status = "SUBMITTED"
            s.submitted_at = datetime.utcnow()
            s.correct_count = 0
            s.wrong_count = 0
            s.unanswered_count = total
            s.awarded_score = 0.0
            stats["closed_submitted"] += 1
        else:
            # No answers at all — user abandoned this session; remove it so it
            # can't trap them via the IN_PROGRESS reuse branch.
            db.query(SessionQuestion).filter(
                SessionQuestion.session_id == s.id
            ).delete(synchronize_session=False)
            db.delete(s)
            stats["deleted_empty"] += 1
    if stale:
        db.commit()

    # 2) Compute cursor per (user, scope, scope_id).
    # Source = (a) SUBMITTED sessions that now include those we just closed,
    #          (b) SessionQuestion rows that came from deleted IN_PROGRESS ones
    #             — those have been wiped already, so we MUST use the snapshot
    #             collected in step 0 to remember their max question_id.
    cursor_specs: list[tuple[int, str, int, int]] = []

    # SEQUENTIAL — one cursor per (user, exam_id).
    # Source (a): SUBMITTED sessions.
    seq_rows = db.execute(
        select(
            PracticeSession.user_id,
            PracticeSession.exam_id,
            _func.max(SessionQuestion.question_id),
        )
        .join(SessionQuestion, SessionQuestion.session_id == PracticeSession.id)
        .where(PracticeSession.mode == "SEQUENTIAL")
        .where(PracticeSession.exam_id.isnot(None))
        .group_by(PracticeSession.user_id, PracticeSession.exam_id)
    ).all()
    for user_id, exam_id, last_qid in seq_rows:
        if exam_id is not None and last_qid is not None:
            cursor_specs.append((user_id, "EXAM", exam_id, last_qid))
    # Source (b): IN_PROGRESS snapshot, weighted by exam_id.
    for s in stale:
        mq = session_max_qid.get(s.id)
        if mq is None or s.exam_id is None:
            continue
        cursor_specs.append((s.user_id, "EXAM", s.exam_id, mq))

    # CHAPTER — same two sources via Question.chapter_id.
    chap_rows = db.execute(
        select(
            PracticeSession.user_id,
            _Question.chapter_id,
            _func.max(SessionQuestion.question_id),
        )
        .join(SessionQuestion, SessionQuestion.session_id == PracticeSession.id)
        .join(_Question, _Question.id == SessionQuestion.question_id)
        .where(PracticeSession.mode == "CHAPTER")
        .where(_Question.chapter_id.isnot(None))
        .group_by(PracticeSession.user_id, _Question.chapter_id)
    ).all()
    for user_id, chapter_id, last_qid in chap_rows:
        if chapter_id is not None and last_qid is not None:
            cursor_specs.append((user_id, "CHAPTER", chapter_id, last_qid))

    # KNOWLEDGE — via QuestionKnowledgePoint.
    from app.models import QuestionVersion as _QV

    kp_rows = db.execute(
        select(
            PracticeSession.user_id,
            _QKP.knowledge_point_id,
            _func.max(SessionQuestion.question_id),
        )
        .join(SessionQuestion, SessionQuestion.session_id == PracticeSession.id)
        .join(_QV, _QV.id == SessionQuestion.question_version_id)
        .join(_QKP, _QKP.question_version_id == _QV.id)
        .where(PracticeSession.mode == "KNOWLEDGE")
        .group_by(PracticeSession.user_id, _QKP.knowledge_point_id)
    ).all()
    for user_id, kp_id, last_qid in kp_rows:
        if kp_id is not None and last_qid is not None:
            cursor_specs.append((user_id, "KNOWLEDGE", kp_id, last_qid))

    # MOCK — one cursor per (user, paper_id).
    mock_rows = db.execute(
        select(
            PracticeSession.user_id,
            PracticeSession.paper_id,
            _func.max(SessionQuestion.question_id),
        )
        .join(SessionQuestion, SessionQuestion.session_id == PracticeSession.id)
        .where(PracticeSession.mode == "MOCK")
        .where(PracticeSession.paper_id.isnot(None))
        .group_by(PracticeSession.user_id, PracticeSession.paper_id)
    ).all()
    for user_id, paper_id, last_qid in mock_rows:
        if paper_id is not None and last_qid is not None:
            cursor_specs.append((user_id, "PAPER", paper_id, last_qid))

    # 3) Aggregate per (user, scope, scope_id) — take the absolute max.
    agg: dict[tuple[int, str, int], int] = {}
    for user_id, scope, scope_id, last_qid in cursor_specs:
        key = (user_id, scope, scope_id)
        agg[key] = max(agg.get(key, 0), last_qid)

    # 4) Upsert UserSequentialProgress.
    for (user_id, scope, scope_id), last_qid in agg.items():
        _set_cursor(
            db,
            user_id=user_id,
            scope=scope,
            scope_id=scope_id,
            question_id=last_qid,
        )
        stats["cursor_rows"] += 1
    db.commit()
    return stats
