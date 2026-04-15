import { useCallback } from 'react'
import type { ReactNode } from 'react'

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'
import { ToastContext, useToastState } from '@/lib/use-toast'

export function Toaster({ children }: { children: ReactNode }) {
  const state = useToastState()

  const handleOpenChange = useCallback(
    (id: string) => (open: boolean) => {
      if (!open) state.dismiss(id)
    },
    [state],
  )

  return (
    <ToastContext.Provider value={state}>
      <ToastProvider>
        {children}
        {state.toasts.map(({ id, title, description, variant }) => (
          <Toast key={id} variant={variant} onOpenChange={handleOpenChange(id)}>
            <div className="grid gap-1">
              <ToastTitle>{title}</ToastTitle>
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            <ToastClose />
          </Toast>
        ))}
        <ToastViewport />
      </ToastProvider>
    </ToastContext.Provider>
  )
}
