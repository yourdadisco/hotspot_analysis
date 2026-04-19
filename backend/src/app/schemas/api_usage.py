from datetime import datetime
from typing import Optional, Dict
from pydantic import BaseModel, Field
import uuid
from decimal import Decimal

from app.schemas.base import UUIDSchema

class APIUsageBase(BaseModel):
    """API使用记录基础信息"""
    endpoint: str
    model_used: Optional[str] = None
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    success: bool = True
    error_message: Optional[str] = None
    response_time_ms: int = 0
    request_summary: Optional[str] = None
    response_summary: Optional[str] = None

class APIUsageCreate(APIUsageBase):
    """创建API使用记录请求"""
    user_id: Optional[uuid.UUID] = None
    cost_usd: Decimal = Field(default=Decimal('0'), max_digits=10, decimal_places=6)
    estimated_cost_cny: Decimal = Field(default=Decimal('0'), max_digits=10, decimal_places=4)

class APIUsageInDB(UUIDSchema, APIUsageBase):
    """数据库中的API使用记录信息"""
    user_id: Optional[uuid.UUID] = None
    cost_usd: Decimal
    estimated_cost_cny: Decimal
    requested_at: datetime
    completed_at: Optional[datetime] = None

class APIUsageResponse(APIUsageInDB):
    """API使用记录响应"""
    pass

class APIUsageStats(BaseModel):
    """API使用统计"""
    total_requests: int
    successful_requests: int
    failed_requests: int
    total_tokens: int
    total_cost_usd: Decimal
    total_cost_cny: Decimal
    avg_response_time_ms: float
    by_endpoint: Dict[str, int]  # endpoint -> count
    by_model: Dict[str, int]     # model -> count
    by_user: Dict[str, int]      # user_id -> count