import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Zap, Settings, Calendar, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { collectionApi } from '../services/api'

interface Props {
  userId: string
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

const QuickAnalysisModal: React.FC<Props> = ({ userId, isOpen, onClose, onComplete }) => {
  const [mode, setMode] = useState<'last' | 'range' | 'ndays'>('last')
  const [ndays, setNdays] = useState(7)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // 获取用户信息（检查业务配置是否完成）
  const { data: userData } = useQuery({
    queryKey: ['qa-profile-simple'],
    queryFn: async () => {
      const { authApi } = await import('../services/api')
      return authApi.getUser(userId) as any
    },
    enabled: isOpen,
  })

  const { data: modelData } = useQuery({
    queryKey: ['qa-model-simple'],
    queryFn: async () => {
      const { modelConfigApi } = await import('../services/api')
      return modelConfigApi.getConfig(userId) as Promise<any>
    },
    enabled: isOpen,
  })

  const { data: lastUpdateData } = useQuery({
    queryKey: ['qa-last-simple'],
    queryFn: () => collectionApi.getLastUpdate(),
    enabled: isOpen,
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
  const allReady = hasBusiness && hasApiKey

  useEffect(() => {
    if (isOpen) {
      setDateFrom(''); setDateTo(''); setError(''); setDone(false)
    }
  }, [isOpen])

  const handleStart = async () => {
    if (!allReady) return
    setLoading(true); setError('')
    try {
      let df = defaultFrom, dt = defaultTo
      if (mode === 'range') { df = dateFrom || defaultFrom; dt = dateTo || defaultTo }
      if (mode === 'ndays') { const d = new Date(); d.setDate(d.getDate() - ndays); df = d.toISOString().slice(0, 10) }
      await collectionApi.triggerManualRefresh(df, dt)
      setDone(true); onComplete()
    } catch { setError('启动分析失败') }
    finally { setLoading(false) }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
        {done ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">分析已启动</h3>
            <p className="text-sm text-gray-500 mb-5">采集和分析将在后台进行</p>
            <button onClick={onClose} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">知道了</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Zap size={20} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">一键分析</h3>
                  <p className="text-xs text-gray-500">采集 + AI 分析一气呵成</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-400" /></button>
            </div>

            {/* 状态检查 */}
            <div className="space-y-2.5 mb-5">
              <div className={`flex items-center justify-between p-3 rounded-xl border ${hasBusiness ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <Settings size={18} className={hasBusiness ? 'text-green-500' : 'text-gray-300'} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">工作信息</p>
                    <p className="text-xs text-gray-500">{hasBusiness ? user.company_name : '未填写 → 去设置'}</p>
                  </div>
                </div>
                {hasBusiness ? <CheckCircle2 size={18} className="text-green-500" />
                  : <a href="/business" className="text-xs text-blue-600 hover:underline font-medium">去填写</a>}
              </div>
              <div className={`flex items-center justify-between p-3 rounded-xl border ${hasApiKey ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <Settings size={18} className={hasApiKey ? 'text-green-500' : 'text-gray-300'} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">模型配置</p>
                    <p className="text-xs text-gray-500">{hasApiKey ? `${model.provider || ''} ${model.model_name || ''}` : '未配置 → 去设置'}</p>
                  </div>
                </div>
                {hasApiKey ? <CheckCircle2 size={18} className="text-green-500" />
                  : <a href="/model-config" className="text-xs text-blue-600 hover:underline font-medium">去配置</a>}
              </div>
            </div>

            {/* 日期选择 */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={15} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-700">日期范围</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <button onClick={() => setMode('last')} className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${mode === 'last' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>最近更新</button>
                <button onClick={() => setMode('ndays')} className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${mode === 'ndays' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>最近N天</button>
                <button onClick={() => setMode('range')} className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${mode === 'range' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>自定义</button>
              </div>
              {mode === 'ndays' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">最近</span>
                  <input type="number" min={1} max={365} value={ndays} onChange={e => setNdays(Math.max(1, parseInt(e.target.value) || 1))} className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg text-center" />
                  <span className="text-sm text-gray-600">天</span>
                </div>
              )}
              {mode === 'range' && (
                <div className="flex items-center gap-2">
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                  <span className="text-gray-400">~</span>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                </div>
              )}
              {lastUpdate && <p className="text-xs text-gray-400 mt-2">最近采集: {new Date(lastUpdate).toLocaleString('zh-CN')}</p>}
            </div>

            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
            {!allReady && <p className="text-xs text-amber-600 mb-4 flex items-center gap-1"><AlertCircle size={13} /> 请先完成工作信息和模型配置</p>}

            <button onClick={handleStart} disabled={!allReady || loading}
              className="w-full py-3 text-base font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: allReady ? '#2563EB' : '#D1D5DB', color: allReady ? '#FFFFFF' : '#9CA3AF' }}>
              {loading ? <><RefreshCw size={18} className="animate-spin" /> 分析中...</> : <><Zap size={18} /> 开始分析</>}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default QuickAnalysisModal
