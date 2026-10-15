
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import Invitation, User

INVITATION_HOURS = 24
ALLOWED_INVITEE_ROLES = {"employee", "project_manager"}


def hash_invitation_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def find_valid_invitation(
    db: Session,
    token: str,
    *,
    lock: bool = False,
) -> Invitation:
    statement = select(Invitation).where(
        Invitation.token_hash == hash_invitation_token(token)
    )

    if lock:
        statement = statement.with_for_update()

    invitation = db.scalar(statement)

    if invitation is None:
        raise ValueError("Invitation is invalid or no longer available.")

    
    now = datetime.now(timezone.utc)

    if invitation.accepted_at is not None:
        raise ValueError("This invitation has already been accepted.")

    if invitation.revoked_at is not None:
        raise ValueError("This invitation has been revoked.")

    expires_at = invitation.expires_at

    # SQLite may return timezone-naive datetimes even when
    # DateTime(timezone=True) is configured. Our application
    # stores and interprets invitation timestamps as UTC.
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at <= now:
        raise ValueError("This invitation has expired.")

    return invitation



def create_invitation(
    db: Session,
    *,
    workspace_id: int,
    invited_by_id: int,
    email: str,
    role: str,
) -> tuple[Invitation, str]:
    email = email.strip().lower()

    if role not in ALLOWED_INVITEE_ROLES:
        raise ValueError("This role cannot be assigned through invitations.")

    existing_user = db.scalar(
        select(User).where(User.email == email)
    )

    if existing_user is not None:
        raise ValueError("An account already exists for this email.")

    now = datetime.now(timezone.utc)

    try:
        # Revoke older pending invitations for this workspace and email.
        old_invitations = db.scalars(
            select(Invitation)
            .where(
                Invitation.workspace_id == workspace_id,
                Invitation.email == email,
                Invitation.accepted_at.is_(None),
                Invitation.revoked_at.is_(None),
            )
            .with_for_update()
        ).all()

        for old in old_invitations:
            old.revoked_at = now

        raw_token = secrets.token_urlsafe(32)

        invitation = Invitation(
            workspace_id=workspace_id,
            invited_by_id=invited_by_id,
            email=email,
            role=role,
            token_hash=hash_invitation_token(raw_token),
            expires_at=now + timedelta(hours=INVITATION_HOURS),
        )

        db.add(invitation)
        db.commit()
        db.refresh(invitation)

        return invitation, raw_token

    except Exception:
        db.rollback()
        raise


def accept_invitation(
    db: Session,
    *,
    token: str,
    full_name: str,
    password: str,
) -> User:
    try:
        invitation = find_valid_invitation(db, token, lock=True)

        existing_user = db.scalar(
            select(User).where(User.email == invitation.email)
        )

        if existing_user is not None:
            raise ValueError("An account already exists for this email.")

        if invitation.role not in ALLOWED_INVITEE_ROLES:
            raise ValueError("The invitation contains an invalid role.")

        user = User(
            workspace_id=invitation.workspace_id,
            full_name=full_name.strip(),
            email=invitation.email.strip().lower(),
            password_hash=hash_password(password),
            role=invitation.role,
            is_active=True,
        )

        db.add(user)
        invitation.accepted_at = datetime.now(timezone.utc)

        # The account creation and invitation consumption commit together.
        db.commit()
        db.refresh(user)

        return user

    except ValueError:
        db.rollback()
        raise

    except IntegrityError as exc:
        db.rollback()
        raise ValueError(
            "The account could not be created. It may already exist."
        ) from exc

    except Exception:
        db.rollback()
        raise
