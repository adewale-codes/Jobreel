import os
import sys
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite://")
os.environ.setdefault("ADZUNA_APP_ID", "test-app-id")
os.environ.setdefault("ADZUNA_APP_KEY", "test-app-key")
os.environ.setdefault("ENVIRONMENT", "test")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from database import get_db
from main import app

TEST_ENGINE = create_async_engine(
    "sqlite+aiosqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = async_sessionmaker(TEST_ENGINE, class_=AsyncSession, expire_on_commit=False)

# SQLite equivalents of the 001_create_base_tables migration. gen_random_uuid()
# and now() are Postgres-only, so they're swapped for SQLite-native defaults;
# column names, types and constraints otherwise match the migration.
SCHEMA_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
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
        created TIMESTAMP,
        redirecturl TEXT,
        raw_data JSONB,
        ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS skills (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        skill VARCHAR(100) NOT NULL,
        extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS pipeline_runs (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'running',
        jobs_fetched INTEGER DEFAULT 0,
        jobs_inserted INTEGER DEFAULT 0,
        jobs_skipped INTEGER DEFAULT 0,
        error_message TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        tag VARCHAR(100) UNIQUE NOT NULL,
        label VARCHAR(255) NOT NULL
    )
    """,
]


async def _override_get_db():
    async with TestSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = _override_get_db


@pytest_asyncio.fixture(scope="session", autouse=True)
async def _create_schema():
    async with TEST_ENGINE.begin() as conn:
        for statement in SCHEMA_STATEMENTS:
            await conn.execute(text(statement))
    yield


@pytest_asyncio.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
def mock_adzuna(monkeypatch):
    async def _fake_fetch_jobs(category=None, page=1, results_per_page=50):
        if page > 1:
            return {"results": []}
        return {
            "results": [
                {
                    "id": f"{category or 'general'}-{page}",
                    "title": "Senior Python Engineer",
                    "company": {"display_name": "Acme Corp"},
                    "location": {"display_name": "London"},
                    "category": {"tag": category or "it-jobs"},
                    "description": "We need Python, FastAPI and PostgreSQL skills.",
                    "salary_min": 50000,
                    "salary_max": 70000,
                    "contract_type": "permanent",
                    "created": "2024-01-15T10:30:00Z",
                    "redirect_url": "https://example.com/job/1",
                }
            ]
        }

    monkeypatch.setattr("services.pipeline.fetch_jobs", _fake_fetch_jobs)
    return _fake_fetch_jobs
