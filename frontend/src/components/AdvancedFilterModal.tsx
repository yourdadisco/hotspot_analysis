import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export interface AdvancedFilters {
  importance_levels: string[]
  date_from: string
  date_to: string
  source_names: string
  is_favorite: string
}

interface Props {
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
  { value: 'emergency', label: '紧急', dot: '#FF6363' },
  { value: 'high', label: '高', dot: '#FF9F4A' },
  { value: 'medium', label: '中', dot: '#A78BFA' },
  { value: 'low', label: '低', dot: '#4ADE80' },
  { value: 'unanalyzed', label: '未分析', dot: '#6B7280' },
]

const sourceNameOptions = [
  'AI科技评论', '量子位', '新智元', '钛媒体', '36氪', '虎嗅', 'OSCHINA',
]

const parseCsv = (val: string): string[] =>
  val ? val.split(',').map(s => s.trim()).filter(Boolean) : []

const AdvancedFilterModal: React.FC<Props> = ({ isOpen, onClose, onApply, initialFilters }) => {
  const [filters, setFilters] = useState<AdvancedFilters>(initialFilters || defaultFilters)

  useEffect(() => { if (initialFilters) setFilters(initialFilters) }, [initialFilters])

  const toggleImportance = (level: string) => setFilters(p => ({
    ...p, importance_levels: p.importance_levels.includes(level)
      ? p.importance_levels.filter(l => l !== level) : [...p.importance_levels, level]
  }))

  const toggleSource = (name: string) => setFilters(p => {
    const cur = parseCsv(p.source_names)
    const next = cur.includes(name) ? cur.filter(v => v !== name) : [...cur, name]
    return { ...p, source_names: next.join(',') }
  })

  const selectedSourceNames = parseCsv(filters.source_names)
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 modal-overlay" onClick={onClose} />
      <div className="relative glass p-6 w-full max-w-md mx-4 shadow-cushion"
        style={{ backgroundColor: '#1E1E24', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.10)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white">高级筛选</h3>
          <button onClick={onClose} className="p-1 rounded-lg transition-colors" style={{ color: '#6B7280' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <X size={18} />
          </button>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-semibold mb-2.5" style={{ color: '#6B7280' }}>重要性级别</label>
          <div className="space-y-2">
            {importanceOptions.map(opt => (
              <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={filters.importance_levels.includes(opt.value)}
                  onChange={() => toggleImportance(opt.value)}
                  className="w-4 h-4 rounded" style={{ accentColor: '#FF6363' }} />
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.dot }} />
                  <span className="text-sm text-white">{opt.label}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-semibold mb-2.5" style={{ color: '#6B7280' }}>日期范围</label>
          <div className="flex items-center gap-3">
            <input type="date" value={filters.date_from}
              onChange={e => setFilters(p => ({ ...p, date_from: e.target.value }))}
              className="input flex-1 py-2" />
            <span className="text-xs" style={{ color: '#6B7280' }}>至</span>
            <input type="date" value={filters.date_to}
              onChange={e => setFilters(p => ({ ...p, date_to: e.target.value }))}
              className="input flex-1 py-2" />
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-semibold mb-2.5" style={{ color: '#6B7280' }}>信息源</label>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {sourceNameOptions.map(name => (
              <label key={name} className="flex items-center gap-2.5 cursor-pointer px-2 py-1.5 rounded-lg"
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <input type="checkbox" checked={selectedSourceNames.includes(name)}
                  onChange={() => toggleSource(name)}
                  className="w-4 h-4 rounded" style={{ accentColor: '#FF6363' }} />
                <span className="text-sm" style={{ color: '#B0B3B8' }}>{name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-semibold mb-2.5" style={{ color: '#6B7280' }}>收藏状态</label>
          <div className="flex gap-2">
            {[
              { value: 'all', label: '全部' },
              { value: 'yes', label: '已收藏' },
              { value: 'no', label: '未收藏' },
            ].map(opt => {
              const active = filters.is_favorite === opt.value
              return (
                <button key={opt.value} onClick={() => setFilters(p => ({ ...p, is_favorite: opt.value }))}
                  className="px-3.5 py-2 text-xs font-medium rounded-lg transition-all"
                  style={active
                    ? { backgroundColor: '#FFFFFF', color: '#0F0F11' }
                    : { backgroundColor: 'rgba(255,255,255,0.06)', color: '#6B7280' }
                  }>
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex justify-between pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
          <button onClick={() => setFilters(defaultFilters)} className="btn-ghost text-sm">重置</button>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary text-sm">取消</button>
            <button onClick={() => onApply(filters)} className="btn-primary text-sm">应用筛选</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdvancedFilterModal
