from fastapi.testclient import TestClient
from pytest import MonkeyPatch

from app.api.routes import web
from app.core.database import SessionLocal
from app.main import app
from app.models.user import User
from app.services.auth_service import create_session
from app.services.web_metadata_service import parse_page_metadata


client = TestClient(app)


def auth_headers() -> dict[str, str]:
    db = SessionLocal()
    try:
        user = db.get(User, "demo-user")
        assert user is not None
        auth = create_session(db, user)
        return {"Authorization": f"Bearer {auth.token}"}
    finally:
        db.close()


def test_parse_page_metadata_prefers_open_graph_values() -> None:
    html = """
        <html>
          <head>
            <title>Fallback title</title>
            <meta property="og:title" content="Project Atlas">
            <meta name="description" content="Fallback description">
            <meta property="og:description" content="A workspace for research and planning.">
          </head>
        </html>
    """

    assert parse_page_metadata(html) == {
        "title": "Project Atlas",
        "description": "A workspace for research and planning.",
    }


def test_web_metadata_returns_title(monkeypatch: MonkeyPatch) -> None:
    async def fake_fetch_page_metadata(url: str) -> dict[str, str | None]:
        assert url == "https://example.com/atlas"
        return {
            "title": "Project Atlas",
            "description": "A workspace for research and planning.",
        }

    monkeypatch.setattr(web, "fetch_page_metadata", fake_fetch_page_metadata)

    response = client.post(
        "/api/web/metadata",
        headers=auth_headers(),
        json={"url": "https://example.com/atlas"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "title": "Project Atlas",
        "description": "A workspace for research and planning.",
    }


def test_web_metadata_falls_back_when_fetch_fails(monkeypatch: MonkeyPatch) -> None:
    async def fake_fetch_page_metadata(_url: str) -> dict[str, str | None]:
        raise ValueError("Unavailable")

    monkeypatch.setattr(web, "fetch_page_metadata", fake_fetch_page_metadata)

    response = client.post(
        "/api/web/metadata",
        headers=auth_headers(),
        json={"url": "https://example.com/missing"},
    )

    assert response.status_code == 200
    assert response.json() == {"title": None, "description": None}
