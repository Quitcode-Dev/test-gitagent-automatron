import { useState, useCallback, useContext, createContext } from 'react'

export type ToastVariant = 'default' | 'destructive'

export interface ToastMessage {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
}

interface ToastContextValue {
  toasts: ToastMessage[]
  toast: (msg: Omit<ToastMessage, 'id'>) => void
  dismiss: (id: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToastState(): ToastContextValue {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const toast = useCallback(
    ({ title, description, variant = 'default' }: Omit<ToastMessage, 'id'>) => {
      const id = crypto.randomUUID()
      setToasts(prev => [...prev, { id, title, description, variant }])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 4000)
    },
    [],
  )

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, toast, dismiss }
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
