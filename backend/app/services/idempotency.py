"""Idempotency-Key store — replays same response when key+hash match."""
from __future__ import annotations

import hashlib
import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import IdempotencyConflict
from app.models import IdempotencyKey


def hash_request(payload: Any) -> str:
    return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()


def lookup(
    db: Session,
    *,
    key: str,
    endpoint: str,
    subject_type: str,
    subject_id: int,
    request_hash: str,
) -> tuple[int, dict] | None:
    """Return (status_code, body_json) for replay, or None if new key."""
    row = db.execute(
        select(IdempotencyKey).where(IdempotencyKey.key == key)
    ).scalar_one_or_none()
    if row is None:
        return None
    if row.endpoint != endpoint or row.subject_type != subject_type or row.subject_id != subject_id:
        raise IdempotencyConflict("幂等键与当前请求不匹配")
    if row.request_hash != request_hash:
        raise IdempotencyConflict("同一幂等键对应不同请求")
    return row.status_code, json.loads(row.response_json)


def record(
    db: Session,
    *,
    key: str,
    endpoint: str,
    subject_type: str,
    subject_id: int,
    request_hash: str,
    status_code: int,
    response_body: Any,
) -> None:
    row = IdempotencyKey(
        key=key,
        endpoint=endpoint,
        subject_type=subject_type,
        subject_id=subject_id,
        request_hash=request_hash,
        response_json=json.dumps(response_body, default=str),
        status_code=status_code,
    )
    db.add(row)
