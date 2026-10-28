import './main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { LoadingPage } from './pages/LoadingPage'
import { HomePage } from './pages/HomePage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<LoadingPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  </StrictMode>
)
