from sqlalchemy import Column, String, Integer, Boolean, DateTime, UUID, ForeignKey, Numeric, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from ..core.database import Base

class APIUsage(Base):
    """API使用记录模型"""
    __tablename__ = "api_usage"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # 用户关联（可为空，记录系统任务使用）
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # API调用信息
    endpoint = Column(String(200), nullable=False)
    model_used = Column(String(100))
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)

    # 成本信息
    cost_usd = Column(Numeric(10, 6), default=0)  # 成本（美元）
    estimated_cost_cny = Column(Numeric(10, 4), default=0)  # 估计人民币成本

    # 性能信息
    response_time_ms = Column(Integer, default=0)  # 响应时间（毫秒）
    success = Column(Boolean, default=True)
    error_message = Column(Text)

    # 时间戳
    requested_at = Column(DateTime(timezone=True), default=func.now(), index=True)
    completed_at = Column(DateTime(timezone=True))

    # 请求和响应摘要（不存储完整内容以保护隐私）
    request_summary = Column(String(500))
    response_summary = Column(String(500))

    # 关系
    user = relationship("User", back_populates="api_usage_records")

    def __repr__(self):
        status = "success" if self.success else "failed"
        return f"<APIUsage(id={self.id}, endpoint={self.endpoint}, status={status}, cost={self.cost_usd})>"