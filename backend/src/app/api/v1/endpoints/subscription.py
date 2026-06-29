"""
订阅管理 API
"""
import logging
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.subscription import UserSubscription, SubscriptionTier, SubscriptionStatus
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()

TIER_LABELS: dict[str, dict] = {
    "free": {"label": "免费版", "daily_limit": 30, "history_days": 3},
    "personal": {"label": "个人专业版", "daily_limit": 9999, "history_days": 365},
    "team": {"label": "团队版", "daily_limit": 9999, "history_days": 365},
}


async def _get_or_create_subscription(db: AsyncSession, user_id: str) -> UserSubscription:
    """获取用户订阅，不存在则创建免费版"""
    stmt = select(UserSubscription).where(UserSubscription.user_id == user_id)
    result = await db.execute(stmt)
    sub = result.scalar_one_or_none()
    if not sub:
        sub = UserSubscription(user_id=user_id, tier="free", status="active",
                               hotspots_quota_daily=30, current_period_start=datetime.utcnow())
        db.add(sub)
        await db.commit()
        await db.refresh(sub)
    return sub


@router.get("/subscription")
async def get_subscription(
    user_id: str = Query(..., description="用户ID"),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户的订阅信息"""
    sub = await _get_or_create_subscription(db, user_id)
    info = TIER_LABELS.get(sub.tier, TIER_LABELS["free"])
    return {
        "tier": sub.tier,
        "label": info["label"],
        "status": sub.status,
        "daily_limit": info["daily_limit"],
        "history_days": info["history_days"],
        "used_today": sub.hotspots_used_today,
        "period_start": sub.current_period_start.isoformat() if sub.current_period_start else None,
        "period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
        "cancel_at_period_end": sub.cancel_at_period_end,
        "team_seats": sub.team_seats,
    }


@router.post("/subscription/upgrade")
async def upgrade_subscription(
    user_id: str = Query(...),
    tier: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """升级套餐（暂为手动处理，不涉及支付）"""
    if tier not in ("personal", "team"):
        raise HTTPException(status_code=400, detail="无效的套餐")
    sub = await _get_or_create_subscription(db, user_id)
    sub.tier = tier
    sub.hotspots_quota_daily = 9999
    sub.current_period_start = datetime.utcnow()
    sub.status = "active"
    await db.commit()
    return {"success": True, "tier": tier}


@router.post("/subscription/downgrade")
async def downgrade_subscription(
    user_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """降级回免费版"""
    sub = await _get_or_create_subscription(db, user_id)
    sub.tier = "free"
    sub.hotspots_quota_daily = 30
    sub.hotspots_used_today = 0
    await db.commit()
    return {"success": True, "tier": "free"}
