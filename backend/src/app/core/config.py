from pydantic_settings import BaseSettings
from typing import List, Optional
import os

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "AI超级热点解析助手"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
    ]

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://admin:password@localhost/hotspot_analysis"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # LLM API
    LLM_API_KEY: str = "sk-a81a8ee7f98241eb99950607caed45b7"
    LLM_API_BASE: str = "https://api.openai.com/v1"
    LLM_MODEL: str = "gpt-3.5-turbo"

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Data Collection
    UPDATE_SCHEDULE: str = "0 2 * * *"  # Daily at 2 AM
    MAX_HOTSPOTS_PER_UPDATE: int = 100

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    class Config:
        env_file = ".env"
        case_sensitive = True

# Create settings instance
settings = Settings()