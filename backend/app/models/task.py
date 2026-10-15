from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    workspace_id: Mapped[int] = mapped_column(
        ForeignKey("workspaces.id"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(
        String(30),
        default="To Do",
        nullable=False,
    )
    priority: Mapped[str] = mapped_column(
        String(20),
        default="medium",
        nullable=False,
    )

    created_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )
    assigned_to_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )

    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    project = relationship("Project")
    creator = relationship("User", foreign_keys=[created_by_id])
    assignee = relationship("User", foreign_keys=[assigned_to_id])

    @property
    def project_name(self) -> str | None:
        return self.project.name if self.project else None

    @property
    def created_by_name(self) -> str | None:
        return self.creator.full_name if self.creator else None

    @property
    def created_by_profile_picture_url(self) -> str | None:
        return self.creator.profile_picture_url if self.creator else None

    @property
    def assigned_to_name(self) -> str | None:
        return self.assignee.full_name if self.assignee else None

    @property
    def assigned_to_profile_picture_url(self) -> str | None:
        return self.assignee.profile_picture_url if self.assignee else None

    @property
    def project_manager_id(self) -> int | None:
        return self.project.project_manager_id if self.project else None

    @property
    def project_manager_name(self) -> str | None:
        manager = self.project.project_manager if self.project else None
        return manager.full_name if manager else None

    @property
    def project_manager_profile_picture_url(self) -> str | None:
        manager = self.project.project_manager if self.project else None
        return manager.profile_picture_url if manager else None

    __table_args__ = (
        Index("ix_tasks_workspace_status", "workspace_id", "status"),
        Index("ix_tasks_project_status", "project_id", "status"),
    )