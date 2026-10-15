from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Project, Task, TaskReport, User
from app.schemas.task_report import TaskReportCreate, TaskReportUpdate


def create_task_report(db: Session, user: User, task: Task, payload: TaskReportCreate) -> TaskReport:
    if user.role != "employee" or task.assigned_to_id != user.id:
        raise PermissionError("Only the teammate assigned to this task can submit a task report.")
    report = TaskReport(
        workspace_id=user.workspace_id,
        task_id=task.id,
        submitted_by_id=user.id,
        report_type=payload.report_type,
        message=payload.message.strip(),
    )
    db.add(report)
    try:
        db.commit()
        db.refresh(report)
        return report
    except Exception:
        db.rollback()
        raise


def list_task_reports(db: Session, user: User, *, status_filter: str | None = None, limit: int = 50, offset: int = 0) -> list[TaskReport]:
    statement = select(TaskReport).where(TaskReport.workspace_id == user.workspace_id)
    if user.role == "admin":
        pass
    elif user.role == "project_manager":
        statement = statement.join(Task, Task.id == TaskReport.task_id).join(Project, Project.id == Task.project_id).where(Project.project_manager_id == user.id)
    else:
        statement = statement.where(TaskReport.submitted_by_id == user.id)
    if status_filter:
        statement = statement.where(TaskReport.status == status_filter)
    return list(db.scalars(statement.order_by(TaskReport.created_at.desc(), TaskReport.id.desc()).limit(limit).offset(offset)).all())


def update_task_report(db: Session, user: User, report: TaskReport, payload: TaskReportUpdate) -> TaskReport:
    task = db.get(Task, report.task_id)
    project = db.get(Project, task.project_id) if task else None
    if project is None or project.workspace_id != user.workspace_id:
        raise PermissionError("You do not have access to this report.")
    if user.role != "admin" and not (user.role == "project_manager" and project.project_manager_id == user.id):
        raise PermissionError("Only the assigned project manager or an Admin can respond to this report.")
    values = payload.model_dump(exclude_unset=True)
    if "manager_response" in values and values["manager_response"] is not None:
        values["manager_response"] = values["manager_response"].strip() or None
    for field, value in values.items():
        setattr(report, field, value)
    if values.get("status") == "resolved":
        report.resolved_at = datetime.now(timezone.utc)
    elif values.get("status") in {"open", "acknowledged"}:
        report.resolved_at = None
    try:
        db.commit()
        db.refresh(report)
        return report
    except Exception:
        db.rollback()
        raise
