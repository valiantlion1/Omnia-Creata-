"""
Add credits and feedback fields to users

Revision ID: 0002_add_user_credits_feedback
Revises: 0001_init
Create Date: 2025-08-21
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0002_add_user_credits_feedback'
down_revision = '0001_init'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add columns to users
    op.add_column('users', sa.Column('credits', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('credit_refresh_date', sa.String(), nullable=True))
    op.add_column('users', sa.Column('feedback_popup_disabled', sa.Boolean(), nullable=False, server_default=sa.text('false')))

    # Optional: remove server_default after backfilling
    with op.get_context().autocommit_block():
        op.execute("ALTER TABLE users ALTER COLUMN credits DROP DEFAULT")
        op.execute("ALTER TABLE users ALTER COLUMN feedback_popup_disabled DROP DEFAULT")


def downgrade() -> None:
    op.drop_column('users', 'feedback_popup_disabled')
    op.drop_column('users', 'credit_refresh_date')
    op.drop_column('users', 'credits')