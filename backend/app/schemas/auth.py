from typing import Any

from pydantic import BaseModel, Field


class CaptchaResponse(BaseModel):
    captchaId: str
    svg: str


class AuthUser(BaseModel):
    id: str
    username: str
    name: str


class AuthResponse(BaseModel):
    token: str
    user: AuthUser


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=6, max_length=128)
    captchaId: str
    captchaCode: str


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=80)
    captchaId: str
    captchaCode: str


class UpdateNameRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class UpdatePasswordRequest(BaseModel):
    currentPassword: str = Field(min_length=6, max_length=128)
    newPassword: str = Field(min_length=6, max_length=128)


class AgentAuthorizeData(BaseModel):
    authorizeUrl: str
    state: str


class AgentLoginRequest(BaseModel):
    code: str = Field(min_length=1)


class AgentTokenData(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int
    refresh_token: str


class AgentTokenResponse(BaseModel):
    code: int
    msg: str
    data: AgentTokenData


class AgentRuntimeResponse(BaseModel):
    code: int
    msg: str
    data: dict


class AgentRuntimeChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=20_000)
    model: str | None = Field(default=None, max_length=200)
    chatContextId: str | None = Field(default=None, max_length=200)
    stream: bool = False


class AgentRuntimeChatResponse(BaseModel):
    status_code: int
    data: Any


class AgentRefreshResponse(BaseModel):
    code: int
    msg: str
    data: dict


class AgentSessionStatus(BaseModel):
    connected: bool
    expiresAt: str | None = None
