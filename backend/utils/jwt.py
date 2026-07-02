"""
utils/jwt.py

All authentication helpers in one place:
  - password hashing / verification (passlib, pbkdf2_sha256 — no native deps)
  - JWT access-token creation / decoding (PyJWT)
  - FastAPI dependencies: get_current_user + role guards
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt  # PyJWT
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from config import settings
from database import get_db
import models

# pbkdf2_sha256 is pure-python and avoids the bcrypt 72-byte limit / native build issues
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# HTTPBearer → clients send `Authorization: Bearer <token>`
bearer_scheme = HTTPBearer(auto_error=False)


# -------------------- Passwords -------------------- #
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        return False


# -------------------- Tokens -------------------- #
def create_access_token(user: "models.User", expires_minutes: Optional[int] = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "name": user.name,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except jwt.PyJWTError:
        return None


# -------------------- Dependencies -------------------- #
_CREDENTIALS_EXC = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> "models.User":
    if creds is None or not creds.credentials:
        raise _CREDENTIALS_EXC
    payload = decode_token(creds.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    user = db.query(models.User).filter(models.User.id == int(payload["sub"])).first()
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or deactivated")
    return user


def require_roles(*roles: str):
    """Dependency factory enforcing that the current user has one of `roles`."""
    def checker(user: "models.User" = Depends(get_current_user)) -> "models.User":
        if user.role not in roles:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "You do not have permission to access this resource",
            )
        return user
    return checker


# Convenience guards
get_current_employee = require_roles("employee")
get_current_manager = require_roles("manager")
get_current_admin = require_roles("admin")
get_manager_or_admin = require_roles("manager", "admin")
