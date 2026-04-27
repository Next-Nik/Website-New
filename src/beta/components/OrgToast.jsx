// src/beta/components/OrgToast.jsx
// Self-dismissing toast notification.

import { useEffect } from 'react'
import { body, dark } from './OrgShared'

export function OrgToast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
      background: dark, color: '#FAFAF7',
      ...body, fontSize: '16px',
      padding: '12px 22px', borderRadius: '10px',
      boxShadow: '0 8px 28px rgba(15,21,35,0.55)',
    }}>
      {message}
    </div>
  )
}
