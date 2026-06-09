import os
from typing import Optional

import httpx

ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api/jobs/gb/search"
ADZUNA_APP_ID = os.environ.get("ADZUNA_APP_ID")
ADZUNA_APP_KEY = os.environ.get("ADZUNA_APP_KEY")


async def fetch_jobs(
    category: Optional[str] = None,
    page: int = 1,
    results_per_page: int = 50,
) -> dict:
    params = {
        "app_id": ADZUNA_APP_ID,
        "app_key": ADZUNA_APP_KEY,
        "results_per_page": results_per_page,
        "content-type": "application/json",
    }
    if category:
        params["category"] = category

    url = f"{ADZUNA_BASE_URL}/{page}"
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.json()
