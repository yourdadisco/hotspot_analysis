import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, CheckCircle2 } from 'lucide-react'

const plans = [
  {
    tier: 'free', name: '免费版', price: '0', unit: '永久',
    color: '#6B7280', border: '#E5E7EB', btnClass: 'btn-secondary',
    features: [
      { text: '每日 30 条热点', ok: true },
      { text: '基础重要性筛选', ok: true },
      { text: '3 天历史数据', ok: true },
      { text: '手动更新', ok: true },
      { text: 'AI 分析全文', ok: false },
      { text: '实时通知推送', ok: false },
      { text: '自定义关键词告警', ok: false },
      { text: '1 年历史回溯', ok: false },
    ]
  },
  {
    tier: 'personal', name: '个人专业版', price: '29', unit: '/月',
    color: '#6366F1', border: '#6366F1', popular: true,
    btnClass: 'text-white', btnBg: 'linear-gradient(135deg, #6366F1, #4F46E5)',
    features: [
      { text: '无限热点', ok: true },
      { text: 'AI 完整分析全文', ok: true },
      { text: '1 年历史数据', ok: true },
      { text: '自动定时更新', ok: true },
      { text: 'WebSocket 实时通知', ok: true },
      { text: '自定义关键词告警', ok: true },
      { text: '每日晨报简报', ok: true },
      { text: '高级筛选 + 趋势图', ok: true },
    ]
  },
  {
    tier: 'team', name: '团队版', price: '199', unit: '/月',
    color: '#7C3AED', border: '#7C3AED',
    btnClass: 'text-white', btnBg: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
    features: [
      { text: '个人专业版全部功能', ok: true },
      { text: '5 个协作席位', ok: true },
      { text: '团队共享标注评论', ok: true },
      { text: '每周趋势报告', ok: true },
      { text: '专属信息源接入', ok: true },
      { text: '管理员后台', ok: true },
      { text: '优先技术支持', ok: true },
    ]
  },
]

const Pricing: React.FC = () => {
  const navigate = useNavigate()
  const userId = localStorage.getItem('user_id')

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 50%, #F5F3FF 100%)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100 mb-4">
            <Zap size={24} className="text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">选择适合你的方案</h1>
          <p className="text-gray-500">免费版先体验，专业版让 AI 替你盯盘</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(plan => (
            <div key={plan.tier} className={`bg-white rounded-2xl ${plan.tier === 'personal' ? 'ring-2 shadow-lg scale-105' : 'shadow-md'} p-6 relative flex flex-col`}
              style={{ borderColor: plan.popular ? plan.border : '#E5E7EB' }}>
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-semibold text-white rounded-full"
                  style={{ background: plan.btnBg }}>推荐</span>
              )}

              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-1">{plan.name}</h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">¥{plan.price}</span>
                  <span className="text-sm text-gray-500">{plan.unit}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className={f.ok ? 'text-green-500 shrink-0 mt-0.5' : 'text-gray-300 shrink-0 mt-0.5'} />
                    <span className={`text-sm ${f.ok ? 'text-gray-700' : 'text-gray-400'}`}>{f.text}</span>
                  </li>
                ))}
              </ul>

              <button onClick={() => userId ? navigate(`/subscription?upgrade=${plan.tier}`) : navigate('/login')}
                className="w-full py-2.5 text-sm font-semibold rounded-xl transition-all"
                style={plan.btnBg ? { background: plan.btnBg, color: 'white', boxShadow: `0 2px 8px ${plan.color}33` } : {}}>
                {plan.price === '0' ? '当前使用' : '立即升级'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Pricing
