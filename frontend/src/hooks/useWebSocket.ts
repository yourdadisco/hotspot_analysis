import { useEffect, useRef, useCallback } from 'react'

type MessageHandler = (data: any) => void

/**
 * WebSocket hook — 连接后端 ws 端点，接收实时通知
 * 自动重连，组件卸载时断开
 */
export function useWebSocket(userId: string | null, onMessage: MessageHandler) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>()
  const onMessageRef = useRef<MessageHandler>(onMessage)
  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    if (!userId) return

    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://'
    const host = import.meta.env.VITE_API_BASE_URL
      ? import.meta.env.VITE_API_BASE_URL.replace(/^https?:\/\//, '').replace(/\/api\/v1\/?$/, '')
      : window.location.host
    const url = `${protocol}${host}/ws/${userId}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      console.debug('[WS] 已连接')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessageRef.current(data)
      } catch { /* ignore parse errors */ }
    }

    ws.onclose = () => {
      console.debug('[WS] 已断开，5 秒后重连')
      wsRef.current = null
      reconnectTimer.current = setTimeout(connect, 5000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [userId])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        wsRef.current.onclose = null // 阻止重连
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  /** 发送 ping 保持连接 */
  const ping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send('ping')
    }
  }, [])

  return { ping }
}
