async def test_pipeline_status_returns_list(async_client):
    response = await async_client.get("/api/pipeline/status")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


async def test_pipeline_trigger(async_client, mock_adzuna):
    response = await async_client.post("/api/pipeline/trigger", json={"categories": ["it-jobs"]})
    assert response.status_code == 200
    data = response.json()
    for key in ["run_id", "status", "jobs_fetched", "jobs_inserted", "jobs_skipped"]:
        assert key in data
