from typing import Literal

from pydantic import BaseModel, Field


AnalysisScope = Literal["canvas", "selection"]


class AnalysisPayloadNode(BaseModel):
    id: str
    type: str
    title: str
    description: str | None = None
    body: str | None = None
    url: str | None = None
    domain: str | None = None
    palette: str | None = None
    tags: list[str] | None = None
    category: str | None = None
    summary: str | None = None
    imageUrl: str | None = Field(default=None, max_length=6_000_000)


class AnalysisPayloadEdge(BaseModel):
    source: str
    target: str
    label: str | None = None


class AnalysisRequestPayload(BaseModel):
    scope: AnalysisScope
    question: str | None = None
    sourceNodeIds: list[str]
    nodes: list[AnalysisPayloadNode]
    edges: list[AnalysisPayloadEdge]


class AnalysisResult(BaseModel):
    title: str
    summary: str
    keywords: list[str]
    scope: AnalysisScope
    sourceNodeIds: list[str]
    question: str | None = None
