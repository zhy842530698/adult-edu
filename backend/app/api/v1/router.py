"""Aggregate all C-end + admin routers under /api/v1."""
from fastapi import APIRouter

api_router = APIRouter()

# Lazy import to avoid circular issues
from app.api.v1.c_end import auth as c_auth  # noqa: E402
from app.api.v1.c_end import catalog as c_catalog  # noqa: E402
from app.api.v1.c_end import practice as c_practice  # noqa: E402
from app.api.v1.c_end import wrong as c_wrong  # noqa: E402
from app.api.v1.c_end import favorite as c_favorite  # noqa: E402
from app.api.v1.c_end import progress as c_progress  # noqa: E402
from app.api.v1.c_end import feedback as c_feedback  # noqa: E402
from app.api.v1.c_end import target as c_target  # noqa: E402
from app.api.v1.c_end import onboarding as c_onboarding  # noqa: E402

from app.api.v1.admin import auth as a_auth  # noqa: E402
from app.api.v1.admin import catalog as a_catalog  # noqa: E402
from app.api.v1.admin import question as a_question  # noqa: E402
from app.api.v1.admin import review as a_review  # noqa: E402
from app.api.v1.admin import import_job as a_import
from app.api.v1.admin import pdf_tool as a_pdf_tool  # noqa: E402  # noqa: E402
from app.api.v1.admin import paper as a_paper  # noqa: E402
from app.api.v1.admin import daily as a_daily  # noqa: E402
from app.api.v1.admin import user as a_user  # noqa: E402
from app.api.v1.admin import feedback as a_feedback  # noqa: E402
from app.api.v1.admin import dashboard as a_dashboard  # noqa: E402
from app.api.v1.admin import report as a_report  # noqa: E402
from app.api.v1.admin import admin as a_admin  # noqa: E402
from app.api.v1.admin import role as a_role  # noqa: E402
from app.api.v1.admin import audit as a_audit  # noqa: E402
from app.api.v1.admin import ops as a_ops
from app.api.v1.admin import upload as a_upload  # noqa: E402  # noqa: E402

api_router.include_router(c_auth.router, prefix="/auth", tags=["C端-登录"])
api_router.include_router(c_target.router, prefix="/user", tags=["C端-用户目标"])
api_router.include_router(c_onboarding.router, prefix="/user", tags=["C端-onboarding"])
api_router.include_router(c_catalog.router, tags=["C端-目录"])
api_router.include_router(c_practice.router, prefix="/practice-sessions", tags=["C端-练习"])
api_router.include_router(c_wrong.router, prefix="/wrong-questions", tags=["C端-错题"])
api_router.include_router(c_favorite.router, tags=["C端-收藏"])
api_router.include_router(c_progress.router, prefix="/progress", tags=["C端-进度"])
api_router.include_router(c_feedback.router, prefix="/question-feedback", tags=["C端-反馈"])

api_router.include_router(a_auth.router, prefix="/admin/auth", tags=["后台-登录"])
api_router.include_router(a_catalog.router, prefix="/admin", tags=["后台-目录"])
api_router.include_router(a_question.router, prefix="/admin/questions", tags=["后台-题库"])
api_router.include_router(a_review.router, prefix="/admin/question-reviews", tags=["后台-审核"])
api_router.include_router(a_import.router, prefix="/admin/import-jobs", tags=["后台-导入"])
api_router.include_router(a_pdf_tool.router, prefix="/admin/pdf-tools", tags=["后台-PDF工具"])
api_router.include_router(a_paper.router, prefix="/admin/papers", tags=["后台-试卷"])
api_router.include_router(a_daily.router, prefix="/admin/daily-practice-configs", tags=["后台-每日一练"])
api_router.include_router(a_user.router, prefix="/admin/users", tags=["后台-用户"])
api_router.include_router(a_feedback.router, prefix="/admin/question-feedback", tags=["后台-反馈工单"])
api_router.include_router(a_dashboard.router, prefix="/admin/dashboard", tags=["后台-工作台"])
api_router.include_router(a_report.router, prefix="/admin/reports", tags=["后台-报表"])
api_router.include_router(a_admin.router, prefix="/admin/admin-users", tags=["后台-管理员"])
api_router.include_router(a_role.router, prefix="/admin/roles", tags=["后台-角色"])
api_router.include_router(a_audit.router, prefix="/admin/audit-logs", tags=["后台-审计"])
api_router.include_router(a_ops.router, prefix="/admin/ops", tags=["后台-运营配置"])
api_router.include_router(a_upload.router, prefix="/admin/uploads", tags=["后台-资源上传"])
