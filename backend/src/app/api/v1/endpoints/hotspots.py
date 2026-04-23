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
    date_from: Optional[str] = Query(None, description="开始日期，格式: YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="结束日期，格式: YYYY-MM-DD"),
    sort_by: str = Query("collected_at", description="排序字段"),
    sort_order: str = Query("desc", description="排序顺序"),
    user_id: Optional[str] = Query(None, description="用户ID，用于查询分析状态"),
    db: AsyncSession = Depends(get_db)
):
    """
    获取热点列表（支持分页和筛选，带缓存）

    如果提供user_id，每个热点会包含 has_analysis 和 analysis_importance_level 字段
    """
    result = await HotspotService.get_hotspots(
        db=db,
        page=page,
        limit=limit,
        importance_levels=importance_levels,
        source_types=source_types,
        date_from=date_from,
        date_to=date_to,
        sort_by=sort_by,
        sort_order=sort_order,
        user_id=user_id
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
    db: AsyncSession = Depends(get_db)
):
    """
    获取热点统计信息（带缓存）
    """
    return await HotspotService.get_hotspot_stats(db)

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