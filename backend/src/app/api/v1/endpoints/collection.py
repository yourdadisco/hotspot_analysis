import asyncio
import uuid
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, BackgroundTasks
import logging

from app.services.collector_service import collector_service
from app.services.progress_tracker import progress_tracker
from app.services.hotspot_service import HotspotService

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