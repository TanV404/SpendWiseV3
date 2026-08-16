"""Add savings_goal to budgets table.

Revision ID: 004_add_savings_goal
Revises: 003_add_is_flagged
Create Date: 2026-08-16 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '004_add_savings_goal'
down_revision: Union[str, None] = '003_add_is_flagged'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'budgets',
        sa.Column('savings_goal', sa.Float(), nullable=False, server_default='0.0'),
    )


def downgrade() -> None:
    op.drop_column('budgets', 'savings_goal')
