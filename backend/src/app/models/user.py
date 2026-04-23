from sqlalchemy import Column, String, Text, DateTime, UUID, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from ..core.database import Base, TimestampMixin

class User(Base, TimestampMixin):
    """用户模型"""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    company_name = Column(String(255))
    industry = Column(String(100))
    business_description = Column(Text)
    last_login_at = Column(DateTime(timezone=True))

    # 关系
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    model_config = relationship("UserModelConfig", back_populates="user", uselist=False, cascade="all, delete-orphan")
    hotspot_analyses = relationship("HotspotAnalysis", back_populates="user", cascade="all, delete-orphan")
    api_usage_records = relationship("APIUsage", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, company={self.company_name})>"

class UserSettings(Base, TimestampMixin):
    """用户设置模型"""
    __tablename__ = "user_settings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # 更新计划配置
    update_schedule = Column(String(50), default="daily_2am")  # daily_2am, weekly_monday, manual

    # 通知偏好
    notify_on_emergency = Column(String(1), default="Y")  # Y/N
    notify_on_high = Column(String(1), default="Y")
    notify_on_medium = Column(String(1), default="N")

    # 显示偏好
    items_per_page = Column(String(2), default="20")  # 10, 20, 50
    default_sort = Column(String(20), default="relevance")  # relevance, importance, date

    # 筛选偏好
    default_importance_levels = Column(String(100), default="emergency,high,medium")  # 逗号分隔
    default_source_types = Column(String(100), default="news,tech_blog")  # 逗号分隔

    # 关系
    user = relationship("User", back_populates="settings")

    def __repr__(self):
        return f"<UserSettings(user_id={self.user_id})>"