from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import AuthResponse, AuthUser, CaptchaResponse, LoginRequest, RegisterRequest
from app.services.auth_service import (
    create_captcha,
    delete_session,
    login_user,
    register_user,
    to_auth_user,
)


router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/captcha", response_model=CaptchaResponse)
def get_captcha(db: Session = Depends(get_db)) -> CaptchaResponse:
    return create_captcha(db)


@router.post("/register", response_model=AuthResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    try:
        return register_user(
            db,
            request.username,
            request.password,
            request.name,
            request.captchaId,
            request.captchaCode,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/login", response_model=AuthResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    try:
        return login_user(db, request.username, request.password, request.captchaId, request.captchaCode)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.get("/me", response_model=AuthUser)
def me(current_user: User = Depends(get_current_user)) -> AuthUser:
    return to_auth_user(current_user)


@router.post("/logout")
def logout(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    if authorization and authorization.startswith("Bearer "):
        delete_session(db, authorization.removeprefix("Bearer ").strip())
    return {"ok": True}
