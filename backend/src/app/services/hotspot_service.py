from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, asc, func, and_
from sqlalchemy.orm import selectinload
import hashlib
import json

from ..models.hotspot import Hotspot, HotspotAnalysis, ImportanceLevel, SourceType
from ..schemas.hotspot import HotspotResponse, HotspotWithAnalysisResponse
from ..core.cache_utils import cached, invalidate_cache
from ..core.cache import cache


class HotspotService:
    """热点服务，包含缓存和优化查询"""

    @staticmethod
    def _generate_cache_key(
        method: str,
        **kwargs
    ) -> str:
        """生成缓存键"""
        key_data = {
            'method': method,
            **kwargs
        }
        key_str = json.dumps(key_data, sort_keys=True, ensure_ascii=False)
        key_hash = hashlib.md5(key_str.encode()).hexdigest()
        return f"hotspot:{method}:{key_hash}"

    @staticmethod
    @cached(prefix="hotspot", expire=300)  # 5分钟缓存
    async def get_hotspots(
        db: AsyncSession,
        page: int = 1,
        limit: int = 20,
        importance_levels: Optional[str] = None,
        source_types: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        sort_by: str = "collected_at",
        sort_order: str = "desc"
    ):
        """
        获取热点列表（带缓存）
        """
        # 构建查询
        stmt = select(Hotspot)

        # 筛选条件
        if source_types:
            types = source_types.split(",")
            stmt = stmt.where(Hotspot.source_type.in_(types))

        if date_from:
            # 简化处理，实际应转换日期
            pass

        if date_to:
            # 简化处理，实际应转换日期
            pass

        # 排序
        order_column = getattr(Hotspot, sort_by, Hotspot.collected_at)
        if sort_order == "desc":
            stmt = stmt.order_by(desc(order_column))
        else:
            stmt = stmt.order_by(asc(order_column))

        # 分页
        total_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await db.execute(total_stmt)
        total = total_result.scalar()

        stmt = stmt.offset((page - 1) * limit).limit(limit)

        # 执行查询
        result = await db.execute(stmt)
        hotspots = result.scalars().all()

        # 计算总页数
        total_pages = (total + limit - 1) // limit

        # 转换为响应模型
        items = [HotspotResponse.model_validate(hotspot) for hotspot in hotspots]

        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages
        }

    @staticmethod
    @cached(prefix="hotspot", expire=600)  # 10分钟缓存
    async def get_hotspot_detail(
        db: AsyncSession,
        hotspot_id: str,
        user_id: Optional[str] = None
    ):
        """
        获取热点详情（带缓存）
        """
        # 查询热点
        stmt = select(Hotspot).where(Hotspot.id == hotspot_id)
        result = await db.execute(stmt)
        hotspot = result.scalar_one_or_none()

        if not hotspot:
            return None

        # 查询分析结果（如果提供了user_id）
        analysis = None
        if user_id:
            stmt = select(HotspotAnalysis).where(
                HotspotAnalysis.hotspot_id == hotspot_id,
                HotspotAnalysis.user_id == user_id
            )
            result = await db.execute(stmt)
            analysis = result.scalar_one_or_none()

        # 转换为响应模型
        hotspot_response = HotspotResponse.model_validate(hotspot)

        return {
            **hotspot_response.model_dump(),
            "analysis": analysis
        }

    @staticmethod
    @cached(prefix="hotspot", expire=300)  # 5分钟缓存
    async def get_hotspot_stats(db: AsyncSession):
        """
        获取热点统计信息（带缓存）
        """
        # 热点总数
        total_stmt = select(func.count()).select_from(Hotspot)
        total_result = await db.execute(total_stmt)
        total_hotspots = total_result.scalar()

        # 按来源统计
        source_stmt = select(
            Hotspot.source_type,
            func.count().label("count")
        ).group_by(Hotspot.source_type)
        source_result = await db.execute(source_stmt)
        by_source = {row.source_type: row.count for row in source_result.all()}

        # 重要性分布统计（从分析结果）
        importance_stmt = select(
            HotspotAnalysis.importance_level,
            func.count().label("count")
        ).group_by(HotspotAnalysis.importance_level)
        importance_result = await db.execute(importance_stmt)
        by_importance = {row.importance_level: row.count for row in importance_result.all()}

        # 按日期统计（最近7天）
        # 简化处理，实际应计算日期范围

        # 最后更新时间
        last_update_stmt = select(func.max(Hotspot.collected_at))
        last_update_result = await db.execute(last_update_stmt)
        last_update = last_update_result.scalar()

        # 未分析热点数量
        # 获取所有热点ID
        all_hotspots_stmt = select(Hotspot.id)
        all_hotspots_result = await db.execute(all_hotspots_stmt)
        all_hotspot_ids = set(all_hotspots_result.scalars().all())

        # 获取已分析热点ID
        analyzed_stmt = select(HotspotAnalysis.hotspot_id).distinct()
        analyzed_result = await db.execute(analyzed_stmt)
        analyzed_hotspot_ids = set(analyzed_result.scalars().all())

        pending_analysis = len(all_hotspot_ids - analyzed_hotspot_ids)

        return {
            "total_hotspots": total_hotspots,
            "by_source": by_source,
            "by_importance": by_importance,
            "last_update": last_update.isoformat() if last_update else None,
            "pending_analysis": pending_analysis,
            # 为前端兼容性添加的字段
            "today_count": 0,  # 需要根据日期计算
            "emergency_count": by_importance.get("emergency", 0),
            "high_count": by_importance.get("high", 0),
            "medium_count": by_importance.get("medium", 0),
            "low_count": by_importance.get("low", 0),
            "watch_count": by_importance.get("watch", 0),
        }

    @staticmethod
    async def invalidate_hotspots_cache():
        """使热点和分析相关缓存失效"""
        await cache.delete_pattern("cache:hotspot:*")
        await cache.delete_pattern("cache:analysis:*")