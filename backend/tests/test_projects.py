from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_list_projects_returns_seeded_projects() -> None:
    response = client.get("/api/projects")

    assert response.status_code == 200
    projects = response.json()
    assert len(projects) >= 4
    assert all("canvas" in project for project in projects)
    assert any(project["id"] == "brand-identity" for project in projects)


def test_create_and_update_project_canvas() -> None:
    created = client.post("/api/projects")

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
    updated = client.patch(f"/api/projects/{project_id}/canvas", json={"canvas": canvas})

    assert updated.status_code == 200
    updated_project = updated.json()
    assert updated_project["nodeCount"] == 1
    assert updated_project["canvas"]["nodes"][0]["id"] == "node-1"

    fetched = client.get(f"/api/projects/{project_id}")
    assert fetched.status_code == 200
    assert fetched.json()["canvas"]["nodes"][0]["data"]["title"] == "后端保存测试"
