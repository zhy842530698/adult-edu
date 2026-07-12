"""Seed roles + permissions + super admin + sample exam catalog."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.core.security import hash_password
from app.models import (
    AdminUser,
    AdminUserRole,
    Chapter,
    Exam,
    ExamCategory,
    KnowledgePoint,
    Permission,
    Role,
    RolePermission,
    Subject,
)


ROLES = [
    ("super_admin", "超级管理员", "全部权限"),
    ("entry_clerk", "题目录入员", "录入、修改草稿、提交审核，不可发布"),
    ("reviewer", "题目审核员", "审核、批、驳、发布、下架"),
    ("content_ops", "内容运营", "首页、公告、试卷、每日一练"),
    ("support", "客服/纠错", "反馈工单处理"),
    ("viewer", "数据查看员", "只读报表"),
]


# (code, name, module)
PERMISSIONS = [
    ("menu.view", "查看菜单", "common"),
    ("catalog.query", "目录查询", "catalog"),
    ("catalog.create", "目录新增", "catalog"),
    ("catalog.edit", "目录编辑", "catalog"),
    ("catalog.delete", "目录删除", "catalog"),
    ("question.query", "题目查询", "question"),
    ("question.create", "题目新增", "question"),
    ("question.edit", "题目编辑", "question"),
    ("question.delete", "题目删除", "question"),
    ("question.import", "题目批量导入", "question"),
    ("question.submit_review", "题目提交审核", "question"),
    ("question.review_approve", "题目审核通过", "question"),
    ("question.review_reject", "题目审核驳回", "question"),
    ("question.publish", "题目发布", "question"),
    ("question.offline", "题目下架", "question"),
    ("paper.query", "试卷查询", "paper"),
    ("paper.create", "试卷新增", "paper"),
    ("paper.edit", "试卷编辑", "paper"),
    ("paper.publish", "试卷发布", "paper"),
    ("ops.query", "运营配置查询", "ops"),
    ("ops.edit", "运营配置编辑", "ops"),
    ("ops.delete", "运营配置删除", "ops"),
    ("user.query", "用户查询", "user"),
    ("user.ban", "用户封禁", "user"),
    ("feedback.query", "反馈查询", "feedback"),
    ("feedback.process", "反馈处理", "feedback"),
    ("admin.query", "管理员查询", "admin"),
    ("admin.create", "管理员新增", "admin"),
    ("admin.edit", "管理员编辑", "admin"),
    ("admin.delete", "管理员删除", "admin"),
    ("audit.query", "审计查询", "audit"),
    ("system.setting", "系统设置", "system"),
]


# role_code → permission_codes
ROLE_PERMS = {
    "super_admin": [c for c, _, _ in PERMISSIONS],
    "entry_clerk": [
        "menu.view", "catalog.query", "question.query", "question.create",
        "question.edit", "question.submit_review",
    ],
    "reviewer": [
        "menu.view", "catalog.query", "question.query",
        "question.review_approve", "question.review_reject",
        "question.publish", "question.offline", "question.edit",
    ],
    "content_ops": [
        "menu.view", "catalog.query", "catalog.create", "catalog.edit",
        "question.query", "paper.query", "paper.create", "paper.edit",
        "paper.publish", "ops.query", "ops.edit",
    ],
    "support": [
        "menu.view", "user.query", "feedback.query", "feedback.process",
        "question.query",
    ],
    "viewer": [
        "menu.view", "catalog.query", "question.query", "paper.query",
        "ops.query", "user.query", "feedback.query", "audit.query",
    ],
}


def seed(db: Session) -> None:
    now = datetime.utcnow()

    # Permissions
    for code, name, module in PERMISSIONS:
        p = db.execute(select(Permission).where(Permission.code == code)).scalar_one_or_none()
        if p is None:
            p = Permission(code=code, name=name, module=module, created_at=now)
            db.add(p)
    db.commit()

    # Roles
    for code, name, desc in ROLES:
        r = db.execute(select(Role).where(Role.code == code)).scalar_one_or_none()
        if r is None:
            r = Role(code=code, name=name, description=desc, created_at=now)
            db.add(r)
    db.commit()

    # Role permissions
    for role_code, perm_codes in ROLE_PERMS.items():
        role = db.execute(select(Role).where(Role.code == role_code)).scalar_one()
        db.query(RolePermission).filter(RolePermission.role_id == role.id).delete()
        for pc in perm_codes:
            perm = db.execute(select(Permission).where(Permission.code == pc)).scalar_one()
            db.add(RolePermission(role_id=role.id, permission_id=perm.id))
    db.commit()

    # Super admin user
    admin = db.execute(select(AdminUser).where(AdminUser.username == "admin")).scalar_one_or_none()
    if admin is None:
        admin = AdminUser(
            username="admin",
            password_hash=hash_password(settings.admin_default_password),
            display_name="超级管理员",
            is_active=True,
            is_super_admin=True,
            created_at=now,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
    super_role = db.execute(select(Role).where(Role.code == "super_admin")).scalar_one()
    if not db.execute(
        select(AdminUserRole).where(
            AdminUserRole.admin_user_id == admin.id, AdminUserRole.role_id == super_role.id
        )
    ).scalar_one_or_none():
        db.add(AdminUserRole(admin_user_id=admin.id, role_id=super_role.id))
        db.commit()

    # Sample exam catalog: 英语 → CET-4 → 听力 → 长对话 → 主旨判断
    cat = db.execute(select(ExamCategory).where(ExamCategory.code == "EN")).scalar_one_or_none()
    if cat is None:
        cat = ExamCategory(
            code="EN", name="英语", sort_order=1, is_active=True,
            description="大学英语类考试", created_at=now,
        )
        db.add(cat); db.commit(); db.refresh(cat)

    exam = db.execute(select(Exam).where(Exam.code == "CET4")).scalar_one_or_none()
    if exam is None:
        exam = Exam(
            category_id=cat.id, code="CET4", name="大学英语四级",
            sort_order=1, is_active=True, description="CET-4", created_at=now,
        )
        db.add(exam); db.commit(); db.refresh(exam)

    subj = db.execute(select(Subject).where(Subject.exam_id == exam.id, Subject.code == "LISTENING")).scalar_one_or_none()
    if subj is None:
        subj = Subject(exam_id=exam.id, code="LISTENING", name="听力", sort_order=1, is_active=True, created_at=now)
        db.add(subj); db.commit(); db.refresh(subj)

    chap = db.execute(select(Chapter).where(Chapter.subject_id == subj.id, Chapter.code == "LONG_DIALOGUE")).scalar_one_or_none()
    if chap is None:
        chap = Chapter(subject_id=subj.id, code="LONG_DIALOGUE", name="长对话", sort_order=1, is_active=True, created_at=now)
        db.add(chap); db.commit(); db.refresh(chap)

    for code, name in [("MAIN_IDEA", "主旨判断"), ("DETAIL", "细节理解")]:
        kp = db.execute(select(KnowledgePoint).where(KnowledgePoint.chapter_id == chap.id, KnowledgePoint.code == code)).scalar_one_or_none()
        if kp is None:
            kp = KnowledgePoint(chapter_id=chap.id, code=code, name=name, sort_order=1, is_active=True, created_at=now)
            db.add(kp)
    db.commit()

    # Additional sample category for variety
    cat2 = db.execute(select(ExamCategory).where(ExamCategory.code == "GOV")).scalar_one_or_none()
    if cat2 is None:
        cat2 = ExamCategory(code="GOV", name="公务员考试", sort_order=2, is_active=True, description="国考/省考", created_at=now)
        db.add(cat2); db.commit(); db.refresh(cat2)
        exam2 = Exam(category_id=cat2.id, code="GONGSHI", name="国家公务员考试", sort_order=1, is_active=True, created_at=now)
        db.add(exam2); db.commit(); db.refresh(exam2)
        subj2 = Subject(exam_id=exam2.id, code="XINGCE", name="行政职业能力测验", sort_order=1, is_active=True, created_at=now)
        db.add(subj2); db.commit(); db.refresh(subj2)

    print(f"[seed] 完成。超级管理员：admin / {settings.admin_default_password}")


if __name__ == "__main__":
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
