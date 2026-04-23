import { useState, useEffect, useRef, useCallback } from 'react'

export interface ProgressState {
  taskId: string
  taskType: string
  title: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  currentStep: string
  steps: string[]
  error?: string
}

export function useProgressPolling(
  taskId: string | null,
  fetchProgress: (taskId: string) => Promise<any>,
  interval: number = 1000
) {
  const [state, setState] = useState<ProgressState | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (!taskId) {
      setState(null)
      setIsPolling(false)
      return
    }

    cancelledRef.current = false
    setIsPolling(true)

    const poll = async () => {
      if (cancelledRef.current) return
      try {
        const data = await fetchProgress(taskId)
        if (cancelledRef.current) return
        setState({
          taskId: data.task_id,
          taskType: data.task_type,
          title: data.title,
          status: data.status,
          progress: data.progress,
          currentStep: data.current_step,
          steps: data.steps || [],
          error: data.error,
        })
        if (data.status === 'completed' || data.status === 'failed') {
          setIsPolling(false)
          return
        }
      } catch {
        if (!cancelledRef.current) {
          setState((prev) =>
            prev
              ? { ...prev, status: 'failed', error: '获取进度失败，请刷新页面重试' }
              : null
          )
          setIsPolling(false)
        }
      }
    }

    // 首次立即执行
    poll()

    const timer = setInterval(poll, interval)
    return () => {
      cancelledRef.current = true
      clearInterval(timer)
    }
  }, [taskId, fetchProgress, interval])

  const reset = useCallback(() => {
    setState(null)
    setIsPolling(false)
  }, [])

  return { state, isPolling, reset }
}
