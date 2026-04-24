from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
import uuid
from enum import Enum

from app.schemas.base import TimestampSchema, UUIDSchema

# 枚举类型

class SourceType(str, Enum):
    NEWS = "news"
    TECH_BLOG = "tech_blog"
    SOCIAL_MEDIA = "social_media"
    ACADEMIC = "academic"
    OTHER = "other"

class ImportanceLevel(str, Enum):
    EMERGENCY = "emergency"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    WATCH = "watch"

# 热点相关Schema

class HotspotBase(BaseModel):
    """热点基础信息"""
    title: str = Field(..., max_length=500)
    summary: Optional[str] = None
    content_url: Optional[str] = None
    source_type: SourceType = SourceType.NEWS
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    publish_date: Optional[datetime] = None
    language: str = "zh"
    author: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    category: Optional[str] = None

class HotspotCreate(HotspotBase):
    """创建热点请求"""
    raw_content: Optional[str] = None
    processed_content: Optional[Dict[str, Any]] = None
    raw_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class HotspotUpdate(BaseModel):
    """更新热点请求"""
    summary: Optional[str] = None
    processed_content: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    category: Optional[str] = None
    raw_metadata: Optional[Dict[str, Any]] = None

class HotspotInDB(UUIDSchema, TimestampSchema, HotspotBase):
    """数据库中的热点信息"""
    model_config = ConfigDict(exclude=["metadata"])
    raw_content: Optional[str] = None
    processed_content: Optional[Dict[str, Any]] = None
    raw_metadata: Dict[str, Any] = Field(default_factory=dict)
    view_count: str = "0"
    like_count: str = "0"
    share_count: str = "0"
    collected_at: datetime

class HotspotResponse(HotspotInDB):
    """热点响应"""
    pass

# 热点分析相关Schema

class HotspotAnalysisBase(BaseModel):
    """热点分析基础信息"""
    model_config = ConfigDict(protected_namespaces=())
    relevance_score: int = Field(..., ge=0, le=100)
    importance_level: ImportanceLevel = ImportanceLevel.MEDIUM
    business_impact: str
    importance_reason: str
    action_suggestions: Optional[str] = None
    technical_details: Optional[str] = None

class HotspotAnalysisCreate(HotspotAnalysisBase):
    """创建热点分析请求"""
    hotspot_id: uuid.UUID
    user_id: uuid.UUID
    model_used: Optional[str] = None
    tokens_used: Optional[int] = None
    analysis_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class HotspotAnalysisUpdate(BaseModel):
    """更新热点分析请求"""
    relevance_score: Optional[int] = Field(None, ge=0, le=100)
    importance_level: Optional[ImportanceLevel] = None
    business_impact: Optional[str] = None
    importance_reason: Optional[str] = None
    action_suggestions: Optional[str] = None
    technical_details: Optional[str] = None

class HotspotAnalysisInDB(UUIDSchema, TimestampSchema, HotspotAnalysisBase):
    """数据库中的热点分析信息"""
    model_config = ConfigDict(exclude=["metadata"])
    hotspot_id: uuid.UUID
    user_id: uuid.UUID
    model_used: Optional[str] = None
    tokens_used: Optional[int] = None
    analysis_metadata: Dict[str, Any] = Field(default_factory=dict)
    analyzed_at: datetime

class HotspotAnalysisResponse(HotspotAnalysisInDB):
    """热点分析响应"""
    pass

# 热点查询相关Schema

class HotspotFilterParams(BaseModel):
    """热点筛选参数"""
    importance_levels: Optional[List[ImportanceLevel]] = None
    source_types: Optional[List[SourceType]] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    tags: Optional[List[str]] = None
    category: Optional[str] = None
    search_query: Optional[str] = None

class HotspotQueryParams(HotspotFilterParams):
    """热点查询参数（包含分页）"""
    page: int = 1
    limit: int = 20
    sort_by: str = "relevance"  # relevance, importance, date, collected_at
    sort_order: str = "desc"

# 完整热点响应（包含分析）

class HotspotWithAnalysisResponse(HotspotResponse):
    """热点响应（包含分析）"""
    analysis: Optional[HotspotAnalysisResponse] = None


# 批量操作 Schema

class BatchDismissRequest(BaseModel):
    """批量忽略请求"""
    user_id: str
    importance_levels: Optional[List[str]] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    is_favorite: Optional[bool] = None