
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.user import User


def list_teammates(
    db: Session,
    workspace_id: int,
    *,
    limit: int = 20,
    offset: int = 0,
) -> list[User]:
    statement = (
        select(User)
        .where(User.workspace_id == workspace_id)
        .order_by(User.created_at.desc(), User.id.desc())
        .limit(limit)
        .offset(offset)
    )

    return list(db.scalars(statement).all())


def get_teammate(
    db: Session,
    workspace_id: int,
    user_id: int,
) -> User | None:
    return db.scalar(
        select(User).where(
            User.id == user_id,
            User.workspace_id == workspace_id,
        )
    )


def deactivate_teammate(
    db: Session,
    workspace_id: int,
    user_id: int,
    acting_admin_id: int,
) -> User:
    teammate = get_teammate(db, workspace_id, user_id)

    if teammate is None:
        raise ValueError("Teammate not found.")

    if teammate.id == acting_admin_id:
        raise ValueError("You cannot deactivate your own account here.")

    if not teammate.is_active:
        return teammate

    if teammate.role == "admin":
        active_admin_count = db.scalar(
            select(func.count())
            .select_from(User)
            .where(
                User.workspace_id == workspace_id,
                User.role == "admin",
                User.is_active.is_(True),
            )
        ) or 0

        if active_admin_count <= 1:
            raise ValueError(
                "You cannot deactivate the workspace's last active Admin."
            )

    teammate.is_active = False

    try:
        db.commit()
        db.refresh(teammate)
        return teammate
    except Exception:
        db.rollback()
        raise
