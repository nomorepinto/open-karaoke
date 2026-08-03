"""
Database session management for Aurora PostgreSQL.

Dev cluster uses standard username/password auth over the public cluster endpoint (TLS).
When DATABASE_URL contains no password, IAM token auth is used as a legacy fallback.
"""
from typing import Generator
from urllib.parse import urlparse

import boto3
import psycopg2
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import settings
from app.core.logging import logger
from app.models.db_models import Base

is_postgres = settings.DATABASE_URL.startswith("postgresql") or settings.DATABASE_URL.startswith("postgres")
parsed_url = urlparse(settings.DATABASE_URL) if is_postgres else None
is_remote_postgres = is_postgres and parsed_url and parsed_url.hostname not in ("localhost", "127.0.0.1", None)
has_password_auth = bool(parsed_url and parsed_url.password)

_db_host = parsed_url.hostname if parsed_url else "localhost"
_db_port = parsed_url.port or 5432 if parsed_url else 5432
_db_name = (parsed_url.path or "/postgres").lstrip("/") or "postgres"
_db_user = parsed_url.username or "postgres" if parsed_url else "postgres"


def _get_iam_db_auth_token(host: str, port: int, user: str, region: str) -> str:
    """Generate a temporary 15-minute IAM database authentication token via boto3."""
    rds_client = boto3.client("rds", region_name=region)
    return rds_client.generate_db_auth_token(
        DBHostname=host,
        Port=port,
        DBUsername=user,
        Region=region,
    )


def _connect_postgres_iam():
    """Open a PostgreSQL connection using a fresh IAM auth token."""
    password = _get_iam_db_auth_token(
        host=_db_host,
        port=_db_port,
        user=_db_user,
        region=settings.AWS_REGION,
    )
    return psycopg2.connect(
        host=_db_host,
        port=_db_port,
        dbname=_db_name,
        user=_db_user,
        password=password,
        sslmode="require",
    )


if is_remote_postgres and has_password_auth:
    logger.info("Using password authentication for remote PostgreSQL connection.")
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        connect_args={"sslmode": "require"},
    )
elif is_remote_postgres:
    logger.info("Enabling dynamic AWS IAM Database Authentication for remote PostgreSQL connection.")
    engine = create_engine(
        "postgresql+psycopg2://",
        creator=_connect_postgres_iam,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        connect_args={"sslmode": "require"} if is_postgres else {},
    )


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Utility to create tables if they do not already exist (useful for dev/test)."""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.warning(f"Database initialization deferred: {e}")


def get_db() -> Generator[Session, None, None]:
    """FastAPI Dependency for database session management."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
