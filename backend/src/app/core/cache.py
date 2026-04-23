import json
from typing import Optional, Any, Union, Dict, List
import asyncio
from datetime import timedelta
from redis.asyncio import Redis
from redis.asyncio.connection import ConnectionPool
from .config import settings
import logging

logger = logging.getLogger(__name__)

class RedisCache:
    """Redis缓存服务"""

    _instance = None
    _redis = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def init(self):
        """初始化Redis连接"""
        if self._redis is None:
            try:
                self._redis = Redis.from_url(
                    settings.REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True
                )
                # 测试连接
                await self._redis.ping()
                logger.info("Redis缓存服务初始化成功")
            except Exception as e:
                logger.error(f"Redis初始化失败: {e}")
                self._redis = None
                logger.warning("Redis不可用，使用无缓存模式")

    async def get(self, key: str) -> Optional[str]:
        """获取缓存值"""
        if self._redis is None:
            return None

        try:
            value = await self._redis.get(key)
            return value
        except Exception as e:
            logger.error(f"Redis get error: {e}")
            return None

    async def set(
        self,
        key: str,
        value: str,
        expire: Optional[int] = None
    ) -> bool:
        """设置缓存值"""
        if self._redis is None:
            return False

        try:
            if expire:
                await self._redis.setex(key, expire, value)
            else:
                await self._redis.set(key, value)
            return True
        except Exception as e:
            logger.error(f"Redis set error: {e}")
            return False

    async def get_json(self, key: str) -> Optional[Any]:
        """获取JSON格式的缓存值"""
        value = await self.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                logger.error(f"JSON解码失败: {key}")
        return None

    async def set_json(
        self,
        key: str,
        value: Any,
        expire: Optional[int] = None
    ) -> bool:
        """设置JSON格式的缓存值"""
        try:
            json_str = json.dumps(value, ensure_ascii=False)
            return await self.set(key, json_str, expire)
        except Exception as e:
            logger.error(f"JSON编码失败: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """删除缓存"""
        if self._redis is None:
            return False

        try:
            await self._redis.delete(key)
            return True
        except Exception as e:
            logger.error(f"Redis delete error: {e}")
            return False

    async def delete_pattern(self, pattern: str) -> int:
        """删除匹配模式的缓存"""
        if self._redis is None:
            return 0

        try:
            keys = await self._redis.keys(pattern)
            if keys:
                await self._redis.delete(*keys)
            return len(keys)
        except Exception as e:
            logger.error(f"Redis delete_pattern error: {e}")
            return 0

    async def exists(self, key: str) -> bool:
        """检查缓存是否存在"""
        if self._redis is None:
            return False

        try:
            return await self._redis.exists(key) > 0
        except Exception as e:
            logger.error(f"Redis exists error: {e}")
            return False

    async def close(self):
        """关闭Redis连接"""
        if self._redis:
            await self._redis.close()
            self._redis = None
            logger.info("Redis连接已关闭")

# 全局缓存实例
cache = RedisCache()