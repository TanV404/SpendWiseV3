"""Add check constraint for transaction amount range.

Revision ID: 005_add_amount_check_constraint
Revises: 004_add_savings_goal
Create Date: 2026-08-16 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '005_add_amount_check_constraint'
down_revision: Union[str, None] = '004_add_savings_goal'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add database-level CHECK constraint enforcing |amount| < 1,000,000 and amount != 0
    op.create_check_constraint(
        'ck_transactions_amount_range',
        'transactions',
        sa.text('abs(amount) < 1000000 AND amount != 0')
    )


def downgrade() -> None:
    op.drop_constraint('ck_transactions_amount_range', 'transactions', type_='check')
