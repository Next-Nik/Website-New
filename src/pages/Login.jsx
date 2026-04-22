import { useState, useEffect } from 'react'
import { supabase } from '../hooks/useSupabase'

const body = { fontFamily: "'Lora', Georgia, serif" }
const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }

function getIntendedDestination() {
  const params = new URLSearchParams(window.location.search)
  const redirect = params.get('redirect')
  if (!redirect) return '/'
  if (redirect.startsWith('/')) return redirect
  try {
    const url = new URL(redirect)
    const allowed = ['nextus.world', 'www.nextus.world']
    const isVercel = url.hostname.endsWith('.vercel.app')
    if (allowed.includes(url.hostname) || isVercel) return redirect
  } catch {}
  return '/'
}

function getInitialScreen() {
  const params = new URLSearchParams(window.location.search)
  const s = params.get('screen')
  if (s === 'new-password') return 'new-password'
  if (s === 'signup') return 'signup'
  return 'signin'
}

function storeConsent(mailingOptIn) {
  try {
    sessionStorage.setItem('consent_terms', 'true')
    sessionStorage.setItem('consent_terms_at', new Date().toISOString())
    sessionStorage.setItem('consent_mailing', mailingOptIn ? 'true' : 'false')
  } catch {}
}

function Checkbox({ checked, onChange, children }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '14px' }}>
      <div onClick={onChange} style={{ flexShrink: 0, marginTop: '2px', width: '18px', height: '18px', borderRadius: '4px', border: `1.5px solid ${checked ? '#C8922A' : 'rgba(200,146,42,0.45)'}`, background: checked ? 'rgba(200,146,42,0.10)' : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease', cursor: 'pointer' }}>
        {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#C8922A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
      <span style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.55 }}>{children}</span>
    </label>
  )
}

const inputStyle = { width: '100%', padding: '13px 16px', background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', fontFamily: "'Lora', Georgia, serif", fontSize: '16px', color: '#0F1523', outline: 'none', marginBottom: '12px', boxSizing: 'border-box' }

function GoogleButton() {
  async function handleGoogle() {
    const dest = getIntendedDestination()
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(dest)}` } })
  }
  return (
    <button onClick={handleGoogle} style={{ width: '100%', padding: '13px 16px', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', fontFamily: "'Lora', Georgia, serif", fontSize: '15px', color: '#0F1523', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
      <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
      Continue with Google
    </button>
  )
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
      <div style={{ flex: 1, height: '1px', background: 'rgba(200,146,42,0.20)' }} />
      <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.72)' }}>or</span>
      <div style={{ flex: 1, height: '1px', background: 'rgba(200,146,42,0.20)' }} />
    </div>
  )
}

function PrimaryButton({ onClick, loading, label }) {
  return (
    <button onClick={onClick} disabled={loading} style={{ width: '100%', padding: '16px', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', ...sc, fontSize: '16px', fontWeight: 600, letterSpacing: '0.16em', color: '#A8721A', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1 }}>
      {loading ? 'One moment…' : label}
    </button>
  )
}

function ErrorMsg({ children }) {
  return <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)', marginTop: '8px', padding: '10px 14px', background: 'rgba(200,146,42,0.05)', borderRadius: '14px', border: '1.5px solid rgba(200,146,42,0.35)' }}>{children}</p>
}

// ── Sign In ────────────────────────────────────────────────────

function SignInScreen({ onSwitch, onDone }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit() {
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setLoading(false); setError('Email or password incorrect. Try again or reset your password.'); return }
    onDone()
  }

  return (
    <>
      <h1 style={{ ...body, fontSize: '28px', fontWeight: 300, color: '#0F1523', marginBottom: '6px', lineHeight: 1.2 }}>Welcome back.</h1>
      <p style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.72)', marginBottom: '32px', lineHeight: 1.5 }}>Sign in to continue.</p>
      <GoogleButton />
      <Divider />
      <label style={{ ...sc, fontSize: '13px', letterSpacing: '0.20em', color: '#A8721A', display: 'block', marginBottom: '8px' }}>Email</label>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="your@email.com" autoComplete="email" style={inputStyle} />
      <label style={{ ...sc, fontSize: '13px', letterSpacing: '0.20em', color: '#A8721A', display: 'block', marginBottom: '8px' }}>Password</label>
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="••••••••" autoComplete="current-password" style={inputStyle} />
      <div style={{ textAlign: 'right', marginTop: '-4px', marginBottom: '20px' }}>
        <button onClick={() => onSwitch('reset')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', ...body, fontSize: '13px', color: 'rgba(15,21,35,0.45)', textDecoration: 'underline' }}>Forgot password?</button>
      </div>
      <PrimaryButton onClick={handleSubmit} loading={loading} label="Sign in →" />
      {error && <ErrorMsg>{error}</ErrorMsg>}
      <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.45)', marginTop: '24px', textAlign: 'center' }}>
        New here?{' '}
        <button onClick={() => onSwitch('signup')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', ...body, fontSize: '14px', color: '#A8721A', textDecoration: 'underline' }}>Create an account</button>
      </p>
    </>
  )
}

// ── Sign Up ────────────────────────────────────────────────────

function SignUpScreen({ onSwitch, onDone }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [mailing, setMailing]   = useState(false)
  const [terms, setTerms]       = useState(true)
  const [termsErr, setTermsErr] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit() {
    if (!terms) { setTermsErr(true); return }
    if (!email || !password) { setError('Please fill in all fields.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError("Passwords don't match."); return }
    setLoading(true); setError('')
    storeConsent(mailing)

    const dest = getIntendedDestination()
    try { localStorage.setItem('auth_redirect', dest) } catch {}

    const { error: signUpError } = await supabase.auth.signUp({ email, password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(dest)}` }
    })

    // "User already registered" — just sign them in instead
    if (signUpError && signUpError.message.toLowerCase().includes('already registered')) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setLoading(false)
        setError('You already have an account. Try signing in, or reset your password if you forgot it.')
        // Switch to sign-in screen with the email pre-noted
        setTimeout(() => onSwitch('signin'), 2000)
        return
      }
      onDone(); return
    }

    if (signUpError) { setLoading(false); setError(signUpError.message); return }

    // Sign straight in after signup
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setLoading(false)
      setError('Account created — check your email to confirm, then sign in.')
      return
    }
    onDone()
  }

  return (
    <>
      <h1 style={{ ...body, fontSize: '28px', fontWeight: 300, color: '#0F1523', marginBottom: '6px', lineHeight: 1.2 }}>Create your account.</h1>
      <p style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.72)', marginBottom: '32px', lineHeight: 1.5 }}>You only do this once.</p>
      <GoogleButton />
      <Divider />
      <label style={{ ...sc, fontSize: '13px', letterSpacing: '0.20em', color: '#A8721A', display: 'block', marginBottom: '8px' }}>Email</label>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email" style={inputStyle} />
      <label style={{ ...sc, fontSize: '13px', letterSpacing: '0.20em', color: '#A8721A', display: 'block', marginBottom: '8px' }}>Password</label>
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" style={inputStyle} />
      <label style={{ ...sc, fontSize: '13px', letterSpacing: '0.20em', color: '#A8721A', display: 'block', marginBottom: '8px' }}>Confirm password</label>
      <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="••••••••" autoComplete="new-password" style={inputStyle} />
      <div style={{ margin: '4px 0 16px' }}>
        <Checkbox checked={terms} onChange={() => { setTerms(v => !v); setTermsErr(false) }}>
          I agree to the{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#A8721A', textDecoration: 'underline' }}>Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#A8721A', textDecoration: 'underline' }}>Privacy Policy</a>
        </Checkbox>
        {termsErr && <p style={{ ...body, fontSize: '13px', color: '#C8922A', margin: '-8px 0 10px 28px' }}>Please accept the terms to continue.</p>}
        <Checkbox checked={mailing} onChange={() => setMailing(v => !v)}>Keep me in the loop — occasional updates from NextUs</Checkbox>
      </div>
      <PrimaryButton onClick={handleSubmit} loading={loading} label="Create account →" />
      {error && <ErrorMsg>{error}</ErrorMsg>}
      <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.45)', marginTop: '24px', textAlign: 'center' }}>
        Already have an account?{' '}
        <button onClick={() => onSwitch('signin')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', ...body, fontSize: '14px', color: '#A8721A', textDecoration: 'underline' }}>Sign in</button>
      </p>
    </>
  )
}

// ── Reset Password ─────────────────────────────────────────────

function ResetScreen({ onSwitch }) {
  const [email, setEmail]     = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit() {
    if (!email) { setError('Please enter your email.'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  if (sent) return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(200,146,42,0.08)', border: '1.5px solid rgba(200,146,42,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '22px' }}>✶</div>
      <h2 style={{ ...body, fontSize: '24px', fontWeight: 300, color: '#0F1523', marginBottom: '10px' }}>Check your email.</h2>
      <p style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6 }}>
        We sent a reset link to <span style={{ color: '#A8721A' }}>{email}</span>.<br />Click it to set a new password.
      </p>
      <button onClick={() => onSwitch('signin')} style={{ marginTop: '24px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.45)', textDecoration: 'underline' }}>Back to sign in</button>
    </div>
  )

  return (
    <>
      <button onClick={() => onSwitch('signin')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.45)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px' }}>← Back</button>
      <h1 style={{ ...body, fontSize: '28px', fontWeight: 300, color: '#0F1523', marginBottom: '6px', lineHeight: 1.2 }}>Reset password.</h1>
      <p style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.72)', marginBottom: '32px', lineHeight: 1.5 }}>We'll send a reset link to your email.</p>
      <label style={{ ...sc, fontSize: '13px', letterSpacing: '0.20em', color: '#A8721A', display: 'block', marginBottom: '8px' }}>Email</label>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="your@email.com" autoComplete="email" style={inputStyle} />
      <PrimaryButton onClick={handleSubmit} loading={loading} label="Send reset link →" />
      {error && <ErrorMsg>{error}</ErrorMsg>}
    </>
  )
}

// ── New Password (after reset link click) ──────────────────────

function NewPasswordScreen({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit() {
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError("Passwords don't match."); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setLoading(false); setError(error.message); return }
    onDone()
  }

  return (
    <>
      <h1 style={{ ...body, fontSize: '28px', fontWeight: 300, color: '#0F1523', marginBottom: '6px', lineHeight: 1.2 }}>Set new password.</h1>
      <p style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.72)', marginBottom: '32px', lineHeight: 1.5 }}>Choose something you'll remember.</p>
      <label style={{ ...sc, fontSize: '13px', letterSpacing: '0.20em', color: '#A8721A', display: 'block', marginBottom: '8px' }}>New password</label>
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" style={inputStyle} />
      <label style={{ ...sc, fontSize: '13px', letterSpacing: '0.20em', color: '#A8721A', display: 'block', marginBottom: '8px' }}>Confirm password</label>
      <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="••••••••" autoComplete="new-password" style={inputStyle} />
      <div style={{ marginBottom: '20px' }} />
      <PrimaryButton onClick={handleSubmit} loading={loading} label="Save password →" />
      {error && <ErrorMsg>{error}</ErrorMsg>}
    </>
  )
}

// ── Page ───────────────────────────────────────────────────────

export function LoginPage() {
  const [screen, setScreen] = useState(getInitialScreen)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && screen !== 'new-password') {
        let dest = null
        try { dest = localStorage.getItem('auth_redirect') } catch {}
        if (!dest) dest = getIntendedDestination()
        try { localStorage.removeItem('auth_redirect') } catch {}
        window.location.replace(dest)
      }
    })
  }, [])

  function handleDone() {
    let dest = null
    try { dest = localStorage.getItem('auth_redirect') } catch {}
    if (!dest) dest = getIntendedDestination()
    try { localStorage.removeItem('auth_redirect') } catch {}
    window.location.replace(dest || '/')
  }

  const showBack = screen === 'signin' || screen === 'signup'

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '48px' }}>
        <img src="/logo_nav.png" alt="NextUs" style={{ width: '52px', height: '52px', objectFit: 'contain', marginBottom: '12px' }} />
        <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.72)' }}>NextUs</span>
      </div>

      {showBack && (
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px', fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', textDecoration: 'none' }}>
          <span style={{ fontSize: '16px' }}>←</span> Back
        </a>
      )}

      <div style={{ width: '100%', maxWidth: '400px', background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '40px 36px 36px' }}>
        {screen === 'signin'       && <SignInScreen      onSwitch={setScreen} onDone={handleDone} />}
        {screen === 'signup'       && <SignUpScreen      onSwitch={setScreen} onDone={handleDone} />}
        {screen === 'reset'        && <ResetScreen       onSwitch={setScreen} />}
        {screen === 'new-password' && <NewPasswordScreen onDone={handleDone} />}
      </div>

      <p style={{ marginTop: '32px', ...sc, fontSize: '15px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)' }}>
        <a href="/" style={{ color: '#A8721A', textDecoration: 'none' }}>nextus.world</a>
      </p>
    </div>
  )
}
