"""SQLAlchemy engine + session factory + Base."""
from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    future=True,
)

SessionLocal = sessionmaker(autoflush=False, autocommit=False, bind=engine, future=True)


class Base(DeclarativeBase):
    """All ORM models inherit from this."""


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()