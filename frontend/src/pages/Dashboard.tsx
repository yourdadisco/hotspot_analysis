import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search, Filter, Clock, TrendingUp, AlertTriangle,
  BarChart3, ChevronRight, RefreshCw, Target, Trash2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { hotspotsApi, collectionApi, analysisApi, userActionsApi, type PaginatedResponse, type Hotspot } from '../services/api'
import AdvancedFilterModal, { type AdvancedFilters } from '../components/AdvancedFilterModal'
import ImportanceBadge from '../components/ImportanceBadge'
import FavoriteButton from '../components/FavoriteButton'
import ProgressOverlay from '../components/ProgressOverlay'
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
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [sortBy, setSortBy] = useState('collected_at')
  const [sortOrder, setSortOrder] = useState('desc')

  // 高级筛选
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    importance_levels: [],
    date_from: '',
    date_to: '',
    source_types: '',
    is_favorite: 'all',
  })
  const [showDismissDialog, setShowDismissDialog] = useState(false)

  // 收集进度
  const [collectTaskId, setCollectTaskId] = useState<string | null>(null)
  const [showCollectProgress, setShowCollectProgress] = useState(false)
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

  // 获取热点列表
  const { data: hotspotsData, isLoading: isLoadingHotspots, refetch: refetchHotspots } = useQuery<PaginatedResponse<Hotspot>>({
    queryKey: ['hotspots', page, limit, selectedImportance, searchQuery, sortBy, sortOrder, advancedFilters],
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
        ...(advancedFilters.source_types && { source_types: advancedFilters.source_types }),
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
      const response = await hotspotsApi.getStats()
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

  // 处理手动更新（异步+进度）
  const handleRefresh = async () => {
    try {
      const result: any = await collectionApi.triggerAsync()
      setCollectTaskId(result.task_id)
      setShowCollectProgress(true)
    } catch {
      addToast('启动更新失败，请稍后重试', 'error')
    }
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
      if (advancedFilters.is_favorite !== 'all') {
        payload.is_favorite = advancedFilters.is_favorite === 'yes'
      }
      const result: any = await userActionsApi.batchDismiss(payload)
      addToast(`已忽略 ${result.dismissed_count} 个热点`, 'success')
      refetchHotspots()
      refetchStats()
    } catch (error: any) {
      addToast(`批量忽略失败: ${error.response?.data?.detail || '未知错误'}`, 'error')
    }
  }

  const activeFilterCount = [
    advancedFilters.importance_levels.length > 0,
    !!advancedFilters.date_from || !!advancedFilters.date_to,
    !!advancedFilters.source_types,
    advancedFilters.is_favorite !== 'all',
  ].filter(Boolean).length

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
    <div className="space-y-6">
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
            onClick={handleRefresh}
            disabled={isCollecting}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center space-x-2"
          >
            <RefreshCw size={16} className={isCollecting ? 'animate-spin' : ''} />
            <span>{isCollecting ? '更新中...' : '手动更新'}</span>
          </button>
          <button
            onClick={handleOpenBatchDialog}
            disabled={isBatchAnalyzing}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <Target size={16} />
            <span>{isBatchAnalyzing ? '分析中...' : '批量分析'}</span>
          </button>
          <button
            onClick={() => setShowAdvancedFilter(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Filter size={16} />
            <span>高级筛选</span>
            {activeFilterCount > 0 && (
              <span className="bg-white text-blue-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm p-6 min-h-[140px] flex flex-col justify-between">
            <div className="flex-1 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <div className="flex items-baseline mt-2">
                  <span className="text-3xl font-bold text-gray-900">{stat.value}</span>
                  <span className={`ml-2 text-sm font-medium ${stat.color}`}>
                    {stat.change}
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-full ${stat.color.replace('text', 'bg')} bg-opacity-10`}>
                <stat.icon className={stat.color} size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="搜索热点标题、内容或标签..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {importanceLevels.map((level) => (
              <button
                key={level.id}
                onClick={() => setSelectedImportance(level.id)}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                  selectedImportance === level.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {level.color && (
                  <div className={`w-2 h-2 rounded-full ${level.color}`}></div>
                )}
                <span>{level.label}</span>
                <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">
                  {level.count}
                </span>
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

      {/* 热点列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">最新热点</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">排序：</span>
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split(':')
                setSortBy(newSortBy)
                setSortOrder(newSortOrder)
                setPage(1)
              }}
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="collected_at:desc">最新发布</option>
              <option value="collected_at:asc">最早发布</option>
              <option value="publish_date:desc">发布时间</option>
              <option value="title:asc">标题排序</option>
            </select>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {hotspotsData?.items && hotspotsData.items.length > 0 ? (
            hotspotsData.items.map((hotspot: Hotspot) => (
              <div key={hotspot.id} className="p-6 hover:bg-gray-50 transition-colors" onClick={() => handleHotspotClick(hotspot.id)}>
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      {hotspot.has_analysis ? (
                        <ImportanceBadge level={hotspot.analysis_importance_level || 'medium'} size="sm" />
                      ) : (
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-200 text-gray-800">
                          未分析
                        </span>
                      )}
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800">
                        {hotspot.source_name || hotspot.source_type}
                      </span>
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-50 text-gray-500">
                        {new Date(hotspot.publish_date).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 break-words line-clamp-1">
                      {hotspot.title}
                    </h3>
                    <p className="text-gray-600 mb-4 line-clamp-2 overflow-hidden break-words">
                      {renderSafeSummary(hotspot.summary)}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {hotspot.tags.slice(0, 3).map((tag: string) => (
                          <span
                            key={tag}
                            className="text-xs px-3 py-1 bg-blue-50 text-blue-700 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {hotspot.tags.length > 3 && (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                            +{hotspot.tags.length - 3}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">
                          相关度: <strong className="text-gray-900">{hotspot.analysis_relevance_score ?? hotspot.analysis?.relevance_score ?? 0}%</strong>
                        </span>
                        <FavoriteButton hotspotId={hotspot.id} isFavorite={hotspot.is_favorite || false} size="sm" />
                        <button className="text-blue-600 hover:text-blue-800 flex items-center space-x-1">
                          <span>查看详情</span>
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500">暂无热点数据</p>
              <button
                onClick={handleRefresh}
                disabled={isCollecting}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isCollecting ? '更新中...' : '刷新热点'}
              </button>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            显示 {hotspotsData?.items?.length || 0} 个热点，共 {hotspotsData?.total || 0} 个
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrevPage}
              disabled={page <= 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <span className="text-sm text-gray-600 min-w-[80px] text-center">
              第 {page}/{totalPages} 页
            </span>
            <button
              onClick={handleNextPage}
              disabled={page >= totalPages}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      </div>

      {/* 来源分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">热点来源分布</h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            图表组件 - 来源分布图
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">重要性分布</h3>
          <div className="space-y-4">
            {importanceLevels.slice(1).map((level) => (
              <div key={level.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${level.color}`}></div>
                  <span className="text-gray-700">{level.label}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${level.color}`}
                      style={{ width: `${(level.count / 24) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{level.count}</span>
                </div>
              </div>
            ))}
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
