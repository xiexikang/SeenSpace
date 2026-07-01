import json
from typing import Any

import httpx

from app.core.config import settings
from app.schemas.ai import AnalysisRequestPayload, AnalysisResult


NODE_TYPE_LABELS = {
    "note": "笔记",
    "web": "网页",
    "image": "图片",
    "tag_meta": "标签",
    "ai_insight": "AI 洞察",
}


def build_messages(payload: AnalysisRequestPayload) -> list[dict[str, str]]:
    return [
        {
            "role": "system",
            "content": (
                "你是 SeenSpace 的创意素材分析助手。你需要把画布中的笔记、网页、"
                "图片描述、标签和连接关系整理成可插入画布的洞察。只返回 JSON，不要返回 Markdown。"
            ),
        },
        {
            "role": "user",
            "content": json.dumps(
                {
                    "task": (
                        "分析素材并生成洞察卡片。title 不超过 16 个中文字，summary 用 120 到 220 个中文字，"
                        "keywords 返回 3 到 6 个中文关键词。"
                    ),
                    "outputSchema": {
                        "title": "string",
                        "summary": "string",
                        "keywords": ["string"],
                    },
                    "payload": payload.model_dump(exclude_none=True),
                },
                ensure_ascii=False,
            ),
        },
    ]


def sanitize_model_result(value: Any) -> dict[str, Any]:
    title = value.get("title", "") if isinstance(value, dict) else ""
    summary = value.get("summary", "") if isinstance(value, dict) else ""
    keywords = value.get("keywords", []) if isinstance(value, dict) else []

    clean_title = title.strip()[:40] if isinstance(title, str) else ""
    clean_summary = summary.strip()[:800] if isinstance(summary, str) else ""
    clean_keywords = [
        keyword.strip()
        for keyword in keywords
        if isinstance(keyword, str) and keyword.strip()
    ][:8]

    if not clean_title or not clean_summary:
        raise ValueError("Model response did not include title and summary.")

    return {
        "title": clean_title,
        "summary": clean_summary,
        "keywords": clean_keywords,
    }


async def analyze_with_model(payload: AnalysisRequestPayload) -> dict[str, Any]:
    if not settings.llm_api_key:
        raise ValueError("LLM_API_KEY is not configured.")

    base_url = settings.llm_base_url.rstrip("/")
    async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
        response = await client.post(
            f"{base_url}/chat/completions",
            headers={
                "authorization": f"Bearer {settings.llm_api_key}",
                "content-type": "application/json",
            },
            json={
                "model": settings.llm_model,
                "messages": build_messages(payload),
                "temperature": 0.4,
                "response_format": {"type": "json_object"},
            },
        )

    if response.status_code >= 400:
        raise ValueError(f"Model request failed: {response.status_code} {response.text[:300]}")

    data = response.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content")
    if not isinstance(content, str):
        raise ValueError("Model response did not include message content.")

    return sanitize_model_result(json.loads(content))


async def analyze_payload(payload: AnalysisRequestPayload) -> AnalysisResult:
    model_result = await analyze_with_model(payload)
    question = payload.question.strip() if isinstance(payload.question, str) and payload.question.strip() else None
    return AnalysisResult(
        **model_result,
        scope=payload.scope,
        sourceNodeIds=payload.sourceNodeIds,
        question=question,
    )
