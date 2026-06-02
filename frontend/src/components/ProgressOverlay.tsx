import React, { useEffect } from 'react'
import { CheckCircle2, Loader2, XCircle, Circle } from 'lucide-react'
import ProgressBar from './ProgressBar'

interface Props {
  isOpen: boolean; title: string; progress: number; currentStep: string
  steps: string[]; status: 'running' | 'completed' | 'failed'; error?: string; onClose?: () => void
}

const ProgressOverlay: React.FC<Props> = ({ isOpen, title, progress, currentStep, steps, status, error, onClose }) => {
  useEffect(() => { document.body.style.overflow = isOpen ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [isOpen])
  if (!isOpen) return null

  const done = status === 'completed' || status === 'failed'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 modal-overlay" />
      <div className="relative p-6 w-full max-w-sm mx-4 shadow-cushion rounded-xl"
        style={{ backgroundColor: '#1E1E24', border: '1px solid rgba(255,255,255,0.10)' }}>
        <h3 className="text-base font-semibold text-white text-center mb-5">{title}</h3>

        <div className="mb-5"><ProgressBar progress={progress} showLabel size="md" /></div>

        <div className="flex items-center gap-3 mb-5 p-3 rounded-lg"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
          <Loader2 size={16} className="animate-spin" style={{ color: '#FF9F4A' }} />
          <span className="text-sm font-medium" style={{ color: '#FF9F4A' }}>{currentStep}</span>
        </div>

        {steps.length > 0 && (
          <div className="space-y-2 mb-5">
            {steps.map((step, i) => {
              const last = i === steps.length - 1 && status === 'running'
              const completed = i < steps.length - 1 || status === 'completed'
              const st = completed ? 'done' : last ? 'run' : 'wait'
              return (
                <div key={i} className="flex items-center gap-3">
                  {st === 'done' ? <CheckCircle2 size={16} color="#4ADE80" className="shrink-0" />
                    : st === 'run' ? <Loader2 size={16} className="animate-spin shrink-0" style={{ color: '#FF9F4A' }} />
                    : <Circle size={16} style={{ color: 'rgba(255,255,255,0.20)' }} className="shrink-0" />}
                  <span className="text-sm" style={{
                    color: st === 'done' ? '#4ADE80' : st === 'run' ? '#B0B3B8' : 'rgba(255,255,255,0.20)',
                    textDecoration: st === 'done' ? 'line-through' : 'none'
                  }}>{step}</span>
                </div>
              )
            })}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg mb-4" style={{ backgroundColor: 'rgba(255,99,99,0.15)' }}>
            <XCircle size={16} color="#FF6363" className="shrink-0 mt-0.5" />
            <p className="text-sm" style={{ color: '#FF6363' }}>{error}</p>
          </div>
        )}

        <div className="text-center">
          {done ? (
            <button onClick={onClose} className={status === 'completed' ? 'btn-primary text-sm' : 'btn-danger text-sm'}>
              {status === 'completed' ? '查看结果' : '关闭'}
            </button>
          ) : (
            <p className="text-xs" style={{ color: '#6B7280' }}>请耐心等待，不要关闭页面...</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProgressOverlay
