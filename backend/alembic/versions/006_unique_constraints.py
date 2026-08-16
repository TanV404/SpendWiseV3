"""Add unique constraint on notification_preferences and budgets.

Revision ID: 006_unique_constraints
Revises: 005_add_amount_check_constraint
Create Date: 2026-08-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '006_unique_constraints'
down_revision: Union[str, None] = '005_add_amount_check_constraint'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Unique constraint on (user_id, alert_type) for notification_preferences
    op.create_unique_constraint(
        'uq_notification_preferences_user_alert',
        'notification_preferences',
        ['user_id', 'alert_type']
    )

    # 2. Check constraint on budgets ensuring non-negative limits
    op.create_check_constraint(
        'ck_budgets_non_negative',
        'budgets',
        'monthly_limit >= 0 AND savings_goal >= 0'
    )


def downgrade() -> None:
    op.drop_constraint('ck_budgets_non_negative', 'budgets', type_='check')
    op.drop_constraint('uq_notification_preferences_user_alert', 'notification_preferences', type_='unique')
