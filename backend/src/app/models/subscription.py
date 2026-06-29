"""
订阅模型 — 三层付费体系
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, DateTime, Date, ForeignKey, Enum as SAEnum
import enum

from ..core.database import Base


class SubscriptionTier(str, enum.Enum):
    FREE = "free"
    PERSONAL = "personal"
    TEAM = "team"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    TRIAL = "trial"


class UserSubscription(Base):
    """用户订阅记录"""
    __tablename__ = "user_subscriptions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    tier = Column(String(20), default="free", nullable=False)
    status = Column(String(20), default="active", nullable=False)
    current_period_start = Column(DateTime, default=datetime.utcnow)
    current_period_end = Column(DateTime, nullable=True)
    cancel_at_period_end = Column(Boolean, default=False)
    team_seats = Column(Integer, default=1)
    # 免费版每日配额
    hotspots_quota_daily = Column(Integer, default=30)
    hotspots_used_today = Column(Integer, default=0)
    quota_reset_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
