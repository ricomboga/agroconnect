from __future__ import annotations

from pydantic import BaseSettings


class Settings(BaseSettings):
    FARM_SERVICE_URL: str = "http://localhost:3001"
    KAFKA_BROKERS: str = "localhost:9092"
    REDIS_URL: str = "redis://localhost:6379"
    REST_PORT: int = 8002
    LOG_LEVEL: str = "info"
    FARM_SERVICE_TIMEOUT_S: int = 5
    SENTRY_DSN: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
