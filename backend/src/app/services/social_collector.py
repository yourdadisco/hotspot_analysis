"""
社交媒体收集器模块
提供从社交媒体平台收集热点信息的功能
支持微博API等
"""

import asyncio
import logging
import time
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import aiohttp
import requests
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.models.hotspot import SourceType
from .base_collector import BaseCollector
from .search_collector import APICollector

logger = logging.getLogger(__name__)


class SocialMediaCollector(APICollector, ABC):
    """社交媒体收集器抽象基类"""

    def __init__(self, name: str, source_type: SourceType = SourceType.SOCIAL_MEDIA):
        super().__init__(name, source_type)
        self.trending_keywords = self._get_trending_keywords()

    def _get_trending_keywords(self) -> List[str]:
        """获取热门话题关键词列表"""
        if hasattr(settings, 'SOCIAL_TRENDING_KEYWORDS') and settings.SOCIAL_TRENDING_KEYWORDS:
            return [kw.strip() for kw in settings.SOCIAL_TRENDING_KEYWORDS.split(',')]
        else:
            return [
                # 前沿AI技术和模型
                "Gemma 4", "Gemma4", "Google Gemma",
                "Harness Engineering", "AI工程化", "MLOps",
                "Llama 3", "Meta Llama", "开源大模型",
                "GPT-4.5", "GPT-5", "OpenAI新发布",
                "Claude 3.5", "Anthropic", "AI助手",
                "大模型部署", "模型微调", "RAG技术",
                "AI Agent", "智能体", "多模态AI",
                "Sora", "视频生成AI", "Runway",
                "AI芯片", "NVIDIA", "AMD AI",
                "AI安全", "AI伦理", "可解释AI",
                "AI for Science", "科学AI", "AlphaFold",
                "自动驾驶", "机器人AI", "强化学习",
                "AI编程", "代码生成", "Copilot",
                "AI前沿", "最新AI技术", "AI突破"
            ]

    @abstractmethod
    async def get_trending_topics(self, limit: int = 20) -> List[Dict[str, Any]]:
        """获取热门话题"""
        pass

    @abstractmethod
    async def search_posts(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """搜索相关帖子"""
        pass

    async def collect(self) -> List[Dict[str, Any]]:
        """从社交媒体收集热点数据"""
        all_items = []

        try:
            # 获取热门话题
            trending_topics = await self.get_trending_topics(limit=10)
            for topic in trending_topics:
                try:
                    item = self._parse_trending_topic(topic)
                    if self._validate_item(item):
                        all_items.append(item)
                except Exception as e:
                    logger.warning(f"解析热门话题失败: {e}")
                    continue

            # 避免请求过快
            await asyncio.sleep(1)

            # 搜索关键词相关内容
            for keyword in self.trending_keywords[:3]:  # 限制前3个关键词
                try:
                    logger.info(f"搜索社交媒体关键词: {keyword}")
                    posts = await self.search_posts(keyword, limit=5)

                    for post in posts:
                        try:
                            item = self._parse_post(post)
                            if self._validate_item(item):
                                all_items.append(item)
                        except Exception as e:
                            logger.warning(f"解析帖子失败: {e}")
                            continue

                    await asyncio.sleep(1)
                except Exception as e:
                    logger.error(f"搜索关键词 '{keyword}' 失败: {e}")
                    continue

        except Exception as e:
            logger.error(f"社交媒体收集失败: {e}")

        logger.info(f"从 {self.name} 收集到 {len(all_items)} 个结果")
        return all_items

    @abstractmethod
    def _parse_trending_topic(self, topic: Dict[str, Any]) -> Dict[str, Any]:
        """解析热门话题"""
        pass

    @abstractmethod
    def _parse_post(self, post: Dict[str, Any]) -> Dict[str, Any]:
        """解析单个帖子"""
        pass

    def _validate_item(self, item: Dict[str, Any]) -> bool:
        """验证热点项是否有效"""
        required_fields = ['title', 'url']
        for field in required_fields:
            if not item.get(field):
                return False

        # 检查标题长度
        title = item['title']
        if len(title) < 3 or len(title) > 500:
            return False

        return True

    async def process_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """处理社交媒体结果，转换为标准格式"""
        processed = {
            "title": item.get("title", ""),
            "summary": item.get("summary", item.get("content", "")[:200]),
            "content": item.get("content", ""),
            "url": item.get("url", ""),
            "source_name": self.name,
            "source_type": self.source_type,
            "publish_date": item.get("publish_date", datetime.utcnow()),
            "language": item.get("language", "zh"),
            "author": item.get("author", ""),
            "tags": item.get("tags", []),
            "category": item.get("category", "AI技术"),
            "metadata": {
                "social_platform": self.name,
                "interaction_count": item.get("interaction_count", 0),
                "collected_at": datetime.utcnow().isoformat(),
                **item.get("metadata", {})
            }
        }

        # 确保必要字段不为空
        if not processed["title"]:
            raise ValueError("热点标题不能为空")

        if not processed["url"]:
            raise ValueError("热点URL不能为空")

        return processed


class WeiboAPICollector(SocialMediaCollector):
    """微博API收集器"""

    def __init__(self):
        super().__init__("微博", SourceType.SOCIAL_MEDIA)
        self.app_key = settings.WEIBO_APP_KEY
        self.app_secret = settings.WEIBO_APP_SECRET
        self.access_token = settings.WEIBO_ACCESS_TOKEN
        self.trending_endpoint = settings.WEIBO_TRENDING_ENDPOINT
        self.search_endpoint = settings.WEIBO_SEARCH_ENDPOINT

        if not self.app_key or not self.app_secret:
            logger.warning("微博API密钥未配置，WeiboAPICollector将无法正常工作")

    async def get_trending_topics(self, limit: int = 20) -> List[Dict[str, Any]]:
        """使用微博API获取热门话题"""
        if not self.access_token:
            logger.error("微博Access Token未配置")
            return self._get_mock_trending_topics(limit)

        try:
            params = {
                'access_token': self.access_token,
                'count': min(limit, 50)
            }

            response = await self._make_http_request(
                url=self.trending_endpoint,
                method="GET",
                params=params
            )

            if 'trends' not in response:
                logger.warning("微博热门话题API返回格式异常")
                return self._get_mock_trending_topics(limit)

            trends = response['trends']
            return trends[:limit]

        except Exception as e:
            logger.error(f"微博热门话题API调用失败: {e}")
            return self._get_mock_trending_topics(limit)

    async def search_posts(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """使用微博API搜索相关帖子"""
        if not self.access_token:
            logger.error("微博Access Token未配置")
            return self._get_mock_posts(query, limit)

        try:
            params = {
                'access_token': self.access_token,
                'q': query,
                'count': min(limit, 50)
            }

            response = await self._make_http_request(
                url=self.search_endpoint,
                method="GET",
                params=params
            )

            if 'statuses' not in response:
                logger.warning("微博搜索API返回格式异常")
                return self._get_mock_posts(query, limit)

            statuses = response['statuses']
            return statuses[:limit]

        except Exception as e:
            logger.error(f"微博搜索API调用失败: {e}")
            return self._get_mock_posts(query, limit)

    def _get_mock_trending_topics(self, limit: int) -> List[Dict[str, Any]]:
        """模拟微博热门话题（在没有API密钥时使用）"""
        import random

        trending_topics = [
            "AI技术突破", "大模型应用", "人工智能伦理",
            "机器学习新框架", "深度学习进展", "GPT-5预测",
            "AI芯片竞争", "自动驾驶进展", "智能机器人",
            "AI医疗应用", "教育AI", "金融科技AI"
        ]

        topics = []
        for i in range(min(limit, 12)):
            topic_name = random.choice(trending_topics)
            topics.append({
                "name": f"#{topic_name}#",
                "query": topic_name,
                "amount": random.randint(1000, 1000000),
                "trend": random.choice(["上升", "下降", "持平"]),
                "url": f"https://s.weibo.com/weibo?q={topic_name}",
                "metadata": {
                    "rank": i + 1,
                    "simulated": True
                }
            })

        return topics

    def _get_mock_posts(self, query: str, limit: int) -> List[Dict[str, Any]]:
        """模拟微博帖子（在没有API密钥时使用）"""
        import random

        posts = []
        base_time = time.time()

        for i in range(min(limit, 10)):
            content = f"关于{query}的最新讨论，社交媒体上的热门话题..."
            posts.append({
                "id": f"weibo_post_{int(base_time)}_{i}",
                "text": f"{query}相关讨论：{content}",
                "user": {
                    "screen_name": f"AI爱好者_{i}",
                    "profile_image_url": "https://example.com/avatar.jpg"
                },
                "created_at": datetime.utcfromtimestamp(base_time - random.randint(0, 86400)).isoformat(),
                "reposts_count": random.randint(0, 1000),
                "comments_count": random.randint(0, 500),
                "attitudes_count": random.randint(0, 2000),
                "url": f"https://weibo.com/1234567890/{int(base_time)}",
                "metadata": {
                    "rank": i + 1,
                    "simulated": True
                }
            })

        return posts

    def _parse_trending_topic(self, topic: Dict[str, Any]) -> Dict[str, Any]:
        """解析微博热门话题"""
        return {
            "title": topic.get("name", ""),
            "summary": f"热门话题：{topic.get('name', '')}，讨论量：{topic.get('amount', 0)}",
            "url": topic.get("url", ""),
            "publish_date": datetime.utcnow(),
            "author": "微博用户",
            "tags": [topic.get("query", "")],
            "category": "社交媒体",
            "interaction_count": topic.get("amount", 0),
            "metadata": topic.get("metadata", {})
        }

    def _parse_post(self, post: Dict[str, Any]) -> Dict[str, Any]:
        """解析微博帖子"""
        user = post.get("user", {})
        return {
            "title": f"微博：{user.get('screen_name', '用户')} 关于AI的讨论",
            "summary": post.get("text", "")[:200],
            "content": post.get("text", ""),
            "url": post.get("url", ""),
            "publish_date": datetime.fromisoformat(post.get("created_at", datetime.utcnow().isoformat())),
            "author": user.get("screen_name", "微博用户"),
            "tags": ["微博", "AI讨论"],
            "category": "社交媒体",
            "interaction_count": post.get("reposts_count", 0) + post.get("comments_count", 0) + post.get("attitudes_count", 0),
            "metadata": post.get("metadata", {})
        }


class BilibiliCollector(SocialMediaCollector):
    """B站（Bilibili）收集器"""

    def __init__(self):
        super().__init__("B站", SourceType.SOCIAL_MEDIA)
        self.hot_endpoint = settings.BILIBILI_HOT_ENDPOINT
        self.search_endpoint = settings.BILIBILI_SEARCH_ENDPOINT
        self.max_results = settings.BILIBILI_MAX_RESULTS
        self.search_keywords = self._get_search_keywords()

    def _get_search_keywords(self) -> List[str]:
        """获取B站搜索关键词列表"""
        if hasattr(settings, 'BILIBILI_SEARCH_KEYWORDS') and settings.BILIBILI_SEARCH_KEYWORDS:
            return [kw.strip() for kw in settings.BILIBILI_SEARCH_KEYWORDS.split(',')]
        else:
            return [
                "AI", "人工智能", "机器学习", "深度学习", "大模型",
                "Gemma", "Harness Engineering", "AI工程化", "LLM",
                "GPT", "Claude", "多模态", "AI芯片", "强化学习"
            ]

    def _is_ai_related(self, title: str, description: str = "") -> bool:
        """检查B站视频是否与AI相关"""
        if not title and not description:
            return False

        content = (title + " " + description).lower()

        # AI相关关键词（扩展版本）
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

        # 检查是否包含AI关键词
        for keyword in ai_keywords:
            if keyword in content:
                return True

        return False

    async def get_trending_topics(self, limit: int = 20) -> List[Dict[str, Any]]:
        """获取B站热门榜单（全站热门视频）"""
        try:
            params = {
                'rid': 0,  # 0表示全站
                'type': 'all',
                'ps': min(limit, 50)
            }
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.bilibili.com'
            }

            async with aiohttp.ClientSession() as session:
                async with session.get(
                    self.hot_endpoint,
                    params=params,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status != 200:
                        logger.error(f"B站热门榜单API请求失败: {response.status}")
                        return self._get_mock_trending_topics(limit)

                    data = await response.json()
                    if data.get('code') != 0:
                        logger.error(f"B站API返回错误: {data.get('message')}")
                        return self._get_mock_trending_topics(limit)

                    # 解析热门视频列表
                    hot_list = data.get('data', {}).get('list', [])
                    topics = []

                    # 遍历更多视频以找到足够多的AI相关内容
                    for item in hot_list[:limit * 3]:  # 查看3倍数量的视频
                        title = item.get('title', '')
                        desc = item.get('desc', '')

                        # 检查是否与AI相关
                        if not self._is_ai_related(title, desc):
                            continue  # 跳过非AI相关视频

                        topics.append({
                            "aid": item.get('aid'),  # 视频ID
                            "title": title,
                            "desc": desc,
                            "pic": item.get('pic', ''),
                            "owner": item.get('owner', {}).get('name', ''),
                            "view": item.get('stat', {}).get('view', 0),
                            "like": item.get('stat', {}).get('like', 0),
                            "coin": item.get('stat', {}).get('coin', 0),
                            "favorite": item.get('stat', {}).get('favorite', 0),
                            "share": item.get('stat', {}).get('share', 0),
                            "duration": item.get('duration', 0),
                            "url": f"https://www.bilibili.com/video/av{item.get('aid')}",
                            "metadata": {
                                "rank": len(topics) + 1,
                                "platform": "bilibili",
                                "bvid": item.get('bvid', ''),
                                "ai_related": True
                            }
                        })

                        # 达到限制数量则停止
                        if len(topics) >= limit:
                            break

                    # 如果AI相关视频太少，返回模拟数据
                    if len(topics) < max(3, limit // 2):
                        logger.info(f"B站热门榜单中AI相关视频太少（{len(topics)}个），使用模拟数据")
                        return self._get_mock_trending_topics(limit)

                    return topics

        except asyncio.TimeoutError:
            logger.error("B站热门榜单请求超时")
            return self._get_mock_trending_topics(limit)
        except Exception as e:
            logger.error(f"获取B站热门榜单失败: {e}")
            return self._get_mock_trending_topics(limit)

    async def search_posts(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """搜索B站相关内容（视频、专栏等）"""
        try:
            params = {
                'keyword': query,
                'page': 1,
                'pagesize': min(limit, 50)
            }
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.bilibili.com'
            }

            async with aiohttp.ClientSession() as session:
                async with session.get(
                    self.search_endpoint,
                    params=params,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status != 200:
                        logger.error(f"B站搜索API请求失败: {response.status}")
                        return self._get_mock_posts(query, limit)

                    data = await response.json()
                    if data.get('code') != 0:
                        logger.error(f"B站搜索API返回错误: {data.get('message')}")
                        return self._get_mock_posts(query, limit)

                    # 解析搜索结果
                    result_list = data.get('data', {}).get('result', [])
                    posts = []

                    # 处理视频结果
                    video_results = []
                    for item_type in ['video', 'media_bangumi', 'media_ft']:
                        if item_type in result_list:
                            video_results.extend(result_list[item_type][:5])  # 每个类型取前5个

                    # 收集AI相关视频
                    ai_video_count = 0
                    for video in video_results:
                        title = video.get('title', '')
                        desc = video.get('desc', '')

                        # 检查是否与AI相关
                        if not self._is_ai_related(title, desc):
                            continue  # 跳过非AI相关视频

                        posts.append({
                            "id": video.get('aid'),
                            "title": title,
                            "desc": desc,
                            "pic": video.get('pic', ''),
                            "author": video.get('author', ''),
                            "view": video.get('play', 0),
                            "like": video.get('like', 0),
                            "duration": video.get('duration', ''),
                            "url": f"https://www.bilibili.com/video/av{video.get('aid')}",
                            "query_keyword": query,
                            "metadata": {
                                "rank": ai_video_count + 1,
                                "platform": "bilibili",
                                "type": "video",
                                "ai_related": True
                            }
                        })

                        ai_video_count += 1
                        if ai_video_count >= limit:
                            break

                    return posts

        except asyncio.TimeoutError:
            logger.error(f"B站搜索请求超时: {query}")
            return self._get_mock_posts(query, limit)
        except Exception as e:
            logger.error(f"B站搜索失败: {e}")
            return self._get_mock_posts(query, limit)

    def _get_mock_trending_topics(self, limit: int) -> List[Dict[str, Any]]:
        """模拟B站热门话题"""
        import random

        trending_topics = [
            "AI技术前沿解读",
            "大语言模型实战",
            "机器学习算法精讲",
            "深度学习框架对比",
            "AI工程化实践",
            "多模态AI应用",
            "强化学习教程",
            "AI芯片技术分析",
            "GPT-4深度解析",
            "Gemma 4技术评测"
        ]

        topics = []
        for i in range(min(limit, 10)):
            topic_name = random.choice(trending_topics)
            topics.append({
                "aid": f"mock_{i}",
                "title": f"{topic_name} - B站热门AI视频",
                "desc": f"这个视频深入讲解了{topic_name}的相关知识，适合AI爱好者学习...",
                "owner": f"AIUP主_{i}",
                "view": random.randint(1000, 1000000),
                "like": random.randint(100, 100000),
                "coin": random.randint(50, 50000),
                "favorite": random.randint(50, 50000),
                "share": random.randint(10, 10000),
                "duration": f"{random.randint(5, 60)}:{random.randint(0, 59):02d}",
                "url": f"https://www.bilibili.com/video/mock_{i}",
                "metadata": {
                    "rank": i + 1,
                    "simulated": True,
                    "platform": "bilibili_mock"
                }
            })
        return topics

    def _get_mock_posts(self, query: str, limit: int) -> List[Dict[str, Any]]:
        """模拟B站帖子"""
        import random
        import time

        posts = []
        base_time = time.time()

        for i in range(min(limit, 10)):
            posts.append({
                "id": f"bilibili_post_{int(base_time)}_{i}",
                "title": f"{query}相关视频：AI技术深度解析 #{i+1}",
                "desc": f"这个视频详细讲解了{query}的相关技术，包括原理、应用和实战案例...",
                "author": f"AI技术分享者_{i}",
                "view": random.randint(1000, 500000),
                "like": random.randint(100, 50000),
                "duration": f"{random.randint(8, 45)}:{random.randint(0, 59):02d}",
                "url": f"https://www.bilibili.com/video/{int(base_time)}_{i}",
                "query_keyword": query,
                "metadata": {
                    "rank": i + 1,
                    "simulated": True,
                    "platform": "bilibili_mock"
                }
            })
        return posts

    def _parse_trending_topic(self, topic: Dict[str, Any]) -> Dict[str, Any]:
        """解析B站热门话题"""
        return {
            "title": topic.get("title", ""),
            "summary": topic.get("desc", "")[:200],
            "content": topic.get("desc", ""),
            "url": topic.get("url", ""),
            "publish_date": datetime.utcnow(),  # B站API不提供确切发布时间
            "author": topic.get("owner", "B站UP主"),
            "tags": ["B站", "AI视频", "技术分享"],
            "category": "社交媒体",
            "interaction_count": topic.get("view", 0) + topic.get("like", 0) + topic.get("coin", 0),
            "metadata": topic.get("metadata", {})
        }

    def _parse_post(self, post: Dict[str, Any]) -> Dict[str, Any]:
        """解析B站帖子"""
        return {
            "title": post.get("title", ""),
            "summary": post.get("desc", "")[:200],
            "content": post.get("desc", ""),
            "url": post.get("url", ""),
            "publish_date": datetime.utcnow(),
            "author": post.get("author", "B站UP主"),
            "tags": ["B站", post.get("query_keyword", "")],
            "category": "社交媒体",
            "interaction_count": post.get("view", 0) + post.get("like", 0),
            "metadata": post.get("metadata", {})
        }


class UniversalSocialCollector(SocialMediaCollector):
    """通用社交媒体收集器，自动选择可用的平台"""

    def __init__(self):
        super().__init__("通用社交媒体", SourceType.SOCIAL_MEDIA)
        self.collectors = []
        self._init_collectors()

    def _init_collectors(self):
        """初始化可用的社交媒体收集器"""
        # 优先使用B站（根据用户偏好：媒体我一般只看b站）
        if settings.USE_BILIBILI:
            self.collectors.append(BilibiliCollector())
            logger.info("启用B站收集器")

        # 其次使用微博（如果配置了API密钥）
        if settings.USE_WEIBO_API and settings.WEIBO_APP_KEY and settings.WEIBO_APP_SECRET:
            self.collectors.append(WeiboAPICollector())
            logger.info("启用微博收集器")

        if not self.collectors:
            logger.warning("没有可用的社交媒体收集器，使用模拟数据")
            # 默认使用B站模拟数据（更符合用户偏好）
            self.collectors.append(BilibiliCollector())  # 即使没有密钥也使用模拟数据

    async def get_trending_topics(self, limit: int = 20) -> List[Dict[str, Any]]:
        """使用所有可用的社交媒体平台获取热门话题"""
        all_topics = []

        for collector in self.collectors:
            try:
                topics = await collector.get_trending_topics(limit // len(self.collectors))
                all_topics.extend(topics)

                # 添加来源标记
                for topic in topics:
                    topic["metadata"] = topic.get("metadata", {})
                    topic["metadata"]["collector"] = collector.name

            except Exception as e:
                logger.error(f"社交媒体平台 {collector.name} 失败: {e}")
                continue

        return all_topics[:limit]

    async def search_posts(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """使用所有可用的社交媒体平台搜索帖子"""
        all_posts = []

        for collector in self.collectors:
            try:
                posts = await collector.search_posts(query, limit // len(self.collectors))
                all_posts.extend(posts)

                # 添加来源标记
                for post in posts:
                    post["metadata"] = post.get("metadata", {})
                    post["metadata"]["collector"] = collector.name

            except Exception as e:
                logger.error(f"社交媒体平台 {collector.name} 失败: {e}")
                continue

        return all_posts[:limit]

    def _parse_trending_topic(self, topic: Dict[str, Any]) -> Dict[str, Any]:
        """解析热门话题（委托给具体收集器）"""
        # 如果topic已经有title字段，直接返回
        if 'title' in topic:
            return topic

        # 否则尝试转换常见字段
        result = {
            "title": topic.get("name", topic.get("query", "未知话题")),
            "summary": f"热门话题: {topic.get('name', '')}，讨论量: {topic.get('amount', 0)}",
            "url": topic.get("url", ""),
            "publish_date": topic.get("publish_date", datetime.utcnow()),
            "author": "社交媒体用户",
            "tags": [topic.get("query", "")],
            "category": "社交媒体",
            "interaction_count": topic.get("amount", 0),
            "metadata": topic.get("metadata", {})
        }
        return result

    def _parse_post(self, post: Dict[str, Any]) -> Dict[str, Any]:
        """解析帖子（委托给具体收集器）"""
        # 如果post已经有title字段，直接返回
        if 'title' in post:
            return post

        # 否则尝试转换常见字段
        user = post.get("user", {})
        text = post.get("text", "")

        result = {
            "title": f"社交媒体: {user.get('screen_name', '用户')} 的分享",
            "summary": text[:200] if text else "社交媒体分享",
            "content": text,
            "url": post.get("url", ""),
            "publish_date": post.get("publish_date", datetime.utcnow()),
            "author": user.get("screen_name", "社交媒体用户"),
            "tags": ["社交媒体", "AI讨论"],
            "category": "社交媒体",
            "interaction_count": post.get("reposts_count", 0) + post.get("comments_count", 0) + post.get("attitudes_count", 0),
            "metadata": post.get("metadata", {})
        }

        # 如果没有publish_date但有created_at，尝试解析
        if not result["publish_date"] and "created_at" in post:
            try:
                result["publish_date"] = datetime.fromisoformat(post["created_at"].replace('Z', '+00:00'))
            except:
                result["publish_date"] = datetime.utcnow()

        return result


# 创建全局实例
universal_social_collector = UniversalSocialCollector()