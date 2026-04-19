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

router = APIRouter()

@router.get("/hotspots", response_model=PaginatedResponse)
async def get_hotspots(
    page: int = Query(1, ge=1, description="页码"),
    limit: int = Query(20, ge=1, le=100, description="每页数量"),
    importance_levels: Optional[str] = Query(None, description="重要性级别，逗号分隔"),
    source_types: Optional[str] = Query(None, description="来源类型，逗号分隔"),
    date_from: Optional[str] = Query(None, description="开始日期，格式: YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="结束日期，格式: YYYY-MM-DD"),
    sort_by: str = Query("collected_at", description="排序字段"),
    sort_order: str = Query("desc", description="排序顺序"),
    db: AsyncSession = Depends(get_db)
):
    """
    获取热点列表（支持分页和筛选）
    """
    # 构建查询
    stmt = select(Hotspot)

    # 筛选条件
    if importance_levels:
        # 解析重要性级别
        levels = importance_levels.split(",")
        # 这里需要关联HotspotAnalysis表，简化处理先不实现

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

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )

@router.get("/hotspots/{hotspot_id}", response_model=HotspotWithAnalysisResponse)
async def get_hotspot_detail(
    hotspot_id: str,
    user_id: Optional[str] = Query(None, description="用户ID，用于获取个性化分析"),
    db: AsyncSession = Depends(get_db)
):
    """
    获取热点详情

    如果提供user_id，则返回该用户的分析结果
    """
    # 查询热点
    stmt = select(Hotspot).where(Hotspot.id == hotspot_id)
    result = await db.execute(stmt)
    hotspot = result.scalar_one_or_none()

    if not hotspot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="热点不存在"
        )

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

    return HotspotWithAnalysisResponse(
        **hotspot_response.model_dump(),
        analysis=analysis
    )

@router.post("/hotspots/refresh")
async def refresh_hotspots(
    db: AsyncSession = Depends(get_db)
):
    """
    手动触发热点更新

    实际应调用Celery任务，这里返回模拟响应
    """
    # 这里应该触发异步任务
    return {
        "message": "热点更新任务已触发",
        "task_id": "simulated_task_id",
        "status": "processing"
    }

@router.get("/hotspots/stats")
async def get_hotspot_stats(
    db: AsyncSession = Depends(get_db)
):
    """
    获取热点统计信息
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

    # 按日期统计（最近7天）
    # 简化处理，实际应计算日期范围

    # 最后更新时间
    last_update_stmt = select(func.max(Hotspot.collected_at))
    last_update_result = await db.execute(last_update_stmt)
    last_update = last_update_result.scalar()

    return {
        "total_hotspots": total_hotspots,
        "by_source": by_source,
        "last_update": last_update.isoformat() if last_update else None
    }