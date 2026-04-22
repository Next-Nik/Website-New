// src/pages/AuthCallback.jsx
// Supabase processes the ?code= or #access_token from the URL automatically
// when detectSessionInUrl: true (set in useSupabase.js).
// This page waits for the SIGNED_IN event, writes consent flags if present,
// then redirects to the stored destination.

import { useEffect, useState } from 'react'
import { supabase } from '../hooks/useSupabase'

const body = { fontFamily: "'Lora', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }

function getDestination() {
  const params = new URLSearchParams(window.location.search)
  let dest = params.get('redirect') || null

  if (!dest) {
    try { dest = localStorage.getItem('auth_redirect') } catch {}
  }
  try { localStorage.removeItem('auth_redirect') } catch {}

  if (!dest) return '/'
  if (dest.startsWith('/')) return dest

  try {
    const url = new URL(dest)
    const allowed = ['nextus.world', 'www.nextus.world']
    const isVercel = url.hostname.endsWith('.vercel.app')
    if (allowed.includes(url.hostname) || isVercel) return dest
  } catch {}

  return '/'
}

async function writeConsent(userId) {
  try {
    const termsAt  = sessionStorage.getItem('consent_terms_at')
    const mailing  = sessionStorage.getItem('consent_mailing')

    // Only write if consent flags are present — skips returning users
    // who sign in without going through the login form this session
    if (!termsAt) return

    await supabase.from('user_consent').upsert(
      {
        user_id:          userId,
        terms_accepted_at: termsAt,
        mailing_opt_in:   mailing === 'true',
        updated_at:       new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    sessionStorage.removeItem('consent_terms')
    sessionStorage.removeItem('consent_terms_at')
    sessionStorage.removeItem('consent_mailing')
  } catch {
    // Non-fatal — don't block redirect on a consent write failure
  }
}

export function AuthCallbackPage() {
  const [status, setStatus] = useState('Signing you in…')

  useEffect(() => {
    let redirected = false

    async function doRedirect(session) {
      if (redirected) return
      redirected = true
      await writeConsent(session.user.id)
      window.location.replace(getDestination())
    }

    // 1. Check if session already exists (hash-based flow or fast PKCE)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) doRedirect(session)
    })

    // 2. Listen for SIGNED_IN — fires when PKCE exchange completes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        subscription.unsubscribe()
        clearTimeout(warningTimer)
        clearTimeout(hardTimer)
        doRedirect(session)
      }
      if (event === 'SIGNED_OUT') {
        subscription.unsubscribe()
        clearTimeout(warningTimer)
        clearTimeout(hardTimer)
        if (!redirected) window.location.replace('/login')
      }
    })

    // 3. Cosmetic "taking longer" message at 4s — does not abort anything
    const warningTimer = setTimeout(() => {
      setStatus('Taking longer than expected…')
    }, 4000)

    // 4. Hard timeout at 20s — PKCE on slow connections can take 10–15s.
    //    Poll a few more times before giving up to avoid false send-to-login.
    const hardTimer = setTimeout(async () => {
      subscription.unsubscribe()
      if (redirected) return

      for (let i = 0; i < 3; i++) {
        await new Promise(r => setTimeout(r, 2000))
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) { doRedirect(session); return }
      }

      if (!redirected) window.location.replace('/login')
    }, 20000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(warningTimer)
      clearTimeout(hardTimer)
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>
          The Horizon Suite
        </span>
        <p style={{ ...body, fontSize: '20px', color: 'rgba(15,21,35,0.55)' }}>
          {status}
        </p>
      </div>
    </div>
  )
}
