import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { hotspotsApi } from '../services/api'

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

  // 打开时获取真实来源名称列表
  const { data: sourceNameOptions = [] } = useQuery({
    queryKey: ['source-names'],
    queryFn: () => hotspotsApi.getSourceNames(),
    enabled: isOpen,
    staleTime: 60000,
  })

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">高级筛选</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">重要性级别</label>
          <div className="space-y-2">
            {importanceOptions.map((opt) => (
              <label key={opt.value} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.importance_levels.includes(opt.value)}
                  onChange={() => handleToggleImportance(opt.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <div className="flex items-center space-x-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${opt.color}`} />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">日期范围</label>
          <div className="flex items-center space-x-3">
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters((prev) => ({ ...prev, date_from: e.target.value }))}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-gray-400">至</span>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters((prev) => ({ ...prev, date_to: e.target.value }))}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">信息源</label>
          {sourceNameOptions.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {sourceNameOptions.map((name) => (
                <label key={name} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSourceNames.includes(name)}
                    onChange={() => handleToggleSourceName(name)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{name}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">暂无数据</p>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">收藏状态</label>
          <div className="flex space-x-3">
            {[
              { value: 'all', label: '全部' },
              { value: 'yes', label: '已收藏' },
              { value: 'no', label: '未收藏' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilters((prev) => ({ ...prev, is_favorite: opt.value }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filters.is_favorite === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t border-gray-200">
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            重置
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleApply}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              应用筛选
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdvancedFilterModal
