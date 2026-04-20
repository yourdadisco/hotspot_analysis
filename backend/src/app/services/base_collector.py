"""
收集器基类模块
提供所有收集器的基类定义，避免循环导入
"""

import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any
from datetime import datetime

from app.models.hotspot import SourceType

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