from typing import Literal

from pydantic import BaseModel

from app.schemas.workspace import WorkspaceSnapshot


class ProjectRecord(BaseModel):
    id: str
    name: str
    summary: str
    updatedAt: str
    createdAt: str
    nodeCount: int
    initials: str
    thumbnailVariant: Literal["sand", "steel", "mist", "mint"]
    canvas: WorkspaceSnapshot


class UpdateProjectCanvasRequest(BaseModel):
    canvas: WorkspaceSnapshot
