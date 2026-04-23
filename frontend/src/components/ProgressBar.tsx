import React from 'react'

interface ProgressBarProps {
  progress: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  color?: string
}

const sizeMap = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showLabel = false,
  size = 'md',
  color = 'bg-blue-600',
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress))
  const barHeight = sizeMap[size]

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-600">进度</span>
          <span className="text-sm font-medium text-gray-900">{clampedProgress}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${barHeight}`}>
        <div
          className={`${color} ${barHeight} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  )
}

export default ProgressBar
