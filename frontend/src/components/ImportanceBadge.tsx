import React from 'react'

interface ImportanceBadgeProps {
  level: 'emergency' | 'high' | 'medium' | 'low' | 'watch' | string
  size?: 'sm' | 'md' | 'lg'
}

const ImportanceBadge: React.FC<ImportanceBadgeProps> = ({ level, size = 'md' }) => {
  const config = {
    emergency: {
      label: '紧急',
      className: 'bg-red-100 text-red-800 border-red-200',
      dotColor: 'bg-red-500'
    },
    high: {
      label: '高',
      className: 'bg-orange-100 text-orange-800 border-orange-200',
      dotColor: 'bg-orange-500'
    },
    medium: {
      label: '中',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      dotColor: 'bg-yellow-500'
    },
    low: {
      label: '低',
      className: 'bg-blue-100 text-blue-800 border-blue-200',
      dotColor: 'bg-blue-500'
    },
    watch: {
      label: '关注',
      className: 'bg-gray-100 text-gray-800 border-gray-200',
      dotColor: 'bg-gray-500'
    }
  }

  const levelConfig = config[level as keyof typeof config] || config.medium

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  }

  return (
    <div
      className={`inline-flex items-center space-x-1.5 rounded-full border ${levelConfig.className} ${sizeClasses[size]} font-medium`}
    >
      <div className={`w-2 h-2 rounded-full ${levelConfig.dotColor}`}></div>
      <span>{levelConfig.label}</span>
    </div>
  )
}

export default ImportanceBadge