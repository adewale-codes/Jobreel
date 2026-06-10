import json
import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.adzuna import fetch_jobs
from services.skill_extractor import extract_skills

log = logging.getLogger(__name__)

DEFAULT_CATEGORIES = [
    "it-jobs",
    "engineering-jobs",
    "science-quality-jobs",
    "graduate-jobs",
]

CATEGORIES = [
    ("it-jobs", "IT Jobs"),
    ("engineering-jobs", "Engineering Jobs"),
    ("science-quality-jobs", "Science & Quality"),
    ("graduate-jobs", "Graduate Jobs"),
    ("accounting-finance-jobs", "Accounting & Finance"),
    ("sales-jobs", "Sales Jobs"),
    ("marketing-jobs", "Marketing Jobs"),
    ("healthcare-nursing-jobs", "Healthcare & Nursing"),
    ("teaching-jobs", "Teaching Jobs"),
    ("trade-construction-jobs", "Trade & Construction"),
]


def clean_salary(value) -> Optional[float]:
    if value is None or value == 0:
        return None
    return round(float(value), 2)


def extract_location(location_data: dict) -> str:
    return location_data.get("display_name") or "Unknown"


async def job_exists(db: AsyncSession, adzuna_id: str) -> bool:
    result = await db.execute(
        text("SELECT 1 FROM jobs WHERE adzuna_id = :adzuna_id"),
        {"adzuna_id": adzuna_id},
    )
    return result.scalar() is not None


async def insert_job(db: AsyncSession, job_data: dict) -> str:
    created_raw = job_data.get("created")
    created_dt: Optional[datetime] = None
    if created_raw:
        created_dt = datetime.fromisoformat(created_raw.replace("Z", "+00:00"))

    result = await db.execute(
        text("""
            INSERT INTO jobs (
                adzuna_id, title, company, location, category,
                description, salary_min, salary_max, contract_type,
                created, redirecturl, raw_data
            ) VALUES (
                :adzuna_id, :title, :company, :location, :category,
                :description, :salary_min, :salary_max, :contract_type,
                :created, :redirecturl, CAST(:raw_data AS JSONB)
            )
            RETURNING id
        """),
        {
            "adzuna_id": job_data["id"],
            "title": job_data["title"],
            "company": job_data.get("company", {}).get("display_name"),
            "location": extract_location(job_data.get("location", {})),
            "category": job_data.get("category", {}).get("tag"),
            "description": job_data.get("description"),
            "salary_min": clean_salary(job_data.get("salary_min")),
            "salary_max": clean_salary(job_data.get("salary_max")),
            "contract_type": job_data.get("contract_type"),
            "created": created_dt,
            "redirecturl": job_data.get("redirect_url"),
            "raw_data": json.dumps(job_data),
        },
    )
    job_id = str(result.scalar())

    skills = extract_skills(job_data.get("description", ""))
    for skill in skills:
        await db.execute(
            text("INSERT INTO skills (job_id, skill) VALUES (:job_id, :skill)"),
            {"job_id": job_id, "skill": skill},
        )

    return job_id


async def backfill_skills(db: AsyncSession) -> dict:
    result = await db.execute(
        text("""
            SELECT j.id, j.description
            FROM jobs j
            WHERE NOT EXISTS (
                SELECT 1 FROM skills s WHERE s.job_id = j.id
            )
        """)
    )
    rows = result.mappings().all()

    jobs_processed = 0
    skills_inserted = 0

    for row in rows:
        skills = extract_skills(row["description"] or "")
        for skill in skills:
            await db.execute(
                text("INSERT INTO skills (job_id, skill) VALUES (:job_id, :skill)"),
                {"job_id": str(row["id"]), "skill": skill},
            )
            skills_inserted += 1
        await db.commit()
        jobs_processed += 1

    log.info("Backfill complete — jobs_processed=%d skills_inserted=%d", jobs_processed, skills_inserted)
    return {"jobs_processed": jobs_processed, "skills_inserted": skills_inserted}


async def run_pipeline(
    db: AsyncSession,
    categories: Optional[list[str]] = None,
) -> dict:
    cats = categories or DEFAULT_CATEGORIES

    result = await db.execute(
        text("INSERT INTO pipeline_runs (status) VALUES ('running') RETURNING id")
    )
    run_id = str(result.scalar())
    await db.commit()
    log.info("Pipeline run %s started — categories: %s", run_id, cats)

    jobs_fetched = 0
    jobs_inserted = 0
    jobs_skipped = 0
    status = "completed"
    error: Optional[str] = None

    try:
        for category in cats:
            try:
                for page in [1, 2]:
                    log.info("Fetching category=%s page=%d", category, page)
                    data = await fetch_jobs(category=category, page=page)
                    results = data.get("results", [])
                    jobs_fetched += len(results)
                    log.info(
                        "Received %d jobs from category=%s page=%d",
                        len(results), category, page,
                    )

                    for job_data in results:
                        if await job_exists(db, job_data["id"]):
                            jobs_skipped += 1
                        else:
                            await insert_job(db, job_data)
                            jobs_inserted += 1

                    await db.commit()
            except Exception as cat_exc:
                await db.rollback()
                log.error("Skipping category=%s after error: %s", category, cat_exc)

        await db.execute(
            text("""
                UPDATE pipeline_runs
                SET status      = 'completed',
                    completed_at = now(),
                    jobs_fetched = :fetched,
                    jobs_inserted = :inserted,
                    jobs_skipped  = :skipped
                WHERE id = :run_id
            """),
            {
                "fetched": jobs_fetched,
                "inserted": jobs_inserted,
                "skipped": jobs_skipped,
                "run_id": run_id,
            },
        )
        await db.commit()
        log.info(
            "Pipeline run %s completed — fetched=%d inserted=%d skipped=%d",
            run_id, jobs_fetched, jobs_inserted, jobs_skipped,
        )

    except Exception as exc:
        await db.rollback()
        status = "failed"
        error = str(exc)
        log.exception("Pipeline run %s failed: %s", run_id, exc)
        await db.execute(
            text("""
                UPDATE pipeline_runs
                SET status = 'failed', error_message = :error
                WHERE id = :run_id
            """),
            {"error": error, "run_id": run_id},
        )
        await db.commit()

    summary: dict = {
        "run_id": run_id,
        "status": status,
        "jobs_fetched": jobs_fetched,
        "jobs_inserted": jobs_inserted,
        "jobs_skipped": jobs_skipped,
    }
    if error:
        summary["error_message"] = error
    return summary


async def seed_categories(db: AsyncSession) -> None:
    result = await db.execute(text("SELECT COUNT(*) FROM categories"))
    if result.scalar() > 0:
        return
    for tag, label in CATEGORIES:
        await db.execute(
            text(
                "INSERT INTO categories (tag, label) VALUES (:tag, :label)"
                " ON CONFLICT (tag) DO NOTHING"
            ),
            {"tag": tag, "label": label},
        )
    await db.commit()
    log.info("Seeded %d categories", len(CATEGORIES))
