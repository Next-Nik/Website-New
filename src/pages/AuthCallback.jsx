// src/pages/AuthCallback.jsx
// Handles Supabase auth redirects — both magic link (hash) and OAuth (code/PKCE).
//
// Magic link: Supabase appends #access_token=...&refresh_token=... to the URL.
//   We must call setSession() with those tokens before getSession() will work.
//
// OAuth (Google): Supabase uses PKCE — appends ?code=... to the URL.
//   We must call exchangeCodeForSession(code) first.

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
  // Safety: same-origin only
  if (dest) {
    if (dest.startsWith('/')) return dest
    try {
      const url = new URL(dest, window.location.origin)
      if (url.hostname === window.location.hostname) return dest
    } catch {}
    return '/'
  }
  return '/'
}

export function AuthCallbackPage() {
  const [status, setStatus] = useState('Signing you in…')

  useEffect(() => {
    async function handleCallback() {
      try {
        const hash   = window.location.hash
        const params = new URLSearchParams(window.location.search)
        const code   = params.get('code')

        // ── Path 1: Magic link — hash contains access_token + refresh_token ──
        if (hash && hash.includes('access_token')) {
          const hashParams = new URLSearchParams(hash.substring(1))
          const accessToken  = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token:  accessToken,
              refresh_token: refreshToken,
            })
            if (error) {
              console.error('setSession error:', error.message)
              setStatus('Something went wrong. Redirecting…')
              setTimeout(() => { window.location.href = '/login' }, 2000)
              return
            }
            window.location.href = getDestination()
            return
          }
        }

        // ── Path 2: OAuth PKCE — URL has ?code= ────────────────────────────
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            console.error('exchangeCodeForSession error:', error.message)
            setStatus('Something went wrong. Redirecting…')
            setTimeout(() => { window.location.href = '/login' }, 2000)
            return
          }
          window.location.href = getDestination()
          return
        }

        // ── Path 3: Session already exists (e.g. page refresh) ─────────────
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          window.location.href = getDestination()
          return
        }

        // ── Path 4: Wait for onAuthStateChange (fallback) ───────────────────
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            subscription.unsubscribe()
            window.location.href = getDestination()
          }
        })

        // If nothing fires after 5 seconds, send to login
        setTimeout(() => {
          subscription.unsubscribe()
          window.location.href = '/login'
        }, 5000)

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
