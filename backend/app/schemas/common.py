"""Common Pydantic schemas."""
from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class Page(BaseModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=200)


class PageResp(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


class OkResp(BaseModel):
    code: str = "OK"
    message: str = "success"
    data: dict | None = None
    request_id: str | None = None
