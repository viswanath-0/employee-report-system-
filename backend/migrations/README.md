# Database migrations

Plain, dependency-free migration scripts (no Alembic). Each script targets
whatever database `DATABASE_URL` / the `MYSQL_*` settings point at, and is
**idempotent** (safe to re-run) and **reversible** (`--down`).

Run from the `backend/` directory with your venv active.

---

## 001 — Add company-directory fields (Phase 1)

Extends the existing `users` table (the source-of-truth "company directory")
with the fields needed for Company-ID provisioning:

| Change | Detail |
|---|---|
| `+ company_id` | `VARCHAR(40)`, unique, nullable (the future login ID) |
| `+ personal_email` | `VARCHAR(160)`, nullable |
| `+ account_status` | `VARCHAR(30)`, NOT NULL, default `active` |
| `~ password_hash` | relaxed to **NULLABLE** (null until an account is claimed) |
| backfill | every existing row set to `account_status = 'active'` |

This is **additive and safe**: it does not drop or rename anything, and current
logins are unaffected. `full_name` from the spec maps to the existing `name`
column (no duplicate added). `company_id` is a unique column, **not** the primary
key — `users.id` stays the PK so existing foreign keys keep working.

### Apply / roll back

```bash
# apply
python migrations/001_add_company_directory_fields.py

# roll back
python migrations/001_add_company_directory_fields.py --down
```

### Verify it worked

```sql
-- new columns exist
DESCRIBE users;                 -- MySQL   (or: PRAGMA table_info(users);  on SQLite)

-- every existing user is 'active'
SELECT account_status, COUNT(*) FROM users GROUP BY account_status;
```

### Running it against the LIVE Railway database

The internal host `mysql.railway.internal` only works *inside* Railway, so pick one:

**Option A — from your laptop, using the public URL:**
1. Railway → MySQL service → **Variables** → copy `MYSQL_PUBLIC_URL`
   (looks like `mysql://root:PASS@HOST.proxy.rlwy.net:PORT/railway`).
2. Run with that URL (the app rewrites `mysql://` to the right driver automatically):
   ```powershell
   $env:DATABASE_URL = "mysql://root:PASS@HOST.proxy.rlwy.net:PORT/railway"
   python migrations/001_add_company_directory_fields.py
   ```

**Option B — inside Railway (Railway CLI):**
```bash
railway run python migrations/001_add_company_directory_fields.py
```

---

## ⚠️ Deployment ordering (important for Phase 2)

Phase 1 only changes the **database** — `models.py` is intentionally left
unchanged, so the currently-deployed backend keeps working no matter what.

When Phase 2 adds the matching ORM fields to `models.py`, you **must apply this
migration to the live database _before_ deploying that code**. If the model
declares columns the live table doesn't have yet, `SELECT` queries (including
login) will fail. Order: **migrate the DB → then deploy the code.**
