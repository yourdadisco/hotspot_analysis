from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
# from celery.result import AsyncResult

from app.core.database import get_db
from app.models.hotspot import Hotspot, HotspotAnalysis
from app.models.user import User
from app.tasks.analysis_tasks import analyze_hotspot_for_user_async, batch_analyze_hotspots_async
from app.schemas.hotspot import HotspotAnalysisResponse
from app.services.hotspot_service import HotspotService
from app.core.cache_utils import cached

router = APIRouter()

@router.post("/hotspots/{hotspot_id}/analyze")
async def trigger_hotspot_analysis(
    hotspot_id: str,
    user_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    触发对特定热点的分析

    如果已有分析记录，直接返回；否则启动Celery任务进行分析
    """
    # 验证热点存在
    stmt = select(Hotspot).where(Hotspot.id == hotspot_id)
    result = await db.execute(stmt)
    hotspot = result.scalar_one_or_none()

    if not hotspot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="热点不存在"
        )

    # 验证用户存在
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )

    # 检查是否已有分析记录
    stmt = select(HotspotAnalysis).where(
        HotspotAnalysis.hotspot_id == hotspot_id,
        HotspotAnalysis.user_id == user_id
    )
    result = await db.execute(stmt)
    existing_analysis = result.scalar_one_or_none()

    if existing_analysis:
        return {
            "status": "already_exists",
            "analysis_id": str(existing_analysis.id),
            "message": "该热点已有分析记录"
        }

    # 直接进行分析（开发模式，简化处理）
    try:
        analysis_result = await analyze_hotspot_for_user_async(hotspot_id, user_id)
        if analysis_result.get("success"):
            # 分析成功，使热点缓存失效
            await HotspotService.invalidate_hotspots_cache()

            return {
                "status": "completed",
                "analysis_id": analysis_result.get("analysis_id"),
                "relevance_score": analysis_result.get("relevance_score"),
                "importance_level": analysis_result.get("importance_level"),
                "message": "分析完成"
            }
        else:
            return {
                "status": "failed",
                "error": analysis_result.get("error"),
                "message": "分析失败"
            }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "message": "分析过程中发生异常"
        }

@router.get("/hotspots/{hotspot_id}/analysis/{user_id}")
@cached(
    prefix="analysis",
    expire=600,  # 10分钟缓存
    key_func=lambda hotspot_id, user_id, db: f"analysis:{hotspot_id}:{user_id}"
)
async def get_hotspot_analysis(
    hotspot_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    获取热点分析结果（带缓存）
    """
    stmt = select(HotspotAnalysis).where(
        HotspotAnalysis.hotspot_id == hotspot_id,
        HotspotAnalysis.user_id == user_id
    )
    result = await db.execute(stmt)
    analysis = result.scalar_one_or_none()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="分析记录不存在"
        )

    # 转换为字典以便缓存
    return HotspotAnalysisResponse.model_validate(analysis).model_dump()

@router.post("/users/{user_id}/analyze-latest")
async def analyze_latest_hotspots(
    user_id: str,
    background_tasks: BackgroundTasks,
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """
    批量分析用户的最新热点
    """
    # 验证用户存在
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )

    # 调用批量分析异步函数
    try:
        result = await batch_analyze_hotspots_async(user_id, limit)

        if result.get("success"):
            # 批量分析成功，使热点缓存失效
            await HotspotService.invalidate_hotspots_cache()

            return {
                "status": "completed",
                "analyzed_count": result.get("analyzed_count", 0),
                "total_hotspots": result.get("total_hotspots", 0),
                "message": result.get("message", "批量分析完成")
            }
        else:
            return {
                "status": "failed",
                "error": result.get("error", "未知错误"),
                "message": "批量分析失败"
            }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "message": "批量分析过程中发生异常"
        }

@router.get("/tasks/{task_id}/status")
async def get_task_status(task_id: str):
    """
    获取任务状态（模拟实现，Celery已禁用）
    """
    # 模拟实现，因为Celery在开发模式下被禁用
    response = {
        "task_id": task_id,
        "status": "SUCCESS",
        "ready": True,
        "result": {"message": "任务已完成（模拟）", "success": True}
    }
    return response