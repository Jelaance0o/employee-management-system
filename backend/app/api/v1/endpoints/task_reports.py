from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select

from app.dependencies.auth import DbSession, get_current_user, require_roles
from app.models import Task, TaskReport, User
from app.schemas.task_report import TaskReportResponse, TaskReportUpdate
from app.services.task_report_service import list_task_reports, update_task_report

router = APIRouter(prefix="/task-reports", tags=["Task Reports"])
CurrentUser = Annotated[User, Depends(get_current_user)]
Reviewer = Annotated[User, Depends(require_roles("admin", "project_manager"))]
ReportStatusFilter = Literal["open", "acknowledged", "resolved"]


@router.get("", response_model=list[TaskReportResponse])
def get_task_reports(
    user: CurrentUser,
    db: DbSession,
    report_status: ReportStatusFilter | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    return list_task_reports(db, user, status_filter=report_status, limit=limit, offset=offset)


@router.patch("/{report_id}", response_model=TaskReportResponse)
def patch_task_report(report_id: int, payload: TaskReportUpdate, reviewer: Reviewer, db: DbSession):
    report = db.scalar(select(TaskReport).where(TaskReport.id == report_id, TaskReport.workspace_id == reviewer.workspace_id))
    if report is None:
        raise HTTPException(status_code=404, detail="Task report not found.")
    try:
        return update_task_report(db, reviewer, report, payload)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
