"""FastAPI app factory."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.core.storage import ensure_upload_dirs
from app.errors import install_handlers
from app.request_id import new_request_id


@asynccontextmanager
async def _lifespan(_: FastAPI):
    ensure_upload_dirs()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="成人教育刷题小程序 API",
        version="1.0.0",
        docs_url="/docs",
        openapi_url="/openapi.json",
        lifespan=_lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-Id", "Idempotency-Key"],
    )

    @app.middleware("http")
    async def _request_id_mw(request: Request, call_next):
        rid = request.headers.get("X-Request-Id") or new_request_id()
        from app.request_id import set_request_id
        set_request_id(rid)
        response = await call_next(request)
        response.headers["X-Request-Id"] = rid
        return response

    install_handlers(app)

    @app.get("/api/v1/health")
    async def health():
        return {"code": "OK", "message": "healthy", "data": {"version": "1.0.0"}}

    # Mount static files for uploaded assets
    ensure_upload_dirs()
    try:
        app.mount(
            settings.static_url_prefix,
            StaticFiles(directory=str(settings.upload_dir), check_dir=False),
            name="uploads",
        )
    except Exception:
        pass

    # Mount API routers (registered later)
    from app.api.v1.router import api_router
    app.include_router(api_router, prefix="/api/v1")

    return app


app = create_app()
