import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './global.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Register service worker for PWA install support.
// updateViaCache:'none' — the browser must fetch sw.js from the network on
// every update check, never from HTTP cache. Without this, a cached old
// worker can pin users to a stale bundle for up to 24h after a deploy.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((reg) => { reg.update().catch(() => {}) })
      .catch((err) => console.warn('SW registration failed:', err))
  })
}
