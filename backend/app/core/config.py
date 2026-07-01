from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local", "backend/.env", "backend/.env.local"),
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
