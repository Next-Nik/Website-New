// /contribution — Asks browse page (B3, June 2026).
//
// Reads community-visible asks from actor_calls (type='ask', visibility='community').
// Falls back gracefully to the legacy org_needs_beta data when actor_calls is
// empty — so the page is useful immediately and improves as Asks populate.
//
// Route: /contribution (existing, unchanged)
// Legacy redirect: /nextus/actors/:id/needs/new → /ask/new?actor=:id (in App.jsx)

import { useState, useEffect } from 'react'
import { Nav }        from '../../components/Nav'
import { useAuth }    from '../../hooks/useAuth'
import { supabase }   from '../../hooks/useSupabase'
import { tokens, serif, body, sc } from '../../lib/designTokens'

const gold   = { color: tokens.gold }
const muted  = { color: 'rgba(15,21,35,0.78)' }
const hair   = '1px solid rgba(200,146,42,0.18)'
const GOLD_C = tokens.goldChrome

function Eyebrow({ children, style = {} }) {
  return (
    <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', ...gold, marginBottom: '6px', textTransform: 'uppercase', ...style }}>
      {children}
    </div>
  )
}

// ─── Domain filter chips ──────────────────────────────────────────────────────

const DOMAINS = [
  { id: '',                  l: 'All' },
  { id: 'Human Being',       l: 'Human Being' },
  { id: 'Society',           l: 'Society' },
  { id: 'Nature',            l: 'Nature' },
  { id: 'Technology',        l: 'Technology' },
  { id: 'Finance & Economy', l: 'Finance' },
  { id: 'Legacy',            l: 'Legacy' },
  { id: 'Vision',            l: 'Vision' },
]

function DomainChips({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
      {DOMAINS.map(d => (
        <button key={d.id} type="button" onClick={() => onChange(d.id)}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s',
            border: `1px solid ${value === d.id ? 'rgba(200,146,42,0.78)' : 'rgba(200,146,42,0.3)'}`,
            background: value === d.id ? 'rgba(200,146,42,0.08)' : 'transparent',
            color: value === d.id ? tokens.gold : tokens.ghost }}>
          {d.l}
        </button>
      ))}
    </div>
  )
}

// ─── Ask card ─────────────────────────────────────────────────────────────────

function AskCard({ call }) {
  const spotsLeft = call.ask_quantity
    ? Math.max(0, call.ask_quantity - (call.active_count || 0))
    : null
  const isFull    = spotsLeft !== null && spotsLeft === 0
  const deadline  = call.ask_deadline
    ? new Date(call.ask_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <a href={call.slug ? `/stretch/c/${call.slug}` : '#'}
      style={{ display: 'block', padding: '20px 22px', background: tokens.bgCard, border: hair, borderRadius: '12px', textDecoration: 'none', transition: 'all 0.2s', cursor: 'pointer' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(15,21,35,0.06)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '12px' }}>
        <Eyebrow style={{ marginBottom: 0 }}>{call.domain || 'Atlas'}</Eyebrow>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          {deadline && (
            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: tokens.ghost }}>by {deadline}</span>
          )}
          {spotsLeft !== null && (
            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: isFull ? '#D63838' : tokens.gold }}>
              {isFull ? 'Full' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'}`}
            </span>
          )}
        </div>
      </div>
      <div style={{ ...sc, fontSize: '1.0625rem', letterSpacing: '0.04em', color: tokens.dark, marginBottom: '6px', lineHeight: 1.4 }}>
        {call.title}
      </div>
      <div style={{ ...body, fontSize: '1.0625rem', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6, marginBottom: '10px' }}>
        {call.the_move?.slice(0, 140)}{call.the_move?.length > 140 ? '…' : ''}
      </div>
      {call.nextus_actors?.name && (
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: tokens.ghost }}>
          {call.nextus_actors.name}
        </div>
      )}
    </a>
  )
}

// ─── Legacy ask card (org_needs_beta fallback) ────────────────────────────────

function LegacyAskCard({ need }) {
  return (
    <div style={{ padding: '20px 22px', background: tokens.bgCard, border: `1px solid rgba(15,21,35,0.1)`, borderRadius: '12px', opacity: 0.8 }}>
      <Eyebrow style={{ marginBottom: '6px' }}>{need.domain || 'Atlas'}</Eyebrow>
      <div style={{ ...sc, fontSize: '1.0625rem', letterSpacing: '0.04em', color: tokens.dark, marginBottom: '6px', lineHeight: 1.4 }}>
        {need.title || need.need_type || 'Open need'}
      </div>
      <div style={{ ...body, fontSize: '1.0625rem', color: 'rgba(15,21,35,0.65)', lineHeight: 1.6 }}>
        {(need.description || '').slice(0, 140)}
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ domain }) {
  return (
    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0' }}>
      <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.16em', color: tokens.ghost, marginBottom: '12px' }}>
        {domain ? `No open asks in ${domain} yet.` : 'No open asks yet.'}
      </div>
      <p style={{ ...body, fontSize: '1.0625rem', color: tokens.ghost, lineHeight: 1.7, maxWidth: '400px', margin: '0 auto 20px' }}>
        Asks appear here when Atlas actors and community members post specific needs. Be the first.
      </p>
      <a href="/tools/target-sprint"
        style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', ...gold, textDecoration: 'none', border: '1px solid rgba(200,146,42,0.5)', borderRadius: '30px', padding: '8px 20px', display: 'inline-block' }}>
        Post from your stretch →
      </a>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ContributionPage() {
  const { user }                 = useAuth()
  const [calls,    setCalls]     = useState([])
  const [legacy,   setLegacy]    = useState([])
  const [loading,  setLoading]   = useState(true)
  const [domain,   setDomain]    = useState('')
  const [tab,      setTab]       = useState('asks')   // asks | offering

  useEffect(() => { loadAsks() }, [domain])

  async function loadAsks() {
    setLoading(true)
    try {
      const res  = await fetch('/api/actor-calls', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'browse_asks', domain: domain || undefined, limit: 24 }),
      })
      const data = await res.json()
      const rows = data.calls || []
      setCalls(rows)

      // Legacy fallback — only load when actor_calls returns nothing
      if (rows.length === 0) {
        const { data: legacyRows } = await supabase
          .from('org_needs_beta')
          .select('id, title, description, need_type, domain, created_at')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(12)
        setLegacy(legacyRows || [])
      } else {
        setLegacy([])
      }
    } catch {
      setLegacy([])
    }
    setLoading(false)
  }

  const allCalls  = calls
  const showEmpty = !loading && allCalls.length === 0 && legacy.length === 0

  return (
    <div style={{ background: tokens.bg, minHeight: '100dvh' }}>
      <Nav />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: 'clamp(64px,8vw,96px) clamp(20px,5vw,40px) 100px' }}>

        <Eyebrow>The Atlas</Eyebrow>
        <h1 style={{ ...serif, fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 300, color: tokens.dark, lineHeight: 1.1, marginBottom: '10px' }}>
          Where you're needed.
        </h1>
        <p style={{ ...body, fontSize: '1.125rem', ...muted, lineHeight: 1.75, marginBottom: '28px', maxWidth: '560px' }}>
          Specific things that Atlas actors and community members need right now — a skill, a window of time, a resource, a voice. Find where your capacity fits.
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '24px', borderBottom: '1px solid rgba(200,146,42,0.18)' }}>
          {[
            { id: 'asks',     l: 'Open asks' },
            { id: 'offering', l: 'What I can offer' },
          ].map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
                color: tab === t.id ? tokens.gold : tokens.ghost,
                borderBottom: tab === t.id ? `2px solid ${GOLD_C}` : '2px solid transparent',
                marginBottom: '-1px', transition: 'all 0.2s' }}>
              {t.l}
            </button>
          ))}
        </div>

        {tab === 'asks' && (
          <div>
            <DomainChips value={domain} onChange={setDomain} />

            {loading ? (
              <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.16em', color: tokens.ghost, padding: '40px 0', textAlign: 'center' }}>
                Loading asks…
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                {allCalls.map(c => <AskCard key={c.id} call={c} />)}
                {legacy.map(n => <LegacyAskCard key={n.id} need={n} />)}
                {showEmpty && <EmptyState domain={domain} />}
              </div>
            )}
          </div>
        )}

        {tab === 'offering' && (
          <div style={{ maxWidth: '560px' }}>
            <p style={{ ...body, fontSize: '1.0625rem', ...muted, lineHeight: 1.7, marginBottom: '20px' }}>
              What capacity do you have to give right now? Posting what you can offer helps the Atlas route asks toward you.
            </p>
            <div style={{ padding: '24px', background: tokens.bgCard, border: hair, borderRadius: '12px' }}>
              <Eyebrow>Coming soon</Eyebrow>
              <p style={{ ...body, fontSize: '1.0625rem', color: tokens.ghost, lineHeight: 1.7, margin: 0 }}>
                The offering directory is being built. For now, take on open asks directly from the browse view.
              </p>
            </div>
          </div>
        )}

        {/* Post an ask CTA */}
        {user && tab === 'asks' && (
          <div style={{ marginTop: '40px', paddingTop: '28px', borderTop: '1px solid rgba(200,146,42,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ ...body, fontSize: '1.0625rem', color: tokens.ghost }}>Have a specific need?</span>
            <a href="/tools/target-sprint"
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', ...gold, textDecoration: 'none', border: '1px solid rgba(200,146,42,0.5)', borderRadius: '30px', padding: '8px 20px', display: 'inline-block' }}>
              Post an ask from your stretch →
            </a>
          </div>
        )}

      </div>
    </div>
  )
}
