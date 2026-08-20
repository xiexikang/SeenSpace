import json
from collections.abc import Callable

from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


def envelope(data=None, message: str = "", code: int = 0) -> dict:
    return {"code": code, "data": data, "message": message}


class ResponseEnvelopeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        response = await call_next(request)
        if response.status_code == 204:
            return response

        body = b""
        async for chunk in response.body_iterator:
            body += chunk
        content_type = response.headers.get("content-type", "")
        if "application/json" not in content_type:
            return response

        try:
            payload = json.loads(body or b"null")
        except (TypeError, ValueError):
            return response
        if isinstance(payload, dict) and {"code", "data", "message"}.issubset(payload):
            wrapped = payload
        else:
            wrapped = envelope(payload)
        return JSONResponse(
            content=wrapped,
            status_code=response.status_code,
            headers={k: v for k, v in response.headers.items() if k.lower() not in {"content-length", "content-type"}},
        )


def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, str) else "请求失败"
    return JSONResponse(status_code=exc.status_code, content=envelope(None, detail, exc.status_code))


def validation_exception_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(status_code=422, content=envelope(None, "请求参数无效", 422))

