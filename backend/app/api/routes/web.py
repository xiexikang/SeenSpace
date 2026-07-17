import httpx
from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user
from app.models.user import User
from app.schemas.web import WebMetadataRequest, WebMetadataResult
from app.services.web_metadata_service import fetch_page_metadata


router = APIRouter(prefix="/web", tags=["web"])


@router.post("/metadata", response_model=WebMetadataResult)
async def get_web_metadata(
    payload: WebMetadataRequest,
    _current_user: User = Depends(get_current_user),
) -> WebMetadataResult:
    try:
        metadata = await fetch_page_metadata(payload.url)
    except (ValueError, httpx.HTTPError, UnicodeError):
        metadata = {"title": None, "description": None}
    return WebMetadataResult(**metadata)
