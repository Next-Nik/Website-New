import { useState, useEffect } from 'react'
import { supabase } from '../hooks/useSupabase'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const sc = { fontFamily: "'Cormorant SC', Georgia, serif" }

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  function getRedirectUrl() {
    const params = new URLSearchParams(window.location.search)
    const redirect = params.get('redirect')
    if (redirect) {
      try {
        const url = new URL(redirect)
        if (url.hostname === 'nextus.world' || url.hostname === 'www.nextus.world' || url.hostname.endsWith('.vercel.app')) {
          return redirect
        }
      } catch {}
    }
    return 'https://nextus.world'
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) window.location.href = getRedirectUrl()
    })
  }, [])

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getRedirectUrl() }
    })
    if (error) setError(error.message)
  }

  async function handleEmail() {
    if (!email || !email.includes('@')) { setError('Please enter a valid email address.'); return }
    setSending(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: getRedirectUrl(), shouldCreateUser: true }
    })
    if (error) { setError(error.message); setSending(false); return }
    setSent(true); setSending(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '48px' }}>
        <img src="/logo_nav.png" alt="NextUs" style={{ width: '52px', height: '52px', objectFit: 'contain', marginBottom: '12px' }} />
        <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.45)' }}>NextUs</span>
      </div>

      <div style={{ width: '100%', maxWidth: '400px', background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '40px 36px 36px' }}>
        {!sent ? (
          <>
            <h1 style={{ ...serif, fontSize: '28px', fontWeight: 300, color: '#0F1523', marginBottom: '6px', lineHeight: 1.2 }}>Welcome.</h1>
            <p style={{ ...serif, fontSize: '14px', fontStyle: 'italic', color: 'rgba(15,21,35,0.45)', marginBottom: '32px', lineHeight: 1.5 }}>Sign in or create your account to continue.</p>

            {/* Google */}
            <button onClick={handleGoogle} style={{ width: '100%', padding: '13px 16px', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', ...serif, fontSize: '15px', color: '#0F1523', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(200,146,42,0.20)' }} />
              <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.35)' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(200,146,42,0.20)' }} />
            </div>

            <label style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.20em', color: '#A8721A', display: 'block', marginBottom: '8px' }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEmail()}
              placeholder="your@email.com" autoComplete="email"
              style={{ width: '100%', padding: '13px 16px', background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', ...serif, fontSize: '16px', color: '#0F1523', outline: 'none', marginBottom: '12px' }}
            />
            <button onClick={handleEmail} disabled={sending} style={{ width: '100%', padding: '16px', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', ...sc, fontSize: '16px', fontWeight: 600, letterSpacing: '0.16em', color: '#A8721A', cursor: 'pointer', opacity: sending ? 0.5 : 1 }}>
              {sending ? 'Sending...' : 'Continue with email \u2192'}
            </button>
            {error && <p style={{ ...serif, fontSize: '15px', fontStyle: 'italic', color: 'rgba(15,21,35,0.78)', marginTop: '8px', padding: '10px 14px', background: 'rgba(200,146,42,0.05)', borderRadius: '14px', border: '1.5px solid rgba(200,146,42,0.35)' }}>{error}</p>}
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(200,146,42,0.1)', border: '1.5px solid rgba(200,146,42,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '22px' }}>{'\u2736'}</div>
            <h2 style={{ ...serif, fontSize: '24px', fontWeight: 300, color: '#0F1523', marginBottom: '10px' }}>Check your email.</h2>
            <p style={{ ...serif, fontSize: '14px', fontStyle: 'italic', color: 'rgba(15,21,35,0.5)', lineHeight: 1.6 }}>
              We sent a sign-in link to<br />
              <span style={{ fontStyle: 'normal', color: '#A8721A' }}>{email}</span>
            </p>
            <p style={{ ...serif, fontSize: '14px', fontStyle: 'italic', color: 'rgba(15,21,35,0.5)', marginTop: '12px', lineHeight: 1.6 }}>Click the link to continue. You can close this tab.</p>
          </div>
        )}
      </div>

      <p style={{ marginTop: '32px', ...sc, fontSize: '15px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.3)' }}>
        <a href="/" style={{ color: '#C8922A', textDecoration: 'none' }}>nextus.world</a>
      </p>
    </div>
  )
}
