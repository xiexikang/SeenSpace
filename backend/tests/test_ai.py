from fastapi.testclient import TestClient
from pytest import MonkeyPatch

from app.main import app
from app.services import ai_service


client = TestClient(app)


def test_analyze_returns_model_result(monkeypatch: MonkeyPatch) -> None:
    async def fake_analyze_with_model(payload):
        return {
            "title": "远程洞察",
            "summary": "模型生成的分析内容。",
            "keywords": ["模型", "洞察"],
        }

    monkeypatch.setattr(ai_service, "analyze_with_model", fake_analyze_with_model)

    response = client.post(
        "/api/ai/analyze",
        json={
            "scope": "canvas",
            "question": "怎么整理？",
            "sourceNodeIds": ["node-1"],
            "nodes": [{"id": "node-1", "type": "note", "title": "素材"}],
            "edges": [],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "远程洞察"
    assert body["scope"] == "canvas"
    assert body["sourceNodeIds"] == ["node-1"]
    assert body["question"] == "怎么整理？"


def test_analyze_reports_model_failure(monkeypatch: MonkeyPatch) -> None:
    async def fake_analyze_with_model(payload):
        raise ValueError("LLM_API_KEY is not configured.")

    monkeypatch.setattr(ai_service, "analyze_with_model", fake_analyze_with_model)

    response = client.post(
        "/api/ai/analyze",
        json={
            "scope": "canvas",
            "sourceNodeIds": [],
            "nodes": [],
            "edges": [],
        },
    )

    assert response.status_code == 500
    assert response.json()["detail"] == "LLM_API_KEY is not configured."
