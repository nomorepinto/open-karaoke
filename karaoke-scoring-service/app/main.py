"""
FastAPI Application Entry Point & AWS Lambda Mangum Handler Adapter.

This file acts as the primary application factory for local execution (via uvicorn)
and AWS Lambda container execution (via Mangum ASGI adapter behind API Gateway).

Mangum wrapping ensures FastAPI's ASGI interface translates AWS API Gateway HTTP events seamlessly.
`lifespan="off"` is set on Mangum to eliminate cold-start overhead per serverless invocation.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from mangum import Mangum
from app.api.routes.score import router as score_router
from app.core.config import settings
from app.core.logging import logger
from app.db.session import init_db

# Create FastAPI Instance
app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "FastAPI Backend for Self-Referential Karaoke Vocal Scoring. "
        "Deploys on AWS Lambda behind API Gateway using Mangum adapter."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware (allows React / React Native client connections)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(score_router)


@app.on_event("startup")
def on_startup():
    """Startup initialization hook."""
    logger.info(f"Starting {settings.APP_NAME} in environment '{settings.ENVIRONMENT}'")
    init_db()


@app.get("/health", tags=["Health"])
def health_check():
    """Service health check endpoint."""
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "environment": settings.ENVIRONMENT
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors."""
    logger.error(f"Unhandled error handling request to {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred.", "error": str(exc)}
    )


# AWS Lambda Entrypoint Handler Adapter
# Mangum wraps FastAPI app to convert API Gateway / HTTP API payload events into ASGI scope
handler = Mangum(app, lifespan="off")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
