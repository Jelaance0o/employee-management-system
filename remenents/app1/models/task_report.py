from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class TaskReport(Base):
    __tablename__ = "task_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"), nullable=False, index=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    submitted_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    report_type: Mapped[str] = mapped_column(String(20), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="open", nullable=False)
    manager_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    task = relationship("Task")
    submitter = relationship("User", foreign_keys=[submitted_by_id])

    @property
    def task_title(self) -> str | None:
        return self.task.title if self.task else None

    @property
    def project_id(self) -> int | None:
        return self.task.project_id if self.task else None

    @property
    def project_name(self) -> str | None:
        return self.task.project.name if self.task and self.task.project else None

    @property
    def submitted_by_name(self) -> str | None:
        return self.submitter.full_name if self.submitter else None

    @property
    def project_manager_name(self) -> str | None:
        manager = self.task.project.project_manager if self.task and self.task.project else None
        return manager.full_name if manager else None

    __table_args__ = (
        Index("ix_task_reports_workspace_status", "workspace_id", "status"),
    )
