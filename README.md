# Employee Report System

A full-stack, enterprise-style daily reporting platform: employees log their day on a
**draggable visual timeline**, managers approve / request clarifications / handle leave &
escalations, and admins oversee the whole company with charts and CSV export.

- **Frontend:** React + Vite + Tailwind CSS (shadcn-style UI kit), React Router, Context state
- **Backend:** FastAPI + SQLAlchemy (MySQL), JWT auth, file uploads, FastAPI-Mail
- **Auth:** JWT access tokens (stored in `localStorage`), role-based access (employee / manager / admin)

---

## Project structure

```
employee_r/
├── backend/                FastAPI app
│   ├── main.py             app + CORS + table creation + admin/settings bootstrap
│   ├── config.py           env-driven settings (.env)
│   ├── database.py         SQLAlchemy engine/session (MySQL, or SQLite via DATABASE_URL)
│   ├── models.py           8 tables (users, reports, tasks, task_files, leave_requests,
│   │                       escalations, notifications, settings)
│   ├── schemas.py          Pydantic v2 request/response models
│   ├── crud.py             shared DB helpers
│   ├── seed.py             demo data (managers, employees, reports, leaves, escalations)
│   ├── routers/            auth, employee, manager, admin, files, notifications
│   ├── utils/              jwt (auth), email, deadline (late + escalation rules)
│   ├── uploads/            uploaded files land here
│   ├── requirements.txt · Dockerfile · Procfile · .env.example
│
└── frontend/               React + Vite
    ├── src/
    │   ├── api/            axios instance + all endpoint functions
    │   ├── context/        AuthContext, NotificationContext
    │   ├── hooks/          useIsMobile, useCountdown
    │   ├── components/
    │   │   ├── ui/         button, card, dialog, table, badge, … (shadcn-style)
    │   │   ├── timeline/   Timeline (the core feature), MiniTimeline, TaskFormPanel
    │   │   ├── layouts/    Sidebar, Topbar, DashboardLayout, ProtectedRoute
    │   │   └── modals/     ConfirmDialog, ReportReviewDrawer
    │   ├── pages/          auth · employee · manager · admin
    │   └── utils/          date, format, toast, cn
    ├── vercel.json · .env.example
```

> Note: an older 2-table prototype backend still sits in the `employee_r/` root
> (`main.py`, `models.py`, …). The real application is under `backend/` and `frontend/`.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.10+ | This machine has Anaconda Python 3.13 at `C:\ProgramData\anaconda3\python.exe` |
| Node.js | 18+ | **Not currently installed** — install from https://nodejs.org to run the frontend |
| MySQL | 8+ | Or use SQLite for a zero-setup local run (see below) |

---

## Backend — setup & run

```bash
cd backend

# 1) create a virtual environment (use your Python 3.10+)
python -m venv .venv
.venv\Scripts\activate            # Windows
# source .venv/bin/activate       # macOS/Linux

# 2) install dependencies
pip install -r requirements.txt

# 3) configure environment
copy .env.example .env            # then edit values (DB password, secret key, …)

# 4a) MySQL: create the database first
#     mysql> CREATE DATABASE employee_db_report;
# 4b) …or skip MySQL entirely for local dev by setting in .env:
#     DATABASE_URL=sqlite:///./employee_report.db

# 5) run
uvicorn main:app --reload
```

- API root: http://127.0.0.1:8000
- Interactive docs (Swagger): http://127.0.0.1:8000/docs
- Tables are auto-created on startup. A default **admin** and the global **settings** row are seeded automatically.

### Seed demo data (optional but recommended)

```bash
python seed.py
```

Creates managers, employees and ~a month of varied reports/leaves/escalations.

### Default accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@company.com | Admin@123 |
| Manager | mona@company.com | Manager@123 |
| Employee | eddie@company.com | Employee@123 |

**Provisioning:** employees & managers are created by an admin (**All Employees → Add
Employee/Manager**), which generates their Company ID + a temporary password and emails the
credentials. New hires log in with their **Company ID** and set a password on first sign-in.

---

## Frontend — setup & run

```bash
cd frontend

# requires Node 18+ (install it first — not present on this machine)
npm install

copy .env.example .env            # VITE_API_BASE_URL=http://localhost:8000
npm run dev                       # http://localhost:5173
```

> Tip: if this folder is inside OneDrive, consider moving it out before `npm install`
> to avoid file-sync locking `node_modules`.

---

## Key behaviours

- **Draggable timeline** (`components/timeline/Timeline.jsx`): drag across the 9 AM–9 PM bar
  to select a range → a task form slides in. Blocks are color-cycled (indigo/teal/amber/rose/violet),
  overlaps are blocked with a red flash, clicking a block edits it. On mobile, drag is replaced by
  start/end dropdowns. Leave mode greys the whole day out.
- **Deadline** (default 8:00 PM, admin-configurable): a live countdown shows on the Submit page;
  reports submitted after the deadline are flagged **Late** (visible to managers/admins).
- **Escalation**: an employee can escalate a still-**pending** report only on the last day of the
  month, or 30+ days after submission. Escalating emails the manager and files it in their inbox.
- **Notifications**: in-app bell (polls every 30s) for approvals, clarifications and escalations.
- **Email**: disabled by default (messages are logged to the console). Enable by setting
  `EMAIL_ENABLED=true` + SMTP credentials in `backend/.env`.

---

## Deployment

**Backend (Render / Railway):** a `Dockerfile` and `Procfile` are included.
Set env vars `DATABASE_URL` (managed MySQL), `SECRET_KEY`, `FRONTEND_URL`, and
`CORS_ORIGINS` (your Vercel domain). The container starts uvicorn on `$PORT`.

**Frontend (Vercel):** import `frontend/`, framework preset **Vite**. `vercel.json`
already rewrites all routes to `index.html` (SPA). Set `VITE_API_BASE_URL` to your
deployed backend URL in the Vercel dashboard.

---

## API overview

`/auth` register · login · me · update profile · managers · &nbsp; `/reports` submit · my · resubmit ·
`/leave/apply` · `/escalations` · `/manager/*` (team, pending, approve, unapprove, leaves, escalations) ·
`/admin/*` (stats, employees, managers, reports, departments, settings, export) · `/upload` · `/files/{name}` ·
`/notifications`. Full interactive reference at `/docs`.
