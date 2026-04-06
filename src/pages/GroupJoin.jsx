import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../hooks/useSupabase'
import { useAuth } from '../hooks/useAuth'
import { Nav } from '../components/Nav'

const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const gold  = '#A8721A'

/**
 * GroupJoinPage
 *
 * Handles two entry paths:
 * 1. /join/:slug          — arrived via QR or link, slug pre-filled
 * 2. /join               — arrived manually, enters code themselves
 *
 * States:
 *   loading              — checking group / auth
 *   not-signed-in        — prompt to sign in first, then return
 *   already-member       — they're already in this group
 *   pending              — request submitted, awaiting approval
 *   joined               — auto-approved, access active
 *   not-found            — bad slug or code
 *   error                — something went wrong
 */
export function GroupJoinPage() {
  const { slug }          = useParams()
  const { user, loading: authLoading } = useAuth()
  const navigate          = useNavigate()

  const [code, setCode]   = useState('')
  const [state, setState] = useState('idle') // idle | loading | joined | pending | already | notfound | error
  const [group, setGroup] = useState(null)
  const [message, setMsg] = useState('')

  // If arrived via slug link, auto-lookup the group
  useEffect(() => {
    if (!slug || authLoading) return
    lookupBySlug(slug)
  }, [slug, authLoading])

  async function lookupBySlug(s) {
    setState('loading')
    const { data } = await supabase
      .from('groups')
      .select('id, name, description, requires_approval, active')
      .eq('slug', s)
      .eq('active', true)
      .maybeSingle()

    if (!data) { setState('notfound'); return }
    setGroup(data)
    if (user) {
      await attemptJoin(data, user.id)
    } else {
      setState('idle') // show sign-in prompt with group context
    }
  }

  async function lookupByCode() {
    if (!code.trim()) return
    setState('loading')
    const { data } = await supabase
      .from('groups')
      .select('id, name, description, requires_approval, active')
      .eq('code', code.trim().toUpperCase())
      .eq('active', true)
      .maybeSingle()

    if (!data) { setState('notfound'); setMsg('That code doesn\'t match any active group.'); return }
    setGroup(data)
    if (user) {
      await attemptJoin(data, user.id)
    } else {
      setState('idle')
    }
  }

  async function attemptJoin(g, userId) {
    // Check if already a member
    const { data: existing } = await supabase
      .from('group_members')
      .select('id, status')
      .eq('group_id', g.id)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'active')  { setState('already');  return }
      if (existing.status === 'pending') { setState('pending');  return }
      if (existing.status === 'removed') {
        // Previously removed — re-apply, goes to pending regardless of group setting
        await supabase.from('group_members')
          .update({ status: 'pending', removed_at: null, joined_at: new Date().toISOString() })
          .eq('id', existing.id)
        setState('pending')
        return
      }
    }

    // New member
    const status = g.requires_approval ? 'pending' : 'active'
    const { error } = await supabase.from('group_members').insert({
      group_id:    g.id,
      user_id:     userId,
      status,
      joined_at:   new Date().toISOString(),
      approved_at: status === 'active' ? new Date().toISOString() : null,
    })

    if (error) { setState('error'); setMsg(error.message); return }
    setState(status === 'active' ? 'joined' : 'pending')
  }

  // After sign-in redirect back
  function signIn() {
    const returnUrl = encodeURIComponent(window.location.href)
    window.location.href = `/login?redirect=${returnUrl}`
  }

  if (authLoading || state === 'loading') {
    return <div className="loading" />
  }

  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <Nav />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 'calc(100vh - 64px)', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          {/* Idle — no group identified yet, or group found but user not signed in */}
          {state === 'idle' && !group && (
            <Card>
              <Eyebrow>Join a group</Eyebrow>
              <h1 style={{ ...serif, fontSize: '28px', fontWeight: 300, color: '#0F1523',
                marginBottom: '20px', lineHeight: 1.2 }}>
                Enter your access code.
              </h1>
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && lookupByCode()}
                placeholder="ACCESS CODE"
                style={{
                  ...sc, fontSize: '18px', letterSpacing: '0.2em',
                  color: '#0F1523', textAlign: 'center',
                  width: '100%', padding: '14px 18px',
                  border: '1.5px solid rgba(200,146,42,0.78)',
                  borderRadius: '40px', background: '#FFFFFF',
                  outline: 'none', marginBottom: '12px',
                }}
              />
              <Cta onClick={lookupByCode}>Continue →</Cta>
            </Card>
          )}

          {/* Group found but not signed in */}
          {state === 'idle' && group && !user && (
            <Card>
              <Eyebrow>{group.name}</Eyebrow>
              <h1 style={{ ...serif, fontSize: '26px', fontWeight: 300, color: '#0F1523',
                marginBottom: '10px', lineHeight: 1.2 }}>
                Sign in to join.
              </h1>
              {group.description && (
                <p style={{ ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.72)',
                  lineHeight: 1.65, marginBottom: '24px' }}>
                  {group.description}
                </p>
              )}
              <Cta onClick={signIn}>Sign in or create account →</Cta>
            </Card>
          )}

          {/* Joined — auto-approved */}
          {state === 'joined' && (
            <Card>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>✦</div>
              <Eyebrow>{group?.name}</Eyebrow>
              <h1 style={{ ...serif, fontSize: '26px', fontWeight: 300, color: '#0F1523',
                marginBottom: '10px' }}>
                You're in.
              </h1>
              <p style={{ ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.72)',
                lineHeight: 1.65, marginBottom: '24px' }}>
                Your access is active. Head to your profile to see what's available.
              </p>
              <Cta onClick={() => navigate('/profile')}>Go to profile →</Cta>
            </Card>
          )}

          {/* Pending — requires approval */}
          {state === 'pending' && (
            <Card>
              <Eyebrow>{group?.name}</Eyebrow>
              <h1 style={{ ...serif, fontSize: '26px', fontWeight: 300, color: '#0F1523',
                marginBottom: '10px' }}>
                Request received.
              </h1>
              <p style={{ ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.72)',
                lineHeight: 1.65 }}>
                This group requires approval. You'll hear from us once your request
                has been reviewed. If you're in a hurry, reach out directly.
              </p>
            </Card>
          )}

          {/* Already a member */}
          {state === 'already' && (
            <Card>
              <Eyebrow>{group?.name}</Eyebrow>
              <h1 style={{ ...serif, fontSize: '26px', fontWeight: 300, color: '#0F1523',
                marginBottom: '10px' }}>
                You're already a member.
              </h1>
              <p style={{ ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.72)',
                lineHeight: 1.65, marginBottom: '24px' }}>
                Your access is active.
              </p>
              <Cta onClick={() => navigate('/profile')}>Go to profile →</Cta>
            </Card>
          )}

          {/* Not found */}
          {state === 'notfound' && (
            <Card>
              <h1 style={{ ...serif, fontSize: '26px', fontWeight: 300, color: '#0F1523',
                marginBottom: '10px' }}>
                Code not found.
              </h1>
              <p style={{ ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.72)',
                lineHeight: 1.65, marginBottom: '24px' }}>
                {message || 'That link doesn\'t match an active group. Check the code and try again.'}
              </p>
              <Cta onClick={() => { setState('idle'); setGroup(null); setCode('') }}>
                Try again
              </Cta>
            </Card>
          )}

          {/* Error */}
          {state === 'error' && (
            <Card>
              <h1 style={{ ...serif, fontSize: '26px', fontWeight: 300, color: '#0F1523',
                marginBottom: '10px' }}>
                Something went wrong.
              </h1>
              <p style={{ ...serif, fontSize: '15px', color: 'rgba(15,21,35,0.72)',
                lineHeight: 1.65 }}>
                {message}
              </p>
            </Card>
          )}

        </div>
      </div>
    </div>
  )
}

function Card({ children }) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1.5px solid rgba(200,146,42,0.78)',
      borderRadius: '14px', padding: '36px 32px',
      textAlign: 'center',
    }}>
      {children}
    </div>
  )
}

function Eyebrow({ children }) {
  return (
    <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.2em', color: gold,
      textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
      {children}
    </span>
  )
}

function Cta({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-block', padding: '14px 28px',
      borderRadius: '40px',
      border: '1.5px solid rgba(200,146,42,0.78)',
      background: 'rgba(200,146,42,0.05)',
      ...sc, fontSize: '17px', fontWeight: 600,
      letterSpacing: '0.14em', color: gold,
      cursor: 'pointer',
    }}>
      {children}
    </button>
  )
}
