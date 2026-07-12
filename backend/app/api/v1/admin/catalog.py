"""Admin catalog: category/exam/subject/chapter/knowledge CRUD."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import Conflict, NotFound, PermissionDenied
from app.database import get_db
from app.deps import resolve_admin
from app.models import AdminUser, Chapter, Exam, ExamCategory, KnowledgePoint, QuestionVersion, Subject
from app.services.audit import write_audit
from app.services.rbac import has_permission

router = APIRouter()


class CategoryIn(BaseModel):
    code: str
    name: str
    sort_order: int = 0
    is_active: bool = True
    icon_url: str | None = None
    description: str | None = None


def _admin_required(admin: AdminUser, db: Session, code: str) -> None:
    if not has_permission(db, admin.id, code):
        raise PermissionDenied(f"缺少权限 {code}")


@router.get("/exam-categories")
def list_categories(db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _admin_required(admin, db, "catalog.query")
    return {"items": [
        {
            "id": c.id, "code": c.code, "name": c.name, "sort_order": c.sort_order,
            "is_active": c.is_active, "icon_url": c.icon_url, "description": c.description,
        }
        for c in db.execute(select(ExamCategory).order_by(ExamCategory.sort_order)).scalars()
    ]}


@router.post("/exam-categories")
def create_category(payload: CategoryIn, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _admin_required(admin, db, "catalog.create")
    if db.execute(select(ExamCategory).where(ExamCategory.code == payload.code)).scalar_one_or_none():
        raise Conflict(f"编码已存在 {payload.code}")
    c = ExamCategory(**payload.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    write_audit(db, admin_user_id=admin.id, action="exam_category.create", target_type="ExamCategory", target_id=str(c.id), after=c)
    return {"id": c.id}


@router.put("/exam-categories/{cid}")
def update_category(cid: int, payload: CategoryIn, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _admin_required(admin, db, "catalog.edit")
    c = db.get(ExamCategory, cid)
    if c is None:
        raise NotFound("分类不存在")
    before = {"name": c.name, "is_active": c.is_active}
    for k, v in payload.model_dump().items():
        setattr(c, k, v)
    c.updated_at = datetime.utcnow()
    db.commit()
    write_audit(db, admin_user_id=admin.id, action="exam_category.update", target_type="ExamCategory", target_id=str(c.id), before=before, after=payload.model_dump())
    return {"id": c.id}


@router.delete("/exam-categories/{cid}")
def delete_category(cid: int, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _admin_required(admin, db, "catalog.delete")
    c = db.get(ExamCategory, cid)
    if c is None:
        raise NotFound("分类不存在")
    # FR-B-CAT-003: only soft-disable if has published questions
    has_published = db.execute(
        select(QuestionVersion).join(Exam, Exam.category_id == c.id).limit(1)
    ).first()
    if has_published:
        c.is_active = False
        db.commit()
        return {"id": c.id, "soft_deleted": True, "reason": "存在已发布题目，仅停用"}
    db.delete(c)
    db.commit()
    write_audit(db, admin_user_id=admin.id, action="exam_category.delete", target_type="ExamCategory", target_id=str(cid))
    return {"id": cid, "deleted": True}


# Exams
class ExamIn(BaseModel):
    category_id: int
    code: str
    name: str
    sort_order: int = 0
    is_active: bool = True
    icon_url: str | None = None
    description: str | None = None


@router.get("/exams")
def list_exams(db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _admin_required(admin, db, "catalog.query")
    items = [
        {"id": e.id, "category_id": e.category_id, "code": e.code, "name": e.name,
         "sort_order": e.sort_order, "is_active": e.is_active}
        for e in db.execute(select(Exam).order_by(Exam.sort_order)).scalars()
    ]
    return {"items": items}


@router.post("/exams")
def create_exam(payload: ExamIn, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _admin_required(admin, db, "catalog.create")
    if db.execute(select(Exam).where(Exam.code == payload.code)).scalar_one_or_none():
        raise Conflict(f"编码已存在 {payload.code}")
    e = Exam(**payload.model_dump())
    db.add(e)
    db.commit()
    db.refresh(e)
    write_audit(db, admin_user_id=admin.id, action="exam.create", target_type="Exam", target_id=str(e.id), after=payload.model_dump())
    return {"id": e.id}


@router.put("/exams/{eid}")
def update_exam(eid: int, payload: ExamIn, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _admin_required(admin, db, "catalog.edit")
    e = db.get(Exam, eid)
    if e is None:
        raise NotFound("考试不存在")
    for k, v in payload.model_dump().items():
        setattr(e, k, v)
    e.updated_at = datetime.utcnow()
    db.commit()
    return {"id": e.id}


@router.delete("/exams/{eid}")
def delete_exam(eid: int, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _admin_required(admin, db, "catalog.delete")
    e = db.get(Exam, eid)
    if e is None:
        raise NotFound("考试不存在")
    has_published = db.execute(
        select(QuestionVersion).limit(1)
    ).first()
    if has_published:
        e.is_active = False
        db.commit()
        return {"id": e.id, "soft_deleted": True}
    db.delete(e)
    db.commit()
    return {"id": eid, "deleted": True}


# Subjects
class SubjectIn(BaseModel):
    exam_id: int
    code: str
    name: str
    sort_order: int = 0
    is_active: bool = True


@router.get("/subjects")
def list_subjects(exam_id: int | None = None, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _admin_required(admin, db, "catalog.query")
    stmt = select(Subject)
    if exam_id:
        stmt = stmt.where(Subject.exam_id == exam_id)
    return {"items": [
        {"id": s.id, "exam_id": s.exam_id, "code": s.code, "name": s.name, "is_active": s.is_active}
        for s in db.execute(stmt.order_by(Subject.sort_order)).scalars()
    ]}


@router.post("/subjects")
def create_subject(payload: SubjectIn, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _admin_required(admin, db, "catalog.create")
    s = Subject(**payload.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    write_audit(db, admin_user_id=admin.id, action="subject.create", target_type="Subject", target_id=str(s.id), after=payload.model_dump())
    return {"id": s.id}


@router.put("/subjects/{sid}")
def update_subject(sid: int, payload: SubjectIn, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _admin_required(admin, db, "catalog.edit")
    s = db.get(Subject, sid)
    if s is None:
        raise NotFound("科目不存在")
    for k, v in payload.model_dump().items():
        setattr(s, k, v)
    db.commit()
    return {"id": s.id}


@router.delete("/subjects/{sid}")
def delete_subject(sid: int, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _admin_required(admin, db, "catalog.delete")
    s = db.get(Subject, sid)
    if s is None:
        raise NotFound("科目不存在")
    db.delete(s)
    db.commit()
    return {"id": sid}


# Chapters
class ChapterIn(BaseModel):
    subject_id: int
    code: str
    name: str
    sort_order: int = 0
    is_active: bool = True


@router.get("/chapters")
def list_chapters(subject_id: int | None = None, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _admin_required(admin, db, "catalog.query")
    stmt = select(Chapter)
    if subject_id:
        stmt = stmt.where(Chapter.subject_id == subject_id)
    return {"items": [
        {"id": c.id, "subject_id": c.subject_id, "code": c.code, "name": c.name, "is_active": c.is_active}
        for c in db.execute(stmt.order_by(Chapter.sort_order)).scalars()
    ]}


@router.post("/chapters")
def create_chapter(payload: ChapterIn, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _admin_required(admin, db, "catalog.create")
    c = Chapter(**payload.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    write_audit(db, admin_user_id=admin.id, action="chapter.create", target_type="Chapter", target_id=str(c.id), after=payload.model_dump())
    return {"id": c.id}


@router.put("/chapters/{cid}")
def update_chapter(cid: int, payload: ChapterIn, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _admin_required(admin, db, "catalog.edit")
    c = db.get(Chapter, cid)
    if c is None:
        raise NotFound("章节不存在")
    for k, v in payload.model_dump().items():
        setattr(c, k, v)
    db.commit()
    return {"id": c.id}


@router.delete("/chapters/{cid}")
def delete_chapter(cid: int, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _admin_required(admin, db, "catalog.delete")
    c = db.get(Chapter, cid)
    if c is None:
        raise NotFound("章节不存在")
    db.delete(c)
    db.commit()
    return {"id": cid}


# Knowledge points
class KPIn(BaseModel):
    chapter_id: int
    code: str
    name: str
    sort_order: int = 0
    is_active: bool = True


@router.get("/knowledge-points")
def list_kp(chapter_id: int | None = None, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _admin_required(admin, db, "catalog.query")
    stmt = select(KnowledgePoint)
    if chapter_id:
        stmt = stmt.where(KnowledgePoint.chapter_id == chapter_id)
    return {"items": [
        {"id": k.id, "chapter_id": k.chapter_id, "code": k.code, "name": k.name, "is_active": k.is_active}
        for k in db.execute(stmt.order_by(KnowledgePoint.sort_order)).scalars()
    ]}


@router.post("/knowledge-points")
def create_kp(payload: KPIn, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _admin_required(admin, db, "catalog.create")
    k = KnowledgePoint(**payload.model_dump())
    db.add(k)
    db.commit()
    db.refresh(k)
    write_audit(db, admin_user_id=admin.id, action="knowledge_point.create", target_type="KnowledgePoint", target_id=str(k.id), after=payload.model_dump())
    return {"id": k.id}


@router.put("/knowledge-points/{kid}")
def update_kp(kid: int, payload: KPIn, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _admin_required(admin, db, "catalog.edit")
    k = db.get(KnowledgePoint, kid)
    if k is None:
        raise NotFound("知识点不存在")
    for kk, v in payload.model_dump().items():
        setattr(k, kk, v)
    db.commit()
    return {"id": k.id}


@router.delete("/knowledge-points/{kid}")
def delete_kp(kid: int, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    _admin_required(admin, db, "catalog.delete")
    k = db.get(KnowledgePoint, kid)
    if k is None:
        raise NotFound("知识点不存在")
    db.delete(k)
    db.commit()
    return {"id": kid}
