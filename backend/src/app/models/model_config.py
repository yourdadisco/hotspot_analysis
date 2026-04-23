from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
import uuid

from ..core.database import Base, TimestampMixin


class UserModelConfig(Base, TimestampMixin):
    """用户模型配置 - 每用户自己的LLM API配置"""
    __tablename__ = "user_model_configs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    provider = Column(String(50), default="deepseek")  # deepseek, openai, openai_compatible
    api_key = Column(String(500), nullable=False, default="")
    api_base_url = Column(String(500), default="https://api.deepseek.com")
    model_name = Column(String(100), default="deepseek-chat")
    is_active = Column(String(1), default="Y")  # Y/N

    # 关系
    user = relationship("User", back_populates="model_config")

    def __repr__(self):
        return f"<UserModelConfig(user_id={self.user_id}, provider={self.provider})>"
