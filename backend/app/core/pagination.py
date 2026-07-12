"""Pagination helpers."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Generic, TypeVar

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session


T = TypeVar("T")


@dataclass
class Page:
    page: int = 1
    page_size: int = 20

    @property
    def offset(self) -> int:
        return max(0, (self.page - 1) * self.page_size)

    @property
    def limit(self) -> int:
        return max(1, min(self.page_size, 200))


def paginate(db: Session, stmt: Select, page: Page) -> tuple[list, int]:
    """Execute stmt with pagination; return (items, total)."""
    count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
    total = db.execute(count_stmt).scalar() or 0
    items = list(db.execute(stmt.offset(page.offset).limit(page.limit)).scalars())
    return items, total