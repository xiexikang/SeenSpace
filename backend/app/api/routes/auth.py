import base64
import json
import logging
from hashlib import sha256
from datetime import UTC, datetime, timedelta
from secrets import choice
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import AgentAuthorizationSession, AuthSession, User
from app.schemas.auth import (
    AuthResponse,
    AgentAuthorizeData,
    AgentAccessContext,
    AgentLoginRequest,
    AgentRuntimeChatRequest,
    AgentRuntimeChatResponse,
    AgentRuntimeApiRequest,
    AgentRuntimeMcpRequest,
    AgentRuntimeMcpResponse,
    AgentRefreshResponse,
    AgentSessionStatus,
    AgentTokenResponse,
    AuthUser,
    CaptchaResponse,
    LoginRequest,
    RegisterRequest,
    UpdateNameRequest,
    UpdatePasswordRequest,
)
from app.core.response import envelope
from app.core.config import settings
from app.services.auth_service import (
    create_captcha,
    delete_session,
    login_user,
    register_user,
    to_auth_user,
    update_user_name,
    update_user_password,
    upsert_agent_user,
)


router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)
_PKCE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"
_PKCE_SESSION_TTL = timedelta(minutes=15)


def _create_pkce_pair() -> tuple[str, str]:
    verifier = "".join(choice(_PKCE_ALPHABET) for _ in range(64))
    challenge = sha256(verifier.encode("ascii")).digest()
    return verifier, base64.urlsafe_b64encode(challenge).decode("ascii").rstrip("=")


_SENSITIVE_HEADER_NAMES = {
    "authorization",
    "accesstoken",
    "access-token",
    "aipaccesstoken",
    "cookie",
    "proxy-authorization",
    "set-cookie",
    "chat-context-id",
    "mcp-session-id",
}


def _safe_request_headers(headers: dict[str, str]) -> dict[str, str]:
    """Log credential identity safely enough to diagnose token routing."""
    if settings.agent_debug_log_sensitive:
        return {str(name): str(value) for name, value in headers.items()}
    result: dict[str, str] = {}
    for name, value in headers.items():
        header_name = str(name)
        header_value = str(value)
        if header_name.lower() in _SENSITIVE_HEADER_NAMES:
            result[header_name] = _credential_diagnostic(header_value)
        else:
            result[header_name] = header_value
    return result


def _credential_diagnostic(value: str) -> str:
    raw = value.strip()
    scheme = ""
    token = raw
    if " " in raw:
        scheme, token = raw.split(None, 1)
        scheme = f"scheme={scheme} "
    token_kind = next((prefix[:-1] for prefix in ("gw_", "at_", "sk_") if token.startswith(prefix)), "unknown")
    fingerprint = sha256(token.encode("utf-8")).hexdigest()[:16]
    return f"{scheme}token_kind={token_kind} token_length={len(token)} sha256_16={fingerprint}"


def _safe_response_headers(headers: object) -> dict[str, str]:
    if not hasattr(headers, "items"):
        return {}
    return _safe_request_headers({str(name): str(value) for name, value in headers.items()})


def _safe_error_text(value: str, max_length: int = 500) -> str:
    """Keep upstream diagnostics bounded and free of common bearer credentials."""
    text = value[:max_length]
    if settings.agent_debug_log_sensitive:
        return text
    for marker in ("Bearer ", "sk-", "gw_", "at_"):
        start = 0
        while True:
            index = text.find(marker, start)
            if index < 0:
                break
            token_start = index + len(marker)
            token_end = token_start
            while token_end < len(text) and not text[token_end].isspace() and text[token_end] not in '"\',}':
                token_end += 1
            text = text[:token_start] + "[REDACTED]" + text[token_end:]
            start = token_start + len("[REDACTED]")
    return text


def _safe_log_value(value: object, key: str | None = None) -> object:
    """Log request data for debugging without logging credentials."""
    if key and key.lower() in _SENSITIVE_HEADER_NAMES | {"token", "access_token", "refresh_token", "client_secret", "api_key", "apikey"}:
        if settings.agent_debug_log_sensitive:
            return value
        return _credential_diagnostic(str(value))
    if isinstance(value, dict):
        return {str(item_key): _safe_log_value(item_value, str(item_key)) for item_key, item_value in value.items()}
    if isinstance(value, list):
        return [_safe_log_value(item) for item in value]
    if isinstance(value, str):
        return _safe_error_text(value, max_length=4000)
    return value


def _prepare_llm_headers(configured_headers: object, agent_access_token: str) -> dict[str, str]:
    """Build LLM gateway headers with the third-party Agent OAuth token.

    ``Authorization`` is supplied by the LLM configuration as the API key
    (usually ``sk_``). ``AccessToken`` must be the Agent OAuth access token
    (usually ``at_``), not an IAM-created gateway ``aipAccessToken`` (``gw_``).
    """
    raw = configured_headers if isinstance(configured_headers, dict) else {}
    headers = {
        str(key): str(value)
        for key, value in raw.items()
        if value is not None and str(key).lower() not in {"accesstoken", "access-token", "aipaccesstoken"}
    }
    authorization = next(
        (value.strip() for key, value in headers.items() if key.lower() == "authorization" and value.strip()),
        None,
    )
    if authorization is None:
        raise HTTPException(status_code=502, detail="LLM 配置缺少 Authorization 凭证。")
    # Never send an OAuth user token to the LLM gateway in the API-key slot.
    authorization_token = authorization.removeprefix("Bearer ").removeprefix("bearer ").strip()
    if authorization_token.startswith("at_"):
        raise HTTPException(status_code=502, detail="LLM 配置的 Authorization 不能使用 OAuth 用户令牌。")
    if not agent_access_token or agent_access_token.startswith(("gw_", "sk_", "sk-")):
        raise HTTPException(status_code=502, detail="当前智能体没有可用的 OAuth AccessToken。")
    headers["AccessToken"] = agent_access_token
    headers.setdefault("Content-Type", "application/json")
    return headers


def _prepare_mcp_headers(
    configured_headers: object,
    aip_access_token: str,
    chat_context_id: str,
    mcp_session_id: str | None = None,
) -> dict[str, str]:
    """Build MCP gateway headers with the caller's gateway token and context."""
    raw = configured_headers if isinstance(configured_headers, dict) else {}
    headers = {
        str(key): str(value)
        for key, value in raw.items()
        if value is not None and str(key).lower() not in {
            "accesstoken", "access-token", "aipaccesstoken", "chat-context-id", "mcp-session-id",
        }
    }
    if not any(key.lower() == "authorization" and value.strip() for key, value in headers.items()):
        raise HTTPException(status_code=502, detail="MCP 配置缺少 Authorization 凭证。")
    if not aip_access_token:
        raise HTTPException(status_code=503, detail="未配置调用方 aipAccessToken。")
    headers["AccessToken"] = aip_access_token
    headers["chat-context-id"] = chat_context_id
    if mcp_session_id:
        headers["MCP-Session-Id"] = mcp_session_id
    headers.setdefault("Accept", "application/json, text/event-stream")
    headers.setdefault("Content-Type", "application/json")
    return headers


def _parse_mcp_response(response: httpx.Response) -> object:
    """Decode JSON and SSE MCP responses into values suitable for the API client."""
    content_type = response.headers.get("content-type", "").lower()
    if "text/event-stream" not in content_type:
        try:
            return response.json()
        except ValueError:
            return response.text

    messages: list[object] = []
    for block in response.text.replace("\r\n", "\n").split("\n\n"):
        data_lines = [line[5:].lstrip() for line in block.splitlines() if line.startswith("data:")]
        if not data_lines:
            continue
        data = "\n".join(data_lines)
        if data == "[DONE]":
            continue
        try:
            messages.append(json.loads(data))
        except json.JSONDecodeError:
            messages.append(data)
    if len(messages) == 1:
        return messages[0]
    return messages


def _agent_token_is_oauth(token: str | None, session: AuthSession | None = None) -> bool:
    """Recognize OAuth user tokens so they cannot be sent to gateway-only APIs."""
    if not token:
        return False
    # OAuth providers may use opaque values; the session binding is the source
    # of truth. Gateway/API-key prefixes are rejected explicitly.
    return bool(session and token == session.agent_access_token) and not token.startswith(("gw_", "sk_", "sk-"))


def _context_from_value(value: object) -> AgentAccessContext | None:
    if not isinstance(value, dict):
        return None
    try:
        return AgentAccessContext.model_validate(value)
    except (TypeError, ValueError):
        return None


def _save_agent_context(session: AuthSession, context: AgentAccessContext, db: Session) -> None:
    session.agent_context_json = context.model_dump_json()
    db.commit()


def _cached_agent_context(session: AuthSession) -> AgentAccessContext | None:
    raw = getattr(session, "agent_context_json", None)
    if not raw:
        return None
    try:
        return _context_from_value(json.loads(raw))
    except (TypeError, ValueError, json.JSONDecodeError):
        return None


@router.post("/agent/getAuthorizeUrl", response_model=AgentAuthorizeData)
async def get_agent_authorize_url(db: Session = Depends(get_db)) -> AgentAuthorizeData:
    code_verifier, code_challenge = _create_pkce_pair()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                settings.agent_authorize_url,
                json={
                    "clientId": settings.agent_client_id,
                    "clientSecret": settings.agent_client_secret,
                    "code_challenge": code_challenge,
                    "code_challenge_method": "S256",
                },
            )
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError) as error:
        raise HTTPException(status_code=502, detail="获取智能体授权地址失败。") from error

    try:
        if not isinstance(payload, dict):
            raise ValueError("第三方授权响应不是 JSON 对象")
        upstream_code = payload.get("code")
        if upstream_code not in (None, 0, "0"):
            message = payload.get("msg") or "第三方授权地址获取失败"
            raise HTTPException(status_code=502, detail=f"智能体授权失败：{message}")
        authorize_data = AgentAuthorizeData.model_validate(payload.get("data"))
        db.query(AgentAuthorizationSession).filter(
            AgentAuthorizationSession.expires_at < datetime.now(UTC).replace(tzinfo=None)
        ).delete(synchronize_session=False)
        db.merge(AgentAuthorizationSession(
            state=authorize_data.state,
            code_verifier=code_verifier,
            created_at=datetime.now(UTC).replace(tzinfo=None),
            expires_at=datetime.now(UTC).replace(tzinfo=None) + _PKCE_SESSION_TTL,
        ))
        db.commit()
        return authorize_data
    except HTTPException:
        raise
    except ValueError as error:
        raise HTTPException(status_code=502, detail="智能体授权响应格式无效。") from error


@router.post("/agent/login", response_model=AuthResponse)
async def agent_login(request: AgentLoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    authorization_session = db.get(AgentAuthorizationSession, request.state)
    now = datetime.now(UTC).replace(tzinfo=None)
    if authorization_session is None or authorization_session.expires_at < now:
        if authorization_session is not None:
            db.delete(authorization_session)
            db.commit()
        raise HTTPException(status_code=400, detail="智能体授权 state 无效或已过期，请重新发起登录。")
    code_verifier = authorization_session.code_verifier
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_response = await client.post(
                settings.agent_token_url,
                json={
                    "code": request.code,
                    "grant_type": "authorization_code",
                    "client_id": settings.agent_client_id,
                    "client_secret": settings.agent_client_secret,
                    "redirect_uri": settings.agent_redirect_uri,
                    "code_verifier": code_verifier,
                },
            )
            token_response.raise_for_status()
            token_payload = token_response.json()
            if token_payload.get("code") != 0:
                raise ValueError(token_payload.get("msg") or "第三方令牌获取失败")
            token_data = AgentTokenResponse.model_validate(token_payload).data
            access_token = token_data.access_token

            user_response = await client.get(
                settings.agent_userinfo_url,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            user_response.raise_for_status()
            user_payload = user_response.json()
            if user_payload.get("code") not in (None, 0):
                raise ValueError(user_payload.get("msg") or "第三方用户信息获取失败")
            user_data = user_payload.get("data", {})
            user_id = user_data.get("userId")
            if user_id is None:
                raise ValueError("第三方未返回 userId")
    except (httpx.HTTPError, ValueError, TypeError) as error:
        raise HTTPException(status_code=502, detail="智能体登录失败。") from error

    db.delete(authorization_session)
    db.commit()
    return upsert_agent_user(
        db,
        int(user_id),
        str(user_data.get("userName") or ""),
        user_data.get("fullName"),
        str(access_token),
        token_data.refresh_token,
        token_data.expires_in,
    )


def _agent_session(authorization: str | None, db: Session) -> AuthSession:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated.")
    session = db.get(AuthSession, authorization.removeprefix("Bearer ").strip())
    if not session or not session.agent_access_token:
        raise HTTPException(status_code=403, detail="当前账号不是智能体登录。")
    return session


def _utc_isoformat(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is not None:
        value = value.astimezone(UTC).replace(tzinfo=None)
    return f"{value.isoformat()}Z"


@router.get("/agent/session-status", response_model=AgentSessionStatus)
def agent_session_status(
    authorization: str | None = Header(default=None), db: Session = Depends(get_db)
) -> AgentSessionStatus:
    session = _agent_session(authorization, db)
    return AgentSessionStatus(
        connected=True,
        expiresAt=_utc_isoformat(session.agent_access_token_expires_at),
    )


@router.post("/agent/refresh-token", response_model=AgentRefreshResponse)
async def agent_refresh_token(
    authorization: str | None = Header(default=None), db: Session = Depends(get_db)
) -> AgentRefreshResponse:
    logger.warning(
        "Agent refresh-token request: headers=%s",
        _safe_request_headers({"Authorization": authorization or ""}),
    )
    session = _agent_session(authorization, db)
    if not session.agent_refresh_token:
        raise HTTPException(status_code=409, detail="当前会话没有 refresh_token，请重新登录。")
    result = await _refresh_agent_token(session, db)
    return AgentRefreshResponse(code=0, msg=result.msg, data={"expires_in": result.data.expires_in, "token_type": result.data.token_type})


async def _refresh_agent_token(session: AuthSession, db: Session) -> AgentTokenResponse:
    if not session.agent_refresh_token:
        raise HTTPException(status_code=409, detail="当前会话没有 refresh_token，请重新登录。")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            request_body = {
                "grant_type": "refresh_token", "refresh_token": session.agent_refresh_token,
                "client_id": settings.agent_client_id, "client_secret": settings.agent_client_secret,
            }
            logger.warning(
                "Agent token refresh request: method=%s url=%s body=%s",
                "POST",
                settings.agent_refresh_url,
                _safe_log_value(request_body),
            )
            response = await client.post(settings.agent_refresh_url, json=request_body)
            response.raise_for_status()
            payload = response.json()
            logger.warning(
                "Agent token refresh response: status=%s headers=%s body=%s",
                response.status_code,
                _safe_response_headers(response.headers),
                _safe_log_value(payload),
            )
            if payload.get("code") != 0:
                raise ValueError(payload.get("msg") or "第三方令牌刷新失败")
            result = AgentTokenResponse.model_validate(payload)
            logger.info("Agent token refreshed; expires_in=%s", result.data.expires_in)
    except (httpx.HTTPError, ValueError, TypeError) as error:
        logger.exception("Agent token refresh upstream error: %s", _safe_error_text(str(error)))
        raise HTTPException(status_code=502, detail="刷新智能体令牌失败，请重新登录。") from error
    session.agent_access_token = result.data.access_token
    session.agent_refresh_token = result.data.refresh_token
    session.agent_access_token_expires_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(seconds=result.data.expires_in)
    db.commit()
    return result


async def _fetch_agent_runtime_access(session: AuthSession, db: Session) -> dict:
    if session.agent_access_token_expires_at and session.agent_access_token_expires_at <= datetime.now(UTC).replace(tzinfo=None) + timedelta(seconds=60):
        await _refresh_agent_token(session, db)
    if not _agent_token_is_oauth(session.agent_access_token, session):
        raise HTTPException(status_code=403, detail="当前会话保存的不是有效 OAuth 用户令牌，请重新登录。")
    request_headers = {"Authorization": f"Bearer {session.agent_access_token}"}
    logger.warning(
        "Agent runtime access request: method=%s url=%s headers=%s body=%s",
        "POST",
        settings.agent_runtime_access_url,
        _safe_request_headers(request_headers),
        {},
    )
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            upstream_request = client.build_request(
                "POST",
                settings.agent_runtime_access_url,
                headers=request_headers,
            )
            logger.warning(
                "Agent runtime access effective request: method=%s url=%s headers=%s body=%s",
                upstream_request.method,
                upstream_request.url,
                _safe_response_headers(upstream_request.headers),
                _safe_log_value(upstream_request.content.decode("utf-8", errors="replace")),
            )
            response = await client.send(upstream_request)
            response.raise_for_status()
        payload = response.json()
        logger.warning(
            "Agent runtime access response: status=%s headers=%s body=%s",
            response.status_code,
            _safe_response_headers(response.headers),
            _safe_log_value(payload),
        )
        if not isinstance(payload, dict):
            raise ValueError("第三方运行时配置响应不是 JSON 对象")
        if payload.get("code") not in (None, 0, "0"):
            raise ValueError(payload.get("msg") or "第三方运行时配置获取失败")
        runtime_data = _normalize_runtime_credentials(
            _safe_runtime_data(payload), session.agent_access_token
        )
        for context_key in ("accessContext", "access_context", "context"):
            if context_key not in runtime_data:
                continue
            runtime_context = _context_from_value(runtime_data[context_key])
            if runtime_context is None:
                raise ValueError("第三方运行时配置包含无效的 agentId")
            _save_agent_context(session, runtime_context, db)
            break
        return runtime_data
    except httpx.HTTPStatusError as error:
        logger.exception(
            "Agent runtime access upstream HTTP error: status=%s url=%s headers=%s response=%s",
            error.response.status_code,
            error.request.url,
            _safe_response_headers(error.response.headers),
            _safe_error_text(error.response.text),
        )
        raise HTTPException(status_code=502, detail="获取智能体运行时配置失败。") from error
    except (httpx.HTTPError, ValueError) as error:
        logger.exception("Agent runtime access upstream error: %s", _safe_error_text(str(error)))
        raise HTTPException(status_code=502, detail="获取智能体运行时配置失败。") from error


def _runtime_data_shape(value: object) -> object:
    """Describe response structure without logging runtime credentials or values."""
    if isinstance(value, dict):
        return {str(key): _runtime_data_shape(item) for key, item in value.items()}
    if isinstance(value, list):
        return {
            "type": "list",
            "length": len(value),
            "item": _runtime_data_shape(value[0]) if value else None,
        }
    if value is None:
        return "null"
    return type(value).__name__


def _safe_runtime_data(payload: dict) -> dict:
    """Expose only the runtime access configuration needed by the client."""
    raw = payload.get("data")
    if not isinstance(raw, dict):
        raise ValueError("第三方运行时配置格式无效")
    logger.info("Agent runtime upstream data structure: %s", _runtime_data_shape(raw))
    access = raw.get("access")
    if not isinstance(access, dict):
        raise ValueError("第三方运行时配置缺少 access")
    result = {key: access[key] for key in ("llm", "mcp", "api", "knowledge", "database") if key in access}
    for key in ("accessContext", "access_context", "context"):
        if key in access:
            result[key] = access[key]
    return result


def _normalize_runtime_credentials(runtime: dict, agent_access_token: str) -> dict:
    """Ensure every LLM resource receives the OAuth token in its AccessToken header."""
    llm = runtime.get("llm")
    if not isinstance(llm, dict):
        return runtime

    def normalize_server(server: object) -> object:
        if not isinstance(server, dict):
            return server
        headers = server.get("headers")
        if not isinstance(headers, dict):
            return server
        normalized_headers = {
            str(key): value
            for key, value in headers.items()
            if str(key).lower() not in {"accesstoken", "access-token", "aipaccesstoken"}
        }
        normalized_headers["AccessToken"] = agent_access_token
        normalized_server = dict(server)
        normalized_server["headers"] = normalized_headers
        return normalized_server

    normalized_llm = dict(llm)
    if isinstance(llm.get("headers"), dict):
        normalized_llm = normalize_server(normalized_llm)
    llm_servers = llm.get("llmServers")
    if isinstance(llm_servers, dict):
        normalized_llm["llmServers"] = {
            str(name): normalize_server(server) for name, server in llm_servers.items()
        }
    normalized_runtime = dict(runtime)
    normalized_runtime["llm"] = normalized_llm
    return normalized_runtime


def _select_llm_server(runtime: dict, server_name: str | None = None) -> dict | None:
    """Select a usable LLM resource from either the current or legacy shape."""
    llm = runtime.get("llm")
    if not isinstance(llm, dict):
        return None
    llm_servers = llm.get("llmServers")
    if isinstance(llm_servers, dict):
        if server_name is not None:
            server = llm_servers.get(server_name)
            return server if isinstance(server, dict) and isinstance(server.get("url"), str) and server["url"] else None
        for server in llm_servers.values():
            if isinstance(server, dict) and isinstance(server.get("url"), str) and server["url"]:
                return server
        return None
    if isinstance(llm.get("url"), str) and llm["url"]:
        return llm
    return None


def _select_api_server(runtime: dict, server_name: str, resource_type: str = "api") -> dict | None:
    section = runtime.get(resource_type)
    servers = section.get({"api": "apiServers", "knowledge": "knowledgeServers"}[resource_type]) if isinstance(section, dict) else None
    server = servers.get(server_name) if isinstance(servers, dict) else None
    return server if isinstance(server, dict) and isinstance(server.get("url"), str) and server["url"] else None


def _select_mcp_server(runtime: dict, server_name: str, resource_type: str = "mcp") -> dict | None:
    section = runtime.get(resource_type)
    servers = section.get({"mcp": "mcpServers", "database": "databaseServers"}[resource_type]) if isinstance(section, dict) else None
    server = servers.get(server_name) if isinstance(servers, dict) else None
    return server if isinstance(server, dict) and isinstance(server.get("url"), str) and server["url"] else None


def _gateway_headers(configured_headers: object, access_token: str | None) -> dict[str, str]:
    """Prepare API/knowledge gateway headers using the current OAuth access token."""
    token = (access_token or "").strip()
    if not token:
        raise HTTPException(status_code=403, detail="当前会话没有可用的 OAuth AccessToken。")
    raw = configured_headers if isinstance(configured_headers, dict) else {}
    headers = {str(key): str(value) for key, value in raw.items()
               if value is not None and str(key).lower() not in {"accesstoken", "access-token", "aipaccesstoken"}}
    authorization_key = next((key for key in headers if key.lower() == "authorization"), None)
    authorization = headers[authorization_key].strip() if authorization_key is not None else ""
    if not authorization:
        raise HTTPException(status_code=502, detail="资源配置缺少 Authorization 凭证。")
    if authorization.startswith(("sk-", "sk_")):
        headers[authorization_key] = f"Bearer {authorization}"
    headers["AccessToken"] = token
    return headers


def _gateway_api_request(server: dict, path: str, method: str | None) -> tuple[str, str]:
    # Paths come from the resource's info contract; never allow a client-selected host.
    if "://" in path or ".." in path.split("/") or "\\" in path:
        raise HTTPException(status_code=400, detail="接口路径必须是相对路径。")
    allowed = str(server.get("method") or "ANY").upper().split("/")
    selected = (method or (allowed[0] if allowed[0] != "ANY" else "POST")).upper()
    if selected not in {"GET", "POST", "PUT", "PATCH", "DELETE"} or ("ANY" not in allowed and selected not in allowed):
        raise HTTPException(status_code=400, detail="请求方法不在资源允许范围内。")
    return server["url"].rstrip("/") + "/" + path.lstrip("/"), selected


def _public_runtime_data(runtime: dict) -> dict:
    """Return runtime metadata without forwarding gateway credentials to the browser."""
    sensitive_keys = _SENSITIVE_HEADER_NAMES | {"token", "access_token", "refresh_token", "api_key", "apikey"}

    def redact(value: object, key: str | None = None) -> object:
        if key and key.lower() in sensitive_keys:
            return "[REDACTED]"
        if isinstance(value, dict):
            return {str(item_key): redact(item_value, str(item_key)) for item_key, item_value in value.items()}
        if isinstance(value, list):
            return [redact(item) for item in value]
        return value

    return redact(runtime) if isinstance(runtime, dict) else {}


async def _fetch_agent_access_context(session: AuthSession, db: Session) -> AgentAccessContext:
    """Fetch IAM context with the OAuth user token, never a gateway token."""
    if session.agent_access_token_expires_at and session.agent_access_token_expires_at <= datetime.now(UTC).replace(tzinfo=None) + timedelta(seconds=60):
        await _refresh_agent_token(session, db)
    oauth_token = session.agent_access_token
    if not oauth_token or not _agent_token_is_oauth(oauth_token, session):
        raise HTTPException(status_code=403, detail="当前会话没有可用的 OAuth 用户令牌。")
    request_headers = {"Authorization": f"Bearer {oauth_token}"}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(settings.agent_access_context_url, headers=request_headers)
            response.raise_for_status()
            payload = response.json()
        if not isinstance(payload, dict):
            raise ValueError("access-context 响应不是 JSON 对象")
        if payload.get("code") not in (None, 0, "0"):
            raise ValueError(payload.get("msg") or "access-context 获取失败")
        context = _context_from_value(payload.get("data"))
        if context is None:
            raise ValueError("access-context 缺少有效的 agentId")
        _save_agent_context(session, context, db)
        return context
    except httpx.HTTPStatusError as error:
        logger.warning(
            "Agent access-context upstream HTTP error: status=%s url=%s response=%s",
            error.response.status_code,
            error.request.url,
            _safe_error_text(error.response.text),
        )
        raise HTTPException(status_code=502, detail="获取智能体访问上下文失败。") from error
    except (httpx.HTTPError, ValueError, TypeError) as error:
        logger.warning("Agent access-context upstream error: %s", _safe_error_text(str(error)))
        raise HTTPException(status_code=502, detail="获取智能体访问上下文失败。") from error


@router.get("/agent/access-context", response_model=AgentAccessContext)
async def agent_access_context(
    authorization: str | None = Header(default=None), db: Session = Depends(get_db)
) -> AgentAccessContext:
    session = _agent_session(authorization, db)
    return await _fetch_agent_access_context(session, db)


@router.post("/agent/runtime-access")
async def agent_runtime_access(
    authorization: str | None = Header(default=None), db: Session = Depends(get_db)
) -> dict:
    session = _agent_session(authorization, db)
    runtime = await _fetch_agent_runtime_access(session, db)
    if settings.agent_runtime_expose_sensitive:
        logger.warning("AGENT_RUNTIME_EXPOSE_SENSITIVE is enabled; returning upstream credentials to the caller")
        return envelope(runtime, "成功", 0)
    return envelope(_public_runtime_data(runtime), "成功", 0)


@router.post("/agent/runtime-chat", response_model=AgentRuntimeChatResponse)
async def agent_runtime_chat(
    request: AgentRuntimeChatRequest,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> AgentRuntimeChatResponse:
    session = _agent_session(authorization, db)
    logger.info(
        "Agent runtime-chat params: message=%r model=%r llmServer=%r chatContextId=%r stream=%s",
        request.message,
        request.model,
        request.llmServer,
        request.chatContextId,
        request.stream,
    )
    runtime = await _fetch_agent_runtime_access(session, db)
    llm = _select_llm_server(runtime, request.llmServer)
    if llm is None:
        detail = "指定的 LLM Server 不存在或不可用。" if request.llmServer else "上游未返回可用的 LLM 配置。"
        raise HTTPException(status_code=400 if request.llmServer else 502, detail=detail)
    logger.info("Agent runtime LLM configuration: %s", _safe_log_value(llm))

    upstream_body = llm.get("body") if isinstance(llm.get("body"), dict) else {}
    body = dict(upstream_body)
    if request.model is not None and request.model.strip():
        body["model"] = request.model.strip()
    body["user"] = body.get("user") if body.get("user") and body.get("user") != "user_id/user_name" else session.user_id.removeprefix("agent-")
    body["chat_context_id"] = request.chatContextId or str(uuid4())
    body["messages"] = [{"role": "user", "content": request.message}]
    body["stream"] = request.stream

    headers = _prepare_llm_headers(llm.get("headers"), session.agent_access_token)
    method = str(llm.get("method") or "POST").upper()
    logger.info(
        "Agent runtime LLM request: method=%s url=%s headers=%s body=%s",
        method,
        llm["url"],
        _safe_request_headers(headers),
        _safe_log_value(body),
    )
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            upstream_request = client.build_request(
                method,
                llm["url"],
                headers=headers,
                json=body,
            )
            logger.info(
                "Agent runtime LLM effective request: method=%s url=%s headers=%s body=%s",
                upstream_request.method,
                upstream_request.url,
                _safe_response_headers(upstream_request.headers),
                _safe_log_value(upstream_request.content.decode("utf-8", errors="replace")),
            )
            response = await client.send(upstream_request)
            response.raise_for_status()
            try:
                result: object = response.json()
            except ValueError:
                result = response.text
        logger.info(
            "Agent runtime LLM response: status=%s headers=%s body=%s",
            response.status_code,
            _safe_response_headers(response.headers),
            _safe_log_value(result),
        )
    except httpx.HTTPStatusError as error:
        logger.exception(
            "Agent runtime LLM upstream HTTP error: status=%s url=%s headers=%s response=%s",
            error.response.status_code,
            error.request.url,
            _safe_response_headers(error.response.headers),
            _safe_error_text(error.response.text),
        )
        raise HTTPException(status_code=502, detail="调用智能体 LLM 网关失败。") from error
    except (httpx.HTTPError, ValueError) as error:
        logger.exception("Agent runtime LLM upstream error: %s", error)
        raise HTTPException(status_code=502, detail="调用智能体 LLM 网关失败。") from error
    return AgentRuntimeChatResponse(status_code=response.status_code, data=result)


@router.post("/agent/runtime-api", response_model=AgentRuntimeChatResponse)
async def agent_runtime_api(
    request: AgentRuntimeApiRequest,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> AgentRuntimeChatResponse:
    session = _agent_session(authorization, db)
    runtime = await _fetch_agent_runtime_access(session, db)
    if request.resourceType not in {"api", "knowledge"}:
        raise HTTPException(status_code=400, detail="资源类型无效。")
    server = _select_api_server(runtime, request.apiServer, request.resourceType)
    if server is None:
        raise HTTPException(status_code=400, detail="指定的 API Server 不存在或不可用。")
    headers = _gateway_headers(server.get("headers"), session.agent_access_token)
    url, method = _gateway_api_request(server, request.path, request.method)
    body = request.body if request.body is not None else (server.get("body") if isinstance(server.get("body"), dict) else None)
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            upstream_request = client.build_request(
                method,
                url,
                headers=headers,
                params=body if method == "GET" else None,
                json=body if method != "GET" else None,
            )
            logger.info(
                "Agent runtime API request: resource_type=%s server=%r method=%s url=%s headers=%s body=%s",
                request.resourceType,
                request.apiServer,
                upstream_request.method,
                upstream_request.url,
                _safe_response_headers(upstream_request.headers),
                _safe_log_value(body),
            )
            response = await client.send(upstream_request)
            response.raise_for_status()
            try:
                result: object = response.json()
            except ValueError:
                result = response.text
        logger.info(
            "Agent runtime API response: status=%s url=%s headers=%s body=%s",
            response.status_code,
            response.request.url,
            _safe_response_headers(response.headers),
            _safe_log_value(result),
        )
    except httpx.HTTPStatusError as error:
        logger.exception(
            "Agent runtime API upstream HTTP error: status=%s method=%s url=%s "
            "request_headers=%s response_headers=%s response=%s",
            error.response.status_code,
            error.request.method,
            error.request.url,
            _safe_response_headers(error.request.headers),
            _safe_response_headers(error.response.headers),
            _safe_error_text(error.response.text),
        )
        raise HTTPException(status_code=502, detail="调用智能体 API 网关失败。") from error
    except httpx.HTTPError as error:
        error_request = getattr(error, "request", None)
        logger.exception(
            "Agent runtime API upstream transport error: type=%s method=%s url=%s error=%s",
            type(error).__name__,
            getattr(error_request, "method", method),
            getattr(error_request, "url", url),
            _safe_error_text(str(error)),
        )
        raise HTTPException(status_code=502, detail="调用智能体 API 网关失败。") from error
    except ValueError as error:
        logger.exception(
            "Agent runtime API response parsing error: method=%s url=%s error=%s",
            method,
            url,
            _safe_error_text(str(error)),
        )
        raise HTTPException(status_code=502, detail="调用智能体 API 网关失败。") from error
    return AgentRuntimeChatResponse(status_code=response.status_code, data=result)


@router.post("/agent/runtime-mcp", response_model=AgentRuntimeMcpResponse)
async def agent_runtime_mcp(
    request: AgentRuntimeMcpRequest,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> AgentRuntimeMcpResponse:
    session = _agent_session(authorization, db)
    runtime = await _fetch_agent_runtime_access(session, db)
    if request.resourceType not in {"mcp", "database"}:
        raise HTTPException(status_code=400, detail="资源类型无效。")
    server = _select_mcp_server(runtime, request.mcpServer, request.resourceType)
    if server is None:
        raise HTTPException(status_code=400, detail="指定的 MCP Server 不是 HTTP 服务或不存在。")
    headers = _prepare_mcp_headers(
        server.get("headers"),
        session.agent_access_token,
        request.chatContextId or str(uuid4()),
        request.mcpSessionId,
    )
    body = request.body if request.body is not None else (server.get("body") if isinstance(server.get("body"), dict) else None)
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            upstream_request = client.build_request(
                str(server.get("method") or "POST").upper(),
                server["url"],
                headers=headers,
                json=body,
            )
            logger.info(
                "Agent runtime MCP request: resource_type=%s server=%r method=%s url=%s headers=%s body=%s",
                request.resourceType,
                request.mcpServer,
                upstream_request.method,
                upstream_request.url,
                _safe_response_headers(upstream_request.headers),
                _safe_log_value(body),
            )
            response = await client.send(upstream_request)
            response.raise_for_status()
            result = _parse_mcp_response(response)
        logger.info(
            "Agent runtime MCP response: status=%s url=%s headers=%s body=%s",
            response.status_code,
            response.request.url,
            _safe_response_headers(response.headers),
            _safe_log_value(result),
        )
    except httpx.HTTPStatusError as error:
        logger.exception(
            "Agent runtime MCP upstream HTTP error: status=%s method=%s url=%s "
            "request_headers=%s response_headers=%s response=%s",
            error.response.status_code,
            error.request.method,
            error.request.url,
            _safe_response_headers(error.request.headers),
            _safe_response_headers(error.response.headers),
            _safe_error_text(error.response.text),
        )
        raise HTTPException(status_code=502, detail="调用智能体 MCP 网关失败。") from error
    except httpx.HTTPError as error:
        error_request = getattr(error, "request", None)
        logger.exception(
            "Agent runtime MCP upstream transport error: type=%s method=%s url=%s error=%s",
            type(error).__name__,
            getattr(error_request, "method", str(server.get("method") or "POST").upper()),
            getattr(error_request, "url", server["url"]),
            _safe_error_text(str(error)),
        )
        raise HTTPException(status_code=502, detail="调用智能体 MCP 网关失败。") from error
    except ValueError as error:
        logger.exception(
            "Agent runtime MCP response parsing error: method=%s url=%s error=%s",
            str(server.get("method") or "POST").upper(),
            server["url"],
            _safe_error_text(str(error)),
        )
        raise HTTPException(status_code=502, detail="调用智能体 MCP 网关失败。") from error
    return AgentRuntimeMcpResponse(
        status_code=response.status_code,
        data=result,
        mcp_session_id=response.headers.get("mcp-session-id"),
    )


@router.get("/captcha", response_model=CaptchaResponse)
def get_captcha(db: Session = Depends(get_db)) -> CaptchaResponse:
    return create_captcha(db)


@router.post("/register", response_model=AuthResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    try:
        return register_user(
            db,
            request.username,
            request.password,
            request.name,
            request.captchaId,
            request.captchaCode,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/login", response_model=AuthResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    try:
        return login_user(db, request.username, request.password, request.captchaId, request.captchaCode)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.get("/me", response_model=AuthUser)
def me(current_user: User = Depends(get_current_user)) -> AuthUser:
    return to_auth_user(current_user)


@router.patch("/me/name", response_model=AuthUser)
def update_name(
    request: UpdateNameRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AuthUser:
    try:
        return update_user_name(db, current_user, request.name)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.patch("/me/password")
def update_password(
    request: UpdatePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    try:
        update_user_password(db, current_user, request.currentPassword, request.newPassword)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    return {"ok": True}


async def _logout_session(
    authorization: str | None,
    db: Session,
    revoke_agent_token: bool,
) -> dict[str, bool]:
    if authorization and authorization.startswith("Bearer "):
        local_token = authorization.removeprefix("Bearer ").strip()
        session = db.get(AuthSession, local_token)
        agent_access_token = session.agent_access_token if session else None
        delete_session(db, local_token)
        if revoke_agent_token and agent_access_token:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(
                        settings.agent_logout_url,
                        headers={"Authorization": f"Bearer {agent_access_token}"},
                    )
                    response.raise_for_status()
            except httpx.HTTPError:
                pass
    return {"ok": True}


@router.post("/logout")
async def logout(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    return await _logout_session(authorization, db, revoke_agent_token=False)


@router.post("/agent/logout")
async def agent_logout(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    return await _logout_session(authorization, db, revoke_agent_token=True)
