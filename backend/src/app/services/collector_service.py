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
from app.services.progress_tracker import progress_tracker

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

        max_retries = 3
        retry_delay = 5  # 秒

        for attempt in range(max_retries):
            try:
                # 异步获取RSS内容
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                }
                async with aiohttp.ClientSession() as session:
                    async with session.get(self.feed_url, headers=headers, timeout=10, ssl=False) as response:
                        if response.status != 200:
                            logger.error(f"RSS订阅请求失败: {response.status}")
                            if attempt < max_retries - 1:
                                await asyncio.sleep(retry_delay)
                                continue
                            return []

                        content_bytes = await response.read()
                        break  # 成功获取内容，跳出重试循环
            except Exception as e:
                logger.warning(f"RSS订阅请求失败 (尝试 {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay)
                else:
                    logger.error(f"RSS订阅请求最终失败: {e}")
                    return []
        else:
            # 所有重试都失败
            logger.error(f"RSS订阅请求失败，已尝试 {max_retries} 次")
            return []

        # 解析RSS
        try:
            feed = feedparser.parse(content_bytes)

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
                        "gemma", "gemma 4", "gemma4", "gpt", "claude", "llama", "sora", "midjourney",
                        "stable diffusion", "dall-e", "chatgpt", "bard", "copilot",
                        "大模型", "人工智能", "机器学习", "深度学习", "神经网络",
                        "transformer", "llm", "生成式ai", "generative ai", "harness engineering",
                        "Gemma 4", "Gemma4", "AI工程化", "AI工程"
                    ]

                    # 检查标题中是否包含核心AI关键词
                    title_has_core_ai = any(keyword in title_lower for keyword in core_ai_keywords)

                    # 严格的过滤逻辑
                    if not is_ai_related:
                        continue

                    # 如果标题中包含核心AI关键词，则放宽过滤条件
                    if title_has_core_ai:
                        # 标题有核心AI关键词，即使非AI内容稍多也允许通过
                        if has_non_ai_content and non_ai_keyword_count > ai_keyword_count * 3 and ai_keyword_count < 1:
                            continue
                    else:
                        # 普通文章：更严格的过滤
                        # 如果非AI关键词数量超过AI关键词数量，且AI关键词数量小于2，则跳过
                        if has_non_ai_content and non_ai_keyword_count > ai_keyword_count * 2 and ai_keyword_count < 2:
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




class CollectorService:
    """收集服务"""

    def __init__(self):
        self.collectors: List[BaseCollector] = []
        self._init_collectors()

    def _init_collectors(self):
        """初始化收集器"""
        # 不再使用模拟收集器，始终使用真实数据源
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
            # InfoQ RSS只返回"点击查看原文"，无实际内容，已移除
            ("36氪", SourceType.NEWS, "https://36kr.com/feed"),  # 新增，替换少数派
            ("虎嗅", SourceType.NEWS, "https://www.huxiu.com/rss"),  # 新增
            ("OSCHINA", SourceType.TECH_BLOG, "https://www.oschina.net/news/rss"),  # 新增
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
        # 注意：如果未启用搜索引擎且USE_MOCK_COLLECTOR=False，不会添加任何搜索引擎收集器，避免模拟数据

        # 3. 社交媒体收集器（无论模拟模式如何，根据配置启用）
        # 优先使用B站（根据用户偏好：媒体我一般只看b站）
        use_social_media = getattr(settings, "USE_BILIBILI", False) or getattr(settings, "USE_WEIBO_API", False)

        if use_social_media:
            # 社交媒体收集器已全局初始化，直接添加到列表
            self.collectors.append(universal_social_collector)
            logger.info("启用社交媒体收集器（B站优先）")
        # 注意：如果未启用社交媒体且USE_MOCK_COLLECTOR=False，不会添加任何社交媒体收集器，避免模拟数据

        if not self.collectors:
            logger.error("没有启用任何收集器！请检查配置，确保至少启用一种数据源（RSS、搜索引擎或社交媒体）")

    async def collect_all(self, progress_task_id: Optional[str] = None) -> Dict[str, Any]:
        """从所有收集器收集数据，支持进度报告"""
        logger.info("开始收集所有来源的热点数据")

        total_collected = 0
        total_updated = 0
        results = {}
        total = len(self.collectors)

        for i, collector in enumerate(self.collectors):
            step_name = f"正在从 {collector.name} 获取数据..."
            if progress_task_id:
                pct = int((i / total) * 85) if total > 0 else 0
                progress_tracker.update_progress(progress_task_id, progress=pct, current_step=step_name)
                progress_tracker.append_step(progress_task_id, step_name)

            try:
                result = await self._collect_with_collector(collector)
                results[collector.name] = result
                total_collected += result.get("collected", 0)
                total_updated += result.get("updated", 0)
            except Exception as e:
                logger.error(f"收集器 {collector.name} 失败: {e}")
                results[collector.name] = {"success": False, "error": str(e)}

        if progress_task_id:
            progress_tracker.update_progress(progress_task_id, progress=95, current_step="保存到数据库...")

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

            for idx, item in enumerate(items):
                try:
                    # 处理数据项
                    processed = await collector.process_item(item)
                    logger.debug(f"处理第{idx+1}个热点: {processed['title'][:50]}...")

                    # 检查是否已存在（基于标题和来源）
                    stmt = select(Hotspot).where(
                        Hotspot.title == processed["title"],
                        Hotspot.source_name == processed["source_name"]
                    )
                    result = await db.execute(stmt)
                    existing = result.scalar_one_or_none()

                    if existing:
                        # 更新现有热点（简化处理，只更新部分字段）
                        logger.debug(f"热点已存在，更新: {existing.title[:50]}...")
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
                        logger.debug(f"添加新热点: {hotspot.title[:50]}...")

                    saved_count += 1

                except Exception as e:
                    logger.warning(f"保存热点失败: {e}", exc_info=True)
                    continue

            try:
                await db.commit()
                logger.info(f"成功保存{saved_count}个热点到数据库")
                return saved_count
            except Exception as e:
                await db.rollback()
                logger.error(f"数据库提交失败: {e}", exc_info=True)
                return 0


# 全局收集服务实例
collector_service = CollectorService()