import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Search, Filter, Clock, TrendingUp, AlertTriangle,
  BarChart3, RefreshCw, Target, Trash2, Zap
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { hotspotsApi, collectionApi, analysisApi, userActionsApi, userSettingsApi, type PaginatedResponse, type Hotspot } from '../services/api'
import AdvancedFilterModal, { type AdvancedFilters } from '../components/AdvancedFilterModal'
import QuickAnalysisModal from '../components/QuickAnalysisModal'
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
  by_source?: Record<string, number>
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

  // 一键分析
  const [showQuickAnalysis, setShowQuickAnalysis] = useState(false)

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

  // 获取用户设置（用于默认值）
  const { data: userSettings } = useQuery({
    queryKey: ['user-settings', userId],
    queryFn: async () => {
      try {
        const res = await userSettingsApi.getSettings(userId)
        return res as any
      } catch { return null }
    },
    enabled: !!userId,
    staleTime: 300000,
  })

  // 用设置值覆盖硬编码默认值
  const limit = parseInt(userSettings?.items_per_page || '10', 10)
  const defaultSortMap: Record<string, string> = { relevance: 'relevance_score', importance: 'importance_level', date: 'publish_date' }
  const defaultSort = userSettings?.default_sort ? (defaultSortMap[userSettings.default_sort] || 'publish_date') : 'publish_date'
  const [sortBy, setSortBy] = useState(defaultSort)
  const [sortOrder, setSortOrder] = useState('desc')
  // 当设置加载后同步 sortBy
  useEffect(() => { setSortBy(defaultSort) }, [userSettings?.default_sort])

  // 获取热点列表
  const { data: hotspotsData, isLoading: isLoadingHotspots, refetch: refetchHotspots } = useQuery<PaginatedResponse<Hotspot>>({
    queryKey: ['hotspots', page, limit, selectedImportance, searchQuery, sortBy, sortOrder, advancedFilters, refreshCounter],
    queryFn: async () => {
      const response = await hotspotsApi.getHotspots({
        page,
        limit,
        importance_levels: !isShowingDismissed && selectedImportance !== 'all' ? selectedImportance : advancedFilters.importance_levels.length > 0 ? advancedFilters.importance_levels.join(',') : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        user_id: userId,
        is_dismissed: isShowingDismissed ? true : false,
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

  // 重要性级别筛选 + 已忽略
  const isShowingDismissed = selectedImportance === 'dismissed'
  const importanceLevels = [
    { id: 'all', label: '全部', count: hotspotsData?.total || 0 },
    { id: 'emergency', label: '紧急', count: statsData?.emergency_count || 0, color: 'bg-red-500' },
    { id: 'high', label: '高', count: statsData?.high_count || 0, color: 'bg-orange-500' },
    { id: 'medium', label: '中', count: statsData?.medium_count || 0, color: 'bg-yellow-500' },
    { id: 'low', label: '低', count: statsData?.low_count || 0, color: 'bg-blue-500' },
    { id: 'dismissed', label: '已忽略', count: 0, color: 'bg-gray-400' },
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载热点数据...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 批量分析选择对话框 */}
      {showBatchDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowBatchDialog(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-2">批量AI分析</h3>
            <p className="text-gray-600 mb-6">选择要分析的热点数量：</p>
            <div className="flex flex-wrap gap-3 mb-6">
              {[5, 10, 20, 50].map((n) => (
                <button
                  key={n}
                  onClick={() => setBatchLimit(n)}
                  className={`px-5 py-2.5 rounded-lg font-medium transition-colors ${
                    batchLimit === n && batchLimit !== 0
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {n} 个
                </button>
              ))}
              <button
                onClick={() => setBatchLimit(0)}
                className={`px-5 py-2.5 rounded-lg font-medium transition-colors ${
                  batchLimit === 0
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                全部未分析 ({(statsData as any)?.pending_analysis || '?'})
              </button>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowBatchDialog(false)}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleStartBatchAnalysis}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">热点看板</h1>
          <p className="text-gray-600 mt-1">实时追踪AI行业动态，智能分析业务影响</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowQuickAnalysis(true)}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-bold flex items-center space-x-2 shadow-lg shadow-indigo-500/30 animate-pulse"
          >
            <Zap size={20} />
            <span className="text-base">一键更新解析热点</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={isCollecting}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 flex items-center space-x-2 shadow-sm shadow-amber-500/20"
          >
            <RefreshCw size={16} className={isCollecting ? 'animate-spin' : ''} />
            <span>{isCollecting ? '更新中...' : '手动更新'}</span>
          </button>
          <button
            onClick={handleOpenBatchDialog}
            disabled={isBatchAnalyzing}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-lg hover:from-cyan-600 hover:to-teal-600 disabled:opacity-50 flex items-center space-x-2 shadow-sm shadow-cyan-500/20"
          >
            <Target size={16} />
            <span>{isBatchAnalyzing ? '分析中...' : '批量分析'}</span>
          </button>
          <button
            onClick={() => setShowAdvancedFilter(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 flex items-center space-x-2 shadow-sm shadow-blue-500/20"
          >
            <Filter size={16} />
            <span>高级筛选</span>
            {activeFilterCount > 0 && (
              <span className="bg-white/20 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 统计卡片 — 紧凑版 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm px-5 py-4 flex items-center justify-between min-h-0">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-0.5">{stat.label}</p>
              <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
            </div>
            <div className={`p-2.5 rounded-lg ${stat.color.replace('text', 'bg')} bg-opacity-10`}>
              <stat.icon className={stat.color} size={20} />
            </div>
          </div>
        ))}
      </div>

      {/* 筛选栏 — 紧凑版 */}
      <div className="bg-white rounded-xl shadow-sm px-5 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="搜索热点..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {importanceLevels.map((level) => (
              <button
                key={level.id}
                onClick={() => { setSelectedImportance(level.id); setPage(1) }}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                  selectedImportance === level.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:bg-gray-100 border border-transparent'
                }`}
              >
                {level.color && <div className={`w-1.5 h-1.5 rounded-full ${level.color}`} />}
                <span>{level.label}</span>
                <span className="text-[11px] text-gray-400 ml-0.5">{level.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 活动筛选条件 */}
      {activeFilterCount > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-sm text-gray-500">筛选中：</span>
              {advancedFilters.importance_levels.length > 0 && (
                <span className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                  <span>级别: {advancedFilters.importance_levels.join(', ')}</span>
                  <button
                    onClick={() => setAdvancedFilters((prev) => ({ ...prev, importance_levels: [] }))}
                    className="ml-1 hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              )}
              {(advancedFilters.date_from || advancedFilters.date_to) && (
                <span className="inline-flex items-center space-x-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                  <span>日期: {advancedFilters.date_from || '不限'} ~ {advancedFilters.date_to || '不限'}</span>
                  <button
                    onClick={() => setAdvancedFilters((prev) => ({ ...prev, date_from: '', date_to: '' }))}
                    className="ml-1 hover:text-green-900"
                  >
                    ×
                  </button>
                </span>
              )}
              {advancedFilters.is_favorite !== 'all' && (
                <span className="inline-flex items-center space-x-1 px-3 py-1 bg-pink-50 text-pink-700 rounded-full text-sm">
                  <span>{advancedFilters.is_favorite === 'yes' ? '已收藏' : '未收藏'}</span>
                  <button
                    onClick={() => setAdvancedFilters((prev) => ({ ...prev, is_favorite: 'all' }))}
                    className="ml-1 hover:text-pink-900"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
            <button
              onClick={() => setShowDismissDialog(true)}
              className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium"
            >
              <Trash2 size={16} />
              <span>批量忽略</span>
            </button>
          </div>
        </div>
      )}

      {/* 批量忽略确认对话框 */}
      {showDismissDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDismissDialog(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-2">确认批量忽略</h3>
            <p className="text-gray-600 mb-6">
              将忽略当前筛选条件下的所有热点，忽略后热点将从列表中消失。确定要执行此操作吗？
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDismissDialog(false)}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleBatchDismiss}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                确认忽略
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 热点列表 — 三列卡片 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">最新热点</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">排序：</span>
            <select value={`${sortBy}:${sortOrder}`}
              onChange={(e) => { const [ns, no] = e.target.value.split(':'); setSortBy(ns); setSortOrder(no); setPage(1) }}
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-indigo-500">
              <option value="publish_date:desc">最新发布</option>
              <option value="relevance_score:desc">相关度最高</option>
              <option value="importance_level:asc">重要度最高</option>
            </select>
          </div>
        </div>

        {hotspotsData?.items && hotspotsData.items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {hotspotsData.items.map((hotspot: Hotspot) => (
              <div key={hotspot.id} onClick={() => handleHotspotClick(hotspot.id)}
                className="card card-hover flex flex-col cursor-pointer overflow-hidden"
                style={{ height: '50vh', minHeight: '320px', maxHeight: '480px' }}>
                {/* 顶部色条 */}
                <div className="h-1 shrink-0" style={{
                  backgroundColor: !hotspot.has_analysis ? '#E5E7EB'
                    : hotspot.analysis_importance_level === 'emergency' ? '#EF4444'
                    : hotspot.analysis_importance_level === 'high' ? '#F97316'
                    : hotspot.analysis_importance_level === 'medium' ? '#6366F1'
                    : hotspot.analysis_importance_level === 'low' ? '#22C55E' : '#E5E7EB'
                }} />
                <div className="p-5 flex-1 flex flex-col">
                  {/* 顶部：重要性 + 来源 + 日期 */}
                  <div className="flex items-center gap-2 mb-3 shrink-0">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md ${
                      !hotspot.has_analysis ? 'bg-gray-50 text-gray-500 border border-dashed border-gray-300'
                      : hotspot.analysis_importance_level === 'emergency' ? 'bg-red-50 text-red-700'
                      : hotspot.analysis_importance_level === 'high' ? 'bg-orange-50 text-orange-700'
                      : hotspot.analysis_importance_level === 'medium' ? 'bg-indigo-50 text-indigo-700'
                      : hotspot.analysis_importance_level === 'low' ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        !hotspot.has_analysis ? 'bg-gray-400'
                        : hotspot.analysis_importance_level === 'emergency' ? 'bg-red-500'
                        : hotspot.analysis_importance_level === 'high' ? 'bg-orange-500'
                        : hotspot.analysis_importance_level === 'medium' ? 'bg-indigo-500'
                        : hotspot.analysis_importance_level === 'low' ? 'bg-green-500'
                        : 'bg-gray-400'
                      }`} />
                      {!hotspot.has_analysis ? '未分析'
                        : hotspot.analysis_importance_level === 'emergency' ? '紧急'
                        : hotspot.analysis_importance_level === 'high' ? '高'
                        : hotspot.analysis_importance_level === 'medium' ? '中'
                        : hotspot.analysis_importance_level === 'low' ? '低'
                        : hotspot.analysis_importance_level}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">{hotspot.source_name || hotspot.source_type}</span>
                    <span className="text-xs text-gray-400 ml-auto">{new Date(hotspot.publish_date).toLocaleDateString('zh-CN')}</span>
                  </div>

                  {/* 标题 */}
                  <h3 className="text-base font-bold text-gray-900 mb-3 leading-snug line-clamp-2">{hotspot.title}</h3>

                  {/* 内容区 */}
                  <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin space-y-3">
                    {hotspot.has_analysis ? (
                      <>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {hotspot.analysis_content_summary || renderSafeSummary(hotspot.summary)}
                        </p>
                        {(hotspot as any).analysis?.business_impact && (
                          <p className="text-sm text-gray-500 leading-relaxed border-l-2 border-indigo-300 pl-3">
                            <span className="font-medium text-indigo-600">影响：</span>{(hotspot as any).analysis.business_impact}
                          </p>
                        )}
                        {(hotspot as any).analysis?.action_suggestions && (
                          <p className="text-sm text-gray-500 leading-relaxed border-l-2 border-amber-300 pl-3">
                            <span className="font-medium text-amber-600">建议：</span>{(hotspot as any).analysis.action_suggestions}
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col h-full">
                        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
                          <p className="text-sm text-gray-500 leading-relaxed">{renderSafeSummary(hotspot.summary)?.slice(0, 200)}...</p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-dashed border-gray-200 text-center">
                          <span className="text-xs text-gray-400 mb-2 block">尚未进行 AI 分析</span>
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => setShowQuickAnalysis(true)}
                              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs rounded-lg hover:from-indigo-600 hover:to-purple-600 font-medium shadow-sm shadow-indigo-500/20">
                              一键更新解析
                            </button>
                            <button onClick={e => handleQuickAnalyze(e, hotspot.id)} disabled={analyzingHotspots.has(hotspot.id)}
                              className="px-4 py-2 border border-indigo-300 text-indigo-600 text-xs rounded-lg hover:bg-indigo-50 font-medium disabled:opacity-50">
                              {analyzingHotspots.has(hotspot.id) ? '分析中' : '单条分析'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 标签 + 相关度条 */}
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2.5 shrink-0">
                    {hotspot.tags.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {hotspot.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">{tag}</span>
                        ))}
                        {hotspot.tags.length > 3 && <span className="text-[11px] px-1.5 py-0.5 text-gray-400">+{hotspot.tags.length - 3}</span>}
                      </div>
                    )}
                    {hotspot.has_analysis && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{
                            width: `${hotspot.analysis_relevance_score ?? 0}%`,
                            background: 'linear-gradient(90deg, #6366F1, #8B5CF6)'
                          }} />
                        </div>
                        <span className="text-xs font-semibold text-indigo-500">{hotspot.analysis_relevance_score ?? 0}%</span>
                      </div>
                    )}
                  </div>

                  {/* 操作栏 */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 shrink-0">
                    <div className="flex items-center gap-2">
                      {isShowingDismissed && (
                        <button onClick={e => { e.stopPropagation(); userActionsApi.undismiss(userId, hotspot.id).then(() => { addToast('已恢复', 'success'); refetchHotspots(); refetchStats() }).catch(() => addToast('恢复失败', 'error')) }}
                          className="text-xs px-3 py-1.5 rounded-md bg-green-50 text-green-600 hover:bg-green-100 font-medium">恢复</button>
                      )}
                      <FavoriteButton hotspotId={hotspot.id} isFavorite={hotspot.is_favorite || false} size="sm" />
                    </div>
                    <div className="flex items-center gap-3 text-gray-400">
                      <button className="hover:text-indigo-500 transition-colors" title="赞同"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg></button>
                      <button className="hover:text-red-400 transition-colors" title="反对"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10zM17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg></button>
                      <button className="hover:text-blue-400 transition-colors" title="评论"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center">
            <p className="text-gray-500">暂无热点数据</p>
            {activeFilterCount > 0 && <p className="text-sm text-gray-400 mt-1">当前有筛选条件或所有热点已被忽略</p>}
            <div className="flex justify-center gap-3 mt-4">
              <button onClick={() => refetchHotspots()} className="btn-secondary text-sm">刷新</button>
              <button onClick={handleRefresh} className="btn-primary text-sm">手动更新</button>
            </div>
          </div>
        )}

        {/* 分页 */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-500">共 {hotspotsData?.total || 0} 个热点</p>
          <div className="flex items-center gap-1">
            <button onClick={handlePrevPage} disabled={page <= 1}
              className="px-2.5 py-1.5 text-xs font-medium border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-30">上一页</button>
            {getPageNumbers().map((p, idx) =>
              p === '...' ? <span key={`e${idx}`} className="px-1 text-xs text-gray-400">...</span>
                : <button key={p} onClick={() => setPage(p)}
                    className={`min-w-[32px] h-8 text-xs font-medium rounded-md transition-colors ${page === p ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100 border border-gray-300'}`}>{p}</button>
            )}
            <button onClick={handleNextPage} disabled={page >= totalPages}
              className="px-2.5 py-1.5 text-xs font-medium border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-30">下一页</button>
            <div className="flex items-center gap-1 ml-2">
              <span className="text-xs text-gray-400">跳至</span>
              <input type="number" min={1} max={totalPages} defaultValue={page}
                onKeyDown={e => { if (e.key === 'Enter') { const v = parseInt((e.target as HTMLInputElement).value, 10); if (v >= 1 && v <= totalPages) setPage(v) } }}
                className="w-14 px-2 py-1.5 text-xs text-center border border-gray-300 rounded-md [appearance:textfield]" />
            </div>
          </div>
        </div>
      </div>

      {/* 来源分布 + 趋势 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">热点来源分布</h3>
          {statsData?.by_source && Object.keys(statsData.by_source).length > 0 ? (
            <div className="flex items-center justify-center gap-8 h-64">
              {/* SVG Donut Chart */}
              <svg width="160" height="160" viewBox="0 0 160 160">
                {(() => {
                  const data = Object.entries(statsData.by_source!).map(([k, v]) => ({ label: k, value: v }))
                  const total = data.reduce((s, d) => s + d.value, 0)
                  const colors = ['#3B82F6', '#F59E0B', '#22C55E', '#8B5CF6', '#EF4444', '#06B6D4', '#F97316']
                  let cumPct = 0
                  const r = 60, cx = 80, cy = 80, ir = 40
                  const segments = data.map((d, i) => {
                    const pct = d.value / total
                    const startAngle = cumPct * 360 - 90
                    const endAngle = (cumPct + pct) * 360 - 90
                    cumPct += pct
                    const startRad = startAngle * Math.PI / 180
                    const endRad = endAngle * Math.PI / 180
                    const x1 = cx + r * Math.cos(startRad)
                    const y1 = cy + r * Math.sin(startRad)
                    const x2 = cx + r * Math.cos(endRad)
                    const y2 = cy + r * Math.sin(endRad)
                    const largeArc = pct > 0.5 ? 1 : 0
                    return <path key={d.label} d={`M ${cx} ${cy - ir}
                      L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}
                      L ${cx} ${cy - ir}`} fill={colors[i % colors.length]} opacity="0.85" />
                  })
                  // inner hole
                  segments.push(<circle key="hole" cx={cx} cy={cy} r={ir} fill="white" />)
                  return segments
                })()}
                <text x="80" y="76" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#111827">
                  {Object.values(statsData.by_source!).reduce<number>((a, b) => a + Number(b), 0)}
                </text>
                <text x="80" y="94" textAnchor="middle" fontSize="11" fill="#6B7280">总计</text>
              </svg>
              {/* Legend */}
              <div className="space-y-2">
                {Object.entries(statsData.by_source).map(([key, val], i) => {
                  const colors = ['#3B82F6', '#F59E0B', '#22C55E', '#8B5CF6', '#EF4444', '#06B6D4', '#F97316']
                  const srcValues = Object.values(statsData.by_source!).filter(v => typeof v === 'number') as number[]
                  const total = srcValues.reduce((a, b) => a + b, 0)
                  const labels: Record<string, string> = { NEWS: '新闻', TECH_BLOG: '技术博客', SOCIAL_MEDIA: '社交媒体', ACADEMIC: '学术', OTHER: '其他' }
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colors[i % colors.length] }} />
                      <span className="text-xs text-gray-600">{labels[key] || key}</span>
                      <span className="text-xs font-medium text-gray-900">{val}</span>
                      <span className="text-[11px] text-gray-400">({Math.round((val / total) * 100)}%)</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">暂无数据</div>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">重要性分布</h3>
          <div className="space-y-4">
            {importanceLevels.slice(1).filter(l => l.color).map((level) => (
              <div key={level.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${level.color}`}></div>
                  <span className="text-gray-700">{level.label}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${level.color}`}
                      style={{ width: `${(level.count / Math.max(...importanceLevels.slice(1).filter(l => l.color).map(l => l.count), 1)) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{level.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* 一键分析模态框 */}
      <QuickAnalysisModal
        userId={userId}
        isOpen={showQuickAnalysis}
        onClose={() => setShowQuickAnalysis(false)}
        onComplete={() => {
          refetchHotspots()
          refetchStats()
        }}
      />

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
