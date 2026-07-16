from fastapi.testclient import TestClient
from pytest import MonkeyPatch

from app.main import app
from app.services import auth_service


client = TestClient(app)


def fixed_captcha(monkeypatch: MonkeyPatch) -> None:
    monkeypatch.setattr(auth_service.random, "choice", lambda alphabet: "A")


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
