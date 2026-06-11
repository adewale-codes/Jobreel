async def test_overview(async_client):
    response = await async_client.get("/api/analytics/overview")
    assert response.status_code == 200
    data = response.json()
    for key in [
        "total_jobs",
        "total_unique_skills",
        "avg_salary",
        "jobs_with_salary",
        "last_pipeline_run",
        "last_pipeline_status",
    ]:
        assert key in data


async def test_top_skills(async_client):
    response = await async_client.get("/api/analytics/top-skills")
    assert response.status_code == 200
    data = response.json()
    assert "skills" in data
    assert "total" in data


async def test_jobs_by_category(async_client):
    response = await async_client.get("/api/analytics/jobs-by-category")
    assert response.status_code == 200
    assert "categories" in response.json()


async def test_top_companies(async_client):
    response = await async_client.get("/api/analytics/top-companies")
    assert response.status_code == 200
    assert "companies" in response.json()


async def test_salary_bands(async_client):
    response = await async_client.get("/api/analytics/salary-bands")
    assert response.status_code == 200
    assert "bands" in response.json()


async def test_volume_over_time(async_client):
    response = await async_client.get("/api/analytics/volume-over-time")
    assert response.status_code == 200
    assert "volume" in response.json()
