import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Zap, Settings, Cpu, Calendar, RefreshCw, ChevronRight
} from 'lucide-react'
import { collectionApi, modelConfigApi } from '../services/api'

interface Props {
  userId: string
  onAnalysisComplete: () => void
}

const QuickAnalysisPanel: React.FC<Props> = ({ userId, onAnalysisComplete }) => {
  const [mode, setMode] = useState<'last' | 'range'>('last')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 业务配置状态
  const { data: userData } = useQuery({
    queryKey: ['user-profile-check'],
    queryFn: async () => {
      const { authApi } = await import('../services/api')
      return authApi.getUser(userId) as any
    },
  })

  // 模型配置状态
  const { data: modelData } = useQuery({
    queryKey: ['model-check'],
    queryFn: () => modelConfigApi.getConfig(userId) as Promise<any>,
  })

  // 最近更新时间
  const { data: lastUpdateData } = useQuery({
    queryKey: ['last-update-check'],
    queryFn: () => collectionApi.getLastUpdate(),
  })

  const user: any = userData || {}
  const model: any = modelData || {}
  const lastUpdate = lastUpdateData?.last_update
  const defaultFrom = lastUpdate
    ? new Date(lastUpdate).toISOString().slice(0, 10)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const defaultTo = new Date().toISOString().slice(0, 10)

  const hasBusiness = !!(user.company_name && user.business_description)
  const hasApiKey = !!(model.api_key)
  const cfgReady = hasBusiness && hasApiKey
  const statusColor = cfgReady ? '#22C55E' : '#F59E0B'
  const statusText = cfgReady ? '就绪' : '未完成'

  const handleStart = async () => {
    if (!cfgReady) {
      setError('请先完成业务配置和模型配置')
      return
    }
    setLoading(true)
    setError('')
    try {
      const df = mode === 'last' ? defaultFrom : dateFrom
      const dt = mode === 'last' ? defaultTo : dateTo
      await collectionApi.triggerManualRefresh(
        df || undefined,
        dt || undefined
      )
      onAnalysisComplete()
    } catch {
      setError('启动失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-amber-500" />
          <span className="text-sm font-semibold text-gray-900">快速分析</span>
        </div>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: cfgReady ? '#ECFDF5' : '#FEF3C7', color: statusColor }}>
          {statusText}
        </span>
      </div>

      {/* 状态行 */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Settings size={13} className={hasBusiness ? 'text-green-500' : 'text-gray-300'} />
            <span className="text-gray-600">业务配置</span>
          </div>
          {hasBusiness ? (
            <span className="text-green-600 font-medium">{user.company_name}</span>
          ) : (
            <a href="/business" className="text-blue-500 hover:underline flex items-center gap-0.5">
              去配置 <ChevronRight size={12} />
            </a>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Cpu size={13} className={hasApiKey ? 'text-green-500' : 'text-gray-300'} />
            <span className="text-gray-600">模型配置</span>
          </div>
          {hasApiKey ? (
            <span className="text-green-600 font-medium">{model.provider || '已配置'}</span>
          ) : (
            <a href="/model-config" className="text-blue-500 hover:underline flex items-center gap-0.5">
              去配置 <ChevronRight size={12} />
            </a>
          )}
        </div>
      </div>

      {/* 日期选择 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <Calendar size={13} className="text-gray-400" />
          <span className="text-gray-600 font-medium">日期范围</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMode('last')}
            className={`px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors ${
              mode === 'last' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            最近更新
          </button>
          <button onClick={() => setMode('range')}
            className={`px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors ${
              mode === 'range' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            自定义
          </button>
          {mode === 'range' && (
            <div className="flex items-center gap-1.5 flex-1">
              <input type="date" value={dateFrom || defaultFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md" />
              <span className="text-gray-400">~</span>
              <input type="date" value={dateTo || defaultTo}
                onChange={e => setDateTo(e.target.value)}
                className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md" />
            </div>
          )}
        </div>
      </div>

      {/* 分析按钮 */}
      <button onClick={handleStart} disabled={loading}
        className="w-full py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2"
        style={{
          backgroundColor: cfgReady ? '#2563EB' : '#9CA3AF',
          color: '#FFFFFF',
        }}>
        {loading ? (
          <><RefreshCw size={14} className="animate-spin" /> 分析中...</>
        ) : (
          <><Zap size={14} /> 开始分析</>
        )}
      </button>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {lastUpdate && (
        <p className="text-[11px] text-gray-400 text-center">
          最近更新: {new Date(lastUpdate).toLocaleString('zh-CN')}
        </p>
      )}
    </div>
  )
}

export default QuickAnalysisPanel
