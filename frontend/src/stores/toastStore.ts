import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration: number
}

interface ToastStore {
  toasts: Toast[]
  addToast: (message: string, type?: ToastType, duration?: number) => string
  removeToast: (id: string) => void
  clearToasts: () => void
}

let toastCounter = 0

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  addToast: (message: string, type: ToastType = 'info', duration: number = 3000) => {
    const id = `toast-${++toastCounter}-${Date.now()}`
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }))

    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, duration)
    }

    return id
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },

  clearToasts: () => {
    set({ toasts: [] })
  },
}))
