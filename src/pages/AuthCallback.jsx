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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await writeConsent(session.user.id)
        window.location.replace(getDestination())
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        subscription.unsubscribe()
        await writeConsent(session.user.id)
        window.location.replace(getDestination())
      }
      if (event === 'SIGNED_OUT') {
        subscription.unsubscribe()
        window.location.replace('/login')
      }
    })

    const timer = setTimeout(() => {
      subscription.unsubscribe()
      setStatus('Taking longer than expected…')
      supabase.auth.getSession().then(({ data: { session } }) => {
        window.location.replace(session?.user ? getDestination() : '/login')
      })
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
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
