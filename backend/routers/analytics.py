from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

SALARY_BANDS = [
    ("Under £20k", 0, 20000),
    ("£20k - £30k", 20000, 30000),
    ("£30k - £40k", 30000, 40000),
    ("£40k - £50k", 40000, 50000),
    ("£50k - £60k", 50000, 60000),
    ("£60k - £80k", 60000, 80000),
    ("£80k+", 80000, 999999999),
]


@router.get("/overview")
async def overview(db: AsyncSession = Depends(get_db)):
    total_jobs = (await db.execute(text("SELECT COUNT(*) FROM jobs"))).scalar()
    total_unique_skills = (await db.execute(text("SELECT COUNT(DISTINCT skill) FROM skills"))).scalar()
    avg_salary = (
        await db.execute(
            text(
                "SELECT AVG((salary_min + salary_max) / 2) FROM jobs"
                " WHERE salary_min IS NOT NULL AND salary_max IS NOT NULL"
            )
        )
    ).scalar()
    jobs_with_salary = (
        await db.execute(text("SELECT COUNT(*) FROM jobs WHERE salary_min IS NOT NULL"))
    ).scalar()

    last_run = (
        await db.execute(
            text("SELECT started_at, status FROM pipeline_runs ORDER BY started_at DESC LIMIT 1")
        )
    ).mappings().first()

    return {
        "total_jobs": total_jobs or 0,
        "total_unique_skills": total_unique_skills or 0,
        "avg_salary": float(avg_salary) if avg_salary is not None else None,
        "jobs_with_salary": jobs_with_salary or 0,
        "last_pipeline_run": str(last_run["started_at"]) if last_run else None,
        "last_pipeline_status": last_run["status"] if last_run else None,
    }


@router.get("/top-skills")
async def top_skills(
    category: Optional[str] = None,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    if category:
        query = text("""
            SELECT s.skill, COUNT(*) as count
            FROM skills s
            JOIN jobs j ON s.job_id = j.id
            WHERE j.category = :category
            GROUP BY s.skill
            ORDER BY count DESC
            LIMIT :limit
        """)
        params = {"category": category, "limit": limit}
    else:
        query = text("""
            SELECT s.skill, COUNT(*) as count
            FROM skills s
            GROUP BY s.skill
            ORDER BY count DESC
            LIMIT :limit
        """)
        params = {"limit": limit}

    result = await db.execute(query, params)
    rows = result.mappings().all()

    return {
        "skills": [{"skill": row["skill"], "count": row["count"]} for row in rows],
        "category": category,
        "total": limit,
    }


@router.get("/salary-bands")
async def salary_bands(
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    bands = []
    for label, low, high in SALARY_BANDS:
        if category:
            query = text("""
                SELECT COUNT(*) FROM jobs
                WHERE (salary_min + salary_max) / 2 >= :min
                AND (salary_min + salary_max) / 2 < :max
                AND salary_min IS NOT NULL
                AND salary_max IS NOT NULL
                AND category = :category
            """)
            params = {"min": low, "max": high, "category": category}
        else:
            query = text("""
                SELECT COUNT(*) FROM jobs
                WHERE (salary_min + salary_max) / 2 >= :min
                AND (salary_min + salary_max) / 2 < :max
                AND salary_min IS NOT NULL
                AND salary_max IS NOT NULL
            """)
            params = {"min": low, "max": high}

        count = (await db.execute(query, params)).scalar()
        bands.append({"label": label, "count": count or 0})

    return {"bands": bands}


@router.get("/jobs-by-category")
async def jobs_by_category(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""
            SELECT
                j.category,
                COUNT(*) as count,
                AVG((j.salary_min + j.salary_max) / 2) as avg_salary
            FROM jobs j
            GROUP BY j.category
            ORDER BY count DESC
        """)
    )
    rows = result.mappings().all()

    categories = []
    for row in rows:
        label = row["category"]
        if row["category"] is not None:
            label_result = await db.execute(
                text("SELECT label FROM categories WHERE tag = :tag"),
                {"tag": row["category"]},
            )
            label_row = label_result.scalar()
            if label_row:
                label = label_row

        categories.append({
            "category": row["category"],
            "label": label,
            "count": row["count"],
            "avg_salary": float(row["avg_salary"]) if row["avg_salary"] is not None else None,
        })

    return {"categories": categories}


@router.get("/volume-over-time")
async def volume_over_time(
    days: int = Query(default=30),
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    days = int(days)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    if category:
        query = text("""
            SELECT
                DATE(created) as date,
                COUNT(*) as count
            FROM jobs
            WHERE created >= :cutoff
            AND category = :category
            GROUP BY DATE(created)
            ORDER BY date ASC
        """)
        params = {"cutoff": cutoff, "category": category}
    else:
        query = text("""
            SELECT
                DATE(created) as date,
                COUNT(*) as count
            FROM jobs
            WHERE created >= :cutoff
            GROUP BY DATE(created)
            ORDER BY date ASC
        """)
        params = {"cutoff": cutoff}

    result = await db.execute(query, params)
    rows = result.mappings().all()

    return {
        "volume": [{"date": str(row["date"]), "count": row["count"]} for row in rows],
        "days": days,
    }


@router.get("/top-companies")
async def top_companies(
    category: Optional[str] = None,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    if category:
        query = text("""
            SELECT company, COUNT(*) as count
            FROM jobs
            WHERE company IS NOT NULL
            AND category = :category
            GROUP BY company
            ORDER BY count DESC
            LIMIT :limit
        """)
        params = {"category": category, "limit": limit}
    else:
        query = text("""
            SELECT company, COUNT(*) as count
            FROM jobs
            WHERE company IS NOT NULL
            GROUP BY company
            ORDER BY count DESC
            LIMIT :limit
        """)
        params = {"limit": limit}

    result = await db.execute(query, params)
    rows = result.mappings().all()

    return {"companies": [{"company": row["company"], "count": row["count"]} for row in rows]}
