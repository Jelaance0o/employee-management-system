from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

ReportType = Literal["progress", "discussion", "blocker", "issue", "question"]
ReportStatus = Literal["open", "acknowledged", "resolved"]


class TaskReportCreate(BaseModel):
    report_type: ReportType
    message: str = Field(min_length=5, max_length=3000)

    @model_validator(mode="after")
    def clean_message(self):
        self.message = self.message.strip()
        if len(self.message) < 5:
            raise ValueError("Please provide at least 5 characters of detail.")
        return self


class TaskReportUpdate(BaseModel):
    status: ReportStatus | None = None
    manager_response: str | None = Field(default=None, max_length=3000)

    @model_validator(mode="after")
    def require_an_update(self):
        if not self.model_fields_set:
            raise ValueError("Provide a status or manager response.")
        if "status" in self.model_fields_set and self.status is None:
            raise ValueError("Status cannot be null.")
        return self


class TaskReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    workspace_id: int
    task_id: int
    project_id: int | None = None
    task_title: str | None = None
    project_name: str | None = None
    submitted_by_id: int
    submitted_by_name: str | None = None
    project_manager_name: str | None = None
    report_type: ReportType
    message: str
    status: ReportStatus
    manager_response: str | None = None
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None = None
