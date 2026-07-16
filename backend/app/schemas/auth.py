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
