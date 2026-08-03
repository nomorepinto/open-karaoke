import os
from pydantic import ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Application configuration parameters loaded from environment variables or defaults.
    """
    APP_NAME: str = "Karaoke Scoring Service"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    # S3 Storage Configuration
    S3_BUCKET_VOCALS: str = os.getenv("S3_BUCKET_VOCALS", "karaoke-user-recordings-bucket")
    S3_BUCKET_SONGS: str = os.getenv("S3_BUCKET_SONGS", "karaoke-master-songs-bucket")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")

    # PostgreSQL RDS Database Connection Configuration
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/karaoke_db"
    )

    # Scoring Metric Weights (must sum to 1.0)
    WEIGHT_PITCH: float = 0.35
    WEIGHT_RHYTHM: float = 0.25
    WEIGHT_VOLUME: float = 0.20
    WEIGHT_SUSTAIN: float = 0.20

    model_config = ConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()
