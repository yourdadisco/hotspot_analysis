import asyncio
import logging
from typing import Dict, Any, Optional
from celery import shared_task, current_task
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
import uuid
from datetime import datetime, timedelta

from app.core.database import AsyncSessionLocal
from app.core.ai_analysis import ai_analyzer  # 使用新的AI分析器
from app.models.hotspot import Hotspot, HotspotAnalysis, ImportanceLevel
from app.models.user import User
from app.models.model_config import UserModelConfig
from app.services.progress_tracker import progress_tracker

logger = logging.getLogger(__name__)


async def analyze_hotspot_for_user_async(hotspot_id: str, user_id: str) -> Dict[str, Any]:
    """
    异步函数：为用户分析热点
    """
    async with AsyncSessionLocal() as db:
        try:
            # 获取热点信息
            stmt = select(Hotspot).where(Hotspot.id == hotspot_id)
            result = await db.execute(stmt)
            hotspot = result.scalar_one_or_none()

            if not hotspot:
                logger.error(f"热点不存在: {hotspot_id}")
                return {"success": False, "error": "热点不存在"}

            # 获取用户信息
            stmt = select(User).where(User.id == user_id)
            result = await db.execute(stmt)
            user = result.scalar_one_or_none()

            if not user:
                logger.error(f"用户不存在: {user_id}")
                return {"success": False, "error": "用户不存在"}

            # 检查是否已有分析记录
            stmt = select(HotspotAnalysis).where(
                HotspotAnalysis.hotspot_id == hotspot_id,
                HotspotAnalysis.user_id == user_id
            )
            result = await db.execute(stmt)
            existing_analysis = result.scalar_one_or_none()

            if existing_analysis:
                logger.info(f"热点 {hotspot_id} 已有用户 {user_id} 的分析记录")
                return {
                    "success": True,
                    "analysis_id": str(existing_analysis.id),
                    "message": "已有分析记录"
                }

            # 调用LLM进行分析
            logger.info(f"开始分析热点 {hotspot_id} 对用户 {user_id}")
            business_description = user.business_description or ""

            # 获取用户的模型配置（每用户自己的API密钥）
            user_api_key = None
            user_api_base = None
            user_model = None
            stmt = select(UserModelConfig).where(
                UserModelConfig.user_id == user_id,
                UserModelConfig.is_active == "Y"
            )
            result = await db.execute(stmt)
            user_config = result.scalar_one_or_none()
            if user_config and user_config.api_key:
                user_api_key = user_config.api_key
                user_api_base = user_config.api_base_url
                user_model = user_config.model_name
                logger.info(f"使用用户自定义模型配置: provider={user_config.provider}, model={user_model}")

            analysis_result = await ai_analyzer.generate_analysis(
                hotspot_title=hotspot.title,
                hotspot_content=hotspot.summary or hotspot.raw_content or "",
                business_description=business_description,
                api_key=user_api_key,
                api_base_url=user_api_base,
                model_name=user_model,
            )

            # 调试：记录分析结果字段
            logger.info(f"分析结果字段: {list(analysis_result.keys())}")
            logger.info(f"包含analysis_process: {'analysis_process' in analysis_result}")
            logger.info(f"包含analysis_conclusion: {'analysis_conclusion' in analysis_result}")
            logger.info(f"完整的analysis_result: {analysis_result}")

            # 创建一个干净的元数据字典，只包含JSON可序列化的数据
            import json
            def make_json_serializable(obj):
                """递归地将对象转换为JSON可序列化的形式"""
                if isinstance(obj, (str, int, float, bool, type(None))):
                    return obj
                elif isinstance(obj, dict):
                    return {k: make_json_serializable(v) for k, v in obj.items()}
                elif isinstance(obj, (list, tuple)):
                    return [make_json_serializable(item) for item in obj]
                elif hasattr(obj, 'isoformat'):  # 处理datetime对象
                    return obj.isoformat()
                else:
                    return str(obj)

            clean_metadata = make_json_serializable(analysis_result)
            logger.info(f"清理后的元数据字段: {list(clean_metadata.keys())}")

            # 创建分析记录
            analysis = HotspotAnalysis(
                hotspot_id=hotspot_id,
                user_id=user_id,
                relevance_score=analysis_result["relevance_score"],
                importance_level=ImportanceLevel(analysis_result["importance_level"]),
                business_impact=analysis_result["business_impact"],
                importance_reason=analysis_result["importance_reason"],
                action_suggestions=analysis_result.get("action_suggestions", ""),
                technical_details=analysis_result.get("technical_details", ""),
                model_used=user_model or ai_analyzer.model,
                tokens_used=0,  # 实际应从LLM响应中获取
                analysis_metadata=clean_metadata,
                analyzed_at=datetime.utcnow()
            )

            db.add(analysis)
            await db.commit()
            await db.refresh(analysis)

            # 注意：不再用AI摘要覆盖hotspot.summary，保留原始RSS内容

            logger.info(f"热点分析完成: {hotspot_id} -> {user_id}, 分析ID: {analysis.id}")

            return {
                "success": True,
                "analysis_id": str(analysis.id),
                "relevance_score": analysis_result["relevance_score"],
                "importance_level": analysis_result["importance_level"],
                "message": "分析完成"
            }

        except Exception as e:
            logger.error(f"热点分析失败: {e}", exc_info=True)
            await db.rollback()
            return {"success": False, "error": str(e)}

@shared_task(name="batch_analyze_hotspots")
def batch_analyze_hotspots_task(user_id: str, limit: int = 10):
    """
    批量分析用户的最新热点
    """
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(
        batch_analyze_hotspots_async(user_id, limit)
    )

async def batch_analyze_hotspots_async(user_id: str, limit: int = 10, progress_task_id: str | None = None) -> Dict[str, Any]:
    """
    异步批量分析热点
    """
    async with AsyncSessionLocal() as db:
        try:
            # 获取用户
            stmt = select(User).where(User.id == user_id)
            result = await db.execute(stmt)
            user = result.scalar_one_or_none()

            if not user:
                return {"success": False, "error": "用户不存在"}

            # 获取用户尚未分析的最新热点
            subquery = select(HotspotAnalysis.hotspot_id).where(
                HotspotAnalysis.user_id == user_id
            ).subquery()

            stmt = select(Hotspot).where(
                ~Hotspot.id.in_(select(subquery))
            ).order_by(
                Hotspot.collected_at.desc()
            ).limit(limit)

            result = await db.execute(stmt)
            hotspots = result.scalars().all()

            if not hotspots:
                if progress_task_id:
                    progress_tracker.update_progress(progress_task_id, progress=100, current_step="没有需要分析的新热点")
                return {"success": True, "message": "没有需要分析的新热点", "analyzed_count": 0}

            total = len(hotspots)
            if progress_task_id:
                progress_tracker.append_step(progress_task_id, f"准备批量分析 {total} 个热点")
                progress_tracker.update_progress(progress_task_id, progress=5, current_step=f"准备批量分析 {total} 个热点")

            # 逐个分析
            analyzed_count = 0
            for i, hotspot in enumerate(hotspots):
                step_name = f"正在分析热点 {i+1}/{total}: {hotspot.title[:30]}..."
                logger.info(f"批量分析进度: {step_name}")
                if progress_task_id:
                    pct = int(((i + 1) / total) * 90) + 5  # 5% ~ 95%
                    progress_tracker.update_progress(progress_task_id, progress=pct, current_step=step_name)
                    progress_tracker.append_step(progress_task_id, step_name)

                try:
                    await analyze_hotspot_for_user_async(str(hotspot.id), user_id)
                    analyzed_count += 1
                except Exception as e:
                    logger.error(f"批量分析失败: {hotspot.id} - {e}")

            if progress_task_id:
                progress_tracker.update_progress(progress_task_id, progress=100, current_step="批量分析完成")

            return {
                "success": True,
                "analyzed_count": analyzed_count,
                "total_hotspots": len(hotspots),
                "message": f"批量分析完成，成功 {analyzed_count}/{len(hotspots)}"
            }

        except Exception as e:
            logger.error(f"批量分析失败: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

@shared_task(name="cleanup_old_analyses")
def cleanup_old_analyses_task(days: int = 30):
    """
    清理旧的临时分析记录（如果存在）
    实际项目中可能不需要清理分析记录，这里作为示例
    """
    logger.info(f"清理 {days} 天前的临时数据")
    return {"success": True, "message": f"已清理 {days} 天前的临时数据"}