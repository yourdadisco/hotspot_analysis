import asyncio
import uuid
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

logger = logging.getLogger(__name__)
# from celery.result import AsyncResult

from app.core.database import get_db
from app.models.hotspot import Hotspot, HotspotAnalysis
from app.models.user import User
from app.tasks.analysis_tasks import analyze_hotspot_for_user_async, batch_analyze_hotspots_async
from app.schemas.hotspot import HotspotAnalysisResponse
from app.services.hotspot_service import HotspotService
from app.services.progress_tracker import progress_tracker
from app.core.cache_utils import cached

router = APIRouter()

@router.post("/hotspots/{hotspot_id}/analyze")
async def trigger_hotspot_analysis(
    hotspot_id: str,
    user_id: str,
    force: bool = False,
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db)
):
    """
    触发对特定热点的分析

    如果已有分析记录且 force=False，直接返回已有结果；
    如果 force=True，删除旧分析并重新运行 LLM 分析。
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
        if not force:
            return {
                "status": "already_exists",
                "analysis_id": str(existing_analysis.id),
                "message": "该热点已有分析记录"
            }
        # 强制重新分析：删除旧记录
        await db.delete(existing_analysis)
        await db.commit()
        logger.info(f"已删除旧分析记录，准备重新分析: {hotspot_id} -> {user_id}")

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

@router.post("/users/{user_id}/analyze-latest-async")
async def analyze_latest_hotspots_async(
    user_id: str,
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """
    异步批量分析最新热点，返回 task_id，前端轮询进度
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

    task_id = str(uuid.uuid4())
    progress_tracker.create_task(
        task_id=task_id,
        task_type="batch_analysis",
        title=f"批量分析热点"
    )

    asyncio.create_task(
        _run_batch_analysis_with_progress(task_id, user_id, limit)
    )

    return {"task_id": task_id, "status": "started"}


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


@router.post("/hotspots/{hotspot_id}/analyze-async")
async def trigger_hotspot_analysis_async(
    hotspot_id: str,
    user_id: str,
    force: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """
    异步触发AI分析，返回 task_id，前端轮询进度
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

    # 处理 force=True：先删除旧分析记录
    if force:
        stmt = select(HotspotAnalysis).where(
            HotspotAnalysis.hotspot_id == hotspot_id,
            HotspotAnalysis.user_id == user_id
        )
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()
        if existing:
            await db.delete(existing)
            await db.commit()

    task_id = str(uuid.uuid4())
    progress_tracker.create_task(
        task_id=task_id,
        task_type="analysis",
        title=f"分析热点: {hotspot.title[:50]}"
    )

    asyncio.create_task(
        _run_analysis_with_progress(task_id, hotspot_id, user_id)
    )

    return {"task_id": task_id, "status": "started"}


@router.get("/analysis/progress/{task_id}")
async def get_analysis_progress(task_id: str):
    """获取分析任务的进度"""
    progress = progress_tracker.get_progress(task_id)
    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务未找到或已过期"
        )
    return progress


async def _run_analysis_with_progress(task_id: str, hotspot_id: str, user_id: str) -> None:
    """后台执行分析并更新进度"""
    try:
        progress_tracker.update_progress(task_id, progress=5, current_step="准备分析数据...")
        progress_tracker.append_step(task_id, "准备分析数据")

        progress_tracker.update_progress(task_id, progress=15, current_step="连接AI大模型中...")
        progress_tracker.append_step(task_id, "连接AI大模型中")

        progress_tracker.update_progress(task_id, progress=30, current_step="AI正在分析热点内容...")
        progress_tracker.append_step(task_id, "AI正在分析热点内容")

        # 调用实际的AI分析
        analysis_result = await analyze_hotspot_for_user_async(hotspot_id, user_id)

        if analysis_result.get("success"):
            progress_tracker.update_progress(task_id, progress=85, current_step="正在生成分析结果...")
            progress_tracker.append_step(task_id, "正在生成分析结果")

            progress_tracker.update_progress(task_id, progress=95, current_step="保存分析结果到数据库")
            progress_tracker.append_step(task_id, "保存分析结果到数据库")

            progress_tracker.update_progress(task_id, progress=100, current_step="分析完成")
            progress_tracker.complete_task(task_id)
        else:
            progress_tracker.fail_task(task_id, analysis_result.get("error", "分析失败"))
    except Exception as e:
        logger.error(f"分析过程异常: {e}")
        progress_tracker.fail_task(task_id, str(e))


async def _run_batch_analysis_with_progress(task_id: str, user_id: str, limit: int = 10) -> None:
    """后台执行批量分析并更新进度"""
    try:
        progress_tracker.update_progress(task_id, progress=0, current_step="准备批量分析...")
        progress_tracker.append_step(task_id, "准备批量分析")

        result = await batch_analyze_hotspots_async(user_id, limit, progress_task_id=task_id)

        if result.get("success"):
            analyzed = result.get("analyzed_count", 0)
            total = result.get("total_hotspots", 0)
            msg = f"批量分析完成: 成功 {analyzed}/{total}"
            progress_tracker.update_progress(task_id, progress=100, current_step=msg)
            progress_tracker.append_step(task_id, msg)
            # 使缓存失效，确保前端获取最新数据
            await HotspotService.invalidate_hotspots_cache()
            progress_tracker.complete_task(task_id)
        else:
            progress_tracker.fail_task(task_id, result.get("error", "批量分析失败"))
    except Exception as e:
        logger.error(f"批量分析过程异常: {e}")
        progress_tracker.fail_task(task_id, str(e))