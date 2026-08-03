"""
Structured logging initialization for FastAPI and AWS Lambda.
"""
import logging
import sys
from app.core.config import settings


def setup_logging():
    """Configures application-wide structured logger."""
    logger = logging.getLogger("karaoke_service")
    logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            "[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger


logger = setup_logging()
