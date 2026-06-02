import React, { useEffect } from 'react'
import { CheckCircle2, Loader2, XCircle, Circle } from 'lucide-react'
import ProgressBar from './ProgressBar'

interface ProgressOverlayProps {
  isOpen: boolean
  title: string
  progress: number
  currentStep: string
  steps: string[]
  status: 'running' | 'completed' | 'failed'
  error?: string
  onClose?: () => void
}

const ProgressOverlay: React.FC<ProgressOverlayProps> = ({
  isOpen,
  title,
  progress,
  currentStep,
  steps,
  status,
  error,
  onClose,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const isFinished = status === 'completed' || status === 'failed'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 半透明遮罩 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* 居中卡片 */}
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
        {/* 标题 */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        </div>

        {/* 进度条 */}
        <div className="mb-6">
          <ProgressBar progress={progress} showLabel size="md" />
        </div>

        {/* 当前步骤 */}
        <div className="flex items-center space-x-3 mb-6 p-3 bg-blue-50 rounded-lg">
          <Loader2 size={20} className="text-blue-500 animate-spin" />
          <span className="text-sm font-medium text-blue-700">{currentStep}</span>
        </div>

        {/* 步骤列表 */}
        {steps.length > 0 && (
          <div className="space-y-2 mb-6">
            {steps.map((step, index) => {
              const isLast = index === steps.length - 1 && status === 'running'
              const isCompleted = index < steps.length - 1 || status === 'completed'
              const stepStatus = isCompleted ? 'completed' : isLast ? 'running' : 'pending'
              return (
                <div key={index} className="flex items-center space-x-3">
                  {stepStatus === 'completed' ? (
                    <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
                  ) : stepStatus === 'running' ? (
                    <Loader2 size={18} className="text-blue-500 animate-spin flex-shrink-0" />
                  ) : (
                    <Circle size={18} className="text-gray-300 flex-shrink-0" />
                  )}
                  <span
                    className={`text-sm ${
                      stepStatus === 'completed'
                        ? 'text-green-700 line-through'
                        : stepStatus === 'running'
                          ? 'text-blue-700 font-medium'
                          : 'text-gray-400'
                    }`}
                  >
                    {step}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* 错误信息 */}
        {error && (
          <div className="flex items-start space-x-2 p-3 bg-red-50 rounded-lg mb-4">
            <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* 完成/关闭按钮 */}
        <div className="text-center">
          {isFinished ? (
            <button
              onClick={onClose}
              className={`px-6 py-2.5 rounded-lg font-medium text-white transition-colors ${
                status === 'completed'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {status === 'completed' ? '查看结果' : '关闭'}
            </button>
          ) : (
            <p className="text-sm text-gray-500">请耐心等待，不要关闭页面...</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProgressOverlay
