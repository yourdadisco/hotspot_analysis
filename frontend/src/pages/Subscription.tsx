import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Zap, CheckCircle2, ArrowLeft } from 'lucide-react'
import { subscriptionApi } from '../services/api'
import { useSubscription } from '../hooks/useSubscription'
import { useToastStore } from '../stores/toastStore'

const TIER_INFO: Record<string, { label: string, color: string, bg: string }> = {
  free: { label: '免费版', color: '#6B7280', bg: '#F3F4F6' },
  personal: { label: '个人专业版', color: '#6366F1', bg: '#EEF2FF' },
  team: { label: '团队版', color: '#7C3AED', bg: '#F5F3FF' },
}

const Subscription: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const addToast = useToastStore(s => s.addToast)
  const userId = localStorage.getItem('user_id') || ''

  const { subscription, isLoading, isFree, canUse, usagePercent } = useSubscription(userId)
  const info = TIER_INFO[subscription.tier] || TIER_INFO.free

  const upgradeMut = useMutation({
    mutationFn: (tier: string) => subscriptionApi.upgrade(userId, tier),
    onSuccess: () => { addToast('升级成功！', 'success'); queryClient.invalidateQueries({ queryKey: ['subscription'] }) },
    onError: () => addToast('升级失败', 'error'),
  })

  const downgradeMut = useMutation({
    mutationFn: () => subscriptionApi.downgrade(userId),
    onSuccess: () => { addToast('已降级为免费版', 'success'); queryClient.invalidateQueries({ queryKey: ['subscription'] }) },
    onError: () => addToast('降级失败', 'error'),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 标题 */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} className="text-gray-500" /></button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">订阅管理</h1>
          <p className="text-sm text-gray-500">管理你的套餐和用量</p>
        </div>
      </div>

      {/* 当前套餐 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: info.bg }}>
              <Zap size={20} style={{ color: info.color }} />
            </div>
            <div>
              <p className="text-sm text-gray-500">当前套餐</p>
              <p className="text-lg font-bold text-gray-900">{info.label}</p>
            </div>
          </div>
          <span className="px-3 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: info.bg, color: info.color }}>
            {subscription.status === 'active' ? '使用中' : subscription.status}
          </span>
        </div>
        {subscription.period_end && (
          <p className="text-xs text-gray-400">到期时间: {new Date(subscription.period_end).toLocaleDateString('zh-CN')}</p>
        )}
      </div>

      {/* 用量 */}
      {isFree && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">今日用量</h3>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${usagePercent}%`, background: usagePercent > 80 ? '#EF4444' : '#6366F1' }} />
            </div>
            <span className="text-sm font-medium text-gray-700">{subscription.used_today}/{subscription.daily_limit}</span>
          </div>
          <p className="text-xs text-gray-400">免费版每日限 {subscription.daily_limit} 条，升级后可无限阅读</p>
        </div>
      )}

      {/* 功能权限 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">功能权限</h3>
        <div className="space-y-2.5">
          {[
            { feature: 'websocket', label: '实时通知推送' },
            { feature: 'auto_update', label: '自动定时更新' },
            { feature: 'keyword_alert', label: '自定义关键词告警' },
            { feature: 'daily_digest', label: '每日晨报简报' },
            { feature: 'historical_1y', label: '1 年历史数据' },
            { feature: 'team_collab', label: '团队协作' },
          ].map(item => (
            <div key={item.feature} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{item.label}</span>
              {canUse(item.feature) ? (
                <CheckCircle2 size={16} className="text-green-500" />
              ) : (
                <span className="text-xs text-gray-400">—</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 升级/降级 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">变更套餐</h3>
        <p className="text-xs text-gray-500 mb-4">升级或降级套餐，变更立即生效。</p>
        <div className="flex gap-3">
          {isFree ? (
            <>
              <button onClick={() => upgradeMut.mutate('personal')} disabled={upgradeMut.isPending}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>
                升级个人版 ¥29/月
              </button>
              <button onClick={() => upgradeMut.mutate('team')} disabled={upgradeMut.isPending}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}>
                升级团队版 ¥199/月
              </button>
            </>
          ) : (
            <button onClick={() => downgradeMut.mutate()} disabled={downgradeMut.isPending}
              className="px-6 py-2.5 text-sm font-medium rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50">
              降级为免费版
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Subscription
