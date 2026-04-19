import functools
import inspect
import hashlib
import json
from typing import Optional, Callable, Any
from .cache import cache

def cache_key_generator(
    prefix: str,
    args: tuple,
    kwargs: dict,
    include_self: bool = False
) -> str:
    """生成缓存键"""
    # 过滤掉self参数
    if not include_self and args:
        args = args[1:] if hasattr(args[0], '__class__') else args

    # 转换为可哈希的表示
    def make_hashable(obj):
        if isinstance(obj, (str, int, float, bool, type(None))):
            return obj
        elif isinstance(obj, (list, tuple)):
            return tuple(make_hashable(item) for item in obj)
        elif isinstance(obj, dict):
            return tuple(sorted((k, make_hashable(v)) for k, v in obj.items()))
        else:
            return str(obj)

    key_data = {
        'prefix': prefix,
        'args': make_hashable(args),
        'kwargs': make_hashable(kwargs)
    }

    key_str = json.dumps(key_data, sort_keys=True, ensure_ascii=False)
    key_hash = hashlib.md5(key_str.encode()).hexdigest()

    return f"cache:{prefix}:{key_hash}"

def cached(
    prefix: str,
    expire: int = 300,  # 默认5分钟
    key_func: Optional[Callable] = None
):
    """
    缓存装饰器

    Args:
        prefix: 缓存前缀
        expire: 缓存过期时间（秒）
        key_func: 自定义缓存键生成函数
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # 生成缓存键
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                # 默认使用函数名和参数生成键
                func_name = func.__name__
                full_prefix = f"{prefix}:{func_name}" if prefix else func_name
                cache_key = cache_key_generator(full_prefix, args, kwargs)

            # 尝试从缓存获取
            cached_result = await cache.get_json(cache_key)
            if cached_result is not None:
                return cached_result

            # 执行函数
            result = await func(*args, **kwargs)

            # 缓存结果
            if result is not None:
                await cache.set_json(cache_key, result, expire)

            return result

        return wrapper
    return decorator

def invalidate_cache(prefix: str, pattern: str = "*"):
    """
    使缓存失效的装饰器

    Args:
        prefix: 缓存前缀
        pattern: 要删除的缓存键模式
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # 执行函数
            result = await func(*args, **kwargs)

            # 删除匹配的缓存
            cache_pattern = f"cache:{prefix}:{pattern}"
            await cache.delete_pattern(cache_pattern)

            return result

        return wrapper
    return decorator