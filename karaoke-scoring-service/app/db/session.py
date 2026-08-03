"""
Database session management for AWS RDS (PostgreSQL).
"""
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from app.core.logging import logger
from app.models.db_models import Base

# SQLAlchemy Engine with connection pool recycling for Lambda cold starts
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Automatically test pool connections before checkout
    pool_size=5,
    max_overflow=10,
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
