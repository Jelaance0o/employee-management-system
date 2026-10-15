from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


TaskStatus = Literal[
    "To Do",
    "In Progress",
    "In Review",
    "Changes Required",
    "Done",
]

TaskPriority = Literal["low", "medium", "high", "urgent"]


class TaskCreate(BaseModel):
    project_id: int = Field(gt=0)
    title: str = Field(min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    priority: TaskPriority = "medium"
    assigned_to_id: int | None = Field(default=None, gt=0)
    due_date: date | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    assigned_to_id: int | None = Field(default=None, gt=0)
    due_date: date | None = None

    @model_validator(mode="after")
    def reject_null_required_fields(self):
        for field in ("title", "status", "priority"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null.")
        return self


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    workspace_id: int
    project_id: int
    title: str
    description: str | None
    status: str
    priority: str
    created_by_id: int
    assigned_to_id: int | None
    due_date: date | None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None


class TaskAssigneeResponse(BaseModel):
    """Minimal public fields needed by the task assignee selector."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    role: str
    is_active: bool

