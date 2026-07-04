"""
migrations/001_add_company_directory_fields.py

PHASE 1 — additive, reversible schema migration for the Company-ID account
provisioning feature.

The existing `users` table IS the "company_directory" (single source of truth
for people). This migration extends it:

    + company_id      VARCHAR(40)   UNIQUE, NULL   (future login ID; NULL for now)
    + personal_email  VARCHAR(160)  NULL
    + account_status  VARCHAR(30)   NOT NULL DEFAULT 'active'
    ~ password_hash   -> NULLABLE                  (null until an account is claimed)

Existing rows are backfilled to account_status='active', so current users and
their logins are completely unaffected.

Scope note: this touches the SCHEMA ONLY. It does NOT modify application code,
the login flow, the admin panel, RBAC, or models.py. The ORM keeps working
because SQLAlchemy simply ignores columns the model doesn't declare yet — the
matching model fields land in Phase 2, alongside the code that uses them.

Design note: `company_id` is added as a UNIQUE COLUMN, not the primary key. The
integer `users.id` stays the PK because it's referenced by foreign keys across
reports/tasks/notifications; swapping the PK would break them. `company_id` is
the logical/login identifier. (`full_name` from the spec maps to the existing
`name` column — no duplicate column is added.)

Usage (targets whatever DATABASE_URL / MYSQL_* points at):
    python migrations/001_add_company_directory_fields.py          # apply  (up)
    python migrations/001_add_company_directory_fields.py --down   # roll back (down)

Idempotent: safe to run repeatedly.
"""

import os
import sys

# Make `database` / `config` / `models` importable no matter which directory this
# script is launched from — its parent folder is backend/, where they live.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import inspect, text

# `from database import engine` → builds the engine from the current settings,
# so this script hits exactly the DB the app is configured for.
from database import engine

TABLE = "users"
INDEX_NAME = "ux_users_company_id"

# (name, DDL for MySQL, DDL for SQLite)
ADD_COLUMNS = [
    ("company_id",     "VARCHAR(40) NULL",                      "VARCHAR(40)"),
    ("personal_email", "VARCHAR(160) NULL",                     "VARCHAR(160)"),
    ("account_status", "VARCHAR(30) NOT NULL DEFAULT 'active'", "VARCHAR(30) NOT NULL DEFAULT 'active'"),
]


def _table_names():
    return set(inspect(engine).get_table_names())


def _columns():
    return {c["name"] for c in inspect(engine).get_columns(TABLE)}


def _indexes():
    return {i["name"] for i in inspect(engine).get_indexes(TABLE)}


def up():
    dialect = engine.dialect.name
    print(f"[up] dialect = {dialect}")

    if TABLE not in _table_names():
        print(f"  ! table '{TABLE}' not found — start the app once so create_all() "
              f"builds the base tables, then re-run this migration.")
        return

    # inspect BEFORE opening the write transaction (avoids SQLite lock contention)
    cols = _columns()
    idxs = _indexes()

    with engine.begin() as conn:
        for name, mysql_ddl, sqlite_ddl in ADD_COLUMNS:
            if name in cols:
                print(f"  = column {name} already present — skip")
                continue
            ddl = sqlite_ddl if dialect == "sqlite" else mysql_ddl
            conn.execute(text(f"ALTER TABLE {TABLE} ADD COLUMN {name} {ddl}"))
            print(f"  + added column {name}")

        # backfill existing rows (also covers any pre-existing NULLs)
        conn.execute(text(
            f"UPDATE {TABLE} SET account_status = 'active' "
            f"WHERE account_status IS NULL OR account_status = ''"
        ))
        print("  ~ backfilled account_status='active' for existing rows")

        # relax password_hash to NULLABLE.
        # MySQL: MODIFY COLUMN. SQLite: no MODIFY, and a freshly-added column is
        # already nullable, so nothing to do there.
        if dialect == "mysql":
            conn.execute(text(
                f"ALTER TABLE {TABLE} MODIFY COLUMN password_hash VARCHAR(255) NULL"
            ))
            print("  ~ password_hash -> NULLABLE")

        # unique index on company_id (multiple NULLs are allowed on MySQL & SQLite)
        if INDEX_NAME not in idxs:
            conn.execute(text(f"CREATE UNIQUE INDEX {INDEX_NAME} ON {TABLE} (company_id)"))
            print(f"  + created unique index {INDEX_NAME}")
        else:
            print(f"  = index {INDEX_NAME} already present — skip")

    print("[up] complete.")


def down():
    dialect = engine.dialect.name
    print(f"[down] dialect = {dialect}")

    if TABLE not in _table_names():
        print(f"  ! table '{TABLE}' not found — nothing to roll back.")
        return

    idxs = _indexes()
    cols = _columns()

    with engine.begin() as conn:
        if INDEX_NAME in idxs:
            if dialect == "mysql":
                conn.execute(text(f"DROP INDEX {INDEX_NAME} ON {TABLE}"))
            else:
                conn.execute(text(f"DROP INDEX {INDEX_NAME}"))
            print(f"  - dropped index {INDEX_NAME}")

        for name in ("account_status", "personal_email", "company_id"):
            if name in cols:
                conn.execute(text(f"ALTER TABLE {TABLE} DROP COLUMN {name}"))
                print(f"  - dropped column {name}")

    print("[down] complete. (password_hash left NULLABLE — harmless; re-tighten "
          "manually only if every row has a value.)")


if __name__ == "__main__":
    (down if "--down" in sys.argv else up)()
