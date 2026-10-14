"""add member profile fields and task reports

Revision ID: 8b4f2a91c6d0
Revises: 3e339bec30d1
Create Date: 2026-10-14 16:15:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "8b4f2a91c6d0"
down_revision: Union[str, Sequence[str], None] = "3e339bec30d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("department", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("job_title", sa.String(length=120), nullable=True))
    op.add_column("users", sa.Column("bio", sa.String(length=1000), nullable=True))
    op.add_column("users", sa.Column("skills", sa.JSON(), nullable=True))
    op.add_column("users", sa.Column("tech_stack", sa.JSON(), nullable=True))

    op.create_table(
        "task_reports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=False),
        sa.Column("submitted_by_id", sa.Integer(), nullable=False),
        sa.Column("report_type", sa.String(length=20), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("manager_response", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"]),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["submitted_by_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_task_reports_workspace_id"), "task_reports", ["workspace_id"], unique=False)
    op.create_index(op.f("ix_task_reports_task_id"), "task_reports", ["task_id"], unique=False)
    op.create_index(op.f("ix_task_reports_submitted_by_id"), "task_reports", ["submitted_by_id"], unique=False)
    op.create_index("ix_task_reports_workspace_status", "task_reports", ["workspace_id", "status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_task_reports_workspace_status", table_name="task_reports")
    op.drop_index(op.f("ix_task_reports_submitted_by_id"), table_name="task_reports")
    op.drop_index(op.f("ix_task_reports_task_id"), table_name="task_reports")
    op.drop_index(op.f("ix_task_reports_workspace_id"), table_name="task_reports")
    op.drop_table("task_reports")
    op.drop_column("users", "tech_stack")
    op.drop_column("users", "skills")
    op.drop_column("users", "bio")
    op.drop_column("users", "job_title")
    op.drop_column("users", "department")
