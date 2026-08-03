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

    # S3 Storage Configuration (Supports single bucket or separate buckets)
    S3_BUCKET_NAME: str = os.getenv("S3_BUCKET_NAME", "open-karaoke-recordings-bucket")
    S3_BUCKET_VOCALS: str = os.getenv(
        "S3_BUCKET_VOCALS",
        os.getenv("S3_BUCKET_NAME", "open-karaoke-recordings-bucket"),
    )
    S3_BUCKET_SONGS: str = os.getenv(
        "S3_BUCKET_SONGS",
        os.getenv("S3_BUCKET_NAME", "open-karaoke-recordings-bucket"),
    )
    # AWS Lambda sets AWS_REGION automatically; do not override in SAM template env vars.
    AWS_REGION: str = os.getenv("AWS_REGION", "ap-southeast-1")

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:ChangeMe123!@my-dev-cluster.cluster-c5gog2m2mroy.ap-southeast-1.rds.amazonaws.com:5432/postgres",
    )

    # Scoring Metric Weights (pitch + volume only; must sum to 1.0)
    WEIGHT_PITCH: float = 0.70
    WEIGHT_RHYTHM: float = 0.0
    WEIGHT_VOLUME: float = 0.30
    WEIGHT_SUSTAIN: float = 0.0

    model_config = ConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()
