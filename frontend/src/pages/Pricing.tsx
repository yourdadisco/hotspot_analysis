import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Zap, X } from 'lucide-react'

const MONTHLY = {
  personal: { price: 29, original: 39 },
  team: { price: 199, original: 299 },
}
const YEARLY = {
  personal: { price: 299, original: 468 },
  team: { price: 1999, original: 3588 },
}

const ALL_FEATURES = [
  { key: 'hotspots', label: '每日热点', free: '30 条', personal: '无限', team: '无限' },
  { key: 'analysis', label: 'AI 完整分析', free: false, personal: true, team: true },
  { key: 'history', label: '历史数据', free: '3 天', personal: '1 年', team: '1 年' },
  { key: 'auto_update', label: '自动定时更新', free: false, personal: true, team: true },
  { key: 'notification', label: '实时通知推送', free: false, personal: true, team: true },
  { key: 'keyword', label: '关键词告警', free: false, personal: true, team: true },
  { key: 'digest', label: '每日晨报', free: false, personal: true, team: true },
  { key: 'trends', label: '趋势图表', free: false, personal: true, team: true },
  { key: 'team', label: '协作席位', free: '—', personal: '1 人', team: '5 人' },
  { key: 'report', label: '每周趋势报告', free: false, personal: false, team: true },
  { key: 'source', label: '专属信息源', free: false, personal: false, team: true },
  { key: 'support', label: '技术支持', free: '社区', personal: '邮件', team: '优先' },
]

const Pricing: React.FC = () => {
  const navigate = useNavigate()
  const userId = localStorage.getItem('user_id')
  const [yearly, setYearly] = useState(false)

  const pricing = yearly ? YEARLY : MONTHLY

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9FAFB' }}>
      {/* Hero */}
      <div className="text-center pt-16 pb-12 px-4" style={{ background: 'linear-gradient(180deg, #EEF2FF 0%, #F9FAFB 100%)' }}>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-4" style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}>
          <Zap size={14} /> 限时优惠 · 年付低至 8 折
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">选择适合你的方案</h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto">免费版先体验，专业版让 AI 替你 7×24 小时盯盘</p>

        {/* 年/月切换 */}
        <div className="inline-flex items-center gap-3 mt-8 p-1 rounded-xl" style={{ backgroundColor: '#F3F4F6' }}>
          <button onClick={() => setYearly(false)} className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${!yearly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>月付</button>
          <button onClick={() => setYearly(true)} className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${yearly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>年付 <span className="text-green-500 font-semibold">省 20%</span></button>
        </div>
      </div>

      {/* 套餐卡片 */}
      <div className="max-w-5xl mx-auto px-4 -mt-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 免费版 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">免费版</h2>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold text-gray-900">¥0</span>
              </div>
              <p className="text-sm text-gray-500">适合初次体验</p>
            </div>
            <button onClick={() => userId ? navigate('/dashboard') : navigate('/login')}
              className="w-full py-2.5 text-sm font-semibold rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all mb-6">
              当前使用
            </button>
            <ul className="space-y-3 flex-1">
              {ALL_FEATURES.map(f => (
                <li key={f.key} className="flex items-center gap-3 text-sm">
                  {f.free === true ? <Check size={16} className="text-green-500 shrink-0" />
                    : f.free === false ? <X size={16} className="text-gray-300 shrink-0" />
                    : <span className="w-4 text-xs text-gray-400 shrink-0 text-center">{f.free}</span>}
                  <span className={f.free === false ? 'text-gray-400' : 'text-gray-600'}>{f.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 个人专业版 */}
          <div className="bg-white rounded-2xl shadow-xl border-2 p-6 flex flex-col relative scale-105" style={{ borderColor: '#6366F1' }}>
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-semibold text-white rounded-full" style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>
              最受欢迎
            </span>
            <div className="mb-6 mt-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">个人专业版</h2>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold text-gray-900">¥{pricing.personal.price}</span>
                <span className="text-sm text-gray-500">/月</span>
                {yearly && <span className="text-xs line-through text-gray-400">¥39/月</span>}
              </div>
              <p className="text-sm text-gray-500">{yearly ? '¥299/年' : '适合个人开发者'}</p>
            </div>
            <button onClick={() => navigate('/subscription')}
              className="w-full py-2.5 text-sm font-semibold rounded-xl text-white transition-all mb-6 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
              立即升级
            </button>
            <ul className="space-y-3 flex-1">
              {ALL_FEATURES.map(f => (
                <li key={f.key} className="flex items-center gap-3 text-sm">
                  {f.personal === true ? <Check size={16} className="text-green-500 shrink-0" />
                    : f.personal === false ? <X size={16} className="text-gray-300 shrink-0" />
                    : <span className="w-4 text-xs text-indigo-600 font-medium shrink-0 text-center">{f.personal}</span>}
                  <span className={f.personal === false ? 'text-gray-400' : 'text-gray-700'}>{f.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 团队版 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">团队版</h2>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold text-gray-900">¥{pricing.team.price}</span>
                <span className="text-sm text-gray-500">/月</span>
                {yearly && <span className="text-xs line-through text-gray-400">¥299/月</span>}
              </div>
              <p className="text-sm text-gray-500">{yearly ? '¥1,999/年 · 5 席位' : '适合团队协作'}</p>
            </div>
            <button onClick={() => navigate('/subscription')}
              className="w-full py-2.5 text-sm font-semibold rounded-xl text-white transition-all mb-6 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
              立即升级
            </button>
            <ul className="space-y-3 flex-1">
              {ALL_FEATURES.map(f => (
                <li key={f.key} className="flex items-center gap-3 text-sm">
                  {f.team === true ? <Check size={16} className="text-green-500 shrink-0" />
                    : f.team === false ? <X size={16} className="text-gray-300 shrink-0" />
                    : <span className="w-4 text-xs text-purple-600 font-medium shrink-0 text-center">{f.team}</span>}
                  <span className={f.team === false ? 'text-gray-400' : 'text-gray-700'}>{f.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 功能对比表 */}
        <div className="mt-16 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">完整功能对比</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3.5 text-gray-500 font-medium">功能</th>
                  <th className="text-center px-6 py-3.5 text-gray-500 font-medium w-28">免费版</th>
                  <th className="text-center px-6 py-3.5 font-medium w-28" style={{ color: '#6366F1' }}>个人专业版</th>
                  <th className="text-center px-6 py-3.5 font-medium w-28" style={{ color: '#7C3AED' }}>团队版</th>
                </tr>
              </thead>
              <tbody>
                {ALL_FEATURES.map((f, i) => (
                  <tr key={f.key} className={i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                    <td className="px-6 py-3.5 text-gray-700">{f.label}</td>
                    <td className="text-center px-6 py-3.5">
                      {f.free === true ? <Check size={16} className="text-green-500 mx-auto" />
                        : f.free === false ? <X size={16} className="text-gray-300 mx-auto" />
                        : <span className="text-gray-500">{f.free}</span>}
                    </td>
                    <td className="text-center px-6 py-3.5">
                      {f.personal === true ? <Check size={16} className="text-green-500 mx-auto" />
                        : f.personal === false ? <X size={16} className="text-gray-300 mx-auto" />
                        : <span className="text-indigo-600 font-medium">{f.personal}</span>}
                    </td>
                    <td className="text-center px-6 py-3.5">
                      {f.team === true ? <Check size={16} className="text-green-500 mx-auto" />
                        : f.team === false ? <X size={16} className="text-gray-300 mx-auto" />
                        : <span className="text-purple-600 font-medium">{f.team}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">有疑问？<a href="#" className="text-indigo-600 hover:underline">联系客服</a></p>
        </div>
      </div>
    </div>
  )
}

export default Pricing
