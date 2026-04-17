import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppLayout from './app/layout.tsx'
import AppRouter from './AppRouter.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppLayout>
      <AppRouter />
    </AppLayout>
  </StrictMode>,
)
