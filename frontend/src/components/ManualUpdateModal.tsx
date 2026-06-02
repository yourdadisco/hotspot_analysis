import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, RefreshCw } from 'lucide-react'
import { collectionApi } from '../services/api'
import { useProgressPolling } from '../hooks/useProgressPolling'
import ProgressOverlay from './ProgressOverlay'

interface ManualUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

type UpdateMode = 'range' | 'last'

const ManualUpdateModal: React.FC<ManualUpdateModalProps> = ({ isOpen, onClose, onComplete }) => {
  const [mode, setMode] = useState<UpdateMode>('last')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [dateError, setDateError] = useState('')

  // 进度跟踪
  const [taskId, setTaskId] = useState<string | null>(null)
  const [showProgress, setShowProgress] = useState(false)
  const { state: progress, reset: resetProgress } = useProgressPolling(
    taskId,
    (tid) => collectionApi.getProgress(tid)
  )

  // 获取最近更新时间，没有则默认7天前
  const { data: lastUpdateData } = useQuery({
    queryKey: ['last-update'],
    queryFn: () => collectionApi.getLastUpdate(),
    enabled: isOpen,
    staleTime: 30000,
  })

  // 重置状态
  useEffect(() => {
    if (isOpen) {
      setMode('last')
      setDateError('')
      setTaskId(null)
      setShowProgress(false)

      const lastUpdate = lastUpdateData?.last_update
      const from = lastUpdate
        ? new Date(lastUpdate)
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      setDateFrom(isNaN(from.getTime()) ? '' : from.toISOString().slice(0, 10))
      setDateTo(new Date().toISOString().slice(0, 10))
    }
  }, [isOpen])

  // 外部数据加载后更新日期
  useEffect(() => {
    if (!isOpen) return
    const lastUpdate = lastUpdateData?.last_update
    const from = lastUpdate
      ? new Date(lastUpdate)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    setDateFrom(isNaN(from.getTime()) ? '' : from.toISOString().slice(0, 10))
    setDateTo(new Date().toISOString().slice(0, 10))
  }, [lastUpdateData, isOpen])

  // 进度完成/失败处理
  useEffect(() => {
    if (!progress) return
    if (progress.status === 'completed') {
      setShowProgress(false)
      setTaskId(null)
      resetProgress()
      onComplete()
      onClose()
    } else if (progress.status === 'failed') {
      setShowProgress(false)
      setTaskId(null)
      resetProgress()
    }
  }, [progress?.status])

  const validateDates = (from: string, to: string): boolean => {
    if (!from || !to) {
      setDateError('请选择开始和结束日期')
      return false
    }
    const d1 = new Date(from)
    const d2 = new Date(to)
    if (d2 < d1) {
      setDateError('结束日期不能早于开始日期')
      return false
    }
    const diffDays = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays > 31) {
      setDateError('日期区间不能超过31天')
      return false
    }
    setDateError('')
    return true
  }

  const handleStart = async () => {
    if (mode === 'range' && !validateDates(dateFrom, dateTo)) return
    if (mode === 'last' && !validateDates(dateFrom, dateTo)) return

    try {
      const result = await collectionApi.triggerManualRefresh(
        dateFrom || undefined,
        dateTo || undefined
      )
      setTaskId(result.task_id)
      setShowProgress(true)
    } catch {
      setDateError('启动更新失败，请稍后重试')
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0" style={{ backgroundColor: 'rgba(26, 35, 50, 0.5)' }} onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-modal p-5 w-full max-w-sm mx-4" style={{ border: '1px solid #D8D2C2' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold" style={{ color: '#1B1B1A' }}>手动更新热点</h3>
            <button onClick={onClose} className="p-1 rounded-md transition-colors" style={{ color: '#5E6680' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F4F1EA'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
              <X size={18} />
            </button>
          </div>

          {/* 更新模式 */}
          <div className="mb-4 space-y-2">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-md transition-colors"
              style={{
                border: '1px solid #D8D2C2',
                backgroundColor: mode === 'last' ? '#FEF7E6' : '#FFFFFF'
              }}
              onMouseEnter={(e) => { if (mode !== 'last') e.currentTarget.style.backgroundColor = '#F4F1EA' }}
              onMouseLeave={(e) => { if (mode !== 'last') e.currentTarget.style.backgroundColor = '#FFFFFF' }}>
              <input
                type="radio"
                name="updateMode"
                checked={mode === 'last'}
                onChange={() => setMode('last')}
                style={{ accentColor: '#F5A623' }}
              />
              <div>
                <span className="text-sm font-medium" style={{ color: '#1B1B1A' }}>从最近更新开始</span>
                <p className="text-xs mt-0.5" style={{ color: '#8B95B0' }}>
                  {dateFrom ? `最近更新: ${dateFrom}` : ''}
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-md transition-colors"
              style={{
                border: '1px solid #D8D2C2',
                backgroundColor: mode === 'range' ? '#FEF7E6' : '#FFFFFF'
              }}
              onMouseEnter={(e) => { if (mode !== 'range') e.currentTarget.style.backgroundColor = '#F4F1EA' }}
              onMouseLeave={(e) => { if (mode !== 'range') e.currentTarget.style.backgroundColor = '#FFFFFF' }}>
              <input
                type="radio"
                name="updateMode"
                checked={mode === 'range'}
                onChange={() => setMode('range')}
                style={{ accentColor: '#F5A623' }}
              />
              <span className="text-sm font-medium" style={{ color: '#1B1B1A' }}>指定日期区间</span>
            </label>
          </div>

          {/* 日期选择 */}
          {mode === 'range' && (
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-2" style={{ color: '#5E6680' }}>发布日期区间（最多31天）</label>
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setDateError('') }}
                  className="input flex-1 py-2"
                />
                <span className="text-xs" style={{ color: '#8B95B0' }}>至</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setDateError('') }}
                  className="input flex-1 py-2"
                />
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {dateError && (
            <p className="text-xs mb-3" style={{ color: '#F23645' }}>{dateError}</p>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid #D8D2C2' }}>
            <button onClick={onClose} className="btn-secondary text-sm">
              取消
            </button>
            <button onClick={handleStart} className="btn-primary text-sm flex items-center gap-2">
              <RefreshCw size={14} />
              <span>开始更新</span>
            </button>
          </div>
        </div>
      </div>

      {/* 进度覆盖层 */}
      {showProgress && progress && (
        <ProgressOverlay
          isOpen={true}
          title="手动更新热点"
          progress={progress.progress}
          currentStep={progress.currentStep}
          steps={progress.steps}
          status={progress.status === 'pending' ? 'running' : progress.status}
          error={progress.error}
          onClose={() => {
            setShowProgress(false)
            setTaskId(null)
            resetProgress()
          }}
        />
      )}
    </>
  )
}

export default ManualUpdateModal
