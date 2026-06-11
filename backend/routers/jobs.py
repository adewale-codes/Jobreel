import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

JOB_LIST_FIELDS = """
    id, adzuna_id, title, company, location, category,
    salary_min, salary_max, salary_currency, contract_type,
    created, redirecturl, ingested_at
"""


@router.get("")
async def list_jobs(
    search: Optional[str] = None,
    category: Optional[str] = None,
    location: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    params: dict = {}

    like_op = "ILIKE" if db.bind.dialect.name == "postgresql" else "LIKE"

    if search:
        filters.append(f"title {like_op} :search")
        params["search"] = f"%{search}%"
    if category:
        filters.append("category = :category")
        params["category"] = category
    if location:
        filters.append(f"location {like_op} :location")
        params["location"] = f"%{location}%"

    where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""

    total = (
        await db.execute(
            text(f"SELECT COUNT(*) FROM jobs {where_clause}"),
            params,
        )
    ).scalar() or 0

    offset = (page - 1) * limit
    list_params = {**params, "limit": limit, "offset": offset}

    result = await db.execute(
        text(f"""
            SELECT {JOB_LIST_FIELDS}
            FROM jobs
            {where_clause}
            ORDER BY created DESC NULLS LAST
            LIMIT :limit OFFSET :offset
        """),
        list_params,
    )
    rows = result.mappings().all()

    pages = math.ceil(total / limit) if total else 0

    return {
        "jobs": [dict(row) for row in rows],
        "total": total,
        "page": page,
        "pages": pages,
    }


@router.get("/{job_id}")
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text(f"""
            SELECT {JOB_LIST_FIELDS}, description
            FROM jobs
            WHERE id = :job_id
        """),
        {"job_id": job_id},
    )
    job = result.mappings().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    skills_result = await db.execute(
        text("SELECT skill FROM skills WHERE job_id = :job_id ORDER BY skill"),
        {"job_id": job_id},
    )
    skills = [row[0] for row in skills_result.all()]

    return {**dict(job), "skills": skills}
