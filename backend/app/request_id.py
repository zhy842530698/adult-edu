"""request_id propagation via contextvar."""
from __future__ import annotations

import uuid
from contextvars import ContextVar


_request_id_var: ContextVar[str] = ContextVar("request_id", default="")


def new_request_id() -> str:
    rid = uuid.uuid4().hex[:16]
    _request_id_var.set(rid)
    return rid


def get_request_id() -> str:
    return _request_id_var.get()


def set_request_id(rid: str) -> None:
    _request_id_var.set(rid)