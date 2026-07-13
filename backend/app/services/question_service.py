"""Question creation / editing / versioning."""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import (
    Conflict,
    InvalidSelectedOptions,
    NotFound,
    ValidationFailed,
)
from app.models import (
    KnowledgePoint,
    Question,
    QuestionAsset,
    QuestionKnowledgePoint,
    QuestionOption,
    QuestionReviewRecord,
    QuestionVersion,
)
from app.services.html_sanitizer import clean as clean_html


# ---------- Helpers ----------

OPTION_CODES = list("ABCDEFGH")


def _validate_options_payload(question_type: str, options: list[dict]) -> list[str]:
    """Returns cleaned list of option_codes in original order. Raises on invalid."""
    if not options or len(options) < 2:
        raise ValidationFailed("至少需要 2 个选项")
    if len(options) > 8:
        raise ValidationFailed("最多 8 个选项")
    if question_type == "MULTIPLE_CHOICE" and len(options) < 3:
        raise ValidationFailed("多选题至少需要 3 个选项")
    codes = [o.get("option_code", "").upper() for o in options]
    if len(set(codes)) != len(codes):
        raise ValidationFailed("选项编码不能重复")
    for c in codes:
        if c not in OPTION_CODES:
            raise ValidationFailed(f"选项编码 {c} 不合法（A-H）")
    return codes


def _validate_correct_options(question_type: str, correct: list[str], options: list[dict]) -> list[str]:
    valid_codes = {o["option_code"].upper() for o in options}
    norm = [c.upper().strip() for c in (correct or [])]
    unknown = [c for c in norm if c not in valid_codes]
    if unknown:
        raise InvalidSelectedOptions(f"正确答案 {unknown} 不在现有选项中")
    norm = sorted(set(norm))
    if question_type == "SINGLE_CHOICE":
        if len(norm) != 1:
            raise ValidationFailed("单选题正确答案必须恰好 1 个")
    elif question_type == "MULTIPLE_CHOICE":
        if len(norm) < 2:
            raise ValidationFailed("多选题正确答案至少 2 个")
    else:
        raise ValidationFailed(f"不支持的题型 {question_type}")
    return norm


def _validate_payload_common(payload: dict) -> None:
    for field in ("stem", "analysis", "source_name", "license_type"):
        if not payload.get(field):
            raise ValidationFailed(f"字段 {field} 不能为空")
    if payload.get("difficulty") is None or not (1 <= int(payload["difficulty"]) <= 5):
        raise ValidationFailed("难度必须在 1-5 之间")
    if payload.get("score") is None or float(payload["score"]) <= 0:
        raise ValidationFailed("分值必须为正数")


# ---------- Create draft ----------

def create_draft(
    db: Session,
    *,
    actor_id: int,
    payload: dict,
) -> QuestionVersion:
    """Create a new question master + first DRAFT version."""
    _validate_payload_common(payload)

    qt = payload["question_type"]
    options = payload.get("options") or []
    _validate_options_payload(qt, options)
    correct = _validate_correct_options(qt, payload.get("correct_options", []), options)

    q = Question(
        question_type=qt,
        exam_id=payload["exam_id"],
        subject_id=payload["subject_id"],
        chapter_id=payload.get("chapter_id"),
        difficulty=int(payload.get("difficulty", 3)),
        tags=payload.get("tags"),
        latest_version_no=1,
        created_by=actor_id,
        last_editor_admin_id=actor_id,
    )
    db.add(q)
    db.flush()

    qv = QuestionVersion(
        question_id=q.id,
        version_no=1,
        status="DRAFT",
        stem=clean_html(payload["stem"]),
        analysis=clean_html(payload["analysis"]),
        correct_options=json.dumps(correct),
        score=float(payload["score"]),
        scoring_rule="EXACT_MATCH",
        source_name=payload["source_name"],
        source_year=payload.get("source_year"),
        source_question_no=payload.get("source_question_no"),
        license_type=payload["license_type"],
        external_ref=payload.get("external_ref"),
        source_type=payload.get("source_type") or "PLATFORM_ORIGINAL",
        real_exam_year=payload.get("real_exam_year"),
        created_by=actor_id,
    )
    db.add(qv)
    db.flush()

    for idx, o in enumerate(options):
        db.add(
            QuestionOption(
                question_version_id=qv.id,
                option_code=o["option_code"].upper(),
                content=clean_html(o.get("content", "")),
                sort_order=idx,
            )
        )

    for kp_id in payload.get("knowledge_point_ids") or []:
        db.add(QuestionKnowledgePoint(question_version_id=qv.id, knowledge_point_id=int(kp_id)))

    for asset in payload.get("assets") or []:
        db.add(
            QuestionAsset(
                question_version_id=qv.id,
                asset_type=asset["asset_type"],
                url=asset["url"],
                file_name=asset.get("file_name"),
                file_size=asset.get("file_size"),
            )
        )

    db.commit()
    db.refresh(qv)
    return qv


# ---------- Edit (with versioning) ----------

def edit_question(
    db: Session,
    *,
    question_id: int,
    actor_id: int,
    payload: dict,
) -> QuestionVersion:
    """Edit existing question. If master is published, create new DRAFT version (do not overwrite)."""
    q = db.get(Question, question_id)
    if q is None:
        raise NotFound("题目不存在")

    # If there is no published version yet, the existing DRAFT is the only version — update it.
    has_published = q.current_version_id is not None

    if not has_published:
        qv = db.execute(
            select(QuestionVersion).where(
                QuestionVersion.question_id == question_id,
                QuestionVersion.version_no == q.latest_version_no,
            )
        ).scalar_one_or_none()
        if qv is None or qv.status not in ("DRAFT", "REJECTED"):
            raise Conflict("题目状态不允许编辑")
        # update in place
        _validate_payload_common(payload)
        qt = payload["question_type"]
        options = payload.get("options") or []
        _validate_options_payload(qt, options)
        correct = _validate_correct_options(qt, payload.get("correct_options", []), options)

        qv.stem = clean_html(payload["stem"])
        qv.analysis = clean_html(payload["analysis"])
        qv.correct_options = json.dumps(correct)
        qv.score = float(payload["score"])
        qv.source_name = payload["source_name"]
        qv.source_year = payload.get("source_year")
        qv.source_question_no = payload.get("source_question_no")
        qv.license_type = payload["license_type"]
        qv.external_ref = payload.get("external_ref")
        qv.source_type = payload.get("source_type") or qv.source_type or "PLATFORM_ORIGINAL"
        qv.real_exam_year = payload.get("real_exam_year")

        # replace options / kps
        for opt in list(qv.options):
            db.delete(opt)
        for idx, o in enumerate(options):
            db.add(
                QuestionOption(
                    question_version_id=qv.id,
                    option_code=o["option_code"].upper(),
                    content=clean_html(o.get("content", "")),
                    sort_order=idx,
                )
            )
        for kp in list(qv.kps):
            db.delete(kp)
        for kp_id in payload.get("knowledge_point_ids") or []:
            db.add(QuestionKnowledgePoint(question_version_id=qv.id, knowledge_point_id=int(kp_id)))

        q.question_type = qt
        q.exam_id = payload["exam_id"]
        q.subject_id = payload["subject_id"]
        q.chapter_id = payload.get("chapter_id")
        q.difficulty = int(payload.get("difficulty", 3))
        q.tags = payload.get("tags")
        q.last_editor_admin_id = actor_id
        q.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(qv)
        return qv

    # Published: create new DRAFT version. Old version remains immutable.
    new_version_no = q.latest_version_no + 1
    _validate_payload_common(payload)
    qt = payload["question_type"]
    options = payload.get("options") or []
    _validate_options_payload(qt, options)
    correct = _validate_correct_options(qt, payload.get("correct_options", []), options)

    qv = QuestionVersion(
        question_id=q.id,
        version_no=new_version_no,
        status="DRAFT",
        stem=clean_html(payload["stem"]),
        analysis=clean_html(payload["analysis"]),
        correct_options=json.dumps(correct),
        score=float(payload["score"]),
        scoring_rule="EXACT_MATCH",
        source_name=payload["source_name"],
        source_year=payload.get("source_year"),
        source_question_no=payload.get("source_question_no"),
        license_type=payload["license_type"],
        external_ref=payload.get("external_ref"),
        source_type=payload.get("source_type") or "PLATFORM_ORIGINAL",
        real_exam_year=payload.get("real_exam_year"),
        created_by=actor_id,
    )
    db.add(qv)
    db.flush()

    for idx, o in enumerate(options):
        db.add(
            QuestionOption(
                question_version_id=qv.id,
                option_code=o["option_code"].upper(),
                content=clean_html(o.get("content", "")),
                sort_order=idx,
            )
        )
    for kp_id in payload.get("knowledge_point_ids") or []:
        db.add(QuestionKnowledgePoint(question_version_id=qv.id, knowledge_point_id=int(kp_id)))
    for asset in payload.get("assets") or []:
        db.add(
            QuestionAsset(
                question_version_id=qv.id,
                asset_type=asset["asset_type"],
                url=asset["url"],
                file_name=asset.get("file_name"),
                file_size=asset.get("file_size"),
            )
        )

    q.question_type = qt
    q.exam_id = payload["exam_id"]
    q.subject_id = payload["subject_id"]
    q.chapter_id = payload.get("chapter_id")
    q.difficulty = int(payload.get("difficulty", 3))
    q.tags = payload.get("tags")
    q.latest_version_no = new_version_no
    q.last_editor_admin_id = actor_id
    q.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(qv)
    return qv


def submit_for_review(db: Session, *, question_id: int, version_id: int | None, actor_id: int) -> QuestionReviewRecord:
    q = db.get(Question, question_id)
    if q is None:
        raise NotFound("题目不存在")
    if version_id is None:
        # Caller didn't pin a version — resolve to the latest one. For DRAFT
        # masters, current_version_id is NULL but latest_version_no always
        # points at the row that should be reviewed.
        qv = db.execute(
            select(QuestionVersion).where(
                QuestionVersion.question_id == question_id,
                QuestionVersion.version_no == q.latest_version_no,
            )
        ).scalar_one_or_none()
    else:
        qv = db.get(QuestionVersion, version_id)
    if qv is None or qv.question_id != question_id:
        raise NotFound("题目版本不存在")
    if qv.status != "DRAFT":
        raise Conflict(f"当前状态 {qv.status} 不能提交审核")
    qv.status = "REVIEW_PENDING"
    rec = QuestionReviewRecord(
        question_version_id=qv.id,
        submitted_by=actor_id,
        decision="PENDING",
        submitted_at=datetime.utcnow(),
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


def approve_review(db: Session, *, review_id: int, actor_id: int) -> QuestionVersion:
    rec = db.get(QuestionReviewRecord, review_id)
    if rec is None:
        raise NotFound("审核记录不存在")
    if rec.decision != "PENDING":
        raise Conflict("该审核已处理")
    qv = db.get(QuestionVersion, rec.question_version_id)
    if qv is None or qv.status != "REVIEW_PENDING":
        raise Conflict("题目版本不在待审核状态")
    q = db.get(Question, qv.question_id)
    # 文档 §6.13: 审核员不能批自己最后编辑的题（除非超管 + 配置例外）
    from app.config import settings
    from app.models import AdminUser
    actor = db.get(AdminUser, actor_id)
    if (
        q.last_editor_admin_id == actor_id
        and not (actor and actor.is_super_admin and settings.review_self_approve_allowed)
    ):
        from app.core.exceptions import PermissionDenied
        raise PermissionDenied("不能审核自己最后编辑的题目")
    qv.status = "PUBLISHED"
    qv.published_by = actor_id
    qv.published_at = datetime.utcnow()
    rec.decision = "APPROVED"
    rec.reviewer_id = actor_id
    rec.reviewed_at = datetime.utcnow()
    q.current_version_id = qv.id
    db.commit()
    db.refresh(qv)
    return qv


def reject_review(db: Session, *, review_id: int, actor_id: int, reason: str) -> QuestionVersion:
    if not reason or not reason.strip():
        raise ValidationFailed("驳回必须填写原因")
    rec = db.get(QuestionReviewRecord, review_id)
    if rec is None:
        raise NotFound("审核记录不存在")
    if rec.decision != "PENDING":
        raise Conflict("该审核已处理")
    qv = db.get(QuestionVersion, rec.question_version_id)
    qv.status = "REJECTED"
    rec.decision = "REJECTED"
    rec.reviewer_id = actor_id
    rec.reviewed_at = datetime.utcnow()
    rec.reject_reason = reason
    db.commit()
    db.refresh(qv)
    return qv


def offline_question(db: Session, *, question_id: int, actor_id: int) -> Question:
    q = db.get(Question, question_id)
    if q is None:
        raise NotFound("题目不存在")
    cur = db.get(QuestionVersion, q.current_version_id) if q.current_version_id else None
    if cur:
        cur.status = "OFFLINE"
    q.current_version_id = None
    db.commit()
    db.refresh(q)
    return q
