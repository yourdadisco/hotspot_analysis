import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export interface AdvancedFilters {
  importance_levels: string[]
  date_from: string
  date_to: string
  source_names: string
  is_favorite: string
}

interface AdvancedFilterModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (filters: AdvancedFilters) => void
  initialFilters?: AdvancedFilters
}

const defaultFilters: AdvancedFilters = {
  importance_levels: [],
  date_from: '',
  date_to: '',
  source_names: '',
  is_favorite: 'all',
}

const importanceOptions = [
  { value: 'emergency', label: '紧急', color: 'bg-red-500' },
  { value: 'high', label: '高', color: 'bg-orange-500' },
  { value: 'medium', label: '中', color: 'bg-yellow-500' },
  { value: 'low', label: '低', color: 'bg-blue-500' },
  { value: 'unanalyzed', label: '未分析', color: 'bg-gray-500' },
]

const sourceNameOptions = [
  'AI科技评论', '量子位', '新智元', '钛媒体', '36氪', '虎嗅', 'OSCHINA',
]

/** 将逗号分隔字符串解析为数组 */
const parseCsv = (val: string): string[] =>
  val ? val.split(',').map((s) => s.trim()).filter(Boolean) : []

const AdvancedFilterModal: React.FC<AdvancedFilterModalProps> = ({
  isOpen,
  onClose,
  onApply,
  initialFilters,
}) => {
  const [filters, setFilters] = useState<AdvancedFilters>(initialFilters || defaultFilters)

  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters)
    }
  }, [initialFilters])

  const handleToggleImportance = (level: string) => {
    setFilters((prev) => ({
      ...prev,
      importance_levels: prev.importance_levels.includes(level)
        ? prev.importance_levels.filter((l) => l !== level)
        : [...prev.importance_levels, level],
    }))
  }

  const handleToggleSourceName = (name: string) => {
    setFilters((prev) => {
      const current = parseCsv(prev.source_names)
      const next = current.includes(name)
        ? current.filter((v) => v !== name)
        : [...current, name]
      return { ...prev, source_names: next.join(',') }
    })
  }

  const selectedSourceNames = parseCsv(filters.source_names)

  const handleReset = () => {
    setFilters(defaultFilters)
  }

  const handleApply = () => {
    onApply(filters)
  }

  if (!isOpen) return null

  const dotColors: Record<string, string> = {
    emergency: '#F23645', high: '#F5A623', medium: '#3E5C9A', low: '#00B96B', unanalyzed: '#8B95B0',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(26, 35, 50, 0.5)' }} onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-modal p-6 w-full max-w-md mx-4" style={{ border: '1px solid #D8D2C2' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold" style={{ color: '#1B1B1A' }}>高级筛选</h3>
          <button onClick={onClose} className="p-1 rounded-md transition-colors" style={{ color: '#5E6680' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F4F1EA'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
            <X size={18} />
          </button>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-semibold mb-2.5" style={{ color: '#5E6680' }}>重要性级别</label>
          <div className="space-y-2">
            {importanceOptions.map((opt) => (
              <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.importance_levels.includes(opt.value)}
                  onChange={() => handleToggleImportance(opt.value)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: '#F5A623' }}
                />
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColors[opt.value] || '#8B95B0' }} />
                  <span className="text-sm" style={{ color: '#1B1B1A' }}>{opt.label}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-semibold mb-2.5" style={{ color: '#5E6680' }}>日期范围</label>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters((prev) => ({ ...prev, date_from: e.target.value }))}
              className="input flex-1 py-2"
            />
            <span className="text-xs" style={{ color: '#8B95B0' }}>至</span>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters((prev) => ({ ...prev, date_to: e.target.value }))}
              className="input flex-1 py-2"
            />
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-semibold mb-2.5" style={{ color: '#5E6680' }}>信息源</label>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto scrollbar-thin">
            {sourceNameOptions.map((name) => (
              <label key={name} className="flex items-center gap-2.5 cursor-pointer px-2 py-1.5 rounded-md transition-colors"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F4F1EA'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                <input
                  type="checkbox"
                  checked={selectedSourceNames.includes(name)}
                  onChange={() => handleToggleSourceName(name)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: '#F5A623' }}
                />
                <span className="text-sm" style={{ color: '#1B1B1A' }}>{name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-semibold mb-2.5" style={{ color: '#5E6680' }}>收藏状态</label>
          <div className="flex gap-2">
            {[
              { value: 'all', label: '全部' },
              { value: 'yes', label: '已收藏' },
              { value: 'no', label: '未收藏' },
            ].map((opt) => {
              const isActive = filters.is_favorite === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => setFilters((prev) => ({ ...prev, is_favorite: opt.value }))}
                  className="px-3.5 py-2 text-xs font-medium rounded-md transition-all"
                  style={isActive
                    ? { backgroundColor: '#1A2332', color: '#E8ECF4' }
                    : { backgroundColor: '#F4F1EA', color: '#5E6680' }
                  }
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex justify-between pt-4" style={{ borderTop: '1px solid #D8D2C2' }}>
          <button onClick={handleReset} className="btn-ghost text-sm">
            重置
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary text-sm">
              取消
            </button>
            <button onClick={handleApply} className="btn-primary text-sm">
              应用筛选
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdvancedFilterModal
