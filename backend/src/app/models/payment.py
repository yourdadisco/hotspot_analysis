"""
支付订单模型 — 支付宝/微信支付
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Enum as SAEnum
import enum

from ..core.database import Base


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    EXPIRED = "expired"
    REFUNDED = "refunded"


class PaymentMethod(str, enum.Enum):
    ALIPAY = "alipay"
    WECHAT = "wechat"


class PaymentOrder(Base):
    """支付订单"""
    __tablename__ = "payment_orders"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tier = Column(String(20), nullable=False)  # personal / team
    period = Column(String(10), nullable=False)  # monthly / yearly
    amount = Column(Integer, nullable=False)  # 金额（分）
    method = Column(String(20), nullable=True)  # alipay / wechat
    status = Column(String(20), default="pending", nullable=False)
    # 支付平台相关
    trade_no = Column(String(100), nullable=True)  # 平台交易号
    qr_code_url = Column(String(500), nullable=True)  # 支付二维码URL
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
