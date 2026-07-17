from pydantic import BaseModel, Field


class WebMetadataRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2048)


class WebMetadataResult(BaseModel):
    title: str | None = None
    description: str | None = None
