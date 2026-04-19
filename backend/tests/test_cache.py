import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
import sys
import os

# 添加项目根目录到Python路径
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)
sys.path.insert(0, os.path.join(project_root, 'src'))

from app.core.cache import RedisCache, cache
from app.core.cache_utils import cache_key_generator, cached, invalidate_cache


class TestRedisCache:
    """测试RedisCache类"""

    def setup_method(self):
        """每个测试前重置单例"""
        RedisCache._instance = None
        RedisCache._redis = None

    def test_singleton_pattern(self):
        """测试单例模式"""
        cache1 = RedisCache()
        cache2 = RedisCache()
        assert cache1 is cache2
        assert cache1._instance is cache2._instance

    @pytest.mark.asyncio
    async def test_init_success(self):
        """测试初始化成功"""
        mock_redis = AsyncMock()
        mock_redis.ping = AsyncMock()

        with patch('app.core.cache.Redis.from_url', return_value=mock_redis):
            cache_instance = RedisCache()
            await cache_instance.init()

            assert cache_instance._redis is mock_redis
            mock_redis.ping.assert_called_once()

    @pytest.mark.asyncio
    async def test_init_failure(self):
        """测试初始化失败（开发模式）"""
        with patch('app.core.cache.Redis.from_url', side_effect=Exception("Connection failed")):
            with patch('app.core.cache.settings.DEBUG', True):
                cache_instance = RedisCache()
                await cache_instance.init()

                assert cache_instance._redis is None

    @pytest.mark.asyncio
    async def test_get_set(self):
        """测试get和set方法"""
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value="test_value")
        mock_redis.set = AsyncMock(return_value=True)

        with patch.object(RedisCache, '_redis', mock_redis):
            cache_instance = RedisCache()

            # 测试get
            value = await cache_instance.get("test_key")
            assert value == "test_value"
            mock_redis.get.assert_called_once_with("test_key")

            # 测试set
            result = await cache_instance.set("test_key", "test_value", expire=60)
            assert result is True
            mock_redis.setex.assert_called_once_with("test_key", 60, "test_value")

            # 测试set不带过期时间
            result = await cache_instance.set("test_key2", "test_value2")
            assert result is True
            mock_redis.set.assert_called_once_with("test_key2", "test_value2")

    @pytest.mark.asyncio
    async def test_get_set_json(self):
        """测试JSON序列化方法"""
        mock_redis = AsyncMock()
        test_data = {"name": "test", "value": 123}
        json_str = json.dumps(test_data, ensure_ascii=False)

        mock_redis.get = AsyncMock(return_value=json_str)
        mock_redis.set = AsyncMock(return_value=True)

        with patch.object(RedisCache, '_redis', mock_redis):
            cache_instance = RedisCache()

            # 测试get_json
            value = await cache_instance.get_json("test_key")
            assert value == test_data

            # 测试set_json
            result = await cache_instance.set_json("test_key", test_data, expire=60)
            assert result is True
            mock_redis.setex.assert_called_once_with("test_key", 60, json_str)

    @pytest.mark.asyncio
    async def test_delete(self):
        """测试delete方法"""
        mock_redis = AsyncMock()
        mock_redis.delete = AsyncMock(return_value=1)

        with patch.object(RedisCache, '_redis', mock_redis):
            cache_instance = RedisCache()

            result = await cache_instance.delete("test_key")
            assert result is True
            mock_redis.delete.assert_called_once_with("test_key")

    @pytest.mark.asyncio
    async def test_delete_pattern(self):
        """测试delete_pattern方法"""
        mock_redis = AsyncMock()
        mock_redis.keys = AsyncMock(return_value=["cache:test:1", "cache:test:2"])
        mock_redis.delete = AsyncMock()

        with patch.object(RedisCache, '_redis', mock_redis):
            cache_instance = RedisCache()

            result = await cache_instance.delete_pattern("cache:test:*")
            assert result == 2
            mock_redis.delete.assert_called_once_with("cache:test:1", "cache:test:2")

    @pytest.mark.asyncio
    async def test_exists(self):
        """测试exists方法"""
        mock_redis = AsyncMock()
        mock_redis.exists = AsyncMock(return_value=1)

        with patch.object(RedisCache, '_redis', mock_redis):
            cache_instance = RedisCache()

            result = await cache_instance.exists("test_key")
            assert result is True
            mock_redis.exists.assert_called_once_with("test_key")

    @pytest.mark.asyncio
    async def test_close(self):
        """测试close方法"""
        mock_redis = AsyncMock()
        mock_redis.close = AsyncMock()

        with patch.object(RedisCache, '_redis', mock_redis):
            cache_instance = RedisCache()

            await cache_instance.close()
            mock_redis.close.assert_called_once()
            assert cache_instance._redis is None


class TestCacheUtils:
    """测试缓存工具函数"""

    def test_cache_key_generator(self):
        """测试缓存键生成器"""
        # 测试基本参数
        key1 = cache_key_generator("test", ("arg1", "arg2"), {"kwarg1": "value1"})
        assert key1.startswith("cache:test:")
        assert len(key1) == len("cache:test:") + 32  # MD5 hash length

        # 测试相同参数生成相同键
        key2 = cache_key_generator("test", ("arg1", "arg2"), {"kwarg1": "value1"})
        assert key1 == key2

        # 测试不同参数生成不同键
        key3 = cache_key_generator("test", ("arg1", "arg3"), {"kwarg1": "value1"})
        assert key1 != key3

    def test_cache_key_generator_with_self(self):
        """测试缓存键生成器包含self参数"""
        class TestClass:
            def method(self, arg1):
                pass

        obj = TestClass()
        key1 = cache_key_generator("test", (obj, "arg1"), {}, include_self=True)
        key2 = cache_key_generator("test", (obj, "arg1"), {}, include_self=False)
        assert key1 != key2

    @pytest.mark.asyncio
    async def test_cached_decorator(self):
        """测试缓存装饰器"""
        call_count = 0

        @cached("test", expire=10)
        async def test_function(arg1, arg2):
            nonlocal call_count
            call_count += 1
            return {"result": arg1 + arg2, "call_count": call_count}

        # 模拟缓存
        mock_cache = AsyncMock()
        mock_cache.get_json = AsyncMock(return_value=None)
        mock_cache.set_json = AsyncMock(return_value=True)

        with patch('app.core.cache_utils.cache', mock_cache):
            # 第一次调用应该执行函数
            result1 = await test_function("a", "b")
            assert result1["call_count"] == 1
            assert mock_cache.get_json.called
            assert mock_cache.set_json.called

            # 重置调用计数，但模拟缓存返回之前的结果
            mock_cache.get_json = AsyncMock(return_value={"result": "ab", "call_count": 1})

            # 第二次调用应该从缓存获取
            result2 = await test_function("a", "b")
            assert result2["call_count"] == 1  # 调用计数没有增加
            assert result2["result"] == "ab"

    @pytest.mark.asyncio
    async def test_cached_decorator_with_key_func(self):
        """测试带自定义键函数的缓存装饰器"""
        @cached("test", key_func=lambda x, y: f"custom_key:{x}:{y}")
        async def test_function(x, y):
            return x + y

        mock_cache = AsyncMock()
        mock_cache.get_json = AsyncMock(return_value=None)
        mock_cache.set_json = AsyncMock(return_value=True)

        with patch('app.core.cache_utils.cache', mock_cache):
            await test_function(1, 2)
            # 检查是否使用了自定义键
            assert "custom_key:1:2" in str(mock_cache.get_json.call_args)

    @pytest.mark.asyncio
    async def test_invalidate_cache_decorator(self):
        """测试缓存失效装饰器"""
        call_count = 0

        @invalidate_cache("test")
        async def update_function():
            nonlocal call_count
            call_count += 1
            return call_count

        mock_cache = AsyncMock()
        mock_cache.delete_pattern = AsyncMock(return_value=3)

        with patch('app.core.cache_utils.cache', mock_cache):
            result = await update_function()
            assert result == 1
            mock_cache.delete_pattern.assert_called_once_with("cache:test:*")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])