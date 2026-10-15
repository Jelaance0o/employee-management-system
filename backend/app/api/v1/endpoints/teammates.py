
from typing import Annotated

from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from app.dependencies.auth import DbSession, get_current_user, require_roles
from app.models import Project, ProjectMember, Task, TaskReport, User
from app.schemas.auth import UserResponse
from app.schemas.profile import UserProfileUpdate
from app.schemas.teammate import (
    ManagerMemberDetail,
    MemberProjectSummary,
    MemberTaskStats,
    MemberTaskSummary,
    TeammateRoleUpdate,
)
from app.services.teammate_service import (
    deactivate_teammate,
    get_teammate,
    list_teammates,
)

from app.services.teammate_service import update_teammate_role

router = APIRouter(prefix="/teammates", tags=["Teammates"])

AdminUser = Annotated[User, Depends(require_roles("admin"))]
CurrentUser = Annotated[User, Depends(get_current_user)]
ManagerUser = Annotated[User, Depends(require_roles("project_manager"))]


@router.patch("/me/profile", response_model=UserResponse)
def update_my_profile(payload: UserProfileUpdate, user: CurrentUser, db: DbSession):
    values = payload.model_dump(exclude_unset=True)
    for field, value in values.items():
        setattr(user, field, value)
    try:
        db.commit()
        db.refresh(user)
        return user
    except Exception:
        db.rollback()
        raise


@router.get("/manager/members", response_model=list[UserResponse])
def get_manager_members(manager: ManagerUser, db: DbSession):
    statement = (
        select(User)
        .join(ProjectMember, ProjectMember.user_id == User.id)
        .join(Project, Project.id == ProjectMember.project_id)
        .where(
            Project.workspace_id == manager.workspace_id,
            Project.project_manager_id == manager.id,
            User.workspace_id == manager.workspace_id,
            User.is_active.is_(True),
            User.role != "admin",
            User.id != manager.id,
        )
        .distinct()
        .order_by(User.full_name.asc(), User.id.asc())
    )
    return list(db.scalars(statement).all())


@router.get("/manager/members/{user_id}", response_model=ManagerMemberDetail)
def get_manager_member_detail(user_id: int, manager: ManagerUser, db: DbSession):
    member = db.scalar(
        select(User).where(
            User.id == user_id,
            User.workspace_id == manager.workspace_id,
            User.is_active.is_(True),
            User.role != "admin",
            User.id != manager.id,
            select(ProjectMember.user_id)
            .join(Project, Project.id == ProjectMember.project_id)
            .where(
                ProjectMember.user_id == User.id,
                Project.workspace_id == manager.workspace_id,
                Project.project_manager_id == manager.id,
            )
            .exists(),
        )
    )
    if member is None:
        raise HTTPException(status_code=404, detail="Team member not found in your managed projects.")

    projects = list(db.scalars(
        select(Project)
        .join(ProjectMember, ProjectMember.project_id == Project.id)
        .where(
            Project.workspace_id == manager.workspace_id,
            Project.project_manager_id == manager.id,
            ProjectMember.user_id == member.id,
        )
        .order_by(Project.name.asc())
    ).all())
    project_ids = [project.id for project in projects]
    tasks = []
    if project_ids:
        tasks = list(db.scalars(
            select(Task)
            .where(
                Task.workspace_id == manager.workspace_id,
                Task.project_id.in_(project_ids),
                Task.assigned_to_id == member.id,
            )
            .order_by(Task.updated_at.desc(), Task.id.desc())
        ).all())

    today = date.today()
    completed = sum(task.status == "Done" for task in tasks)
    overdue = sum(task.status != "Done" and task.due_date is not None and task.due_date < today for task in tasks)
    result = UserResponse.model_validate(member).model_dump()
    task_ids = [task.id for task in tasks]
    reports = []
    if task_ids:
        reports = list(db.scalars(
            select(TaskReport)
            .where(
                TaskReport.workspace_id == manager.workspace_id,
                TaskReport.task_id.in_(task_ids),
            )
            .order_by(TaskReport.created_at.desc(), TaskReport.id.desc())
            .limit(10)
        ).all())

    result.update({
        "projects": [MemberProjectSummary(id=p.id, name=p.name, status=p.status, priority=p.priority, due_date=p.due_date).model_dump() for p in projects],
        "task_stats": MemberTaskStats(total=len(tasks), completed=completed, pending=len(tasks)-completed, overdue=overdue).model_dump(),
        "recent_tasks": [MemberTaskSummary(id=t.id, title=t.title, status=t.status, priority=t.priority, due_date=t.due_date, project_id=t.project_id, project_name=t.project.name, updated_at=t.updated_at).model_dump() for t in tasks[:10]],
        "recent_reports": reports,
    })
    return result


@router.get("/{user_id}/details", response_model=ManagerMemberDetail)
def get_teammate_details_with_work_overview(
    user_id: int,
    admin: AdminUser,
    db: DbSession,
):
    """Return a minimal profile and work overview for an Admin's workspace teammate."""
    member = db.scalar(
        select(User).where(
            User.id == user_id,
            User.workspace_id == admin.workspace_id,
        )
    )
    if member is None:
        raise HTTPException(status_code=404, detail="Teammate not found.")

    projects = list(db.scalars(
        select(Project)
        .outerjoin(ProjectMember, ProjectMember.project_id == Project.id)
        .where(
            Project.workspace_id == admin.workspace_id,
            or_(
                Project.project_manager_id == member.id,
                ProjectMember.user_id == member.id,
            ),
        )
        .distinct()
        .order_by(Project.name.asc(), Project.id.asc())
    ).all())

    tasks = list(db.scalars(
        select(Task)
        .where(
            Task.workspace_id == admin.workspace_id,
            Task.assigned_to_id == member.id,
        )
        .order_by(Task.updated_at.desc(), Task.id.desc())
    ).all())

    today = date.today()
    completed = sum(task.status == "Done" for task in tasks)
    overdue = sum(
        task.status != "Done" and task.due_date is not None and task.due_date < today
        for task in tasks
    )
    task_ids = [task.id for task in tasks]
    reports = []
    if task_ids:
        reports = list(db.scalars(
            select(TaskReport)
            .where(
                TaskReport.workspace_id == admin.workspace_id,
                TaskReport.task_id.in_(task_ids),
            )
            .order_by(TaskReport.created_at.desc(), TaskReport.id.desc())
            .limit(10)
        ).all())

    result = UserResponse.model_validate(member).model_dump()
    result.update({
        "projects": [
            MemberProjectSummary(
                id=project.id,
                name=project.name,
                status=project.status,
                priority=project.priority,
                due_date=project.due_date,
            ).model_dump()
            for project in projects
        ],
        "task_stats": MemberTaskStats(
            total=len(tasks),
            completed=completed,
            pending=len(tasks) - completed,
            overdue=overdue,
        ).model_dump(),
        "recent_tasks": [
            MemberTaskSummary(
                id=task.id,
                title=task.title,
                status=task.status,
                priority=task.priority,
                due_date=task.due_date,
                project_id=task.project_id,
                project_name=task.project.name,
                updated_at=task.updated_at,
            ).model_dump()
            for task in tasks[:10]
        ],
        "recent_reports": reports,
    })
    return result


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