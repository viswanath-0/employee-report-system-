"""
migrations/002_add_clarification_proof_lock.py

Additive, reversible migration for the clarification / proof / approval-lock flow.

Adds to `reports`:
    + clarification_response  TEXT NULL     — the employee's explanation on resubmit
    + proof_files             TEXT NULL     — JSON list of {file_name,file_path,file_size}
    + locked                  BOOL NOT NULL DEFAULT 0  — set when a manager does a final
                                                        "Unapprove"; only an admin can re-open

Safe and additive. Run it against the live DB BEFORE deploying the code that uses
these columns (same ordering rule as migration 001).

Usage (from backend/, venv active):
    python migrations/002_add_clarification_proof_lock.py          # apply
    python migrations/002_add_clarification_proof_lock.py --down   # roll back
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import inspect, text

from database import engine

TABLE = "reports"

# (name, MySQL DDL, SQLite DDL)
ADD_COLUMNS = [
    ("clarification_response", "TEXT NULL", "TEXT"),
    ("proof_files", "TEXT NULL", "TEXT"),
    ("locked", "BOOLEAN NOT NULL DEFAULT 0", "BOOLEAN NOT NULL DEFAULT 0"),
]


def _tables():
    return set(inspect(engine).get_table_names())


def _columns():
    return {c["name"] for c in inspect(engine).get_columns(TABLE)}


def up():
    dialect = engine.dialect.name
    print(f"[up] dialect = {dialect}")
    if TABLE not in _tables():
        print(f"  ! table '{TABLE}' not found — start the app once, then re-run.")
        return
    cols = _columns()
    with engine.begin() as conn:
        for name, mysql_ddl, sqlite_ddl in ADD_COLUMNS:
            if name in cols:
                print(f"  = column {name} already present — skip")
                continue
            ddl = sqlite_ddl if dialect == "sqlite" else mysql_ddl
            conn.execute(text(f"ALTER TABLE {TABLE} ADD COLUMN {name} {ddl}"))
            print(f"  + added column {name}")
        conn.execute(text(f"UPDATE {TABLE} SET locked = 0 WHERE locked IS NULL"))
    print("[up] complete.")


def down():
    print(f"[down] dialect = {engine.dialect.name}")
    if TABLE not in _tables():
        print(f"  ! table '{TABLE}' not found — nothing to roll back.")
        return
    cols = _columns()
    with engine.begin() as conn:
        for name in ("locked", "proof_files", "clarification_response"):
            if name in cols:
                conn.execute(text(f"ALTER TABLE {TABLE} DROP COLUMN {name}"))
                print(f"  - dropped column {name}")
    print("[down] complete.")


if __name__ == "__main__":
    (down if "--down" in sys.argv else up)()
