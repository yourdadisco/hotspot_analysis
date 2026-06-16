import React, { useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { X, Bell, AlertTriangle, TrendingUp } from 'lucide-react'
import { hotspotsApi, type Hotspot } from '../services/api'

interface Props {
  userId: string
  onClose: () => void
}

const ImportanceDot: React.FC<{ level?: string }> = ({ level }) => {
  const colors: Record<string, string> = { emergency: '#EF4444', high: '#F97316', medium: '#EAB308', low: '#22C55E' }
  const dotColor = level ? colors[level] || '#9CA3AF' : '#9CA3AF'
  return <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: dotColor }} />
}

const NotificationPanel: React.FC<Props> = ({ userId, onClose }) => {
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => hotspotsApi.getHotspots({
      importance_levels: 'emergency,high',
      limit: 10,
      user_id: userId,
      is_dismissed: false,
      sort_by: 'publish_date',
      sort_order: 'desc',
    }),
    enabled: !!userId,
  })

  const items: Hotspot[] = (data as any)?.items || []

  return (
    <div ref={ref} className="absolute right-0 top-full mt-2 w-80 z-50"
      style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid #E5E7EB' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-blue-600" />
          <span className="text-sm font-semibold text-gray-900">重要通知</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-md">
          <X size={14} className="text-gray-400" />
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle size={24} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">暂无重要通知</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map((item) => (
              <div key={item.id}
                onClick={() => { navigate(`/hotspots/${item.id}`); onClose() }}
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
                <div className="flex items-start gap-3">
                  <ImportanceDot level={item.analysis_importance_level} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: item.analysis_importance_level === 'emergency' ? '#FEF2F2' : '#FFF7ED',
                          color: item.analysis_importance_level === 'emergency' ? '#EF4444' : '#F97316',
                        }}>
                        {item.analysis_importance_level === 'emergency' ? '紧急' : '高'}
                      </span>
                      <span className="text-xs text-gray-400">{item.source_name}</span>
                      {item.analysis_relevance_score != null && (
                        <span className="text-xs text-gray-400 flex items-center gap-0.5">
                          <TrendingUp size={11} /> {item.analysis_relevance_score}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default NotificationPanel
