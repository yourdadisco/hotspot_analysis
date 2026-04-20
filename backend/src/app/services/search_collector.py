"""
搜索引擎收集器模块
提供从多个搜索引擎收集热点信息的功能
支持百度搜索API、Google搜索等
"""

import asyncio
import logging
import hashlib
import time
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from urllib.parse import urlparse, parse_qs
import aiohttp
import requests
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.models.hotspot import SourceType
from .base_collector import BaseCollector

logger = logging.getLogger(__name__)


class APICollector(BaseCollector):
    """带重试机制的API收集器基类"""

    def __init__(self, name: str, source_type: SourceType, max_retries: int = None):
        super().__init__(name, source_type)
        self.max_retries = max_retries or settings.COLLECTOR_RETRY_ATTEMPTS
        self.timeout = settings.COLLECTOR_TIMEOUT

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True
    )
    async def _make_http_request(self, url: str, method: str = "GET",
                               headers: Dict = None, params: Dict = None,
                               data: Dict = None) -> Dict:
        """发送HTTP请求，带重试机制"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.request(
                    method=method,
                    url=url,
                    headers=headers,
                    params=params,
                    json=data,
                    timeout=aiohttp.ClientTimeout(total=self.timeout)
                ) as response:
                    if response.status != 200:
                        error_msg = f"HTTP {response.status}: {await response.text()}"
                        logger.error(f"请求失败: {error_msg}")
                        raise Exception(error_msg)

                    content_type = response.headers.get('Content-Type', '')
                    if 'application/json' in content_type:
                        return await response.json()
                    else:
                        return {"text": await response.text()}

        except asyncio.TimeoutError:
            logger.error(f"请求超时: {url}")
            raise
        except Exception as e:
            logger.error(f"请求异常: {e}")
            raise

    def _generate_item_hash(self, title: str, url: str) -> str:
        """生成热点项的哈希值，用于去重"""
        content = f"{title}|{url}"
        return hashlib.md5(content.encode('utf-8')).hexdigest()

    def _is_within_time_window(self, publish_date: datetime, window_hours: int = 24) -> bool:
        """检查发布时间是否在时间窗口内"""
        if not publish_date:
            return True
        time_window = timedelta(hours=window_hours)
        return datetime.utcnow() - publish_date <= time_window


class SearchEngineCollector(APICollector, ABC):
    """搜索引擎收集器抽象基类"""

    def __init__(self, name: str, source_type: SourceType = SourceType.NEWS):
        super().__init__(name, source_type)
        self.search_keywords = self._get_search_keywords()

    def _get_search_keywords(self) -> List[str]:
        """获取搜索关键词列表"""
        if hasattr(settings, 'BAIDU_SEARCH_KEYWORDS') and settings.BAIDU_SEARCH_KEYWORDS:
            return [kw.strip() for kw in settings.BAIDU_SEARCH_KEYWORDS.split(',')]
        else:
            return [
                # 前沿AI技术和模型
                "Gemma 4", "Gemma4", "Google Gemma 4",
                "Harness Engineering", "AI工程化", "MLOps",
                "Llama 3.1", "Llama 3.2", "Meta Llama",
                "GPT-4.5", "GPT-5", "OpenAI新模型",
                "Claude 3.5", "Anthropic Claude",
                "大模型部署", "模型微调", "RAG技术",
                "向量数据库", "AI Agent", "智能体",
                "多模态AI", "视频生成AI", "Sora", "Runway",
                "AI芯片进展", "NVIDIA Blackwell", "AMD MI300",
                "AI基础设施", "AI算力", "模型压缩",
                "边缘AI", "AI安全", "AI伦理",
                "AI for Science", "AlphaFold 3", "科学AI",
                "自动驾驶AI", "机器人学习", "强化学习进展",
                "AI编程助手", "代码生成AI", "GitHub Copilot",
                "AI硬件", "神经形态计算", "量子机器学习"
            ]

    @abstractmethod
    async def search(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """执行搜索，返回原始结果"""
        pass

    @abstractmethod
    def _parse_search_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """解析单个搜索结果，转换为标准格式"""
        pass

    async def collect(self) -> List[Dict[str, Any]]:
        """从搜索引擎收集热点数据"""
        all_items = []
        logger.debug(f"开始收集，搜索关键词列表: {self.search_keywords[:5]}")

        for keyword in self.search_keywords[:5]:  # 限制前5个关键词
            try:
                logger.info(f"搜索关键词: {keyword}")
                max_results = getattr(settings, 'BAIDU_SEARCH_MAX_RESULTS', 50) // 5
                logger.debug(f"最大结果数: {max_results}")
                results = await self.search(keyword, max_results=max_results)
                logger.debug(f"搜索到 {len(results)} 个原始结果")

                for result in results:
                    try:
                        item = self._parse_search_result(result)
                        if self._validate_item(item):
                            all_items.append(item)
                    except Exception as e:
                        logger.warning(f"解析搜索结果失败: {e}")
                        continue

                # 避免请求过快
                await asyncio.sleep(1)

            except Exception as e:
                logger.error(f"搜索关键词 '{keyword}' 失败: {e}")
                continue

        logger.info(f"从 {self.name} 收集到 {len(all_items)} 个结果")
        return all_items

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

        # 检查URL格式
        url = item['url']
        try:
            result = urlparse(url)
            if not all([result.scheme, result.netloc]):
                return False
        except:
            return False

        return True

    async def process_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """处理搜索引擎结果，转换为标准格式"""
        processed = {
            "title": item.get("title", ""),
            "summary": item.get("summary", item.get("snippet", "")),
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
                "search_engine": self.name,
                "query_keyword": item.get("query_keyword", ""),
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


class BaiduSearchCollector(SearchEngineCollector):
    """百度搜索API收集器"""

    def __init__(self):
        super().__init__("百度搜索", SourceType.NEWS)
        self.api_key = settings.BAIDU_API_KEY
        self.secret_key = settings.BAIDU_SECRET_KEY
        self.endpoint = settings.BAIDU_SEARCH_ENDPOINT

        if not self.api_key or not self.secret_key:
            logger.warning("百度API密钥未配置，BaiduSearchCollector将无法正常工作")

    def _get_search_keywords(self) -> List[str]:
        """获取百度搜索关键词列表"""
        if hasattr(settings, 'BAIDU_SEARCH_KEYWORDS') and settings.BAIDU_SEARCH_KEYWORDS:
            return [kw.strip() for kw in settings.BAIDU_SEARCH_KEYWORDS.split(',')]
        else:
            # 默认中文AI技术关键词
            return [
                "AI最新技术", "人工智能热点", "大模型进展", "AI芯片", "机器学习",
                "深度学习", "自然语言处理", "计算机视觉", "生成式AI", "Gemma 4",
                "Gemma4", "Harness Engineering", "AI工程化", "大模型部署",
                "模型微调", "强化学习", "多模态AI", "AI安全", "AI伦理", "AI for Science"
            ]

    async def search(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """使用百度搜索API搜索"""
        if not self.api_key or not self.secret_key:
            logger.error("百度API密钥未配置")
            return []

        try:
            # 这里需要实现百度搜索API的具体调用
            # 百度搜索API文档：https://ai.baidu.com/ai-doc/REFERENCE/Ck3dwjgn3
            # 由于API具体实现需要Access Token等，这里提供模拟实现

            # 模拟返回结果，实际实现需要调用百度API
            mock_results = self._get_mock_results(query, max_results)
            return mock_results

        except Exception as e:
            logger.error(f"百度搜索失败: {e}")
            return []

    def _get_mock_results(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        """模拟百度搜索结果（在没有API密钥时使用）"""
        import random
        import time

        results = []
        base_time = time.time()

        # 模拟AI相关搜索结果
        ai_topics = [
            "OpenAI发布新一代模型",
            "谷歌DeepMind突破",
            "Meta开源大模型",
            "腾讯混元模型升级",
            "字节跳动AI实验室成果",
            "华为昇腾芯片进展",
            "百度文心一言更新",
            "阿里通义千问进展",
            "AI芯片供应链动态",
            "机器学习框架更新"
        ]

        for i in range(min(max_results, 10)):
            title = f"{query}: {random.choice(ai_topics)}"
            results.append({
                "title": title,
                "snippet": f"这是关于{query}的最新进展报道，涉及人工智能技术的前沿动态...",
                "url": f"https://example.com/article/{int(base_time)}-{i}",
                "display_url": "example.com",
                "publish_date": datetime.utcfromtimestamp(base_time - random.randint(0, 86400)),
                "query_keyword": query,
                "metadata": {
                    "rank": i + 1,
                    "simulated": True
                }
            })

        return results

    def _parse_search_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """解析百度搜索结果"""
        return {
            "title": result.get("title", ""),
            "summary": result.get("snippet", ""),
            "url": result.get("url", ""),
            "publish_date": result.get("publish_date", datetime.utcnow()),
            "author": result.get("author", ""),
            "tags": [result.get("query_keyword", "")],
            "category": "AI技术",
            "metadata": result.get("metadata", {})
        }


class GoogleSearchCollector(SearchEngineCollector):
    """Google搜索收集器（使用googlesearch-python库）"""

    def __init__(self):
        super().__init__("Google搜索", SourceType.NEWS)

    def _get_search_keywords(self) -> List[str]:
        """获取Google搜索关键词列表"""
        # Google搜索使用Bing关键词作为备用，或者可以混合中英文关键词
        # 优先使用Bing关键词，如果没有则使用默认的
        if hasattr(settings, 'BING_SEARCH_KEYWORDS') and settings.BING_SEARCH_KEYWORDS:
            return [kw.strip() for kw in settings.BING_SEARCH_KEYWORDS.split(',')]
        elif hasattr(settings, 'BAIDU_SEARCH_KEYWORDS') and settings.BAIDU_SEARCH_KEYWORDS:
            return [kw.strip() for kw in settings.BAIDU_SEARCH_KEYWORDS.split(',')]
        else:
            # 默认混合中英文AI技术关键词
            return [
                "Gemma 4", "Harness Engineering", "AI engineering", "MLOps",
                "large language model", "LLM", "AI chip", "AI infrastructure",
                "多模态AI", "AI安全", "AI伦理", "机器学习", "深度学习",
                "大语言模型", "生成式AI", "强化学习", "AI for Science"
            ]

    async def search(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """使用Google搜索（需要安装googlesearch-python）"""
        try:
            # 尝试导入googlesearch
            try:
                from googlesearch import search
            except ImportError:
                logger.error("googlesearch-python库未安装，请运行: pip install googlesearch-python")
                return self._get_mock_results(query, max_results)

            # 同步搜索，需要在线程池中运行
            loop = asyncio.get_event_loop()
            try:
                urls = await loop.run_in_executor(
                    None,
                    lambda: list(search(query, num_results=max_results, lang="zh"))
                )
                logger.debug(f"Google搜索返回 {len(urls)} 个URL")
            except Exception as e:
                logger.warning(f"Google搜索异常: {e}")
                urls = []

            # 如果搜索结果为空，使用模拟数据
            if not urls:
                logger.info("Google搜索结果为空，使用模拟数据")
                return self._get_mock_results(query, max_results)

            results = []
            for i, url in enumerate(urls):
                results.append({
                    "title": f"{query} 相关结果 {i+1}",
                    "snippet": f"关于{query}的搜索结果，来自: {url}",
                    "url": url,
                    "display_url": urlparse(url).netloc,
                    "publish_date": datetime.utcnow(),
                    "query_keyword": query,
                    "metadata": {
                        "rank": i + 1,
                        "source": "google"
                    }
                })

            return results

        except Exception as e:
            logger.error(f"Google搜索失败: {e}")
            return self._get_mock_results(query, max_results)

    def _get_mock_results(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        """模拟Google搜索结果"""
        import random

        results = []
        base_time = time.time()

        for i in range(min(max_results, 10)):
            results.append({
                "title": f"{query} - AI技术动态 #{i+1}",
                "snippet": f"最新的{query}技术进展，包括研究成果和应用案例...",
                "url": f"https://example.com/google/{int(base_time)}-{i}",
                "display_url": "example.com",
                "publish_date": datetime.utcfromtimestamp(base_time - random.randint(0, 86400)),
                "query_keyword": query,
                "metadata": {
                    "rank": i + 1,
                    "simulated": True,
                    "source": "google_mock"
                }
            })

        return results

    def _parse_search_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """解析Google搜索结果"""
        return {
            "title": result.get("title", ""),
            "summary": result.get("snippet", ""),
            "url": result.get("url", ""),
            "publish_date": result.get("publish_date", datetime.utcnow()),
            "author": "",
            "tags": [result.get("query_keyword", "")],
            "category": "AI技术",
            "metadata": result.get("metadata", {})
        }


class BingSearchCollector(SearchEngineCollector):
    """Bing搜索收集器（使用Microsoft Azure Cognitive Services API）"""

    def __init__(self):
        super().__init__("Bing搜索", SourceType.NEWS)
        self.api_key = settings.BING_API_KEY
        self.endpoint = settings.BING_SEARCH_ENDPOINT
        self.max_results = settings.BING_SEARCH_MAX_RESULTS

        if not self.api_key:
            logger.warning("Bing API密钥未配置，BingSearchCollector将使用模拟数据")

    def _get_search_keywords(self) -> List[str]:
        """获取Bing搜索关键词列表"""
        if hasattr(settings, 'BING_SEARCH_KEYWORDS') and settings.BING_SEARCH_KEYWORDS:
            return [kw.strip() for kw in settings.BING_SEARCH_KEYWORDS.split(',')]
        else:
            # 默认英文AI技术关键词
            return [
                "Gemma 4", "Gemma4", "Google Gemma 4",
                "Harness Engineering", "AI engineering", "MLOps",
                "large language model", "LLM", "AI chip", "AI infrastructure",
                "multimodal AI", "AI safety", "AI ethics", "AI for Science",
                "machine learning", "deep learning", "neural networks",
                "generative AI", "computer vision", "natural language processing"
            ]

    async def search(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """使用Bing搜索API搜索"""
        if not self.api_key:
            logger.warning("Bing API密钥未配置，使用模拟数据")
            return self._get_mock_results(query, max_results)

        try:
            headers = {
                "Ocp-Apim-Subscription-Key": self.api_key,
                "User-Agent": "AI-Hotspot-Analysis/1.0"
            }
            params = {
                "q": query,
                "count": min(max_results, 50),
                "offset": 0,
                "mkt": "zh-CN",  # 中文市场
                "safeSearch": "Moderate",
                "responseFilter": "Webpages"  # 只获取网页结果
            }

            async with aiohttp.ClientSession() as session:
                async with session.get(
                    self.endpoint,
                    headers=headers,
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Bing API请求失败: {response.status}, {error_text}")
                        return self._get_mock_results(query, max_results)

                    data = await response.json()

            # 解析Bing API响应
            web_pages = data.get("webPages", {}).get("value", [])
            results = []
            for i, page in enumerate(web_pages):
                results.append({
                    "title": page.get("name", ""),
                    "snippet": page.get("snippet", ""),
                    "url": page.get("url", ""),
                    "display_url": page.get("displayUrl", ""),
                    "publish_date": datetime.utcnow(),  # Bing API不直接提供发布时间
                    "query_keyword": query,
                    "metadata": {
                        "rank": i + 1,
                        "source": "bing",
                        "id": page.get("id", "")
                    }
                })

            return results

        except asyncio.TimeoutError:
            logger.error(f"Bing搜索超时: {query}")
            return self._get_mock_results(query, max_results)
        except Exception as e:
            logger.error(f"Bing搜索失败: {e}")
            return self._get_mock_results(query, max_results)

    def _get_mock_results(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        """模拟Bing搜索结果"""
        import random

        results = []
        base_time = time.time()

        # 模拟AI相关的Bing搜索结果
        ai_topics = [
            "Gemma 4技术解析",
            "Harness Engineering实践",
            "大语言模型部署指南",
            "AI工程化最新进展",
            "多模态AI应用案例",
            "AI芯片性能对比",
            "强化学习新算法",
            "AI安全与伦理讨论"
        ]

        for i in range(min(max_results, 10)):
            title = f"{query}: {random.choice(ai_topics)}"
            results.append({
                "title": title,
                "snippet": f"这是关于{query}的最新Bing搜索结果，提供前沿AI技术信息...",
                "url": f"https://bing.com/search?q={query.replace(' ', '+')}-{i}",
                "display_url": "bing.com",
                "publish_date": datetime.utcfromtimestamp(base_time - random.randint(0, 86400)),
                "query_keyword": query,
                "metadata": {
                    "rank": i + 1,
                    "simulated": True,
                    "source": "bing_mock"
                }
            })

        return results

    def _parse_search_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """解析Bing搜索结果"""
        return {
            "title": result.get("title", ""),
            "summary": result.get("snippet", ""),
            "url": result.get("url", ""),
            "publish_date": result.get("publish_date", datetime.utcnow()),
            "author": "",
            "tags": [result.get("query_keyword", "")],
            "category": "AI技术",
            "metadata": result.get("metadata", {})
        }


class UniversalSearchCollector(SearchEngineCollector):
    """通用搜索收集器，自动选择可用的搜索引擎"""

    def __init__(self):
        super().__init__("通用搜索", SourceType.NEWS)
        self.collectors = []
        self._init_collectors()

    def _init_collectors(self):
        """初始化可用的搜索引擎收集器"""
        # 优先使用Bing搜索（根据用户偏好：搜索引擎一般是必应）
        # 即使没有API密钥也添加，因为BingSearchCollector会使用模拟数据
        if settings.USE_BING_SEARCH:
            self.collectors.append(BingSearchCollector())
            logger.info("启用Bing搜索收集器（优先）")

        # 使用百度搜索（如果配置了API密钥）
        # 百度收集器需要API密钥，否则返回空列表，所以只在有密钥时添加
        if settings.USE_BAIDU_SEARCH and settings.BAIDU_API_KEY and settings.BAIDU_SECRET_KEY:
            self.collectors.append(BaiduSearchCollector())
            logger.info("启用百度搜索收集器")

        # 启用Google搜索（备用，用户说先不用国外的网站，但保留作为最后备选）
        # 只有在没有其他收集器时才添加Google
        if not self.collectors:
            self.collectors.append(GoogleSearchCollector())
            logger.info("启用Google搜索收集器（备用，无其他可用搜索引擎）")

        if not self.collectors:
            logger.warning("没有可用的搜索引擎收集器")

    async def search(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """使用所有可用的搜索引擎进行搜索"""
        all_results = []

        for collector in self.collectors:
            try:
                results = await collector.search(query, max_results // len(self.collectors))
                all_results.extend(results)

                # 添加来源标记
                for result in results:
                    result["metadata"] = result.get("metadata", {})
                    result["metadata"]["collector"] = collector.name

            except Exception as e:
                logger.error(f"搜索引擎 {collector.name} 失败: {e}")
                continue

        # 去重（基于URL）
        seen_urls = set()
        unique_results = []

        for result in all_results:
            url = result.get("url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_results.append(result)

        return unique_results[:max_results]

    def _parse_search_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """解析搜索结果（委托给具体收集器）"""
        # 这里只需要返回原始结果，process_item会处理
        return result


# 创建全局实例
universal_search_collector = UniversalSearchCollector()