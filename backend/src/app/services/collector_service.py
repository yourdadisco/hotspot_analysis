"""
数据收集服务
提供从多个来源收集AI热点信息的功能
"""

import asyncio
import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import uuid
import aiohttp
import feedparser
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.models.hotspot import Hotspot, SourceType
from app.models.user import User
from app.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


class BaseCollector(ABC):
    """收集器基类"""

    def __init__(self, name: str, source_type: SourceType):
        self.name = name
        self.source_type = source_type

    @abstractmethod
    async def collect(self) -> List[Dict[str, Any]]:
        """收集热点数据"""
        pass

    async def process_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """处理单个热点项，转换为标准格式"""
        processed = {
            "title": item.get("title", ""),
            "summary": item.get("summary", ""),
            "content": item.get("content", ""),
            "url": item.get("url", ""),
            "source_name": item.get("source_name", self.name),
            "source_type": self.source_type,
            "publish_date": item.get("publish_date", datetime.utcnow()),
            "language": item.get("language", "zh"),
            "author": item.get("author", ""),
            "tags": item.get("tags", []),
            "category": item.get("category", "AI技术"),
            "metadata": item.get("metadata", {})
        }

        # 确保必要字段不为空
        if not processed["title"]:
            raise ValueError("热点标题不能为空")

        return processed


class RSSCollector(BaseCollector):
    """RSS订阅收集器"""

    def __init__(self, name: str, source_type: SourceType, feed_url: str):
        super().__init__(name, source_type)
        self.feed_url = feed_url

    async def collect(self) -> List[Dict[str, Any]]:
        """从RSS订阅收集热点"""
        logger.info(f"从RSS订阅收集热点: {self.name} ({self.feed_url})")

        try:
            # 异步获取RSS内容
            async with aiohttp.ClientSession() as session:
                async with session.get(self.feed_url, timeout=10) as response:
                    if response.status != 200:
                        logger.error(f"RSS订阅请求失败: {response.status}")
                        return []

                    content = await response.text()

            # 解析RSS
            feed = feedparser.parse(content)

            items = []
            for entry in feed.entries[:10]:  # 只取前10条
                try:
                    item = {
                        "title": entry.get("title", ""),
                        "summary": entry.get("summary", entry.get("description", "")),
                        "content": entry.get("content", [{"value": ""}])[0].get("value", ""),
                        "url": entry.get("link", ""),
                        "publish_date": self._parse_date(entry.get("published", "")),
                        "author": entry.get("author", ""),
                        "tags": [tag.get("term", "") for tag in entry.get("tags", [])],
                        "metadata": {
                            "feed_title": feed.feed.get("title", ""),
                            "feed_url": self.feed_url,
                            "entry_id": entry.get("id", ""),
                            "collected_at": datetime.utcnow().isoformat()
                        }
                    }
                    items.append(item)
                except Exception as e:
                    logger.warning(f"解析RSS条目失败: {e}")
                    continue

            return items

        except Exception as e:
            logger.error(f"RSS收集失败: {e}")
            return []

    def _parse_date(self, date_str: str) -> datetime:
        """解析日期字符串"""
        try:
            # 尝试多种日期格式
            if not date_str:
                return datetime.utcnow()

            # feedparser通常能处理各种格式
            import dateutil.parser
            return dateutil.parser.parse(date_str)
        except Exception:
            return datetime.utcnow()


class MockCollector(BaseCollector):
    """模拟数据收集器（用于开发测试）"""

    def __init__(self, name: str, source_type: SourceType):
        super().__init__(name, source_type)

    async def collect(self) -> List[Dict[str, Any]]:
        """生成模拟热点数据"""
        logger.info(f"使用模拟收集器: {self.name}")

        import random

        # 模拟AI热点数据
        mock_hotspots = [
            {
                "title": "OpenAI发布新一代多模态模型GPT-4.5",
                "summary": "OpenAI近日发布了GPT-4.5，支持更强大的多模态理解和生成能力，在多个基准测试中表现优异。",
                "content": "OpenAI最新发布的GPT-4.5在图像理解、视频分析和音频处理方面有重大突破。该模型支持128K上下文，推理能力显著提升。",
                "url": "https://openai.com/blog/gpt-4-5",
                "publish_date": datetime.utcnow() - timedelta(days=random.randint(0, 3)),
                "author": "OpenAI官方",
                "tags": ["openai", "gpt", "多模态", "大模型", "AI"],
                "category": "技术突破",
                "metadata": {"simulated": True, "importance": "high"}
            },
            {
                "title": "谷歌发布Gemini 2.0，挑战GPT-4领导地位",
                "summary": "谷歌DeepMind发布了Gemini 2.0，在推理和代码生成方面有显著提升，与GPT-4形成直接竞争。",
                "content": "Gemini 2.0采用了新的架构设计，在数学推理和代码生成任务上超越了GPT-4。谷歌计划通过云服务提供API访问。",
                "url": "https://blog.google/technology/ai/gemini-2-0",
                "publish_date": datetime.utcnow() - timedelta(days=random.randint(0, 5)),
                "author": "Google AI",
                "tags": ["google", "gemini", "大模型", "竞争", "AI"],
                "category": "行业动态",
                "metadata": {"simulated": True, "importance": "high"}
            },
            {
                "title": "Meta开源Llama 3.1，700亿参数模型免费商用",
                "summary": "Meta发布了Llama 3.1系列模型，最大700亿参数版本完全开源，支持商业用途。",
                "content": "Llama 3.1包括7B、13B和70B三个版本，在多个基准测试中表现优秀。开源协议允许商业使用，预计将促进AI应用创新。",
                "url": "https://ai.meta.com/blog/llama-3-1",
                "publish_date": datetime.utcnow() - timedelta(days=random.randint(0, 7)),
                "author": "Meta AI",
                "tags": ["meta", "llama", "开源", "大模型", "商业"],
                "category": "开源生态",
                "metadata": {"simulated": True, "importance": "medium"}
            },
            {
                "title": "AI芯片短缺影响大模型训练进度",
                "summary": "由于全球AI芯片供应紧张，多家公司的大模型训练计划受到影响，预计将持续到明年。",
                "content": "英伟达H100和A100芯片供应不足，导致多家AI公司推迟模型训练计划。行业正在寻找替代方案和国产替代芯片。",
                "url": "https://news.tech/ai-chip-shortage",
                "publish_date": datetime.utcnow() - timedelta(days=random.randint(0, 10)),
                "author": "科技新闻",
                "tags": ["芯片", "供应链", "训练", "硬件", "AI"],
                "category": "基础设施",
                "metadata": {"simulated": True, "importance": "medium"}
            },
            {
                "title": "中国发布首个千亿参数中文大模型",
                "summary": "国内研究机构发布了首个千亿参数规模的中文大模型，在中文理解和生成任务上达到国际领先水平。",
                "content": "该模型在中文NLP任务上表现出色，支持多种中文方言和专业领域。预计将推动中文AI应用发展。",
                "url": "https://news.china/chinese-llm",
                "publish_date": datetime.utcnow() - timedelta(days=random.randint(0, 14)),
                "author": "中国科技",
                "tags": ["中文大模型", "国产", "研究突破", "NLP", "AI"],
                "category": "国内动态",
                "metadata": {"simulated": True, "importance": "high"}
            }
        ]

        return mock_hotspots


class CollectorService:
    """收集服务"""

    def __init__(self):
        self.collectors: List[BaseCollector] = []
        self._init_collectors()

    def _init_collectors(self):
        """初始化收集器"""
        # 根据配置决定使用模拟收集器还是真实收集器
        if settings.DEBUG or getattr(settings, "USE_MOCK_COLLECTOR", True):
            # 使用模拟收集器
            self.collectors.extend([
                MockCollector("AI新闻模拟", SourceType.NEWS),
                MockCollector("技术博客模拟", SourceType.TECH_BLOG),
                MockCollector("社交媒体模拟", SourceType.SOCIAL_MEDIA),
            ])
            logger.info("使用模拟收集器模式")
        else:
            # 使用真实收集器（可以配置多个RSS源）
            # 示例：AI相关RSS订阅
            rss_sources = [
                ("AI科技评论", SourceType.NEWS, "https://example.com/ai-feed.rss"),
                ("机器之心", SourceType.TECH_BLOG, "https://example.com/jiqizhixin.rss"),
                # 可以添加更多源
            ]

            for name, source_type, url in rss_sources:
                self.collectors.append(RSSCollector(name, source_type, url))

    async def collect_all(self) -> Dict[str, Any]:
        """从所有收集器收集数据"""
        logger.info("开始收集所有来源的热点数据")

        total_collected = 0
        total_updated = 0
        results = {}

        for collector in self.collectors:
            try:
                result = await self._collect_with_collector(collector)
                results[collector.name] = result
                total_collected += result.get("collected", 0)
                total_updated += result.get("updated", 0)
            except Exception as e:
                logger.error(f"收集器 {collector.name} 失败: {e}")
                results[collector.name] = {"success": False, "error": str(e)}

        return {
            "success": True,
            "total_collected": total_collected,
            "total_updated": total_updated,
            "collectors": len(self.collectors),
            "results": results,
            "message": f"收集完成，新增{total_collected}个，更新{total_updated}个"
        }

    async def _collect_with_collector(self, collector: BaseCollector) -> Dict[str, Any]:
        """使用特定收集器收集数据"""
        try:
            items = await collector.collect()
            if not items:
                return {"success": True, "collected": 0, "updated": 0, "message": "没有收集到数据"}

            # 保存到数据库
            saved_count = await self._save_to_database(items, collector)

            return {
                "success": True,
                "collected": saved_count,
                "updated": 0,  # 暂时不实现更新
                "total_items": len(items),
                "message": f"从{collector.name}收集了{saved_count}个热点"
            }

        except Exception as e:
            logger.error(f"收集器 {collector.name} 执行失败: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    async def _save_to_database(self, items: List[Dict[str, Any]], collector: BaseCollector) -> int:
        """保存热点数据到数据库"""
        async with AsyncSessionLocal() as db:
            saved_count = 0

            for item in items:
                try:
                    # 处理数据项
                    processed = await collector.process_item(item)

                    # 检查是否已存在（基于标题和来源）
                    stmt = select(Hotspot).where(
                        Hotspot.title == processed["title"],
                        Hotspot.source_name == processed["source_name"]
                    )
                    result = await db.execute(stmt)
                    existing = result.scalar_one_or_none()

                    if existing:
                        # 更新现有热点（简化处理，只更新部分字段）
                        existing.summary = processed["summary"]
                        existing.tags = processed["tags"]
                        existing.category = processed["category"]
                        existing.updated_at = datetime.utcnow()
                    else:
                        # 创建新热点
                        hotspot = Hotspot(
                            title=processed["title"],
                            summary=processed["summary"],
                            content_url=processed["url"],
                            source_type=processed["source_type"],
                            source_name=processed["source_name"],
                            source_url=processed["url"],
                            publish_date=processed["publish_date"],
                            language=processed["language"],
                            author=processed["author"],
                            tags=processed["tags"],
                            category=processed["category"],
                            raw_content=processed.get("content", ""),
                            processed_content={
                                "key_points": [],
                                "entities": [],
                                "summary": processed["summary"][:200]
                            },
                            raw_metadata=processed["metadata"],
                            view_count="0",
                            like_count="0",
                            share_count="0",
                            collected_at=datetime.utcnow()
                        )
                        db.add(hotspot)

                    saved_count += 1

                except Exception as e:
                    logger.warning(f"保存热点失败: {e}")
                    continue

            try:
                await db.commit()
                logger.info(f"成功保存{saved_count}个热点到数据库")
                return saved_count
            except Exception as e:
                await db.rollback()
                logger.error(f"数据库提交失败: {e}")
                return 0


# 全局收集服务实例
collector_service = CollectorService()