"""
FastAPI Application Entry Point & AWS Lambda Mangum Handler Adapter.

Mangum strips the API Gateway stage prefix (e.g. /prod) so FastAPI routes match.
"""
import os

# Lambda filesystem is read-only except /tmp — numba/librosa JIT cache must go there.
os.environ.setdefault("NUMBA_CACHE_DIR", "/tmp")
os.environ.setdefault("MPLCONFIGDIR", "/tmp")

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from mangum import Mangum

from app.api.routes.booth import router as booth_router
from app.api.routes.score import router as score_router
from app.core.config import settings
from app.core.logging import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: runs once per Lambda container cold start."""
    logger.info(f"Starting {settings.APP_NAME} in environment '{settings.ENVIRONMENT}'")
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "FastAPI Backend for Self-Referential Karaoke Vocal Scoring. "
        "Deploys on AWS Lambda behind API Gateway using Mangum adapter."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(booth_router)
app.include_router(score_router)


@app.get("/health", tags=["Health"])
def health_check():
    """Service health check endpoint."""
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors."""
    logger.error(f"Unhandled error handling request to {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred.", "error": str(exc)},
    )


handler = Mangum(app, api_gateway_base_path=f"/{os.getenv('API_STAGE', 'prod')}")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
