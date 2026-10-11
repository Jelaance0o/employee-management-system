
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.dependencies.auth import DbSession, get_current_user, require_roles
from app.models import User
from app.schemas.project import (
    ProjectCreate,
    ProjectMemberCreate,
    ProjectResponse,
    ProjectUpdate,
)
from app.schemas.auth import UserResponse
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
