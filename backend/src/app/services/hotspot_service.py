from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, asc, func, and_, or_
from sqlalchemy.orm import selectinload
import hashlib
import json
from datetime import datetime

from ..models.hotspot import Hotspot, HotspotAnalysis, ImportanceLevel, SourceType
from ..models.user_action import UserHotspotAction
from ..schemas.hotspot import HotspotResponse, HotspotAnalysisResponse, HotspotWithAnalysisResponse
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
        sort_order: str = "desc",
        user_id: Optional[str] = None,
        is_dismissed: Optional[bool] = False,
        is_favorite: Optional[bool] = None,
    ):
        """
        获取热点列表（带缓存）

        支持按重要性级别、来源类型、日期、收藏/忽略状态筛选
        """
        # 构建查询 - 使用别名避免冲突
        stmt = select(Hotspot)

        # 重要性级别筛选：需要子查询 HotspotAnalysis 表
        if importance_levels:
            levels = importance_levels.split(",")
            if user_id:
                analysis_sub = select(HotspotAnalysis.hotspot_id).where(
                    HotspotAnalysis.user_id == user_id
                )
                if levels:
                    analysis_sub = analysis_sub.where(
                        HotspotAnalysis.importance_level.in_(levels)
                    )
                stmt = stmt.where(Hotspot.id.in_(analysis_sub))

        # 来源类型筛选
        if source_types:
            types = source_types.split(",")
            stmt = stmt.where(Hotspot.source_type.in_(types))

        # 日期范围筛选
        if date_from:
            try:
                dt_from = datetime.strptime(date_from, "%Y-%m-%d")
                stmt = stmt.where(Hotspot.collected_at >= dt_from)
            except ValueError:
                pass

        if date_to:
            try:
                dt_to = datetime.strptime(date_to, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
                stmt = stmt.where(Hotspot.collected_at <= dt_to)
            except ValueError:
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

        # 查询分析状态（如果提供了user_id）
        analyzed_map = {}
        action_map = {}
        if user_id and hotspots:
            hotspot_ids = [str(h.id) for h in hotspots]

            # 分析状态
            analysis_stmt = select(
                HotspotAnalysis.hotspot_id,
                HotspotAnalysis.importance_level,
                HotspotAnalysis.relevance_score,
                HotspotAnalysis.analysis_metadata
            ).where(
                HotspotAnalysis.user_id == user_id,
                HotspotAnalysis.hotspot_id.in_(hotspot_ids)
            )
            analysis_result = await db.execute(analysis_stmt)
            for row in analysis_result.all():
                imp = row.importance_level.value if hasattr(row.importance_level, 'value') else row.importance_level
                meta = row.analysis_metadata or {}
                analyzed_map[str(row.hotspot_id)] = {
                    'importance_level': imp,
                    'relevance_score': row.relevance_score,
                    'content_summary': meta.get('content_summary') if isinstance(meta, dict) else None,
                }

            # 用户操作状态（收藏/忽略）
            action_stmt = select(UserHotspotAction).where(
                UserHotspotAction.user_id == user_id,
                UserHotspotAction.hotspot_id.in_(hotspot_ids)
            )
            action_result = await db.execute(action_stmt)
            for action in action_result.scalars().all():
                action_map[str(action.hotspot_id)] = action

        # 转换为响应模型并序列化为字典
        items = []
        for hotspot in hotspots:
            item = HotspotResponse.model_validate(hotspot).model_dump(mode='json')
            hid = str(hotspot.id)
            info = analyzed_map.get(hid)
            item['has_analysis'] = hid in analyzed_map
            item['analysis_importance_level'] = info['importance_level'] if info else None
            item['analysis_relevance_score'] = info['relevance_score'] if info else None
            item['analysis_content_summary'] = info['content_summary'] if info else None

            # 用户操作状态
            action = action_map.get(hid)
            item['is_favorite'] = action.is_favorite if action else False
            item['is_dismissed'] = action.is_dismissed if action else False

            # 应用收藏/忽略过滤（后过滤，因为缓存可能混入用户数据）
            if is_favorite is not None and item['is_favorite'] != is_favorite:
                continue
            if is_dismissed is False and item['is_dismissed']:
                continue

            items.append(item)

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

        hotspot_response = HotspotResponse.model_validate(hotspot).model_dump(mode='json')

        analysis_dict = None
        if analysis:
            analysis_dict = HotspotAnalysisResponse.model_validate(analysis).model_dump(mode='json')

        # 查询用户操作状态
        is_favorite = False
        is_dismissed = False
        if user_id:
            action_stmt = select(UserHotspotAction).where(
                UserHotspotAction.user_id == user_id,
                UserHotspotAction.hotspot_id == hotspot_id
            )
            action_result = await db.execute(action_stmt)
            action = action_result.scalar_one_or_none()
            if action:
                is_favorite = action.is_favorite
                is_dismissed = action.is_dismissed

        return {
            **hotspot_response,
            "analysis": analysis_dict,
            "is_favorite": is_favorite,
            "is_dismissed": is_dismissed,
        }

    @staticmethod
    @cached(prefix="hotspot", expire=300)  # 5分钟缓存
    async def get_hotspot_stats(db: AsyncSession):
        """获取热点统计信息（带缓存）"""
        total_stmt = select(func.count()).select_from(Hotspot)
        total_result = await db.execute(total_stmt)
        total_hotspots = total_result.scalar()

        source_stmt = select(
            Hotspot.source_type,
            func.count().label("count")
        ).group_by(Hotspot.source_type)
        source_result = await db.execute(source_stmt)
        by_source = {row.source_type: row.count for row in source_result.all()}

        importance_stmt = select(
            HotspotAnalysis.importance_level,
            func.count().label("count")
        ).group_by(HotspotAnalysis.importance_level)
        importance_result = await db.execute(importance_stmt)
        by_importance = {row.importance_level: row.count for row in importance_result.all()}

        today_stmt = select(func.count()).where(
            func.date(Hotspot.collected_at) == func.date('now')
        )
        today_result = await db.execute(today_stmt)
        today_count = today_result.scalar() or 0

        last_update_stmt = select(func.max(Hotspot.collected_at))
        last_update_result = await db.execute(last_update_stmt)
        last_update = last_update_result.scalar()

        all_hotspots_stmt = select(Hotspot.id)
        all_hotspots_result = await db.execute(all_hotspots_stmt)
        all_hotspot_ids = set(all_hotspots_result.scalars().all())

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
            "today_count": today_count,
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