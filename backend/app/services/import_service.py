"""Import orchestration: parse → validate → confirm."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFound, ValidationFailed
from app.models import (
    Chapter,
    Exam,
    ImportJob,
    ImportJobRow,
    KnowledgePoint,
    Question,
    QuestionKnowledgePoint,
    QuestionOption,
    QuestionVersion,
    Subject,
)
from app.services.excel_parser import parse_rows


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def create_import_job(db: Session, *, uploaded_by: int, filename: str, file_bytes: bytes) -> ImportJob:
    file_sha = sha256_bytes(file_bytes)
    job = ImportJob(
        uploaded_by=uploaded_by,
        filename=filename,
        file_sha256=file_sha,
        status="PARSING",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Parse and persist per-row results
    rows = parse_rows(file_bytes)
    total = len(rows)
    ok = sum(1 for r in rows if r.status == "OK")
    warn = 0
    error = sum(1 for r in rows if r.status == "ERROR")

    for r in rows:
        db.add(
            ImportJobRow(
                job_id=job.id,
                row_no=r.row_no,
                status=r.status,
                payload_json=json.dumps(r.payload, default=str) if r.payload else None,
                errors_json=json.dumps(r.errors, default=str) if r.errors else None,
            )
        )

    job.total_rows = total
    job.ok_rows = ok
    job.warn_rows = warn
    job.error_rows = error
    job.status = "READY"
    db.commit()
    db.refresh(job)
    return job


def _resolve_codes(db: Session, payload: dict) -> tuple[int, int, int | None, list[int]]:
    exam = db.execute(select(Exam).where(Exam.code == payload["exam_code"])).scalar_one_or_none()
    if exam is None:
        raise ValidationFailed(f"考试编码不存在：{payload['exam_code']}")
    subject = db.execute(
        select(Subject).where(Subject.exam_id == exam.id, Subject.code == payload["subject_code"])
    ).scalar_one_or_none()
    if subject is None:
        raise ValidationFailed(f"科目编码不存在：{payload['subject_code']}")
    chapter_id = None
    if payload.get("chapter_code"):
        ch = db.execute(
            select(Chapter).where(Chapter.subject_id == subject.id, Chapter.code == payload["chapter_code"])
        ).scalar_one_or_none()
        if ch is None:
            raise ValidationFailed(f"章节编码不存在：{payload['chapter_code']}")
        chapter_id = ch.id
    kp_ids: list[int] = []
    if payload.get("chapter_id") or chapter_id:
        for kc in payload.get("knowledge_codes") or []:
            kp = db.execute(
                select(KnowledgePoint).where(
                    KnowledgePoint.chapter_id == chapter_id if chapter_id else KnowledgePoint.id == -1,
                    KnowledgePoint.code == kc,
                )
            ).scalar_one_or_none()
            if kp is not None:
                kp_ids.append(kp.id)
    return exam.id, subject.id, chapter_id, kp_ids


def confirm_import(db: Session, *, job_id: int) -> ImportJob:
    """Generate DRAFT questions from OK rows. Idempotent on job id."""
    job = db.get(ImportJob, job_id)
    if job is None:
        raise NotFound("导入任务不存在")
    if job.status == "CONFIRMED":
        return job
    if job.status != "READY":
        raise ValidationFailed(f"任务状态 {job.status} 不允许确认")

    rows = list(db.execute(select(ImportJobRow).where(ImportJobRow.job_id == job_id)).scalars())
    created = 0
    for r in rows:
        if r.status != "OK" or not r.payload_json:
            continue
        payload = json.loads(r.payload_json)
        try:
            exam_id, subject_id, chapter_id, kp_ids = _resolve_codes(db, payload)
        except ValidationFailed as exc:
            r.status = "ERROR"
            r.errors_json = json.dumps([str(exc)])
            continue

        q = Question(
            question_type=payload["question_type"],
            exam_id=exam_id,
            subject_id=subject_id,
            chapter_id=chapter_id,
            difficulty=int(payload.get("difficulty") or 3),
            tags=",".join(payload.get("tags") or []),
            latest_version_no=1,
            created_by=job.uploaded_by,
            last_editor_admin_id=job.uploaded_by,
        )
        db.add(q)
        db.flush()
        qv = QuestionVersion(
            question_id=q.id,
            version_no=1,
            status="DRAFT",
            stem=payload["stem"],
            analysis=payload["analysis"],
            correct_options=json.dumps(payload["correct_options"]),
            score=float(payload["score"]),
            scoring_rule="EXACT_MATCH",
            source_name=payload["source_name"],
            source_year=int(payload["source_year"]) if payload.get("source_year") else None,
            source_question_no=payload.get("source_question_no"),
            license_type=payload["license_type"],
            external_ref=payload.get("external_ref"),
            created_by=job.uploaded_by,
        )
        db.add(qv)
        db.flush()
        for idx, o in enumerate(payload["options"]):
            db.add(
                QuestionOption(
                    question_version_id=qv.id,
                    option_code=o["option_code"],
                    content=o["content"],
                    sort_order=idx,
                )
            )
        for kp_id in kp_ids:
            db.add(QuestionKnowledgePoint(question_version_id=qv.id, knowledge_point_id=kp_id))
        r.created_question_version_id = qv.id
        created += 1

    job.confirmed_question_count = created
    job.status = "CONFIRMED"
    db.commit()
    db.refresh(job)
    return job
