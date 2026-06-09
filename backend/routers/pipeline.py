from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.pipeline import run_pipeline

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])


class TriggerRequest(BaseModel):
    categories: Optional[list[str]] = None


@router.post("/trigger")
async def trigger(
    body: Optional[TriggerRequest] = Body(default=None),
    db: AsyncSession = Depends(get_db),
):
    categories = body.categories if body else None
    return await run_pipeline(db, categories=categories)


@router.get("/status")
async def status(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""
            SELECT id, started_at, completed_at, status,
                   jobs_fetched, jobs_inserted, jobs_skipped, error_message
            FROM pipeline_runs
            ORDER BY started_at DESC
            LIMIT 10
        """)
    )
    return [dict(row) for row in result.mappings().all()]


@router.get("/runs/{run_id}")
async def get_run(run_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""
            SELECT id, started_at, completed_at, status,
                   jobs_fetched, jobs_inserted, jobs_skipped, error_message
            FROM pipeline_runs
            WHERE id = :run_id
        """),
        {"run_id": run_id},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Pipeline run not found")
    return dict(row)
