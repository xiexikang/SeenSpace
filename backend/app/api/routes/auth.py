import httpx
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import AuthSession, User
from app.schemas.auth import (
    AuthResponse,
    AgentAuthorizeRequest,
    AgentAuthorizeData,
    AgentLoginRequest,
    AuthUser,
    CaptchaResponse,
    LoginRequest,
    RegisterRequest,
    UpdateNameRequest,
    UpdatePasswordRequest,
)
from app.core.config import settings
from app.services.auth_service import (
    create_captcha,
    delete_session,
    login_user,
    register_user,
    to_auth_user,
    update_user_name,
    update_user_password,
    upsert_agent_user,
)


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/agent/getAuthorizeUrl", response_model=AgentAuthorizeData)
async def get_agent_authorize_url(request: AgentAuthorizeRequest) -> AgentAuthorizeData:
    if request.clientId != settings.agent_client_id or request.clientSecret != settings.agent_client_secret:
        raise HTTPException(status_code=401, detail="智能体客户端凭据不正确。")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                settings.agent_authorize_url,
                json={"clientId": request.clientId, "clientSecret": request.clientSecret},
            )
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError) as error:
        raise HTTPException(status_code=502, detail="获取智能体授权地址失败。") from error

    try:
        if not isinstance(payload, dict) or payload.get("code") not in (None, 0):
            message = payload.get("msg") if isinstance(payload, dict) else None
            raise ValueError(message or "第三方授权地址获取失败")
        return AgentAuthorizeData.model_validate(payload.get("data"))
    except ValueError as error:
        raise HTTPException(status_code=502, detail="智能体授权响应格式无效。") from error


@router.post("/agent/login", response_model=AuthResponse)
async def agent_login(request: AgentLoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_response = await client.post(
                settings.agent_token_url,
                json={
                    "code": request.code,
                    "grant_type": "authorization_code",
                    "client_id": settings.agent_client_id,
                    "client_secret": settings.agent_client_secret,
                    "redirect_uri": settings.agent_redirect_uri,
                },
            )
            token_response.raise_for_status()
            token_payload = token_response.json()
            if token_payload.get("code") not in (None, 0):
                raise ValueError(token_payload.get("msg") or "第三方令牌获取失败")
            access_token = token_payload.get("data", {}).get("access_token")
            if not access_token:
                raise ValueError("第三方未返回 access_token")

            user_response = await client.get(
                settings.agent_userinfo_url,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            user_response.raise_for_status()
            user_payload = user_response.json()
            if user_payload.get("code") not in (None, 0):
                raise ValueError(user_payload.get("msg") or "第三方用户信息获取失败")
            user_data = user_payload.get("data", {})
            user_id = user_data.get("userId")
            if user_id is None:
                raise ValueError("第三方未返回 userId")
    except (httpx.HTTPError, ValueError, TypeError) as error:
        raise HTTPException(status_code=502, detail="智能体登录失败。") from error

    return upsert_agent_user(
        db,
        int(user_id),
        str(user_data.get("userName") or ""),
        user_data.get("fullName"),
        str(access_token),
    )


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


@router.patch("/me/name", response_model=AuthUser)
def update_name(
    request: UpdateNameRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AuthUser:
    try:
        return update_user_name(db, current_user, request.name)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.patch("/me/password")
def update_password(
    request: UpdatePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    try:
        update_user_password(db, current_user, request.currentPassword, request.newPassword)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    return {"ok": True}


async def _logout_session(
    authorization: str | None,
    db: Session,
    revoke_agent_token: bool,
) -> dict[str, bool]:
    if authorization and authorization.startswith("Bearer "):
        local_token = authorization.removeprefix("Bearer ").strip()
        session = db.get(AuthSession, local_token)
        agent_access_token = session.agent_access_token if session else None
        delete_session(db, local_token)
        if revoke_agent_token and agent_access_token:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(
                        settings.agent_logout_url,
                        headers={"Authorization": f"Bearer {agent_access_token}"},
                    )
                    response.raise_for_status()
            except httpx.HTTPError:
                pass
    return {"ok": True}


@router.post("/logout")
async def logout(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    return await _logout_session(authorization, db, revoke_agent_token=False)


@router.post("/agent/logout")
async def agent_logout(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    return await _logout_session(authorization, db, revoke_agent_token=True)
