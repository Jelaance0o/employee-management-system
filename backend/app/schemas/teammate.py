from typing import Literal

from pydantic import BaseModel


class TeammateRoleUpdate(BaseModel):
    role: Literal["admin", "project_manager", "employee"]

from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.auth import UserResponse


class MemberProjectSummary(BaseModel):
    id: int
    name: str
    status: str
    priority: str
    due_date: date | None = None


class MemberTaskSummary(BaseModel):
    id: int
    title: str
    status: str
    priority: str
    due_date: date | None = None
    project_id: int
    project_name: str
    updated_at: datetime


class MemberTaskStats(BaseModel):
    total: int
    completed: int
    pending: int
    overdue: int


class ManagerMemberDetail(UserResponse):
    projects: list[MemberProjectSummary] = []
    task_stats: MemberTaskStats
    recent_tasks: list[MemberTaskSummary] = []
