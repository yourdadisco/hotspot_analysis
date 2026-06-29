import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Zap, Settings, Calendar, RefreshCw, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { collectionApi, modelConfigApi } from '../services/api'
import { useToastStore } from '../stores/toastStore'

interface Props {
  userId: string
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

const industries = ['科技/互联网', '金融/保险', '医疗/健康', '教育/培训', '制造业', '零售/电商', '媒体/娱乐', '其他']
const PROVIDERS: Record<string, string> = {
  'OpenAI': 'https://api.openai.com/v1',
  'Anthropic': 'https://api.anthropic.com/v1',
  'DeepSeek': 'https://api.deepseek.com',
  'Kimi': 'https://api.moonshot.cn/v1',
  'MiniMax': 'https://api.minimax.chat/v1',
  'Mimo': 'https://api.mimo.com/v1',
  '豆包': 'https://ark.cn-beijing.volces.com/api/v3',
}

const QuickAnalysisModal: React.FC<Props> = ({ userId, isOpen, onClose, onComplete }) => {
  const addToast = useToastStore(s => s.addToast)
  const [mode, setMode] = useState<'last' | 'range' | 'ndays'>('last')
  const [ndays, setNdays] = useState(7)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // 业务配置表单
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')
  const [businessDesc, setBusinessDesc] = useState('')
  const [saving, setSaving] = useState(false)

  // 模型配置表单
  const [provider, setProvider] = useState('DeepSeek')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [savingModel, setSavingModel] = useState(false)

  const { data: userData, refetch: refetchUser } = useQuery({
    queryKey: ['qa-profile', userId],
    queryFn: async () => {
      const { authApi } = await import('../services/api')
      return authApi.getUser(userId) as any
    },
    enabled: isOpen,
  })

  const { data: modelData, refetch: refetchModel } = useQuery({
    queryKey: ['qa-model', userId],
    queryFn: () => modelConfigApi.getConfig(userId) as Promise<any>,
    enabled: isOpen,
  })

  const { data: lastUpdateData } = useQuery({
    queryKey: ['qa-last'],
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

  const hasBusiness = !!(companyName && businessDesc)
  const hasApiKey = !!apiKey
  const allReady = hasBusiness && hasApiKey

  useEffect(() => {
    if (isOpen) {
      const u: any = userData || {}
      const m: any = modelData || {}
      setCompanyName(u.company_name || '')
      setIndustry(u.industry || '')
      setBusinessDesc(u.business_description || '')
      const p = m.provider || 'DeepSeek'
      setProvider(p)
      setApiKey(m.api_key || '')
      setDateFrom(''); setDateTo(''); setError(''); setDone(false)
    }
  }, [isOpen, userData, modelData])

  const saveBusiness = async () => {
    setSaving(true)
    try {
      const { authApi } = await import('../services/api')
      await authApi.updateUserBusiness(userId, { company_name: companyName, industry, business_description: businessDesc })
      addToast('已保存', 'success')
      refetchUser()
    } catch { addToast('保存失败', 'error') }
    finally { setSaving(false) }
  }

  const saveModel = async () => {
    setSavingModel(true)
    try {
      await modelConfigApi.updateConfig(userId, { provider, api_key: apiKey, api_base_url: PROVIDERS[provider] || '', model_name: provider === 'DeepSeek' ? 'deepseek-chat' : provider === 'OpenAI' ? 'gpt-4o' : provider === 'Anthropic' ? 'claude-sonnet-4-20250514' : '', is_active: 'Y' })
      addToast('模型配置已保存', 'success')
      refetchModel()
    } catch { addToast('保存失败', 'error') }
    finally { setSavingModel(false) }
  }

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
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
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
                  <p className="text-xs text-gray-500">工作信息 → 选择日期 → 开始分析</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-400" /></button>
            </div>

            {/* 步骤1: 工作信息 */}
            <div className="mb-5 p-4 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Settings size={16} className="text-gray-500" />
                <span className="text-sm font-semibold text-gray-800">1. 工作信息</span>
                {hasBusiness && <CheckCircle2 size={14} className="text-green-500 ml-auto" />}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">公司/团队名称</label>
                  <input type="text" placeholder="例如：某某科技" value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">所属行业</label>
                  <select value={industry} onChange={e => setIndustry(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                    <option value="">请选择</option>
                    {industries.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">业务描述</label>
                  <textarea placeholder="例如：我们做 AI 客服系统..." value={businessDesc}
                    onChange={e => setBusinessDesc(e.target.value)} rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none" />
                </div>
                <button onClick={saveBusiness} disabled={saving || !companyName}
                  className="px-4 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>

            {/* 步骤2: 模型配置 */}
            <div className="mb-5 p-4 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Settings size={16} className="text-gray-500" />
                <span className="text-sm font-semibold text-gray-800">2. 模型配置</span>
                {hasApiKey && <CheckCircle2 size={14} className="text-green-500 ml-auto" />}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">供应商</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.keys(PROVIDERS).map(p => (
                      <button key={p} onClick={() => setProvider(p)}
                        className={`px-3 py-2 text-sm rounded-lg border transition-all text-left ${
                          provider === p ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}>{p}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">API Key</label>
                  <div className="relative">
                    <input type={showKey ? 'text' : 'password'} placeholder={provider === 'OpenAI' ? 'sk-proj-...' : 'sk-...'} value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg pr-10 font-mono" />
                    <button onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                {provider && <p className="text-xs text-gray-400">API Base: {PROVIDERS[provider]}</p>}
                <button onClick={saveModel} disabled={savingModel || !apiKey}
                  className="px-4 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                  {savingModel ? '保存中...' : '保存'}
                </button>
              </div>
            </div>

            {/* 步骤3: 日期选择 */}
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
