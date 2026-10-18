from fastapi import FastAPI

from app.routers.auth import router as auth_router
from app.routers.incidents import router as incidents_router


def create_app() -> FastAPI:
    app = FastAPI(title="AegisOps AI API", version="0.1.0")
    app.include_router(auth_router)
    app.include_router(incidents_router)

    @app.get("/health/live", tags=["health"])
    def liveness() -> dict[str, str]:
        return {"status": "alive"}

    return app


app = create_app()