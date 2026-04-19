import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search, Filter, Clock, TrendingUp, AlertTriangle,
  BarChart3, ExternalLink, ChevronRight, RefreshCw, Target
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { hotspotsApi } from '../services/api'
import HotspotCard from '../components/HotspotCard'
import ImportanceBadge from '../components/ImportanceBadge'


const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [selectedImportance, setSelectedImportance] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false)

  // 获取用户ID
  const userId = localStorage.getItem('user_id') || ''

  // 获取热点列表
  const { data: hotspotsData, isLoading: isLoadingHotspots, refetch: refetchHotspots } = useQuery({
    queryKey: ['hotspots', page, limit, selectedImportance, searchQuery],
    queryFn: () => hotspotsApi.getHotspots({
      page,
      limit,
      importance_levels: selectedImportance !== 'all' ? selectedImportance : undefined,
      // 搜索功能需要后端支持，这里暂时只做前端筛选
    }),
    enabled: !!userId,
  })

  // 获取统计信息
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['hotspots-stats'],
    queryFn: () => hotspotsApi.getStats(),
    enabled: !!userId,
  })

  // 处理热点点击
  const handleHotspotClick = (hotspotId: string) => {
    navigate(`/hotspots/${hotspotId}`)
  }

  // 处理手动更新
  const handleRefresh = async () => {
    try {
      await hotspotsApi.refreshHotspots()
      refetchHotspots()
      alert('热点已开始更新，请稍后查看最新内容')
    } catch (error) {
      alert('更新失败，请稍后重试')
    }
  }

  // 批量分析热点
  const handleBatchAnalyze = async () => {
    if (!userId) {
      alert('请先登录')
      return
    }
    if (confirm('确定要分析所有未分析的热点吗？这可能需要一些时间。')) {
      setIsBatchAnalyzing(true)
      try {
        const response = await fetch(`http://localhost:8001/api/v1/users/${userId}/analyze-latest?limit=10`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        const result = await response.json()
        if (result.status === 'completed') {
          alert(`批量分析完成！成功分析 ${result.analyzed_count} 个热点`)
          refetchHotspots()
        } else {
          alert(`批量分析失败：${result.error || '未知错误'}`)
        }
      } catch (error) {
        alert('批量分析请求失败')
        console.error(error)
      } finally {
        setIsBatchAnalyzing(false)
      }
    }
  }

  // 分页处理
  const totalPages = hotspotsData?.total_pages || 1
  const currentPage = page

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
      {/* 标题和操作 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">热点看板</h1>
          <p className="text-gray-600 mt-1">实时追踪AI行业动态，智能分析业务影响</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
          >
            <RefreshCw size={16} />
            <span>手动更新</span>
          </button>
          <button
            onClick={handleBatchAnalyze}
            disabled={isBatchAnalyzing}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <Target size={16} />
            <span>{isBatchAnalyzing ? '分析中...' : '批量分析'}</span>
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
            <Filter size={16} />
            <span>高级筛选</span>
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
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

      {/* 热点列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">最新热点</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">排序：</span>
            <select className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500">
              <option>相关性</option>
              <option>重要性</option>
              <option>发布时间</option>
              <option>浏览量</option>
            </select>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {hotspotsData?.items && hotspotsData.items.length > 0 ? (
            hotspotsData.items.map((hotspot) => (
              <div key={hotspot.id} className="p-6 hover:bg-gray-50 transition-colors" onClick={() => handleHotspotClick(hotspot.id)}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {hotspot.analysis ? (
                        <ImportanceBadge level={hotspot.analysis.importance_level || 'medium'} />
                      ) : (
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-gray-200 text-gray-800">
                          未分析
                        </span>
                      )}
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-gray-100 text-gray-800">
                        {hotspot.source_name || hotspot.source_type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(hotspot.publish_date).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {hotspot.title}
                    </h3>
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {hotspot.summary}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {hotspot.tags.slice(0, 3).map((tag) => (
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
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>相关度: <strong className="text-gray-900">{hotspot.analysis?.relevance_score || 0}%</strong></span>
                          <span>浏览: {hotspot.view_count}</span>
                          <span>点赞: {hotspot.like_count}</span>
                        </div>
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
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                刷新热点
              </button>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            显示 {hotspotsData?.items?.length || 0} 个热点，共 {hotspotsData?.total || 0} 个
          </p>
          <div className="flex space-x-2">
            <button
              onClick={handlePrevPage}
              disabled={page <= 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
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
    </div>
  )
}

export default Dashboard