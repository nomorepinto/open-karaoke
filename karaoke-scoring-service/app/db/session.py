"""
Database session management for AWS RDS (PostgreSQL).
Supports standard password authentication and dynamic AWS IAM database authentication tokens.
"""
from typing import Generator
from urllib.parse import urlparse
import boto3
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from app.core.logging import logger
from app.models.db_models import Base


def _get_iam_db_auth_token(host: str, port: int, user: str, region: str) -> str:
    """Generate a temporary 15-minute IAM database authentication token via boto3."""
    try:
        rds_client = boto3.client("rds", region_name=region)
        token = rds_client.generate_db_auth_token(
            DBHostname=host,
            Port=port,
            DBUsername=user,
            Region=region
        )
        return token
    except Exception as e:
        logger.error(f"Failed to generate IAM DB auth token: {e}")
        raise


# Determine engine create parameters
is_postgres = settings.DATABASE_URL.startswith("postgresql") or settings.DATABASE_URL.startswith("postgres")
parsed_url = urlparse(settings.DATABASE_URL) if is_postgres else None
is_remote_postgres = is_postgres and parsed_url and parsed_url.hostname not in ("localhost", "127.0.0.1", None)

connect_args = {}
if is_postgres:
    connect_args["sslmode"] = "require"

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Automatically test pool connections before checkout
    pool_size=5,
    max_overflow=10,
    connect_args=connect_args,
)

# Attach event listener for dynamic IAM DB auth token generation if connecting to remote AWS RDS
if is_remote_postgres:
    logger.info("Enabling dynamic AWS IAM Database Authentication for remote PostgreSQL connection.")

    @event.listens_for(engine, "do_connect")
    def _provide_iam_token(dialect, conn_rec, cargs, cparams):
        """Inject fresh 15-minute IAM auth token before each database connection."""
        host = cparams.get("host", parsed_url.hostname if parsed_url else "")
        port = int(cparams.get("port", parsed_url.port or 5432 if parsed_url else 5432))
        user = cparams.get("user", parsed_url.username or "postgres" if parsed_url else "postgres")

        token = _get_iam_db_auth_token(
            host=host,
            port=port,
            user=user,
            region=settings.AWS_REGION
        )
        cparams["password"] = token


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

