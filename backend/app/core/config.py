from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


APP_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = APP_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            PROJECT_ROOT / ".env",
            PROJECT_ROOT / ".env.local",
            BACKEND_DIR / ".env",
            BACKEND_DIR / ".env.local",
        ),
        extra="ignore",
    )

    api_host: str = "127.0.0.1"
    api_port: int = 8787
    database_url: str = Field(
        "mysql+pymysql://seenspace:seenspace@127.0.0.1:3306/seenspace?charset=utf8mb4"
    )
    cors_origins: list[str] = ["http://localhost:7788", "http://127.0.0.1:7788"]
    llm_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("LLM_API_KEY", "OPENAI_API_KEY"),
    )
    llm_base_url: str = Field(
        default="https://api.openai.com/v1",
        validation_alias=AliasChoices("LLM_BASE_URL", "OPENAI_BASE_URL"),
    )
    llm_model: str = Field(
        default="gpt-4o-mini",
        validation_alias=AliasChoices("LLM_MODEL", "OPENAI_MODEL"),
    )
    llm_api_style: str = "chat_completions"
    llm_timeout_seconds: float = 45.0
    agent_authorize_url: str = "http://10.30.1.53:9090/auth/agent/oauth2/authorize-url"
    agent_client_id: str = "ag85af50c6357b4baf"
    agent_client_secret: str = "866b740d443c44bf9a47a1ad9fbfac2c"
    agent_token_url: str = "http://10.30.1.53:9090/auth/agent/oauth2/token"
    agent_userinfo_url: str = "http://10.30.1.53:9090/auth/agent/oauth2/userinfo"
    agent_logout_url: str = "http://10.30.1.53:9090/auth/agent/oauth2/logout"
    agent_redirect_uri: str = "http://10.30.1.53:7788"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
