from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def auth_headers() -> dict[str, str]:
    # Tests bypass CAPTCHA randomness by using the seeded demo session directly.
    from app.core.database import SessionLocal
    from app.models.user import User
    from app.services.auth_service import create_session

    db = SessionLocal()
    try:
        user = db.get(User, "demo-user")
        assert user is not None
        auth = create_session(db, user)
        return {"Authorization": f"Bearer {auth.token}"}
    finally:
        db.close()


def test_list_projects_returns_seeded_projects() -> None:
    response = client.get("/api/projects", headers=auth_headers())

    assert response.status_code == 200
    projects = response.json()
    assert len(projects) >= 4
    assert all("canvas" in project for project in projects)
    assert any(project["id"] == "brand-identity" for project in projects)


def test_create_and_update_project_canvas() -> None:
    headers = auth_headers()
    created = client.post("/api/projects", headers=headers)

    assert created.status_code == 200
    project = created.json()
    project_id = project["id"]

    canvas = {
        "nodes": [
            {
                "id": "node-1",
                "type": "note",
                "position": {"x": 120, "y": 140},
                "data": {"title": "后端保存测试"},
            }
        ],
        "edges": [],
        "viewport": {"x": 0, "y": 0, "zoom": 1},
    }
    updated = client.patch(f"/api/projects/{project_id}/canvas", json={"canvas": canvas}, headers=headers)

    assert updated.status_code == 200
    updated_project = updated.json()
    assert updated_project["nodeCount"] == 1
    assert updated_project["canvas"]["nodes"][0]["id"] == "node-1"

    fetched = client.get(f"/api/projects/{project_id}", headers=headers)
    assert fetched.status_code == 200
    assert fetched.json()["canvas"]["nodes"][0]["data"]["title"] == "后端保存测试"
