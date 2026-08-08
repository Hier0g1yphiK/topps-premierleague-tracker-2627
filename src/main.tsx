import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

// Register service worker for offline caching (cache-first for app shell)
const updateSW = registerSW({
  onNeedRefresh() {
    // Dispatches a custom event that the useServiceWorker hook listens to
    window.dispatchEvent(new CustomEvent('sw-update-available', { detail: { updateSW } }))
  },
  onOfflineReady() {
    console.log('App is offline-ready')
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
