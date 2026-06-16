"""
WebSocket 连接管理器 — 管理用户的长连接，用于实时推送通知
"""
import json
import logging
from typing import Optional
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """管理所有 WebSocket 连接"""

    def __init__(self):
        self._connections: dict[str, WebSocket] = {}

    async def connect(self, user_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._connections[user_id] = ws
        logger.info(f"WS 已连接: user={user_id}, 当前连接数={len(self._connections)}")

    def disconnect(self, user_id: str) -> None:
        self._connections.pop(user_id, None)
        logger.info(f"WS 已断开: user={user_id}, 剩余连接数={len(self._connections)}")

    async def send_to_user(self, user_id: str, data: dict) -> bool:
        """向指定用户发送消息，返回是否成功"""
        ws = self._connections.get(user_id)
        if not ws:
            return False
        try:
            await ws.send_json(data)
            return True
        except Exception as e:
            logger.warning(f"WS 发送失败 user={user_id}: {e}")
            self.disconnect(user_id)
            return False

    async def broadcast(self, data: dict) -> int:
        """广播给所有连接的用户，返回成功数"""
        count = 0
        for uid in list(self._connections.keys()):
            ok = await self.send_to_user(uid, data)
            if ok:
                count += 1
        return count

    @property
    def active_count(self) -> int:
        return len(self._connections)

    @property
    def connected_users(self) -> set[str]:
        return set(self._connections.keys())


# 全局单例
ws_manager = ConnectionManager()
