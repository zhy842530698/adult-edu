"""Admin import job endpoints."""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.core.exceptions import NotFound, PermissionDenied
from app.core.storage import ensure_upload_dirs
from app.database import get_db
from app.deps import resolve_admin
from app.models import AdminUser, ImportJob, ImportJobRow
from app.services.audit import write_audit
from app.services.import_service import confirm_import, create_import_job
from app.services.rbac import has_permission

router = APIRouter()


@router.post("")
async def create_job(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(resolve_admin),
):
    if not has_permission(db, admin.id, "question.import"):
        raise PermissionDenied()
    data = await file.read()
    job = create_import_job(
        db, uploaded_by=admin.id, filename=file.filename or "upload.xlsx", file_bytes=data,
    )
    write_audit(db, admin_user_id=admin.id, action="import.create", target_type="ImportJob", target_id=str(job.id), after={"total": job.total_rows, "ok": job.ok_rows, "error": job.error_rows})
    return {
        "id": job.id, "status": job.status,
        "total_rows": job.total_rows, "ok_rows": job.ok_rows, "warn_rows": job.warn_rows,
        "error_rows": job.error_rows,
    }


@router.get("/{jid}")
def get_job(jid: int, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    if not has_permission(db, admin.id, "question.query"):
        raise PermissionDenied()
    job = db.get(ImportJob, jid)
    if job is None:
        raise NotFound("导入任务不存在")
    rows = list(db.query(ImportJobRow).filter(ImportJobRow.job_id == jid).order_by(ImportJobRow.row_no).all())
    return {
        "id": job.id, "filename": job.filename, "status": job.status,
        "total_rows": job.total_rows, "ok_rows": job.ok_rows, "warn_rows": job.warn_rows,
        "error_rows": job.error_rows, "confirmed_question_count": job.confirmed_question_count,
        "rows": [
            {
                "row_no": r.row_no,
                "status": r.status,
                "errors": json.loads(r.errors_json) if r.errors_json else [],
            }
            for r in rows
        ],
    }


@router.post("/{jid}/confirm")
def confirm(jid: int, db: Session = Depends(get_db), admin: AdminUser = Depends(resolve_admin)):
    if not has_permission(db, admin.id, "question.import"):
        raise PermissionDenied()
    job = confirm_import(db, job_id=jid)
    write_audit(db, admin_user_id=admin.id, action="import.confirm", target_type="ImportJob", target_id=str(jid), after={"confirmed": job.confirmed_question_count})
    return {"id": job.id, "status": job.status, "confirmed_question_count": job.confirmed_question_count}


@router.get("/template/download")
def download_template(admin: AdminUser = Depends(resolve_admin)):
    """Returns a tiny CSV-ish Excel template via /admin/import-jobs/template."""
    from fastapi.responses import FileResponse
    path = Path(__file__).resolve().parents[3] / "scripts" / "excel_import_template.xlsx"
    if not path.exists():
        from app.scripts_runtime import ensure_template
        path = ensure_template()
    return FileResponse(str(path), filename="excel_import_template.xlsx", media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
