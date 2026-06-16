import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, CheckCircle2, XCircle, DollarSign, Zap, Calendar } from 'lucide-react'
import { apiUsageApi } from '../services/api'

const ApiUsage: React.FC = () => {
  const userId = localStorage.getItem('user_id') || ''
  const [days, setDays] = useState(7)

  const { data: summary, isLoading } = useQuery({
    queryKey: ['api-usage', days],
    queryFn: () => apiUsageApi.getSummary(days),
    enabled: !!userId,
  } as any)

  const { data: stats } = useQuery({
    queryKey: ['api-usage-stats', days],
    queryFn: () => apiUsageApi.getStats(days),
    enabled: !!userId,
  } as any)

  const { data: records } = useQuery({
    queryKey: ['api-usage-records', days],
    queryFn: () => apiUsageApi.getRecords({ page: 1, limit: 20, date_from: '', date_to: '' }),
    enabled: !!userId,
  } as any)

  const s: any = summary || {}
  const st: any = stats || {}
  const recs: any = records || {}

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const cards = [
    { label: '总请求数', value: s.total_requests ?? '-', icon: BarChart3, color: '#3B82F6' },
    { label: '成功', value: s.successful_requests ?? '-', icon: CheckCircle2, color: '#22C55E' },
    { label: '失败', value: s.failed_requests ?? '-', icon: XCircle, color: '#EF4444' },
    { label: '总 Token', value: (s.total_tokens ?? 0).toLocaleString(), icon: Zap, color: '#8B5CF6' },
    { label: '成本 (USD)', value: st.total_cost_usd ? `$${Number(st.total_cost_usd).toFixed(4)}` : '-', icon: DollarSign, color: '#F59E0B' },
    { label: '成本 (CNY)', value: st.total_cost_cny ? `¥${Number(st.total_cost_cny).toFixed(4)}` : '-', icon: DollarSign, color: '#10B981' },
  ]

  const dayOptions = [
    { value: 1, label: '近1天' },
    { value: 7, label: '近7天' },
    { value: 30, label: '近30天' },
    { value: 90, label: '近90天' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">API 用量</h1>
          <p className="text-sm text-gray-500 mt-0.5">查看 API 调用统计和成本</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-gray-400" />
          <div className="flex gap-1">
            {dayOptions.map(opt => (
              <button key={opt.value}
                onClick={() => setDays(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  days === opt.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {cards.map(card => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500">{card.label}</span>
              <card.icon size={15} style={{ color: card.color }} />
            </div>
            <span className="text-lg font-bold text-gray-900">{card.value}</span>
          </div>
        ))}
      </div>

      {/* 按端点统计 */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">按端点统计</h2>
        {st.by_endpoint && Object.keys(st.by_endpoint).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-2 font-medium">端点</th>
                  <th className="pb-2 font-medium text-right">请求数</th>
                  <th className="pb-2 font-medium text-right">Token</th>
                  <th className="pb-2 font-medium text-right">成本 (USD)</th>
                  <th className="pb-2 font-medium text-right">平均响应 (ms)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(st.by_endpoint).map(([endpoint, data]: [string, any]) => (
                  <tr key={endpoint} className="border-b border-gray-100">
                    <td className="py-2.5 text-gray-900 font-mono text-xs">{endpoint}</td>
                    <td className="py-2.5 text-right text-gray-700">{data.total_requests || 0}</td>
                    <td className="py-2.5 text-right text-gray-700">{(data.total_tokens || 0).toLocaleString()}</td>
                    <td className="py-2.5 text-right text-gray-700">${Number(data.total_cost_usd || 0).toFixed(4)}</td>
                    <td className="py-2.5 text-right text-gray-700">{Math.round(data.avg_response_time_ms || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">暂无统计数据</p>
        )}
      </div>

      {/* 最近记录 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">最近调用记录</h2>
        </div>
        {recs.items?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 bg-gray-50">
                  <th className="px-5 py-2.5 font-medium">时间</th>
                  <th className="px-5 py-2.5 font-medium">端点</th>
                  <th className="px-5 py-2.5 font-medium">模型</th>
                  <th className="px-5 py-2.5 font-medium text-right">Token</th>
                  <th className="px-5 py-2.5 font-medium text-right">耗时 (ms)</th>
                  <th className="px-5 py-2.5 font-medium text-center">状态</th>
                </tr>
              </thead>
              <tbody>
                {recs.items.map((r: any, i: number) => (
                  <tr key={r.id || i} className="border-b border-gray-100">
                    <td className="px-5 py-2.5 text-gray-600 text-xs whitespace-nowrap">
                      {r.requested_at ? new Date(r.requested_at).toLocaleString('zh-CN') : '-'}
                    </td>
                    <td className="px-5 py-2.5 text-gray-900 font-mono text-xs">{r.endpoint || '-'}</td>
                    <td className="px-5 py-2.5 text-gray-600 text-xs">{r.model_used || '-'}</td>
                    <td className="px-5 py-2.5 text-right text-gray-700 data-value">{(r.total_tokens || 0).toLocaleString()}</td>
                    <td className="px-5 py-2.5 text-right text-gray-700 data-value">{r.response_time_ms ?? '-'}</td>
                    <td className="px-5 py-2.5 text-center">
                      <span className={`inline-block w-2 h-2 rounded-full ${r.success ? 'bg-green-500' : 'bg-red-500'}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">暂无调用记录</p>
        )}
      </div>
    </div>
  )
}

export default ApiUsage
