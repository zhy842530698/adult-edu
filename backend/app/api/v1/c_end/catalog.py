"""C-end catalog: exam tree + per-exam progress."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import resolve_user
from app.models import Chapter, Exam, ExamCategory, KnowledgePoint, Subject, User

router = APIRouter()


@router.get("/exam-catalog")
def catalog(db: Session = Depends(get_db), user: User | None = Depends(lambda: None)):
    """Public catalog for browse + login. Returns active nodes only."""
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
            subjects = list(db.execute(
                select(Subject).where(Subject.exam_id == e.id, Subject.is_active.is_(True)).order_by(Subject.sort_order)
            ).scalars())
            sub_nodes = []
            for s in subjects:
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
                    ch_nodes.append({
                        "id": ch.id, "code": ch.code, "name": ch.name,
                        "knowledge_points": [{"id": k.id, "code": k.code, "name": k.name} for k in kps],
                    })
                sub_nodes.append({"id": s.id, "code": s.code, "name": s.name, "chapters": ch_nodes})
            exam_nodes.append({"id": e.id, "code": e.code, "name": e.name, "icon_url": e.icon_url, "subjects": sub_nodes})
        result.append({"id": c.id, "code": c.code, "name": c.name, "exams": exam_nodes})
    return {"items": result}


@router.get("/exams/{exam_id}/progress")
def exam_progress(exam_id: int, db: Session = Depends(get_db), user: User = Depends(resolve_user)):
    return {"exam_id": exam_id, "answered_count": 0, "correct_count": 0, "accuracy": 0.0, "completion": 0.0}
