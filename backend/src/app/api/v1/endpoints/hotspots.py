from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, asc, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.hotspot import Hotspot, HotspotAnalysis, ImportanceLevel, SourceType
from app.schemas.hotspot import (
    HotspotResponse, HotspotWithAnalysisResponse, HotspotQueryParams,
    HotspotFilterParams, HotspotCreate, HotspotUpdate
)
from app.schemas.base import PaginatedResponse
from app.services.hotspot_service import HotspotService

router = APIRouter()

@router.get("/hotspots", response_model=PaginatedResponse)
async def get_hotspots(
    page: int = Query(1, ge=1, description="页码"),
    limit: int = Query(20, ge=1, le=100, description="每页数量"),
    importance_levels: Optional[str] = Query(None, description="重要性级别，逗号分隔"),
    source_types: Optional[str] = Query(None, description="来源类型，逗号分隔"),
    source_names: Optional[str] = Query(None, description="来源名称，逗号分隔（如'量子位,新智元'）"),
    date_from: Optional[str] = Query(None, description="开始日期，格式: YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="结束日期，格式: YYYY-MM-DD"),
    sort_by: str = Query("collected_at", description="排序字段"),
    sort_order: str = Query("desc", description="排序顺序"),
    user_id: Optional[str] = Query(None, description="用户ID，用于查询分析状态"),
    is_dismissed: Optional[bool] = Query(False, description="是否包含已忽略的热点"),
    is_favorite: Optional[bool] = Query(None, description="按收藏状态筛选"),
    db: AsyncSession = Depends(get_db)
):
    """
    获取热点列表（支持分页和筛选，带缓存）

    如果提供user_id，每个热点会包含 has_analysis、analysis_importance_level、
    is_favorite、is_dismissed 等字段
    默认排除已忽略的热点(is_dismissed=false)
    """
    result = await HotspotService.get_hotspots(
        db=db,
        page=page,
        limit=limit,
        importance_levels=importance_levels,
        source_types=source_types,
        source_names=source_names,
        date_from=date_from,
        date_to=date_to,
        sort_by=sort_by,
        sort_order=sort_order,
        user_id=user_id,
        is_dismissed=is_dismissed,
        is_favorite=is_favorite,
    )

    return PaginatedResponse(
        items=result["items"],
        total=result["total"],
        page=result["page"],
        limit=result["limit"],
        total_pages=result["total_pages"]
    )

@router.get("/hotspots/stats")
async def get_hotspot_stats(
    user_id: Optional[str] = Query(None, description="用户ID，传入后排除已忽略热点"),
    db: AsyncSession = Depends(get_db)
):
    """
    获取热点统计信息（带缓存）
    传入 user_id 会排除当前用户已忽略的热点
    """
    return await HotspotService.get_hotspot_stats(db, user_id=user_id)

@router.get("/hotspots/source-names")
async def get_source_names(
    db: AsyncSession = Depends(get_db)
):
    """获取所有去重的热点来源名称"""
    return await HotspotService.get_source_names(db)

@router.get("/hotspots/_debug")
async def debug_hotspots(
    db: AsyncSession = Depends(get_db)
):
    """调试端点：返回数据库原始状态"""
    from app.models.user_action import UserHotspotAction
    from sqlalchemy import func, select, and_, or_

    # 1. 总热点数
    total = (await db.execute(select(func.count()).select_from(Hotspot))).scalar()

    # 2. 最近10条热点
    recent = (await db.execute(
        select(Hotspot.id, Hotspot.title, Hotspot.source_name, Hotspot.publish_date, Hotspot.collected_at)
        .order_by(Hotspot.collected_at.desc())
        .limit(10)
    )).all()

    # 3. UserHotspotAction 统计
    action_count = (await db.execute(
        select(func.count()).select_from(UserHotspotAction)
    )).scalar()
    dismissed_count = (await db.execute(
        select(func.count()).select_from(UserHotspotAction)
        .where(UserHotspotAction.is_dismissed == True)
    )).scalar()
    favorite_count = (await db.execute(
        select(func.count()).select_from(UserHotspotAction)
        .where(UserHotspotAction.is_favorite == True)
    )).scalar()

    # 4. 模拟列表查询（无用户筛选）
    sample_query = (await db.execute(
        select(Hotspot.id, Hotspot.title)
        .order_by(Hotspot.publish_date.desc())
        .limit(10)
    )).all()

    return {
        "total_hotspots": total,
        "recent_hotspots": [
            {"id": str(r.id), "title": r.title, "source": r.source_name, "publish": str(r.publish_date)[:19] if r.publish_date else None, "collected": str(r.collected_at)[:19] if r.collected_at else None}
            for r in recent
        ],
        "user_hotspot_actions": {
            "total": action_count,
            "dismissed": dismissed_count,
            "favorited": favorite_count,
        },
        "sample_list_query": [{"id": str(r.id), "title": r.title} for r in sample_query],
    }


@router.get("/hotspots/{hotspot_id}", response_model=HotspotWithAnalysisResponse)
async def get_hotspot_detail(
    hotspot_id: str,
    user_id: Optional[str] = Query(None, description="用户ID，用于获取个性化分析"),
    db: AsyncSession = Depends(get_db)
):
    """
    获取热点详情（带缓存）

    如果提供user_id，则返回该用户的分析结果
    """
    result = await HotspotService.get_hotspot_detail(db, hotspot_id, user_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="热点不存在"
        )

    return HotspotWithAnalysisResponse(**result)


@router.post("/hotspots/refresh")
async def refresh_hotspots(
    db: AsyncSession = Depends(get_db)
):
    """
    手动触发热点更新

    实际应调用Celery任务，这里返回模拟响应
    更新后使热点缓存失效
    """
    # 使热点缓存失效
    await HotspotService.invalidate_hotspots_cache()

    # 这里应该触发异步任务
    return {
        "message": "热点更新任务已触发，缓存已清除",
        "task_id": "simulated_task_id",
        "status": "processing"
    }