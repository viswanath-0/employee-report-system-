"""
database.py

SQLAlchemy engine + session setup.

Defaults to MySQL (as per the project spec) but honours a DATABASE_URL
override so the same code runs on Railway/Render, or against SQLite for
quick local testing (set DATABASE_URL=sqlite:///./employee_report.db).
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from config import settings

DB_URL = settings.sqlalchemy_database_url

# SQLite needs a special connect arg when used with FastAPI's threads.
connect_args = {"check_same_thread": False} if DB_URL.startswith("sqlite") else {}

engine = create_engine(
    DB_URL,
    connect_args=connect_args,
    pool_pre_ping=True,   # transparently recover dropped MySQL connections
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a scoped DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
