"""C-end catalog: exam tree + per-exam progress."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import resolve_user
from app.models import (
    Chapter, Exam, ExamCategory, KnowledgePoint, Question, QuestionKnowledgePoint,
    QuestionVersion, Subject, User,
)

router = APIRouter()


def _count_published(db: Session, subject_id: int | None, exam_id: int | None) -> int:
    """统计已发布（PUBLISHED）题目数：优先按 subject，subject 没题再退回 exam。"""
    stmt = (
        select(func.count(Question.id))
        .join(QuestionVersion, QuestionVersion.id == Question.current_version_id)
        .where(QuestionVersion.status == "PUBLISHED")
    )
    if subject_id is not None:
        stmt = stmt.where(Question.subject_id == subject_id)
    if exam_id is not None:
        stmt = stmt.where(Question.exam_id == exam_id)
    return int(db.execute(stmt).scalar() or 0)


@router.get("/exam-catalog")
def catalog(db: Session = Depends(get_db), user: User | None = Depends(lambda: None)):
    """Public catalog for browse + login. Returns active nodes only.

    每个 exam / subject / chapter / knowledge_point 节点均附带 question_count（已发布题数），
    前端可直接用此字段显示题量，不必从 chapters + KP 间接算。
    """
    cats = list(db.execute(
        select(ExamCategory).where(ExamCategory.is_active.is_(True)).order_by(ExamCategory.sort_order)
    ).scalars())
    result = []
    for c in cats:
        exams = list(db.execute(
            select(Exam).where(Exam.category_id == c.id, Exam.is_active.is_(True)).order_by(Exam.sort_order)
        ).scalars())
        exam_nodes = []
        for e in exams:
            exam_count = _count_published(db, subject_id=None, exam_id=e.id)
            subjects = list(db.execute(
                select(Subject).where(Subject.exam_id == e.id, Subject.is_active.is_(True)).order_by(Subject.sort_order)
            ).scalars())
            sub_nodes = []
            for s in subjects:
                sub_count = _count_published(db, subject_id=s.id, exam_id=None)
                chapters = list(db.execute(
                    select(Chapter).where(Chapter.subject_id == s.id, Chapter.is_active.is_(True)).order_by(Chapter.sort_order)
                ).scalars())
                ch_nodes = []
                for ch in chapters:
                    kps = list(db.execute(
                        select(KnowledgePoint).where(
                            KnowledgePoint.chapter_id == ch.id, KnowledgePoint.is_active.is_(True)
                        ).order_by(KnowledgePoint.sort_order)
                    ).scalars())
                    ch_count = int(db.execute(
                        select(func.count(Question.id))
                        .join(QuestionVersion, QuestionVersion.id == Question.current_version_id)
                        .where(
                            QuestionVersion.status == "PUBLISHED",
                            Question.chapter_id == ch.id,
                        )
                    ).scalar() or 0)
                    kp_nodes = []
                    for k in kps:
                        kp_count = int(db.execute(
                            select(func.count(func.distinct(Question.id)))
                            .join(QuestionVersion, QuestionVersion.id == Question.current_version_id)
                            .join(
                                QuestionKnowledgePoint,
                                QuestionKnowledgePoint.question_version_id
                                == QuestionVersion.id,
                            )
                            .where(
                                QuestionKnowledgePoint.knowledge_point_id == k.id,
                                QuestionVersion.status == "PUBLISHED",
                            )
                        ).scalar() or 0)
                        kp_nodes.append({
                            "id": k.id, "code": k.code, "name": k.name,
                            "question_count": kp_count,
                        })
                    ch_nodes.append({
                        "id": ch.id, "code": ch.code, "name": ch.name,
                        "question_count": ch_count,
                        "knowledge_points": kp_nodes,
                    })
                sub_nodes.append({
                    "id": s.id, "code": s.code, "name": s.name,
                    "question_count": sub_count,
                    "chapters": ch_nodes,
                })
            exam_nodes.append({
                "id": e.id, "code": e.code, "name": e.name,
                "icon_url": e.icon_url,
                "question_count": exam_count,
                "subjects": sub_nodes,
            })
        result.append({"id": c.id, "code": c.code, "name": c.name, "exams": exam_nodes})
    return {"items": result}


@router.get("/exams/{exam_id}/progress")
def exam_progress(exam_id: int, db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    return {"exam_id": exam_id, "answered_count": 0, "correct_count": 0, "accuracy": 0.0, "completion": 0.0}
