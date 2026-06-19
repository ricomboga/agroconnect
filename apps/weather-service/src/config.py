from __future__ import annotations

from pydantic import BaseSettings


class Settings(BaseSettings):
    OPENWEATHER_API_KEY: str = "changeme"
    REDIS_URL: str = "redis://localhost:6379"
    KAFKA_BROKERS: str = "localhost:9092"
    REST_PORT: int = 8001
    LOG_LEVEL: str = "info"
    OWM_TIMEOUT_S: int = 5
    SENTRY_DSN: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
