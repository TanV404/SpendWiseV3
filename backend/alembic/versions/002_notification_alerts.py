"""Add notification preferences and alerts sent tables.

Revision ID: 002_notification_alerts
Revises: 001_initial_schema
Create Date: 2026-08-16 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '002_notification_alerts'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create notification_preferences table
    op.create_table(
        'notification_preferences',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column(
            'alert_type',
            sa.Enum('budget_threshold', 'savings_milestone', 'weekly_digest', name='alerttype'),
            nullable=False,
        ),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('threshold_pct', sa.Float(), nullable=False, server_default='80.0'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_notification_preferences_user_id'),
        'notification_preferences',
        ['user_id'],
        unique=False,
    )

    # Create alerts_sent table
    op.create_table(
        'alerts_sent',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column(
            'alert_type',
            sa.Enum('budget_threshold', 'savings_milestone', 'weekly_digest', name='alerttype'),
            nullable=False,
        ),
        sa.Column('reference_id', sa.String(), nullable=True),
        sa.Column('period', sa.String(), nullable=False),
        sa.Column('threshold_hit', sa.Float(), nullable=False),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint(
            'user_id', 'alert_type', 'reference_id', 'period', 'threshold_hit',
            name='uq_alerts_sent_idempotency'
        ),
    )
    op.create_index(
        op.f('ix_alerts_sent_user_id'),
        'alerts_sent',
        ['user_id'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_alerts_sent_user_id'), table_name='alerts_sent')
    op.drop_table('alerts_sent')
    op.drop_index(op.f('ix_notification_preferences_user_id'), table_name='notification_preferences')
    op.drop_table('notification_preferences')
    # PostgreSQL enum cleanup if needed
    bind = op.get_bind()
    if bind.engine.name == 'postgresql':
        op.execute('DROP TYPE IF EXISTS alerttype')
