import pytest
import asyncio
import sys
import os
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / 'src'))

@pytest.fixture
def event_loop():
    """创建事件循环的fixture"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def test_db():
    """测试数据库session fixture"""
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from app.core.config import settings

    # 使用内存SQLite进行测试
    test_db_url = "sqlite+aiosqlite:///:memory:"

    engine = create_async_engine(
        test_db_url,
        echo=False,
        future=True
    )

    async with engine.begin() as conn:
        from app.core.database import Base
        await conn.run_sync(Base.metadata.create_all)

    AsyncSessionLocal = sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

    async with AsyncSessionLocal() as session:
        yield session

    await engine.dispose()

@pytest.fixture
async def mock_cache():
    """模拟缓存fixture"""
    class MockCache:
        def __init__(self):
            self._data = {}

        async def get(self, key):
            return self._data.get(key)

        async def set(self, key, value, expire=None):
            self._data[key] = value
            return True

        async def get_json(self, key):
            value = self._data.get(key)
            if value:
                import json
                return json.loads(value)
            return None

        async def set_json(self, key, value, expire=None):
            import json
            self._data[key] = json.dumps(value, ensure_ascii=False)
            return True

        async def delete(self, key):
            if key in self._data:
                del self._data[key]
                return True
            return False

        async def delete_pattern(self, pattern):
            import fnmatch
            keys_to_delete = [k for k in self._data.keys() if fnmatch.fnmatch(k, pattern)]
            for key in keys_to_delete:
                del self._data[key]
            return len(keys_to_delete)

        async def exists(self, key):
            return key in self._data

        async def close(self):
            self._data.clear()

    cache = MockCache()
    yield cache