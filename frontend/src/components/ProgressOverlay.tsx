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
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const isFinished = status === 'completed' || status === 'failed'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(26, 35, 50, 0.5)' }} />
      <div className="relative bg-white rounded-lg shadow-modal p-6 w-full max-w-sm mx-4"
        style={{ border: '1px solid #D8D2C2' }}>
        <div className="text-center mb-5">
          <h3 className="text-base font-semibold" style={{ color: '#1B1B1A' }}>{title}</h3>
        </div>

        <div className="mb-5">
          <ProgressBar progress={progress} showLabel size="md" />
        </div>

        {/* 当前步骤 */}
        <div className="flex items-center gap-3 mb-5 p-3 rounded-md"
          style={{ backgroundColor: '#EBEFF6' }}>
          <Loader2 size={16} className="animate-spin" style={{ color: '#3E5C9A' }} />
          <span className="text-sm font-medium" style={{ color: '#3E5C9A' }}>{currentStep}</span>
        </div>

        {/* 步骤列表 */}
        {steps.length > 0 && (
          <div className="space-y-2 mb-5">
            {steps.map((step, index) => {
              const isLast = index === steps.length - 1 && status === 'running'
              const isCompleted = index < steps.length - 1 || status === 'completed'
              const stepStatus = isCompleted ? 'completed' : isLast ? 'running' : 'pending'
              return (
                <div key={index} className="flex items-center gap-3">
                  {stepStatus === 'completed' ? (
                    <CheckCircle2 size={16} color="#00B96B" className="shrink-0" />
                  ) : stepStatus === 'running' ? (
                    <Loader2 size={16} className="animate-spin shrink-0" style={{ color: '#3E5C9A' }} />
                  ) : (
                    <Circle size={16} style={{ color: '#D8D2C2' }} className="shrink-0" />
                  )}
                  <span
                    className="text-sm"
                    style={{
                      color: stepStatus === 'completed' ? '#008C4A'
                        : stepStatus === 'running' ? '#3E5C9A'
                        : '#8B95B0',
                      textDecoration: stepStatus === 'completed' ? 'line-through' : 'none'
                    }}
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
          <div className="flex items-start gap-2 p-3 rounded-md mb-4"
            style={{ backgroundColor: '#FEF0F0' }}>
            <XCircle size={16} color="#F23645" className="shrink-0 mt-0.5" />
            <p className="text-sm" style={{ color: '#F23645' }}>{error}</p>
          </div>
        )}

        {/* 完成/关闭按钮 */}
        <div className="text-center">
          {isFinished ? (
            <button
              onClick={onClose}
              className={status === 'completed' ? 'btn-primary text-sm' : 'btn-danger text-sm'}
            >
              {status === 'completed' ? '查看结果' : '关闭'}
            </button>
          ) : (
            <p className="text-xs" style={{ color: '#8B95B0' }}>请耐心等待，不要关闭页面...</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProgressOverlay
