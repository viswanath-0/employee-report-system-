"""
migrations/003_add_manager_feedback.py

Additive, reversible migration that gives a report a lasting manager feedback note,
kept separate from the (clearable) clarification request.

Adds to `reports`:
    + manager_feedback  TEXT NULL   — a general review comment the manager leaves.
                                      Unlike `correction_message` (the clarification,
                                      which clears on approval), this persists as a record.

Safe and additive. Run it against the live DB BEFORE deploying the code that uses
this column (same ordering rule as migrations 001 / 002).

Usage (from backend/, venv active):
    python migrations/003_add_manager_feedback.py          # apply
    python migrations/003_add_manager_feedback.py --down   # roll back
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import inspect, text

from database import engine

TABLE = "reports"

# (name, MySQL DDL, SQLite DDL)
ADD_COLUMNS = [
    ("manager_feedback", "TEXT NULL", "TEXT"),
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
    print("[up] complete.")


def down():
    print(f"[down] dialect = {engine.dialect.name}")
    if TABLE not in _tables():
        print(f"  ! table '{TABLE}' not found — nothing to roll back.")
        return
    cols = _columns()
    with engine.begin() as conn:
        for name in ("manager_feedback",):
            if name in cols:
                conn.execute(text(f"ALTER TABLE {TABLE} DROP COLUMN {name}"))
                print(f"  - dropped column {name}")
    print("[down] complete.")


if __name__ == "__main__":
    (down if "--down" in sys.argv else up)()
