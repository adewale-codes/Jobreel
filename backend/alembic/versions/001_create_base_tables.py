"""create base tables

Revision ID: 001
Revises:
Create Date: 2026-06-08

"""
from typing import Sequence, Union

from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            adzuna_id VARCHAR(100) UNIQUE NOT NULL,
            title VARCHAR(500) NOT NULL,
            company VARCHAR(255),
            location VARCHAR(255),
            category VARCHAR(100),
            description TEXT,
            salary_min NUMERIC(12,2),
            salary_max NUMERIC(12,2),
            salary_currency VARCHAR(10) DEFAULT 'GBP',
            contract_type VARCHAR(50),
            created TIMESTAMPTZ,
            redirecturl TEXT,
            raw_data JSONB,
            ingested_at TIMESTAMPTZ DEFAULT now()
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS skills (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
            skill VARCHAR(100) NOT NULL,
            extracted_at TIMESTAMPTZ DEFAULT now()
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS pipeline_runs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            started_at TIMESTAMPTZ DEFAULT now(),
            completed_at TIMESTAMPTZ,
            status VARCHAR(50) DEFAULT 'running',
            jobs_fetched INTEGER DEFAULT 0,
            jobs_inserted INTEGER DEFAULT 0,
            jobs_skipped INTEGER DEFAULT 0,
            error_message TEXT
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tag VARCHAR(100) UNIQUE NOT NULL,
            label VARCHAR(255) NOT NULL
        )
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS categories")
    op.execute("DROP TABLE IF EXISTS pipeline_runs")
    op.execute("DROP TABLE IF EXISTS skills")
    op.execute("DROP TABLE IF EXISTS jobs")
