from typing import Literal

from pydantic import BaseModel


class TeammateRoleUpdate(BaseModel):
    role: Literal["admin", "project_manager", "employee"]

from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.auth import UserResponse
from app.schemas.task_report import TaskReportResponse


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
    projects: list[MemberProjectSummary] = Field(default_factory=list)
    task_stats: MemberTaskStats
    recent_tasks: list[MemberTaskSummary] = Field(default_factory=list)
    recent_reports: list[TaskReportResponse] = Field(default_factory=list)
