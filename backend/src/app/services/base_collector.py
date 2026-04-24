"""
收集器基类模块
提供所有收集器的基类定义，避免循环导入
"""

import logging
import re
from abc import ABC, abstractmethod
from typing import List, Dict, Any
from datetime import datetime

from app.models.hotspot import SourceType

logger = logging.getLogger(__name__)


def clean_html_content(html: str) -> str:
    """将HTML内容转为可读文本：解码实体、添加换行、去标签"""
    if not html:
        return ""

    text = html
    # 块级结束标签后加换行
    text = re.sub(r'<\/(p|div|h[1-6]|li|blockquote|tr|table|dl|ol|ul)>', '\n', text, flags=re.IGNORECASE)
    # 换行标签替换
    text = re.sub(r'<br\s*\/?>', '\n', text, flags=re.IGNORECASE)
    # 列表项前加换行
    text = re.sub(r'<li[^>]*>', '\n', text, flags=re.IGNORECASE)
    # 块级标签前加换行
    text = re.sub(r'<(p|div|h[1-6]|blockquote)[^>]*>', '\n', text, flags=re.IGNORECASE)

    # HTML实体映射
    entities = {
        '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
        '&middot;': '·', '&bull;': '•', '&ldquo;': '“', '&rdquo;': '”',
        '&lsquo;': '‘', '&rsquo;': '’',
        '&mdash;': '—', '&ndash;': '–', '&hellip;': '…', '&nbsp;': ' ',
        '&laquo;': '«', '&raquo;': '»', '&copy;': '©', '&reg;': '®',
        '&trade;': '™', '&deg;': '°', '&plusmn;': '±', '&times;': '×', '&divide;': '÷',
    }
    for entity, char in entities.items():
        text = text.replace(entity, char)

    # 数字实体
    text = re.sub(r'&#(\d+);', lambda m: chr(int(m.group(1))), text)

    # 移除剩余HTML标签
    text = re.sub(r'<[^>]*>', '', text)

    # 合并多余空行
    text = re.sub(r'\n{3,}', '\n\n', text)

    # 逐行trim
    text = '\n'.join(line.strip() for line in text.split('\n'))

    return text.strip()


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

        # 清洗HTML内容：解码实体、添加换行
        if processed.get("content"):
            processed["content"] = clean_html_content(processed["content"])
        if processed.get("summary"):
            processed["summary"] = clean_html_content(processed["summary"])

        return processed