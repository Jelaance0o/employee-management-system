# TeamSpace member and task workflows

## Database migration

The new revision is `8b4f2a91c6d0`. Back up the database, confirm `DATABASE_URL` points to the intended database, then run from the `backend` directory:

```powershell
alembic upgrade head
```

This adds optional member profile fields (`department`, `job_title`, `bio`, `skills`, `tech_stack`) and the `task_reports` table. Existing user and task data is preserved. Review your deployment's migration process before running this against production.

## Member profile

- `PATCH /api/v1/teammates/me/profile` — update the authenticated user's own profile.
- `GET /api/v1/teammates/manager/members` — list active, non-admin members of projects managed by the current project manager.
- `GET /api/v1/teammates/manager/members/{user_id}` — get the member profile, managed-project memberships, task counts, overdue count, and recent assigned tasks.

The manager endpoints only return members in the current manager's workspace and managed projects. Skills and tech stack are optional lists, so older accounts return `null` until populated.

## Task ownership labels

Task responses now also include `project_name`, `created_by_name`, `assigned_to_name`, `project_manager_id`, and `project_manager_name`. Existing ID fields remain unchanged for compatibility.

Project managers' project-member selectors exclude Admin accounts, and the backend also rejects a project manager attempting to assign a task to an Admin account. Admin workflows remain unchanged.

## Task feedback and blocker reports

- `POST /api/v1/tasks/{task_id}/reports` — an employee assigned to the task can submit a `progress`, `blocker`, `issue`, or `question` report.
- `GET /api/v1/tasks/{task_id}/reports` — list reports visible to the current user for that task.
- `GET /api/v1/task-reports?status=open` — list visible reports, optionally filtered by `open`, `acknowledged`, or `resolved`.
- `PATCH /api/v1/task-reports/{report_id}` — the assigned project manager or an Admin can update report status and/or provide `manager_response`.

Reports are stored in PostgreSQL and include the task, project, submitter, manager, timestamps, and resolution state. Access is workspace-scoped and manager responses are limited to the responsible project manager or an Admin.
