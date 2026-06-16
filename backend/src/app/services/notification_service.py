"""
通知服务 — 采集完成后推送 WebSocket 通知
"""
import logging
from datetime import datetime, timedelta
from sqlalchemy import select, and_

from app.core.database import AsyncSessionLocal
from app.models.hotspot import HotspotAnalysis
from app.models.user import UserSettings
from app.services.ws_manager import ws_manager

logger = logging.getLogger(__name__)


async def push_emergency_notifications():
    """
    采集完成后，查找最近的紧急/高重要性热点，推送给在线用户。
    只推送用户通知设置中已开启的级别。
    """
    if ws_manager.active_count == 0:
        logger.info("无在线用户，跳过 WS 通知推送")
        return

    since = datetime.utcnow() - timedelta(hours=2)

    async with AsyncSessionLocal() as db:
        # 查找 2 小时内新分析的紧急/高热点
        stmt = select(
            HotspotAnalysis.hotspot_id,
            HotspotAnalysis.user_id,
            HotspotAnalysis.importance_level,
        ).where(
            HotspotAnalysis.analyzed_at >= since,
            HotspotAnalysis.importance_level.in_(["emergency", "high"]),
        )
        result = await db.execute(stmt)
        rows = result.all()

    if not rows:
        logger.debug("无新的紧急/高热点，跳过通知")
        return

    # 按用户分组
    user_notifications: dict[str, list[dict]] = {}
    for row in rows:
        uid = str(row.user_id)
        if uid not in user_notifications:
            user_notifications[uid] = []
        user_notifications[uid].append({
            "hotspot_id": str(row.hotspot_id),
            "importance": row.importance_level,
        })

    # 获取用户通知设置
    async with AsyncSessionLocal() as db:
        uids = list(user_notifications.keys())
        settings_stmt = select(UserSettings).where(UserSettings.user_id.in_(uids))
        settings_result = await db.execute(settings_stmt)
        user_settings = {str(s.user_id): s for s in settings_result.scalars().all()}

    # 逐用户推送
    connected = ws_manager.connected_users
    sent_count = 0
    for uid, notifications in user_notifications.items():
        if uid not in connected:
            continue

        settings = user_settings.get(uid)
        if not settings:
            continue

        # 过滤用户未开启的通知级别
        filtered = []
        for n in notifications:
            level = n["importance"]
            if level == "emergency" and settings.notify_on_emergency != "Y":
                continue
            if level == "high" and settings.notify_on_high != "Y":
                continue
            filtered.append(n)

        if not filtered:
            continue

        ok = await ws_manager.send_to_user(uid, {
            "type": "notification",
            "notifications": [{
                "hotspot_id": n["hotspot_id"],
                "importance": n["importance"],
                "count": len(filtered),
            } for n in filtered],
        })
        if ok:
            sent_count += 1

    if sent_count:
        logger.info(f"WS 通知已推送: {sent_count} 个在线用户")
