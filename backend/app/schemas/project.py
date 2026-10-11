
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

ProjectStatus = Literal[
    "planned", "active", "on_hold", "completed", "cancelled"
]
ProjectPriority = Literal["low", "medium", "high", "urgent"]


class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    status: ProjectStatus = "planned"
    priority: ProjectPriority = "medium"
    start_date: date | None = None
    due_date: date | None = None
    project_manager_id: int | None = None

    @model_validator(mode="after")
    def validate_dates(self):
        if (
            self.start_date
            and self.due_date
            and self.due_date < self.start_date
        ):
            raise ValueError("Due date cannot be before start date.")
        return self


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    status: ProjectStatus | None = None
    priority: ProjectPriority | None = None
    start_date: date | None = None
    due_date: date | None = None
    project_manager_id: int | None = None

    @model_validator(mode="after")
    def validate_dates(self):
        if (
            self.start_date
            and self.due_date
            and self.due_date < self.start_date
        ):
            raise ValueError("Due date cannot be before start date.")
        return self


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    workspace_id: int
    name: str
    description: str | None
    status: str
    priority: str
    start_date: date | None
    due_date: date | None
    created_by_id: int
    project_manager_id: int | None
    created_at: datetime
    updated_at: datetime


class ProjectMemberCreate(BaseModel):
    user_id: int = Field(gt=0)
