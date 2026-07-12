"""Storage helper — local FS now, S3 swap point for the future."""
from __future__ import annotations

import os
import uuid
from pathlib import Path

from app.config import settings


def ensure_upload_dirs() -> None:
    (settings.upload_dir / "images").mkdir(parents=True, exist_ok=True)
    (settings.upload_dir / "audios").mkdir(parents=True, exist_ok=True)


def save_upload(*, kind: str, filename: str, data: bytes) -> str:
    """kind in {'images', 'audios'}; returns public URL path."""
    ensure_upload_dirs()
    ext = Path(filename).suffix.lower() or ".bin"
    safe_name = f"{uuid.uuid4().hex}{ext}"
    target = settings.upload_dir / kind / safe_name
    target.write_bytes(data)
    return f"{settings.static_url_prefix}/{kind}/{safe_name}"


def local_path_of(url_path: str) -> Path | None:
    if not url_path.startswith(settings.static_url_prefix):
        return None
    rel = url_path[len(settings.static_url_prefix):].lstrip("/")
    return settings.upload_dir / rel


def remove_file(url_path: str) -> None:
    p = local_path_of(url_path)
    if p and p.exists() and p.is_file():
        try:
            os.unlink(p)
        except OSError:
            pass