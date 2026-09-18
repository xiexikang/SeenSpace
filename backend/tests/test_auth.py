import asyncio
import json
from datetime import datetime
from types import SimpleNamespace

import httpx

from fastapi.testclient import TestClient
from pytest import MonkeyPatch

from app.main import app
from app.core.config import settings
from app.api.routes.auth import (
    _fetch_agent_runtime_access,
    _gateway_api_request,
    _gateway_headers,
    _normalize_runtime_credentials,
    _prepare_llm_headers,
    _prepare_mcp_headers,
    _parse_mcp_response,
    _safe_request_headers,
    _safe_runtime_data,
)
from app.services import auth_service


client = TestClient(app)


def test_agent_session_status_marks_expiry_as_utc(monkeypatch: MonkeyPatch) -> None:
    session = SimpleNamespace(agent_access_token_expires_at=datetime(2026, 9, 15, 4, 30))
    monkeypatch.setattr("app.api.routes.auth._agent_session", lambda _authorization, _db: session)

    response = client.get(
        "/api/auth/agent/session-status",
        headers={"Authorization": "Bearer local-session"},
    )

    assert response.status_code == 200
    assert response.json()["data"] == {
        "connected": True,
        "expiresAt": "2026-09-15T04:30:00Z",
    }


def test_runtime_data_returns_only_upstream_access_config(caplog) -> None:
    caplog.set_level("INFO", logger="app.api.routes.auth")
    payload = {
        "data": {
            "active": True,
            "access": {
                "llm": {
                    "url": "https://llm.example/v1/chat/completions",
                    "method": "POST",
                    "headers": {"Authorization": "Bearer secret-token", "Content-Type": "application/json"},
                    "body": {"model": "", "messages": [{"role": "user", "content": "hello"}]},
                },
                "mcp": {"mcpServers": {"search": {"url": "https://mcp.example"}}},
            },
        }
    }

    result = _safe_runtime_data(payload)

    assert result == {
        "llm": {
            "url": "https://llm.example/v1/chat/completions",
            "method": "POST",
            "headers": {"Authorization": "Bearer secret-token", "Content-Type": "application/json"},
            "body": {"model": "", "messages": [{"role": "user", "content": "hello"}]},
        },
        "mcp": {"mcpServers": {"search": {"url": "https://mcp.example"}}},
    }
    assert "secret-token" not in caplog.text
    assert "access" in caplog.text


def test_sensitive_headers_have_token_diagnostics_by_default(monkeypatch: MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "agent_debug_log_sensitive", False)
    assert _safe_request_headers({
        "Authorization": "Bearer at_secret",
        "AccessToken": "gw_secret",
        "Accept": "application/json",
    }) == {
        "Authorization": "scheme=Bearer token_kind=at token_length=9 sha256_16=238ad2bb5d275885",
        "AccessToken": "token_kind=gw token_length=9 sha256_16=e7f078a946435b64",
        "Accept": "application/json",
    }


def test_llm_headers_use_agent_oauth_token_instead_of_gateway_token() -> None:
    headers = _prepare_llm_headers({
        "Authorization": "Bearer sk_llm-key",
        "AccessToken": "gw_gateway-token",
        "aipAccessToken": "gw_gateway-token",
        "Accept": "application/json",
    }, "at_agent-oauth-token")
    assert headers == {
        "Accept": "application/json",
        "Authorization": "Bearer sk_llm-key",
        "AccessToken": "at_agent-oauth-token",
        "Content-Type": "application/json",
    }


def test_llm_headers_reject_oauth_token_in_api_key_slot() -> None:
    import pytest

    with pytest.raises(Exception, match="OAuth"):
        _prepare_llm_headers({"Authorization": "Bearer at_oauth-token"}, "at_agent-oauth-token")


def test_mcp_headers_include_aip_token_context_and_sse_accept() -> None:
    headers = _prepare_mcp_headers({
        "Authorization": "Bearer sk-bd6f4efe",
        "AccessToken": "gw_gateway-token",
        "chat-context-id": "old-context",
    }, "gw_caller-token", "debug-context")
    assert headers == {
        "Authorization": "Bearer sk-bd6f4efe",
        "AccessToken": "gw_caller-token",
        "chat-context-id": "debug-context",
        "Accept": "application/json, text/event-stream",
        "Content-Type": "application/json",
    }

    resumed = _prepare_mcp_headers(
        {"Authorization": "Bearer sk-bd6f4efe"},
        "gw_caller-token",
        "debug-context",
        "session-123",
    )
    assert resumed["MCP-Session-Id"] == "session-123"


def test_mcp_sse_response_is_unwrapped_to_json() -> None:
    response = httpx.Response(
        200,
        headers={"content-type": "text/event-stream; charset=utf-8"},
        text='event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"tools":[]}}\n\n',
    )

    assert _parse_mcp_response(response) == {
        "jsonrpc": "2.0",
        "id": 1,
        "result": {"tools": []},
    }


def test_mcp_sse_response_supports_multiple_data_events() -> None:
    response = httpx.Response(
        200,
        headers={"content-type": "text/event-stream"},
        text='data: {"progress":1}\n\ndata: plain text\n\ndata: [DONE]\n\n',
    )

    assert _parse_mcp_response(response) == [{"progress": 1}, "plain text"]


def test_runtime_credentials_replace_gateway_aip_access_token() -> None:
    runtime = {
        "llm": {
            "headers": {
                "Authorization": "Bearer sk_llm-key",
                "AccessToken": "gw_gateway-token",
                "aipAccessToken": "gw_gateway-token",
            }
        }
    }
    assert _normalize_runtime_credentials(runtime, "at_agent-oauth-token") == {
        "llm": {
            "headers": {
                "Authorization": "Bearer sk_llm-key",
                "AccessToken": "at_agent-oauth-token",
            }
        }
    }


def test_runtime_data_preserves_api_servers() -> None:
    payload = {
        "data": {
            "access": {
                "llm": {"llmServers": {}},
                "mcp": {"mcpServers": {}},
                "api": {"apiServers": {"APP-orders": {"url": "https://api.example/orders"}}},
            }
        }
    }

    assert _safe_runtime_data(payload)["api"] == payload["data"]["access"]["api"]


def test_runtime_data_preserves_all_keyed_resource_types_and_missing_sections() -> None:
    access = {
        "knowledge": {"knowledgeServers": {"产品文档(APP-docs，member)": {"url": "https://gateway/knowledge/"}}},
        "database": {"databaseServers": {"订单库(APP-db，member)": {"url": "https://gateway/mcp/db"}}},
    }
    result = _safe_runtime_data({"data": {"access": access}})
    assert result == access
    assert "llm" not in result
    assert "mcp" not in result
    assert "api" not in result


def test_gateway_headers_replace_access_token_and_normalize_authorization() -> None:
    assert _gateway_headers({
        "Authorization": "Bearer app-token",
        "AccessToken": "",
        "Content-Type": "application/json",
    }, "at_agent-oauth-token") == {
        "Authorization": "Bearer app-token",
        "AccessToken": "at_agent-oauth-token",
        "Content-Type": "application/json",
    }
    assert _gateway_headers({
        "authorization": "sk-gateway-token",
    }, "at_agent-oauth-token") == {
        "authorization": "Bearer sk-gateway-token",
        "AccessToken": "at_agent-oauth-token",
    }
    assert _gateway_headers({
        "Authorization": "Basic configured-value",
    }, "at_agent-oauth-token")["Authorization"] == "Basic configured-value"


def test_gateway_api_request_appends_info_path_and_enforces_method() -> None:
    server = {"url": "https://gateway.example/app-id-api/", "method": "POST/GET"}
    assert _gateway_api_request(server, "knowledge/search", "POST") == (
        "https://gateway.example/app-id-api/knowledge/search", "POST"
    )
    assert _gateway_api_request(server, "/knowledge/search", "GET") == (
        "https://gateway.example/app-id-api/knowledge/search", "GET"
    )

    import pytest
    with pytest.raises(Exception, match="允许范围"):
        _gateway_api_request(server, "knowledge/search", "DELETE")
    with pytest.raises(Exception, match="相对路径"):
        _gateway_api_request(server, "https://upstream.example/search", "POST")


def test_nested_llm_servers_receive_agent_access_token() -> None:
    runtime = {
        "llm": {
            "llmServers": {
                "APP-chat": {
                    "url": "https://llm.example/chat",
                    "headers": {
                        "Authorization": "Bearer sk_llm-key",
                        "AccessToken": "",
                        "aipAccessToken": "gw_gateway-token",
                    },
                }
            }
        }
    }

    assert _normalize_runtime_credentials(runtime, "at_agent-oauth-token")["llm"]["llmServers"]["APP-chat"]["headers"] == {
        "Authorization": "Bearer sk_llm-key",
        "AccessToken": "at_agent-oauth-token",
    }


def test_runtime_access_endpoint_returns_api_servers_without_credentials(monkeypatch: MonkeyPatch) -> None:
    async def fake_runtime_access(_session, _db):
        return {
            "llm": {
                "llmServers": {
                    "APP-chat": {
                        "url": "https://llm.example/chat",
                        "headers": {"Authorization": "Bearer sk_llm-key", "AccessToken": "at_agent-oauth-token"},
                    }
                }
            },
            "api": {
                "apiServers": {
                    "APP-orders": {
                        "url": "https://api.example/orders",
                        "headers": {"Authorization": "Bearer member-api-token", "AccessToken": ""},
                    }
                }
            },
        }

    monkeypatch.setattr(settings, "agent_runtime_expose_sensitive", False)
    monkeypatch.setattr("app.api.routes.auth._agent_session", lambda _authorization, _db: SimpleNamespace())
    monkeypatch.setattr("app.api.routes.auth._fetch_agent_runtime_access", fake_runtime_access)

    response = client.post("/api/auth/agent/runtime-access", headers={"Authorization": "Bearer local-session"})

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["api"]["apiServers"]["APP-orders"]["url"] == "https://api.example/orders"
    assert payload["api"]["apiServers"]["APP-orders"]["headers"]["Authorization"] == "[REDACTED]"
    assert payload["llm"]["llmServers"]["APP-chat"]["headers"]["AccessToken"] == "[REDACTED]"


def test_runtime_access_upstream_request_has_bearer_and_no_body(monkeypatch: MonkeyPatch) -> None:
    calls: list[dict] = []

    class FakeResponse:
        status_code = 200
        headers = {"content-type": "application/json"}
        text = ""

        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict:
            return {"code": 0, "data": {"access": {"api": {"apiServers": {}}}}}

    class FakeClient:
        def __init__(self, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        def build_request(self, method, url, **kwargs):
            calls.append({"method": method, "url": url, "kwargs": kwargs})
            return httpx.Request(method, url, **kwargs)

        async def send(self, _request):
            return FakeResponse()

    monkeypatch.setattr("app.api.routes.auth.httpx.AsyncClient", FakeClient)
    session = SimpleNamespace(
        agent_access_token="at_agent-oauth-token",
        agent_access_token_expires_at=None,
    )

    runtime = asyncio.run(_fetch_agent_runtime_access(session, SimpleNamespace()))

    assert runtime == {"api": {"apiServers": {}}}
    assert calls == [{
        "method": "POST",
        "url": settings.agent_runtime_access_url,
        "kwargs": {"headers": {"Authorization": "Bearer at_agent-oauth-token"}},
    }]


def fixed_captcha(monkeypatch: MonkeyPatch) -> None:
    monkeypatch.setattr(auth_service.random, "choice", lambda alphabet: "A")


def test_agent_authorize_url_uses_server_credentials(monkeypatch: MonkeyPatch) -> None:
    calls: list[dict] = []

    class FakeResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict:
            return {"code": 0, "data": {"authorizeUrl": "https://agent.example/authorize", "state": "state-1"}}

    class FakeClient:
        def __init__(self, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def post(self, url, **kwargs):
            calls.append({"url": url, **kwargs})
            return FakeResponse()

    monkeypatch.setattr("app.api.routes.auth.httpx.AsyncClient", FakeClient)

    response = client.post("/api/auth/agent/getAuthorizeUrl")

    assert response.status_code == 200
    assert response.json()["data"]["authorizeUrl"] == "https://agent.example/authorize"
    assert calls == [{
        "url": settings.agent_authorize_url,
        "json": {"clientId": settings.agent_client_id, "clientSecret": settings.agent_client_secret},
    }]


def test_agent_authorize_url_surfaces_upstream_business_error(monkeypatch: MonkeyPatch) -> None:
    class FakeResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict:
            return {"code": 401, "msg": "账号未登录"}

    class FakeClient:
        def __init__(self, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def post(self, _url, **_kwargs):
            return FakeResponse()

    monkeypatch.setattr("app.api.routes.auth.httpx.AsyncClient", FakeClient)

    response = client.post("/api/auth/agent/getAuthorizeUrl")

    assert response.status_code == 502
    assert response.json()["message"] == "智能体授权失败：账号未登录"


def test_agent_runtime_chat_uses_upstream_llm_configuration(monkeypatch: MonkeyPatch, caplog) -> None:
    monkeypatch.setattr(settings, "agent_debug_log_sensitive", False)
    caplog.set_level("INFO", logger="app.api.routes.auth")
    calls: list[dict] = []

    async def fake_runtime_access(_session, _db):
        return {
            "llm": {
                "url": "https://llm.example/v1/chat/completions",
                "method": "POST",
                "headers": {
                    "Authorization": "Bearer sk_llm-key",
                    "AccessToken": "gw_gateway-token",
                    "Accept": "application/json",
                },
                "body": {
                    "model": "upstream-model",
                    "user": "user_id/user_name",
                    "chat_context_id": "old-context",
                    "messages": [{"role": "system", "content": "keep this"}],
                    "stream": True,
                },
            }
        }

    class FakeResponse:
        status_code = 200
        text = ""
        headers = {"content-type": "application/json"}

        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict:
            return {"choices": [{"message": {"role": "assistant", "content": "你好"}}]}

    class FakeClient:
        def __init__(self, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        def build_request(self, method, url, **kwargs):
            return httpx.Request(method, url, **kwargs)

        async def send(self, request):
            calls.append({
                "method": request.method,
                "url": str(request.url),
                "headers": {
                    key: value
                    for key, value in request.headers.items()
                    if key.lower() in {"authorization", "accesstoken", "accept", "content-type"}
                },
                "json": json.loads(request.content.decode("utf-8")),
            })
            return FakeResponse()

    monkeypatch.setattr(
        "app.api.routes.auth._agent_session",
        lambda _authorization, _db: SimpleNamespace(user_id="agent-42", agent_access_token="at_agent-oauth-token"),
    )
    monkeypatch.setattr("app.api.routes.auth._fetch_agent_runtime_access", fake_runtime_access)
    monkeypatch.setattr("app.api.routes.auth.httpx.AsyncClient", FakeClient)

    response = client.post(
        "/api/auth/agent/runtime-chat",
        headers={"Authorization": "Bearer local-session"},
        json={"message": "请介绍自己", "model": "debug-model", "chatContextId": "debug-context"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "code": 0,
        "message": "",
        "data": {
            "status_code": 200,
            "data": {"choices": [{"message": {"role": "assistant", "content": "你好"}}]},
        },
    }
    assert calls == [{
        "method": "POST",
        "url": "https://llm.example/v1/chat/completions",
        "headers": {
            "accept": "application/json",
            "authorization": "Bearer sk_llm-key",
            "accesstoken": "at_agent-oauth-token",
            "content-type": "application/json",
        },
        "json": {
            "model": "debug-model",
            "user": "42",
            "chat_context_id": "debug-context",
            "messages": [{"role": "user", "content": "请介绍自己"}],
            "stream": False,
        },
    }]
    assert "Agent runtime LLM request" in caplog.text
    assert "gw_gateway-token" not in caplog.text
    assert "at_agent-oauth-token" not in caplog.text
    assert "body=" in caplog.text


def test_agent_runtime_api_logs_upstream_http_error_without_credentials(
    monkeypatch: MonkeyPatch, caplog
) -> None:
    monkeypatch.setattr(settings, "agent_debug_log_sensitive", False)
    caplog.set_level("INFO", logger="app.api.routes.auth")

    async def fake_runtime_access(_session, _db):
        return {
            "api": {
                "apiServers": {
                    "weather": {
                        "url": "https://gateway.example/app-api",
                        "method": "POST",
                        "headers": {
                            "Authorization": "Bearer sk_gateway-secret",
                            "AccessToken": "at_stale-token",
                        },
                    }
                }
            }
        }

    class FakeClient:
        def __init__(self, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        def build_request(self, method, url, **kwargs):
            return httpx.Request(method, url, **kwargs)

        async def send(self, request):
            return httpx.Response(
                403,
                request=request,
                headers={"content-type": "application/json"},
                json={"message": "AccessToken rejected"},
            )

    monkeypatch.setattr(
        "app.api.routes.auth._agent_session",
        lambda _authorization, _db: SimpleNamespace(agent_access_token="at_current-oauth-token"),
    )
    monkeypatch.setattr("app.api.routes.auth._fetch_agent_runtime_access", fake_runtime_access)
    monkeypatch.setattr("app.api.routes.auth.httpx.AsyncClient", FakeClient)

    response = client.post(
        "/api/auth/agent/runtime-api",
        headers={"Authorization": "Bearer local-session"},
        json={"apiServer": "weather", "path": "/v1/forecast", "method": "POST", "body": {"city": "Shanghai"}},
    )

    assert response.status_code == 502
    assert "Agent runtime API upstream HTTP error" in caplog.text
    assert "status=403" in caplog.text
    assert "https://gateway.example/app-api/v1/forecast" in caplog.text
    assert "AccessToken rejected" in caplog.text
    assert "sk_gateway-secret" not in caplog.text
    assert "at_current-oauth-token" not in caplog.text


def test_agent_runtime_api_sends_get_body_as_query_params(monkeypatch: MonkeyPatch) -> None:
    requests: list[httpx.Request] = []

    async def fake_runtime_access(_session, _db):
        return {
            "api": {
                "apiServers": {
                    "catalog": {
                        "url": "https://gateway.example/app-api/",
                        "method": "GET",
                        "headers": {"Authorization": "sk-gateway-token"},
                    }
                }
            }
        }

    class FakeClient:
        def __init__(self, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        def build_request(self, method, url, **kwargs):
            return httpx.Request(method, url, **kwargs)

        async def send(self, request):
            requests.append(request)
            return httpx.Response(200, request=request, json={"items": []})

    monkeypatch.setattr(
        "app.api.routes.auth._agent_session",
        lambda _authorization, _db: SimpleNamespace(agent_access_token="at_current-oauth-token"),
    )
    monkeypatch.setattr("app.api.routes.auth._fetch_agent_runtime_access", fake_runtime_access)
    monkeypatch.setattr("app.api.routes.auth.httpx.AsyncClient", FakeClient)

    response = client.post(
        "/api/auth/agent/runtime-api",
        headers={"Authorization": "Bearer local-session"},
        json={
            "apiServer": "catalog",
            "method": "GET",
            "body": {"list-type": 2, "keyword": "Shanghai"},
        },
    )

    assert response.status_code == 200
    assert len(requests) == 1
    assert requests[0].method == "GET"
    assert dict(requests[0].url.params) == {"list-type": "2", "keyword": "Shanghai"}
    assert requests[0].content == b""
    assert requests[0].headers["Authorization"] == "Bearer sk-gateway-token"


def test_agent_runtime_mcp_logs_upstream_http_error_without_credentials(
    monkeypatch: MonkeyPatch, caplog
) -> None:
    monkeypatch.setattr(settings, "agent_debug_log_sensitive", False)
    caplog.set_level("INFO", logger="app.api.routes.auth")

    async def fake_runtime_access(_session, _db):
        return {
            "mcp": {
                "mcpServers": {
                    "tools": {
                        "url": "https://gateway.example/mcp/tools",
                        "method": "POST",
                        "headers": {"Authorization": "Bearer sk_mcp-secret"},
                    }
                }
            }
        }

    class FakeClient:
        def __init__(self, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        def build_request(self, method, url, **kwargs):
            return httpx.Request(method, url, **kwargs)

        async def send(self, request):
            return httpx.Response(
                401,
                request=request,
                headers={"content-type": "application/json"},
                json={"message": "MCP authentication failed"},
            )

    monkeypatch.setattr(
        "app.api.routes.auth._agent_session",
        lambda _authorization, _db: SimpleNamespace(agent_access_token="at_current-oauth-token"),
    )
    monkeypatch.setattr("app.api.routes.auth._fetch_agent_runtime_access", fake_runtime_access)
    monkeypatch.setattr("app.api.routes.auth.httpx.AsyncClient", FakeClient)

    response = client.post(
        "/api/auth/agent/runtime-mcp",
        headers={"Authorization": "Bearer local-session"},
        json={
            "mcpServer": "tools",
            "chatContextId": "private-chat-context",
            "mcpSessionId": "private-mcp-session",
            "body": {"jsonrpc": "2.0", "method": "tools/list", "id": 1},
        },
    )

    assert response.status_code == 502
    assert "Agent runtime MCP upstream HTTP error" in caplog.text
    assert "status=401" in caplog.text
    assert "https://gateway.example/mcp/tools" in caplog.text
    assert "MCP authentication failed" in caplog.text
    assert "sk_mcp-secret" not in caplog.text
    assert "at_current-oauth-token" not in caplog.text
    assert "private-chat-context" not in caplog.text
    assert "private-mcp-session" not in caplog.text


def test_register_me_and_logout(monkeypatch: MonkeyPatch) -> None:
    fixed_captcha(monkeypatch)
    captcha = client.get("/api/auth/captcha").json()

    response = client.post(
        "/api/auth/register",
        json={
            "username": "authuser",
            "name": "认证用户",
            "password": "seenspace123",
            "captchaId": captcha["captchaId"],
            "captchaCode": "AAAAA",
        },
    )

    assert response.status_code == 200
    token = response.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["username"] == "authuser"

    logout = client.post("/api/auth/logout", headers=headers)
    assert logout.status_code == 200

    after_logout = client.get("/api/auth/me", headers=headers)
    assert after_logout.status_code == 401


def test_login_rejects_wrong_captcha(monkeypatch: MonkeyPatch) -> None:
    fixed_captcha(monkeypatch)
    captcha = client.get("/api/auth/captcha").json()

    response = client.post(
        "/api/auth/login",
        json={
            "username": "demo",
            "password": "seenspace123",
            "captchaId": captcha["captchaId"],
            "captchaCode": "22222",
        },
    )

    assert response.status_code == 400


def test_update_name_and_password(monkeypatch: MonkeyPatch) -> None:
    fixed_captcha(monkeypatch)
    captcha = client.get("/api/auth/captcha").json()
    registered = client.post(
        "/api/auth/register",
        json={
            "username": "profileuser",
            "name": "原昵称",
            "password": "seenspace123",
            "captchaId": captcha["captchaId"],
            "captchaCode": "AAAAA",
        },
    )
    assert registered.status_code == 200
    headers = {"Authorization": f"Bearer {registered.json()['token']}"}

    renamed = client.patch("/api/auth/me/name", headers=headers, json={"name": "新昵称"})
    assert renamed.status_code == 200
    assert renamed.json()["name"] == "新昵称"

    wrong_password = client.patch(
        "/api/auth/me/password",
        headers=headers,
        json={"currentPassword": "wrong-password", "newPassword": "updated-password"},
    )
    assert wrong_password.status_code == 400

    updated_password = client.patch(
        "/api/auth/me/password",
        headers=headers,
        json={"currentPassword": "seenspace123", "newPassword": "updated-password"},
    )
    assert updated_password.status_code == 200

    captcha = client.get("/api/auth/captcha").json()
    login_with_new_password = client.post(
        "/api/auth/login",
        json={
            "username": "profileuser",
            "password": "updated-password",
            "captchaId": captcha["captchaId"],
            "captchaCode": "AAAAA",
        },
    )
    assert login_with_new_password.status_code == 200
