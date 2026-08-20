from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.database import Base, engine
from app.core.migrations import migrate_existing_schema
from app.services.seed_service import ensure_project_seed
from app.core.response import ResponseEnvelopeMiddleware, envelope, http_exception_handler, validation_exception_handler


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
    app.add_middleware(ResponseEnvelopeMiddleware)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, lambda _request, exc: JSONResponse(status_code=500, content=envelope(None, "服务器内部错误", 500)))
    app.include_router(api_router, prefix="/api")
    return app


app = create_app()
