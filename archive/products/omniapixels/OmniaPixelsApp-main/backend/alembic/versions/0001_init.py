"""
Initial schema for OmniaPixels

Revision ID: 0001_init
Revises: 
Create Date: 2025-08-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0001_init'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Define enum objects (Alembic will create them as needed during table creation)
    jobqueue_enum = postgresql.ENUM(
        'image_processing', 'ai_processing', name='jobqueue'
    )
    jobstatus_enum = postgresql.ENUM(
        'pending', 'processing', 'completed', 'failed', name='jobstatus'
    )

    # users
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.String(), nullable=False, unique=True),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_pro', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # jobs
    op.create_table(
        'jobs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('queue', jobqueue_enum, nullable=False),
        sa.Column('status', jobstatus_enum, nullable=False, server_default='pending'),
        sa.Column('input_key', sa.String(), nullable=False),
        sa.Column('output_key', sa.String(), nullable=True),
        sa.Column('params', sa.Text(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_jobs_user_id', 'jobs', ['user_id'])

    # job_events
    op.create_table(
        'job_events',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('job_id', sa.Integer(), sa.ForeignKey('jobs.id'), nullable=False),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('event_metadata', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )
    op.create_index('ix_job_events_job_id', 'job_events', ['job_id'])

    # files
    op.create_table(
        'files',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('filename', sa.String(), nullable=False),
        sa.Column('content_type', sa.String(), nullable=False),
        sa.Column('size', sa.Integer(), nullable=False),
        sa.Column('s3_key', sa.String(), nullable=False, unique=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )
    op.create_index('ix_files_user_id', 'files', ['user_id'])
    op.create_index('ux_files_s3_key', 'files', ['s3_key'], unique=True)

    # plans
    op.create_table(
        'plans',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('price', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('features', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )

    # feature_flags
    op.create_table(
        'feature_flags',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(), nullable=False, unique=True),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ux_feature_flags_name', 'feature_flags', ['name'], unique=True)


def downgrade() -> None:
    op.drop_index('ux_feature_flags_name', table_name='feature_flags')
    op.drop_table('feature_flags')

    op.drop_table('plans')

    op.drop_index('ux_files_s3_key', table_name='files')
    op.drop_index('ix_files_user_id', table_name='files')
    op.drop_table('files')

    op.drop_index('ix_job_events_job_id', table_name='job_events')
    op.drop_table('job_events')

    op.drop_index('ix_jobs_user_id', table_name='jobs')
    op.drop_table('jobs')

    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')

    # drop enums at the end
    op.execute('DROP TYPE IF EXISTS jobstatus')
    op.execute('DROP TYPE IF EXISTS jobqueue')