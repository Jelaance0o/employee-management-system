from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Project, ProjectMember, Task, User
from app.schemas.task import TaskCreate, TaskUpdate


def get_project_access(
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

    if project is None:
        return None

    if user.role == "admin":
        return project

    if (
        user.role == "project_manager"
        and project.project_manager_id == user.id
    ):
        return project

    membership = db.scalar(
        select(ProjectMember.project_id).where(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == user.id,
        )
    )

    return project if membership is not None else None


def validate_assignee(
    db: Session,
    project: Project,
    user_id: int | None,
) -> None:
    if user_id is None:
        return

    assignee = db.scalar(
        select(User).where(
            User.id == user_id,
            User.workspace_id == project.workspace_id,
            User.is_active.is_(True),
        )
    )

    if assignee is None:
        raise ValueError("The assigned teammate is not active in this workspace.")

    if assignee.role != "employee":
        raise ValueError("Only regular teammates can be assigned tasks.")

    membership = db.scalar(
        select(ProjectMember.project_id).where(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == assignee.id,
        )
    )

    if membership is None:
        raise ValueError("The assigned teammate must be a member of this project.")


def create_task(
    db: Session,
    user: User,
    payload: TaskCreate,
) -> Task:
    project = get_project_access(db, user, payload.project_id)

    if project is None:
        raise PermissionError("You do not have access to this project.")

    if user.role not in ("admin", "project_manager"):
        raise PermissionError("Only Admins and Project Managers can create tasks.")
    if user.role == "project_manager" and project.project_manager_id != user.id:
        raise PermissionError("Only the assigned Project Manager can create tasks in this project.")

    validate_assignee(db, project, payload.assigned_to_id)

    task = Task(
        workspace_id=user.workspace_id,
        project_id=project.id,
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        assigned_to_id=payload.assigned_to_id,
        due_date=payload.due_date,
        created_by_id=user.id,
        status="To Do",
    )

    db.add(task)

    try:
        db.commit()
        db.refresh(task)
        return task
    except Exception:
        db.rollback()
        raise


def list_tasks(
    db: Session,
    user: User,
    project_id: int | None = None,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Task]:
    statement = select(Task).where(
        Task.workspace_id == user.workspace_id
    )

    if project_id is not None:
        project = get_project_access(db, user, project_id)
        if project is None:
            return []

        statement = statement.where(Task.project_id == project_id)
        # A project member must not be able to list other teammates' tasks
        # by adding a project_id filter to the task endpoint.
        if user.role == "employee" or (
            user.role == "project_manager" and project.project_manager_id != user.id
        ):
            statement = statement.where(Task.assigned_to_id == user.id)

    elif user.role == "project_manager":
        managed_projects = select(Project.id).where(
            Project.workspace_id == user.workspace_id,
            Project.project_manager_id == user.id,
        )
        # Project Managers see every task in projects they manage, plus only
        # their own assigned tasks elsewhere in the workspace.
        statement = statement.where(
            Task.project_id.in_(managed_projects)
            | (Task.assigned_to_id == user.id)
        )

    elif user.role != "admin":
        statement = statement.where(Task.assigned_to_id == user.id)

    if status is not None:
        statement = statement.where(Task.status == status)

    statement = statement.order_by(
        Task.created_at.desc(),
        Task.id.desc(),
    ).limit(limit).offset(offset)

    return list(db.scalars(statement).all())


def get_task_for_user(
    db: Session,
    user: User,
    task_id: int,
) -> Task | None:
    task = db.scalar(
        select(Task).where(
            Task.id == task_id,
            Task.workspace_id == user.workspace_id,
        )
    )

    if task is None:
        return None

    if user.role == "admin":
        return task

    project = db.get(Project, task.project_id)

    if project is None:
        return None

    if (
        user.role == "project_manager"
        and project.project_manager_id == user.id
    ):
        return task

    if task.assigned_to_id == user.id:
        return task

    return None


def update_task(
    db: Session,
    user: User,
    task: Task,
    payload: TaskUpdate,
) -> Task:
    project = db.get(Project, task.project_id)

    if project is None or project.workspace_id != user.workspace_id:
        raise PermissionError("You do not have access to this task.")

    is_admin = user.role == "admin"
    is_project_manager = (
        user.role == "project_manager"
        and project.project_manager_id == user.id
    )
    is_assignee = task.assigned_to_id == user.id

    if not (is_admin or is_project_manager or is_assignee):
        raise PermissionError("You cannot update this task.")

    values = payload.model_dump(exclude_unset=True)

    # Employees may update only the status of their assigned tasks.
    if is_assignee and not (is_admin or is_project_manager):
        if set(values) - {"status"}:
            raise PermissionError(
                "Employees can update the status of their own tasks only."
            )

        allowed_employee_transitions = {
            "To Do": {"In Progress"},
            "In Progress": {"In Review"},
            "Changes Required": {"In Progress"},
            "In Review": set(),
            "Done": set(),
        }

        new_status = values.get("status")
        if (
            new_status is not None
            and new_status != task.status
            and new_status not in allowed_employee_transitions[task.status]
        ):
            raise PermissionError(
                "That status transition requires a reviewer or Admin."
            )

    # Reviewers can approve or request changes when a task is in review.
    if not is_admin and is_project_manager and "status" in values:
        new_status = values["status"]

        if task.status == "In Review" and new_status not in {
            "Done",
            "Changes Required",
            "In Review",
        }:
            raise ValueError(
                "A task in review can be approved or returned for changes."
            )

    if "assigned_to_id" in values:
        validate_assignee(db, project, values["assigned_to_id"])

    new_status = values.get("status", task.status)

    if new_status == "Done" and task.status != "Done":
        task.completed_at = datetime.now(timezone.utc)
    elif new_status != "Done":
        task.completed_at = None

    for field, value in values.items():
        setattr(task, field, value)

    try:
        db.commit()
        db.refresh(task)
        return task
    except Exception:
        db.rollback()
        raise