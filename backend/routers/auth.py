"""
routers/auth.py

  POST /auth/register   — register an employee or manager
  POST /auth/login      — authenticate, returns a JWT + user
  GET  /auth/me         — current user from the token
  GET  /auth/managers   — public list of managers (employee registration dropdown)
"""

import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import crud
import models
import schemas
from utils.jwt import verify_password, create_access_token, get_current_user, hash_password

router = APIRouter(prefix="/auth", tags=["Auth"])


PASSWORD_RULES = [
    (r".{8,}", "at least 8 characters"),
    (r"[A-Z]", "an uppercase letter"),
    (r"[a-z]", "a lowercase letter"),
    (r"[0-9]", "a number"),
    (r"[^A-Za-z0-9]", "a special character"),
]


def validate_password(password: str):
    missing = [msg for pattern, msg in PASSWORD_RULES if not re.search(pattern, password)]
    if missing:
        raise HTTPException(400, "Password must contain " + ", ".join(missing))


@router.post("/register", response_model=schemas.TokenResponse, status_code=201)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()

    if crud.get_user_by_email(db, email):
        raise HTTPException(400, "An account with this email already exists")

    validate_password(payload.password)

    manager_id = None
    if payload.role == "manager":
        # Manager registration requires the secret code set by the admin.
        s = crud.get_settings(db)
        if not payload.manager_code or payload.manager_code.strip() != s.manager_code:
            raise HTTPException(400, "Invalid manager authorization code")
    else:
        # Employee: optionally attach to a chosen manager.
        if payload.manager_id:
            mgr = crud.get_user(db, payload.manager_id)
            if not mgr or mgr.role != "manager":
                raise HTTPException(400, "Selected manager is not valid")
            manager_id = mgr.id

    user = crud.create_user(
        db,
        name=payload.name.strip(),
        email=email,
        password=payload.password,
        department=payload.department,
        role=payload.role,
        manager_id=manager_id,
    )

    crud.create_notification(
        db,
        user_id=user.id,
        title="Welcome to Employee Report System 🎉",
        message="Your account has been created successfully.",
        type="success",
    )

    token = create_access_token(user)
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, payload.email.lower().strip())
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Incorrect email or password")
    if not user.is_active:
        raise HTTPException(403, "This account has been deactivated")

    token = create_access_token(user)
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=schemas.UserOut)
def update_me(
    payload: schemas.ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if payload.name:
        current_user.name = payload.name.strip()
    if payload.department is not None:
        current_user.department = payload.department
    if payload.password:
        validate_password(payload.password)
        current_user.password_hash = hash_password(payload.password)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/managers", response_model=list[schemas.ManagerOption])
def list_managers(db: Session = Depends(get_db)):
    """Public — populates the manager dropdown on the employee registration page."""
    return crud.get_managers(db)
