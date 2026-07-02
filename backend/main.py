"""
main.py — Employee Report System API (FastAPI + SQLAlchemy)

Run (dev):
    uvicorn main:app --reload
Docs:
    http://127.0.0.1:8000/docs
"""

import sys
from contextlib import asynccontextmanager

# Ensure UTF-8 console output on Windows (default cp1252 can't encode emoji/arrows)
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from config import settings
from database import engine, Base, get_db, SessionLocal
import crud
import schemas
import models  # noqa: F401  (ensures models are registered on Base before create_all)
from routers import auth, employee, manager, admin, files, notifications


def bootstrap() -> None:
    """Create tables and seed the singleton settings row + bootstrap admin."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        crud.get_settings(db)  # ensures settings row (id=1) exists
        if not crud.get_user_by_email(db, settings.ADMIN_EMAIL.lower().strip()):
            crud.create_user(
                db,
                name=settings.ADMIN_NAME,
                email=settings.ADMIN_EMAIL,
                password=settings.ADMIN_PASSWORD,
                department="Administration",
                role="admin",
            )
            print(f"[bootstrap] Admin account created -> {settings.ADMIN_EMAIL}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    bootstrap()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="FastAPI backend for the Employee Report System.",
    version="1.0.0",
    lifespan=lifespan,
)

# -------------------- CORS -------------------- #
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------- Routers -------------------- #
app.include_router(auth.router)
app.include_router(employee.router)
app.include_router(manager.router)
app.include_router(admin.router)
app.include_router(files.router)
app.include_router(notifications.router)


# -------------------- Public routes -------------------- #
@app.get("/", tags=["Root"])
def root():
    return {"message": f"{settings.APP_NAME} API is running", "docs": "/docs"}


@app.get("/config", response_model=schemas.PublicConfig, tags=["Root"])
def public_config(db: Session = Depends(get_db)):
    """Unauthenticated config used by the login/register screens."""
    s = crud.get_settings(db)
    return schemas.PublicConfig(
        company_name=s.company_name,
        work_day_start=s.work_day_start,
        work_day_end=s.work_day_end,
        deadline_time=s.deadline_time,
    )
