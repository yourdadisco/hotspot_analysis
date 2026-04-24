import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Heart, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { userActionsApi, type PaginatedResponse, type Hotspot } from '../services/api'
import ImportanceBadge from '../components/ImportanceBadge'
import FavoriteButton from '../components/FavoriteButton'
import { renderSafeSummary } from '../utils/sanitize'

const Favorites: React.FC = () => {
  const navigate = useNavigate()
  const userId = localStorage.getItem('user_id') || ''
  const [page, setPage] = useState(1)
  const limit = 10

  const { data, isLoading, error } = useQuery<PaginatedResponse<Hotspot>>({
    queryKey: ['favorites', userId, page],
    queryFn: () => userActionsApi.getFavorites({ user_id: userId, page, limit }),
    enabled: !!userId,
  })

  const totalPages = data?.total_pages || 1

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">请先登录</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载收藏列表...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">加载失败</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">我的收藏</h1>
          <p className="text-gray-600 mt-1">共 {data?.total || 0} 个收藏热点</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-200">
          {data?.items && data.items.length > 0 ? (
            data.items.map((hotspot: Hotspot) => (
              <div
                key={hotspot.id}
                className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => navigate(`/hotspots/${hotspot.id}`)}
              >
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
                      <span className="text-sm text-gray-500">
                        相关度: <strong className="text-gray-900">{hotspot.analysis_relevance_score ?? 0}%</strong>
                      </span>
                      <button className="text-blue-600 hover:text-blue-800 flex items-center space-x-1">
                        <span>查看详情</span>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <FavoriteButton hotspotId={hotspot.id} isFavorite={true} />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <Heart size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg mb-2">暂无收藏热点</p>
              <p className="text-gray-400 text-sm">在热点看板中点击心形图标收藏你感兴趣的热点</p>
            </div>
          )}
        </div>

        {/* 分页 */}
        {(data?.total_pages || 0) > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              显示 {data?.items?.length || 0} 个，共 {data?.total || 0} 个
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <span className="text-sm text-gray-600 min-w-[80px] text-center">
                第 {page}/{totalPages} 页
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Favorites
