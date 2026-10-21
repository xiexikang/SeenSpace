from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field, model_validator
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
    agent_base_url: str = "http://10.30.1.53:9090"
    # Credentials must be supplied through the environment; never commit them.
    agent_client_id: str = Field(default="", validation_alias=AliasChoices("AGENT_CLIENT_ID"))
    agent_client_secret: str = Field(default="", validation_alias=AliasChoices("AGENT_CLIENT_SECRET"))
    agent_authorize_url: str = ""
    agent_token_url: str = ""
    agent_userinfo_url: str = ""
    agent_logout_url: str = ""
    agent_refresh_url: str = ""
    agent_runtime_access_url: str = ""
    agent_access_context_url: str = ""
    agent_redirect_uri: str = "http://10.30.1.53:7788"
    agent_debug_log_sensitive: bool = Field(
        default=False,
        validation_alias=AliasChoices("AGENT_DEBUG_LOG_SENSITIVE"),
    )
    # Development-only escape hatch for inspecting the upstream runtime config.
    # Keep disabled in shared or production environments.
    agent_runtime_expose_sensitive: bool = Field(
        default=False,
        validation_alias=AliasChoices("AGENT_RUNTIME_EXPOSE_SENSITIVE"),
    )

    @model_validator(mode="after")
    def set_agent_service_urls(self) -> "Settings":
        base_url = self.agent_base_url.rstrip("/")
        endpoint_paths = {
            "agent_authorize_url": "/auth/agent/oauth2/authorize-url",
            "agent_token_url": "/auth/agent/oauth2/token",
            "agent_userinfo_url": "/auth/agent/oauth2/userinfo",
            "agent_logout_url": "/auth/agent/oauth2/logout",
            "agent_refresh_url": "/auth/agent/oauth2/token/refresh",
            "agent_runtime_access_url": "/auth/agent/oauth2/runtime-access",
            "agent_access_context_url": "/auth/agent/oauth2/access-context",
        }
        for field_name, path in endpoint_paths.items():
            if not getattr(self, field_name):
                setattr(self, field_name, f"{base_url}{path}")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
