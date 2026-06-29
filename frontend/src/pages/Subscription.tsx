import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Zap, Check, ArrowLeft, ArrowRight, Smartphone, CreditCard, CheckCircle2, Clock } from 'lucide-react'
import { subscriptionApi, paymentApi } from '../services/api'
import { useSubscription } from '../hooks/useSubscription'
import { useToastStore } from '../stores/toastStore'

const Subscription: React.FC = () => {
  const navigate = useNavigate()
  const addToast = useToastStore(s => s.addToast)
  const userId = localStorage.getItem('user_id') || ''
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [showPayment, setShowPayment] = useState(false)
  const [payTier, setPayTier] = useState<'personal' | 'team'>('personal')
  const [payMethod, setPayMethod] = useState<'alipay' | 'wechat'>('alipay')

  const { subscription, isLoading, isFree } = useSubscription(userId)

  const upgrades: any = { monthly: { personal: 29, team: 199 }, yearly: { personal: 299, team: 1999 } }

  const { data: ordersData } = useQuery({
    queryKey: ['payment-orders', userId],
    queryFn: () => paymentApi.getOrders(userId) as Promise<any>,
    enabled: !!userId,
  })
  const orders: any[] = ordersData?.orders || []

  const createOrderMut = useMutation({
    mutationFn: (data: { tier: string; period: string; method: string }) =>
      paymentApi.createOrder(userId, data.tier, data.period, data.method) as Promise<any>,
    onSuccess: (data: any) => {
      addToast('订单已创建，请完成支付', 'success')
      // 模拟支付验证
      setTimeout(async () => {
        try {
          await paymentApi.verifyPayment(data.order_id)
          addToast('支付成功！已升级套餐', 'success')
          setShowPayment(false)
          window.location.reload()
        } catch { addToast('验证失败', 'error') }
      }, 2000)
    },
    onError: () => addToast('创建订单失败', 'error'),
  })

  const downgradeMut = useMutation({
    mutationFn: () => subscriptionApi.downgrade(userId) as Promise<any>,
    onSuccess: () => { addToast('已降级为免费版', 'success'); window.location.reload() },
    onError: () => addToast('降级失败', 'error'),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  )


  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 标题 */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} className="text-gray-500" /></button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">订阅管理</h1>
          <p className="text-sm text-gray-500">管理你的套餐和支付</p>
        </div>
      </div>

      {/* 当前套餐 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: subscription.tier === 'free' ? '#F3F4F6' : subscription.tier === 'personal' ? '#EEF2FF' : '#F5F3FF' }}>
            <Zap size={22} style={{ color: subscription.tier === 'free' ? '#6B7280' : subscription.tier === 'personal' ? '#6366F1' : '#7C3AED' }} />
          </div>
          <div>
            <p className="text-sm text-gray-500">当前套餐</p>
            <p className="text-lg font-bold text-gray-900">{subscription.label}</p>
          </div>
        </div>
        <span className={`px-3 py-1 text-xs font-medium rounded-full ${subscription.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {subscription.status === 'active' ? '使用中' : subscription.status}
        </span>
      </div>

      {/* 年/月切换 + 套餐选择 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => setPeriod('monthly')} className={`px-4 py-2 text-sm rounded-lg font-medium ${period === 'monthly' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>月付</button>
          <button onClick={() => setPeriod('yearly')} className={`px-4 py-2 text-sm rounded-lg font-medium ${period === 'yearly' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
            年付 <span className="text-green-400 font-semibold">{period === 'monthly' ? '' : '省 20%'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {(['personal', 'team'] as const).map(tier => {
            const selected = payTier === tier
            const price = upgrades[period][tier]
            return (
              <div key={tier} onClick={() => { setPayTier(tier); setShowPayment(true) }}
                className={`rounded-xl border-2 p-5 cursor-pointer transition-all ${selected ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                <p className="text-sm font-semibold text-gray-900 mb-1">{tier === 'personal' ? '个人专业版' : '团队版'}</p>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-3xl font-bold text-gray-900">¥{price}</span>
                  <span className="text-sm text-gray-500">/月</span>
                </div>
                {period === 'yearly' && <p className="text-xs text-green-600 font-medium">年付 ¥{tier === 'personal' ? 299 : 1999}</p>}
                <ul className="mt-3 space-y-1.5">
                  {tier === 'personal'
                    ? ['无限热点', 'AI 完整分析', '实时通知', '1 年历史'].map(f => <li key={f} className="flex items-center gap-2 text-xs text-gray-600"><Check size={12} className="text-green-500" />{f}</li>)
                    : ['个人版全部', '5 人协作', '周报', '专属信息源'].map(f => <li key={f} className="flex items-center gap-2 text-xs text-gray-600"><Check size={12} className="text-green-500" />{f}</li>)
                  }
                </ul>
              </div>
            )
          })}
        </div>
      </div>

      {/* 支付弹窗 */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPayment(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-bold text-gray-900 mb-1">确认升级</h3>
            <p className="text-sm text-gray-500 mb-5">{payTier === 'personal' ? '个人专业版' : '团队版'} · {period === 'monthly' ? '月付' : '年付'}</p>

            <div className="text-center mb-6">
              <span className="text-4xl font-bold text-gray-900">¥{upgrades[period][payTier]}</span>
              <span className="text-sm text-gray-500">/月</span>
              {period === 'yearly' && <p className="text-xs text-green-600 mt-1">年付 ￥{payTier === 'personal' ? 299 : 1999}</p>}
            </div>

            {/* 支付方式 */}
            <div className="space-y-2.5 mb-6">
              <label onClick={() => setPayMethod('alipay')} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${payMethod === 'alipay' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                <CreditCard size={20} className={payMethod === 'alipay' ? 'text-blue-500' : 'text-gray-400'} />
                <div className="flex-1"><p className="text-sm font-medium text-gray-900">支付宝</p><p className="text-xs text-gray-500">扫码支付</p></div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${payMethod === 'alipay' ? 'border-blue-500' : 'border-gray-300'}`}>
                  {payMethod === 'alipay' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                </div>
              </label>
              <label onClick={() => setPayMethod('wechat')} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${payMethod === 'wechat' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                <Smartphone size={20} className={payMethod === 'wechat' ? 'text-green-500' : 'text-gray-400'} />
                <div className="flex-1"><p className="text-sm font-medium text-gray-900">微信支付</p><p className="text-xs text-gray-500">扫码支付</p></div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${payMethod === 'wechat' ? 'border-green-500' : 'border-gray-300'}`}>
                  {payMethod === 'wechat' && <div className="w-2.5 h-2.5 rounded-full bg-green-500" />}
                </div>
              </label>
            </div>

            <button onClick={() => {
              createOrderMut.mutate({ tier: payTier, period, method: payMethod })
            }} disabled={createOrderMut.isPending}
              className="w-full py-3 text-base font-semibold rounded-xl text-white transition-all flex items-center justify-center gap-2"
              style={{ background: payMethod === 'alipay' ? '#1677FF' : '#07C160' }}>
              {createOrderMut.isPending ? '处理中...' : <><ArrowRight size={18} /> 支付 ¥{upgrades[period][payTier]}</>}
            </button>
            <p className="text-xs text-gray-400 text-center mt-3">支付成功后自动升级，未生效可联系客服</p>
          </div>
        </div>
      )}

      {/* 历史订单 */}
      {orders.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">历史订单</h3>
          <div className="space-y-2">
            {orders.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2">
                  {o.status === 'paid' ? <CheckCircle2 size={14} className="text-green-500" /> : <Clock size={14} className="text-gray-300" />}
                  <span className="text-sm text-gray-700">{o.tier === 'personal' ? '个人专业版' : '团队版'} {o.period === 'yearly' ? '年付' : '月付'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">¥{o.amount_yuan}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${o.status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{o.status === 'paid' ? '已支付' : '待支付'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 操作 */}
      {!isFree && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">降级套餐</h3>
          <p className="text-xs text-gray-500 mb-4">降级为免费版后付费功能将不可用。</p>
          <button onClick={() => downgradeMut.mutate()} disabled={downgradeMut.isPending}
            className="px-5 py-2 text-sm font-medium rounded-xl border border-red-200 text-red-600 hover:bg-red-50">降级为免费版</button>
        </div>
      )}
    </div>
  )
}

export default Subscription
