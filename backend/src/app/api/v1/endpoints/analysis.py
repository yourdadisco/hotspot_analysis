from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from celery.result import AsyncResult

from app.core.database import get_db
from app.models.hotspot import Hotspot, HotspotAnalysis
from app.models.user import User
from app.tasks.analysis_tasks import analyze_hotspot_for_user_task
from app.schemas.hotspot import HotspotAnalysisResponse

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

    # 启动Celery任务
    task = analyze_hotspot_for_user_task.delay(hotspot_id, user_id)

    return {
        "status": "started",
        "task_id": task.id,
        "message": "分析任务已启动",
        "task_status_url": f"/api/v1/tasks/{task.id}/status"
    }

@router.get("/hotspots/{hotspot_id}/analysis/{user_id}")
async def get_hotspot_analysis(
    hotspot_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    获取热点分析结果
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

    return HotspotAnalysisResponse.model_validate(analysis)

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

    # 这里可以启动批量分析任务
    # 实际实现应使用Celery任务
    return {
        "status": "not_implemented",
        "message": "批量分析功能待实现",
        "suggestion": "请使用单个热点分析接口"
    }

@router.get("/tasks/{task_id}/status")
async def get_task_status(task_id: str):
    """
    获取Celery任务状态
    """
    task_result = AsyncResult(task_id)

    response = {
        "task_id": task_id,
        "status": task_result.status,
        "ready": task_result.ready()
    }

    if task_result.ready():
        if task_result.successful():
            response["result"] = task_result.result
        else:
            response["error"] = str(task_result.result)
            response["traceback"] = task_result.traceback

    return response