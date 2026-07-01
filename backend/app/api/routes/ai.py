from fastapi import APIRouter, HTTPException

from app.schemas.ai import AnalysisRequestPayload, AnalysisResult
from app.services.ai_service import analyze_payload


router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/analyze", response_model=AnalysisResult)
async def analyze_workspace(payload: AnalysisRequestPayload) -> AnalysisResult:
    try:
        return await analyze_payload(payload)
    except ValueError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
