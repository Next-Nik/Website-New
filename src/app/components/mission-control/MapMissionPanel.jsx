// ─────────────────────────────────────────────────────────────
// MapMissionPanel.jsx
//
// The live in-dashboard readout of The Map. Replaces the marketing
// stub that previously sat inside Mission Control's `activePanel
// === 'map'` Panel. Loads what's actually in Supabase, lets the
// user pick a domain and work on it inline (avatar / current /
// horizon — same DomainStep component the full page uses), and
// persists every interaction back to map_results with the same
// upsert pattern the full page uses.
//
// Data flow:
//   on mount        → load map_results row (latest by updated_at)
//   on row click    → expand DomainStep inline for that domain
//   on domain edit  → onUpdate fires per interaction; we update
//                     local state and upsert to map_results
//   "Open The Map" → /tools/map (full flow with welcome modal,
//                     synthesis, results, debrief)
//
// Component reuse: DomainStep, DOMAINS, getDomainStage all imported
// from Map.jsx — same source of truth as the full page. Connection
// is no longer a special case; DomainStep handles all seven domains.
// Adding `export` keywords to those declarations was a one-line ripple
// in Map.jsx with no behaviour change.
//
// Props:
//   user        — Supabase auth user (already loaded by Mission Control)
//   onNavigate  — react-router navigate function (for "Open The Map →")
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import {
  DOMAINS, DomainStep, getDomainStage, countActiveConnectionSubDomains,
} from '../../../tools/map/Map'
import {
  GOLD, GOLD_DK, GOLD_LT, GOLD_RULE,
  TEXT_INK, TEXT_META, TEXT_FAINT,
  BG_CARD,
  FONT_DISPLAY, FONT_SC, FONT_BODY,
} from './tokens'

const STAGE_LABELS = ['Not started', 'Avatar set', 'Score set', 'Complete']
const STAGE_GLYPH  = ['○', '◎', '◑', '●']

function ScoreChip({ label, value, dim, subtitle }) {
  return (
    <span style={{
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 1,
    }}>
      <span style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 6,
        padding: '2px 10px',
        borderRadius: 14,
        border: `1px solid ${GOLD_RULE}`,
        background: dim ? 'transparent' : 'rgba(110,127,92,0.06)',
        fontFamily: FONT_BODY,
        fontSize: 12,
        lineHeight: 1.2,
        color: TEXT_META,
      }}>
        <span style={{
          fontFamily: FONT_SC,
          fontSize: 9.5,
          letterSpacing: '0.18em',
          color: GOLD_DK,
        }}>{label}</span>
        <span style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 15,
          fontWeight: 500,
          color: dim ? TEXT_FAINT : TEXT_INK,
        }}>
          {value ?? '—'}
        </span>
      </span>
      {subtitle && !dim && (
        <span style={{
          fontFamily: FONT_SC,
          fontSize: 8.5,
          letterSpacing: '0.12em',
          color: TEXT_FAINT,
          textAlign: 'center',
          marginTop: 1,
        }}>
          {subtitle}
        </span>
      )}
    </span>
  )
}

function StageBadge({ stage }) {
  const isComplete = stage === 3
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: FONT_SC,
      fontSize: 9.5,
      letterSpacing: '0.18em',
      color: isComplete ? GOLD_DK : TEXT_FAINT,
    }}>
      <span style={{
        fontSize: 12,
        color: isComplete ? GOLD : 'rgba(110,127,92,0.45)',
      }}>{STAGE_GLYPH[stage]}</span>
      {STAGE_LABELS[stage]}
    </span>
  )
}

export default function MapMissionPanel({ user, onNavigate }) {
  const [loaded,        setLoaded]        = useState(false)
  const [domainData,    setDomainData]    = useState({})
  const [expandedId,    setExpandedId]    = useState(null)
  const [savingPulse,   setSavingPulse]   = useState(false)
  const [error,         setError]         = useState(null)

  // ─── Load on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) {
      setLoaded(true)
      return
    }
    let cancelled = false
    async function load() {
      try {
        const { data, error } = await supabase
          .from('map_results')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (cancelled) return
        if (error) throw error
        if (data?.session?.domainData && typeof data.session.domainData === 'object') {
          // Sanitise — drop malformed entries
          const safe = {}
          for (const [id, d] of Object.entries(data.session.domainData)) {
            if (d && typeof d === 'object') safe[id] = d
          }
          setDomainData(safe)
        }
      } catch (err) {
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.id])

  // ─── Persist (mirrors the page's saveSession logic) ────────
  async function saveSession(allData) {
    if (!user?.id) return
    try {
      setSavingPulse(true)
      const allDone = DOMAINS.every(d => getDomainStage(allData[d.id]) === 3)
      // Score lookups for the row (kept loosely in sync with the
      // page's behaviour — we don't run synthesis here, that's the
      // full page's job).
      const currentScores = {}
      const horizonScores = {}
      for (const d of DOMAINS) {
        const x = allData[d.id]
        if (x?.currentScore !== undefined) currentScores[d.id] = x.currentScore
        if (x?.horizonScore !== undefined) horizonScores[d.id] = x.horizonScore
      }
      await supabase.from('map_results').upsert({
        user_id: user.id,
        session: { domainData: allData, currentScores, horizonScores },
        phase:   allDone ? 'complete' : 'mapping',
        complete: allDone,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    } catch (err) {
      setError(err)
    } finally {
      // Brief visual hold so the saved-state indicator can flicker
      // even on near-instant writes.
      setTimeout(() => setSavingPulse(false), 250)
    }
  }

  function handleDomainUpdate(data) {
    const next = { ...domainData, [data.domainId]: data }
    setDomainData(next)
    saveSession(next)
  }
  function handleDomainComplete(data) {
    handleDomainUpdate(data)
  }

  const placedCount = useMemo(
    () => DOMAINS.filter(d => getDomainStage(domainData[d.id]) === 3).length,
    [domainData]
  )

  // ─── Render ────────────────────────────────────────────────
  if (!user) {
    return (
      <div style={{ padding: '8px 0' }}>
        <p style={{
          fontFamily: FONT_BODY, fontSize: 15, color: TEXT_META, lineHeight: 1.6,
          marginBottom: 16,
        }}>
          Sign in to see your Map. Your seven domains, three steps each.
        </p>
        <button
          onClick={() => onNavigate('/tools/map')}
          style={primaryBtnStyle}
        >
          OPEN THE MAP →
        </button>
      </div>
    )
  }

  if (!loaded) {
    return (
      <div style={{ padding: '8px 0' }}>
        <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_FAINT }}>
          Loading your map…
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '8px 0' }}>
        <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: TEXT_META, marginBottom: 14 }}>
          Couldn't load your Map data. You can still open the full page.
        </p>
        <button onClick={() => onNavigate('/tools/map')} style={primaryBtnStyle}>
          OPEN THE MAP →
        </button>
      </div>
    )
  }

  const isEmpty = Object.keys(domainData).length === 0

  return (
    <div style={{ padding: '4px 0' }}>

      {/* Summary header */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 14,
        paddingBottom: 12,
        borderBottom: `1px solid ${GOLD_RULE}`,
      }}>
        <div style={{
          fontFamily: FONT_SC,
          fontSize: 10.5,
          letterSpacing: '0.18em',
          color: GOLD_DK,
        }}>
          {isEmpty ? 'NOT YET STARTED' : `${placedCount} OF 7 COMPLETE`}
        </div>
        <div style={{
          fontFamily: FONT_SC,
          fontSize: 9.5,
          letterSpacing: '0.18em',
          color: savingPulse ? GOLD : 'transparent',
          transition: 'color 0.25s ease',
        }}>
          SAVED
        </div>
      </div>

      {isEmpty && (
        <div style={{
          background: BG_CARD,
          border: `1px solid ${GOLD_RULE}`,
          borderLeft: `3px solid ${GOLD}`,
          borderRadius: 14,
          padding: '20px 22px',
          marginBottom: 20,
        }}>
          <p style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 18,
            fontStyle: 'italic',
            color: TEXT_INK,
            lineHeight: 1.55,
            margin: 0,
          }}>
            An honest picture. Seven domains. Three steps each.
          </p>
          <p style={{
            fontFamily: FONT_BODY,
            fontSize: 14,
            color: TEXT_META,
            lineHeight: 1.65,
            margin: '12px 0 0',
          }}>
            Pick a domain below to begin, or open the full Map experience for the
            complete walkthrough.
          </p>
        </div>
      )}

      {/* Domain rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DOMAINS.map(domain => {
          const d = domainData[domain.id]
          const stage = getDomainStage(d)
          const isExpanded = expandedId === domain.id
          const horizonText = d?.horizonText || d?.avatarFinal || null
          const previewText = horizonText
            ? horizonText.length > 130
              ? horizonText.slice(0, 130).trim() + '…'
              : horizonText
            : null

          return (
            <div
              key={domain.id}
              style={{
                background: BG_CARD,
                border: `1px solid ${isExpanded ? GOLD : GOLD_RULE}`,
                borderRadius: 14,
                overflow: 'hidden',
                transition: 'border-color 0.2s ease',
              }}
            >
              <button
                onClick={() => setExpandedId(prev => prev === domain.id ? null : domain.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  fontFamily: FONT_BODY,
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: previewText ? 6 : 0,
                }}>
                  <div style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 18,
                    fontWeight: 500,
                    color: TEXT_INK,
                  }}>
                    {domain.label}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexShrink: 0,
                  }}>
                    {(() => {
                      // Connection's currentScore is the average across active
                      // sub-domains. Surface the "N areas" annotation so the
                      // dashboard reading honours the plurality — same shell
                      // as the other six, with the texture made visible.
                      const isConnection = domain.id === 'connection'
                      const activeCount  = isConnection ? countActiveConnectionSubDomains(d?.subDomains || []) : 0
                      const nowSubtitle  = isConnection && activeCount > 0
                        ? `${activeCount} ${activeCount === 1 ? 'area' : 'areas'}`
                        : undefined
                      return (
                        <>
                          <ScoreChip label="NOW"     value={d?.currentScore} dim={d?.currentScore == null} subtitle={nowSubtitle} />
                          <ScoreChip label="HORIZON" value={d?.horizonScore} dim={d?.horizonScore == null} />
                        </>
                      )
                    })()}
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  {previewText ? (
                    <p style={{
                      fontFamily: FONT_BODY,
                      fontSize: 13.5,
                      fontStyle: 'italic',
                      color: TEXT_META,
                      lineHeight: 1.55,
                      margin: 0,
                      flex: 1,
                    }}>
                      {previewText}
                    </p>
                  ) : (
                    <p style={{
                      fontFamily: FONT_BODY,
                      fontSize: 13,
                      color: TEXT_FAINT,
                      margin: 0,
                      fontStyle: 'italic',
                      flex: 1,
                    }}>
                      {domain.question}
                    </p>
                  )}
                  <StageBadge stage={stage} />
                </div>
              </button>

              {isExpanded && (
                <div style={{
                  borderTop: `1px solid ${GOLD_RULE}`,
                  padding: '16px',
                  background: '#FFFFFF',
                }}>
                  <DomainStep
                    key={domain.id}
                    domain={domain}
                    existingData={d}
                    onUpdate={handleDomainUpdate}
                    onComplete={handleDomainComplete}
                  />
                  <div style={{
                    marginTop: 18,
                    paddingTop: 14,
                    borderTop: `1px solid ${GOLD_RULE}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}>
                    <div style={{
                      fontFamily: FONT_SC,
                      fontSize: 9.5,
                      letterSpacing: '0.18em',
                      color: TEXT_FAINT,
                    }}>
                      INLINE EDIT · CHANGES SAVE AS YOU GO
                    </div>
                    <button
                      onClick={() => onNavigate('/tools/map')}
                      style={ghostBtnStyle}
                    >
                      FULL MAP VIEW →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      {placedCount === 7 && (
        <div style={{
          marginTop: 20,
          padding: '14px 18px',
          background: 'rgba(110,127,92,0.06)',
          border: `1px solid ${GOLD}`,
          borderRadius: 14,
        }}>
          <p style={{
            fontFamily: FONT_SC,
            fontSize: 10.5,
            letterSpacing: '0.18em',
            color: GOLD_DK,
            margin: '0 0 6px',
          }}>
            ALL SEVEN COMPLETE
          </p>
          <p style={{
            fontFamily: FONT_BODY,
            fontSize: 14,
            color: TEXT_META,
            margin: '0 0 10px',
            lineHeight: 1.55,
          }}>
            Open the full Map view to run synthesis and see your full picture.
          </p>
          <button
            onClick={() => onNavigate('/tools/map')}
            style={primaryBtnStyle}
          >
            SEE YOUR FULL MAP →
          </button>
        </div>
      )}
    </div>
  )
}

const primaryBtnStyle = {
  background: 'transparent',
  border: `1px solid ${GOLD}`,
  color: GOLD_DK,
  padding: '12px 20px',
  fontFamily: FONT_SC,
  fontSize: 12,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  borderRadius: 0,
}

const ghostBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: GOLD_DK,
  padding: '6px 0',
  fontFamily: FONT_SC,
  fontSize: 10.5,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  cursor: 'pointer',
}
