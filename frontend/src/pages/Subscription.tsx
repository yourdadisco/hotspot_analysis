import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, X, Check, ArrowLeft, Crown } from 'lucide-react'
import { subscriptionApi } from '../services/api'
import { useSubscription } from '../hooks/useSubscription'
import { useToastStore } from '../stores/toastStore'

const TIERS = [
  {
    tier: 'free', name: '免费版', price: '¥0', color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', popular: false,
    features: ['每日 30 条热点', '基础筛选', '3 天历史', '手动更新', '社区支持'],
  },
  {
    tier: 'personal', name: '个人专业版', price: '¥29/月', color: '#6366F1', bg: '#EEF2FF', border: '#6366F1', popular: true,
    features: ['无限热点', 'AI 全文分析', '1 年历史', '自动更新', '实时通知', '关键词告警', '每日晨报', '邮件支持'],
  },
  {
    tier: 'team', name: '团队版', price: '¥199/月', color: '#7C3AED', bg: '#F5F3FF', border: '#7C3AED', popular: false,
    features: ['个人版全部', '5 人协作', '每周报告', '专属信息源', '管理后台', '优先支持'],
  },
]

const Subscription: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const addToast = useToastStore(s => s.addToast)
  const userId = localStorage.getItem('user_id') || ''
  const [showPlans, setShowPlans] = useState(false)
  const [selectedTier, setSelectedTier] = useState<string>('')

  const { subscription, isLoading } = useSubscription(userId)
  const currentTier = subscription.tier

  const upgradeMut = useMutation({
    mutationFn: (tier: string) => subscriptionApi.upgrade(userId, tier),
    onSuccess: () => { addToast('升级成功！', 'success'); queryClient.invalidateQueries({ queryKey: ['subscription'] }); setShowPlans(false) },
    onError: () => addToast('升级失败', 'error'),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  )

  const currentInfo = TIERS.find(t => t.tier === currentTier) || TIERS[0]

  const handleUpgrade = () => {
    if (!selectedTier) return
    upgradeMut.mutate(selectedTier)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 标题 */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} className="text-gray-500" /></button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">订阅</h1>
          <p className="text-sm text-gray-500">管理你的套餐</p>
        </div>
      </div>

      {/* 当前套餐卡片 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: currentInfo.bg }}>
              <Crown size={20} style={{ color: currentInfo.color }} />
            </div>
            <div>
              <p className="text-xs text-gray-500">当前套餐</p>
              <p className="text-base font-bold text-gray-900">{currentInfo.name}</p>
            </div>
          </div>
          <button onClick={() => setShowPlans(true)}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
            style={{ backgroundColor: currentInfo.bg, color: currentInfo.color }}>
            {currentTier === 'free' ? '升级套餐' : '变更套餐'}
          </button>
        </div>
      </div>

      {/* 套餐对比弹窗 */}
      {showPlans && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPlans(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">选择套餐</h3>
              <button onClick={() => setShowPlans(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} className="text-gray-400" /></button>
            </div>

            {/* 表头 */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="col-span-1" />
              {TIERS.map(t => {
                const isSelected = selectedTier === t.tier
                const isCurrent = t.tier === currentTier
                const canSelect = t.tier !== currentTier
                return (
                  <div key={t.tier} onClick={() => canSelect && setSelectedTier(t.tier)}
                    className={`rounded-xl border-2 p-4 text-center cursor-pointer transition-all duration-200 relative ${
                      isSelected ? 'border-indigo-500 shadow-lg shadow-indigo-500/20 scale-105' :
                      isCurrent ? 'border-indigo-300' :
                      canSelect ? 'border-gray-200 hover:border-indigo-300 hover:shadow-md' : 'opacity-60'
                    }`}>
                    {t.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-semibold text-white rounded-full whitespace-nowrap" style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>🔥 最受欢迎</span>}
                    <p className="text-sm font-bold text-gray-900 mb-0.5">{t.name}</p>
                    <p className="text-xl font-bold text-gray-900">{t.price}</p>
                    {isCurrent && <span className="inline-block mt-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">当前</span>}
                    {isSelected && !isCurrent && <span className="inline-block mt-1.5 text-xs font-medium text-white px-2 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>已选 ✓</span>}
                  </div>
                )
              })}
            </div>

            {/* 功能对比行 */}
            <div className="space-y-1 mb-6">
              {[
                { label: '每日热点', free: '30 条', personal: '无限', team: '无限' },
                { label: 'AI 全文分析', free: false, personal: true, team: true },
                { label: '历史数据', free: '3 天', personal: '1 年', team: '1 年' },
                { label: '自动更新', free: false, personal: true, team: true },
                { label: '实时通知', free: false, personal: true, team: true },
                { label: '关键词告警', free: false, personal: true, team: true },
                { label: '每日晨报', free: false, personal: true, team: true },
                { label: '团队协作', free: false, personal: false, team: true },
                { label: '专属信息源', free: false, personal: false, team: true },
                { label: '技术支持', free: '社区', personal: '邮件', team: '优先' },
              ].map((row, idx) => (
                <div key={row.label} className={`grid grid-cols-4 gap-3 py-3 px-3 rounded-lg items-center ${idx % 2 === 0 ? 'bg-gray-50/50' : ''}`}>
                  <p className="text-sm font-medium text-gray-700">{row.label}</p>
                  <p className="text-sm text-gray-500 text-center">{row.free === false ? '—' : row.free === true ? '✓' : row.free}</p>
                  <p className={`text-sm font-medium text-center ${row.personal === false ? 'text-gray-300' : row.personal === true ? 'text-green-600' : 'text-indigo-600'}`}>
                    {row.personal === false ? '—' : row.personal === true ? '✓' : row.personal}
                  </p>
                  <p className={`text-sm font-medium text-center ${row.team === false ? 'text-gray-300' : row.team === true ? 'text-green-600' : 'text-purple-600'}`}>
                    {row.team === false ? '—' : row.team === true ? '✓' : row.team}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-5 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                {currentTier === 'free' ? '升级后立即生效，随时取消' : '升级后新套餐立即生效'}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowPlans(false)} className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">取消</button>
                {selectedTier && (
                  <button onClick={handleUpgrade} disabled={upgradeMut.isPending}
                    className="px-6 py-2.5 text-sm font-semibold rounded-lg text-white transition-all shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
                    {upgradeMut.isPending ? '处理中...' : `升级到 ${TIERS.find(t => t.tier === selectedTier)?.name}`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 用量信息 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">用量</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (subscription.used_today / Math.max(subscription.daily_limit, 1)) * 100)}%`, backgroundColor: '#6366F1' }} />
          </div>
          <span className="text-sm font-medium text-gray-700">{subscription.used_today}/{subscription.daily_limit}</span>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">免费版每日限 {subscription.daily_limit} 条</p>
      </div>

      {/* 功能权限 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">功能权限</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            ['实时通知', currentTier !== 'free'],
            ['自动更新', currentTier !== 'free'],
            ['关键词告警', currentTier !== 'free'],
            ['每日晨报', currentTier !== 'free'],
            ['1 年历史', currentTier !== 'free'],
            ['团队协作', currentTier === 'team'],
          ].map(([label, ok]) => (
            <div key={label as string} className="flex items-center gap-2 text-sm">
              {ok ? <CheckCircle2 size={14} className="text-green-500 shrink-0" /> : <X size={14} className="text-gray-300 shrink-0" />}
              <span className={ok ? 'text-gray-700' : 'text-gray-400'}>{label as string}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

export default Subscription
