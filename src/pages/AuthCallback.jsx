// src/pages/AuthCallback.jsx
// Supabase processes the ?code= or #access_token from the URL automatically
// when detectSessionInUrl: true (set in useSupabase.js).
// This page just waits for the SIGNED_IN event and redirects to the
// stored destination.

import { useEffect, useState } from 'react'
import { supabase } from '../hooks/useSupabase'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }

function getDestination() {
  let dest = null
  try { dest = localStorage.getItem('auth_redirect') } catch {}
  try { localStorage.removeItem('auth_redirect') } catch {}
  if (!dest) {
    const params = new URLSearchParams(window.location.search)
    dest = params.get('redirect') || null
  }
  if (dest && dest.startsWith('/')) return dest
  return '/'
}

export function AuthCallbackPage() {
  const [status, setStatus] = useState('Signing you in…')

  useEffect(() => {
    // Check if session is already established (Supabase may have processed
    // the URL code before this component mounted)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        window.location.replace(getDestination())
      }
    })

    // Listen for the SIGNED_IN event — fires when Supabase finishes
    // processing the ?code= or hash tokens from the URL
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        subscription.unsubscribe()
        window.location.replace(getDestination())
      }
      if (event === 'SIGNED_OUT') {
        subscription.unsubscribe()
        window.location.replace('/login')
      }
    })

    // Timeout fallback — if nothing fires in 8 seconds, something is wrong
    const timer = setTimeout(() => {
      subscription.unsubscribe()
      setStatus('Taking longer than expected…')
      supabase.auth.getSession().then(({ data: { session } }) => {
        window.location.replace(session?.user ? getDestination() : '/login')
      })
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>
          Life OS
        </span>
        <p style={{ ...serif, fontSize: '20px', fontStyle: 'italic', color: 'rgba(15,21,35,0.55)' }}>
          {status}
        </p>
      </div>
    </div>
  )
}
