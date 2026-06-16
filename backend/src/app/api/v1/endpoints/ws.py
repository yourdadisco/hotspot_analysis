"""
WebSocket 端点 — 实时推送热点通知
"""
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.ws_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(ws: WebSocket, user_id: str):
    """用户 WebSocket 长连接，用于接收实时通知"""
    await ws_manager.connect(user_id, ws)
    try:
        # 保持连接，等待客户端断开
        while True:
            # 可以接收客户端的 ping 保持连接
            data = await ws.receive_text()
            if data == "ping":
                await ws.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id)
    except Exception as e:
        logger.warning(f"WS 异常断开 user={user_id}: {e}")
        ws_manager.disconnect(user_id)
