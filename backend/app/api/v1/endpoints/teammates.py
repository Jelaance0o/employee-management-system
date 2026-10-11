
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.dependencies.auth import DbSession, require_roles
from app.models.user import User
from app.schemas.auth import UserResponse
from app.schemas.teammate import TeammateRoleUpdate
from app.services.teammate_service import (
    deactivate_teammate,
    get_teammate,
    list_teammates,
)

from app.schemas.teammate import TeammateRoleUpdate
from app.services.teammate_service import update_teammate_role

router = APIRouter(prefix="/teammates", tags=["Teammates"])

AdminUser = Annotated[User, Depends(require_roles("admin"))]


@router.get("", response_model=list[UserResponse])
def get_teammates(
    admin: AdminUser,
    db: DbSession,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return list_teammates(
        db,
        admin.workspace_id,
        limit=limit,
        offset=offset,
    )


@router.get("/{user_id}", response_model=UserResponse)
def get_teammate_details(
    user_id: int,
    admin: AdminUser,
    db: DbSession,
):
    teammate = get_teammate(db, admin.workspace_id, user_id)

    if teammate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teammate not found.",
        )

    return teammate


@router.patch(
    "/{user_id}/deactivate",
    response_model=UserResponse,
)
def deactivate_teammate_endpoint(
    user_id: int,
    admin: AdminUser,
    db: DbSession,
):
    try:
        return deactivate_teammate(
            db,
            admin.workspace_id,
            user_id,
            admin.id,
        )
    except ValueError as exc:
        message = str(exc)

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
                if message == "Teammate not found."
                else status.HTTP_400_BAD_REQUEST
            ),
            detail=message,
        ) from exc



@router.patch("/{user_id}/role")
def update_teammate_role_endpoint(
    user_id: int,
    payload: TeammateRoleUpdate,
    db: DbSession,
    user: AdminUser,
):
    try:
        teammate = update_teammate_role(
            db=db,
            workspace_id=user.workspace_id,
            target_user_id=user_id,
            new_role=payload.role,
            acting_admin_id=user.id,
        )
        return UserResponse.model_validate(teammate)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc