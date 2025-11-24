"""Add likes table

Revision ID: ec21acc1d2df
Revises: a92fab26f7af
Create Date: 2025-11-22 21:02:47.996728
"""

from typing import Sequence, Union

import sqlalchemy as sa
from fastapi_users_db_sqlalchemy.generics import GUID

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "ec21acc1d2df"
down_revision: Union[str, Sequence[str], None] = "a92fab26f7af"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "likes",
        sa.Column("user_id", GUID(), nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "post_id"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("likes")
