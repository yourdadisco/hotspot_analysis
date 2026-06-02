import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Search, Filter, Clock, TrendingUp, AlertTriangle,
  BarChart3, RefreshCw, Target, Trash2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { hotspotsApi, collectionApi, analysisApi, userActionsApi, type PaginatedResponse, type Hotspot } from '../services/api'
import AdvancedFilterModal, { type AdvancedFilters } from '../components/AdvancedFilterModal'
import FavoriteButton from '../components/FavoriteButton'
import ProgressOverlay from '../components/ProgressOverlay'
import ManualUpdateModal from '../components/ManualUpdateModal'
import { renderSafeSummary } from '../utils/sanitize'
import { useToastStore } from '../stores/toastStore'
import { useProgressPolling } from '../hooks/useProgressPolling'

interface Stats {
  total_hotspots?: number
  today_count?: number
  emergency_count?: number
  high_count?: number
  medium_count?: number
  low_count?: number
  pending_analysis?: number
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)
  const [selectedImportance, setSelectedImportance] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem('hotspot_page')
      return saved ? Math.max(1, parseInt(saved, 10)) : 1
    } catch { return 1 }
  })
  useEffect(() => {
    try { sessionStorage.setItem('hotspot_page', String(page)) } catch {}
  }, [page])
  const [limit] = useState(10)
  const [sortBy, setSortBy] = useState('publish_date')
  const [sortOrder, setSortOrder] = useState('desc')

  // 高级筛选
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    importance_levels: [],
    date_from: '',
    date_to: '',
    source_names: '',
    is_favorite: 'all',
  })
  const [showDismissDialog, setShowDismissDialog] = useState(false)
  const [analyzingHotspots, setAnalyzingHotspots] = useState<Set<string>>(new Set())

  // 收集进度
  const [collectTaskId, setCollectTaskId] = useState<string | null>(null)
  const [showCollectProgress, setShowCollectProgress] = useState(false)
  const [showManualUpdate, setShowManualUpdate] = useState(false)
  const { state: collectProgress, isPolling: isCollecting, reset: resetCollectProgress } =
    useProgressPolling(collectTaskId, (tid) => collectionApi.getProgress(tid))

  // 批量分析进度
  const [batchTaskId, setBatchTaskId] = useState<string | null>(null)
  const [showBatchProgress, setShowBatchProgress] = useState(false)
  const { state: batchProgress, isPolling: isBatchAnalyzing, reset: resetBatchProgress } =
    useProgressPolling(batchTaskId, (tid) => analysisApi.getAnalysisProgress(tid))

  // 批量分析对话框
  const [showBatchDialog, setShowBatchDialog] = useState(false)
  const [batchLimit, setBatchLimit] = useState<number>(10)

  // 获取用户ID
  const userId = localStorage.getItem('user_id') || ''
  const queryClient = useQueryClient()
  const [refreshCounter, setRefreshCounter] = useState(0)

  // 获取热点列表
  const { data: hotspotsData, isLoading: isLoadingHotspots, refetch: refetchHotspots } = useQuery<PaginatedResponse<Hotspot>>({
    queryKey: ['hotspots', page, limit, selectedImportance, searchQuery, sortBy, sortOrder, advancedFilters, refreshCounter],
    queryFn: async () => {
      const response = await hotspotsApi.getHotspots({
        page,
        limit,
        importance_levels: selectedImportance !== 'all' ? selectedImportance : advancedFilters.importance_levels.length > 0 ? advancedFilters.importance_levels.join(',') : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        user_id: userId,
        is_dismissed: false,
        ...(advancedFilters.date_from && { date_from: advancedFilters.date_from }),
        ...(advancedFilters.date_to && { date_to: advancedFilters.date_to }),
        ...(advancedFilters.source_names && { source_names: advancedFilters.source_names }),
        ...(advancedFilters.is_favorite !== 'all' && { is_favorite: advancedFilters.is_favorite === 'yes' }),
      })
      return response
    },
    enabled: !!userId,
  })

  // 获取统计信息
  const { data: statsData, isLoading: isLoadingStats, refetch: refetchStats } = useQuery<Stats>({
    queryKey: ['hotspots-stats'],
    queryFn: async () => {
      const response = await hotspotsApi.getStats(userId)
      return response
    },
    enabled: !!userId,
  })

  // 收集完成/失败处理
  useEffect(() => {
    if (!collectProgress) return
    if (collectProgress.status === 'completed') {
      addToast('热点数据更新完成！', 'success')
      setShowCollectProgress(false)
      setCollectTaskId(null)
      refetchHotspots()
      refetchStats()
      resetCollectProgress()
    } else if (collectProgress.status === 'failed') {
      addToast(`更新失败: ${collectProgress.error || '未知错误'}`, 'error')
      setShowCollectProgress(false)
      setCollectTaskId(null)
      resetCollectProgress()
    }
  }, [collectProgress?.status])

  // 批量分析完成/失败处理
  useEffect(() => {
    if (!batchProgress) return
    if (batchProgress.status === 'completed') {
      addToast('批量分析完成！', 'success')
      setShowBatchProgress(false)
      setBatchTaskId(null)
      refetchHotspots()
      refetchStats()
      resetBatchProgress()
    } else if (batchProgress.status === 'failed') {
      addToast(`批量分析失败: ${batchProgress.error || '未知错误'}`, 'error')
      setShowBatchProgress(false)
      setBatchTaskId(null)
      resetBatchProgress()
    }
  }, [batchProgress?.status])

  // 处理热点点击
  const handleHotspotClick = (hotspotId: string) => {
    navigate(`/hotspots/${hotspotId}`)
  }

  // 打开手动更新面板
  const handleRefresh = () => {
    setShowManualUpdate(true)
  }

  // 手动更新完成后的回调
  const handleManualUpdateComplete = () => {
    setPage(1)
    setRefreshCounter(c => c + 1)
    queryClient.invalidateQueries({ queryKey: ['hotspots'] })
    queryClient.invalidateQueries({ queryKey: ['hotspots-stats'] })
  }

  // 打开批量分析对话框
  const handleOpenBatchDialog = () => {
    if (!userId) {
      addToast('请先登录', 'warning')
      return
    }
    setShowBatchDialog(true)
  }

  // 开始批量分析
  const handleStartBatchAnalysis = async () => {
    setShowBatchDialog(false)
    const limit = batchLimit === 0 ? 999 : batchLimit

    try {
      const result: any = await analysisApi.analyzeLatestAsync(userId, limit)
      setBatchTaskId(result.task_id)
      setShowBatchProgress(true)
    } catch (error: any) {
      addToast(`启动批量分析失败: ${error.response?.data?.detail || '未知错误'}`, 'error')
    }
  }

  // 分页处理
  const totalPages = hotspotsData?.total_pages || 1

  // 如果当前页超出总页数，自动跳回第1页（仅在数据已加载时判断）
  useEffect(() => {
    if (hotspotsData && page > totalPages) {
      setPage(1)
    }
  }, [page, totalPages, hotspotsData])

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1)
    }
  }

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1)
    }
  }

  // 页码按钮计算
  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const pages: (number | '...')[] = [1]
    const start = Math.max(2, page - 2)
    const end = Math.min(totalPages - 1, page + 2)
    if (start > 2) pages.push('...')
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < totalPages - 1) pages.push('...')
    pages.push(totalPages)
    return pages
  }

  // 计算统计数据
  const stats = [
    {
      label: '今日热点',
      value: statsData?.today_count?.toString() || '0',
      icon: TrendingUp,
      change: '+0',
      color: 'text-blue-600'
    },
    {
      label: '紧急事项',
      value: statsData?.emergency_count?.toString() || '0',
      icon: AlertTriangle,
      change: '+0',
      color: 'text-red-600'
    },
    {
      label: '待分析',
      value: statsData?.pending_analysis?.toString() || '0',
      icon: Clock,
      change: '+0',
      color: 'text-amber-600'
    },
    {
      label: '总热点数',
      value: statsData?.total_hotspots?.toString() || '0',
      icon: BarChart3,
      change: '+0',
      color: 'text-green-600'
    },
  ]

  // 重要性级别筛选
  const importanceLevels = [
    { id: 'all', label: '全部', count: hotspotsData?.total || 0 },
    { id: 'emergency', label: '紧急', count: statsData?.emergency_count || 0, color: 'bg-red-500' },
    { id: 'high', label: '高', count: statsData?.high_count || 0, color: 'bg-orange-500' },
    { id: 'medium', label: '中', count: statsData?.medium_count || 0, color: 'bg-yellow-500' },
    { id: 'low', label: '低', count: statsData?.low_count || 0, color: 'bg-blue-500' },
  ]

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!userId) {
      navigate('/login')
    }
  }, [userId, navigate])

  // 高级筛选应用
  const handleApplyAdvancedFilters = (filters: AdvancedFilters) => {
    setAdvancedFilters(filters)
    setShowAdvancedFilter(false)
    setPage(1)
  }

  // 批量忽略确认
  const handleBatchDismiss = async () => {
    setShowDismissDialog(false)
    try {
      const payload: any = { user_id: userId }
      if (advancedFilters.importance_levels.length > 0) {
        payload.importance_levels = advancedFilters.importance_levels
      }
      if (advancedFilters.date_from) payload.date_from = advancedFilters.date_from
      if (advancedFilters.date_to) payload.date_to = advancedFilters.date_to
      if (advancedFilters.source_names) payload.source_names = advancedFilters.source_names
      if (advancedFilters.is_favorite !== 'all') {
        payload.is_favorite = advancedFilters.is_favorite === 'yes'
      }
      const result: any = await userActionsApi.batchDismiss(payload)
      addToast(`已忽略 ${result.dismissed_count} 个热点`, 'success')
      setPage(1)
      refetchHotspots()
      refetchStats()
    } catch (error: any) {
      addToast(`批量忽略失败: ${error.response?.data?.detail || '未知错误'}`, 'error')
    }
  }

  const activeFilterCount = [
    advancedFilters.importance_levels.length > 0,
    !!advancedFilters.date_from || !!advancedFilters.date_to,
    !!advancedFilters.source_names,
    advancedFilters.is_favorite !== 'all',
  ].filter(Boolean).length


  const handleQuickAnalyze = async (e: React.MouseEvent, hotspotId: string) => {
    e.stopPropagation()
    if (!userId) return
    setAnalyzingHotspots(prev => new Set(prev).add(hotspotId))
    try {
      await analysisApi.triggerAnalysis(hotspotId, userId)
      addToast('AI分析完成！', 'success')
      refetchHotspots()
    } catch (error: any) {
      addToast(`分析失败: ${error.response?.data?.detail || error.message || '未知错误'}`, 'error')
    } finally {
      setAnalyzingHotspots(prev => {
        const next = new Set(prev)
        next.delete(hotspotId)
        return next
      })
    }
  }

  // 加载状态
  if (isLoadingHotspots || isLoadingStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block w-8 h-8 rounded-full animate-spin"
            style={{ border: '2px solid #D8D2C2', borderTopColor: '#F5A623' }}></div>
          <p className="mt-4 text-sm" style={{ color: '#5E6680' }}>加载热点数据...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* 批量分析选择对话框 */}
      {showBatchDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(26, 35, 50, 0.5)' }}
            onClick={() => setShowBatchDialog(false)} />
          <div className="relative bg-white rounded-lg shadow-modal p-6 w-full max-w-md mx-4"
            style={{ border: '1px solid #D8D2C2' }}>
            <h3 className="text-lg font-semibold" style={{ color: '#1B1B1A' }}>批量AI分析</h3>
            <p className="mt-1 text-sm" style={{ color: '#5E6680' }}>选择要分析的热点数量：</p>
            <div className="flex flex-wrap gap-2 mt-5">
              {[5, 10, 20, 50].map((n) => (
                <button
                  key={n}
                  onClick={() => setBatchLimit(n)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    batchLimit === n && batchLimit !== 0
                      ? 'text-white' : ''
                  }`}
                  style={batchLimit === n && batchLimit !== 0
                    ? { backgroundColor: '#F5A623', color: '#1B1B1A' }
                    : { backgroundColor: '#F4F1EA', color: '#5E6680' }
                  }
                >
                  {n} 个
                </button>
              ))}
              <button
                onClick={() => setBatchLimit(0)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all`}
                style={batchLimit === 0
                  ? { backgroundColor: '#F5A623', color: '#1B1B1A' }
                  : { backgroundColor: '#F4F1EA', color: '#5E6680' }
                }
              >
                全部未分析 ({(statsData as any)?.pending_analysis || '?'})
              </button>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4"
              style={{ borderTop: '1px solid #D8D2C2' }}>
              <button onClick={() => setShowBatchDialog(false)} className="btn-secondary">
                取消
              </button>
              <button onClick={handleStartBatchAnalysis}
                className="btn-primary">
                开始分析
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 手动更新面板 */}
      <ManualUpdateModal
        isOpen={showManualUpdate}
        onClose={() => setShowManualUpdate(false)}
        onComplete={handleManualUpdateComplete}
      />

      {/* 进度覆盖层 */}
      {showCollectProgress && collectProgress && (
        <ProgressOverlay
          isOpen={true}
          title="数据收集"
          progress={collectProgress.progress}
          currentStep={collectProgress.currentStep}
          steps={collectProgress.steps}
          status={collectProgress.status === 'pending' ? 'running' : collectProgress.status}
          error={collectProgress.error}
          onClose={() => {
            setShowCollectProgress(false)
            setCollectTaskId(null)
            resetCollectProgress()
          }}
        />
      )}

      {/* 批量分析进度覆盖层 */}
      {showBatchProgress && batchProgress && (
        <ProgressOverlay
          isOpen={true}
          title="批量AI分析"
          progress={batchProgress.progress}
          currentStep={batchProgress.currentStep}
          steps={batchProgress.steps}
          status={batchProgress.status === 'pending' ? 'running' : batchProgress.status}
          error={batchProgress.error}
          onClose={() => {
            setShowBatchProgress(false)
            setBatchTaskId(null)
            resetBatchProgress()
          }}
        />
      )}

      {/* 标题和操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#1B1B1A' }}>热点看板</h1>
          <p className="text-xs mt-0.5" style={{ color: '#5E6680' }}>实时追踪AI行业动态，智能分析业务影响</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isCollecting}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            <RefreshCw size={14} className={isCollecting ? 'animate-spin' : ''} />
            <span>{isCollecting ? '更新中...' : '手动更新'}</span>
          </button>
          <button
            onClick={handleOpenBatchDialog}
            disabled={isBatchAnalyzing}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            <Target size={14} />
            <span>{isBatchAnalyzing ? '分析中...' : '批量分析'}</span>
          </button>
          <button
            onClick={() => setShowAdvancedFilter(true)}
            className="btn-primary text-xs px-3 py-1.5"
            style={{ backgroundColor: '#F5A623', color: '#1B1B1A', border: '1px solid #E09512' }}
          >
            <Filter size={14} />
            <span>高级筛选</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-[11px] font-bold rounded"
                style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 统计卡片 — 紧凑信息架构风 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium" style={{ color: '#5E6680' }}>{stat.label}</span>
              <stat.icon size={14} style={{ color: stat.label === '紧急事项' ? '#F23645' : '#8B95B0' }} />
            </div>
            <span className="data-value-lg font-semibold" style={{ color: '#1B1B1A' }}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* 搜索 + 重要性标签 */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#8B95B0' }} />
            <input
              type="text"
              placeholder="搜索热点..."
              className="input pl-9 py-2 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {importanceLevels.map((level) => {
              const isActive = selectedImportance === level.id
              const dotColor = level.color
                ? level.color === 'bg-red-500' ? '#F23645'
                  : level.color === 'bg-orange-500' ? '#F5A623'
                  : level.color === 'bg-yellow-500' ? '#C4A02E'
                  : level.color === 'bg-blue-500' ? '#3E5C9A'
                  : '#8B95B0'
                : '#8B95B0'
              return (
                <button
                  key={level.id}
                  onClick={() => { setSelectedImportance(level.id); setPage(1) }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all"
                  style={{
                    backgroundColor: isActive ? '#1A2332' : 'transparent',
                    color: isActive ? '#E8ECF4' : '#5E6680',
                    border: isActive ? 'none' : '1px solid #D8D2C2'
                  }}
                >
                  {level.color && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
                  )}
                  <span>{level.label}</span>
                  <span className="ml-0.5 opacity-60">{level.count}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 活动筛选条件 */}
      {activeFilterCount > 0 && (
        <div className="card p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-xs" style={{ color: '#5E6680' }}>筛选中：</span>
              {advancedFilters.importance_levels.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded"
                  style={{ backgroundColor: '#EBEFF6', color: '#3E5C9A' }}>
                  <span>级别: {advancedFilters.importance_levels.join(', ')}</span>
                  <button
                    onClick={() => setAdvancedFilters((prev) => ({ ...prev, importance_levels: [] }))}
                  >×</button>
                </span>
              )}
              {(advancedFilters.date_from || advancedFilters.date_to) && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded"
                  style={{ backgroundColor: '#FEF7E6', color: '#936415' }}>
                  <span>日期: {advancedFilters.date_from || '不限'} ~ {advancedFilters.date_to || '不限'}</span>
                  <button
                    onClick={() => setAdvancedFilters((prev) => ({ ...prev, date_from: '', date_to: '' }))}
                  >×</button>
                </span>
              )}
              {advancedFilters.is_favorite !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded"
                  style={{ backgroundColor: '#EBEFF6', color: '#3E5C9A' }}>
                  <span>{advancedFilters.is_favorite === 'yes' ? '已收藏' : '未收藏'}</span>
                  <button
                    onClick={() => setAdvancedFilters((prev) => ({ ...prev, is_favorite: 'all' }))}
                  >×</button>
                </span>
              )}
            </div>
            <button
              onClick={() => setShowDismissDialog(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all"
              style={{ color: '#F23645' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(242, 54, 69, 0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Trash2 size={13} />
              <span>批量忽略</span>
            </button>
          </div>
        </div>
      )}

      {/* 批量忽略确认对话框 */}
      {showDismissDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(26, 35, 50, 0.5)' }}
            onClick={() => setShowDismissDialog(false)} />
          <div className="relative bg-white rounded-lg shadow-modal p-6 w-full max-w-sm mx-4"
            style={{ border: '1px solid #D8D2C2' }}>
            <h3 className="text-base font-semibold" style={{ color: '#1B1B1A' }}>确认批量忽略</h3>
            <p className="mt-2 text-sm" style={{ color: '#5E6680' }}>
              将忽略当前筛选条件下的所有热点，忽略后热点将从列表中消失。
            </p>
            <div className="flex justify-end gap-3 mt-6 pt-4"
              style={{ borderTop: '1px solid #D8D2C2' }}>
              <button onClick={() => setShowDismissDialog(false)} className="btn-secondary text-sm">
                取消
              </button>
              <button onClick={handleBatchDismiss} className="btn-danger text-sm">
                确认忽略
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 热点列表 */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid #D8D2C2' }}>
          <h2 className="text-sm font-semibold" style={{ color: '#1B1B1A' }}>最新热点</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: '#8B95B0' }}>排序：</span>
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split(':')
                setSortBy(newSortBy)
                setSortOrder(newSortOrder)
                setPage(1)
              }}
              className="text-xs rounded-md px-2 py-1"
              style={{ border: '1px solid #D8D2C2', backgroundColor: '#FFFFFF', color: '#1B1B1A' }}
            >
              <option value="publish_date:desc">最新发布</option>
              <option value="relevance_score:desc">相关度最高</option>
              <option value="importance_level:asc">重要度最高</option>
            </select>
          </div>
        </div>
        <div className="divide-y" style={{ borderColor: '#D8D2C2' }}>
          {hotspotsData?.items && hotspotsData.items.length > 0 ? (
            hotspotsData.items.map((hotspot: Hotspot) => (
              <div key={hotspot.id} className="card-hover px-5 py-4 cursor-pointer"
                onClick={() => handleHotspotClick(hotspot.id)}>
                <div className="flex items-start gap-4">
                  {/* 左侧：重要性条 */}
                  <div className="shrink-0 w-1 self-stretch rounded-full" style={{
                    backgroundColor: !hotspot.has_analysis ? '#D8D2C2'
                      : hotspot.analysis_importance_level === 'emergency' ? '#F23645'
                      : hotspot.analysis_importance_level === 'high' ? '#F5A623'
                      : hotspot.analysis_importance_level === 'medium' ? '#3E5C9A'
                      : hotspot.analysis_importance_level === 'low' ? '#00B96B'
                      : '#D8D2C2'
                  }} />

                  <div className="flex-1 min-w-0">
                    {/* 元信息行 */}
                    <div className="flex items-center gap-2 mb-1.5">
                      {hotspot.has_analysis ? (
                        <span className="badge text-[11px]"
                          style={{
                            backgroundColor: hotspot.analysis_importance_level === 'emergency' ? '#FEF0F0'
                              : hotspot.analysis_importance_level === 'high' ? '#FEF7E6'
                              : hotspot.analysis_importance_level === 'medium' ? '#EBEFF6'
                              : hotspot.analysis_importance_level === 'low' ? '#E6F7EE'
                              : '#F4F1EA',
                            color: hotspot.analysis_importance_level === 'emergency' ? '#F23645'
                              : hotspot.analysis_importance_level === 'high' ? '#936415'
                              : hotspot.analysis_importance_level === 'medium' ? '#3E5C9A'
                              : hotspot.analysis_importance_level === 'low' ? '#008C4A'
                              : '#5E6680'
                          }}>
                          {hotspot.analysis_importance_level === 'emergency' ? '紧急'
                            : hotspot.analysis_importance_level === 'high' ? '高'
                            : hotspot.analysis_importance_level === 'medium' ? '中'
                            : hotspot.analysis_importance_level === 'low' ? '低'
                            : hotspot.analysis_importance_level}
                        </span>
                      ) : (
                        <span className="badge text-[11px]"
                          style={{ backgroundColor: '#F4F1EA', color: '#8B95B0' }}>
                          未分析
                        </span>
                      )}
                      <span className="text-[11px] font-medium" style={{ color: '#3E5C9A' }}>
                        {hotspot.source_name || hotspot.source_type}
                      </span>
                      <span className="text-[11px]" style={{ color: '#8B95B0' }}>
                        {new Date(hotspot.publish_date).toLocaleDateString('zh-CN')}
                      </span>
                    </div>

                    {/* 标题 */}
                    <h3 className="text-sm font-semibold mb-1.5 line-clamp-1" style={{ color: '#1B1B1A' }}>
                      {hotspot.title}
                    </h3>

                    {/* 摘要 */}
                    {hotspot.has_analysis ? (
                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: '#5E6680' }}>
                        {hotspot.analysis_content_summary || renderSafeSummary(hotspot.summary)}
                      </p>
                    ) : (
                      <p className="text-xs leading-relaxed line-clamp-1 italic" style={{ color: '#8B95B0' }}>
                        {renderSafeSummary(hotspot.summary)?.slice(0, 80)}...
                      </p>
                    )}

                    {/* 底部操作栏 */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        {!hotspot.has_analysis && (
                          <button
                            onClick={(e) => handleQuickAnalyze(e, hotspot.id)}
                            disabled={analyzingHotspots.has(hotspot.id)}
                            className="text-[11px] font-medium px-2.5 py-1 rounded-md transition-all"
                            style={{
                              backgroundColor: '#F4F1EA',
                              color: '#3E5C9A',
                              border: '1px solid #D8D2C2'
                            }}
                          >
                            {analyzingHotspots.has(hotspot.id) ? '分析中...' : 'AI分析'}
                          </button>
                        )}
                        <div className="flex gap-1.5">
                          {hotspot.tags.slice(0, 3).map((tag: string) => (
                            <span key={tag} className="text-[11px] px-2 py-0.5 rounded"
                              style={{ backgroundColor: '#F4F1EA', color: '#5E6680' }}>
                              {tag}
                            </span>
                          ))}
                          {hotspot.tags.length > 3 && (
                            <span className="text-[11px] px-2 py-0.5 rounded"
                              style={{ backgroundColor: '#F4F1EA', color: '#8B95B0' }}>
                              +{hotspot.tags.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {hotspot.has_analysis && (
                          <span className="text-xs data-value" style={{ color: '#5E6680' }}>
                            相关度 <span className="font-semibold" style={{ color: '#1B1B1A' }}>{hotspot.analysis_relevance_score ?? 0}%</span>
                          </span>
                        )}
                        <FavoriteButton hotspotId={hotspot.id} isFavorite={hotspot.is_favorite || false} size="sm" />
                        <span className="text-xs font-medium flex items-center gap-1"
                          style={{ color: '#3E5C9A' }}>
                          详情
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg mb-3"
                style={{ backgroundColor: '#F4F1EA' }}>
                <BarChart3 size={20} style={{ color: '#8B95B0' }} />
              </div>
              <p className="text-sm font-medium" style={{ color: '#5E6680' }}>暂无热点数据</p>
              {activeFilterCount > 0 && (
                <p className="text-xs mt-1" style={{ color: '#8B95B0' }}>当前有筛选条件或所有热点已被忽略</p>
              )}
              <div className="flex justify-center gap-3 mt-4">
                <button onClick={() => refetchHotspots()} className="btn-secondary text-xs">刷新</button>
                <button onClick={handleRefresh} className="btn-primary text-xs">手动更新</button>
              </div>
            </div>
          )}
        </div>
        {/* 分页 */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
          style={{ borderTop: '1px solid #D8D2C2' }}>
          <p className="text-xs" style={{ color: '#8B95B0' }}>
            显示 {hotspotsData?.items?.length || 0} 个，共 {hotspotsData?.total || 0} 个
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevPage}
              disabled={page <= 1}
              className="px-2.5 py-1.5 text-xs font-medium rounded-md transition-all disabled:opacity-30"
              style={{
                border: '1px solid #D8D2C2',
                color: page <= 1 ? '#D8D2C2' : '#5E6680',
                backgroundColor: '#FFFFFF'
              }}
            >
              上一页
            </button>

            {getPageNumbers().map((p, idx) =>
              p === '...' ? (
                <span key={`e${idx}`} className="px-1.5 text-xs" style={{ color: '#8B95B0' }}>...</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className="min-w-[32px] h-8 text-xs font-medium rounded-md transition-all"
                  style={page === p
                    ? { backgroundColor: '#1A2332', color: '#E8ECF4' }
                    : { backgroundColor: 'transparent', color: '#5E6680', border: '1px solid #D8D2C2' }
                  }
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={handleNextPage}
              disabled={page >= totalPages}
              className="px-2.5 py-1.5 text-xs font-medium rounded-md transition-all disabled:opacity-30"
              style={{
                border: '1px solid #D8D2C2',
                color: page >= totalPages ? '#D8D2C2' : '#5E6680',
                backgroundColor: '#FFFFFF'
              }}
            >
              下一页
            </button>

            <div className="flex items-center gap-1 ml-3">
              <span className="text-xs" style={{ color: '#8B95B0' }}>跳至</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                defaultValue={page}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = parseInt((e.target as HTMLInputElement).value, 10)
                    if (val >= 1 && val <= totalPages) {
                      setPage(val)
                    }
                  }
                }}
                className="w-14 px-2 py-1.5 text-xs text-center rounded-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                style={{ border: '1px solid #D8D2C2', color: '#1B1B1A', backgroundColor: '#FFFFFF' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 来源分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#1B1B1A' }}>热点来源分布</h3>
          <div className="h-48 flex items-center justify-center rounded-md"
            style={{ backgroundColor: '#F4F1EA' }}>
            <span className="text-xs" style={{ color: '#8B95B0' }}>图表区域 · 来源分布图</span>
          </div>
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#1B1B1A' }}>重要性分布</h3>
          <div className="space-y-3">
            {importanceLevels.slice(1).map((level) => {
              const barColor = level.id === 'emergency' ? '#F23645'
                : level.id === 'high' ? '#F5A623'
                : level.id === 'medium' ? '#3E5C9A'
                : level.id === 'low' ? '#00B96B'
                : '#8B95B0'
              const maxCount = Math.max(...importanceLevels.slice(1).map(l => l.count), 1)
              return (
                <div key={level.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: barColor }} />
                      <span className="text-xs font-medium" style={{ color: '#5E6680' }}>{level.label}</span>
                    </div>
                    <span className="data-value font-semibold" style={{ color: '#1B1B1A' }}>{level.count}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: '#F4F1EA' }}>
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (level.count / maxCount) * 100)}%`,
                        backgroundColor: barColor
                      }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {/* 高级筛选模态框 */}
      <AdvancedFilterModal
        isOpen={showAdvancedFilter}
        onClose={() => setShowAdvancedFilter(false)}
        onApply={handleApplyAdvancedFilters}
        initialFilters={advancedFilters}
      />
    </div>
  )
}

export default Dashboard
