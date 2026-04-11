// src/pages/AuthCallback.jsx
// Handles Supabase auth redirects — both magic link (hash) and OAuth (code).
// Supabase drops tokens in the URL hash after magic link login.
// This page runs exchangeCodeForSession / getSession, then redirects
// the user to wherever they were trying to go.

import { useEffect, useState } from 'react'
import { supabase } from '../hooks/useSupabase'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }

export function AuthCallbackPage() {
  const [status, setStatus] = useState('Signing you in…')

  useEffect(() => {
    async function handleCallback() {
      try {
        // Supabase automatically processes the hash/code on getSession()
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Auth callback error:', error.message)
          setStatus('Something went wrong. Redirecting…')
          setTimeout(() => { window.location.href = '/login' }, 2000)
          return
        }

        if (session?.user) {
          // Retrieve the intended destination
          let dest = null
          try { dest = localStorage.getItem('auth_redirect') } catch {}
          try { localStorage.removeItem('auth_redirect') } catch {}

          // Fallback: check URL param (set by AccessGate / Login redirect param)
          if (!dest) {
            const params = new URLSearchParams(window.location.search)
            dest = params.get('redirect') || null
          }

          // Safety: only redirect to same-origin paths
          if (dest) {
            try {
              const url = new URL(dest, window.location.origin)
              const isSameOrigin = url.hostname === window.location.hostname
              if (!isSameOrigin) dest = null
            } catch {
              // dest is a relative path — safe to use as-is
              if (!dest.startsWith('/')) dest = null
            }
          }

          window.location.href = dest || '/'
        } else {
          // No session yet — wait for onAuthStateChange
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              subscription.unsubscribe()
              let dest = null
              try { dest = localStorage.getItem('auth_redirect') } catch {}
              try { localStorage.removeItem('auth_redirect') } catch {}
              window.location.href = dest || '/'
            }
          })
        }
      } catch (err) {
        console.error('Auth callback exception:', err)
        window.location.href = '/login'
      }
    }

    handleCallback()
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
