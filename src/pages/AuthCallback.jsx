// src/pages/AuthCallback.jsx
import { useEffect } from 'react'
import { supabase } from '../hooks/useSupabase'

function getDestination() {
  const params = new URLSearchParams(window.location.search)
  let dest = params.get('redirect') || null
  if (!dest) { try { dest = localStorage.getItem('auth_redirect') } catch {} }
  try { localStorage.removeItem('auth_redirect') } catch {}
  if (!dest) return '/'
  if (dest.startsWith('/')) return dest
  try {
    const url = new URL(dest)
    const allowed = ['nextus.world', 'www.nextus.world']
    const isVercel = url.hostname.endsWith('.vercel.app')
    if (allowed.includes(url.hostname) || isVercel) return url.pathname + url.search + url.hash
  } catch {}
  return '/'
}

// Returns true if the URL contains a Supabase auth code to be exchanged.
// When a code is present, we MUST NOT call getSession() early — we have to
// let onAuthStateChange process the exchange first, so we get the correct event.
function hasAuthCode() {
  const search = new URLSearchParams(window.location.search)
  const hash   = new URLSearchParams(window.location.hash.replace('#', '?'))
  return !!(search.get('code') || hash.get('access_token'))
}

// Synchronous check for recovery type in hash (implicit/legacy flow only)
function isRecoveryInHash() {
  const hash = new URLSearchParams(window.location.hash.replace('#', '?'))
  return hash.get('type') === 'recovery'
}

async function writeConsent(userId) {
  try {
    const termsAt = sessionStorage.getItem('consent_terms_at')
    const mailing = sessionStorage.getItem('consent_mailing')
    if (!termsAt) return
    await supabase.from('user_consent').upsert(
      { user_id: userId, terms_accepted_at: termsAt, mailing_opt_in: mailing === 'true', updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    sessionStorage.removeItem('consent_terms')
    sessionStorage.removeItem('consent_terms_at')
    sessionStorage.removeItem('consent_mailing')
  } catch {}
}

export function AuthCallbackPage() {
  useEffect(() => {
    // Legacy implicit flow: type=recovery is in the hash right now
    if (isRecoveryInHash()) {
      window.location.replace('/login?screen=new-password')
      return
    }

    let redirected = false

    async function doRedirect(session) {
      if (redirected) return
      redirected = true
      await writeConsent(session.user.id)
      window.location.replace(getDestination())
    }

    // Only do an immediate session check when there's NO code to exchange.
    // If there IS a code (PKCE), we must wait for onAuthStateChange to process
    // the exchange — calling getSession() first would race against it and could
    // redirect before we see the PASSWORD_RECOVERY event.
    if (!hasAuthCode()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) doRedirect(session)
      })
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // PASSWORD_RECOVERY must be caught before SIGNED_IN —
      // Supabase fires SIGNED_IN for recovery sessions too
      if (event === 'PASSWORD_RECOVERY') {
        subscription.unsubscribe()
        clearTimeout(timer)
        window.location.replace('/login?screen=new-password')
        return
      }

      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        subscription.unsubscribe()
        clearTimeout(timer)
        doRedirect(session)
        return
      }

      if (event === 'SIGNED_OUT' && !redirected) {
        subscription.unsubscribe()
        clearTimeout(timer)
        window.location.replace('/login')
      }
    })

    const timer = setTimeout(async () => {
      subscription.unsubscribe()
      if (redirected) return
      const { data: { session } } = await supabase.auth.getSession()
      window.location.replace(session?.user ? getDestination() : '/login?expired=1')
    }, 8000)

    return () => { subscription.unsubscribe(); clearTimeout(timer) }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <img src="/logo_nav.png" alt="NextUs" style={{ width: '44px', height: '44px', objectFit: 'contain', marginBottom: '28px', opacity: 0.7 }} />
        <div style={{ width: '28px', height: '28px', margin: '0 auto', border: '2px solid rgba(200,146,42,0.18)', borderTopColor: '#C8922A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}
