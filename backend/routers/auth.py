"""
routers/auth.py

  POST /auth/login            — authenticate by Company ID (or email) → JWT + user
  POST /auth/activate         — self-signup fallback: claim a directory row (3b)
  POST /auth/change-password  — forced/voluntary password change
  GET  /auth/me               — current user from the token
  PUT  /auth/me               — update own profile
  GET  /auth/managers         — public list of managers (admin form dropdown)

Note (Phase 2): self-registration that *created* users has been removed.
Accounts are provisioned by the admin (see routers/admin.py) or claimed via
/auth/activate; users never create brand-new directory rows themselves.
"""

import re

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy import func
from sqlalchemy.orm import Session

from config import settings
from database import get_db
import crud
import models
import schemas
from utils.jwt import verify_password, create_access_token, get_current_user, hash_password
from utils.company_id import generate_temp_password
from utils.email import email_credentials, email_access_request, email_password_reset
from utils.emailcheck import email_domain_error, deliverability_error

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


def _find_login_user(db: Session, identifier: str):
    """Resolve a login identifier to a user: Company ID first, then email."""
    identifier = (identifier or "").strip()
    if not identifier:
        return None
    user = db.query(models.User).filter(models.User.company_id == identifier.upper()).first()
    if user:
        return user
    return crud.get_user_by_email(db, identifier.lower())


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    identifier = payload.login_id or payload.email
    if not identifier:
        raise HTTPException(400, "Enter your Company ID (or email) and password")

    user = _find_login_user(db, identifier)
    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Incorrect Company ID or password")
    if not user.is_active:
        raise HTTPException(403, "This account has been deactivated")

    token = create_access_token(user)
    # user.account_status tells the frontend whether to force a password change
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/activate", response_model=schemas.ActivateOut)
def activate(
    payload: schemas.ActivateIn,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Candidate self-signup fallback (spec 3b). Activates an EXISTING directory row;
    never creates one. Returns a single generic message on any mismatch so we don't
    leak whether the Company ID or the email was wrong.
    """
    company_id = payload.company_id.strip().upper()
    email = payload.personal_email.strip().lower()
    admin_contact = settings.ADMIN_CONTACT_EMAIL

    user = db.query(models.User).filter(models.User.company_id == company_id).first()

    if not user or (user.personal_email or "").strip().lower() != email:
        return schemas.ActivateOut(
            ok=False,
            message=(
                "Account not found. If your admin hasn't added you yet, use "
                "'Request access' below to send them your details."
            ),
            admin_contact=admin_contact,
        )

    if user.account_status == "active":
        return schemas.ActivateOut(
            ok=False,
            message="An account already exists for this Company ID. Please log in, or reset your password.",
            admin_contact=admin_contact,
        )

    # unclaimed / password_reset_required → (re)issue a temp password and email it
    temp = generate_temp_password()
    user.password_hash = hash_password(temp)
    user.account_status = "password_reset_required"
    db.commit()
    background.add_task(
        email_credentials, user.personal_email, user.name,
        user.company_id, temp, user.department or "", user.role,
    )
    return schemas.ActivateOut(
        ok=True,
        message="Your login credentials have been sent to the email on file. Check your inbox (and spam).",
    )


@router.post("/forgot-password", response_model=schemas.ActivateOut)
def forgot_password(
    payload: schemas.ActivateIn,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Self-service password reset. The user proves ownership with their Company ID +
    the personal email on file; we issue a fresh temporary password by email and flag
    the account so the next login forces a new password. Unlike /activate, this works
    for already-active accounts. Generic response on mismatch (no field-level leak)."""
    company_id = payload.company_id.strip().upper()
    email = payload.personal_email.strip().lower()
    admin_contact = settings.ADMIN_CONTACT_EMAIL

    user = db.query(models.User).filter(models.User.company_id == company_id).first()

    if not user or (user.personal_email or "").strip().lower() != email:
        return schemas.ActivateOut(
            ok=False,
            message="No account matches that Company ID and personal email. "
                    "Check your details, or contact your administrator.",
            admin_contact=admin_contact,
        )
    if not user.is_active:
        return schemas.ActivateOut(
            ok=False,
            message="This account has been deactivated. Please contact your administrator.",
            admin_contact=admin_contact,
        )

    temp = generate_temp_password()
    user.password_hash = hash_password(temp)
    user.account_status = "password_reset_required"
    db.commit()
    background.add_task(
        email_password_reset, user.personal_email, user.name, user.company_id, temp,
    )
    return schemas.ActivateOut(
        ok=True,
        message="A temporary password has been sent to your email. Sign in with it, "
                "then you'll be asked to set a new password.",
    )


@router.post("/request-access", response_model=schemas.ActivateOut)
def request_access(
    payload: schemas.AccessRequestIn,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """A candidate not yet in the directory sends their details to the admin, who then
    creates the account (assigning a manager) via the admin panel."""
    email = payload.personal_email.strip().lower()

    # Only accepted email providers are allowed (rejects e.g. sai@zoo.com, and
    # suggests a correction for a near-miss typo like gomail.com -> gmail.com).
    domain_error = email_domain_error(email)
    if domain_error:
        return schemas.ActivateOut(
            ok=False,
            message=domain_error,
            admin_contact=settings.ADMIN_CONTACT_EMAIL,
        )

    # An email belongs to exactly one person. Block a request for an address that is
    # already registered (e.g. someone entering a colleague's or manager's email) so
    # a request can't be raised against another user's identity.
    existing = db.query(models.User).filter(
        (func.lower(models.User.email) == email)
        | (func.lower(models.User.personal_email) == email)
    ).first()
    if existing:
        return schemas.ActivateOut(
            ok=False,
            message="An account with this email already exists. Please sign in, or use "
                    "'Forgot password?' if you can't get in.",
            admin_contact=settings.ADMIN_CONTACT_EMAIL,
        )

    # Real-time check that the mailbox actually exists (catches alipithreey@gmail.com).
    deliver_error = deliverability_error(email)
    if deliver_error:
        return schemas.ActivateOut(
            ok=False,
            message=deliver_error,
            admin_contact=settings.ADMIN_CONTACT_EMAIL,
        )

    background.add_task(
        email_access_request, settings.ADMIN_CONTACT_EMAIL, payload.full_name.strip(),
        email, payload.department, payload.role,
        payload.joining_date, payload.message or "",
    )
    admin = crud.get_user_by_email(db, settings.ADMIN_EMAIL.lower().strip())
    if admin:
        crud.create_notification(
            db, user_id=admin.id,
            title=f"Access request from {payload.full_name.strip()}",
            message=f"{payload.role.title()} · {payload.department} · joining {payload.joining_date}",
            type="info", link="/admin/employees",
        )
    return schemas.ActivateOut(
        ok=True,
        message="Your request has been sent to the administrator. You'll receive your login "
                "details by email once your account is created.",
    )


@router.post("/change-password", response_model=schemas.UserOut)
def change_password(
    payload: schemas.ChangePasswordIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Used by the forced first-login change and voluntary changes. Clears the
    password_reset_required flag → account_status becomes 'active'."""
    if not current_user.password_hash or not verify_password(
        payload.current_password, current_user.password_hash
    ):
        raise HTTPException(400, "Your current password is incorrect")
    validate_password(payload.new_password)
    current_user.password_hash = hash_password(payload.new_password)
    current_user.account_status = "active"
    db.commit()
    db.refresh(current_user)
    return current_user


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
    """Public — populates the manager dropdown on the admin 'Add Employee' form."""
    return crud.get_managers(db)
