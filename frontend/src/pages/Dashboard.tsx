import React, { useState, useEffect, useCallback } from 'react'
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import {
  Search, Filter, BarChart3, RefreshCw, Target, Trash2, ChevronRight
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { hotspotsApi, collectionApi, analysisApi, userActionsApi } from '../services/api'
import AdvancedFilterModal, { type AdvancedFilters } from '../components/AdvancedFilterModal'
import ImportanceBadge from '../components/ImportanceBadge'
import FavoriteButton from '../components/FavoriteButton'
import ProgressOverlay from '../components/ProgressOverlay'
import ManualUpdateModal from '../components/ManualUpdateModal'
import { renderSafeSummary } from '../utils/sanitize'
import { useToastStore } from '../stores/toastStore'
import { useProgressPolling } from '../hooks/useProgressPolling'
import { useWebSocket } from '../hooks/useWebSocket'

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
  const queryClient = useQueryClient()
  const [selectedImportance, setSelectedImportance] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

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
  const [refreshCounter, setRefreshCounter] = useState(0)

  // 收集/分析进度
  const [collectTaskId, setCollectTaskId] = useState<string | null>(null)
  const [showCollectProgress, setShowCollectProgress] = useState(false)
  const [showManualUpdate, setShowManualUpdate] = useState(false)
  const { state: collectProgress, isPolling: isCollecting, reset: resetCollectProgress } =
    useProgressPolling(collectTaskId, (tid) => collectionApi.getProgress(tid))

  const [batchTaskId, setBatchTaskId] = useState<string | null>(null)
  const [showBatchProgress, setShowBatchProgress] = useState(false)
  const { state: batchProgress, isPolling: isBatchAnalyzing, reset: resetBatchProgress } =
    useProgressPolling(batchTaskId, (tid) => analysisApi.getAnalysisProgress(tid))

  const [showBatchDialog, setShowBatchDialog] = useState(false)
  const [batchLimit, setBatchLimit] = useState<number>(12)

  const userId = localStorage.getItem('user_id') || ''

  useWebSocket(userId || null, () => {})

  const limit = 12

  // 无限滚动
  const isShowingDismissed = selectedImportance === 'dismissed'

  const {
    data: feedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingFeed,
    refetch: refetchFeed,
  } = useInfiniteQuery({
    queryKey: ['hotspots-feed', selectedImportance, searchQuery, advancedFilters, refreshCounter],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await hotspotsApi.getHotspots({
        page: pageParam,
        limit,
        importance_levels: !isShowingDismissed && selectedImportance !== 'all' ? selectedImportance
          : advancedFilters.importance_levels.length > 0 ? advancedFilters.importance_levels.join(',') : undefined,
        sort_by: 'publish_date',
        sort_order: 'desc',
        user_id: userId,
        is_dismissed: isShowingDismissed ? true : false,
        ...(advancedFilters.date_from && { date_from: advancedFilters.date_from }),
        ...(advancedFilters.date_to && { date_to: advancedFilters.date_to }),
        ...(advancedFilters.source_names && { source_names: advancedFilters.source_names }),
        ...(advancedFilters.is_favorite !== 'all' && { is_favorite: advancedFilters.is_favorite === 'yes' }),
        ...(searchQuery && { q: searchQuery }),
      })
      return { ...res, items: res.items || [] }
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.total_pages) return lastPage.page + 1
      return undefined
    },
    initialPageParam: 1,
    enabled: !!userId,
  })

  const hotspots = feedData?.pages.flatMap(p => p.items) || []

  // 统计
  const { data: statsData, refetch: refetchStats } = useQuery<Stats>({
    queryKey: ['hotspots-stats'],
    queryFn: async () => {
      const res = await hotspotsApi.getStats(userId)
      return res
    },
    enabled: !!userId,
  })

  // 底部哨兵
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    }, { rootMargin: '300px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // 进度完成
  useEffect(() => {
    if (!collectProgress) return
    if (collectProgress.status === 'completed') {
      addToast('热点数据更新完成！', 'success')
      setShowCollectProgress(false)
      setCollectTaskId(null)
      refetchFeed()
      refetchStats()
      resetCollectProgress()
    } else if (collectProgress.status === 'failed') {
      addToast(`更新失败: ${collectProgress.error || '未知错误'}`, 'error')
      setShowCollectProgress(false)
      setCollectTaskId(null)
      resetCollectProgress()
    }
  }, [collectProgress?.status])

  useEffect(() => {
    if (!batchProgress) return
    if (batchProgress.status === 'completed') {
      addToast('批量分析完成！', 'success')
      setShowBatchProgress(false)
      setBatchTaskId(null)
      refetchFeed()
      refetchStats()
      resetBatchProgress()
    } else if (batchProgress.status === 'failed') {
      addToast(`批量分析失败: ${batchProgress.error || '未知错误'}`, 'error')
      setShowBatchProgress(false)
      setBatchTaskId(null)
      resetBatchProgress()
    }
  }, [batchProgress?.status])

  useEffect(() => {
    if (!userId) navigate('/login')
  }, [userId, navigate])

  // 事件处理
  const handleHotspotClick = (id: string) => navigate(`/hotspots/${id}`)
  const handleRefresh = () => setShowManualUpdate(true)

  const handleManualUpdateComplete = () => {
    setRefreshCounter(c => c + 1)
    queryClient.invalidateQueries({ queryKey: ['hotspots-feed'] })
    queryClient.invalidateQueries({ queryKey: ['hotspots-stats'] })
  }

  const handleOpenBatchDialog = () => {
    if (!userId) { addToast('请先登录', 'warning'); return }
    setShowBatchDialog(true)
  }

  const handleStartBatchAnalysis = async () => {
    setShowBatchDialog(false)
    const l = batchLimit === 0 ? 999 : batchLimit
    try {
      const result: any = await analysisApi.analyzeLatestAsync(userId, l)
      setBatchTaskId(result.task_id)
      setShowBatchProgress(true)
    } catch (err: any) {
      addToast(`启动批量分析失败: ${err.response?.data?.detail || '未知错误'}`, 'error')
    }
  }

  const handleApplyAdvancedFilters = (filters: AdvancedFilters) => {
    setAdvancedFilters(filters)
    setShowAdvancedFilter(false)
  }

  const handleBatchDismiss = async () => {
    setShowDismissDialog(false)
    try {
      const payload: any = { user_id: userId }
      if (advancedFilters.importance_levels.length > 0) payload.importance_levels = advancedFilters.importance_levels
      if (advancedFilters.date_from) payload.date_from = advancedFilters.date_from
      if (advancedFilters.date_to) payload.date_to = advancedFilters.date_to
      if (advancedFilters.source_names) payload.source_names = advancedFilters.source_names
      if (advancedFilters.is_favorite !== 'all') payload.is_favorite = advancedFilters.is_favorite === 'yes'
      const result: any = await userActionsApi.batchDismiss(payload)
      addToast(`已忽略 ${result.dismissed_count} 个热点`, 'success')
      refetchFeed()
      refetchStats()
    } catch (err: any) {
      addToast(`批量忽略失败: ${err.response?.data?.detail || '未知错误'}`, 'error')
    }
  }

  const handleQuickAnalyze = async (e: React.MouseEvent, hotspotId: string) => {
    e.stopPropagation()
    if (!userId) return
    setAnalyzingHotspots(prev => new Set(prev).add(hotspotId))
    try {
      await analysisApi.triggerAnalysis(hotspotId, userId)
      addToast('AI分析完成！', 'success')
      refetchFeed()
    } catch (err: any) {
      addToast(`分析失败: ${err.response?.data?.detail || err.message || '未知错误'}`, 'error')
    } finally {
      setAnalyzingHotspots(prev => { const n = new Set(prev); n.delete(hotspotId); return n })
    }
  }

  const handleUndismiss = async (hotspotId: string) => {
    try {
      await userActionsApi.undismiss(userId, hotspotId)
      addToast('已恢复该热点', 'success')
      refetchFeed()
      refetchStats()
    } catch { addToast('恢复失败', 'error') }
  }

  const activeFilterCount = [
    advancedFilters.importance_levels.length > 0,
    !!advancedFilters.date_from || !!advancedFilters.date_to,
    !!advancedFilters.source_names,
    advancedFilters.is_favorite !== 'all',
  ].filter(Boolean).length

  // 重要性标签
  const importanceLevels = [
    { id: 'all', label: '全部', count: 0 },
    { id: 'emergency', label: '紧急', count: statsData?.emergency_count || 0, color: '#EF4444' },
    { id: 'high', label: '高', count: statsData?.high_count || 0, color: '#F97316' },
    { id: 'medium', label: '中', count: statsData?.medium_count || 0, color: '#3E5C9A' },
    { id: 'low', label: '低', count: statsData?.low_count || 0, color: '#22C55E' },
    { id: 'dismissed', label: '已忽略', count: 0, color: '#9CA3AF' },
  ]

  if (isLoadingFeed) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block w-6 h-6 rounded-full animate-spin" style={{ border: '2px solid #E5E7EB', borderTopColor: '#3B82F6' }} />
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5">
      {/* 操作栏 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900">热点看板</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} disabled={isCollecting}
            className="btn-secondary text-xs px-3 py-1.5">
            <RefreshCw size={13} className={isCollecting ? 'animate-spin' : ''} />
            <span>更新</span>
          </button>
          <button onClick={handleOpenBatchDialog} disabled={isBatchAnalyzing}
            className="btn-secondary text-xs px-3 py-1.5">
            <Target size={13} />
            <span>分析</span>
          </button>
          <button onClick={() => setShowAdvancedFilter(true)}
            className="btn-primary text-xs px-3 py-1.5">
            <Filter size={13} />
            <span>筛选</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-white/20">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 搜索 + 重要性标签 */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="搜索热点..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1">
          {importanceLevels.map(level => {
            const active = selectedImportance === level.id
            return (
              <button key={level.id} onClick={() => setSelectedImportance(level.id)}
                className="px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors"
                style={{
                  backgroundColor: active ? '#1F2937' : '#F3F4F6',
                  color: active ? '#FFFFFF' : '#4B5563',
                }}>
                {level.color && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ backgroundColor: level.color }} />}
                {level.label}
                {level.id !== 'all' && level.id !== 'dismissed' && <span className="ml-1 opacity-60">{level.count}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* 活动筛选条件 */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-gray-500">筛选中：</span>
          {advancedFilters.importance_levels.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700">
              级别: {advancedFilters.importance_levels.join(',')}
              <button onClick={() => setAdvancedFilters(p => ({ ...p, importance_levels: [] }))}>×</button>
            </span>
          )}
          {(advancedFilters.date_from || advancedFilters.date_to) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-amber-50 text-amber-700">
              日期: {advancedFilters.date_from || '不限'}~{advancedFilters.date_to || '不限'}
              <button onClick={() => setAdvancedFilters(p => ({ ...p, date_from: '', date_to: '' }))}>×</button>
            </span>
          )}
          {advancedFilters.is_favorite !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-pink-50 text-pink-700">
              {advancedFilters.is_favorite === 'yes' ? '已收藏' : '未收藏'}
              <button onClick={() => setAdvancedFilters(p => ({ ...p, is_favorite: 'all' }))}>×</button>
            </span>
          )}
          <button onClick={() => setShowDismissDialog(true)}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 ml-auto">
            <Trash2 size={12} />批量忽略
          </button>
        </div>
      )}

      {/* 三列卡片网格 */}
      {hotspots.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hotspots.map(hotspot => (
            <div key={hotspot.id}
              onClick={() => handleHotspotClick(hotspot.id)}
              className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer flex flex-col overflow-hidden"
            >
              {/* 顶部色条 */}
              <div className="h-1 shrink-0" style={{
                backgroundColor: !hotspot.has_analysis ? '#E5E7EB'
                  : hotspot.analysis_importance_level === 'emergency' ? '#EF4444'
                  : hotspot.analysis_importance_level === 'high' ? '#F97316'
                  : hotspot.analysis_importance_level === 'medium' ? '#3E5C9A'
                  : hotspot.analysis_importance_level === 'low' ? '#22C55E'
                  : '#E5E7EB'
              }} />

              <div className="p-4 flex-1 flex flex-col">
                {/* 元信息 */}
                <div className="flex items-center gap-2 mb-2">
                  {hotspot.has_analysis ? (
                    <ImportanceBadge level={hotspot.analysis_importance_level || 'medium'} size="sm" />
                  ) : (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">未分析</span>
                  )}
                  <span className="text-[11px] text-gray-500">{hotspot.source_name || hotspot.source_type}</span>
                  <span className="text-[11px] text-gray-400 ml-auto">
                    {new Date(hotspot.publish_date).toLocaleDateString('zh-CN')}
                  </span>
                </div>

                {/* 标题 */}
                <h3 className="text-sm font-semibold text-gray-900 mb-1.5 line-clamp-2 leading-snug">
                  {hotspot.title}
                </h3>

                {/* 摘要 */}
                {hotspot.has_analysis ? (
                  <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed flex-1">
                    {hotspot.analysis_content_summary || renderSafeSummary(hotspot.summary)}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 italic line-clamp-2 leading-relaxed flex-1">
                    {renderSafeSummary(hotspot.summary)?.slice(0, 100)}...
                  </p>
                )}

                {/* 底部 */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    {isShowingDismissed ? (
                      <button onClick={e => { e.stopPropagation(); handleUndismiss(hotspot.id) }}
                        className="text-[11px] px-2 py-1 rounded-md bg-green-100 text-green-700 hover:bg-green-200 font-medium">
                        恢复
                      </button>
                    ) : !hotspot.has_analysis ? (
                      <button onClick={e => handleQuickAnalyze(e, hotspot.id)}
                        disabled={analyzingHotspots.has(hotspot.id)}
                        className="text-[11px] px-2 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium disabled:opacity-50">
                        {analyzingHotspots.has(hotspot.id) ? '分析中' : 'AI分析'}
                      </button>
                    ) : null}
                    <FavoriteButton hotspotId={hotspot.id} isFavorite={hotspot.is_favorite || false} size="sm" />
                  </div>
                  <div className="flex items-center gap-2">
                    {hotspot.has_analysis && (
                      <span className="text-[11px] font-medium text-gray-500">
                        {hotspot.analysis_relevance_score ?? 0}%
                      </span>
                    )}
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <BarChart3 size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">暂无热点数据</p>
          {activeFilterCount > 0 && <p className="text-xs text-gray-400 mt-1">当前有筛选条件</p>}
          <div className="flex justify-center gap-3 mt-4">
            <button onClick={() => refetchFeed()} className="btn-secondary text-xs">刷新</button>
            <button onClick={handleRefresh} className="btn-primary text-xs">手动更新</button>
          </div>
        </div>
      )}

      {/* 无限滚动哨兵 */}
      {hasNextPage && (
        <div ref={sentinelRef} className="flex items-center justify-center py-6">
          <div className="inline-block w-5 h-5 rounded-full animate-spin" style={{ border: '2px solid #E5E7EB', borderTopColor: '#3B82F6' }} />
        </div>
      )}

      {/* 无更多数据 */}
      {!hasNextPage && hotspots.length > 0 && (
        <p className="text-center text-xs text-gray-400 py-6">已加载全部热点</p>
      )}

      {/* 模态组件 */}
      <AdvancedFilterModal
        isOpen={showAdvancedFilter}
        onClose={() => setShowAdvancedFilter(false)}
        onApply={handleApplyAdvancedFilters}
        initialFilters={advancedFilters}
      />

      <ManualUpdateModal
        isOpen={showManualUpdate}
        onClose={() => setShowManualUpdate(false)}
        onComplete={handleManualUpdateComplete}
      />

      {showCollectProgress && collectProgress && (
        <ProgressOverlay isOpen={true} title="数据收集" progress={collectProgress.progress}
          currentStep={collectProgress.currentStep} steps={collectProgress.steps}
          status={collectProgress.status === 'pending' ? 'running' : collectProgress.status}
          error={collectProgress.error}
          onClose={() => { setShowCollectProgress(false); setCollectTaskId(null); resetCollectProgress() }} />
      )}

      {showBatchProgress && batchProgress && (
        <ProgressOverlay isOpen={true} title="批量AI分析" progress={batchProgress.progress}
          currentStep={batchProgress.currentStep} steps={batchProgress.steps}
          status={batchProgress.status === 'pending' ? 'running' : batchProgress.status}
          error={batchProgress.error}
          onClose={() => { setShowBatchProgress(false); setBatchTaskId(null); resetBatchProgress() }} />
      )}

      {/* 批量分析选择对话框 */}
      {showBatchDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowBatchDialog(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-bold text-gray-900 mb-1">批量AI分析</h3>
            <p className="text-sm text-gray-600 mb-4">选择要分析的热点数量：</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {[5, 10, 20, 50].map(n => (
                <button key={n} onClick={() => setBatchLimit(n)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${batchLimit === n ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {n} 个
                </button>
              ))}
              <button onClick={() => setBatchLimit(0)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${batchLimit === 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                全部 ({(statsData as any)?.pending_analysis || '?'})
              </button>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowBatchDialog(false)} className="btn-secondary text-sm">取消</button>
              <button onClick={handleStartBatchAnalysis} className="btn-primary text-sm">开始分析</button>
            </div>
          </div>
        </div>
      )}

      {/* 批量忽略确认 */}
      {showDismissDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDismissDialog(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-bold text-gray-900 mb-1">确认批量忽略</h3>
            <p className="text-sm text-gray-600 mb-4">将忽略当前筛选条件下的所有热点。</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDismissDialog(false)} className="btn-secondary text-sm">取消</button>
              <button onClick={handleBatchDismiss} className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700">确认忽略</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Dashboard
