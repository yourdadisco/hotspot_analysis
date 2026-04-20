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

from .base_collector import BaseCollector
from .search_collector import universal_search_collector
from .social_collector import universal_social_collector

logger = logging.getLogger(__name__)


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
            for entry in feed.entries[:15]:  # 增加数量以便过滤后仍有足够数据
                try:
                    # 获取原始内容
                    raw_title = entry.get("title", "")
                    raw_summary = entry.get("summary", entry.get("description", ""))
                    raw_content = entry.get("content", [{"value": ""}])[0].get("value", "")

                    # 转换为小写用于检查
                    title_lower = raw_title.lower()
                    summary_lower = raw_summary.lower()
                    content_lower = raw_content.lower()

                    # AI相关关键词（中英文）- 扩展版本，专注于前沿AI技术
                    ai_keywords = [
                        # 中文关键词
                        "ai", "人工智能", "机器学习", "深度学习", "大模型", "神经网络",
                        "自然语言处理", "计算机视觉", "生成式ai", "强化学习", "智能体",
                        "ai芯片", "算法", "数据科学", "智能", "自动化", "机器人",
                        "nlp", "cv", "gpt", "llm", "transformer", "bert",
                        "多模态", "具身智能", "ai for science", "科学智能", "ai工程化",
                        "模型部署", "模型微调", "提示工程", "ai安全", "ai伦理", "可解释ai",
                        "联邦学习", "边缘ai", "云端ai", "ai算力", "ai框架", "ai编译器",
                        "ai基准测试", "ai评测", "ai竞赛", "ai开源", "ai专利",
                        # 英文关键词
                        "artificial intelligence", "machine learning", "deep learning",
                        "neural network", "generative ai", "llm", "large language model",
                        "computer vision", "natural language processing", "reinforcement learning",
                        "ai agent", "algorithm", "data science", "automation", "robotics",
                        "multimodal", "embodied ai", "ai for science", "ai engineering",
                        "model deployment", "model fine-tuning", "prompt engineering",
                        "ai safety", "ai ethics", "explainable ai", "xai",
                        "federated learning", "edge ai", "cloud ai", "ai compute",
                        "ai framework", "ai compiler", "ai benchmark", "ai evaluation",
                        # 具体模型和技术
                        "gemma", "gemma 4", "gpt-4", "gpt-5", "claude", "llama", "sora", "midjourney",
                        "stable diffusion", "dall-e", "chatgpt", "bard", "copilot",
                        "transformer", "attention", "diffusion", "gan", "vae",
                        "harness engineering", "ai engineering", "mlops", "devops for ai",
                        "huggingface", "pytorch", "tensorflow", "jax", "mindspore",
                        # 前沿研究领域
                        "agent", "reasoning", "planning", "world model", "foundation model",
                        "self-supervised", "unsupervised", "semi-supervised", "few-shot", "zero-shot",
                        "retrieval augmented generation", "rag", "vector database",
                        "knowledge graph", "graph neural network", "gnn"
                    ]

                    # 检查AI关键词出现次数
                    ai_keyword_count = 0
                    for keyword in ai_keywords:
                        if keyword in title_lower:
                            ai_keyword_count += 3  # 标题中的关键词权重更高
                        if keyword in summary_lower:
                            ai_keyword_count += 2
                        if keyword in content_lower:
                            ai_keyword_count += 1

                    is_ai_related = ai_keyword_count > 0

                    # 排除明显与AI无关的内容（扩展版本）
                    non_ai_keywords = [
                        # 汽车交通
                        "汽车", "车企", "二手车", "汽车销售", "汽车制造", "汽车行业", "新能源汽车", "电动车",
                        "自动驾驶", "无人驾驶", "特斯拉", "比亚迪", "蔚来", "理想", "小鹏", "汽车零部件",
                        # 金融经济
                        "金融", "股票", "基金", "投资", "理财", "银行", "保险", "证券", "期货", "外汇",
                        "股市", "牛市", "熊市", "货币政策", "经济数据", "GDP", "CPI", "通货膨胀",
                        "消费", "零售", "电商", "网购", "双十一", "直播带货", "营销", "广告",
                        # 房地产
                        "房地产", "房价", "楼市", "租房", "买房", "二手房", "新房", "开发商", "物业",
                        "土地", "拍卖", "住宅", "商业地产", "写字楼", "租赁", "房贷", "首付",
                        # 体育
                        "体育", "足球", "篮球", "赛事", "运动员", "奥运会", "世界杯", "冠军", "比赛",
                        "俱乐部", "球队", "教练", "训练", "体育赛事", "体育产业", "健身", "运动",
                        # 娱乐
                        "娱乐", "明星", "电影", "电视剧", "综艺", "演唱会", "音乐", "歌手", "演员",
                        "导演", "票房", "收视率", "网红", "短视频", "抖音", "快手", "微博热搜",
                        "娱乐圈", "绯闻", "八卦", "颁奖", "电影节",
                        # 生活消费
                        "美食", "旅游", "酒店", "餐饮", "购物", "时尚", "美妆", "服饰", "奢侈品",
                        "家居", "装修", "家具", "家电", "数码产品", "手机", "电脑", "平板",
                        # 健康医疗
                        "健康", "医疗", "医院", "医生", "药品", "疫苗", "养生", "保健", "疾病",
                        "治疗", "手术", "医保", "体检", "中医", "西医", "心理健康",
                        # 教育
                        "教育", "学校", "大学", "高考", "考研", "留学", "培训", "课程", "教材",
                        "教师", "学生", "幼儿园", "小学", "中学", "职业教育", "在线教育",
                        # 政治社会
                        "政治", "政府", "政策", "法律", "法规", "法院", "公安", "军事", "国防",
                        "外交", "国际关系", "社会", "民生", "就业", "工资", "社保", "养老金",
                        "环保", "气候", "能源", "电力", "煤炭", "石油", "天然气", "可再生能源"
                    ]

                    # 计算非AI关键词出现次数
                    non_ai_keyword_count = 0
                    for keyword in non_ai_keywords:
                        if keyword in raw_title:
                            non_ai_keyword_count += 3
                        if keyword in raw_summary:
                            non_ai_keyword_count += 2
                        if keyword in raw_content:
                            non_ai_keyword_count += 1

                    has_non_ai_content = non_ai_keyword_count > 0

                    # 核心AI关键词（标题中出现这些关键词则优先通过）
                    core_ai_keywords = [
                        "gemma", "gpt", "claude", "llama", "sora", "midjourney",
                        "stable diffusion", "dall-e", "chatgpt", "bard", "copilot",
                        "大模型", "人工智能", "机器学习", "深度学习", "神经网络",
                        "transformer", "llm", "生成式ai", "generative ai", "harness engineering"
                    ]

                    # 检查标题中是否包含核心AI关键词
                    title_has_core_ai = any(keyword in title_lower for keyword in core_ai_keywords)

                    # 严格的过滤逻辑
                    if not is_ai_related:
                        continue

                    # 如果标题中包含核心AI关键词，则放宽过滤条件
                    if title_has_core_ai:
                        # 标题有核心AI关键词，即使非AI内容稍多也允许通过
                        if has_non_ai_content and non_ai_keyword_count > ai_keyword_count * 2 and ai_keyword_count < 3:
                            continue
                    else:
                        # 普通文章：更严格的过滤
                        # 如果非AI关键词数量超过AI关键词数量，且AI关键词数量小于3，则跳过
                        if has_non_ai_content and non_ai_keyword_count > ai_keyword_count and ai_keyword_count < 3:
                            continue
                    # 检测语言（基于标题和摘要）
                    # 简单的中英文检测：检查是否包含中文字符
                    import re
                    has_chinese = re.search(r'[\u4e00-\u9fff]', raw_title + raw_summary + raw_content)
                    language = "zh" if has_chinese else "en"

                    item = {
                        "title": raw_title,
                        "summary": raw_summary,
                        "content": raw_content,
                        "url": entry.get("link", ""),
                        "publish_date": self._parse_date(entry.get("published", "")),
                        "author": entry.get("author", ""),
                        "tags": [tag.get("term", "") for tag in entry.get("tags", [])],
                        "language": language,
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
        use_mock = getattr(settings, "USE_MOCK_COLLECTOR", True)

        if use_mock:
            # 使用模拟收集器
            self.collectors.extend([
                MockCollector("AI新闻模拟", SourceType.NEWS),
                MockCollector("技术博客模拟", SourceType.TECH_BLOG),
                MockCollector("社交媒体模拟", SourceType.SOCIAL_MEDIA),
            ])
            logger.info("使用模拟收集器模式（USE_MOCK_COLLECTOR=True）")
        else:
            # 使用真实收集器（即使DEBUG=True也使用真实数据）
            # 1. RSS订阅源 - 专注于AI前沿技术和权威信息源
            # 用户要求：量子位、机器之心、AI科技评论、新智元（科技学习气息浓的平台）
            # 由于机器之心RSS不可访问，使用钛媒体替代
            rss_sources = [
                # 用户指定的AI科技媒体
                ("AI科技评论", SourceType.NEWS, "https://www.leiphone.com/feed"),  # 已验证有效
                ("量子位", SourceType.NEWS, "https://www.qbitai.com/feed"),  # 已验证有效
                ("新智元", SourceType.NEWS, "https://www.zhidx.com/rss"),  # 新增，已验证有效
                # 机器之心RSS失效，使用钛媒体作为替代（知名科技媒体）
                ("钛媒体", SourceType.NEWS, "https://www.tmtpost.com/feed"),  # 已验证有效
                # 其他优质AI/技术媒体
                ("InfoQ AI技术", SourceType.TECH_BLOG, "https://www.infoq.cn/feed"),  # 已验证有效
                ("少数派AI", SourceType.TECH_BLOG, "https://sspai.com/feed"),  # 已验证有效
            ]

            for name, source_type, url in rss_sources:
                self.collectors.append(RSSCollector(name, source_type, url))

            logger.info(f"启用 {len(rss_sources)} 个RSS订阅源")

        # 2. 搜索引擎收集器（无论模拟模式如何，根据配置启用）
        # 优先使用Bing搜索（根据用户偏好：搜索引擎一般是必应）
        use_search_engine = getattr(settings, "USE_BING_SEARCH", False) or getattr(settings, "USE_BAIDU_SEARCH", False)

        if use_search_engine:
            # 搜索引擎收集器已全局初始化，直接添加到列表
            self.collectors.append(universal_search_collector)
            logger.info("启用搜索引擎收集器（Bing优先）")
        elif not settings.DEBUG and not getattr(settings, "USE_MOCK_COLLECTOR", True):
            # 如果没有启用搜索引擎但也不是模拟模式，仍添加搜索引擎收集器（会使用模拟数据）
            self.collectors.append(universal_search_collector)
            logger.info("启用搜索引擎收集器（备用模式）")

        # 3. 社交媒体收集器（无论模拟模式如何，根据配置启用）
        # 优先使用B站（根据用户偏好：媒体我一般只看b站）
        use_social_media = getattr(settings, "USE_BILIBILI", False) or getattr(settings, "USE_WEIBO_API", False)

        if use_social_media:
            # 社交媒体收集器已全局初始化，直接添加到列表
            self.collectors.append(universal_social_collector)
            logger.info("启用社交媒体收集器（B站优先）")
        elif not settings.DEBUG and not getattr(settings, "USE_MOCK_COLLECTOR", True):
            # 如果没有启用社交媒体API但也不是模拟模式，仍添加社交媒体收集器（会使用模拟数据）
            self.collectors.append(universal_social_collector)
            logger.info("启用社交媒体收集器（备用模式）")

        if not self.collectors:
            logger.warning("没有启用任何收集器，将使用模拟收集器")
            self.collectors.extend([
                MockCollector("AI新闻模拟", SourceType.NEWS),
                MockCollector("技术博客模拟", SourceType.TECH_BLOG),
                MockCollector("社交媒体模拟", SourceType.SOCIAL_MEDIA),
            ])

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