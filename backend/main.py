from fastapi import FastAPI

app = FastAPI(title="Jobreel API")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "jobreel-api"}
