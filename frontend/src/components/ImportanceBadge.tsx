import React from 'react'

interface Props {
  level: string
  size?: 'sm' | 'md' | 'lg'
}

const colors: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  emergency: { label: '紧急', bg: 'rgba(255,99,99,0.15)', text: '#FF6363', dot: '#FF6363' },
  high:      { label: '高',   bg: 'rgba(255,159,74,0.15)', text: '#FF9F4A', dot: '#FF9F4A' },
  medium:    { label: '中',   bg: 'rgba(167,139,250,0.15)', text: '#A78BFA', dot: '#A78BFA' },
  low:       { label: '低',   bg: 'rgba(78,204,128,0.15)', text: '#4ADE80', dot: '#4ADE80' },
}

const ImportanceBadge: React.FC<Props> = ({ level, size = 'md' }) => {
  const c = colors[level] || { label: level || '未知', bg: 'rgba(255,255,255,0.06)', text: '#6B7280', dot: '#6B7280' }
  const s = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2.5 py-1 text-xs'
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-lg ${s}`}
      style={{ backgroundColor: c.bg, color: c.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.dot }} />
      <span>{c.label}</span>
    </span>
  )
}

export default ImportanceBadge
