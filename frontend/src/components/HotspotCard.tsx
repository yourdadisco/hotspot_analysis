import React from 'react'
import { ExternalLink, Calendar, Eye, ThumbsUp, Share2 } from 'lucide-react'
import ImportanceBadge from './ImportanceBadge'

interface HotspotCardProps {
  hotspot: {
    id: string
    title: string
    summary: string
    source_type: string
    source_name: string
    publish_date: string
    importance_level: 'emergency' | 'high' | 'medium' | 'low' | 'watch'
    relevance_score: number
    tags: string[]
    view_count: string
    like_count: string
    share_count: string
  }
  onClick?: () => void
}

const HotspotCard: React.FC<HotspotCardProps> = ({ hotspot, onClick }) => {
  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <ImportanceBadge level={hotspot.importance_level} />
          <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-gray-100 text-gray-800">
            {hotspot.source_name}
          </span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {hotspot.relevance_score}<span className="text-sm text-gray-600">%</span>
          </div>
          <div className="text-xs text-gray-600">相关度</div>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">
        {hotspot.title}
      </h3>

      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
        {hotspot.summary}
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {hotspot.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full"
          >
            {tag}
          </span>
        ))}
        {hotspot.tags.length > 3 && (
          <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
            +{hotspot.tags.length - 3}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Calendar size={14} />
            <span>{new Date(hotspot.publish_date).toLocaleDateString('zh-CN')}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Eye size={14} />
            <span>{hotspot.view_count}</span>
          </div>
          <div className="flex items-center space-x-1">
            <ThumbsUp size={14} />
            <span>{hotspot.like_count}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Share2 size={14} />
            <span>{hotspot.share_count}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-blue-600 hover:text-blue-800">
          <span className="text-sm">查看详情</span>
          <ExternalLink size={16} />
        </div>
      </div>
    </div>
  )
}

export default HotspotCard