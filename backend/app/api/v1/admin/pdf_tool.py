"""Admin PDF -> Excel tool.

Uploads an exam-paper PDF plus a small metadata form, returns an .xlsx that
matches the standard import template so admins can preview/edit before
running the existing batch-import flow.
"""
from __future__ import annotations

import io
import sys
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.exceptions import PermissionDenied, ValidationFailed
from app.database import get_db
from app.deps import resolve_admin
from app.models import AdminUser
from app.services.audit import write_audit
from app.services.rbac import has_permission

router = APIRouter()

# Make scripts/ importable so we can call pdf_to_excel.convert_pdf_to_excel.
# scripts_runtime.py already does this for the rest of the app, but we double-
# check here so this module also works in tests that import it in isolation.
_SCRIPTS_DIR = Path(__file__).resolve().parents[4] / "scripts"
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from pdf_to_excel import convert_pdf_to_excel  # type: ignore[import-not-found]  # noqa: E402


MAX_PDF_BYTES = 20 * 1024 * 1024  # 20 MB — guardrail, not a hard quota


def _parse_int(value: str | None) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except ValueError:
        raise ValidationFailed(f"年份字段必须是整数：{value!r}")


def _parse_float(value: str | None, default: float) -> float:
    if value is None or value == "":
        return default
    try:
        v = float(value)
        if v <= 0:
            raise ValueError
        return v
    except ValueError:
        raise ValidationFailed(f"分值字段必须是正数：{value!r}")


@router.post("/convert")
async def convert_pdf(
    file: UploadFile = File(..., description="考试 PDF"),
    exam_code: str = Form(..., description="考试编码，如 EN / CET4"),
    subject_code: str = Form(..., description="科目编码，如 LISTENING"),
    source_year: str = Form("", description="试卷年份，可空"),
    is_real_exam: str = Form("true", description="是否真题：true/false"),
    remark: str = Form("", description="备注/标签，会拼到 source_name"),
    source_name: str = Form("", description="来源名（留空则按 exam_code+年份自动生成）"),
    license_type: str = Form("platform-original"),
    chapter_code: str = Form(""),
    knowledge_codes: str = Form(""),
    difficulty: str = Form("3"),
    score: str = Form("2.0"),
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(resolve_admin),
):
    if not has_permission(db, admin.id, "question.import"):
        raise PermissionDenied()

    # ---- validate file ----
    if not (file.filename or "").lower().endswith(".pdf"):
        raise ValidationFailed("仅支持 PDF 文件")
    data = await file.read()
    if not data:
        raise ValidationFailed("PDF 文件为空")
    if len(data) > MAX_PDF_BYTES:
        raise ValidationFailed(f"PDF 文件超过 {MAX_PDF_BYTES // (1024 * 1024)} MB 上限")

    year_int = _parse_int(source_year) if source_year else None
    if source_year and year_int is None:
        raise ValidationFailed("年份格式不正确")

    is_real = str(is_real_exam).lower() in {"1", "true", "yes", "on"}
    diff_int = _parse_int(difficulty) or 3
    if not 1 <= diff_int <= 5:
        raise ValidationFailed("难度 difficulty 必须在 1-5 之间")
    score_val = _parse_float(score, default=2.0)

    # ---- convert ----
    xlsx, summary = convert_pdf_to_excel(
        data,
        exam_code=exam_code.strip(),
        subject_code=subject_code.strip(),
        source_year=year_int,
        is_real_exam=is_real,
        remark=remark.strip(),
        source_name=source_name.strip(),
        license_type=license_type.strip() or "platform-original",
        chapter_code=chapter_code.strip(),
        knowledge_codes=knowledge_codes.strip(),
        difficulty=diff_int,
        score=score_val,
    )

    if not summary.questions:
        raise ValidationFailed(
            "PDF 中未识别到任何题目；请确认 PDF 是文字型（非扫描件），且题号格式如 '1.' / '1、' / '第1题'"
        )

    write_audit(
        db,
        admin_user_id=admin.id,
        action="pdf.convert",
        target_type="PdfTool",
        target_id=(file.filename or "")[:64],
        after={
            "exam_code": exam_code,
            "subject_code": subject_code,
            "source_year": year_int,
            "is_real_exam": is_real,
            "questions": len(summary.questions),
            "missing_answer": summary.missing_answer,
        },
    )

    # filename: 尽量贴考试编码 + 科目 + 年份（HTTP header 仅支持 ASCII）
    stem = f"{exam_code.strip()}-{subject_code.strip()}"
    if year_int:
        stem += f"-{year_int}"
    if is_real:
        stem += "-real"
    else:
        stem += "-mock"
    stem += "-from-pdf.xlsx"
    stem = stem.encode("ascii", "replace").decode("ascii")

    headers = {
        "Content-Disposition": f'attachment; filename="{stem}"',
        "X-Questions-Detected": str(len(summary.questions)),
        "X-Questions-OK": str(summary.ok_count),
        "X-Questions-Missing-Answer": str(summary.missing_answer),
        "X-PDF-Pages": str(summary.pages),
    }
    if summary.warnings:
        # HTTP headers are latin-1, so the warning must be ASCII-safe.
        # Keep only the first warning; strip non-ASCII to avoid encoder crashes.
        safe = summary.warnings[0].encode("ascii", "replace").decode("ascii")[:200]
        headers["X-PDF-Warning"] = safe

    return StreamingResponse(
        io.BytesIO(xlsx),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )