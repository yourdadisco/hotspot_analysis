import React from 'react'

interface ImportanceBadgeProps {
  level: 'emergency' | 'high' | 'medium' | 'low' | string
  size?: 'sm' | 'md' | 'lg'
}

const levels: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  emergency: { label: '紧急', bg: '#FEF0F0', text: '#F23645', dot: '#F23645' },
  high:      { label: '高',   bg: '#FEF7E6', text: '#936415', dot: '#F5A623' },
  medium:    { label: '中',   bg: '#EBEFF6', text: '#3E5C9A', dot: '#3E5C9A' },
  low:       { label: '低',   bg: '#E6F7EE', text: '#008C4A', dot: '#00B96B' },
}

const ImportanceBadge: React.FC<ImportanceBadgeProps> = ({ level, size = 'md' }) => {
  const cfg = levels[level] || { label: level || '未知', bg: '#F4F1EA', text: '#5E6680', dot: '#8B95B0' }

  const s = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2.5 py-1 text-xs'

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded ${s}`}
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
      <span>{cfg.label}</span>
    </span>
  )
}

export default ImportanceBadge
