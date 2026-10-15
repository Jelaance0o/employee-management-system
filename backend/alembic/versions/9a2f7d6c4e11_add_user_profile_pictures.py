"""add user profile pictures

Revision ID: 9a2f7d6c4e11
Revises: 8b4f2a91c6d0
Create Date: 2026-10-16 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "9a2f7d6c4e11"
down_revision: Union[str, Sequence[str], None] = "8b4f2a91c6d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("profile_picture", sa.LargeBinary(), nullable=True))
    op.add_column("users", sa.Column("profile_picture_content_type", sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "profile_picture_content_type")
    op.drop_column("users", "profile_picture")
