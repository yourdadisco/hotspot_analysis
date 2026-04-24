from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, DateTime, func

from .config import settings

# Create async engine
db_url = settings.DATABASE_URL
# 如果用户配的是 postgresql:// 而非 postgresql+asyncpg://，自动修正
if db_url.startswith('postgresql://') and '+asyncpg' not in db_url:
    db_url = db_url.replace('postgresql://', 'postgresql+asyncpg://', 1)

engine_args = {
    'url': db_url,
    'echo': settings.DEBUG,
    'pool_pre_ping': True,
}

# SQLite doesn't support pool_size and max_overflow
if 'sqlite' not in settings.DATABASE_URL:
    engine_args['pool_size'] = 20
    engine_args['max_overflow'] = 10

engine = create_async_engine(**engine_args)

# Create session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Create base class for models
Base = declarative_base()

class TimestampMixin:
    """Mixin to add created_at and updated_at timestamps."""
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

# Database dependency
async def get_db():
    """Get database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()