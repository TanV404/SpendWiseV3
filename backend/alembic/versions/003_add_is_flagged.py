"""Add is_flagged column to transactions table.

Revision ID: 003_add_is_flagged
Revises: 002_notification_alerts
Create Date: 2026-08-16 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '003_add_is_flagged'
down_revision: Union[str, None] = '002_notification_alerts'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_flagged column with default False
    op.add_column(
        'transactions',
        sa.Column('is_flagged', sa.Boolean(), nullable=False, server_default=sa.text('false')),
    )
    op.create_index(op.f('ix_transactions_is_flagged'), 'transactions', ['is_flagged'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_transactions_is_flagged'), table_name='transactions')
    op.drop_column('transactions', 'is_flagged')
