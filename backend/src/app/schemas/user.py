from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
import uuid

from app.schemas.base import TimestampSchema, UUIDSchema

# 用户相关Schema

class UserBase(BaseModel):
    """用户基础信息"""
    email: EmailStr
    company_name: Optional[str] = None
    industry: Optional[str] = None
    business_description: Optional[str] = None

class UserCreate(UserBase):
    """创建用户请求"""
    pass

class UserUpdate(BaseModel):
    """更新用户请求"""
    company_name: Optional[str] = None
    industry: Optional[str] = None
    business_description: Optional[str] = None

class UserInDB(UUIDSchema, TimestampSchema, UserBase):
    """数据库中的用户信息"""
    last_login_at: Optional[datetime] = None

class UserResponse(UserInDB):
    """用户响应"""
    pass

# 用户设置相关Schema

class UserSettingsBase(BaseModel):
    """用户设置基础信息"""
    update_schedule: str = "daily_2am"
    notify_on_emergency: str = "Y"
    notify_on_high: str = "Y"
    notify_on_medium: str = "N"
    items_per_page: str = "20"
    default_sort: str = "relevance"
    default_importance_levels: str = "emergency,high,medium"
    default_source_types: str = "news,tech_blog"

class UserSettingsCreate(UserSettingsBase):
    """创建用户设置请求"""
    user_id: uuid.UUID

class UserSettingsUpdate(UserSettingsBase):
    """更新用户设置请求"""
    pass

class UserSettingsInDB(UUIDSchema, TimestampSchema, UserSettingsBase):
    """数据库中的用户设置信息"""
    user_id: uuid.UUID

class UserSettingsResponse(UserSettingsInDB):
    """用户设置响应"""
    pass

# 登录认证相关Schema

class LoginRequest(BaseModel):
    """登录请求"""
    email: EmailStr

class LoginResponse(BaseModel):
    """登录响应"""
    user: UserResponse
    settings: Optional[UserSettingsResponse] = None
    access_token: Optional[str] = None  # 后续可扩展JWT认证