
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, select
from sqlalchemy.orm import Session

from app.dependencies.auth import DbSession, get_current_user, require_roles
from app.models import ProjectMember, Task, User
from app.schemas.project import (
    ProjectCreate,
    ProjectMemberCreate,
    ProjectResponse,
    ProjectUpdate,
)
from app.schemas.auth import UserResponse
from app.schemas.task import TaskAssigneeResponse, TaskResponse
from app.services.project_service import (
    add_project_member,
    create_project,
    get_project_for_user,
    list_projects,
    update_project,
)

router = APIRouter(prefix="/projects", tags=["Projects"])

CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(require_roles("admin"))]


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_project_endpoint(
    payload: ProjectCreate,
    admin: AdminUser,
    db: DbSession,
):
    try:
        return create_project(db, admin, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get("", response_model=list[ProjectResponse])
def get_projects(
    user: CurrentUser,
    db: DbSession,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return list_projects(db, user, limit=limit, offset=offset)


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project_details(
    project_id: int,
    user: CurrentUser,
    db: DbSession,
):
    project = get_project_for_user(db, user, project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project_endpoint(
    project_id: int,
    payload: ProjectUpdate,
    user: CurrentUser,
    db: DbSession,
):
    project = get_project_for_user(db, user, project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    if user.role != "admin" and project.project_manager_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an Admin or the assigned project manager can update this project.",
        )

    try:
        return update_project(db, project, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get(
    "/{project_id}/top-tasks",
    response_model=list[TaskResponse],
)
def get_project_top_tasks_endpoint(
    project_id: int,
    user: CurrentUser,
    db: DbSession,
):
    """Return the three highest-priority tasks for an accessible project."""
    project = get_project_for_user(db, user, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")

    priority_order = case(
        (Task.priority == "urgent", 0),
        (Task.priority == "high", 1),
        (Task.priority == "medium", 2),
        (Task.priority == "low", 3),
        else_=4,
    )
    statement = select(Task).where(
        Task.workspace_id == project.workspace_id,
        Task.project_id == project.id,
    )
    # Employees may only see their own assigned tasks, even when they are
    # project members. Admins and project managers retain project-level access.
    if user.role == "employee":
        statement = statement.where(Task.assigned_to_id == user.id)

    tasks = db.scalars(
        statement
        .order_by(
            priority_order.asc(),
            Task.due_date.is_(None).asc(),
            Task.due_date.asc(),
            Task.created_at.desc(),
            Task.id.desc(),
        )
        .limit(3)
    ).all()
    return list(tasks)


@router.get(
    "/{project_id}/eligible-assignees",
    response_model=list[TaskAssigneeResponse],
)
def get_project_eligible_assignees_endpoint(
    project_id: int,
    user: CurrentUser,
    db: DbSession,
):
    """Return only active employee members eligible for task assignment."""
    project = get_project_for_user(db, user, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")

    if user.role != "admin" and project.project_manager_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="Only an Admin or the assigned project manager can view eligible task assignees.",
        )

    members = db.scalars(
        select(User)
        .join(ProjectMember, ProjectMember.user_id == User.id)
        .where(
            ProjectMember.project_id == project.id,
            User.workspace_id == project.workspace_id,
            User.is_active.is_(True),
            User.role == "employee",
        )
        .order_by(User.full_name.asc(), User.id.asc())
    ).all()
    return list(members)


@router.get(
    "/{project_id}/members",
    response_model=list[UserResponse],
)
def list_project_members_endpoint(
    project_id: int,
    user: CurrentUser,
    db: DbSession,
):
    """List active members of a project, plus its assigned project manager."""
    project = get_project_for_user(db, user, project_id)

    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")

    if user.role != "admin" and project.project_manager_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="Only an Admin or the assigned project manager can list project members.",
        )

    members = list(
        db.scalars(
            select(User)
            .join(ProjectMember, ProjectMember.user_id == User.id)
            .where(
                ProjectMember.project_id == project.id,
                User.workspace_id == project.workspace_id,
                User.is_active.is_(True),
            )
            .order_by(User.full_name.asc(), User.id.asc())
        ).all()
    )

    if project.project_manager_id is not None:
        manager = db.scalar(
            select(User).where(
                User.id == project.project_manager_id,
                User.workspace_id == project.workspace_id,
                User.is_active.is_(True),
            )
        )
        if manager is not None and all(member.id != manager.id for member in members):
            members.append(manager)

    return sorted(members, key=lambda member: (member.full_name.casefold(), member.id))


@router.get(
    "/{project_id}/available-members",
    response_model=list[UserResponse],
)
def list_available_project_members_endpoint(
    project_id: int,
    user: CurrentUser,
    db: DbSession,
):
    """List active workspace teammates who are not already project members."""
    project = get_project_for_user(db, user, project_id)

    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")

    if user.role != "admin" and project.project_manager_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="Only an Admin or the assigned project manager can add project members.",
        )

    member_ids = select(ProjectMember.user_id).where(
        ProjectMember.project_id == project.id
    )
    statement = select(User).where(
        User.workspace_id == project.workspace_id,
        User.is_active.is_(True),
        ~User.id.in_(member_ids),
    )
    if project.project_manager_id is not None:
        statement = statement.where(User.id != project.project_manager_id)

    return list(
        db.scalars(statement.order_by(User.full_name.asc(), User.id.asc())).all()
    )


@router.post(
    "/{project_id}/members",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_project_member_endpoint(
    project_id: int,
    payload: ProjectMemberCreate,
    user: CurrentUser,
    db: DbSession,
):
    project = get_project_for_user(db, user, project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    if user.role != "admin" and project.project_manager_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an Admin or the assigned project manager can add project members.",
        )

    try:
        return add_project_member(
            db,
            project,
            payload.user_id,
            user.id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
