import asyncio
import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta
import random
from celery import shared_task
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.core.database import AsyncSessionLocal
from app.models.hotspot import Hotspot, SourceType, ImportanceLevel
from app.services.collector_service import collector_service

logger = logging.getLogger(__name__)

# 模拟的热点数据源
MOCK_HOTSPOTS = [
    {
        "title": "OpenAI发布新一代多模态模型GPT-4.5",
        "summary": "OpenAI近日发布了GPT-4.5，支持更强大的多模态理解和生成能力，在多个基准测试中表现优异。",
        "source_type": SourceType.TECH_BLOG,
        "source_name": "OpenAI官方博客",
        "source_url": "https://openai.com/blog/gpt-4-5",
        "tags": ["openai", "gpt", "多模态", "大模型"],
        "category": "技术突破"
    },
    {
        "title": "谷歌发布Gemini 2.0，挑战GPT-4领导地位",
        "summary": "谷歌DeepMind发布了Gemini 2.0，在推理和代码生成方面有显著提升，与GPT-4形成直接竞争。",
        "source_type": SourceType.NEWS,
        "source_name": "TechCrunch",
        "source_url": "https://techcrunch.com/2024/05/gemini-2-0",
        "tags": ["google", "gemini", "大模型", "竞争"],
        "category": "行业动态"
    },
    {
        "title": "Meta开源Llama 3.1，700亿参数模型免费商用",
        "summary": "Meta发布了Llama 3.1系列模型，最大700亿参数版本完全开源，支持商业用途。",
        "source_type": SourceType.SOCIAL_MEDIA,
        "source_name": "Twitter",
        "source_url": "https://twitter.com/metaai/status/123456789",
        "tags": ["meta", "llama", "开源", "大模型"],
        "category": "开源生态"
    },
    {
        "title": "AI芯片短缺影响大模型训练进度",
        "summary": "由于全球AI芯片供应紧张，多家公司的大模型训练计划受到影响，预计将持续到明年。",
        "source_type": SourceType.NEWS,
        "source_name": "Bloomberg",
        "source_url": "https://www.bloomberg.com/news/ai-chip-shortage",
        "tags": ["芯片", "供应链", "训练", "硬件"],
        "category": "基础设施"
    },
    {
        "title": "中国发布首个千亿参数中文大模型",
        "summary": "国内研究机构发布了首个千亿参数规模的中文大模型，在中文理解和生成任务上达到国际领先水平。",
        "source_type": SourceType.NEWS,
        "source_name": "新华社",
        "source_url": "https://www.xinhuanet.com/tech/2024/chinese-llm",
        "tags": ["中文大模型", "国产", "研究突破", "NLP"],
        "category": "国内动态"
    }
]

@shared_task(name="collect_hotspots")
def collect_hotspots_task():
    """
    收集热点信息（使用真实收集器服务）

    调用collector_service从配置的数据源（RSS、搜索引擎、社交媒体）收集AI热点信息
    """
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(collect_hotspots_async())

async def collect_hotspots_async() -> Dict[str, Any]:
    """
    异步收集热点信息（调用真实收集器服务）

    使用collector_service.collect_all()从所有配置的数据源收集热点
    """
    try:
        # 调用真正的收集器服务
        logger.info("开始执行真实数据收集任务")
        result = await collector_service.collect_all()

        # 转换结果格式以保持兼容
        success = result.get("success", False)
        total_collected = result.get("total_collected", 0)
        total_updated = result.get("total_updated", 0)
        message = result.get("message", "收集完成")

        if success:
            logger.info(f"热点收集完成: 新增{total_collected}个, 更新{total_updated}个")
            return {
                "success": True,
                "collected": total_collected,
                "updated": total_updated,
                "total": total_collected + total_updated,
                "message": message,
                "details": result  # 包含完整结果供调试
            }
        else:
            logger.error(f"热点收集失败: {message}")
            return {
                "success": False,
                "error": message,
                "details": result
            }

    except Exception as e:
        logger.error(f"热点收集任务执行失败: {e}", exc_info=True)
        return {"success": False, "error": str(e)}

@shared_task(name="collect_hotspots_from_source")
def collect_hotspots_from_source_task(source_type: str, source_url: str = None):
    """
    从特定来源收集热点（可扩展为真实爬虫）
    """
    logger.info(f"从 {source_type} 收集热点，URL: {source_url}")
    # 这里可以调用具体的爬虫实现
    return {
        "success": True,
        "source": source_type,
        "collected": 0,
        "message": "收集功能待实现"
    }

@shared_task(name="update_hotspot_metrics")
def update_hotspot_metrics_task():
    """
    更新热点指标（浏览量、点赞数等）

    模拟更新，实际应从各平台API获取
    """
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(update_hotspot_metrics_async())

async def update_hotspot_metrics_async() -> Dict[str, Any]:
    """
    异步更新热点指标
    """
    async with AsyncSessionLocal() as db:
        try:
            # 获取所有热点
            stmt = select(Hotspot)
            result = await db.execute(stmt)
            hotspots = result.scalars().all()

            updated_count = 0
            for hotspot in hotspots:
                # 模拟指标增长
                current_views = int(hotspot.view_count or "0")
                current_likes = int(hotspot.like_count or "0")
                current_shares = int(hotspot.share_count or "0")

                # 随机增长
                hotspot.view_count = str(current_views + random.randint(10, 100))
                hotspot.like_count = str(current_likes + random.randint(1, 10))
                hotspot.share_count = str(current_shares + random.randint(1, 5))
                updated_count += 1

            await db.commit()

            return {
                "success": True,
                "updated": updated_count,
                "message": f"更新了{updated_count}个热点的指标"
            }

        except Exception as e:
            logger.error(f"更新热点指标失败: {e}", exc_info=True)
            await db.rollback()
            return {"success": False, "error": str(e)}