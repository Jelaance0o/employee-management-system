# TeamSpace Backend --- Implementation Notes and Current State

**Last updated:** October 10, 2026\
**Project deadline:** October 16, 2026\
**Status:** Backend foundation, authentication, invitations, and basic
Admin teammate endpoints implemented and reported working.

> This document records the implementation described and tested in the
> development conversation. It is not a substitute for reviewing the
> current source code. Keep it updated when files, endpoints, or
> behavior change.

## 1. Product overview

TeamSpace is a team and digital-product management application. The
planned product includes:

-   Company/workspace management and teammate profiles
-   Roles: Admin, Project Manager, Employee
-   Projects, milestones, assignments, and task management
-   Kanban workflow: `To Do`, `In Progress`, `In Review`,
    `Changes Required`, `Done`
-   SOPs (Standard Operating Procedures), versioned instructions, and
    checklists
-   KRAs (Key Result Areas) and KPIs (Key Performance Indicators)
-   Weekly progress monitoring, monthly KPI reviews, quarterly strategic
    reviews
-   Individual progress dashboards and team-level analytics
-   Digital products and release management
-   Collaboration, files, comments, notifications, calendar, and audit
    history

### Review cadence agreed

-   **Weekly:** lightweight progress checks, blockers, workload,
    deadlines
-   **Monthly:** formal KPI review and manager feedback
-   **Quarterly:** longer-term performance, KRA alignment, and target
    adjustments

The system should avoid simplistic employee rankings. Metrics should
account for quality, task complexity, capacity, and evidence---not just
task counts.

## 2. Agreed technology stack

-   **Frontend:** React + TypeScript + Vite + Tailwind CSS
-   **Backend:** FastAPI (Python)
-   **Database:** Neon PostgreSQL
-   **ORM:** SQLAlchemy
-   **Migrations:** Alembic
-   **Database driver:** psycopg
-   **Password hashing:** `pwdlib[argon2]`
-   **JWT:** PyJWT
-   **Environment configuration:** python-dotenv
-   **Frontend HTTP client:** Axios was planned in the existing frontend
    setup
-   **Frontend routing/icons:** React Router and Lucide were
    planned/installed during setup

The browser must never connect directly to Neon. Database credentials
belong only in the backend environment.

## 3. Current project layout

The intended project root is `D:\teamManagment` (confirm the actual path
locally).

``` text
teamManagment/
├── frontend/                       # Existing React + TypeScript + Vite app
└── backend/
    ├── app/
    │   ├── __init__.py
    │   ├── main.py
    │   ├── api/
    │   │   ├── __init__.py
    │   │   └── v1/
    │   │       ├── __init__.py
    │   │       ├── router.py
    │   │       └── endpoints/
    │   │           ├── __init__.py
    │   │           ├── auth.py
    │   │           ├── invitations.py
    │   │           └── teammates.py
    │   ├── core/
    │   │   ├── __init__.py
    │   │   ├── config.py
    │   │   └── security.py
    │   ├── db/
    │   │   ├── __init__.py
    │   │   └── session.py
    │   ├── dependencies/
    │   │   ├── __init__.py
    │   │   └── auth.py
    │   ├── models/
    │   │   ├── __init__.py
    │   │   ├── base.py
    │   │   ├── user.py
    │   │   ├── workspace.py
    │   │   └── invitation.py
    │   ├── schemas/
    │   │   ├── __init__.py
    │   │   ├── auth.py
    │   │   └── invitation.py
    │   ├── services/
    │   │   ├── __init__.py
    │   │   ├── auth_service.py
    │   │   ├── invitation_service.py
    │   │   └── teammate_service.py
    │   ├── scripts/
    │   │   ├── __init__.py
    │   │   └── create_admin.py
    │   └── utils/                  # Planned; add when needed
    ├── alembic/
    │   ├── env.py
    │   └── versions/
    ├── tests/                      # Planned / not yet confirmed populated
    ├── .env                        # Secret; never commit
    ├── .gitignore
    ├── alembic.ini
    └── requirements.txt
```

Important: the earlier `app/models.py` file caused an import conflict
with the `app/models/` package. The user fixed the missing
`app/models/__init__.py` and confirmed FastAPI starts. Ensure the old
`app/models.py` has been renamed or removed after preserving a backup;
the package directory must be used consistently.

## 4. Database and migrations

### Neon database

-   Neon project created.
-   Database name used in the API response: `teamspace_db`.
-   The connection string is stored in `backend/.env` as `DATABASE_URL`.
-   The Neon connection test and initial migrations were reported
    successful.
-   Do not put the real connection string in documentation, chat, or
    source control.

### Tables confirmed

-   `workspaces`
-   `users`
-   `invitations`

Alembic tracks applied migrations in `alembic_version`.

### Workspace model

`Workspace` includes: - `id`: primary key - `name` - `slug`: unique
URL-friendly identifier - `created_at` - relationship to users

### User model

`User` includes: - `id` - `workspace_id`: foreign key to
`workspaces.id` - `full_name` - `email`: unique - `password_hash` -
`role` (currently a string; enforce allowed roles in backend logic) -
`is_active` - `created_at` - relationship to workspace

### Invitation model

`Invitation` includes: - `id` - `workspace_id` - `invited_by_id` -
`email` - `role` - `token_hash` (store hash, not raw token) -
`expires_at` - `accepted_at` - `revoked_at` - `created_at`

There is an index on workspace/email and a unique token hash.

### Migration commands

Run from `backend/` with the virtual environment activated:

``` powershell
alembic current
alembic revision --autogenerate -m "describe the schema change"
alembic upgrade head
```

Review every generated migration before applying it. Do not recreate
existing tables or blindly apply a migration if tables already exist.

## 5. Database connection and sessions

`app/db/session.py` contains: - `DATABASE_URL` loaded from `.env` -
SQLAlchemy `engine` with `pool_pre_ping=True` - a `SessionLocal` session
factory - `get_db()` dependency that yields a session and closes it at
the end of a request - `check_database_connection()` which runs
`SELECT 1`

The pool settings in the current implementation are a conservative
starting point; revisit them according to Neon limits and deployment
concurrency.

## 6. Configuration and security

`app/core/config.py` loads: - `JWT_SECRET_KEY` - `JWT_ALGORITHM`
(default `HS256`) - `ACCESS_TOKEN_EXPIRE_MINUTES` (default `30`) -
`FRONTEND_ORIGIN` (default `http://localhost:5173`) - `COOKIE_SECURE` -
`COOKIE_SAMESITE`

Generate a secret locally with:

``` powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Never commit `.env`. Production must use a separate strong secret and
HTTPS with `COOKIE_SECURE=true`.

`app/core/security.py` uses: - `pwdlib[argon2]` for password hashing and
verification - PyJWT for signing and decoding access tokens - token
claims include `sub`, `type="access"`, and `exp`

JWTs are signed, not encrypted. Do not put sensitive profile data in the
payload.

### Password policy

A `PasswordInput` schema was added to `app/schemas/auth.py` for
new-password flows: - 8--128 characters - at least one letter - at least
one digit - at least one symbol

`LoginRequest` intentionally accepts an existing password without
enforcing new-password composition rules. This avoids locking out older
accounts. The initial Admin was created before this policy was added;
the policy does not automatically change that account's password.

## 7. Authentication flow

### Current endpoints

-   `POST /api/v1/auth/login`
-   `GET /api/v1/auth/me`
-   `POST /api/v1/auth/logout`

### Login flow

1.  Client sends email/password to the login endpoint.
2.  `auth_service.authenticate_user()` normalizes email, fetches user,
    checks `is_active`, and verifies the password hash.
3.  `create_access_token()` signs a JWT with expiry.
4.  The response sets `access_token` as an HttpOnly cookie.
5.  Protected endpoints use `get_current_user()` to read the cookie,
    validate the token, and fetch the active user from PostgreSQL.
6.  The response schema does not include `password_hash`.

### Logout caveat

Logout clears the browser cookie. A copied JWT is not immediately
revoked server-side by cookie deletion alone. Add token revocation or a
session-version approach if immediate revocation is required.

### Cookie / CSRF caveat

Before production, implement CSRF protections for cookie-authenticated
state-changing requests, review SameSite/origin settings, and add login
rate limiting. CORS alone is not a complete CSRF defense.

## 8. Initial administrator bootstrap

The one-time script is `app/scripts/create_admin.py`.

Run:

``` powershell
python -m app.scripts.create_admin
```

It prompts for workspace name, admin name/email, and password (without
echoing the password), checks password length and confirmation, and
refuses to bootstrap if users already exist. It creates the workspace
and Admin in one database transaction.

The user reported: **"Initial administrator and workspace created
successfully."**

Do not run it again against the populated database; it should refuse to
create a second bootstrap Admin.

## 9. Invitation workflow

### Endpoints

-   `POST /api/v1/invitations` --- Admin creates an invitation
-   `GET /api/v1/invitations/validate?token=...` --- validate a link
-   `POST /api/v1/invitations/accept` --- accept invitation and create
    account

### Service behavior

`app/services/invitation_service.py`: - generates a random invitation
token with `secrets.token_urlsafe(32)` - stores only its SHA-256 hash -
uses 24-hour expiry - permits only `employee` and `project_manager`
invite roles - revokes prior pending invitations for the same
workspace/email - prevents existing email accounts from being invited -
uses a row lock on acceptance - creates the user and marks invitation
accepted in one transaction - rolls back on errors

### Invitation acceptance payload

``` json
{
  "token": "RAW_TOKEN_FROM_INVITATION_URL",
  "full_name": "Test Teammate",
  "password": "TeamSpace@123"
}
```

The password must satisfy the new-password validation rule.

The API returns a copyable invitation URL; email delivery has not yet
been implemented.

### Important follow-up security tasks

-   Do not log raw invitation tokens.
-   Avoid third-party resources on invitation pages and set a suitable
    referrer policy because tokens are present in the URL.
-   Consider rate limiting token validation and acceptance endpoints.
-   Ensure workspace/email uniqueness and invitation concurrency rules
    match the desired product behavior.
-   The current email uniqueness is global; if the product should permit
    the same email in multiple workspaces, the schema/constraints need a
    deliberate redesign.

## 10. Teammate management endpoints

The user reports that the current endpoints are working.

-   `GET /api/v1/teammates?limit=20&offset=0`
-   `GET /api/v1/teammates/{user_id}`
-   `PATCH /api/v1/teammates/{user_id}/deactivate`

### Implementation

`app/services/teammate_service.py`: - `list_teammates()` filters by
workspace and paginates (limit 1--100) - `get_teammate()` filters by
workspace and user ID - `deactivate_teammate()` prevents
self-deactivation in this endpoint, protects the last active Admin, and
sets `is_active=False`

`app/api/v1/endpoints/teammates.py`: - uses `require_roles("admin")` -
scopes all queries to `admin.workspace_id` - uses `UserResponse`, which
does not expose password hashes

`app/api/v1/router.py` registers auth, invitation, and teammate routers
under `/api/v1`.

### Known behavior / caveat

Deactivating a user causes subsequent protected requests to fail because
`get_current_user()` checks `is_active`. Existing JWT cookies are not
removed from that user's browser automatically; the backend rejects them
on the next protected request.

## 11. Main app and API

`app/main.py`: - creates the FastAPI app - configures CORS for the
explicit `FRONTEND_ORIGIN` - includes `api_router` - provides `/`
health/root endpoint - provides `/health/database`

CORS uses `allow_credentials=True` with an explicit frontend origin, not
a wildcard.

Run the backend from `backend/`:

``` powershell
uvicorn app.main:app --reload
```

Open: - `http://127.0.0.1:8000/` -
`http://127.0.0.1:8000/health/database` - `http://127.0.0.1:8000/docs`

## 12. Current reported status

The user reported: - Neon connection and migrations work. - `workspaces`
and `users` tables exist. - The invitation table was migrated. - The
initial Admin and workspace were created. - FastAPI starts after fixing
the model-package import issue. - Login works. - Invitation flow was
implemented and the user said it was done. - Teammate
list/detail/deactivation API was implemented and the user reported
everything works.

This is based on user-reported testing; the documentation writer has not
independently run their local application.

## 13. Known gaps before production

The following are not yet complete or should be explicitly tested: -
automated tests (pytest) for authentication, permissions, invitations,
workspace isolation, and teammate endpoints - CSRF protection for
cookie-authenticated mutation requests - login rate limiting and abuse
prevention - production cookie settings and deployment secrets -
explicit role constraints/enums and role policy tests - account password
reset/change flow - email sending for invitations - invitation endpoint
rate limits and token-safe logging - concurrency and database
constraints reviewed for all relevant operations - project-level
permissions for Project Managers - complete audit logs for sensitive
actions - secure frontend integration and end-to-end testing

## 14. Next backend milestones

Recommended order: 1. Finish invitation/security hardening that is
essential for the MVP. 2. Expand teammate management with profile
fields, department/job title, skills, experience, and status controls.
3. Build projects and milestones. 4. Build tasks, assignments, due
dates, priorities, comments, and the five Kanban statuses. 5. Build SOPs
and versioned checklists. 6. Build KRAs and KPI definitions, targets,
periods, evidence, and review snapshots. 7. Build dashboard endpoints
for individual progress, team workload, project progress, and overdue
work. 8. Add tests and deploy.

Keep weekly KPI monitoring lightweight, formal monthly reviews, and
quarterly strategic reviews. Avoid expensive recalculation on every
dashboard request; use indexed aggregate queries and saved review
snapshots when appropriate.

## 15. Working rules for future development

-   Work from `backend/` with `.venv` activated.
-   Never paste real secrets into chat or commit `.env`.
-   Provide complete code for each file when implementing a feature.
-   Explain what each file does and why it exists.
-   Run a small import/test check before moving to the next milestone.
-   Use Alembic migrations for schema changes; never manually recreate
    tables.
-   Keep endpoint handlers thin; put reusable business logic in
    services.
-   Scope tenant-owned queries to `workspace_id`.
-   Verify authorization server-side, not only by hiding frontend
    controls.
-   Distinguish "implemented" from "tested."
