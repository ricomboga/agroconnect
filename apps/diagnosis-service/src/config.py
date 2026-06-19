from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    MONGODB_URI: str
    MONGO_DB: str = "diagnosis_db"
    KAFKA_BROKERS: str = "localhost:9092"
    KAFKA_CONSUMER_GROUP: str = "diagnosis-service-consumer"
    GRPC_PORT: int = 50051
    REST_PORT: int = 8000
    # [MOCK] Flip to false and implement real_engine.py to use EfficientNet via TF Serving
    USE_MOCK_INFERENCE: bool = True
    # [REAL] TF Serving endpoint and model config — unused while USE_MOCK_INFERENCE=true
    MODEL_SERVING_URL: str = "http://tf-serving:8501"
    MODEL_VERSION: str = "latest"
    MIN_CONFIDENCE: float = 0.65
    LOG_LEVEL: str = "info"
    SENTRY_DSN: str = ""


settings = Settings()
