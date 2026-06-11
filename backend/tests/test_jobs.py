async def test_list_jobs(async_client):
    response = await async_client.get("/api/jobs")
    assert response.status_code == 200
    data = response.json()
    for key in ["jobs", "total", "page", "pages"]:
        assert key in data


async def test_list_jobs_with_search(async_client):
    response = await async_client.get("/api/jobs", params={"search": "engineer"})
    assert response.status_code == 200


async def test_get_job_not_found(async_client):
    response = await async_client.get("/api/jobs/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
