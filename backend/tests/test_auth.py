from fastapi.testclient import TestClient
from pytest import MonkeyPatch

from app.main import app
from app.core.config import settings
from app.services import auth_service


client = TestClient(app)


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
