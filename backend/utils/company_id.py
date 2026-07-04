"""
utils/company_id.py

Company-ID generation + the department catalog + secure temp-password generation.

ID format (section 1 of the spec):
    Employee : EMP-{seq:04d}-{joiningYear}-{deptCode}   e.g. EMP-0042-2026-ENG
    Manager  : MGR-{seq:04d}-{joiningYear}-{deptCode}   e.g. MGR-0007-2026-ENG

`seq` is unique per role + department + joining year (per the confirmed decision).
"""

import re
import secrets
import string

import models

# Department catalog (confirmed placeholder list — extend here later).
DEPARTMENT_CATALOG = [
    {"code": "ENG", "name": "Engineering"},
    {"code": "HR", "name": "Human Resources"},
    {"code": "FIN", "name": "Finance"},
    {"code": "OPS", "name": "Operations"},
    {"code": "SALES", "name": "Sales"},
]
_CODE_TO_NAME = {d["code"]: d["name"] for d in DEPARTMENT_CATALOG}
_VALID_CODES = set(_CODE_TO_NAME)

ROLE_PREFIX = {"employee": "EMP", "manager": "MGR"}


def valid_dept_code(code: str) -> bool:
    return code in _VALID_CODES


def dept_name(code: str) -> str:
    return _CODE_TO_NAME.get(code, code)


def generate_company_id(db, role: str, dept_code: str, joining_year: int) -> str:
    """
    Next available Company ID for this role + department + year.
    Scans existing company_ids that match the pattern and takes max(seq)+1.
    """
    prefix = ROLE_PREFIX.get(role)
    if not prefix:
        raise ValueError(f"Company IDs are not generated for role '{role}'")

    like = f"{prefix}-%-{joining_year}-{dept_code}"
    rows = (
        db.query(models.User.company_id)
        .filter(models.User.company_id.like(like))
        .all()
    )
    pattern = re.compile(rf"^{prefix}-(\d+)-{joining_year}-{dept_code}$")
    max_seq = 0
    for (cid,) in rows:
        m = pattern.match(cid or "")
        if m:
            max_seq = max(max_seq, int(m.group(1)))

    return f"{prefix}-{max_seq + 1:04d}-{joining_year}-{dept_code}"


def generate_temp_password(length: int = 12) -> str:
    """A strong random temp password guaranteed to contain upper/lower/digit/special."""
    length = max(length, 8)
    pools = [string.ascii_uppercase, string.ascii_lowercase, string.digits, "!@#$%*-_"]
    chars = [secrets.choice(p) for p in pools]  # one of each class
    alphabet = string.ascii_letters + string.digits + "!@#$%*-_"
    chars += [secrets.choice(alphabet) for _ in range(length - len(chars))]
    secrets.SystemRandom().shuffle(chars)
    return "".join(chars)
