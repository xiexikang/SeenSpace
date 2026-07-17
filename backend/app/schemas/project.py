from base64 import b64decode
from binascii import Error as Base64Error
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.workspace import WorkspaceSnapshot


class ProjectRecord(BaseModel):
    id: str
    name: str
    summary: str
    coverImage: str | None
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
    coverImage: str = Field(min_length=1, max_length=2_500_000)

    @field_validator("coverImage")
    @classmethod
    def validate_cover_image(cls, value: str) -> str:
        allowed_prefixes = (
            "data:image/jpeg;base64,",
            "data:image/png;base64,",
            "data:image/webp;base64,",
        )
        if not value.startswith(allowed_prefixes):
            raise ValueError("coverImage must be a JPEG, PNG, or WebP Base64 data URL")
        try:
            decoded = b64decode(value.split(",", 1)[1], validate=True)
        except (Base64Error, ValueError) as error:
            raise ValueError("coverImage contains invalid Base64 data") from error
        if not decoded:
            raise ValueError("coverImage contains no image data")
        return value
