from functools import lru_cache
from pathlib import Path

from pydantic import Field
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
    llm_api_key: str | None = None
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"
    llm_timeout_seconds: float = 45.0


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
