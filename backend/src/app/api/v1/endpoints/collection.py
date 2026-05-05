import asyncio
import uuid
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
import logging

from app.services.collector_service import collector_service
from app.services.progress_tracker import progress_tracker
from app.services.hotspot_service import HotspotService
from app.models.hotspot import Hotspot
from app.models.user_action import UserHotspotAction
from app.core.database import get_db, AsyncSessionLocal

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/collection/trigger")
async def trigger_collection(
    background_tasks: BackgroundTasks,
    force: bool = False
) -> Dict[str, Any]:
    """
    手动触发数据收集

    Args:
        force: 是否强制重新收集（暂未实现）
        background_tasks: FastAPI后台任务

    Returns:
        收集任务启动结果
    """
    try:
        # 这里可以选择同步执行或后台任务执行
        # 为了简单起见，我们直接同步执行（对于少量数据源）
        # 如果数据源多或耗时长，可以使用background_tasks.add_task

        logger.info("手动触发数据收集")

        # 直接调用收集服务
        result = await collector_service.collect_all()

        return {
            "success": True,
            "message": "数据收集完成",
            "result": result
        }

    except Exception as e:
        logger.error(f"数据收集失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"数据收集失败: {str(e)}"
        )


@router.post("/collection/trigger-background")
async def trigger_collection_background(
    background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    """
    在后台触发数据收集（异步执行）

    适用于大量数据源或耗时较长的收集任务
    """
    try:
        logger.info("触发后台数据收集任务")

        # 添加后台任务
        background_tasks.add_task(collector_service.collect_all)

        return {
            "success": True,
            "message": "后台数据收集任务已启动",
            "task_id": "background_collection_task"
        }

    except Exception as e:
        logger.error(f"触发后台数据收集失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"触发后台数据收集失败: {str(e)}"
        )


@router.get("/collection/status")
async def get_collection_status() -> Dict[str, Any]:
    """
    获取数据收集状态

    返回当前配置的收集器信息和最后收集状态（简化实现）
    """
    try:
        # 返回收集器配置信息
        collectors_info = []
        for collector in collector_service.collectors:
            collectors_info.append({
                "name": collector.name,
                "source_type": collector.source_type.value if hasattr(collector.source_type, 'value') else str(collector.source_type),
                "type": collector.__class__.__name__
            })

        return {
            "success": True,
            "collectors_count": len(collector_service.collectors),
            "collectors": collectors_info,
            "use_mock_mode": getattr(collector_service, "_use_mock", True)
        }

    except Exception as e:
        logger.error(f"获取收集状态失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取收集状态失败: {str(e)}"
        )


@router.post("/collection/async")
async def trigger_collection_async() -> Dict[str, Any]:
    """
    异步触发数据收集，立即返回 task_id，前端轮询进度
    """
    task_id = str(uuid.uuid4())
    progress_tracker.create_task(
        task_id=task_id,
        task_type="collection",
        title="热点数据收集"
    )

    asyncio.create_task(_run_collection_with_progress(task_id))

    return {"task_id": task_id, "status": "started"}


@router.get("/collection/progress/{task_id}")
async def get_collection_progress(task_id: str) -> Dict[str, Any]:
    """
    获取收集任务的进度
    """
    progress = progress_tracker.get_progress(task_id)
    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务未找到或已过期"
        )
    return progress


async def _run_collection_with_progress(task_id: str) -> None:
    """后台执行收集并更新进度"""
    try:
        result = await collector_service.collect_all(progress_task_id=task_id)
        progress_tracker.update_progress(task_id, progress=100, current_step="收集完成")
        # 使缓存失效，确保前端获取最新数据
        await HotspotService.invalidate_hotspots_cache()
        progress_tracker.complete_task(task_id)
    except Exception as e:
        logger.error(f"收集失败: {e}", exc_info=True)
        progress_tracker.fail_task(task_id, str(e))


@router.post("/collection/manual-refresh")
async def trigger_manual_refresh(
    date_from: Optional[str] = Query(None, description="发布开始日期 YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="发布结束日期 YYYY-MM-DD"),
):
    """
    手动更新热点，可选择日期区间。
    收集完成后会清除该日期区间内已忽略热点的忽略状态。
    """
    task_id = str(uuid.uuid4())
    progress_tracker.create_task(
        task_id=task_id,
        task_type="collection",
        title="手动更新热点"
    )

    asyncio.create_task(_run_manual_refresh_with_progress(task_id, date_from, date_to))

    return {"task_id": task_id, "status": "started"}


@router.get("/collection/last-update")
async def get_last_update(
    db: AsyncSession = Depends(get_db)
):
    """获取最后一次热点收集时间"""
    stmt = select(func.max(Hotspot.collected_at))
    result = await db.execute(stmt)
    last_update = result.scalar()
    return {"last_update": last_update.isoformat() if last_update else None}


async def _run_manual_refresh_with_progress(
    task_id: str,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> None:
    """后台执行手动更新：收集 → 取消忽略 → 缓存失效"""
    try:
        # 1. 执行收集
        await collector_service.collect_all(progress_task_id=task_id)

        # 2. 清除忽略状态
        async with AsyncSessionLocal() as db:
            # 构建匹配日期范围的热点ID子查询
            stmt = select(Hotspot.id).distinct()
            if date_from:
                try:
                    dt_from = datetime.strptime(date_from, "%Y-%m-%d")
                    stmt = stmt.where(Hotspot.publish_date >= dt_from)
                except ValueError:
                    pass
            if date_to:
                try:
                    dt_to = datetime.strptime(date_to, "%Y-%m-%d").replace(
                        hour=23, minute=59, second=59
                    )
                    stmt = stmt.where(Hotspot.publish_date <= dt_to)
                except ValueError:
                    pass
            # 如果没有日期范围，清除本次所有已收集热点的忽略状态
            if not date_from and not date_to:
                # 用当前时间前推24小时作为默认范围
                since = datetime.utcnow() - timedelta(hours=24)
                stmt = stmt.where(Hotspot.collected_at >= since)

            result = await db.execute(stmt)
            hotspot_ids = [str(row[0]) for row in result.all()]

            if hotspot_ids:
                # 查找这些热点中已被忽略的记录，取消忽略
                dismiss_stmt = select(UserHotspotAction).where(
                    UserHotspotAction.hotspot_id.in_(hotspot_ids),
                    UserHotspotAction.is_dismissed == True,
                )
                dismiss_result = await db.execute(dismiss_stmt)
                undismissed = 0
                for action in dismiss_result.scalars().all():
                    action.is_dismissed = False
                    action.updated_at = datetime.utcnow()
                    undismissed += 1

                if undismissed > 0:
                    await db.commit()
                    logger.info(f"手动更新取消 {undismissed} 个热点的忽略状态")

        # 3. 缓存失效
        await HotspotService.invalidate_hotspots_cache()
        progress_tracker.update_progress(task_id, progress=100, current_step="更新完成")
        progress_tracker.complete_task(task_id)
        logger.info(f"手动更新任务 {task_id} 完成")
    except Exception as e:
        logger.error(f"手动更新失败: {e}", exc_info=True)
        progress_tracker.fail_task(task_id, str(e))