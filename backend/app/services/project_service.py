
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import Project, ProjectMember, User
from app.schemas.project import ProjectCreate, ProjectUpdate


def validate_project_manager(
    db: Session,
    workspace_id: int,
    manager_id: int | None,
) -> None:
    if manager_id is None:
        return

    manager = db.scalar(
        select(User).where(
            User.id == manager_id,
            User.workspace_id == workspace_id,
            User.role == "project_manager",
            User.is_active.is_(True),
        )
    )

    if manager is None:
        raise ValueError(
            "Project manager must be an active project manager "
            "in this workspace."
        )


def create_project(
    db: Session,
    admin: User,
    payload: ProjectCreate,
) -> Project:
    validate_project_manager(
        db, admin.workspace_id, payload.project_manager_id
    )

    project = Project(
        workspace_id=admin.workspace_id,
        created_by_id=admin.id,
        **payload.model_dump(),
    )

    db.add(project)

    try:
        db.commit()
        db.refresh(project)
        return project
    except Exception:
        db.rollback()
        raise


def list_projects(
    db: Session,
    user: User,
    *,
    limit: int = 20,
    offset: int = 0,
) -> list[Project]:
    statement = select(Project).where(
        Project.workspace_id == user.workspace_id
    )

    if user.role != "admin":
        membership_project_ids = select(
            ProjectMember.project_id
        ).where(ProjectMember.user_id == user.id)

        statement = statement.where(
            or_(
                Project.project_manager_id == user.id,
                Project.id.in_(membership_project_ids),
            )
        )

    statement = (
        statement.order_by(Project.created_at.desc(), Project.id.desc())
        .limit(limit)
        .offset(offset)
    )

    return list(db.scalars(statement).all())


def get_project_for_user(
    db: Session,
    user: User,
    project_id: int,
) -> Project | None:
    project = db.scalar(
        select(Project).where(
            Project.id == project_id,
            Project.workspace_id == user.workspace_id,
        )
    )

    if project is None or user.role == "admin":
        return project

    if project.project_manager_id == user.id:
        return project

    membership = db.scalar(
        select(ProjectMember.project_id).where(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == user.id,
        )
    )

    return project if membership is not None else None


def update_project(
    db: Session,
    project: Project,
    payload: ProjectUpdate,
) -> Project:
    values = payload.model_dump(exclude_unset=True)

    if "project_manager_id" in values:
        validate_project_manager(
            db,
            project.workspace_id,
            values["project_manager_id"],
        )

    proposed_start = values.get("start_date", project.start_date)
    proposed_due = values.get("due_date", project.due_date)

    if proposed_start and proposed_due and proposed_due < proposed_start:
        raise ValueError("Due date cannot be before start date.")

    for field, value in values.items():
        setattr(project, field, value)

    try:
        db.commit()
        db.refresh(project)
        return project
    except Exception:
        db.rollback()
        raise


def add_project_member(
    db: Session,
    project: Project,
    user_id: int,
    added_by_id: int,
) -> User:
    user = db.scalar(
        select(User).where(
            User.id == user_id,
            User.workspace_id == project.workspace_id,
            User.is_active.is_(True),
        )
    )

    if user is None:
        raise ValueError(
            "Active teammate not found in this workspace."
        )

    existing = db.get(ProjectMember, (project.id, user.id))

    if existing is not None:
        raise ValueError("This teammate is already on the project.")

    membership = ProjectMember(
        project_id=project.id,
        user_id=user.id,
        added_by_id=added_by_id,
    )

    db.add(membership)

    try:
        db.commit()
        return user
    except Exception:
        db.rollback()
        raise
