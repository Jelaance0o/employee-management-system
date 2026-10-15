
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.config import FRONTEND_ORIGIN
from app.dependencies.auth import DbSession, require_roles
from app.models.user import User
from app.schemas.auth import UserResponse
from app.schemas.invitation import (
    InvitationAccept,
    InvitationCreate,
    InvitationCreated,
    InvitationValidation,
)
from app.services.invitation_service import (
    accept_invitation,
    create_invitation,
    find_valid_invitation,
)

router = APIRouter(prefix="/invitations", tags=["Invitations"])

AdminUser = Annotated[User, Depends(require_roles("admin"))]


@router.post(
    "",
    response_model=InvitationCreated,
    status_code=status.HTTP_201_CREATED,
)
def invite_teammate(
    payload: InvitationCreate,
    admin: AdminUser,
    db: DbSession,
):
    try:
        invitation, raw_token = create_invitation(
            db,
            workspace_id=admin.workspace_id,
            invited_by_id=admin.id,
            email=str(payload.email).lower(),
            role=payload.role,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    invitation_url = (
        f"{FRONTEND_ORIGIN.rstrip('/')}"
        f"/accept-invitation?token={raw_token}"
    )

    return InvitationCreated(
        email=invitation.email,
        role=invitation.role,
        invitation_url=invitation_url,
        expires_at=invitation.expires_at,
    )


@router.get(
    "/validate",
    response_model=InvitationValidation,
)
def validate_invitation(
    token: Annotated[str, Query(min_length=32, max_length=200)],
    db: DbSession,
):
    try:
        invitation = find_valid_invitation(db, token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return InvitationValidation(
        valid=True,
        email=invitation.email,
        role=invitation.role,
        expires_at=invitation.expires_at,
    )


@router.post(
    "/accept",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def accept_teammate_invitation(
    payload: InvitationAccept,
    db: DbSession,
):
    try:
        user = accept_invitation(
            db,
            token=payload.token,
            full_name=payload.full_name,
            password=payload.password,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return user
