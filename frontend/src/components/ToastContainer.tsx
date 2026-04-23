import React, { useEffect, useState } from 'react'
import { X, CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react'
import { useToastStore, ToastType } from '../stores/toastStore'

const typeStyles: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-500 text-green-800',
  error: 'bg-red-50 border-red-500 text-red-800',
  info: 'bg-blue-50 border-blue-500 text-blue-800',
  warning: 'bg-amber-50 border-amber-500 text-amber-800',
}

const typeIcons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={20} className="text-green-500" />,
  error: <XCircle size={20} className="text-red-500" />,
  info: <Info size={20} className="text-blue-500" />,
  warning: <AlertTriangle size={20} className="text-amber-500" />,
}

const ToastItem: React.FC<{ toast: { id: string; message: string; type: ToastType } }> = ({ toast }) => {
  const removeToast = useToastStore((s) => s.removeToast)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  return (
    <div
      className={`flex items-start space-x-3 px-4 py-3 rounded-lg border-l-4 shadow-lg transition-all duration-300 ${
        typeStyles[toast.type]
      } ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
    >
      <div className="flex-shrink-0 mt-0.5">{typeIcons[toast.type]}</div>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600"
      >
        <X size={16} />
      </button>
    </div>
  )
}

const ToastContainer: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col space-y-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  )
}

export default ToastContainer
