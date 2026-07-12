"""Uniform error envelope + handlers."""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.exceptions import AppError
from app.request_id import get_request_id


def error_payload(code: str, message: str, **extra) -> dict:
    body = {
        "code": code,
        "message": message,
        "request_id": get_request_id(),
    }
    if extra:
        body["data"] = extra
    return body


def install_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError):
        payload = error_payload(exc.code, exc.message)
        # InsufficientQuestions carries actual_available
        if hasattr(exc, "actual_available"):
            payload["data"] = {"actual_available": exc.actual_available}
        return JSONResponse(status_code=exc.http_status, content=payload)

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content=error_payload("VALIDATION_FAILED", "请求参数不合法", errors=exc.errors()),
        )

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content=error_payload("INTERNAL_ERROR", str(exc) or "服务器内部错误"),
        )