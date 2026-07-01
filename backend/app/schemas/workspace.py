from typing import Any

from pydantic import BaseModel, ConfigDict


class WorkspaceSnapshot(BaseModel):
    model_config = ConfigDict(extra="allow")

    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    viewport: dict[str, Any]


def create_empty_canvas() -> WorkspaceSnapshot:
    return WorkspaceSnapshot(nodes=[], edges=[], viewport={"x": 0, "y": 0, "zoom": 1})
