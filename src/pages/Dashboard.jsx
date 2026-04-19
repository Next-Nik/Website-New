import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../hooks/useSupabase'
import { ROUTES } from '../constants/routes'


// ── MapIAmView ────────────────────────────────────────────────
// Shows "I am..." statements per domain, North Star assisted.
// Stored in horizon_profile.ia_statement per domain row.

const DOMAIN_LABEL_MAP = {
  path: 'Path', spark: 'Spark', body: 'Body', finances: 'Finances',
  connection: 'Connection', inner_game: 'Inner Game', signal: 'Signal',
}

// ── North Star Draft Modal ─────────────────────────────────────
function NorthStarModal({ domainKey, horizonGoal, purposeData, userId, onSelect, onClose }) {
  const [drafts,   setDrafts]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [steer,    setSteer]    = useState('')
  const [steering, setSteering] = useState(false)
  const [error,    setError]    = useState(null)

  const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
  const body = { fontFamily: "'Lora', Georgia, serif" }

  const archetype = purposeData?.profile?.archetype || purposeData?.session?.tentative?.archetype?.archetype || null
  const domain    = purposeData?.profile?.domain    || purposeData?.session?.tentative?.domain?.domain       || null

  async function fetchDrafts(steerNote = '') {
    setLoading(true)
    setError(null)
    try {
      const contextLines = []
      if (archetype) contextLines.push(`Contribution archetype: ${archetype}`)
      if (domain)    contextLines.push(`Civilisational domain: ${domain}`)
      const contextBlock = contextLines.length ? `\n\nContext about this person:\n${contextLines.join('\n')}` : ''
      const steerBlock   = steerNote ? `\n\nNote from the person: ${steerNote}` : ''

      const res = await fetch('/tools/map/api/avatar-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `You are North Star. A person is writing an "I am..." statement for their ${DOMAIN_LABEL_MAP[domainKey]} domain.

Their horizon goal is: "${horizonGoal}"${contextBlock}${steerBlock}

Write exactly 3 distinct draft "I am..." statements. Each should:
- Start with "I am"
- Be one sentence, under 15 words
- Capture a different angle of the same truth
- Feel like something this specific person would say, not a generic affirmation

Return ONLY a JSON array of 3 strings, no other text:
["statement one", "statement two", "statement three"]`,
          }],
          userId,
        }),
      })
      const data = await res.json()
      const text = (data.content?.[0]?.text || data.message || '').trim()
      const match = text.match(/\[.*\]/s)
      if (match) {
        const parsed = JSON.parse(match[0])
        setDrafts(parsed)
      } else {
        throw new Error('Could not parse drafts')
      }
    } catch {
      setError("North Star couldn't generate drafts. Try again.")
    }
    setLoading(false)
    setSteering(false)
  }

  useEffect(() => { fetchDrafts() }, [])

  function handleTryAgain() {
    if (!steer.trim()) return
    setSteering(true)
    setDrafts(null)
    fetchDrafts(steer.trim())
    setSteer('')
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(15,21,35,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div style={{
        background: '#FAFAF7', borderRadius: '14px',
        border: '1px solid rgba(200,146,42,0.25)',
        width: 'min(480px, 100%)', maxHeight: '80vh',
        overflowY: 'auto', padding: '24px',
        boxShadow: '0 20px 60px rgba(15,21,35,0.25)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.2em', color: '#A8721A', marginBottom: '4px' }}>
              NORTH STAR · {DOMAIN_LABEL_MAP[domainKey].toUpperCase()}
            </div>
            <div style={{ ...sc, fontSize: '16px', color: '#0F1523', fontWeight: 500 }}>
              Three draft statements
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(15,21,35,0.45)', fontSize: '18px', lineHeight: 1, padding: '2px 4px' }}>×</button>
        </div>

        {/* Horizon goal reference */}
        <div style={{ padding: '10px 14px', background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.15)', borderRadius: '8px', marginBottom: '16px' }}>
          <div style={{ ...sc, fontSize: '9px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.4)', marginBottom: '4px' }}>Your horizon goal</div>
          <p style={{ ...body, fontSize: '12px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6, margin: 0 }}>{horizonGoal}</p>
        </div>

        {/* Drafts */}
        {loading ? (
          <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.1em', color: '#A8721A', textAlign: 'center', padding: '24px 0' }}>
            North Star is writing…
          </div>
        ) : error ? (
          <div>
            <p style={{ ...body, fontSize: '13px', color: '#8A3030', marginBottom: '12px' }}>{error}</p>
            <button onClick={() => fetchDrafts()} style={{ ...sc, fontSize: '11px', letterSpacing: '0.1em', color: '#A8721A', background: 'rgba(200,146,42,0.06)', border: '1px solid rgba(200,146,42,0.3)', borderRadius: '20px', padding: '6px 14px', cursor: 'pointer' }}>
              Try again
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {(drafts || []).map((draft, i) => (
              <button
                key={i}
                onClick={() => onSelect(draft)}
                style={{
                  textAlign: 'left', padding: '12px 14px',
                  background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.25)',
                  borderRadius: '10px', cursor: 'pointer',
                  transition: 'all 0.15s', width: '100%',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,146,42,0.7)'; e.currentTarget.style.background = 'rgba(200,146,42,0.04)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,146,42,0.25)'; e.currentTarget.style.background = '#FFFFFF' }}
              >
                <div style={{ ...sc, fontSize: '9px', letterSpacing: '0.12em', color: '#A8721A', marginBottom: '4px' }}>DRAFT {i + 1}</div>
                <div style={{ ...body, fontSize: '14px', color: '#0F1523', lineHeight: 1.6 }}>{draft}</div>
              </button>
            ))}
          </div>
        )}

        {/* Try again with steer */}
        {!loading && !error && (
          <div style={{ borderTop: '1px solid rgba(200,146,42,0.12)', paddingTop: '16px' }}>
            <div style={{ ...sc, fontSize: '9px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.4)', marginBottom: '6px' }}>
              None of these? Steer North Star:
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={steer}
                onChange={e => setSteer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTryAgain()}
                placeholder="e.g. more grounded, less abstract…"
                style={{
                  flex: 1, ...body, fontSize: '13px', color: '#0F1523',
                  border: '1px solid rgba(200,146,42,0.3)', borderRadius: '20px',
                  padding: '6px 14px', outline: 'none', background: '#FFFFFF',
                }}
              />
              <button
                onClick={handleTryAgain}
                disabled={steering || !steer.trim()}
                style={{ ...sc, fontSize: '11px', letterSpacing: '0.1em', color: '#FFFFFF', background: steering ? 'rgba(200,146,42,0.4)' : '#A8721A', border: 'none', borderRadius: '20px', padding: '6px 14px', cursor: 'pointer', flexShrink: 0 }}
              >{steering ? '…' : 'Go'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MapIAmView({ horizonProfile, hasScores, currentScores, horizonScores, domainData, userId, purposeData, supabase, lifeHorizon, lifeIaStatement, mapResultId }) {
  const [editing,      setEditing]      = useState(null)  // domain key or 'life'
  const [draft,        setDraft]        = useState('')
  const [saving,       setSaving]       = useState(false)
  const [nsModal,      setNsModal]      = useState(null)
  const [goalModal,    setGoalModal]    = useState(null)
  const [localIa,      setLocalIa]      = useState({})
  const [localLifeIa,  setLocalLifeIa]  = useState(lifeIaStatement || '')
  const [hasEditedOnce, setHasEditedOnce] = useState(() => {
    try { return !!localStorage.getItem('mc_ia_explained') } catch { return false }
  })

  const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
  const body = { fontFamily: "'Lora', Georgia, serif" }

  function getIa(key) {
    return localIa[key] !== undefined
      ? localIa[key]
      : horizonProfile?.[key]?.iaStatement || null
  }

  function openEdit(key) {
    const ia = getIa(key)
    setEditing(key)
    setDraft(ia || '')
    if (!hasEditedOnce) {
      setHasEditedOnce(true)
      try { localStorage.setItem('mc_ia_explained', '1') } catch {}
    }
  }

  async function saveIa(domainKey, value) {
    setSaving(true)
    try {
      await supabase.from('horizon_profile')
        .update({ ia_statement: value })
        .eq('user_id', userId)
        .eq('domain', domainKey)
      setLocalIa(prev => ({ ...prev, [domainKey]: value }))
    } catch {}
    setSaving(false)
    setEditing(null)
    setDraft('')
  }

  async function saveLifeIa(value) {
    setSaving(true)
    try {
      if (mapResultId) {
        await supabase.from('map_results')
          .update({ life_ia_statement: value, updated_at: new Date().toISOString() })
          .eq('id', mapResultId)
      }
      setLocalLifeIa(value)
    } catch {}
    setSaving(false)
    setEditing(null)
    setDraft('')
  }

  function handleDraftSelect(d) {
    setEditing(nsModal)
    setDraft(d)
    setNsModal(null)
  }

  if (!hasScores) {
    return (
      <div>
        <Eyebrow>The Map</Eyebrow>
        <NextUpBanner label="Begin The Map" sub="7 domains · 10–20 min" href="/tools/map" />
      </div>
    )
  }

  return (
    <div>
      <Eyebrow>The Map</Eyebrow>

      {/* Life Horizon — same row structure and behaviour as domain rows */}
      {(() => {
        const currentVals = DOMAIN_KEYS.map(k => currentScores[k]).filter(v => v != null)
        const horizonVals = DOMAIN_KEYS.map(k => horizonScores[k]).filter(v => v != null)
        const avgCurrent  = currentVals.length  ? Math.round((currentVals.reduce((a,b) => a+b,0)  / currentVals.length)  * 10) / 10 : null
        const avgHorizon  = horizonVals.length  ? Math.round((horizonVals.reduce((a,b) => a+b,0)  / horizonVals.length)  * 10) / 10 : null
        const color       = getTierColor(avgCurrent)
        const isEditingLife = editing === 'life'
        const displayIa   = localLifeIa || null

        return (
          <div style={{ border: '1px solid rgba(200,146,42,0.25)', borderRadius: '8px', background: '#FFFFFF', marginBottom: '8px', overflow: 'hidden' }}>

            {!isEditingLife && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px' }}>
                <div
                  onClick={lifeHorizon ? () => setGoalModal('life') : undefined}
                  title={lifeHorizon ? 'See life horizon' : undefined}
                  style={{ width: '64px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '3px', cursor: lifeHorizon ? 'pointer' : 'default' }}
                >
                  {avgCurrent != null && (
                    <>
                      <span style={{ ...sc, fontSize: '13px', color, textDecoration: lifeHorizon ? 'underline' : 'none', textUnderlineOffset: '2px', textDecorationColor: 'rgba(200,146,42,0.35)' }}>{avgCurrent}</span>
                      <span style={{ ...sc, fontSize: '11px', color: 'rgba(15,21,35,0.3)' }}>→</span>
                      <span style={{ ...sc, fontSize: '13px', color: avgHorizon != null ? '#C8922A' : 'rgba(200,146,42,0.3)' }}>{avgHorizon != null ? avgHorizon : '?'}</span>
                    </>
                  )}
                </div>
                <div style={{ ...sc, fontSize: '9px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.4)', textTransform: 'uppercase', width: '68px', flexShrink: 0 }}>Life Horizon</div>
                <div style={{ flex: 1 }}>
                  {displayIa ? (
                    <p style={{ ...body, fontSize: '13px', color: '#0F1523', lineHeight: 1.55, margin: 0 }}>{displayIa}</p>
                  ) : (
                    <p style={{ ...body, fontSize: '12px', color: 'rgba(15,21,35,0.28)', fontStyle: 'italic', margin: 0 }}>No statement yet</p>
                  )}
                </div>
                <button
                  onClick={() => { setEditing('life'); setDraft(displayIa || ''); if (!hasEditedOnce) { setHasEditedOnce(true); try { localStorage.setItem('mc_ia_explained', '1') } catch {} } }}
                  style={{ ...sc, fontSize: '9px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.35)', background: 'none', border: '1px solid rgba(15,21,35,0.1)', borderRadius: '20px', padding: '3px 9px', cursor: 'pointer', flexShrink: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#A8721A'; e.currentTarget.style.borderColor = 'rgba(200,146,42,0.4)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(15,21,35,0.35)'; e.currentTarget.style.borderColor = 'rgba(15,21,35,0.1)' }}
                >Edit</button>
              </div>
            )}

            {isEditingLife && (
              <div style={{ padding: '12px 14px', background: 'rgba(200,146,42,0.02)' }}>
                <div style={{ ...sc, fontSize: '9px', letterSpacing: '0.14em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '10px' }}>Life Horizon</div>
                {!hasEditedOnce && (
                  <p style={{ ...body, fontSize: '12px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.65, marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid rgba(200,146,42,0.1)' }}>
                    An "I am..." statement is a one-line, present-tense version of where you're going in this domain. Not a goal — a declaration. "I am an athlete, dancer, ninja." Write it as if it's already true. Keep refining it until you feel a spark when you read it back — that's how you know it's yours.
                  </p>
                )}
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="I am..."
                  rows={2}
                  style={{ width: '100%', ...body, fontSize: '13px', color: '#0F1523', border: '1px solid rgba(200,146,42,0.35)', borderRadius: '6px', padding: '8px 10px', resize: 'vertical', outline: 'none', background: '#FFFFFF', lineHeight: 1.6, boxSizing: 'border-box', marginBottom: '8px' }}
                  autoFocus
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => draft.trim() && saveLifeIa(draft.trim())} disabled={saving || !draft.trim()} style={{ ...sc, fontSize: '10px', letterSpacing: '0.1em', color: '#FFFFFF', background: draft.trim() ? '#A8721A' : 'rgba(200,146,42,0.3)', border: 'none', borderRadius: '20px', padding: '5px 14px', cursor: draft.trim() ? 'pointer' : 'not-allowed' }}>{saving ? 'Saving…' : 'Save'}</button>
                    <button onClick={() => { setEditing(null); setDraft('') }} style={{ ...sc, fontSize: '10px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.45)', background: 'none', border: 'none', cursor: 'pointer', padding: '5px 0' }}>Cancel</button>
                  </div>
                  {lifeHorizon && (
                    <button onClick={() => { setNsModal('life'); setEditing(null) }} style={{ ...sc, fontSize: '9px', letterSpacing: '0.1em', color: '#A8721A', background: 'rgba(200,146,42,0.06)', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '20px', padding: '4px 10px', cursor: 'pointer' }}>Draft with North Star</button>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Domain rows — I Am statements only on surface */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
        {DOMAIN_KEYS.map(key => {
          const ia          = getIa(key)
          const horizonGoal = domainData?.[key]?.horizonText || horizonProfile?.[key]?.horizonGoal || null
          const score       = currentScores[key]
          const isEditing   = editing === key
          const color       = getTierColor(score)

          return (
            <div key={key} style={{
              border: '1px solid rgba(200,146,42,0.15)',
              borderRadius: '8px',
              background: '#FFFFFF',
              overflow: 'hidden',
            }}>

              {/* Surface row */}
              {!isEditing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px' }}>

                  {/* Score pair — clickable if horizon goal exists */}
                  <div
                    onClick={horizonGoal ? () => setGoalModal(key) : undefined}
                    title={horizonGoal ? 'See horizon goal' : undefined}
                    style={{
                      width: '64px', flexShrink: 0,
                      display: 'flex', alignItems: 'center', gap: '3px',
                      cursor: horizonGoal ? 'pointer' : 'default',
                    }}
                  >
                    {score != null && (
                      <>
                        <span style={{
                          ...sc, fontSize: '13px', color,
                          textDecoration: horizonGoal ? 'underline' : 'none',
                          textUnderlineOffset: '2px',
                          textDecorationColor: 'rgba(200,146,42,0.35)',
                        }}>{score}</span>
                        <span style={{ ...sc, fontSize: '11px', color: 'rgba(15,21,35,0.3)' }}>→</span>
                        <span style={{ ...sc, fontSize: '13px', color: horizonScores[key] != null ? '#C8922A' : 'rgba(200,146,42,0.3)' }}>
                          {horizonScores[key] != null ? horizonScores[key] : '?'}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Domain label */}
                  <div style={{ ...sc, fontSize: '9px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.4)', textTransform: 'uppercase', width: '68px', flexShrink: 0 }}>
                    {DOMAIN_LABEL_MAP[key]}
                  </div>

                  {/* I Am statement */}
                  <div style={{ flex: 1 }}>
                    {ia ? (
                      <p style={{ ...body, fontSize: '13px', color: '#0F1523', lineHeight: 1.55, margin: 0 }}>{ia}</p>
                    ) : (
                      <p style={{ ...body, fontSize: '12px', color: 'rgba(15,21,35,0.28)', fontStyle: 'italic', margin: 0 }}>No statement yet</p>
                    )}
                  </div>

                  {/* Edit button — bottom right */}
                  <button
                    onClick={() => openEdit(key)}
                    style={{
                      ...sc, fontSize: '9px', letterSpacing: '0.12em',
                      color: 'rgba(15,21,35,0.35)', background: 'none',
                      border: '1px solid rgba(15,21,35,0.1)', borderRadius: '20px',
                      padding: '3px 9px', cursor: 'pointer', flexShrink: 0,
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#A8721A'; e.currentTarget.style.borderColor = 'rgba(200,146,42,0.4)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(15,21,35,0.35)'; e.currentTarget.style.borderColor = 'rgba(15,21,35,0.1)' }}
                  >
                    Edit
                  </button>
                </div>
              )}

              {/* Edit panel — opens inline */}
              {isEditing && (
                <div style={{ padding: '12px 14px', background: 'rgba(200,146,42,0.02)', borderTop: editing !== key ? 'none' : undefined }}>

                  {/* Domain label in edit mode */}
                  <div style={{ ...sc, fontSize: '9px', letterSpacing: '0.14em', color: '#A8721A', textTransform: 'uppercase', marginBottom: '10px' }}>
                    {DOMAIN_LABEL_MAP[key]}
                  </div>

                  {/* Explainer — first time only */}
                  {!hasEditedOnce && (
                    <p style={{ ...body, fontSize: '12px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.65, marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid rgba(200,146,42,0.1)' }}>
                      An "I am..." statement is a one-line, present-tense version of where you're going in this domain. Not a goal — a declaration. "I am an athlete, dancer, ninja." Write it as if it's already true. Keep refining it until you feel a spark when you read it back — that's how you know it's yours.
                    </p>
                  )}

                  {/* Textarea */}
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    placeholder="I am..."
                    rows={2}
                    style={{
                      width: '100%', ...body, fontSize: '13px', color: '#0F1523',
                      border: '1px solid rgba(200,146,42,0.35)', borderRadius: '6px',
                      padding: '8px 10px', resize: 'vertical', outline: 'none',
                      background: '#FFFFFF', lineHeight: 1.6, boxSizing: 'border-box',
                      marginBottom: '8px',
                    }}
                    autoFocus
                  />

                  {/* Actions row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        onClick={() => draft.trim() && saveIa(key, draft.trim())}
                        disabled={saving || !draft.trim()}
                        style={{ ...sc, fontSize: '10px', letterSpacing: '0.1em', color: '#FFFFFF', background: draft.trim() ? '#A8721A' : 'rgba(200,146,42,0.3)', border: 'none', borderRadius: '20px', padding: '5px 14px', cursor: draft.trim() ? 'pointer' : 'not-allowed' }}
                      >{saving ? 'Saving…' : 'Save'}</button>
                      <button
                        onClick={() => { setEditing(null); setDraft('') }}
                        style={{ ...sc, fontSize: '10px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.45)', background: 'none', border: 'none', cursor: 'pointer', padding: '5px 0' }}
                      >Cancel</button>
                    </div>
                    {/* Draft with North Star — only if horizon goal exists */}
                    {horizonGoal && (
                      <button
                        onClick={() => { setNsModal(key); setEditing(null) }}
                        style={{ ...sc, fontSize: '9px', letterSpacing: '0.1em', color: '#A8721A', background: 'rgba(200,146,42,0.06)', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '20px', padding: '4px 10px', cursor: 'pointer' }}
                      >Draft with North Star</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Tool links */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ ...sc, fontSize: '9px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.35)', textTransform: 'uppercase', marginBottom: '8px' }}>
          Act on your map
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            { label: 'Horizon State', sub: 'Ground the baseline · daily regulation', href: '/tools/horizon-state' },
            { label: 'Target Sprint', sub: 'Close the gap · 90-day focused sprint', href: '/tools/target-sprint' },
            { label: 'Horizon Practice', sub: 'Daily becoming · T.E.A. practice', href: '/tools/horizon-practice' },
          ].map(t => (
            <a key={t.href} href={t.href} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', border: '1px solid rgba(200,146,42,0.18)',
              borderRadius: '7px', background: 'rgba(200,146,42,0.02)', textDecoration: 'none',
            }}>
              <div>
                <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.08em', color: '#0F1523', fontWeight: 500 }}>{t.label}</div>
                <div style={{ ...body, fontSize: '10px', color: 'rgba(15,21,35,0.45)', marginTop: '1px' }}>{t.sub}</div>
              </div>
              <span style={{ color: '#A8721A', fontSize: '12px' }}>→</span>
            </a>
          ))}
        </div>
      </div>

      <NextUpBanner label="Rescore your map" sub="10–20 min · see what's shifted" href="/tools/map" />

      {/* North Star modal */}
      {nsModal && (
        <NorthStarModal
          domainKey={nsModal}
          horizonGoal={nsModal === 'life' ? lifeHorizon : (domainData?.[nsModal]?.horizonText || horizonProfile?.[nsModal]?.horizonGoal)}
          purposeData={purposeData}
          userId={userId}
          onSelect={handleDraftSelect}
          onClose={() => setNsModal(null)}
        />
      )}

      {/* Horizon goal modal — triggered by clicking score pair */}
      {goalModal && (() => {
        const isLife      = goalModal === 'life'
        const currentVals = isLife ? DOMAIN_KEYS.map(k => currentScores[k]).filter(v => v != null) : null
        const horizonVals = isLife ? DOMAIN_KEYS.map(k => horizonScores[k]).filter(v => v != null) : null
        const current     = isLife ? (currentVals.length ? Math.round((currentVals.reduce((a,b)=>a+b,0)/currentVals.length)*10)/10 : null) : currentScores[goalModal]
        const horizon     = isLife ? (horizonVals.length ? Math.round((horizonVals.reduce((a,b)=>a+b,0)/horizonVals.length)*10)/10 : null) : horizonScores[goalModal]
        const color       = getTierColor(current)
        const reality     = isLife ? null : (domainData?.[goalModal]?.realityFinal || domainData?.[goalModal]?.realityDraft || null)
        const avatar      = isLife ? null : (domainData?.[goalModal]?.avatarFinal || null)
        const horizonText = isLife ? lifeHorizon : (domainData?.[goalModal]?.horizonText || horizonProfile?.[goalModal]?.horizonGoal)
        const modalLabel  = isLife ? 'LIFE HORIZON' : DOMAIN_LABEL_MAP[goalModal]?.toUpperCase()
        return (
          <div
            onClick={() => setGoalModal(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 3000,
              background: 'rgba(15,21,35,0.55)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: '#FAFAF7', borderRadius: '14px',
                border: '1px solid rgba(200,146,42,0.25)',
                width: 'min(480px, 100%)', maxHeight: '80vh',
                overflowY: 'auto', padding: '24px',
                boxShadow: '0 20px 60px rgba(15,21,35,0.25)',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <div style={{ ...sc, fontSize: '9px', letterSpacing: '0.16em', color: '#A8721A', marginBottom: '6px' }}>
                    {modalLabel}
                  </div>
                  {/* Score pair */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ ...sc, fontSize: '20px', color }}>{current}</span>
                    <span style={{ ...sc, fontSize: '14px', color: 'rgba(15,21,35,0.3)' }}>→</span>
                    <span style={{ ...sc, fontSize: '20px', color: horizon != null ? '#C8922A' : 'rgba(200,146,42,0.3)' }}>
                      {horizon != null ? horizon : '?'}
                    </span>
                    <span style={{ ...sc, fontSize: '11px', color, marginLeft: '4px' }}>{getTierLabel(current)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setGoalModal(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(15,21,35,0.45)', fontSize: '18px', lineHeight: 1, padding: '2px 4px' }}
                >×</button>
              </div>

              {/* Where I am now — avatar + reality */}
              {(avatar || reality) && (
                <div style={{ marginBottom: '16px', padding: '12px 14px', background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.15)', borderRadius: '8px' }}>
                  <div style={{ ...sc, fontSize: '9px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.4)', textTransform: 'uppercase', marginBottom: '8px' }}>Where I am now</div>
                  {avatar && <p style={{ ...body, fontSize: '13px', fontStyle: 'italic', color: '#0F1523', lineHeight: 1.65, margin: '0 0 8px' }}>"{avatar}"</p>}
                  {reality && <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65, margin: 0 }}>{reality}</p>}
                </div>
              )}

              {/* Horizon goal */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ ...sc, fontSize: '9px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.4)', textTransform: 'uppercase', marginBottom: '8px' }}>Horizon goal</div>
                <p style={{ ...body, fontSize: '15px', color: '#0F1523', lineHeight: 1.75, margin: 0 }}>{horizonText}</p>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setGoalModal(null); if (goalModal === 'life') { setEditing('life'); setDraft(localLifeIa || '') } else { openEdit(goalModal) } }}
                  style={{ ...sc, fontSize: '10px', letterSpacing: '0.12em', color: '#A8721A', background: 'rgba(200,146,42,0.06)', border: '1px solid rgba(200,146,42,0.3)', borderRadius: '20px', padding: '6px 14px', cursor: 'pointer' }}
                >Write my statement →</button>
                <button
                  onClick={() => setGoalModal(null)}
                  style={{ ...sc, fontSize: '10px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.45)', background: 'none', border: '1px solid rgba(15,21,35,0.12)', borderRadius: '20px', padding: '6px 14px', cursor: 'pointer' }}
                >Close</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MISSION CONTROL — Dashboard replacing /profile
// Four zones: You · Your Work · Practitioners · Planet
// Profile identity card always anchored at rail bottom
// ─────────────────────────────────────────────────────────────

const serif  = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const sc     = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body   = { fontFamily: "'Lora', Georgia, serif" }

const DOMAIN_LABELS = ['Path', 'Spark', 'Body', 'Finances', 'Connection', 'Inner Game', 'Signal']
const DOMAIN_KEYS   = ['path', 'spark', 'body', 'finances', 'connection', 'inner_game', 'signal']

const TIER_LABELS = {
  10: 'World-Class', 9: 'Exemplar', 8: 'Fluent', 7: 'Capable', 6: 'Functional',
  5: 'Threshold', 4: 'Friction', 3: 'Strain', 2: 'Crisis', 1: 'Emergency', 0: 'Ground Zero',
}

function getTierLabel(n) {
  const floor = Math.floor(n)
  return TIER_LABELS[floor] ?? TIER_LABELS[Math.round(n)] ?? ''
}

function getTierColor(n) {
  if (n == null) return 'rgba(200,146,42,0.3)'
  if (n >= 9)   return '#3B6B9E'
  if (n >= 7)   return '#5A8AB8'
  if (n >= 5)   return '#8A8070'
  if (n >= 3)   return '#8A7030'
  return '#8A3030'
}

// ── Shared primitives ─────────────────────────────────────────

function Eyebrow({ children, style = {} }) {
  return (
    <span style={{
      ...sc, fontSize: '11px', letterSpacing: '0.2em', color: '#A8721A',
      textTransform: 'uppercase', display: 'block', marginBottom: '6px', ...style,
    }}>
      {children}
    </span>
  )
}

function Rule() {
  return <div style={{ height: '1px', background: 'rgba(200,146,42,0.15)', margin: '16px 0' }} />
}

function Badge({ children, variant = 'gold' }) {
  const styles = {
    gold:  { bg: 'rgba(200,146,42,0.08)', border: 'rgba(200,146,42,0.35)', color: '#A8721A' },
    green: { bg: 'rgba(45,106,79,0.08)',  border: 'rgba(45,106,79,0.35)',  color: '#2D6A4F' },
    dim:   { bg: 'rgba(15,21,35,0.04)',   border: 'rgba(15,21,35,0.15)',   color: 'rgba(15,21,35,0.55)' },
    blue:  { bg: 'rgba(90,138,184,0.08)', border: 'rgba(90,138,184,0.35)', color: '#5A8AB8' },
    red:   { bg: 'rgba(138,48,48,0.06)',  border: 'rgba(138,48,48,0.25)',  color: '#8A3030' },
  }
  const s = styles[variant] || styles.gold
  return (
    <span style={{
      ...sc, fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase',
      color: s.color, background: s.bg, border: `1px solid ${s.border}`,
      borderRadius: '40px', padding: '2px 8px', display: 'inline-block',
    }}>
      {children}
    </span>
  )
}

function PulseStrip({ scores }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
      {DOMAIN_KEYS.map((k, i) => {
        const s = scores[k]
        const color = getTierColor(s)
        const pct = s != null ? (s / 10) * 100 : 0
        return (
          <div key={k} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
            padding: '8px 4px', background: 'rgba(200,146,42,0.03)',
            border: '1px solid rgba(200,146,42,0.12)', borderRadius: '8px',
          }}>
            <div style={{ ...sc, fontSize: '9px', color: 'rgba(15,21,35,0.45)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {DOMAIN_LABELS[i].slice(0, 3)}
            </div>
            <div style={{ ...body, fontSize: '16px', fontWeight: 300, color: s != null ? color : 'rgba(15,21,35,0.2)', lineHeight: 1 }}>
              {s != null ? s : '–'}
            </div>
            <div style={{ width: '100%', height: '3px', background: 'rgba(200,146,42,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TaskList({ tasks, checked, onCheck }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {tasks.map((task, i) => {
        const done = checked?.[i]
        const text = typeof task === 'string' ? task : task.text || task.label || String(task)
        const due  = typeof task === 'object' ? task.due : null
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '6px 10px', background: 'rgba(200,146,42,0.03)',
            border: '1px solid rgba(200,146,42,0.10)', borderRadius: '6px',
            opacity: done ? 0.55 : 1,
          }}>
            <div
              onClick={() => onCheck?.(i)}
              style={{
                width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0,
                border: `1px solid ${done ? 'rgba(45,106,79,0.6)' : 'rgba(200,146,42,0.4)'}`,
                background: done ? 'rgba(45,106,79,0.12)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: onCheck ? 'pointer' : 'default',
              }}
            >
              {done && <svg width="8" height="8" viewBox="0 0 8 8"><polyline points="1,4 3,6 7,2" stroke="#2D6A4F" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>}
            </div>
            <div style={{ ...body, fontSize: '12px', color: '#0F1523', flex: 1, textDecoration: done ? 'line-through' : 'none' }}>
              {text}
            </div>
            {due && (
              <div style={{ ...sc, fontSize: '10px', color: due === 'Today' ? '#A8721A' : 'rgba(15,21,35,0.4)', fontWeight: due === 'Today' ? 500 : 400, flexShrink: 0 }}>
                {due}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function NextUpBanner({ label, sub, href }) {
  return (
    <Link to={href} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', border: '1px solid rgba(200,146,42,0.45)',
      borderRadius: '8px', background: 'rgba(200,146,42,0.05)', textDecoration: 'none',
    }}>
      <div>
        <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: '#A8721A', fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ ...body, fontSize: '11px', color: 'rgba(15,21,35,0.55)', marginTop: '1px' }}>{sub}</div>}
      </div>
      <span style={{ color: '#A8721A', fontSize: '14px' }}>→</span>
    </Link>
  )
}

function EmptySlot({ cta, ctaUrl }) {
  return (
    <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginBottom: '6px' }}>
      Not yet started.{' '}
      {cta && ctaUrl && <Link to={ctaUrl} style={{ color: '#A8721A', textDecoration: 'none' }}>{cta} →</Link>}
    </div>
  )
}

// ── Horizon State inline panel ────────────────────────────────

function HorizonStatePanel({ foundationData }) {
  const [open, setOpen] = useState(false)

  const today       = new Date().toISOString().slice(0, 10)
  const practicedToday = foundationData?.last_session_at?.slice(0, 10) === today
  const streak      = foundationData?.streak_days ?? 0
  const sessionsTotal = foundationData?.sessions_total ?? 0

  const PHASES = ['Baseline', 'Autonomy', 'Calibration', 'Integration', 'Agency', 'Embodiment', 'Contribution']
  const currentPhase = foundationData?.phase ?? 'baseline'
  const phaseIdx = PHASES.findIndex(p => p.toLowerCase() === currentPhase.toLowerCase())

  return (
    <div>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '9px 12px', background: 'rgba(250,250,247,1)',
          border: `1px solid ${open ? 'rgba(200,146,42,0.55)' : 'rgba(200,146,42,0.2)'}`,
          borderRadius: open ? '8px 8px 0 0' : '8px', cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
      >
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(200,146,42,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4" stroke="#A8721A" strokeWidth="1.5"/><circle cx="6" cy="6" r="1.5" fill="#A8721A"/></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.1em', color: '#0F1523', fontWeight: 500 }}>Horizon State</div>
          <div style={{ ...body, fontSize: '10px', color: 'rgba(15,21,35,0.5)', marginTop: '1px' }}>
            {practicedToday ? 'Done today ✓' : sessionsTotal > 0 ? 'Ready when you are' : 'Start your first session'}
          </div>
        </div>
        {streak > 0 && <Badge variant="gold">{streak} day streak</Badge>}
        <Badge variant={practicedToday ? 'green' : 'gold'}>{practicedToday ? 'Done' : 'Practice'}</Badge>
        <span style={{ color: '#A8721A', fontSize: '12px', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
      </div>

      {open && (
        <div style={{
          padding: '14px', background: 'rgba(200,146,42,0.03)',
          border: '1px solid rgba(200,146,42,0.2)', borderTop: 'none',
          borderRadius: '0 0 8px 8px',
        }}>
          {/* Phase strip */}
          <div style={{ display: 'flex', gap: '3px', marginBottom: '12px', flexWrap: 'wrap' }}>
            {PHASES.map((p, i) => (
              <span key={p} style={{
                ...sc, fontSize: '9px', letterSpacing: '0.1em', padding: '3px 7px',
                borderRadius: '20px', border: '1px solid',
                borderColor: i === phaseIdx ? 'rgba(200,146,42,0.5)' : 'rgba(200,146,42,0.12)',
                background: i === phaseIdx ? 'rgba(200,146,42,0.1)' : 'transparent',
                color: i === phaseIdx ? '#A8721A' : 'rgba(15,21,35,0.45)',
                fontWeight: i === phaseIdx ? 500 : 400,
              }}>
                {p}
              </span>
            ))}
          </div>

          {/* Player mock */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <Link to="/tools/horizon-state" style={{
              width: '30px', height: '30px', borderRadius: '50%', background: '#A8721A',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, textDecoration: 'none',
            }}>
              <svg width="9" height="11" viewBox="0 0 9 11" fill="white"><path d="M0 0L9 5.5L0 11Z"/></svg>
            </Link>
            <div style={{ flex: 1, height: '3px', background: 'rgba(200,146,42,0.15)', borderRadius: '2px', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, width: '35%', height: '100%', background: '#A8721A', borderRadius: '2px' }} />
            </div>
            <span style={{ ...sc, fontSize: '10px', color: 'rgba(15,21,35,0.45)' }}>
              {foundationData?.sessions_total ? `${foundationData.sessions_week ?? 0} this week` : '20 min'}
            </span>
          </div>

          <Link to="/tools/horizon-state" style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: '#A8721A', textDecoration: 'none' }}>
            Open full session →
          </Link>
        </div>
      )}
    </div>
  )
}

// ── Sprint card ───────────────────────────────────────────────

function SprintCard({ sprintData }) {
  const [expanded, setExpanded] = useState(false)
  if (!sprintData || !sprintData.domains?.length) {
    return <EmptySlot cta="Begin Target Sprint" ctaUrl="/tools/target-sprint" />
  }

  const dd = sprintData.domain_data ?? {}
  const domains = sprintData.domains ?? []

  // Days remaining
  let daysLabel = null, daysUrgent = false
  if (sprintData.target_date) {
    const days = Math.ceil((new Date(sprintData.target_date) - new Date()) / 86400000)
    daysLabel  = days > 0 ? `${days}d left` : `${Math.abs(days)}d overdue`
    daysUrgent = days <= 14
  }

  // Tasks across all domains
  const allTasks = []
  domains.forEach(id => {
    const d = dd[id] ?? {}
    const tasks = d.tasks ?? []
    const checked = d.taskChecked ?? {}
    const idx = DOMAIN_KEYS.indexOf(id)
    const label = idx >= 0 ? DOMAIN_LABELS[idx] : id
    tasks.forEach((task, i) => {
      const text = typeof task === 'string' ? task : task.text || task.label || ''
      const due  = typeof task === 'object' ? task.due : null
      allTasks.push({ text, due, done: !!checked[i], domain: label, domainId: id, taskIdx: i })
    })
  })

  const done  = allTasks.filter(t => t.done).length
  const total = allTasks.length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0
  const upcoming = allTasks.filter(t => !t.done).slice(0, 4)

  const domainNames = domains.map(id => {
    const idx = DOMAIN_KEYS.indexOf(id)
    return idx >= 0 ? DOMAIN_LABELS[idx] : id
  }).join(' · ')

  return (
    <div style={{ border: '1px solid rgba(200,146,42,0.2)', borderRadius: '8px', overflow: 'hidden' }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(o => !o)}
        style={{ padding: '10px 12px', background: 'rgba(200,146,42,0.03)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.1em', color: '#0F1523', fontWeight: 500 }}>Target Sprint</div>
          <div style={{ ...body, fontSize: '10px', color: 'rgba(15,21,35,0.5)', marginTop: '1px' }}>{domainNames}</div>
        </div>
        {daysLabel && <Badge variant={daysUrgent ? 'red' : 'gold'}>{daysLabel}</Badge>}
        <span style={{ ...sc, fontSize: '10px', color: '#A8721A' }}>{pct}%</span>
        <span style={{ color: '#A8721A', fontSize: '12px', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
      </div>

      {/* Progress bar */}
      <div style={{ height: '3px', background: 'rgba(200,146,42,0.08)' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#A8721A', transition: 'width 0.4s' }} />
      </div>

      {/* Upcoming tasks — always visible */}
      {upcoming.length > 0 && (
        <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(200,146,42,0.08)' }}>
          <TaskList tasks={upcoming.map(t => ({ text: `[${t.domain}] ${t.text}`, due: t.due }))} checked={{}} />
        </div>
      )}

      {/* Expanded: full domain breakdown */}
      {expanded && (
        <div style={{ padding: '12px', borderTop: '1px solid rgba(200,146,42,0.1)', background: 'rgba(200,146,42,0.02)' }}>
          {domains.map(id => {
            const d = dd[id] ?? {}
            const tasks = d.tasks ?? []
            const checked = d.taskChecked ?? {}
            const idx = DOMAIN_KEYS.indexOf(id)
            const label = idx >= 0 ? DOMAIN_LABELS[idx] : id
            const tDone = Object.values(checked).filter(Boolean).length
            return (
              <div key={id} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.1em', color: '#A8721A' }}>{label}</span>
                  <span style={{ ...sc, fontSize: '10px', color: 'rgba(15,21,35,0.45)' }}>{tDone}/{tasks.length}</span>
                </div>
                {d.targetGoal && (
                  <div style={{ ...body, fontSize: '11px', color: 'rgba(15,21,35,0.6)', lineHeight: 1.5, marginBottom: '6px' }}>{d.targetGoal}</div>
                )}
                <TaskList tasks={tasks} checked={checked} />
              </div>
            )
          })}
          <Link to="/tools/target-sprint" style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: '#A8721A', textDecoration: 'none' }}>
            Open full sprint →
          </Link>
        </div>
      )}
    </div>
  )
}

// ── Practice card ─────────────────────────────────────────────

function PracticeCard({ practiceData }) {
  const [expanded, setExpanded] = useState(false)
  if (!practiceData) {
    return <EmptySlot cta="Begin Horizon Practice" ctaUrl="/tools/horizon-practice" />
  }

  const today = practiceData?.today ?? {}
  const tea   = today?.tea ?? {}

  return (
    <div style={{ border: '1px solid rgba(200,146,42,0.2)', borderRadius: '8px', overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded(o => !o)}
        style={{ padding: '10px 12px', background: 'rgba(200,146,42,0.03)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.1em', color: '#0F1523', fontWeight: 500 }}>Horizon Practice</div>
          <div style={{ ...body, fontSize: '10px', color: 'rgba(15,21,35,0.5)', marginTop: '1px' }}>
            {today?.focus ?? 'Daily T.E.A. practice'}
          </div>
        </div>
        <Badge variant="gold">Today</Badge>
        <span style={{ color: '#A8721A', fontSize: '12px', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
      </div>

      {/* T.E.A. strip — always visible */}
      {(tea.think || tea.embody || tea.act) && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(200,146,42,0.08)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
          {[['T', 'Think', tea.think], ['E', 'Embody', tea.embody], ['A', 'Act', tea.act]].map(([abbr, label, val]) => (
            <div key={abbr} style={{ padding: '6px 8px', background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.1)', borderRadius: '6px' }}>
              <div style={{ ...sc, fontSize: '9px', letterSpacing: '0.12em', color: '#A8721A', marginBottom: '2px' }}>{label}</div>
              <div style={{ ...body, fontSize: '10px', color: '#0F1523', lineHeight: 1.4 }}>{val ?? '–'}</div>
            </div>
          ))}
        </div>
      )}

      {expanded && (
        <div style={{ padding: '12px', borderTop: '1px solid rgba(200,146,42,0.1)', background: 'rgba(200,146,42,0.02)' }}>
          {practiceData?.skill && (
            <div style={{ marginBottom: '10px' }}>
              <Eyebrow>Skill development</Eyebrow>
              <div style={{ ...body, fontSize: '12px', color: '#0F1523' }}>{practiceData.skill}</div>
            </div>
          )}
          {practiceData?.identityAnchor && (
            <div style={{ marginBottom: '10px' }}>
              <Eyebrow>Horizon Self anchor</Eyebrow>
              <div style={{ ...body, fontSize: '12px', color: '#0F1523' }}>{practiceData.identityAnchor}</div>
            </div>
          )}
          <Link to="/tools/horizon-practice" style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: '#A8721A', textDecoration: 'none' }}>
            Open full practice →
          </Link>
        </div>
      )}
    </div>
  )
}

// ── HorizonWheel (mini) ───────────────────────────────────────

function HorizonWheelMini({ currentScores, horizonScores, size = 180, onDomainClick }) {
  const cx = size / 2, cy = size / 2
  const maxR = (size / 2) * 0.62
  const n = DOMAIN_KEYS.length

  function pt(i, v) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    const r = (Math.min(v ?? 0, 10) / 10) * maxR
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }

  const currentPts = DOMAIN_KEYS.map((k, i) => pt(i, currentScores[k] ?? 0).join(',')).join(' ')
  const horizonPts = DOMAIN_KEYS.map((k, i) => pt(i, horizonScores[k] ?? 0).join(',')).join(' ')
  const hasHorizon = Object.values(horizonScores).some(v => v > 0)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}>
      {[2, 4, 6, 8, 10].map(v => {
        const pts = DOMAIN_KEYS.map((_, i) => pt(i, v).join(',')).join(' ')
        return <polygon key={v} points={pts} fill="none" stroke={v === 5 ? 'rgba(138,48,48,0.15)' : 'rgba(200,146,42,0.07)'} strokeWidth={v === 5 ? 1 : 0.5} strokeDasharray={v === 5 ? '2 2' : 'none'} />
      })}
      {hasHorizon && <polygon points={horizonPts} fill="rgba(200,146,42,0.06)" stroke="#C8922A" strokeWidth="1.5" strokeDasharray="3 2" />}
      <polygon points={currentPts} fill="rgba(200,146,42,0.07)" stroke="rgba(200,146,42,0.55)" strokeWidth="1.5" strokeLinejoin="round" />
      {DOMAIN_KEYS.map((k, i) => {
        const s = currentScores[k]
        if (s == null) return null
        const [x, y] = pt(i, s)
        return (
          <circle
            key={k} cx={x} cy={y} r={onDomainClick ? 5 : 2.5}
            fill={getTierColor(s)} stroke="rgba(250,250,247,0.8)" strokeWidth="1"
            style={{ cursor: onDomainClick ? 'pointer' : 'default' }}
            onClick={onDomainClick ? () => onDomainClick(k) : undefined}
          />
        )
      })}
      {DOMAIN_KEYS.map((k, i) => {
        const a = (Math.PI * 2 * i) / n - Math.PI / 2
        const lx = cx + maxR * 1.22 * Math.cos(a)
        const ly = cy + maxR * 1.22 * Math.sin(a)
        const anchor = Math.abs(lx - cx) < 8 ? 'middle' : lx < cx ? 'end' : 'start'
        return (
          <text key={k} x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle"
            fontFamily="'Cormorant SC', Georgia, serif" fontSize="8" letterSpacing="0.5"
            fill="rgba(15,21,35,0.55)">
            {DOMAIN_LABELS[i].slice(0, 3)}
          </text>
        )
      })}
    </svg>
  )
}

// ── Profile view ──────────────────────────────────────────────

function ProfileView({ user, onSignOut }) {
  const name   = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You'
  const email  = user?.email ?? ''
  const initials = name.charAt(0).toUpperCase()
  const isFounder = user?.user_metadata?.role === 'founder'

  const [horizonSelf, setHorizonSelf] = useState(user?.user_metadata?.horizon_self ?? '')
  const [editing,     setEditing]     = useState(false)
  const [saving,      setSaving]      = useState(false)

  async function saveHorizonSelf() {
    setSaving(true)
    await supabase.auth.updateUser({ data: { horizon_self: horizonSelf } })
    setSaving(false)
    setEditing(false)
  }

  return (
    <div>
      {/* Hero */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.15)', borderRadius: '10px', marginBottom: '14px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(200,146,42,0.12)', border: '2px solid rgba(200,146,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...sc, fontSize: '20px', color: '#A8721A', fontWeight: 500 }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...sc, fontSize: '16px', letterSpacing: '0.06em', color: '#0F1523', fontWeight: 500 }}>{name}</div>
          <div style={{ ...body, fontSize: '12px', color: 'rgba(15,21,35,0.55)', marginTop: '2px' }}>{email}</div>
        </div>
        <Badge variant="green">Pro</Badge>
      </div>

      {/* Horizon Self */}
      <div style={{ padding: '14px 16px', border: '1px solid rgba(200,146,42,0.35)', borderRadius: '10px', background: 'rgba(200,146,42,0.04)', marginBottom: '14px' }}>
        <Eyebrow>Horizon Self</Eyebrow>
        {editing ? (
          <div>
            <textarea
              value={horizonSelf}
              onChange={e => setHorizonSelf(e.target.value)}
              rows={3}
              style={{ ...body, fontSize: '13px', color: '#0F1523', width: '100%', padding: '8px 10px', border: '1px solid rgba(200,146,42,0.35)', borderRadius: '6px', background: '#FFFFFF', outline: 'none', resize: 'vertical', lineHeight: 1.6, marginBottom: '8px' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={saveHorizonSelf} disabled={saving} style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: '#FFFFFF', background: '#C8922A', border: 'none', borderRadius: '20px', padding: '6px 14px', cursor: 'pointer' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)', background: 'transparent', border: '1px solid rgba(15,21,35,0.2)', borderRadius: '20px', padding: '6px 14px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            {horizonSelf ? (
              <p style={{ ...body, fontSize: '13px', fontStyle: 'italic', color: '#0F1523', lineHeight: 1.65, margin: '0 0 8px' }}>"{horizonSelf}"</p>
            ) : (
              <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.45)', margin: '0 0 8px' }}>Not yet written. Complete Purpose Piece to unlock.</p>
            )}
            <button onClick={() => setEditing(true)} style={{ ...sc, fontSize: '10px', letterSpacing: '0.12em', color: '#A8721A', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {horizonSelf ? 'Edit statement →' : 'Add statement →'}
            </button>
          </div>
        )}
      </div>

      {/* Public profile */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.12)', borderRadius: '8px', marginBottom: '14px' }}>
        <div>
          <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.1em', color: '#0F1523', fontWeight: 500 }}>Contributor profile</div>
          <div style={{ ...body, fontSize: '10px', color: 'rgba(15,21,35,0.45)', marginTop: '1px' }}>Visible to organisations on NextUs Planet</div>
        </div>
        <Link to={`/nextus/contributors/${user?.id}`} style={{ ...sc, fontSize: '11px', letterSpacing: '0.1em', color: '#A8721A', textDecoration: 'none' }}>View →</Link>
      </div>

      {/* Account */}
      <Eyebrow>Account</Eyebrow>
      <div style={{ background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.12)', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
        {[
          ['Email', email],
          ['Subscription', 'Pro · Active'],
        ].map(([label, val], i, arr) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderBottom: i < arr.length - 1 ? '1px solid rgba(200,146,42,0.08)' : 'none' }}>
            <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.55)' }}>{label}</span>
            <span style={{ ...body, fontSize: '12px', color: label === 'Subscription' ? '#2D6A4F' : 'rgba(15,21,35,0.72)' }}>{val}</span>
          </div>
        ))}
      </div>

      {isFounder && (
        <Link to="/admin" style={{ display: 'block', textAlign: 'center', padding: '9px', border: '1px solid rgba(200,146,42,0.25)', borderRadius: '8px', ...sc, fontSize: '11px', letterSpacing: '0.14em', color: '#A8721A', textDecoration: 'none', marginBottom: '10px', background: 'rgba(200,146,42,0.04)' }}>
          Admin Console →
        </Link>
      )}

      <button
        onClick={onSignOut}
        style={{ width: '100%', padding: '9px', background: 'none', border: '1px solid rgba(15,21,35,0.12)', borderRadius: '8px', cursor: 'pointer', ...sc, fontSize: '11px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)' }}
      >
        Sign out
      </button>
    </div>
  )
}

// ── Practitioners zone ────────────────────────────────────────

function PractitionersView({ purposeData }) {
  const archetype = purposeData?.session?.tentative?.archetype?.archetype
  const domain    = purposeData?.session?.tentative?.domain?.domain
  const mapScores = {}

  const MATCHES = [
    { ey: 'Practitioner · Finance & Wealth', title: 'The Lynne Twist Framework', desc: 'Soul of Money — abundance-based relationship with finances.', match: 'Finances · Architect · Systemic scale', visible: true },
    { ey: 'Methodology · Systems Thinking', title: 'Donella Meadows — Leverage Points', desc: 'Thinking in systems for platform architects and visionary builders.', match: 'Architect archetype · Vision domain', visible: true },
    { ey: 'Practitioner · Men\'s Development', title: 'Richard Rohr — Male Initiation', desc: 'Frameworks for male identity and purpose.', match: 'Path · Inner Game', visible: true },
  ]

  return (
    <div>
      <div style={{ marginBottom: '14px' }}>
        <Eyebrow>Matched for you</Eyebrow>
        {!archetype && (
          <NextUpBanner label="Complete Purpose Piece to unlock matches" sub="Matching runs on archetype, domain, and map scores" href="/tools/purpose-piece" />
        )}
      </div>
      {MATCHES.map((m, i) => (
        <div key={i} style={{ border: '1px solid rgba(90,138,184,0.3)', background: 'rgba(90,138,184,0.03)', borderRadius: '8px', padding: '12px 14px', marginBottom: '8px', cursor: 'pointer', transition: 'border-color 0.15s' }}>
          <div style={{ ...sc, fontSize: '9px', letterSpacing: '0.14em', color: '#5A8AB8', textTransform: 'uppercase', marginBottom: '4px' }}>{m.ey}</div>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.08em', color: '#0F1523', fontWeight: 500, marginBottom: '4px' }}>{m.title}</div>
          <div style={{ ...body, fontSize: '11px', color: 'rgba(15,21,35,0.6)', lineHeight: 1.5, marginBottom: '6px' }}>{m.desc}</div>
          <div style={{ ...body, fontSize: '10px', color: '#5A8AB8' }}>↳ Matched on: {m.match}</div>
        </div>
      ))}
      <div style={{ marginTop: '12px', textAlign: 'center', padding: '10px', border: '1px solid rgba(90,138,184,0.2)', borderRadius: '8px' }}>
        <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.45)' }}>
          Preview · live matching coming soon
        </div>
      </div>
    </div>
  )
}

// ── Planet zone ───────────────────────────────────────────────

const CIVILISATIONAL_DOMAINS = [
  { key: 'human-being',     label: 'Human Being',      score: 6 },
  { key: 'society',         label: 'Society',           score: 5 },
  { key: 'nature',          label: 'Nature',            score: 3, alert: true },
  { key: 'technology',      label: 'Technology',        score: 7 },
  { key: 'finance-economy', label: 'Finance & Economy', score: 4, alert: true },
  { key: 'legacy',          label: 'Legacy',            score: 5 },
  { key: 'vision',          label: 'Vision',            score: 7 },
]

function PlanetView({ purposeData, activeView }) {
  const archetype = purposeData?.session?.tentative?.archetype?.archetype
  const domain    = purposeData?.session?.tentative?.domain?.domain

  if (activeView === 'gap') {
    return (
      <div>
        <Eyebrow>Gap signals firing now</Eyebrow>
        {CIVILISATIONAL_DOMAINS.filter(d => d.alert).map(d => (
          <div key={d.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', background: 'rgba(138,48,48,0.04)', border: '1px solid rgba(138,48,48,0.2)', borderRadius: '8px', marginBottom: '8px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#8A3030', flexShrink: 0, marginTop: '3px' }} />
            <div>
              <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.1em', color: '#8A3030', fontWeight: 500 }}>Gap Signal · {d.label}</div>
              <div style={{ ...body, fontSize: '11px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.5, marginTop: '3px' }}>
                {d.key === 'nature' ? 'Low score, low actor density, and low funding simultaneously. Critical threshold.' : 'Regenerative actors underfunded. Extractive models dominating the domain.'}
              </div>
            </div>
          </div>
        ))}
        <div style={{ marginTop: '12px', padding: '10px 12px', background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.15)', borderRadius: '8px' }}>
          <div style={{ ...body, fontSize: '11px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.5 }}>
            Gap Signals fire when a domain simultaneously has low score, low actor density, and low funding. Your contribution archetype determines which gaps are surfaced for you.
          </div>
        </div>
      </div>
    )
  }

  if (activeView === 'orgs') {
    return (
      <div>
        <Eyebrow>Organisations in the field</Eyebrow>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {CIVILISATIONAL_DOMAINS.slice(0, 4).map(d => (
            <span key={d.key} style={{ ...sc, fontSize: '10px', letterSpacing: '0.1em', padding: '3px 8px', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '20px', color: '#A8721A', cursor: 'pointer', background: 'rgba(200,146,42,0.04)' }}>{d.label.split(' ')[0]}</span>
          ))}
        </div>
        <NextUpBanner label="Browse all organisations" sub="247 orgs · 43 countries · 7 domains · Preview" href="/nextus/actors" />
        <div style={{ marginTop: '10px' }}>
          <Link to="/nextus/map" style={{ display: 'block', textAlign: 'center', padding: '10px', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '8px', ...sc, fontSize: '11px', letterSpacing: '0.1em', color: '#A8721A', textDecoration: 'none', background: 'rgba(200,146,42,0.03)' }}>
            Open geo map →
          </Link>
        </div>
      </div>
    )
  }

  // Default: overview
  return (
    <div>
      <Eyebrow>Civilisational domain health</Eyebrow>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', marginBottom: '14px' }}>
        {CIVILISATIONAL_DOMAINS.map(d => (
          <div key={d.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '8px 3px', background: d.alert ? 'rgba(138,48,48,0.04)' : 'rgba(200,146,42,0.03)', border: `1px solid ${d.alert ? 'rgba(138,48,48,0.25)' : 'rgba(200,146,42,0.12)'}`, borderRadius: '6px', cursor: 'pointer' }}>
            <div style={{ ...sc, fontSize: '7px', color: 'rgba(15,21,35,0.45)', textAlign: 'center', lineHeight: 1.3 }}>{d.label.split(' ').slice(0, 2).join('\n')}</div>
            <div style={{ ...body, fontSize: '14px', fontWeight: 300, color: d.alert ? '#8A3030' : d.score >= 7 ? '#A8721A' : '#8A7030' }}>{d.score}</div>
          </div>
        ))}
      </div>

      {/* Gap signals */}
      <Eyebrow>Active gap signals</Eyebrow>
      {CIVILISATIONAL_DOMAINS.filter(d => d.alert).map(d => (
        <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'rgba(138,48,48,0.03)', border: '1px solid rgba(138,48,48,0.18)', borderRadius: '6px', marginBottom: '6px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8A3030', flexShrink: 0 }} />
          <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.08em', color: '#8A3030' }}>Gap Signal</div>
          <div style={{ ...body, fontSize: '11px', color: 'rgba(15,21,35,0.6)', flex: 1 }}>{d.label}</div>
        </div>
      ))}

      <Rule />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div style={{ padding: '10px 12px', background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.12)', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ ...body, fontSize: '22px', fontWeight: 300, color: '#A8721A' }}>247</div>
          <div style={{ ...sc, fontSize: '9px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.45)' }}>orgs · 43 countries</div>
        </div>
        <div style={{ padding: '10px 12px', background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.12)', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ ...sc, fontSize: '13px', fontWeight: 500, color: '#A8721A' }}>{domain ?? '–'}</div>
          <div style={{ ...sc, fontSize: '9px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.45)' }}>your domain</div>
        </div>
      </div>
    </div>
  )
}

// ── Work zone ─────────────────────────────────────────────────

function WorkView({ purposeData, userId, claimedActor, activeView }) {
  const archetype = purposeData?.session?.tentative?.archetype?.archetype
  const domain    = purposeData?.session?.tentative?.domain?.domain
  const scale     = purposeData?.session?.tentative?.scale?.scale
  const statement = purposeData?.profile?.civilisational_statement

  const [offers, setOffers] = useState([])

  useEffect(() => {
    if (!userId) return
    supabase.from('nextus_contributor_offers').select('*').eq('user_id', userId).eq('is_active', true).then(({ data }) => setOffers(data || []))
  }, [userId])

  if (activeView === 'orgs') {
    return (
      <div>
        <Eyebrow>Organisations I contribute to</Eyebrow>
        {claimedActor ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '8px', marginBottom: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#A8721A', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.08em', color: '#0F1523', fontWeight: 500 }}>{claimedActor.name}</div>
            </div>
            <Link to={`/nextus/actors/${claimedActor.id}`} style={{ ...sc, fontSize: '10px', color: '#A8721A', textDecoration: 'none' }}>View →</Link>
          </div>
        ) : (
          <NextUpBanner label="Find orgs to contribute to" sub="Browse by domain, scale, and horizon goal" href="/nextus/actors" />
        )}
      </div>
    )
  }

  if (activeView === 'offering') {
    return (
      <div>
        <Eyebrow>What I'm offering</Eyebrow>
        {offers.length === 0 ? (
          <NextUpBanner label="Add your first offer" sub="Skills, time, capital — what you put on the table" href={`/nextus/contributors/${userId}`} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {offers.map(o => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.15)', borderRadius: '6px' }}>
                <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.1em', color: '#5A8AB8', background: 'rgba(90,138,184,0.08)', border: '1px solid rgba(90,138,184,0.25)', borderRadius: '20px', padding: '2px 7px' }}>{o.offer_type}</span>
                <span style={{ ...body, fontSize: '12px', color: '#0F1523', flex: 1 }}>{o.title}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: '10px' }}>
          <Link to={`/nextus/contributors/${userId}`} style={{ ...sc, fontSize: '11px', letterSpacing: '0.1em', color: '#A8721A', textDecoration: 'none' }}>Manage offers →</Link>
        </div>
      </div>
    )
  }

  // Default: overview
  return (
    <div>
      {statement && (
        <div style={{ padding: '12px 14px', border: '1px solid rgba(200,146,42,0.3)', borderLeft: '3px solid rgba(200,146,42,0.55)', borderRadius: '4px 8px 8px 4px', background: 'rgba(200,146,42,0.03)', marginBottom: '14px' }}>
          <Eyebrow>Civilisational statement</Eyebrow>
          <p style={{ ...body, fontSize: '13px', fontWeight: 300, color: '#0F1523', lineHeight: 1.7, margin: 0 }}>{statement}</p>
        </div>
      )}

      {(archetype || domain || scale) ? (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {[archetype, domain, scale].filter(Boolean).map((v, i) => (
            <Badge key={i} variant="gold">{v}</Badge>
          ))}
        </div>
      ) : (
        <div style={{ marginBottom: '14px' }}>
          <NextUpBanner label="Complete Purpose Piece" sub="Surfaces your archetype, domain, and scale" href="/tools/purpose-piece" />
        </div>
      )}

      <Rule />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
        {[
          [claimedActor ? '1' : '0', 'organisations'],
          [offers.length.toString(), 'active offers'],
          ['–', 'open needs'],
        ].map(([num, label]) => (
          <div key={label} style={{ padding: '10px', background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.12)', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ ...body, fontSize: '20px', fontWeight: 300, color: '#A8721A' }}>{num}</div>
            <div style={{ ...sc, fontSize: '9px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.45)' }}>{label}</div>
          </div>
        ))}
      </div>

      <Link to={`/nextus/contributors/${userId}`} style={{ display: 'block', textAlign: 'center', padding: '9px', border: '1px solid rgba(200,146,42,0.2)', borderRadius: '8px', ...sc, fontSize: '11px', letterSpacing: '0.1em', color: '#A8721A', textDecoration: 'none', background: 'rgba(200,146,42,0.03)' }}>
        View contributor profile →
      </Link>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────

const ZONES = ['you', 'work', 'practitioners', 'planet']

// ── SupportView ───────────────────────────────────────────────
function SupportView({ user }) {
  const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
  const body = { fontFamily: "'Lora', Georgia, serif" }

  const SUBJECTS = [
    'Question about the platform',
    'Something is broken',
    'I don\'t understand something',
    'Feedback or suggestion',
    'Other',
  ]

  const [subject,   setSubject]   = useState(SUBJECTS[0])
  const [message,   setMessage]   = useState('')
  const [sending,   setSending]   = useState(false)
  const [sent,      setSent]      = useState(false)
  const [error,     setError]     = useState('')

  const email = user?.email || ''
  const name  = user?.user_metadata?.full_name || user?.user_metadata?.name || ''

  async function handleSubmit() {
    if (!message.trim()) { setError('Please write a message before sending.'); return }
    setSending(true); setError('')
    try {
      const res = await fetch(ROUTES.api.contact, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send.')
      setSent(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    }
    setSending(false)
  }

  if (sent) {
    return (
      <div style={{ maxWidth: '480px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(200,146,42,0.08)', border: '1.5px solid rgba(200,146,42,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', fontSize: '18px' }}>✦</div>
        <div style={{ ...sc, fontSize: '18px', color: '#0F1523', marginBottom: '8px' }}>Sent.</div>
        <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.6)', lineHeight: 1.7, marginBottom: '20px' }}>
          Your message is with the team. You'll hear back from support@nextus.world.
        </p>
        <button
          onClick={() => { setSent(false); setMessage(''); setSubject(SUBJECTS[0]) }}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: '#A8721A', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          Send another →
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '520px' }}>
      <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: '#A8721A', marginBottom: '4px', textTransform: 'uppercase' }}>Support</div>
      <div style={{ ...sc, fontSize: '19px', color: '#0F1523', marginBottom: '6px' }}>Get in touch.</div>
      <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.7, marginBottom: '28px' }}>
        Questions, something broken, something unclear — someone from the team will get back to you.
      </p>

      {/* Subject */}
      <div style={{ marginBottom: '14px' }}>
        <label style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.55)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Subject</label>
        <select
          value={subject}
          onChange={e => setSubject(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px',
            border: '1.5px solid rgba(200,146,42,0.45)',
            borderRadius: '40px', background: '#FFFFFF',
            ...body, fontSize: '14px', color: '#0F1523',
            outline: 'none', cursor: 'pointer',
            appearance: 'none',
          }}
        >
          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Message */}
      <div style={{ marginBottom: '6px' }}>
        <label style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.55)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Message</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="What's on your mind?"
          rows={5}
          style={{
            width: '100%', padding: '12px 14px',
            border: '1.5px solid rgba(200,146,42,0.45)',
            borderRadius: '14px', background: '#FFFFFF',
            ...body, fontSize: '15px', color: '#0F1523',
            outline: 'none', resize: 'vertical', boxSizing: 'border-box',
            lineHeight: 1.65,
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(200,146,42,0.78)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(200,146,42,0.45)' }}
        />
      </div>

      <p style={{ ...body, fontSize: '12px', color: 'rgba(15,21,35,0.4)', marginBottom: '18px' }}>
        We'll reply to {email}
      </p>

      {error && (
        <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.72)', marginBottom: '12px', padding: '10px 14px', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.35)', borderRadius: '8px' }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <button
          onClick={handleSubmit}
          disabled={sending}
          style={{
            padding: '11px 24px', borderRadius: '40px',
            border: '1px solid rgba(168,114,26,0.8)',
            background: '#C8922A', color: '#FFFFFF',
            ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.14em',
            cursor: sending ? 'default' : 'pointer',
            opacity: sending ? 0.6 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {sending ? 'Sending…' : 'Send →'}
        </button>
        <a
          href="/faq"
          style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.45)', textDecoration: 'none', borderBottom: '1px solid rgba(15,21,35,0.15)' }}
        >
          Browse the FAQ
        </a>
      </div>
    </div>
  )
}

const RAIL_ITEMS = {
  you:           [{ id: 'overview', label: 'Overview' }, { id: 'hs', label: 'Horizon State' }, { id: 'map', label: 'The Map' }, { id: 'sprint', label: 'Target Sprint' }, { id: 'practice', label: 'Horizon Practice' }, { id: 'purpose', label: 'Purpose Piece' }],
  work:          [{ id: 'overview', label: 'Overview' }, { id: 'orgs', label: 'Organisations' }, { id: 'offering', label: 'What I Offer' }, { id: 'needs', label: 'Where I\'m Needed' }],
  practitioners: [{ id: 'matched', label: 'Matched for You' }, { id: 'active', label: 'Active Methods' }, { id: 'browse', label: 'Browse All' }],
  planet:        [{ id: 'overview', label: 'Overview' }, { id: 'domains', label: 'Seven Domains' }, { id: 'orgs', label: 'Orgs and Individuals' }, { id: 'gap', label: 'Gap Signal' }],
}

const ZONE_LABELS = { you: 'You', work: 'Your Work', practitioners: 'Practitioners', planet: 'Planet' }

export function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  // Data state
  const [mapData,        setMapData]        = useState(null)
  const [purposeData,    setPurposeData]    = useState(null)
  const [sprintData,     setSprintData]     = useState(null)
  const [foundationData, setFoundationData] = useState(null)
  const [practiceData,   setPracticeData]   = useState(null)
  const [claimedActor,   setClaimedActor]   = useState(null)
  const [horizonProfile, setHorizonProfile] = useState(null)
  const [dataLoading,    setDataLoading]    = useState(true)

  // Nav state
  const [activeZone, setActiveZone]   = useState('you')
  const [activeView, setActiveView]   = useState('overview')
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/login?redirect=/dashboard'); return }
    loadData()
  }, [user, authLoading])

  async function loadData() {
    setDataLoading(true)
    try {
      const [mapRes, ppRes, sprintRes, foundationRes, practiceRes, actorRes, horizonRes] = await Promise.all([
        supabase.from('map_results').select('id, session, completed_at, map_data, horizon_goal_user, horizon_goal_system, complete, life_ia_statement').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('purpose_piece_results').select('profile, session, completed_at, status').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('target_sprint_sessions').select('domains, domain_data, target_date, end_date_label, quarter_type, created_at, status').eq('user_id', user.id).in('status', ['started', 'active', 'complete']).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('horizon_state_summary').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('horizon_practice_sessions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('nextus_actors').select('id, name, domain_id').eq('profile_owner', user.id).maybeSingle(),
        supabase.from('horizon_profile').select('domain, current_score, horizon_score, horizon_goal, ia_statement').eq('user_id', user.id),
      ])
      if (mapRes.data)        setMapData(mapRes.data)
      if (ppRes.data) {
        // profile column may be null for older completions — fall back to session.p4Profile
        const ppData = ppRes.data
        if (!ppData.profile && ppData.session?.p4Profile) {
          ppData.profile = ppData.session.p4Profile
        }
        setPurposeData(ppData)
      }
      if (sprintRes.data)     setSprintData(sprintRes.data)
      if (foundationRes.data) setFoundationData(foundationRes.data)
      if (practiceRes.data)   setPracticeData(practiceRes.data)
      if (actorRes.data)      setClaimedActor(actorRes.data)
      if (horizonRes.data?.length) {
        const profile = {}
        for (const row of horizonRes.data) {
          profile[row.domain] = {
            currentScore: row.current_score,
            horizonScore: row.horizon_score,
            horizonGoal: row.horizon_goal,
            iaStatement: row.ia_statement,
          }
        }
        setHorizonProfile(profile)
      }
    } catch (e) { console.error(e) }
    setDataLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  // Build scores from all sources
  const currentScores = {}, horizonScores = {}
  const localRaw = typeof window !== 'undefined' ? localStorage.getItem('nextus_themap_v4') : null
  if (localRaw) {
    try {
      const ld = JSON.parse(localRaw)?.domainData ?? {}
      DOMAIN_KEYS.forEach(k => {
        if (ld[k]?.currentScore != null) currentScores[k] = ld[k].currentScore
        if (ld[k]?.horizonScore != null) horizonScores[k] = ld[k].horizonScore
      })
    } catch {}
  }
  if (mapData?.session?.domainData) {
    const dd = mapData.session.domainData
    DOMAIN_KEYS.forEach(k => {
      if (dd[k]?.currentScore != null) currentScores[k] = dd[k].currentScore
      if (dd[k]?.horizonScore != null) horizonScores[k] = dd[k].horizonScore
    })
  }
  if (horizonProfile) {
    DOMAIN_KEYS.forEach(k => {
      if (horizonProfile[k]?.currentScore != null) currentScores[k] = horizonProfile[k].currentScore
      if (horizonProfile[k]?.horizonScore != null) horizonScores[k] = horizonProfile[k].horizonScore
    })
  }

  const hasScores    = Object.keys(currentScores).length > 0
  const name         = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You'
  const initials     = name.charAt(0).toUpperCase()
  const isFounder    = user?.user_metadata?.role === 'founder'
  const archetype    = purposeData?.session?.tentative?.archetype?.archetype
  const domain       = purposeData?.session?.tentative?.domain?.domain
  const scale        = purposeData?.session?.tentative?.scale?.scale

  // Tool pip status
  function toolStatus(key) {
    if (key === 'hs')      return foundationData ? 'on' : 'off'
    if (key === 'map')     return mapData?.complete ? 'done' : hasScores ? 'on' : 'off'
    if (key === 'sprint')  return sprintData?.domains?.length ? (sprintData.status === 'complete' ? 'done' : 'on') : 'off'
    if (key === 'practice') return practiceData ? 'on' : 'off'
    if (key === 'purpose') return purposeData?.status === 'complete' ? 'done' : purposeData ? 'on' : 'off'
    return 'off'
  }

  function pipColor(status) {
    if (status === 'done') return '#2D6A4F'
    if (status === 'on')   return '#A8721A'
    return 'rgba(200,146,42,0.25)'
  }

  if (authLoading || dataLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAFAF7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A' }}>Loading…</div>
      </div>
    )
  }

  if (!user) return null

  const mainContent = () => {
    if (showProfile) return <ProfileView user={user} onSignOut={signOut} />

    if (activeZone === 'you') {
      if (activeView === 'overview') {
        // ── Daily focus signal ──────────────────────────────────────
        // Derive the single most important thing right now
        const todayStr = new Date().toISOString().slice(0, 10)
        const practicedToday = foundationData?.last_session_at?.slice(0, 10) === todayStr

        let focusLabel = null, focusSub = null, focusHref = '/tools/horizon-state', focusUrgent = false
        if (!practicedToday) {
          focusLabel = 'Start with Horizon State'
          focusSub   = 'Ground first — everything else follows'
          focusHref  = '/tools/horizon-state'
        } else if (sprintData?.domains?.length) {
          const dd = sprintData.domain_data ?? {}
          for (const id of sprintData.domains) {
            const d = dd[id] ?? {}
            const tasks = d.tasks ?? []
            const checked = d.taskChecked ?? {}
            const first = tasks.find((_, i) => !checked[i])
            if (first) {
              const idx = DOMAIN_KEYS.indexOf(id)
              const lbl = idx >= 0 ? DOMAIN_LABELS[idx] : id
              const text = typeof first === 'string' ? first : first.text || first.label || ''
              focusLabel = text
              focusSub   = `Sprint · ${lbl}`
              focusHref  = '/tools/target-sprint'
              // Check days remaining
              if (sprintData.target_date) {
                const days = Math.ceil((new Date(sprintData.target_date) - new Date()) / 86400000)
                if (days <= 7) focusUrgent = true
              }
              break
            }
          }
        } else if (!hasScores) {
          focusLabel = 'Begin The Map'
          focusSub   = '7 domains · honest read of where you are'
          focusHref  = '/tools/map'
        }

        // ── Map staleness signal ────────────────────────────────────
        let mapStaleness = null
        if (mapData?.completed_at) {
          const daysSinceMap = Math.floor((Date.now() - new Date(mapData.completed_at)) / 86400000)
          if (daysSinceMap > 60)       mapStaleness = `${daysSinceMap}d ago — consider rescoring`
          else if (daysSinceMap > 30)  mapStaleness = `${daysSinceMap}d ago`
          else                          mapStaleness = new Date(mapData.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        }

        // ── Sprint health ───────────────────────────────────────────
        let sprintHealth = null
        if (sprintData?.target_date && sprintData?.domains?.length) {
          const daysLeft = Math.ceil((new Date(sprintData.target_date) - new Date()) / 86400000)
          const totalDays = sprintData.created_at
            ? Math.ceil((new Date(sprintData.target_date) - new Date(sprintData.created_at)) / 86400000)
            : 90
          const timeElapsedPct = totalDays > 0 ? ((totalDays - daysLeft) / totalDays) * 100 : 0
          const dd = sprintData.domain_data ?? {}
          let totalTasks = 0, doneTasks = 0
          sprintData.domains.forEach(id => {
            const d = dd[id] ?? {}
            totalTasks += (d.tasks ?? []).length
            doneTasks  += Object.values(d.taskChecked ?? {}).filter(Boolean).length
          })
          const taskPct = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0
          const lag = timeElapsedPct - taskPct
          if (daysLeft < 0)        sprintHealth = { label: 'Overdue', color: '#8A3030' }
          else if (lag > 20)       sprintHealth = { label: 'At risk', color: '#8A7030' }
          else if (lag > 10)       sprintHealth = { label: 'Slightly behind', color: '#A8721A' }
          else                     sprintHealth = { label: 'On track', color: '#2D6A4F' }
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Daily focus signal */}
            {focusLabel && (
              <a href={focusHref} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px',
                background: focusUrgent ? 'rgba(138,48,48,0.05)' : 'rgba(200,146,42,0.06)',
                border: `1px solid ${focusUrgent ? 'rgba(138,48,48,0.35)' : 'rgba(200,146,42,0.55)'}`,
                borderRadius: '8px', textDecoration: 'none',
              }}>
                <div>
                  <div style={{ ...sc, fontSize: '9px', letterSpacing: '0.16em', color: focusUrgent ? '#8A3030' : '#A8721A', marginBottom: '2px' }}>
                    FOCUS NOW
                  </div>
                  <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.06em', color: '#0F1523', fontWeight: 500 }}>{focusLabel}</div>
                  {focusSub && <div style={{ ...body, fontSize: '10px', color: 'rgba(15,21,35,0.5)', marginTop: '1px' }}>{focusSub}</div>}
                </div>
                <span style={{ color: focusUrgent ? '#8A3030' : '#A8721A', fontSize: '16px' }}>→</span>
              </a>
            )}

            {/* Three-panel grid: web · today · sprint */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', alignItems: 'start' }}>

              {/* Panel 1: Map web */}
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <Eyebrow style={{ marginBottom: 0 }}>Your map</Eyebrow>
                  {mapStaleness && (
                    <span style={{ ...body, fontSize: '9px', color: mapStaleness.includes('rescore') ? '#8A7030' : 'rgba(15,21,35,0.35)' }}>
                      {mapStaleness}
                    </span>
                  )}
                </div>
                {hasScores ? (
                  <div style={{ border: '1px solid rgba(200,146,42,0.15)', borderRadius: '8px', padding: '8px', background: 'rgba(200,146,42,0.02)' }}>
                    <HorizonWheelMini
                      currentScores={currentScores}
                      horizonScores={horizonScores}
                      size={160}
                    />
                    {Object.values(horizonScores).some(v => v > 0) && (
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{ width: '16px', height: '2px', background: 'rgba(200,146,42,0.55)' }} />
                          <span style={{ ...sc, fontSize: '8px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.45)' }}>Now</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{ width: '16px', height: '0', borderTop: '2px dashed #C8922A' }} />
                          <span style={{ ...sc, fontSize: '8px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.45)' }}>Horizon</span>
                        </div>
                      </div>
                    )}
                    {mapData?.horizon_goal_user && (
                      <p style={{ ...body, fontSize: '11px', fontStyle: 'italic', color: '#A8721A', lineHeight: 1.6, margin: '10px 4px 4px', textAlign: 'center' }}>
                        "{mapData.horizon_goal_user}"
                      </p>
                    )}
                    <a href="/tools/map" style={{ display: 'block', textAlign: 'center', marginTop: '8px', ...sc, fontSize: '10px', letterSpacing: '0.1em', color: '#A8721A', textDecoration: 'none' }}>
                      Rescore →
                    </a>
                  </div>
                ) : (
                  <NextUpBanner label="Begin The Map" sub="7 domains · 10–20 min" href="/tools/map" />
                )}
              </div>

              {/* Panel 2: Today */}
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <Eyebrow style={{ marginBottom: 0 }}>Today</Eyebrow>
                  <span style={{ ...body, fontSize: '9px', color: 'rgba(15,21,35,0.35)' }}>
                    {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <HorizonStatePanel foundationData={foundationData} />
                  <PracticeCard practiceData={practiceData} />
                </div>
              </div>

              {/* Panel 3: Sprint */}
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <Eyebrow style={{ marginBottom: 0 }}>Active sprint</Eyebrow>
                  {sprintHealth && (
                    <span style={{ ...sc, fontSize: '9px', letterSpacing: '0.1em', color: sprintHealth.color }}>
                      {sprintHealth.label}
                    </span>
                  )}
                </div>
                <SprintCard sprintData={sprintData} />
              </div>

            </div>

            {/* Next unlock */}
            {!purposeData && (
              <NextUpBanner label="Next unlock: Purpose Piece" sub="20 min · surfaces your archetype, domain, and scale" href="/tools/purpose-piece" />
            )}

          </div>
        )
      }

      if (activeView === 'hs')       return <HorizonStatePanel foundationData={foundationData} />
      if (activeView === 'map')      return (
        <MapIAmView
          horizonProfile={horizonProfile}
          hasScores={hasScores}
          currentScores={currentScores}
          horizonScores={horizonScores}
          domainData={mapData?.session?.domainData || {}}
          userId={user?.id}
          purposeData={purposeData}
          supabase={supabase}
          lifeHorizon={mapData?.horizon_goal_user || mapData?.map_data?.life_horizon_draft || null}
          lifeIaStatement={mapData?.life_ia_statement || null}
          mapResultId={mapData?.id || null}
        />
      )
      if (activeView === 'sprint')   return (
        <div>
          <Eyebrow>Target Sprint</Eyebrow>
          <SprintCard sprintData={sprintData} />
        </div>
      )
      if (activeView === 'practice') return (
        <div>
          <Eyebrow>Horizon Practice</Eyebrow>
          <PracticeCard practiceData={practiceData} />
        </div>
      )
      if (activeView === 'purpose')  return (
        <div>
          <Eyebrow>Purpose Piece</Eyebrow>
          {(purposeData?.status === 'complete' || (purposeData && (archetype || domain))) ? (
            <div>
              {purposeData.profile?.civilisational_statement ? (
                <p style={{ ...body, fontSize: '15px', fontStyle: 'italic', color: '#0F1523', lineHeight: 1.75, marginBottom: '14px' }}>{purposeData.profile.civilisational_statement}</p>
              ) : (purposeData?.session?.tentative?.archetype?.archetype) ? (
                <p style={{ ...body, fontSize: '15px', fontStyle: 'italic', color: 'rgba(15,21,35,0.55)', lineHeight: 1.75, marginBottom: '14px' }}>
                  {purposeData.session.tentative.archetype.archetype}
                  {purposeData.session.tentative.domain?.domain ? ` · ${purposeData.session.tentative.domain.domain}` : ''}
                  {purposeData.session.tentative.scale?.scale ? ` · ${purposeData.session.tentative.scale.scale}` : ''}
                </p>
              ) : null}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {[archetype, domain, scale].filter(Boolean).map((v, i) => <Badge key={i} variant="gold">{v}</Badge>)}
              </div>
              <Link to="/tools/purpose-piece" style={{ ...sc, fontSize: '11px', letterSpacing: '0.1em', color: '#A8721A', textDecoration: 'none' }}>Revisit →</Link>
            </div>
          ) : (
            <NextUpBanner label="Begin Purpose Piece" sub="20 min · one-time · unlocks Your Work profile" href="/tools/purpose-piece" />
          )}
        </div>
      )
      if (activeView === 'support')  return <SupportView user={user} />
    }

    if (activeZone === 'work')          return <WorkView purposeData={purposeData} userId={user?.id} claimedActor={claimedActor} activeView={activeView} />
    if (activeZone === 'practitioners') return <PractitionersView purposeData={purposeData} />
    if (activeZone === 'planet')        return <PlanetView purposeData={purposeData} activeView={activeView} />

    return null
  }

  // ── Styles ──────────────────────────────────────────────────

  const s = {
    wrap: {
      background: '#FAFAF7',
      minHeight: '100vh',
    },
    shell: {
      maxWidth: '1100px',
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: '200px 1fr',
      gridTemplateRows: '48px 1fr',
      height: 'calc(100vh - 60px)',
      border: '1px solid rgba(200,146,42,0.18)',
      borderRadius: '12px',
      overflow: 'hidden',
      background: '#FFFFFF',
    },
    topbar: {
      gridColumn: '1 / -1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      borderBottom: '1px solid rgba(200,146,42,0.12)',
      background: 'rgba(200,146,42,0.02)',
    },
    rail: {
      borderRight: '1px solid rgba(200,146,42,0.12)',
      background: 'rgba(200,146,42,0.02)',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
    },
    main: {
      overflowY: 'auto',
      padding: '20px 22px',
    },
  }

  return (
    <div style={s.wrap}>
      <Nav activePath="profile" />
      <div style={{ padding: '8px 16px 80px', maxWidth: '1116px', margin: '0 auto' }}>
        <div style={s.shell}>

          {/* TOP BAR */}
          <div style={s.topbar}>
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: '#0F1523', fontWeight: 500 }}>
              Next<span style={{ color: '#A8721A' }}>Us</span>
              <span style={{ color: 'rgba(200,146,42,0.4)', margin: '0 8px' }}>·</span>
              <span style={{ color: 'rgba(15,21,35,0.55)' }}>Mission Control</span>
            </div>

            {/* Zone pills */}
            <div style={{ display: 'flex', gap: '3px' }}>
              {ZONES.map(z => (
                <button
                  key={z}
                  onClick={() => { setActiveZone(z); setActiveView(RAIL_ITEMS[z][0].id); setShowProfile(false) }}
                  style={{
                    ...sc, fontSize: '11px', letterSpacing: '0.1em', padding: '3px 10px',
                    borderRadius: '20px', border: `1px solid ${activeZone === z && !showProfile ? 'rgba(200,146,42,0.5)' : 'transparent'}`,
                    background: activeZone === z && !showProfile ? 'rgba(200,146,42,0.08)' : 'transparent',
                    color: activeZone === z && !showProfile ? '#A8721A' : 'rgba(15,21,35,0.5)',
                    cursor: 'pointer', transition: 'all 0.12s',
                  }}
                >
                  {ZONE_LABELS[z]}
                </button>
              ))}
            </div>

            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{ ...sc, fontSize: '11px', color: 'rgba(15,21,35,0.72)', userSelect: 'none', cursor: 'default' }}
                onClick={isFounder ? (() => {
                  const now = Date.now()
                  if (!window._adminClicks) window._adminClicks = []
                  window._adminClicks.push(now)
                  window._adminClicks = window._adminClicks.filter(t => now - t < 800)
                  if (window._adminClicks.length >= 3) { window._adminClicks = []; navigate('/admin') }
                }) : undefined}
              >{name}</span>
              <button
                onClick={() => setShowProfile(o => !o)}
                style={{
                  width: '26px', height: '26px', borderRadius: '50%',
                  background: showProfile ? '#A8721A' : 'rgba(200,146,42,0.15)',
                  border: `1.5px solid ${showProfile ? '#A8721A' : 'rgba(200,146,42,0.4)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', ...sc, fontSize: '11px',
                  color: showProfile ? '#FFFFFF' : '#A8721A', fontWeight: 500,
                  transition: 'all 0.15s',
                }}
              >
                {initials}
              </button>
            </div>
          </div>

          {/* RAIL */}
          <div style={s.rail}>
            {/* Zone items */}
            <div style={{ padding: '10px 0 4px', flex: 1 }}>
              <div
                style={{ ...sc, fontSize: '9px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.35)', textTransform: 'uppercase', padding: '0 14px 5px', cursor: isFounder && activeZone === 'you' ? 'default' : 'default' }}
                onClick={isFounder && activeZone === 'you' ? (() => navigate('/admin')) : undefined}
              >
                {activeZone === 'you' ? name : ZONE_LABELS[activeZone]}
              </div>
              {RAIL_ITEMS[activeZone].map(item => {
                const isActive = !showProfile && activeView === item.id
                const pipSt = activeZone === 'you' ? toolStatus(item.id) : item.id === 'overview' ? 'on' : 'off'
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveView(item.id); setShowProfile(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '6px 14px', width: '100%', textAlign: 'left',
                      background: isActive ? 'rgba(200,146,42,0.06)' : 'transparent',
                      border: 'none', borderLeft: `2px solid ${isActive ? '#A8721A' : 'transparent'}`,
                      cursor: 'pointer',
                      ...sc, fontSize: '12px', letterSpacing: '0.06em',
                      color: isActive ? '#A8721A' : 'rgba(15,21,35,0.55)',
                      fontWeight: isActive ? 500 : 400,
                      transition: 'all 0.1s',
                    }}
                  >
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: pipColor(pipSt), flexShrink: 0 }} />
                    {item.label}
                  </button>
                )
              })}
            </div>

            {/* Profile anchor */}
            <button
              onClick={() => setShowProfile(o => !o)}
              style={{
                borderTop: '1px solid rgba(200,146,42,0.1)', padding: '12px 14px',
                background: showProfile ? 'rgba(200,146,42,0.06)' : 'transparent',
                cursor: 'pointer', textAlign: 'left', border: 'none',
                width: '100%', transition: 'background 0.1s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: showProfile ? '#A8721A' : 'rgba(200,146,42,0.15)', border: `1.5px solid ${showProfile ? '#A8721A' : 'rgba(200,146,42,0.4)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...sc, fontSize: '12px', color: showProfile ? '#FFFFFF' : '#A8721A', fontWeight: 500 }}>
                  {initials}
                </div>
                <div>
                  <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.06em', color: '#0F1523', fontWeight: 500 }}>{name}</div>
                </div>
              </div>
              {(archetype || domain) && (
                <div style={{ ...body, fontSize: '10px', color: 'rgba(15,21,35,0.4)', paddingLeft: '36px' }}>
                  {[archetype, domain, scale].filter(Boolean).join(' · ')}
                </div>
              )}
              <div style={{ paddingLeft: '36px', marginTop: '6px', display: 'flex', gap: '12px' }}>
                <span
                  onClick={e => { e.stopPropagation(); setActiveView('support'); setShowProfile(false) }}
                  style={{ ...sc, fontSize: '10px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.38)', cursor: 'pointer', borderBottom: '1px solid rgba(15,21,35,0.15)', paddingBottom: '1px' }}
                >
                  Support
                </span>
                <a
                  href="/faq"
                  onClick={e => e.stopPropagation()}
                  style={{ ...sc, fontSize: '10px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.38)', textDecoration: 'none', borderBottom: '1px solid rgba(15,21,35,0.15)', paddingBottom: '1px' }}
                >
                  FAQ
                </a>
              </div>
            </button>
          </div>

          {/* MAIN */}
          <div style={s.main}>
            {mainContent()}
          </div>

        </div>
      </div>
    </div>
  )
}
