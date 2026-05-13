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

function hasAuthCode() {
  const search = new URLSearchParams(window.location.search)
  const hash   = new URLSearchParams(window.location.hash.replace('#', '?'))
  return !!(search.get('code') || hash.get('access_token'))
}

// The reset password link stores a flag before redirecting so we know
// to show the new-password screen when we come back.
const RECOVERY_FLAG = 'nextus_password_recovery'

function markAsRecovery() {
  try { localStorage.setItem(RECOVERY_FLAG, '1') } catch {}
}

function consumeRecoveryFlag() {
  try {
    const val = localStorage.getItem(RECOVERY_FLAG)
    localStorage.removeItem(RECOVERY_FLAG)
    return val === '1'
  } catch { return false }
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
    let handled = false

    function goToNewPassword() {
      if (handled) return
      handled = true
      window.location.replace('/login?screen=new-password')
    }

    async function goToApp(session) {
      if (handled) return
      handled = true
      await writeConsent(session.user.id)
      window.location.replace(getDestination())
    }

    async function handleSession(session) {
      if (handled) return
      if (!session?.user) return
      // If this session came from a password reset link, go to new-password screen
      if (consumeRecoveryFlag()) {
        goToNewPassword()
      } else {
        goToApp(session)
      }
    }

    if (!hasAuthCode()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) handleSession(session)
      })
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (handled) return

      if (event === 'PASSWORD_RECOVERY') {
        subscription.unsubscribe()
        clearTimeout(timer)
        goToNewPassword()
        return
      }

      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        subscription.unsubscribe()
        clearTimeout(timer)
        await handleSession(session)
        return
      }

      if (event === 'SIGNED_OUT' && !handled) {
        subscription.unsubscribe()
        clearTimeout(timer)
        window.location.replace('/login')
      }
    })

    const timer = setTimeout(async () => {
      subscription.unsubscribe()
      if (handled) return
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await handleSession(session)
      } else {
        handled = true
        window.location.replace('/login?expired=1')
      }
    }, 12000)

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

export { markAsRecovery }
