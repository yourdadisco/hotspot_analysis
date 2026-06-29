"""
支付 API — 支付宝/微信支付
"""
import logging
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.payment import PaymentOrder
from app.models.subscription import UserSubscription

logger = logging.getLogger(__name__)

router = APIRouter()

# 套餐定价（分）
PRICES = {
    "personal_monthly": 2900,
    "personal_yearly": 29900,
    "team_monthly": 19900,
    "team_yearly": 199900,
}


@router.post("/payment/create")
async def create_payment(
    user_id: str = Query(...),
    tier: str = Query(...),
    period: str = Query("monthly"),
    method: str = Query("alipay"),
    db: AsyncSession = Depends(get_db),
):
    """创建支付订单（模拟）"""
    key = f"{tier}_{period}"
    amount = PRICES.get(key)
    if not amount:
        raise HTTPException(status_code=400, detail="无效的套餐或周期")

    order = PaymentOrder(
        user_id=user_id,
        tier=tier,
        period=period,
        amount=amount,
        method=method,
        status="pending",
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)

    # 模拟支付二维码（实际接入时替换为支付平台API）
    qr_data = f"alipay://pay?order_id={order.id}&amount={amount}" if method == "alipay" else f"weixin://pay?order_id={order.id}&amount={amount}"

    return {
        "order_id": order.id,
        "amount": amount,
        "amount_yuan": amount / 100,
        "method": method,
        "status": "pending",
        "qr_code": qr_data,
    }


@router.post("/payment/verify")
async def verify_payment(
    order_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """验证支付状态（模拟——直接标记为已支付）"""
    stmt = select(PaymentOrder).where(PaymentOrder.id == order_id)
    result = await db.execute(stmt)
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    # 模拟：标记为已支付
    order.status = "paid"
    order.paid_at = datetime.utcnow()
    await db.commit()

    # 升级订阅
    stmt = select(UserSubscription).where(UserSubscription.user_id == order.user_id)
    result = await db.execute(stmt)
    sub = result.scalar_one_or_none()
    if sub:
        sub.tier = order.tier
        sub.status = "active"
        sub.hotspots_quota_daily = 9999
        await db.commit()

    return {"success": True, "tier": order.tier, "order_id": order.id}


@router.get("/payment/orders")
async def get_orders(
    user_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """获取用户的历史订单"""
    stmt = select(PaymentOrder).where(PaymentOrder.user_id == user_id).order_by(PaymentOrder.created_at.desc()).limit(20)
    result = await db.execute(stmt)
    orders = result.scalars().all()
    return {
        "orders": [
            {
                "id": o.id,
                "tier": o.tier,
                "period": o.period,
                "amount_yuan": o.amount / 100,
                "method": o.method,
                "status": o.status,
                "paid_at": o.paid_at.isoformat() if o.paid_at else None,
                "created_at": o.created_at.isoformat() if o.created_at else None,
            }
            for o in orders
        ]
    }
