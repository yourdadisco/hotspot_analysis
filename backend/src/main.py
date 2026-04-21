from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.database import engine, Base
from app.core.cache import cache
from app.api.v1.api import api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager."""
    # Startup
    logger.info("Starting up Hotspot Analysis API...")

    # Create database tables (in development)
    # In production, use Alembic migrations
    async with engine.begin() as conn:
        # await conn.run_sync(Base.metadata.drop_all)  # Only for development
        await conn.run_sync(Base.metadata.create_all)

    logger.info("Database tables created/verified")

    # Initialize cache
    await cache.init()
    logger.info("Cache service initialized")

    yield

    # Shutdown
    logger.info("Shutting down Hotspot Analysis API...")
    await cache.close()
    await engine.dispose()

# Create FastAPI app
app = FastAPI(
    title="AI超级热点解析助手 API",
    description="AI热点分析和管理API服务",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
# In development, allow all origins for easier testing
# In production, use specific origins from settings
allow_origins = ["*"] if settings.DEBUG else settings.cors_origins_list

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to AI超级热点解析助手 API",
        "docs": "/docs",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )