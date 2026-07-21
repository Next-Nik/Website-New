// ─────────────────────────────────────────────────────────────
// IAmChapter.jsx — NextU Chapter Two (/nextu/i-am)
//
// The canonical writer of horizon_profile.ia_statement. Extracted
// from the legacy Dashboard's MapIAmView and redesigned to the
// focused-surface standard: one domain at a time, the domain's
// colour as a quiet 3px rule, the user's words in italic Newsreader —
// the only italics on the surface, because italics are reserved
// for user-authored words and this chapter is made of them.
//
// Completion is the journey's biggest hand-off: the statements go
// live in the morning practice, and Horizon State Phase 2's gate
// lifts at exactly this moment.
//
// Per: NextU_Integrated_Experience_Design_v1.md §5 (Chapter Two), §9.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import { tokens, serif, body, sc } from '../../lib/designTokens'
import { DOMAIN_COLORS } from '../../constants/domainColors'
import NextUShell from './NextUShell'
import {
  DOMAIN_ORDER, DOMAIN_LABELS, LIFES_MISSION_QUESTIONS,
  useAutoSave, SavedWhisper,
} from './shared'

const ORDINAL_WORDS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh']

// Show the one-line anchor. Older statements written as a paragraph collapse
// to their first sentence here; the full text lives in the editor's full field.
function anchorLine(s) {
  if (!s) return ''
  const t = String(s).trim()
  const m = t.match(/^[\s\S]*?[.!?](?=\s|$)/)
  return (m ? m[0] : t).replace(/[.!?]+\s*$/, '').trim()
}

export function IAmChapterPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [params] = useSearchParams()
  const returnTo = params.get('return')        // e.g. /tools/i-am?domain=path
  const wantDomain = params.get('domain')      // land on this statement

  const [rows, setRows]           = useState(null)   // horizon_profile rows
  const [loading, setLoading]     = useState(true)
  const [active, setActive]       = useState(null)   // domain key being written
  const [draft, setDraft]         = useState('')
  const [draftFull, setDraftFull] = useState('')
  const [distilling, setDistilling] = useState(false)
  const [showFullEditor, setShowFullEditor] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) { setLoading(false); return }
    let cancelled = false
    supabase.from('horizon_profile')
      .select('domain, current_score, horizon_score, horizon_goal, ia_statement, ia_statement_full')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (cancelled) return
        setRows(data || [])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [user, authLoading])

  const byDomain = useMemo(() => {
    const m = {}
    ;(rows || []).forEach(r => { m[r.domain] = r })
    return m
  }, [rows])

  const declared = DOMAIN_ORDER.filter(k => byDomain[k]?.ia_statement)
  const nextMissing = DOMAIN_ORDER.find(k => !byDomain[k]?.ia_statement)
  const allDone = declared.length >= 7
  const mapReady = DOMAIN_ORDER.filter(k => byDomain[k]?.current_score != null).length >= 7

  // active domain defaults to the next missing one
  const current = active || nextMissing || DOMAIN_ORDER[0]

  // Arriving from a practice with ?domain= → land on that statement.
  useEffect(() => {
    if (wantDomain && DOMAIN_ORDER.includes(wantDomain)) setActive(wantDomain)
  }, [wantDomain])

  // Pin the active domain once the data lands. Without this, `current`
  // derives from the live next-missing domain — and the first keystroke
  // (which fills that domain) makes it no longer missing, advancing
  // `current` to the next blank domain and ejecting the writer mid-word.
  // Pinned, the surface only moves on an explicit declare / revisit / ?domain.
  useEffect(() => {
    if (loading || active) return
    if (wantDomain && DOMAIN_ORDER.includes(wantDomain)) return  // handled above
    if (nextMissing) setActive(nextMissing)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  // keep the draft in sync when the active domain changes
  useEffect(() => {
    setDraft(byDomain[current]?.ia_statement || '')
    setDraftFull(byDomain[current]?.ia_statement_full || '')
    setShowFullEditor(!!byDomain[current]?.ia_statement_full)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, rows])

  // ── the canonical write path ──────────────────────────────
  const { queue, flush, whisper } = useAutoSave(async (value) => {
    if (!user) return
    await supabase.from('horizon_profile')
      .update({ ia_statement: value || null })
      .eq('user_id', user.id)
      .eq('domain', current)
  })

  function onDraftChange(value) {
    setDraft(value)
    setRows(prev => (prev || []).map(r =>
      r.domain === current ? { ...r, ia_statement: value || null } : r
    ))
    queue(value)
  }

  // ── the full version (optional, longer text behind the line) ──
  const { queue: queueFull, flush: flushFull, whisper: whisperFull } = useAutoSave(async (value) => {
    if (!user) return
    await supabase.from('horizon_profile')
      .update({ ia_statement_full: value || null })
      .eq('user_id', user.id)
      .eq('domain', current)
  })

  function onFullChange(value) {
    setDraftFull(value)
    setRows(prev => (prev || []).map(r =>
      r.domain === current ? { ...r, ia_statement_full: value || null } : r
    ))
    queueFull(value)
  }

  // North Star drafts a one-line distillation from the full version.
  // If there's no full version yet but the line itself is a paragraph
  // (older statements), the paragraph is preserved into the full version
  // first, then distilled — nothing is lost, and the user owns the result.
  async function distilWithNorthStar() {
    if (distilling) return
    let source = draftFull.trim()
    if (!source && draft.trim().split(/\s+/).length > 12) {
      source = draft.trim()
      setShowFullEditor(true)
      onFullChange(source)        // preserve the paragraph as the full version
      await flushFull(source)
    }
    if (!source) source = draft.trim()
    if (!source) return
    setDistilling(true)
    try {
      const res = await fetch('/api/ia-distill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full: source, domain: current }),
      })
      const data = await res.json()
      if (res.ok && data.line) {
        const line = data.line.replace(/[\r\n]+/g, ' ').trim()
        setDraft(line)
        setRows(prev => (prev || []).map(r =>
          r.domain === current ? { ...r, ia_statement: line || null } : r
        ))
        queue(line)
      }
    } catch {
      // leave the draft as-is on failure
    } finally {
      setDistilling(false)
    }
  }

  async function declareAndContinue() {
    await flush(draft)
    await flushFull(draftFull)
    const remaining = DOMAIN_ORDER.filter(k =>
      k !== current ? !byDomain[k]?.ia_statement : !draft.trim()
    )
    if (remaining.length === 0) {
      setJustCompleted(true)
      setActive(null)
    } else {
      setActive(remaining[0])
      window.scrollTo({ top: 0 })
    }
  }

  // ── render guards ─────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <NextUShell chapter={2}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: tokens.ghost }}>NEXTU</span>
        </div>
      </NextUShell>
    )
  }
  if (!user) {
    navigate('/login')
    return null
  }

  const domainColour = DOMAIN_COLORS[current]?.base || tokens.goldChrome
  const position = declared.includes(current)
    ? `Revisiting ${DOMAIN_LABELS[current]}`
    : `${ORDINAL_WORDS[declared.length] || 'Next'} of seven`

  return (
    <NextUShell chapter={2}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '48px 22px 80px' }}>

        {returnTo && (
          <button
            onClick={() => navigate(returnTo)}
            style={{
              ...sc, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase',
              color: tokens.gold, background: 'none', border: 'none', padding: 0,
              cursor: 'pointer', marginBottom: '24px',
            }}
          >
            ← Back to your practice
          </button>
        )}

        {/* The Map isn't done yet — forward language, never a lock */}
        {!mapReady && !allDone && (
          <div style={{ marginBottom: '40px' }}>
            <p style={{ ...body, fontSize: '16px', lineHeight: 1.65, color: 'rgba(15,21,35,0.72)' }}>
              Your statements grow out of The Map — each one stands on a domain you've
              already walked. Chapter One is still underway; your statements begin the
              moment it lands.
            </p>
            <button
              onClick={() => navigate('/nextu/map')}
              style={{
                ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.14em',
                color: '#FFFFFF', background: tokens.goldChrome, border: 'none',
                borderRadius: '4px', padding: '11px 22px', cursor: 'pointer', marginTop: '18px',
              }}
            >
              CONTINUE THE MAP →
            </button>
          </div>
        )}

        {/* the completion moment — the journey's biggest hand-off */}
        {(allDone || justCompleted) && !active && (
          <div style={{ marginBottom: '48px' }}>
            <div style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.22em', color: tokens.gold }}>
              CHAPTER TWO COMPLETE
            </div>
            <h1 style={{ ...serif, fontWeight: 300, fontSize: 'clamp(28px,5vw,38px)', marginTop: '8px', color: tokens.dark }}>
              Your seven statements are declared
            </h1>
            <p style={{ ...body, fontSize: '16px', lineHeight: 1.65, color: 'rgba(15,21,35,0.72)', marginTop: '12px' }}>
              They're now live in your morning practice — the Anchor beat voices them daily.
              Horizon State's Calibration phase opens from here too. Chapter Three builds
              the self who says them.
            </p>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '22px' }}>
              <button
                onClick={() => navigate('/nextu')}
                style={{
                  ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.14em',
                  color: '#FFFFFF', background: tokens.goldChrome, border: 'none',
                  borderRadius: '4px', padding: '12px 24px', cursor: 'pointer',
                }}
              >
                BACK TO THE JOURNEY →
              </button>
              <button
                onClick={() => navigate('/nextu/horizon-self')}
                style={{
                  ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.16em',
                  color: tokens.gold, background: 'none',
                  border: `1.5px solid ${tokens.goldChrome}`,
                  borderRadius: '4px', padding: '12px 22px', cursor: 'pointer',
                }}
              >
                BEGIN CHAPTER THREE
              </button>
            </div>
          </div>
        )}

        {/* the writing surface — one domain at a time */}
        {mapReady && !justCompleted && (!allDone || active) && (
          <>
            <div style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)' }}>
              {position}
            </div>

            <div style={{ borderLeft: `3px solid ${domainColour}`, paddingLeft: '20px', marginTop: '24px' }}>
              <div style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.22em', color: tokens.gold }}>
                {DOMAIN_LABELS[current].toUpperCase()}
              </div>
              <div style={{ ...serif, fontSize: 'clamp(24px,4vw,30px)', fontWeight: 300, marginTop: '10px', lineHeight: 1.3, color: tokens.dark }}>
                {LIFES_MISSION_QUESTIONS[current]}
              </div>
              {byDomain[current]?.horizon_goal && (
                <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)', marginTop: '14px', lineHeight: 1.6 }}>
                  Your horizon here: {byDomain[current].horizon_goal}
                </p>
              )}
              <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)', marginTop: '12px', lineHeight: 1.6 }}>
                Present tense. One line. Not a goal — a declaration. Write it as if it's already
                true, and keep refining until you feel a spark when you read it back. This is the
                line you'll say and write each morning.
              </p>

              <textarea
                value={draft}
                onChange={e => onDraftChange(e.target.value.replace(/[\r\n]+/g, ' '))}
                onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
                placeholder="I am…"
                rows={2}
                aria-label={`Your ${DOMAIN_LABELS[current]} I Am statement`}
                style={{
                  width: '100%', boxSizing: 'border-box', marginTop: '22px',
                  padding: '16px', border: `1px solid ${tokens.goldFaint}`,
                  borderRadius: '6px', background: '#FFFFFF',
                  ...body, fontStyle: 'italic', fontSize: '16px', lineHeight: 1.6,
                  color: tokens.dark, resize: 'none', outline: 'none',
                }}
                onFocus={e => { e.target.style.borderColor = tokens.goldChrome }}
                onBlur={e => { e.target.style.borderColor = tokens.goldFaint }}
              />
              <div style={{ marginTop: '8px', minHeight: '18px' }}>
                <SavedWhisper state={whisper} />
              </div>

              {/* the full version — optional longer text behind the line */}
              <div style={{ marginTop: '20px', borderTop: `1px solid ${tokens.goldFaint}`, paddingTop: '18px' }}>
                {!showFullEditor ? (
                  <button
                    onClick={() => setShowFullEditor(true)}
                    style={{
                      ...sc, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase',
                      color: tokens.gold, background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    }}
                  >
                    Add a full version ▾
                  </button>
                ) : (
                  <>
                    <div style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: tokens.gold }}>
                      FULL VERSION
                    </div>
                    <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', marginTop: '8px', lineHeight: 1.6 }}>
                      The longer text, kept behind the line. Your daily practice shows the line;
                      the full version sits one tap away.
                    </p>
                    <textarea
                      value={draftFull}
                      onChange={e => onFullChange(e.target.value)}
                      placeholder="The fuller statement, in your own words…"
                      rows={6}
                      aria-label={`Your ${DOMAIN_LABELS[current]} full I Am version`}
                      style={{
                        width: '100%', boxSizing: 'border-box', marginTop: '14px',
                        padding: '16px', border: `1px solid ${tokens.goldFaint}`,
                        borderRadius: '6px', background: '#FFFFFF',
                        ...body, fontStyle: 'italic', fontSize: '15px', lineHeight: 1.65,
                        color: tokens.dark, resize: 'vertical', outline: 'none',
                      }}
                      onFocus={e => { e.target.style.borderColor = tokens.goldChrome }}
                      onBlur={e => { e.target.style.borderColor = tokens.goldFaint }}
                    />
                    <div style={{ marginTop: '8px', minHeight: '18px' }}>
                      <SavedWhisper state={whisperFull} />
                    </div>
                  </>
                )}

                {(draftFull.trim() || draft.trim().split(/\s+/).length > 12) && (
                  <button
                    onClick={distilWithNorthStar}
                    disabled={distilling}
                    style={{
                      ...sc, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase',
                      color: tokens.gold, background: 'none', border: `1.5px solid ${tokens.goldChrome}`,
                      borderRadius: '4px', padding: '9px 16px', cursor: distilling ? 'default' : 'pointer',
                      opacity: distilling ? 0.55 : 1, marginTop: '14px',
                    }}
                  >
                    {distilling ? 'NORTH STAR IS DISTILLING…' : 'DISTIL INTO A LINE WITH NORTH STAR'}
                  </button>
                )}
              </div>

              <button
                onClick={declareAndContinue}
                disabled={!draft.trim()}
                style={{
                  ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.14em',
                  color: '#FFFFFF', background: tokens.goldChrome, border: 'none',
                  borderRadius: '4px', padding: '12px 24px',
                  cursor: draft.trim() ? 'pointer' : 'default',
                  opacity: draft.trim() ? 1 : 0.35,
                  marginTop: '18px',
                }}
              >
                {declared.includes(current) && byDomain[current]?.ia_statement
                  ? 'SAVE'
                  : declared.length >= 6 ? 'DECLARE — COMPLETE THE SEVEN' : 'DECLARE AND CONTINUE'}
              </button>
            </div>

            {/* already declared — readable, revisitable */}
            {declared.filter(k => k !== current).length > 0 && (
              <div style={{ marginTop: '48px', borderTop: `1px solid ${tokens.goldFaint}`, paddingTop: '24px' }}>
                <div style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: tokens.gold }}>
                  ALREADY DECLARED
                </div>
                {declared.filter(k => k !== current).map(k => (
                  <p key={k} style={{ ...body, fontStyle: 'italic', fontSize: '16px', lineHeight: 1.55, marginTop: '12px', color: tokens.dark }}>
                    <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: tokens.gold, fontStyle: 'normal', marginRight: '8px' }}>
                      {DOMAIN_LABELS[k].toUpperCase()}
                    </span>
                    {anchorLine(byDomain[k].ia_statement) || anchorLine(byDomain[k].ia_statement_full)}
                    <button
                      onClick={() => { setActive(k); window.scrollTo({ top: 0 }) }}
                      style={{
                        ...sc, fontSize: '13px', letterSpacing: '0.12em',
                        color: tokens.ghost, background: 'none', border: 'none',
                        cursor: 'pointer', padding: 0, marginLeft: '10px', fontStyle: 'normal',
                      }}
                    >
                      REVISIT
                    </button>
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </NextUShell>
  )
}

export default IAmChapterPage
