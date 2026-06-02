import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, RefreshCw } from 'lucide-react'
import { collectionApi } from '../services/api'
import { useProgressPolling } from '../hooks/useProgressPolling'
import ProgressOverlay from './ProgressOverlay'

interface Props {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

type UpdateMode = 'range' | 'last'

const ManualUpdateModal: React.FC<Props> = ({ isOpen, onClose, onComplete }) => {
  const [mode, setMode] = useState<UpdateMode>('last')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [dateError, setDateError] = useState('')

  const [taskId, setTaskId] = useState<string | null>(null)
  const [showProgress, setShowProgress] = useState(false)
  const { state: progress, reset: resetProgress } = useProgressPolling(taskId, (tid) => collectionApi.getProgress(tid))

  const { data: lastUpdateData } = useQuery({
    queryKey: ['last-update'],
    queryFn: () => collectionApi.getLastUpdate(),
    enabled: isOpen,
    staleTime: 30000,
  })

  useEffect(() => {
    if (isOpen) {
      setMode('last'); setDateError(''); setTaskId(null); setShowProgress(false)
      const lu = lastUpdateData?.last_update
      const from = lu ? new Date(lu) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      setDateFrom(isNaN(from.getTime()) ? '' : from.toISOString().slice(0, 10))
      setDateTo(new Date().toISOString().slice(0, 10))
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const lu = lastUpdateData?.last_update
    const from = lu ? new Date(lu) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    setDateFrom(isNaN(from.getTime()) ? '' : from.toISOString().slice(0, 10))
    setDateTo(new Date().toISOString().slice(0, 10))
  }, [lastUpdateData, isOpen])

  useEffect(() => {
    if (!progress) return
    if (progress.status === 'completed') {
      setShowProgress(false); setTaskId(null); resetProgress()
      onComplete(); onClose()
    } else if (progress.status === 'failed') {
      setShowProgress(false); setTaskId(null); resetProgress()
    }
  }, [progress?.status])

  const validate = (from: string, to: string): boolean => {
    if (!from || !to) { setDateError('请选择开始和结束日期'); return false }
    const d1 = new Date(from); const d2 = new Date(to)
    if (d2 < d1) { setDateError('结束日期不能早于开始日期'); return false }
    if ((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24) > 31) { setDateError('日期区间不能超过31天'); return false }
    setDateError(''); return true
  }

  const handleStart = async () => {
    if (mode === 'range' && !validate(dateFrom, dateTo)) return
    if (mode === 'last' && !validate(dateFrom, dateTo)) return
    try {
      const result = await collectionApi.triggerManualRefresh(dateFrom || undefined, dateTo || undefined)
      setTaskId(result.task_id); setShowProgress(true)
    } catch { setDateError('启动更新失败，请稍后重试') }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 modal-overlay" onClick={onClose} />
        <div className="relative p-5 w-full max-w-sm mx-4 shadow-cushion rounded-xl"
          style={{ backgroundColor: '#1E1E24', border: '1px solid rgba(255,255,255,0.10)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">手动更新热点</h3>
            <button onClick={onClose} className="p-1 rounded-lg transition-colors" style={{ color: '#6B7280' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <X size={18} />
            </button>
          </div>

          <div className="mb-4 space-y-2">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg transition-all"
              style={{ backgroundColor: mode === 'last' ? 'rgba(255,99,99,0.10)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <input type="radio" name="um" checked={mode === 'last'} onChange={() => setMode('last')}
                style={{ accentColor: '#FF6363' }} />
              <div>
                <span className="text-sm font-medium text-white">从最近更新开始</span>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{dateFrom ? `最近更新: ${dateFrom}` : ''}</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg transition-all"
              style={{ backgroundColor: mode === 'range' ? 'rgba(255,99,99,0.10)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <input type="radio" name="um" checked={mode === 'range'} onChange={() => setMode('range')}
                style={{ accentColor: '#FF6363' }} />
              <span className="text-sm font-medium text-white">指定日期区间</span>
            </label>
          </div>

          {mode === 'range' && (
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-2" style={{ color: '#6B7280' }}>发布日期区间（最多31天）</label>
              <div className="flex items-center gap-3">
                <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setDateError('') }} className="input flex-1 py-2" />
                <span className="text-xs" style={{ color: '#6B7280' }}>至</span>
                <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setDateError('') }} className="input flex-1 py-2" />
              </div>
            </div>
          )}

          {dateError && <p className="text-xs mb-3" style={{ color: '#FF6363' }}>{dateError}</p>}

          <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
            <button onClick={onClose} className="btn-secondary text-sm">取消</button>
            <button onClick={handleStart} className="btn-primary text-sm flex items-center gap-2">
              <RefreshCw size={14} /><span>开始更新</span>
            </button>
          </div>
        </div>
      </div>
      {showProgress && progress && (
        <ProgressOverlay isOpen={true} title="手动更新热点" progress={progress.progress}
          currentStep={progress.currentStep} steps={progress.steps}
          status={progress.status === 'pending' ? 'running' : progress.status}
          error={progress.error}
          onClose={() => { setShowProgress(false); setTaskId(null); resetProgress() }} />
      )}
    </>
  )
}

export default ManualUpdateModal
