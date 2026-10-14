from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.dependencies.auth import (
    DbSession,
    get_current_user,
    require_roles,
)
from app.models import User
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate
from app.schemas.task_report import TaskReportCreate, TaskReportResponse
from app.models import TaskReport
from app.services.task_report_service import create_task_report
from sqlalchemy import select
from app.services.task_service import (
    create_task,
    get_task_for_user,
    list_tasks,
    update_task,
)

router = APIRouter(prefix="/tasks", tags=["Tasks"])

CurrentUser = Annotated[User, Depends(get_current_user)]
ManagerOrAdmin = Annotated[
    User,
    Depends(require_roles("admin", "project_manager")),
]

StatusFilter = Literal[
    "To Do",
    "In Progress",
    "In Review",
    "Changes Required",
    "Done",
]


@router.post(
    "",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_task_endpoint(
    payload: TaskCreate,
    db: DbSession,
    user: ManagerOrAdmin,
):
    try:
        return create_task(db, user, payload)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("", response_model=list[TaskResponse])
def list_tasks_endpoint(
    db: DbSession,
    user: CurrentUser,
    project_id: int | None = Query(default=None, gt=0),
    task_status: StatusFilter | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    return list_tasks(
        db=db,
        user=user,
        project_id=project_id,
        status=task_status,
        limit=limit,
        offset=offset,
    )


@router.get("/{task_id}", response_model=TaskResponse)
def get_task_endpoint(
    task_id: int,
    db: DbSession,
    user: CurrentUser,
):
    task = get_task_for_user(db, user, task_id)

    if task is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found.",
        )

    return task


@router.post("/{task_id}/reports", response_model=TaskReportResponse, status_code=status.HTTP_201_CREATED)
def create_task_report_endpoint(task_id: int, payload: TaskReportCreate, db: DbSession, user: CurrentUser):
    task = get_task_for_user(db, user, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    try:
        return create_task_report(db, user, task, payload)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


@router.get("/{task_id}/reports", response_model=list[TaskReportResponse])
def list_task_reports_for_task(task_id: int, db: DbSession, user: CurrentUser):
    task = get_task_for_user(db, user, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    statement = select(TaskReport).where(TaskReport.task_id == task.id, TaskReport.workspace_id == user.workspace_id)
    if user.role == "employee":
        statement = statement.where(TaskReport.submitted_by_id == user.id)
    return list(db.scalars(statement.order_by(TaskReport.created_at.desc(), TaskReport.id.desc())).all())


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task_endpoint(
    task_id: int,
    payload: TaskUpdate,
    db: DbSession,
    user: CurrentUser,
):
    task = get_task_for_user(db, user, task_id)

    if task is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found.",
        )

    try:
        return update_task(db, user, task, payload)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc