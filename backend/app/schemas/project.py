from typing import Literal

from pydantic import BaseModel, Field

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


class ProjectMetadataRequest(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    summary: str = Field(min_length=1, max_length=500)
