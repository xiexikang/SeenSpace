import asyncio
import json
from types import SimpleNamespace

import httpx
import pytest

from app.api.routes.auth import _refresh_agent_token
from app.core.config import settings


@pytest.mark.parametrize("pki_enabled", [False, True])
def test_refresh_authentication_and_token_rotation(monkeypatch, pki_enabled):
    calls = []

    def upstream(request):
        calls.append(json.loads(request.content))
        return httpx.Response(200, json={
            "code": 0, "msg": "success", "data": {
                "access_token": "at_new", "refresh_token": "rt_new",
                "token_type": "Bearer", "expires_in": 300,
            },
        })

    monkeypatch.setattr(settings, "agent_pki_enabled", pki_enabled)
    monkeypatch.setattr(settings, "agent_client_secret", "test-secret")
    monkeypatch.setattr("app.api.routes.auth.agent_http_client", lambda **kwargs: httpx.AsyncClient(
        transport=httpx.MockTransport(upstream), **kwargs,
    ))
    session = SimpleNamespace(agent_refresh_token="rt_old")
    commits = []
    result = asyncio.run(_refresh_agent_token(session, SimpleNamespace(commit=lambda: commits.append(True))))

    expected = {
        "grant_type": "refresh_token", "refresh_token": "rt_old", "client_id": settings.agent_client_id,
    }
    if not pki_enabled:
        expected["client_secret"] = "test-secret"
    assert calls == [expected]
    assert result.data.access_token == session.agent_access_token == "at_new"
    assert session.agent_refresh_token == "rt_new"
    assert session.agent_access_token_expires_at is not None
    assert commits == [True]
