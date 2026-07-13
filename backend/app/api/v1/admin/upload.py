"""Admin file uploads — images and audio for question assets."""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.storage import save_upload
from app.database import get_db
from app.deps import resolve_admin
from app.models import AdminUser
from app.services.rbac import has_permission

router = APIRouter()

# Accept only what's safe to embed in question stems.
_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}
_AUDIO_EXTS = {".mp3", ".m4a", ".wav", ".ogg", ".aac", ".flac"}
_MAX_IMAGE_BYTES = 8 * 1024 * 1024   # 8 MB
_MAX_AUDIO_BYTES = 30 * 1024 * 1024  # 30 MB


def _ext_of(filename: str | None) -> str:
    if not filename or "." not in filename:
        return ""
    return "." + filename.rsplit(".", 1)[-1].lower()


async def _save(
    *,
    file: UploadFile,
    kind: str,
    allowed_exts: set[str],
    max_bytes: int,
    asset_type: str,
):
    ext = _ext_of(file.filename)
    if ext not in allowed_exts:
        raise HTTPException(400, f"不支持的文件格式（仅接受 {sorted(allowed_exts)}）")
    data = await file.read()
    if not data:
        raise HTTPException(400, "文件为空")
    if len(data) > max_bytes:
        raise HTTPException(400, f"文件超过 {max_bytes // (1024 * 1024)} MB")
    url = save_upload(kind=kind, filename=file.filename or f"upload{ext}", data=data)
    return {
        "url": url,
        "asset_type": asset_type,
        "file_name": file.filename,
        "file_size": len(data),
    }


@router.post("/images")
async def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(resolve_admin),
):
    """Upload an image, returns the public URL to drop into Excel / stem."""
    if not has_permission(db, admin.id, "question.edit"):
        raise HTTPException(403, "缺少权限 question.edit")
    return await _save(
        file=file, kind="images",
        allowed_exts=_IMAGE_EXTS, max_bytes=_MAX_IMAGE_BYTES, asset_type="IMAGE",
    )


@router.post("/audios")
async def upload_audio(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(resolve_admin),
):
    """Upload an audio file, returns the public URL."""
    if not has_permission(db, admin.id, "question.edit"):
        raise HTTPException(403, "缺少权限 question.edit")
    return await _save(
        file=file, kind="audios",
        allowed_exts=_AUDIO_EXTS, max_bytes=_MAX_AUDIO_BYTES, asset_type="AUDIO",
    )