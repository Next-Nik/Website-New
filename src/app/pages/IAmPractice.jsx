// ─────────────────────────────────────────────────────────────
// IAmPractice.jsx — /tools/i-am
//
// An evening writing practice on your declared I Am statements.
// See a statement, drop into the feeling it carries, write it out
// three to ten times. Repetition clarifies what you actually want
// to become — so an Edit button round-trips to the canonical I Am
// editor (/nextu/i-am) and returns you to the same statement.
//
// Statements are read live from horizon_profile.ia_statement (the
// I Am chapter is the only writer). Sessions write to
// practice_writing_entries (127) and surface in the Journal.
// Developmental-rail: private by default, never public.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import WorldMapSubstrate from '../components/mission-control/WorldMapSubstrate'
import BreathPacer from '../components/daily/BreathPacer'
import { serif, body, sc, text } from '../../lib/designTokens'
import { DOMAIN_COPY, DOMAIN_KEYS } from '../../constants/domainCopy'

const tokens = {
  bg:        '#FAFAF7',
  ink:       '#0F1523',
  inkSoft:   'rgba(15, 21, 35, 0.78)',
  inkMid:    'rgba(15, 21, 35, 0.60)',
  inkFaint:  'rgba(15, 21, 35, 0.55)',
  gold:      '#A8721A',  // text only
  goldChrome:'#C8922A',  // chrome/borders only
  goldRule:  'rgba(200, 146, 42, 0.30)',
  goldFaint: 'rgba(200, 146, 42, 0.12)',
  card:      '#FFFFFF',
}

// The anchor is one line. If a statement is a longer paragraph (older
// statements were written as a mass), show its first sentence as the line
// until it is distilled — the full text stays available behind "See full".
function anchorLine(s) {
  if (!s) return ''
  const t = String(s).trim()
  const m = t.match(/^[\s\S]*?[.!?](?=\s|$)/)
  return (m ? m[0] : t).replace(/[.!?]+\s*$/, '').trim()
}

export default function IAmPractice({ embedded = false } = {}) {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const wantDomain = params.get('domain')

  const [byDomain, setByDomain] = useState({})
  const [idx, setIdx]           = useState(0)
  const [written, setWritten]   = useState('')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [showFull, setShowFull] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/login'); return }
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('horizon_profile')
        .select('domain, ia_statement, ia_statement_full')
        .eq('user_id', user.id)
      if (cancelled) return
      const m = {}
      ;(data || []).forEach(r => {
        m[r.domain] = { distill: r.ia_statement || '', full: r.ia_statement_full || '' }
      })
      setByDomain(m)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user, authLoading, navigate])

  // The deck: declared statements only, in domain order.
  const deck = useMemo(
    () => DOMAIN_KEYS.filter(k => ((byDomain[k]?.distill || byDomain[k]?.full || '').trim().length > 0)),
    [byDomain],
  )

  // Land on the requested domain when returning from the editor.
  useEffect(() => {
    if (!deck.length) return
    if (wantDomain) {
      const i = deck.indexOf(wantDomain)
      if (i >= 0) { setIdx(i); return }
    }
    if (idx > deck.length - 1) setIdx(0)
  }, [deck, wantDomain]) // eslint-disable-line react-hooks/exhaustive-deps

  const domainKey = deck[idx]
  const entry = domainKey ? byDomain[domainKey] : null
  const fullText = entry ? (entry.full || entry.distill || '') : ''
  const line = entry ? (anchorLine(entry.distill) || anchorLine(entry.full)) : ''
  const hasMore = fullText.trim() && fullText.trim() !== line.trim()
  const title = domainKey ? (DOMAIN_COPY[domainKey]?.title || domainKey) : ''

  // A gentle line count, never a score.
  const reps = written.split('\n').filter(l => l.trim().length > 0).length

  function flashSaved() {
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2200)
  }

  async function handleSave() {
    if (!user || saving) return
    const text = written.trim()
    if (!text || !domainKey) return
    const sessionId = (crypto?.randomUUID && crypto.randomUUID()) ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setSaving(true)
    const { error } = await supabase.from('practice_writing_entries').insert({
      user_id: user.id, session_id: sessionId,
      practice: 'i_am', domain: domainKey, body: text,
    })
    setSaving(false)
    if (error) return
    setWritten('')
    flashSaved()
  }

  function goEdit() {
    const back = `/tools/i-am?domain=${domainKey}`
    navigate(`/nextu/i-am?domain=${domainKey}&return=${encodeURIComponent(back)}`)
  }

  function move(delta) {
    const next = Math.min(Math.max(idx + delta, 0), deck.length - 1)
    setIdx(next)
    setWritten('')
    setShowFull(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div style={ embedded
        ? { ...body, color: tokens.ink }
        : { ...body, background: tokens.bg, minHeight: '100dvh', color: tokens.ink, position: 'relative' } }>
      {!embedded && <WorldMapSubstrate />}
      {!embedded && <Nav />}

      <main style={{ position: 'relative', maxWidth: 680, margin: '0 auto', padding: embedded ? '0 0 8px' : '40px 22px 120px' }}>

        {!embedded && (
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ ...serif, fontWeight: 300, fontSize: 34, margin: '0 0 6px', color: tokens.ink }}>
            I Am
          </h1>
          <p style={{ ...body, fontSize: 15, lineHeight: 1.6, color: tokens.inkMid, margin: 0 }}>
            Write the statement, and write it again. Each pass lands it a little deeper than
            the last — and tells you, over time, what you actually want to be true.
          </p>
        </header>
        )}

        {loading ? (
          <p style={{ ...body, fontSize: 14, color: tokens.inkFaint }}>Loading your statements…</p>
        ) : deck.length === 0 ? (
          <EmptyState onWrite={() => navigate('/nextu/i-am')} />
        ) : (
          <>
            {/* Breath first */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 26px' }}>
              <BreathPacer caption="Settle here first." />
            </div>

            {/* Which statement, and where in the seven */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <span style={{ ...sc, fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase', color: tokens.gold }}>
                {title}
              </span>
              <span style={{ ...sc, fontSize: 13, letterSpacing: '0.12em', color: tokens.inkFaint }}>
                {idx + 1} of {deck.length}
              </span>
            </div>

            {/* The statement — one line, the anchor. User's own words, so italic is allowed */}
            <div style={{
              background: tokens.card, border: `1px solid ${tokens.goldRule}`, borderRadius: 4,
              padding: '20px 22px', marginBottom: 10,
            }}>
              <p style={{ ...text.userVoice, ...serif, fontWeight: 300, fontSize: 24, lineHeight: 1.35, color: tokens.ink, margin: 0 }}>
                {line}
              </p>
              {hasMore && (
                <>
                  <button
                    onClick={() => setShowFull(s => !s)}
                    style={{ ...sc, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', border: 'none', cursor: 'pointer', color: tokens.gold, padding: 0, marginTop: 14 }}
                  >
                    {showFull ? 'Hide full ▴' : 'See full ▾'}
                  </button>
                  {showFull && (
                    <p style={{ ...text.userVoice, ...body, fontSize: 15.5, lineHeight: 1.7, color: tokens.inkSoft, margin: '12px 0 0' }}>
                      {fullText}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Edit round-trip — kept out of the walk so the flow never breaks */}
            {!embedded && (
            <div style={{ marginBottom: 22 }}>
              <button onClick={goEdit} style={linkBtn}>
                Edit this statement →
              </button>
            </div>
            )}

            {/* Feeling cue */}
            <p style={{ ...body, fontSize: 14.5, lineHeight: 1.6, color: tokens.inkSoft, margin: '0 0 12px' }}>
              Before you write: close your eyes and find the feeling this carries — the way it
              would feel in the body if it were simply true. Write from inside that feeling.
            </p>

            {/* Write it out */}
            <div style={{
              background: tokens.card, border: `1px solid ${tokens.goldRule}`, borderRadius: 4,
              padding: '16px 18px', marginBottom: 14,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <span style={{ ...sc, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: tokens.inkMid }}>
                  Write it, three to ten times
                </span>
                {reps > 0 && (
                  <span style={{ ...sc, fontSize: 13, color: tokens.inkFaint }}>{reps}</span>
                )}
              </div>
              <textarea
                value={written}
                onChange={e => setWritten(e.target.value)}
                placeholder={line}
                rows={9}
                style={textareaStyle}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button onClick={handleSave} disabled={saving} style={primaryBtn(saving)}>
                {saving ? 'Saving…' : 'Save this session'}
              </button>
              {savedFlash && (
                <span style={{ ...sc, fontSize: 13, letterSpacing: '0.1em', color: tokens.gold }}>
                  Saved to your journal
                </span>
              )}
            </div>

            {/* Move through the seven */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 30, paddingTop: 18, borderTop: `1px solid ${tokens.goldRule}` }}>
              <button onClick={() => move(-1)} disabled={idx === 0} style={navBtn(idx === 0)}>
                ← Previous
              </button>
              <button onClick={() => move(1)} disabled={idx >= deck.length - 1} style={navBtn(idx >= deck.length - 1)}>
                Next statement →
              </button>
            </div>
          </>
        )}

        {!embedded && (
        <div style={{ marginTop: 40, paddingTop: 18, borderTop: `1px solid ${tokens.goldRule}` }}>
          <button onClick={() => navigate('/journal')} style={linkBtn}>
            ← Your journal
          </button>
        </div>
        )}
      </main>
    </div>
  )
}

function EmptyState({ onWrite }) {
  return (
    <div style={{
      background: tokens.card, border: `1px solid ${tokens.goldRule}`, borderRadius: 4, padding: '22px',
    }}>
      <p style={{ ...body, fontSize: 15, lineHeight: 1.6, color: tokens.inkSoft, margin: '0 0 14px' }}>
        You haven’t declared your I Am statements yet. They grow out of The Map — one for each
        of the seven domains. Write them first, then return here to practise them.
      </p>
      <button onClick={onWrite} style={primaryBtn(false)}>Write my statements</button>
    </div>
  )
}

// ─── Style helpers ────────────────────────────────────────────

const textareaStyle = {
  ...body, fontSize: 16, lineHeight: 1.7, color: tokens.ink,
  width: '100%', boxSizing: 'border-box', resize: 'vertical',
  border: `1px solid ${tokens.goldRule}`, borderRadius: 4,
  background: '#FFFFFF', padding: '10px 12px', outline: 'none', minHeight: 150,
}

function primaryBtn(disabled) {
  return {
    ...sc, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase',
    padding: '11px 20px', borderRadius: 4, cursor: disabled ? 'default' : 'pointer',
    border: `1px solid ${tokens.goldChrome}`, background: tokens.goldChrome, color: '#FFFFFF',
    opacity: disabled ? 0.6 : 1,
  }
}

const linkBtn = {
  ...sc, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase',
  background: 'transparent', border: 'none', cursor: 'pointer', color: tokens.gold, padding: 0,
}

function navBtn(disabled) {
  return {
    ...sc, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase',
    background: 'transparent', border: 'none', padding: 0,
    cursor: disabled ? 'default' : 'pointer',
    color: disabled ? tokens.inkFaint : tokens.inkMid, opacity: disabled ? 0.5 : 1,
  }
}
