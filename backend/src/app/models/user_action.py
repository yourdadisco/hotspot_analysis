"""
用户-热点交互模型：收藏、忽略等操作
"""
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from ..core.database import Base


class UserHotspotAction(Base):
    """用户对热点的操作状态"""
    __tablename__ = "user_hotspot_actions"
    __table_args__ = (
        UniqueConstraint('user_id', 'hotspot_id', name='uq_user_hotspot_action'),
        Index('idx_user_action_user', 'user_id'),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    hotspot_id = Column(String(36), ForeignKey("hotspots.id", ondelete="CASCADE"), nullable=False, index=True)
    is_favorite = Column(Boolean, default=False, nullable=False)
    is_dismissed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
