from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional
import uuid

class BaseSchema(BaseModel):
    """基础Schema类"""
    model_config = ConfigDict(from_attributes=True)

class TimestampSchema(BaseSchema):
    """包含时间戳的Schema"""
    created_at: datetime
    updated_at: datetime

class UUIDSchema(BaseSchema):
    """包含UUID的Schema"""
    id: uuid.UUID

class PaginationParams(BaseModel):
    """分页参数"""
    page: int = 1
    limit: int = 20
    sort_by: str = "created_at"
    sort_order: str = "desc"

class PaginatedResponse(BaseModel):
    """分页响应"""
    items: list
    total: int
    page: int
    limit: int
    total_pages: int