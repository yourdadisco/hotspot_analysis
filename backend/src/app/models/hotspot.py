from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON, Integer, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from enum import Enum

from ..core.database import Base, TimestampMixin

class SourceType(str, Enum):
    """信息源类型枚举"""
    NEWS = "news"  # 新闻媒体
    TECH_BLOG = "tech_blog"  # 技术博客
    SOCIAL_MEDIA = "social_media"  # 社交媒体
    ACADEMIC = "academic"  # 学术论文
    OTHER = "other"  # 其他

class Hotspot(Base, TimestampMixin):
    """热点模型"""
    __tablename__ = "hotspots"
    __table_args__ = (
        Index('idx_source_collected', 'source_type', 'collected_at'),
        Index('idx_publish_date', 'publish_date'),
        Index('idx_collected_at', 'collected_at'),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # 基本信息
    title = Column(String(500), nullable=False, index=True)
    summary = Column(Text)
    content_url = Column(String(1000))

    # 来源信息
    source_type = Column(String(50), nullable=False, default=SourceType.NEWS)
    source_name = Column(String(200))
    source_url = Column(String(1000))

    # 时间信息
    publish_date = Column(DateTime(timezone=True), index=True)
    collected_at = Column(DateTime(timezone=True), default=func.now(), index=True)

    # 内容
    raw_content = Column(Text)
    processed_content = Column(JSON)  # 结构化内容

    # 标签和分类
    tags = Column(JSON, default=list)
    category = Column(String(100))

    # 元数据
    language = Column(String(10), default="zh")  # zh, en
    author = Column(String(200))
    raw_metadata = Column(JSON, default=dict)  # 额外元数据

    # 统计信息
    view_count = Column(String(11), default="0")
    like_count = Column(String(11), default="0")
    share_count = Column(String(11), default="0")

    # 关系
    analyses = relationship("HotspotAnalysis", back_populates="hotspot", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Hotspot(id={self.id}, title={self.title[:50]}...)>"

class ImportanceLevel(str, Enum):
    """重要性级别枚举"""
    EMERGENCY = "emergency"  # 紧急
    HIGH = "high"           # 高
    MEDIUM = "medium"       # 中
    LOW = "low"            # 低
    WATCH = "watch"        # 关注

class HotspotAnalysis(Base, TimestampMixin):
    """热点分析模型"""
    __tablename__ = "hotspot_analyses"
    __table_args__ = (
        Index('idx_hotspot_user', 'hotspot_id', 'user_id'),
        Index('idx_user_importance', 'user_id', 'importance_level'),
        Index('idx_analyzed_at', 'analyzed_at'),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # 外键关联
    hotspot_id = Column(String(36), ForeignKey("hotspots.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # 分析结果
    relevance_score = Column(Integer, nullable=False)  # 0-100相关度分数
    importance_level = Column(String(20), nullable=False, default=ImportanceLevel.MEDIUM)

    # 详细分析内容
    business_impact = Column(Text, nullable=False)
    importance_reason = Column(Text, nullable=False)
    action_suggestions = Column(Text)
    technical_details = Column(Text)

    # 分析元数据
    analyzed_at = Column(DateTime(timezone=True), default=func.now())
    model_used = Column(String(100))  # 使用的大模型
    tokens_used = Column(Integer)  # 使用的token数量
    analysis_metadata = Column(JSON, default=dict)  # 分析过程元数据

    # 关系
    hotspot = relationship("Hotspot", back_populates="analyses")
    user = relationship("User", back_populates="hotspot_analyses")

    def __repr__(self):
        return f"<HotspotAnalysis(hotspot_id={self.hotspot_id}, user_id={self.user_id}, level={self.importance_level})>"