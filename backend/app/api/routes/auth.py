from datetime import UTC, datetime, timedelta

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import AuthSession, User
from app.schemas.auth import (
    AuthResponse,
    AgentAuthorizeData,
    AgentLoginRequest,
    AgentRuntimeResponse,
    AgentRefreshResponse,
    AgentSessionStatus,
    AgentTokenResponse,
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
async def get_agent_authorize_url() -> AgentAuthorizeData:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                settings.agent_authorize_url,
                json={"clientId": settings.agent_client_id, "clientSecret": settings.agent_client_secret},
            )
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError) as error:
        raise HTTPException(status_code=502, detail="获取智能体授权地址失败。") from error

    try:
        if not isinstance(payload, dict):
            raise ValueError("第三方授权响应不是 JSON 对象")
        upstream_code = payload.get("code")
        if upstream_code not in (None, 0, "0"):
            message = payload.get("msg") or "第三方授权地址获取失败"
            raise HTTPException(status_code=502, detail=f"智能体授权失败：{message}")
        return AgentAuthorizeData.model_validate(payload.get("data"))
    except HTTPException:
        raise
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
            if token_payload.get("code") != 0:
                raise ValueError(token_payload.get("msg") or "第三方令牌获取失败")
            token_data = AgentTokenResponse.model_validate(token_payload).data
            access_token = token_data.access_token

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
        token_data.refresh_token,
        token_data.expires_in,
    )


def _agent_session(authorization: str | None, db: Session) -> AuthSession:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated.")
    session = db.get(AuthSession, authorization.removeprefix("Bearer ").strip())
    if not session or not session.agent_access_token:
        raise HTTPException(status_code=403, detail="当前账号不是智能体登录。")
    return session


@router.get("/agent/session-status", response_model=AgentSessionStatus)
def agent_session_status(
    authorization: str | None = Header(default=None), db: Session = Depends(get_db)
) -> AgentSessionStatus:
    session = _agent_session(authorization, db)
    return AgentSessionStatus(connected=True, expiresAt=session.agent_access_token_expires_at.isoformat() if session.agent_access_token_expires_at else None)


@router.post("/agent/refresh-token", response_model=AgentRefreshResponse)
async def agent_refresh_token(
    authorization: str | None = Header(default=None), db: Session = Depends(get_db)
) -> AgentRefreshResponse:
    session = _agent_session(authorization, db)
    if not session.agent_refresh_token:
        raise HTTPException(status_code=409, detail="当前会话没有 refresh_token，请重新登录。")
    result = await _refresh_agent_token(session, db)
    return AgentRefreshResponse(code=0, msg=result.msg, data={"expires_in": result.data.expires_in, "token_type": result.data.token_type})


async def _refresh_agent_token(session: AuthSession, db: Session) -> AgentTokenResponse:
    if not session.agent_refresh_token:
        raise HTTPException(status_code=409, detail="当前会话没有 refresh_token，请重新登录。")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(settings.agent_refresh_url, json={
                "grant_type": "refresh_token", "refresh_token": session.agent_refresh_token,
                "client_id": settings.agent_client_id, "client_secret": settings.agent_client_secret,
            })
            response.raise_for_status()
            payload = response.json()
            if payload.get("code") != 0:
                raise ValueError(payload.get("msg") or "第三方令牌刷新失败")
            result = AgentTokenResponse.model_validate(payload)
    except (httpx.HTTPError, ValueError, TypeError) as error:
        raise HTTPException(status_code=502, detail="刷新智能体令牌失败，请重新登录。") from error
    session.agent_access_token = result.data.access_token
    session.agent_refresh_token = result.data.refresh_token
    session.agent_access_token_expires_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(seconds=result.data.expires_in)
    db.commit()
    return result


def _safe_runtime_data(payload: dict) -> dict:
    """Expose only inspectable runtime metadata; gateway credentials stay server-side."""
    raw = payload.get("data")
    if not isinstance(raw, dict):
        raise ValueError("第三方运行时配置格式无效")
    safe: dict = {}
    llm = raw.get("llm")
    if isinstance(llm, dict):
        safe["llm"] = {
            "url": llm.get("url") if isinstance(llm.get("url"), str) else None,
            "method": llm.get("method") if isinstance(llm.get("method"), str) else None,
            "headerNames": sorted(str(key) for key in (llm.get("headers") or {}) if isinstance(llm.get("headers"), dict)),
            "bodyFields": sorted(str(key) for key in (llm.get("body") or {}) if isinstance(llm.get("body"), dict)),
        }
    mcp = raw.get("mcp")
    if isinstance(mcp, dict):
        servers = mcp.get("mcpServers")
        safe["mcp"] = {"serverNames": sorted(str(key) for key in servers) if isinstance(servers, dict) else []}
    return safe


@router.post("/agent/runtime-access", response_model=AgentRuntimeResponse)
async def agent_runtime_access(
    authorization: str | None = Header(default=None), db: Session = Depends(get_db)
) -> AgentRuntimeResponse:
    session = _agent_session(authorization, db)
    if session.agent_access_token_expires_at and session.agent_access_token_expires_at <= datetime.now(UTC).replace(tzinfo=None) + timedelta(seconds=60):
        await _refresh_agent_token(session, db)
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(settings.agent_runtime_access_url, headers={"Authorization": f"Bearer {session.agent_access_token}"}, json={})
            response.raise_for_status()
        payload = response.json()
        if payload.get("code") != 0:
            raise ValueError(payload.get("msg") or "第三方运行时配置获取失败")
        return AgentRuntimeResponse(code=0, msg=str(payload.get("msg") or "成功"), data=_safe_runtime_data(payload))
    except (httpx.HTTPError, ValueError) as error:
        raise HTTPException(status_code=502, detail="获取智能体运行时配置失败。") from error


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
