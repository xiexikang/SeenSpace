from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.database import Base, engine
from app.core.migrations import migrate_existing_schema
from app.services.seed_service import ensure_project_seed


def create_app() -> FastAPI:
    Base.metadata.create_all(bind=engine)
    migrate_existing_schema()
    Base.metadata.create_all(bind=engine)
    ensure_project_seed()

    app = FastAPI(title="SeenSpace API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix="/api")
    return app


app = create_app()
