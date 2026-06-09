import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from database import AsyncSessionLocal
from routers.pipeline import router as pipeline_router
from services.pipeline import seed_categories

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with AsyncSessionLocal() as db:
        await seed_categories(db)
    yield


app = FastAPI(title="Jobreel API", lifespan=lifespan)
app.include_router(pipeline_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "jobreel-api"}
