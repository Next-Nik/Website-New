// ────────────────────────────────────────────────────────────────────────────
// Horizon Practice — the live tool.
//
// Expresses Horizon Practice Living Architecture v1.3:
//   - The morning is five beats: Commit · Ground · Plan · Anchor · Act
//   - In-moment operation: the Horizon Self Refresh (3 screens, no jargon)
//   - Four in-moment paths: Hit, Drift (flags) · Listening-Glow, Receipt (capture)
//   - Capture-only Listening-Glow and Receipt (never prompted)
//   - LCARS-style audio confirmations on every rep
//
// Reads from:
//   horizon_profile        — per-domain ia_statement (the seven voicings)
//   map_results            — life_ia_statement (synthesised Horizon Self)
//
// Writes to:
//   horizon_practice_morning_runs   (one row per morning)
//   horizon_practice_entries        (Hit / Drift / Listening-Glow / Receipt)
//   horizon_practice_thresholds     (today's named thresholds, crossings)
//
// See sql/063_horizon_practice_v2.sql for the schema.
// ────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { useAccess } from '../../hooks/useAccess'
import { supabase } from '../../hooks/useSupabase'

// ─── Design tokens ──────────────────────────────────────────────────────────
const tokens = {
  bg: '#FAFAF7',
  bgCard: '#FFFFFF',
  dark: '#0F1523',
  gold: '#A8721A',
  goldChrome: '#C8922A',
  goldFaint: 'rgba(200,146,42,0.20)',
  goldTint: 'rgba(200,146,42,0.05)',
  goldGlow: 'rgba(200,146,42,0.10)',
  goldStrong: 'rgba(200,146,42,0.35)',
  meta: 'rgba(15,21,35,0.88)',
  ghost: 'rgba(15,21,35,0.55)',
  whisper: 'rgba(15,21,35,0.30)',
}
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const body  = { fontFamily: "'Lora', Georgia, serif" }

// ─── Domain order (locked NextUs vocabulary) ────────────────────────────────
const DOMAIN_ORDER = ['path', 'spark', 'body', 'finances', 'connection', 'inner_game', 'signal']
const DOMAIN_LABELS = {
  path: 'Path', spark: 'Spark', body: 'Body', finances: 'Finances',
  connection: 'Connection', inner_game: 'Inner Game', signal: 'Signal',
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function getLocalDateStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening'
}

function extractIamLine(text) {
  if (!text) return ''
  // Take everything up to and including the first sentence-ending punctuation
  const match = text.match(/^(.+?[.!?])(\s|$)/)
  if (match) return match[1].trim()
  // Fallback: hard cap at 120 chars on a word boundary
  if (text.length <= 120) return text.trim()
  const cut = text.slice(0, 120).replace(/\s+\S+$/, '')
  return cut.trim() + '…'
}

function relativeDate(iso) {
  if (!iso) return ''
  const then = new Date(iso)
  const now = new Date()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)
  const diffD = Math.floor(diffMs / 86400000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffH < 24) return `${diffH}h ago`
  if (diffD === 1) return 'yesterday'
  if (diffD < 7) return `${diffD}d ago`
  if (diffD < 30) return `${Math.floor(diffD/7)}w ago`
  return then.toLocaleDateString()
}

// ────────────────────────────────────────────────────────────────────────────
// CHIMES — LCARS-clean. Web Audio API, programmatic, no external files.
// Settings persist in localStorage.
// ────────────────────────────────────────────────────────────────────────────
const Chimes = (function() {
  let ctx = null
  let enabled = true
  let volume = 0.6
  // Hydrate from localStorage if available
  try {
    const stored = JSON.parse(localStorage.getItem('hp_chimes') || '{}')
    if (typeof stored.enabled === 'boolean') enabled = stored.enabled
    if (typeof stored.volume === 'number') volume = stored.volume
  } catch (e) { /* localStorage unavailable */ }

  function persist() {
    try { localStorage.setItem('hp_chimes', JSON.stringify({ enabled, volume })) } catch (e) {}
  }

  function getCtx() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)() }
      catch(e) { return null }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume()
    return ctx
  }

  function tone(freq, duration = 0.3, peakGain = 0.14) {
    const c = getCtx()
    if (!c || !enabled) return
    const now = c.currentTime
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    const oct = c.createOscillator()
    oct.type = 'sine'
    oct.frequency.value = freq * 2
    const octGain = c.createGain()
    octGain.gain.value = 0.18
    const master = c.createGain()
    master.gain.setValueAtTime(0, now)
    master.gain.linearRampToValueAtTime(peakGain * volume, now + 0.008)
    master.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    osc.connect(master)
    oct.connect(octGain); octGain.connect(master)
    master.connect(c.destination)
    osc.start(now); oct.start(now)
    osc.stop(now + duration); oct.stop(now + duration)
  }

  return {
    iamVoiced:       () => tone(523.25, 0.30, 0.13),
    horizonSelf:     () => tone(440, 0.50, 0.15),
    morningComplete: () => {
      tone(523.25, 0.18, 0.12)
      setTimeout(() => tone(659.25, 0.18, 0.12), 100)
      setTimeout(() => tone(880, 0.32, 0.14), 200)
    },
    hit:    () => tone(659.25, 0.20, 0.13),
    drift:  () => tone(196, 0.20, 0.10),
    backIn: () => {
      tone(440, 0.15, 0.12)
      setTimeout(() => tone(659.25, 0.28, 0.14), 150)
    },
    cross:  () => {
      tone(440, 0.15, 0.12)
      setTimeout(() => tone(987.77, 0.32, 0.14), 150)
    },
    archive: () => {
      tone(392, 0.18, 0.11)
      setTimeout(() => tone(523.25, 0.28, 0.13), 250)
    },
    setEnabled: (b) => { enabled = b; persist() },
    setVolume:  (v) => { volume = Math.max(0, Math.min(1, v)); persist() },
    getEnabled: () => enabled,
    getVolume:  () => volume,
  }
})()

// ─── Visual feedback ────────────────────────────────────────────────────────
function useRipple() {
  return useCallback((e) => {
    const btn = e.currentTarget
    if (!btn || !btn.getBoundingClientRect) return
    const rect = btn.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2
    const el = document.createElement('span')
    el.style.cssText = `
      position: absolute; border-radius: 50%; pointer-events: none;
      background: radial-gradient(circle, ${tokens.goldChrome} 0%, transparent 70%);
      width: ${size}px; height: ${size}px; left: ${x}px; top: ${y}px;
      transform: scale(0.4); opacity: 0.6;
      transition: transform 0.7s ease-out, opacity 0.7s ease-out;
    `
    const prevPos = btn.style.position
    if (!prevPos || prevPos === 'static') btn.style.position = 'relative'
    btn.style.overflow = 'hidden'
    btn.appendChild(el)
    requestAnimationFrame(() => {
      el.style.transform = 'scale(2.6)'
      el.style.opacity = '0'
    })
    setTimeout(() => el.remove(), 720)
  }, [])
}

function screenFlash() {
  const el = document.createElement('div')
  el.style.cssText = `
    position: fixed; inset: 0; pointer-events: none; z-index: 9999;
    background: ${tokens.goldGlow}; opacity: 1;
    transition: opacity 0.6s ease-out;
  `
  document.body.appendChild(el)
  requestAnimationFrame(() => { el.style.opacity = '0' })
  setTimeout(() => el.remove(), 620)
}

// ────────────────────────────────────────────────────────────────────────────
// UI atoms
// ────────────────────────────────────────────────────────────────────────────
function Eyebrow({ children, color = 'gold', size = 13, style = {} }) {
  const colorVal = color === 'gold' ? tokens.gold : color === 'ghost' ? tokens.ghost : tokens.whisper
  return (
    <span style={{
      ...sc, fontSize: `${size}px`, fontWeight: 600, letterSpacing: '0.20em',
      color: colorVal, textTransform: 'uppercase', display: 'block', ...style,
    }}>{children}</span>
  )
}

function Heading({ children, size = 'lg', italic = false, color, style = {} }) {
  const sizes = {
    xl: 'clamp(34px, 4.5vw, 50px)',
    lg: 'clamp(26px, 3.2vw, 36px)',
    md: 'clamp(20px, 2.4vw, 26px)',
    sm: '19px',
  }
  return (
    <h1 style={{
      ...serif, fontSize: sizes[size], fontWeight: 300,
      color: color || tokens.dark, lineHeight: 1.15, letterSpacing: '-0.01em',
      margin: 0, fontStyle: italic ? 'italic' : 'normal', ...style,
    }}>{children}</h1>
  )
}

function Body({ children, dim = false, italic = false, style = {} }) {
  return (
    <p style={{
      ...body, fontSize: '15.5px', fontWeight: 300,
      color: dim ? tokens.ghost : tokens.meta, lineHeight: 1.7,
      fontStyle: italic ? 'italic' : 'normal', margin: '0 0 12px', ...style,
    }}>{children}</p>
  )
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: tokens.bgCard, border: `1px solid ${tokens.goldFaint}`,
      borderRadius: '14px', padding: '24px 26px', ...style,
    }}>{children}</div>
  )
}

function GhostButton({ children, onClick, style = {}, disabled = false }) {
  const ripple = useRipple()
  return (
    <button
      onClick={(e) => { if (disabled) return; ripple(e); onClick && onClick(e) }}
      disabled={disabled}
      style={{
        background: 'transparent', color: tokens.gold,
        border: `1px solid ${tokens.goldFaint}`, borderRadius: '40px',
        padding: '10px 22px', ...sc, fontSize: '13px', fontWeight: 600,
        letterSpacing: '0.18em', transition: 'all 0.2s',
        position: 'relative', overflow: 'hidden',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1, ...style,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.borderColor = tokens.goldChrome }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.borderColor = tokens.goldFaint }}
    >{children}</button>
  )
}

function SolidButton({ children, onClick, style = {}, disabled = false }) {
  const ripple = useRipple()
  return (
    <button
      onClick={(e) => { if (disabled) return; ripple(e); onClick && onClick(e) }}
      disabled={disabled}
      style={{
        background: tokens.goldChrome, color: '#FFFFFF',
        border: `1px solid ${tokens.goldChrome}`, borderRadius: '40px',
        padding: '12px 26px', ...sc, fontSize: '13px', fontWeight: 600,
        letterSpacing: '0.18em', transition: 'all 0.2s',
        position: 'relative', overflow: 'hidden',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1, ...style,
      }}
    >{children}</button>
  )
}

function ModalShell({ open, onClose, children, narrow = false }) {
  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,21,35,0.62)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: tokens.bg, borderRadius: '18px', padding: '40px 36px',
          maxWidth: narrow ? '460px' : '560px', width: '100%',
          maxHeight: '90vh', overflowY: 'auto',
          border: `1px solid ${tokens.goldFaint}`,
        }}
      >{children}</div>
    </div>
  )
}

function inputStyle() {
  return {
    width: '100%', minHeight: '80px', padding: '12px 14px',
    border: `1px solid ${tokens.goldFaint}`, borderRadius: '12px',
    background: tokens.bgCard, ...body, fontSize: '14.5px',
    color: tokens.dark, lineHeight: 1.6, resize: 'vertical', outline: 'none',
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Five-Beat Tracker
// ────────────────────────────────────────────────────────────────────────────
function FiveBeatTracker({ currentBeat, sweep = false }) {
  const beats = ['Commit', 'Ground', 'I Am', 'Anchor', 'Plan', 'Act']
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      gap: '6px', marginBottom: '32px',
    }}>
      {beats.map((name, i) => {
        const beatIdx = i + 1
        const done = beatIdx < currentBeat || sweep
        const here = beatIdx === currentBeat && !sweep
        return (
          <Fragment key={name}>
            <div style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
              <div style={{
                width: '14px', height: '14px', borderRadius: '50%',
                background: done ? tokens.goldChrome : here ? tokens.goldGlow : 'transparent',
                border: `1.5px solid ${done || here ? tokens.goldChrome : tokens.goldFaint}`,
                margin: '0 auto 8px', transition: 'all 0.4s ease',
                animation: here ? 'hp-dot-pulse 2.4s ease-in-out infinite' : 'none',
              }} />
              <span style={{
                ...sc, fontSize: '9px', fontWeight: 600, letterSpacing: '0.12em',
                color: done || here ? tokens.gold : tokens.whisper,
                textTransform: 'uppercase',
              }}>{name}</span>
            </div>
            {i < beats.length - 1 && (
              <div style={{
                flex: 0.6, height: '1px',
                background: beatIdx < currentBeat || sweep ? tokens.goldChrome : tokens.goldFaint,
                marginTop: '-18px', transition: 'background 0.4s ease',
              }} />
            )}
          </Fragment>
        )
      })}
    </div>
  )
}

// Local Fragment alias so we don't need to import it explicitly
const Fragment = ({ children }) => <>{children}</>

// ────────────────────────────────────────────────────────────────────────────
// CalendarPlanBeat — Plan beat with iCal feed integration
//
// Three states:
//   1. No iCal URL set — show setup guide (how to find iCal URL in Google /
//      Apple / Outlook) + URL input. One-time setup.
//   2. iCal URL set, loading — spinner.
//   3. iCal URL set, loaded — show today's events as tappable rows. Tapping
//      adds the event as a threshold. Manual "add a threshold" always available
//      alongside the calendar for moments not on the calendar.
// ────────────────────────────────────────────────────────────────────────────

const ICAL_SETUP_GUIDES = [
  {
    name: 'Google Calendar',
    icon: '📅',
    steps: [
      'Open Google Calendar on desktop.',
      'Hover over your calendar in the left panel, click the three-dot menu → Settings.',
      'Scroll to "Secret address in iCal format" and copy the URL.',
    ],
  },
  {
    name: 'Apple Calendar',
    icon: '🍎',
    steps: [
      'On Mac: open Calendar, right-click your calendar in the sidebar → Get Info.',
      'Copy the "Calendar URL" shown there.',
      'If you don\'t see it, go to icloud.com → Calendar → share the calendar → copy the link.',
    ],
  },
  {
    name: 'Outlook / Microsoft 365',
    icon: '📬',
    steps: [
      'Open Outlook Calendar on the web.',
      'Click the gear icon → View all settings → Calendar → Shared calendars.',
      'Under "Publish a calendar", select your calendar, set permissions to "Can view all details", and click Publish.',
      'Copy the ICS link.',
    ],
  },
]

function CalendarPlanBeat({ thresholds, onChange, icalUrl, onSaveIcalUrl, userId }) {
  // ical loading states
  const [calEvents, setCalEvents] = useState([])
  const [calLoading, setCalLoading] = useState(false)
  const [calError, setCalError] = useState(null)

  // setup states
  const [showSetup, setShowSetup] = useState(!icalUrl)
  const [urlDraft, setUrlDraft] = useState(icalUrl || '')
  const [saving, setSaving] = useState(false)
  const [activeGuide, setActiveGuide] = useState(0)

  // manual add
  const [showManual, setShowManual] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftTime, setDraftTime] = useState('')
  const [draftNote, setDraftNote] = useState('')

  // Fetch calendar events when icalUrl is available
  useEffect(() => {
    if (!icalUrl || showSetup) return
    let cancelled = false
    setCalLoading(true)
    setCalError(null)

    const today = getLocalDateStr()
    fetch('/api/ical-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ical_url: icalUrl, date: today }),
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data.error) {
          setCalError(data.hint || data.error)
        } else {
          setCalEvents(data.events || [])
        }
        setCalLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        setCalError('Could not load calendar.')
        setCalLoading(false)
      })

    return () => { cancelled = true }
  }, [icalUrl, showSetup])

  async function handleSaveUrl() {
    if (!urlDraft.trim()) return
    setSaving(true)
    await onSaveIcalUrl(urlDraft.trim())
    setShowSetup(false)
    setSaving(false)
  }

  function toggleCalendarEvent(evt) {
    const alreadyAdded = thresholds.find(t => t.source_ref === evt.id)
    if (alreadyAdded) {
      onChange(thresholds.filter(t => t.source_ref !== evt.id))
    } else {
      Chimes.hit()
      onChange([...thresholds, {
        tempId: `cal-${evt.id}`,
        title: evt.title,
        time_label: evt.time_label,
        note: evt.note || null,
        source: 'calendar',
        source_ref: evt.id,
      }])
    }
  }

  function addManual() {
    if (!draftTitle.trim()) return
    Chimes.hit()
    onChange([...thresholds, {
      tempId: `t-${Date.now()}`,
      title: draftTitle.trim(),
      time_label: draftTime.trim() || null,
      note: draftNote.trim() || null,
      source: 'manual',
    }])
    setDraftTitle(''); setDraftTime(''); setDraftNote('')
    setShowManual(false)
  }

  function removeThreshold(idx) {
    onChange(thresholds.filter((_, i) => i !== idx))
  }

  // ── Selected thresholds display (top of beat) ──
  const SelectedThresholds = () => (
    thresholds.length > 0 ? (
      <div style={{ marginBottom: '20px' }}>
        {thresholds.map((t, i) => (
          <div key={t.tempId || t.id || i} style={{
            padding: '12px 16px', marginBottom: '8px',
            background: tokens.goldTint, border: `1px solid ${tokens.goldChrome}`,
            borderRadius: '12px', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', gap: '12px',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {t.time_label && (
                <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.16em',
                  color: tokens.gold, marginBottom: '3px' }}>{t.time_label}</div>
              )}
              <div style={{ ...body, fontSize: '14.5px', color: tokens.meta, lineHeight: 1.4 }}>
                {t.title}
              </div>
              {t.note && (
                <div style={{ ...body, fontSize: '12px', fontStyle: 'italic',
                  color: tokens.ghost, marginTop: '2px', lineHeight: 1.4 }}>{t.note}</div>
              )}
            </div>
            <button onClick={() => removeThreshold(i)} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              ...sc, fontSize: '10px', letterSpacing: '0.16em',
              color: tokens.ghost, padding: '4px 8px',
            }}>✕</button>
          </div>
        ))}
      </div>
    ) : null
  )

  // ── Setup guide (first time) ──
  if (showSetup) {
    return (
      <div>
        <SelectedThresholds />

        <Card style={{ padding: '24px 26px' }}>
          <Eyebrow style={{ marginBottom: '8px', fontSize: '11px' }}>Connect your calendar</Eyebrow>
          <Body dim style={{ fontSize: '14px', margin: '0 0 20px' }}>
            Paste your private iCal URL and your calendar shows up here every morning.
            One-time setup, works with any calendar.
          </Body>

          {/* Provider guide tabs */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {ICAL_SETUP_GUIDES.map((g, i) => (
              <button key={g.name} onClick={() => setActiveGuide(i)} style={{
                padding: '6px 12px', borderRadius: '40px',
                background: activeGuide === i ? tokens.goldTint : 'transparent',
                border: `1px solid ${activeGuide === i ? tokens.goldChrome : tokens.goldFaint}`,
                ...sc, fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.14em',
                color: activeGuide === i ? tokens.gold : tokens.ghost, cursor: 'pointer',
              }}>{g.icon} {g.name}</button>
            ))}
          </div>

          {/* Steps */}
          <div style={{
            padding: '16px 18px', background: tokens.goldTint,
            borderRadius: '10px', marginBottom: '18px',
          }}>
            {ICAL_SETUP_GUIDES[activeGuide].steps.map((step, i) => (
              <div key={i} style={{
                display: 'flex', gap: '12px', marginBottom: i < ICAL_SETUP_GUIDES[activeGuide].steps.length - 1 ? '12px' : 0,
              }}>
                <span style={{
                  ...sc, fontSize: '10px', fontWeight: 600, letterSpacing: '0.18em',
                  color: tokens.gold, minWidth: '20px', paddingTop: '2px',
                }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ ...body, fontSize: '13.5px', color: tokens.meta, lineHeight: 1.5, margin: 0 }}>
                  {step}
                </span>
              </div>
            ))}
          </div>

          {/* URL input */}
          <input
            type="url"
            value={urlDraft}
            onChange={e => setUrlDraft(e.target.value)}
            placeholder="Paste your iCal URL here"
            style={{ ...inputStyle(), minHeight: 'auto', padding: '10px 14px', marginBottom: '12px' }}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveUrl() }}
          />

          <div style={{ display: 'flex', gap: '10px' }}>
            <SolidButton onClick={handleSaveUrl} disabled={!urlDraft.trim() || saving}
              style={{ flex: 2 }}>
              {saving ? 'Connecting…' : 'Connect →'}
            </SolidButton>
            <GhostButton onClick={() => setShowManual(s => !s)} style={{ flex: 1 }}>
              Skip · type manually
            </GhostButton>
          </div>
        </Card>

        {/* Manual add when skipping */}
        {showManual && <ManualThresholdAdd
          draftTitle={draftTitle} setDraftTitle={setDraftTitle}
          draftTime={draftTime} setDraftTime={setDraftTime}
          draftNote={draftNote} setDraftNote={setDraftNote}
          onAdd={addManual}
        />}
      </div>
    )
  }

  // ── Calendar view (connected) ──
  return (
    <div>
      <SelectedThresholds />

      {/* Calendar feed */}
      <div style={{
        border: `1px solid ${tokens.goldFaint}`, borderRadius: '14px',
        overflow: 'hidden', marginBottom: '14px',
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 18px', borderBottom: `1px solid ${tokens.goldFaint}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: tokens.bgCard,
        }}>
          <Eyebrow style={{ fontSize: '11px' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Eyebrow>
          <button onClick={() => setShowSetup(true)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            ...sc, fontSize: '9px', letterSpacing: '0.16em',
            color: tokens.whisper, textTransform: 'uppercase',
          }}>Change calendar</button>
        </div>

        {/* Loading */}
        {calLoading && (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <Body dim style={{ margin: 0, fontSize: '14px' }}>Loading your day…</Body>
          </div>
        )}

        {/* Error */}
        {calError && !calLoading && (
          <div style={{ padding: '20px 18px' }}>
            <Body dim style={{ margin: '0 0 10px', fontSize: '13.5px' }}>
              Couldn't load calendar: {calError}
            </Body>
            <button onClick={() => setShowSetup(true)} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              ...sc, fontSize: '11px', letterSpacing: '0.16em',
              color: tokens.gold, borderBottom: `1px solid ${tokens.goldFaint}`,
            }}>Update iCal URL</button>
          </div>
        )}

        {/* Events */}
        {!calLoading && !calError && calEvents.length === 0 && (
          <div style={{ padding: '24px 18px', textAlign: 'center' }}>
            <Body dim italic style={{ margin: 0, fontSize: '14px' }}>Nothing on the calendar today.</Body>
          </div>
        )}

        {!calLoading && !calError && calEvents.map(evt => {
          const isSelected = thresholds.some(t => t.source_ref === evt.id)
          return (
            <div key={evt.id}
              onClick={() => toggleCalendarEvent(evt)}
              style={{
                padding: '13px 18px',
                borderBottom: `1px solid ${tokens.goldFaint}`,
                background: isSelected ? tokens.goldTint : tokens.bgCard,
                cursor: 'pointer', transition: 'background 0.15s ease',
                display: 'flex', alignItems: 'center', gap: '14px',
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = tokens.goldGlow }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = tokens.bgCard }}
            >
              {/* Time */}
              <div style={{
                ...sc, fontSize: '11px', fontWeight: 600, letterSpacing: '0.14em',
                color: isSelected ? tokens.gold : tokens.ghost,
                minWidth: '42px', flexShrink: 0,
              }}>
                {evt.all_day ? 'All day' : (evt.time_label || '—')}
              </div>

              {/* Event details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  ...body, fontSize: '14.5px',
                  color: isSelected ? tokens.gold : tokens.meta,
                  lineHeight: 1.35, fontWeight: isSelected ? 400 : 300,
                }}>{evt.title}</div>
                {evt.note && (
                  <div style={{
                    ...body, fontSize: '12px', fontStyle: 'italic',
                    color: tokens.ghost, marginTop: '2px', lineHeight: 1.35,
                  }}>{evt.note}</div>
                )}
              </div>

              {/* Threshold indicator */}
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                background: isSelected ? tokens.goldChrome : 'transparent',
                border: `1.5px solid ${isSelected ? tokens.goldChrome : tokens.goldFaint}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}>
                {isSelected && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Manual add toggle */}
      <button onClick={() => setShowManual(s => !s)} style={{
        background: 'transparent', border: `1px dashed ${tokens.goldFaint}`,
        borderRadius: '12px', width: '100%', padding: '12px',
        ...sc, fontSize: '11px', fontWeight: 600, letterSpacing: '0.16em',
        color: tokens.gold, cursor: 'pointer', marginBottom: showManual ? '12px' : 0,
      }}>
        {showManual ? '− Close' : '+ Add a threshold not on my calendar'}
      </button>

      {showManual && <ManualThresholdAdd
        draftTitle={draftTitle} setDraftTitle={setDraftTitle}
        draftTime={draftTime} setDraftTime={setDraftTime}
        draftNote={draftNote} setDraftNote={setDraftNote}
        onAdd={addManual}
      />}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Manual threshold add — used by CalendarPlanBeat in both states
// ────────────────────────────────────────────────────────────────────────────
function ManualThresholdAdd({ draftTitle, setDraftTitle, draftTime, setDraftTime, draftNote, setDraftNote, onAdd }) {
  return (
    <Card style={{ padding: '18px 20px', marginTop: '4px' }}>
      <input
        type="text"
        value={draftTitle}
        onChange={e => setDraftTitle(e.target.value)}
        placeholder="What's the moment?"
        style={{ ...inputStyle(), minHeight: 'auto', padding: '10px 14px', marginBottom: '8px' }}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) onAdd() }}
        autoFocus
      />
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <input
          type="text"
          value={draftTime}
          onChange={e => setDraftTime(e.target.value)}
          placeholder="Time (optional)"
          style={{ ...inputStyle(), minHeight: 'auto', padding: '10px 14px', width: '130px' }}
        />
        <input
          type="text"
          value={draftNote}
          onChange={e => setDraftNote(e.target.value)}
          placeholder="What you know about this moment"
          style={{ ...inputStyle(), minHeight: 'auto', padding: '10px 14px', flex: 1 }}
        />
      </div>
      <SolidButton onClick={onAdd} disabled={!draftTitle.trim()} style={{ padding: '10px 20px' }}>
        Lock it in →
      </SolidButton>
    </Card>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// GroundBeat — two-stage animated breath timer
//
// Stage 1: Charge breath — 3 Tabata rounds × 20s fast / 10s rest
//   Tabata-style with "Ready · 3 · 2 · 1 · Begin" / "Rest" / "Complete" audio cues
//
// Stage 2: Open breath — 3 rounds × 3 centres descending (chest → belly → pelvis)
//   Each centre: deep breath in (4s) → hold (4s) → exhale with "ah" (6s) → hold (2s)
// ────────────────────────────────────────────────────────────────────────────

const CHARGE_ROUNDS   = 3
const CHARGE_WORK_S   = 20
const CHARGE_REST_S   = 10
const OPEN_ROUNDS     = 3
const OPEN_CENTRES    = ['Chest / heart', 'Belly', 'Sacrum']
const OPEN_PHASES     = [
  { label: 'Breathe in',    dur: 5,  expand: true  },
  { label: 'Hold',          dur: 4,  expand: true  },
  { label: 'Exhale — "ah"', dur: 7,  expand: false },
  { label: 'Hold',          dur: 4,  expand: false },
]

// Beep helpers (reuse Chimes ctx pattern)
function makeBeep(freq, dur = 0.12, gain = 0.18) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const g   = ctx.createGain()
    osc.type = 'sine'; osc.frequency.value = freq
    g.gain.setValueAtTime(0, ctx.currentTime)
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    osc.connect(g); g.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + dur)
    setTimeout(() => ctx.close(), dur * 1000 + 200)
  } catch(e) {}
}
function beepLow()    { makeBeep(330, 0.14, 0.16) }
function beepMid()    { makeBeep(523, 0.12, 0.18) }
function beepHigh()   { makeBeep(880, 0.18, 0.20) }
function beepReady()  { makeBeep(440, 0.22, 0.15) }
function beepBegin()  {
  makeBeep(523, 0.15, 0.20)
  setTimeout(() => makeBeep(659, 0.15, 0.20), 160)
  setTimeout(() => makeBeep(880, 0.28, 0.22), 320)
}
function beepEnd()    {
  makeBeep(880, 0.15, 0.18)
  setTimeout(() => makeBeep(659, 0.15, 0.18), 160)
  setTimeout(() => makeBeep(523, 0.28, 0.20), 320)
}

function GroundBeat({ onComplete, onBack }) {
  const [phase, setPhase]             = useState(() => {
    const saved = loadGroundPhase()
    // Only restore active phases — don't drop them into the middle of a timer
    // Restore to the pre-phase card so they can deliberately resume
    if (saved === 'charge-work' || saved === 'charge-rest' || saved === 'charge-ready') return 'intro'
    if (saved === 'open-running') return 'charge-done'
    return saved || 'intro'
  })
  const [chargeRound, setChargeRound] = useState(1)
  const [tick, setTick]               = useState(0)
  const [circleScale, setCircleScale] = useState(1)

  const [paused, setPaused]           = useState(false)

  const timerRef     = useRef(null)
  const countRef     = useRef(null)
  const remainingRef = useRef(0)
  const resumeCtxRef = useRef(null)
  const phaseRef     = useRef('intro')
  const pausedRef    = useRef(false)

  useEffect(() => { phaseRef.current = phase; saveGroundPhase(phase) }, [phase])
  useEffect(() => { pausedRef.current = paused }, [paused])

  function clearTimers() {
    clearInterval(timerRef.current)
    clearTimeout(countRef.current)
  }

  function doPause() {
    if (pausedRef.current) return
    clearTimers()
    setPaused(true)
  }

  function doResume() {
    setPaused(false)
    const ctx = resumeCtxRef.current
    if (!ctx) return
    const rem = remainingRef.current
    if (ctx.kind === 'charge-work') resumeChargeWork(ctx.round, rem)
    else if (ctx.kind === 'charge-rest') resumeChargeRest(ctx.round, rem)
    else if (ctx.kind === 'open') resumeOpenPhase(ctx.round, ctx.centre, ctx.phaseIdx, rem)
  }

  useEffect(() => {
    function onVisibilityChange() {
      const activePhases = ['charge-work','charge-rest','charge-ready','open-running']
      if (document.hidden && activePhases.includes(phaseRef.current) && !pausedRef.current) {
        doPause()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  // ── Charge breath ──────────────────────────────────────────────────────
  function startChargeReady(round) {
    clearTimers()
    setChargeRound(round)

    // Only round 1 gets the 3-2-1 countdown
    if (round > 1) {
      beepBegin()
      startChargeWork(round)
      return
    }

    setPhase('charge-ready')
    beepReady()
    let count = 3
    setTick(count)
    timerRef.current = setInterval(() => {
      count--
      if (count > 0) {
        setTick(count)
        beepMid()
      } else {
        clearInterval(timerRef.current)
        beepBegin()
        startChargeWork(round)
      }
    }, 1000)
  }

  function startChargeWork(round) {
    setPhase('charge-work')
    setTick(CHARGE_WORK_S)
    setCircleScale(1)
    resumeCtxRef.current = { kind: 'charge-work', round }
    resumeChargeWork(round, CHARGE_WORK_S)
  }

  function resumeChargeWork(round, startAt) {
    setPhase('charge-work')
    setChargeRound(round)
    let t = startAt
    setTick(t)
    let expanding = true
    timerRef.current = setInterval(() => {
      t--
      remainingRef.current = t
      setTick(t)
      expanding = !expanding
      setCircleScale(expanding ? 1.12 : 0.92)
      if (t <= 0) {
        clearInterval(timerRef.current)
        setCircleScale(1)
        if (round < CHARGE_ROUNDS) {
          beepEnd()
          startChargeRest(round)
        } else {
          beepEnd()
          setPhase('charge-done')
        }
      }
    }, 1000)
  }

  function startChargeRest(round) {
    setPhase('charge-rest')
    resumeCtxRef.current = { kind: 'charge-rest', round }
    resumeChargeRest(round, CHARGE_REST_S)
  }

  function resumeChargeRest(round, startAt) {
    setPhase('charge-rest')
    setChargeRound(round)
    let t = startAt
    setTick(t)
    timerRef.current = setInterval(() => {
      t--
      remainingRef.current = t
      setTick(t)
      if (t <= 0) {
        clearInterval(timerRef.current)
        startChargeReady(round + 1)
      }
    }, 1000)
  }



  useEffect(() => () => clearTimers(), [])

  // ── Visual helpers ─────────────────────────────────────────────────────
  const isCharging = phase === 'charge-work' || phase === 'charge-rest' || phase === 'charge-ready'
  const circleColor = phase === 'charge-work' ? tokens.goldChrome : tokens.gold
  const circleBg    = phase === 'charge-work' ? tokens.goldStrong : tokens.goldTint
  const totalSecs   = phase === 'charge-work' ? CHARGE_WORK_S : phase === 'charge-rest' ? CHARGE_REST_S : 0
  const elapsed     = totalSecs - tick
  const progress    = totalSecs > 0 ? Math.min(elapsed / totalSecs, 1) : 0
  const R = 88, C = 2 * Math.PI * R
  const dashOffset  = C - progress * C

  return (
    <div className="hp-fade-in" style={{ maxWidth: '520px', margin: '0 auto' }}>
      <Eyebrow style={{ marginBottom: '12px' }}>Ground</Eyebrow>
      <Heading size="lg" style={{ marginBottom: '6px' }}>
        Land in the body.
      </Heading>

      {/* ── Intro ── */}
      {phase === 'intro' && (
        <div className="hp-fade-in">
          <Body dim style={{ marginBottom: '28px' }}>
            Three rounds of charge breathing to wake the system.
            Fast, deep breaths. Focus on the exhale.
          </Body>
          <div style={{ display: 'flex', gap: '10px' }}>
            <GhostButton onClick={onBack}>← Back</GhostButton>
            <SolidButton onClick={() => startChargeReady(1)}>Begin →</SolidButton>
            <GhostButton onClick={() => { clearGroundPhase(); onComplete() }} style={{ marginLeft: 'auto' }}>Skip</GhostButton>
          </div>
        </div>
      )}

      {/* ── Charge: ready countdown ── */}
      {phase === 'charge-ready' && (
        <div className="hp-fade-in" style={{ textAlign: 'center', padding: '32px 0' }}>
          <Eyebrow style={{ marginBottom: '16px' }}>
            Round {chargeRound} of {CHARGE_ROUNDS} · Charge breath
          </Eyebrow>
          <div style={{
            ...body, fontSize: 'clamp(60px, 14vw, 88px)', fontWeight: 300,
            color: tokens.gold, lineHeight: 1, marginBottom: '16px',
          }}>{tick}</div>
          <Body dim style={{ margin: 0 }}>Ready…</Body>
        </div>
      )}

      {/* ── Charge: work / rest ── */}
      {(phase === 'charge-work' || phase === 'charge-rest') && (
        <div className="hp-fade-in" style={{ textAlign: 'center', padding: '20px 0' }}>
          <Eyebrow style={{ marginBottom: '20px' }}>
            {phase === 'charge-work'
              ? `Round ${chargeRound} of ${CHARGE_ROUNDS} · Charge`
              : `Rest · Round ${chargeRound + 1} begins next`}
          </Eyebrow>

          {/* Animated circle */}
          <div style={{ position: 'relative', width: '210px', height: '210px', margin: '0 auto 20px' }}>
            <svg width="210" height="210" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
              <circle cx="105" cy="105" r={R} fill="none"
                stroke={tokens.goldFaint} strokeWidth="3" />
              <circle cx="105" cy="105" r={R} fill="none"
                stroke={circleColor} strokeWidth="3"
                strokeDasharray={C} strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 0.9s linear' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '6px',
            }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: phase === 'charge-work' ? circleBg : tokens.goldTint,
                border: `2px solid ${circleColor}`,
                transform: `scale(${circleScale})`,
                transition: phase === 'charge-work' ? 'transform 0.45s ease-in-out' : 'transform 0.8s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  ...body, fontSize: '28px', fontWeight: 300,
                  color: circleColor, lineHeight: 1,
                }}>{tick}</span>
              </div>
            </div>
          </div>

          <Body style={{ margin: 0 }} dim={phase === 'charge-rest'}>
            {paused
              ? 'Paused.'
              : phase === 'charge-work'
                ? 'Just breathe. Focus on the exhale.'
                : 'Pause on the exhale.'}
          </Body>
        </div>
      )}

      {/* ── Charge done ── */}
      {phase === 'charge-done' && (
        <div className="hp-fade-in" style={{ textAlign: 'center', padding: '28px 0' }}>
          <Eyebrow style={{ marginBottom: '14px' }}>Charged</Eyebrow>
          <Heading size="md" style={{ marginBottom: '24px', color: tokens.gold }}>
            System is awake.
          </Heading>
          <SolidButton onClick={() => { clearGroundPhase(); onComplete() }}>I Am →</SolidButton>
        </div>
      )}

      {/* Skip always available during active phases */}
      {isCharging && (
        <div style={{ textAlign: 'center', marginTop: '28px', display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'center' }}>
          <button onClick={paused ? doResume : doPause} style={{
            background: paused ? tokens.goldChrome : 'transparent',
            border: `1px solid ${paused ? tokens.goldChrome : tokens.goldFaint}`,
            borderRadius: '40px', cursor: 'pointer',
            ...sc, fontSize: '10px', fontWeight: 600, letterSpacing: '0.18em',
            color: paused ? '#FFFFFF' : tokens.gold, textTransform: 'uppercase',
            padding: '8px 18px',
          }}>{paused ? 'Resume →' : 'Pause'}</button>
          <button onClick={() => { clearTimers(); clearGroundPhase(); onComplete() }} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            ...sc, fontSize: '10px', fontWeight: 600, letterSpacing: '0.18em',
            color: tokens.whisper, textTransform: 'uppercase',
          }}>Skip →</button>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────
// OpenBreathBeat — three-centre descending breath to anchor the I Am statements
// Glow field · tick-dot canvas · phase-text animation · complete-pulse · 0.7s gap
// ────────────────────────────────────────────────────────────────────────────
function OpenBreathBeat({ onComplete, onBack }) {
  const canvasRef      = useRef(null)
  const glowRef        = useRef(null)
  const phaseTextRef   = useRef(null)
  const timerRef       = useRef(null)
  const glowAnimRef    = useRef(null)
  const pulseAnimRef   = useRef(null)
  const currentGlowRef = useRef(0)
  const transRef       = useRef(false)
  const pausedRef      = useRef(false)

  const [screen, setScreen]         = useState('intro')
  const [paused, setPaused]         = useState(false)
  const [openRound, setOpenRound]   = useState(1)
  const [openCentre, setOpenCentre] = useState(0)
  const [openPhase, setOpenPhase]   = useState(0)

  useEffect(() => { pausedRef.current = paused }, [paused])

  // ── Audio ───────────────────────────────────────────────────────────
  function bpIn()    { makeBeep(523, 0.18, 0.12); setTimeout(() => makeBeep(659, 0.16, 0.10), 180) }
  function bpTrans() { makeBeep(440, 0.22, 0.09) }
  function bpDone()  { makeBeep(659, 0.20, 0.11); setTimeout(() => makeBeep(880, 0.30, 0.13), 220) }

  // ── Glow ────────────────────────────────────────────────────────────
  function setGlow(v) {
    currentGlowRef.current = v
    if (!glowRef.current) return
    const a1 = 0.04 + v * 0.30
    const a2 = 0.00 + v * 0.14
    glowRef.current.style.background =
      'radial-gradient(circle, rgba(200,146,42,' + a1 + ') 20%, rgba(200,146,42,' + a2 + ') 55%, transparent 78%)'
  }

  function animateGlowTo(from, to, durMs) {
    cancelAnimationFrame(glowAnimRef.current)
    let start = null
    function step(ts) {
      if (!start) start = ts
      const t = Math.min((ts - start) / durMs, 1)
      const e = t < 0.5 ? 2*t*t : -1 + (4-2*t)*t
      setGlow(from + (to - from) * e)
      if (t < 1) glowAnimRef.current = requestAnimationFrame(step)
    }
    glowAnimRef.current = requestAnimationFrame(step)
  }

  // ── Tick canvas ──────────────────────────────────────────────────────
  function drawTicks(total, filled, pulse) {
    pulse = pulse || 0
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, 220, 220)
    const cx = 110, cy = 110, r = 96
    const step = (Math.PI * 2) / total
    const startA = -Math.PI / 2
    const allFilled = filled >= total
    for (let i = 0; i < total; i++) {
      const angle = startA + i * step
      const x = cx + r * Math.cos(angle)
      const y = cy + r * Math.sin(angle)
      const isLast = i === total - 1
      const isFilled = i < filled
      let dotR = 2.8
      if (isLast && isFilled) dotR = 4.4
      if (allFilled && pulse > 0) {
        const p = Math.sin(pulse * Math.PI)
        dotR += p * (isLast ? 3.2 : 1.6)
      }
      let alpha = isFilled ? 0.85 : 0.16
      if (allFilled && pulse > 0) {
        const p2 = Math.sin(pulse * Math.PI)
        alpha = isFilled ? Math.min(1.0, 0.85 + p2 * 0.15) : 0.16 + p2 * 0.28
      }
      ctx.beginPath()
      ctx.arc(x, y, dotR, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(200,146,42,' + alpha + ')'
      ctx.fill()
    }
  }

  function runCompletePulse(total, onDone) {
    cancelAnimationFrame(pulseAnimRef.current)
    let start = null
    const dur = 520
    function step(ts) {
      if (!start) start = ts
      const t = Math.min((ts - start) / dur, 1)
      drawTicks(total, total, t)
      if (t < 1) { pulseAnimRef.current = requestAnimationFrame(step) }
      else { drawTicks(total, total, 0); onDone() }
    }
    pulseAnimRef.current = requestAnimationFrame(step)
  }

  // ── Phase visuals ────────────────────────────────────────────────────
  function applyPhaseVisuals(kind, durMs) {
    const el = phaseTextRef.current
    if (!el) return
    if (kind === 'inhale') {
      el.style.transition = 'opacity 0.3s ease, color 0.4s ease'
      el.style.opacity = '1'; el.style.color = tokens.dark
      el.style.fontSize = '17px'; el.style.letterSpacing = '0.03em'
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transition =
          'font-size ' + durMs + 'ms cubic-bezier(0.25,0,0.1,1), ' +
          'letter-spacing ' + durMs + 'ms cubic-bezier(0.25,0,0.1,1), ' +
          'opacity 0.3s ease, color 0.4s ease'
        el.style.fontSize = '30px'; el.style.letterSpacing = '0.06em'
      }))
      animateGlowTo(0.05, 0.26, durMs)
    } else if (kind === 'hold-in') {
      el.style.transition = 'font-size 0.4s ease, letter-spacing 0.4s ease, opacity 0.3s ease, color 0.4s ease'
      el.style.opacity = '1'; el.style.color = tokens.dark
      el.style.fontSize = '30px'; el.style.letterSpacing = '0.10em'
      animateGlowTo(0.26, 0.78, durMs)
    } else if (kind === 'exhale') {
      el.style.transition = 'opacity 0.3s ease, color 0.5s ease'
      el.style.opacity = '0.88'; el.style.color = 'rgba(168,114,26,0.72)'
      el.style.fontSize = '30px'; el.style.letterSpacing = '0.10em'
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transition =
          'font-size ' + durMs + 'ms cubic-bezier(0.0,0,0.2,1), ' +
          'letter-spacing ' + (durMs * 1.15) + 'ms cubic-bezier(0.0,0,0.2,1), ' +
          'opacity 0.3s ease, color 0.5s ease'
        el.style.fontSize = '16px'; el.style.letterSpacing = '0.26em'
      }))
      animateGlowTo(0.78, 0.04, durMs)
    } else if (kind === 'hold-out') {
      el.style.transition = 'font-size 0.6s ease, letter-spacing 0.6s ease, opacity 0.7s ease, color 0.5s ease'
      el.style.fontSize = '15px'; el.style.letterSpacing = '0.20em'
      el.style.opacity = '0.48'; el.style.color = tokens.ghost
      animateGlowTo(0.04, 0.02, durMs)
    }
  }

  // ── Core timer ───────────────────────────────────────────────────────
  function startPhase(r, c, p) {
    if (transRef.current) return
    setOpenRound(r); setOpenCentre(c); setOpenPhase(p)
    clearInterval(timerRef.current)
    const cfg = OPEN_PHASES[p]
    let ticksLeft = cfg.dur
    const total = cfg.dur
    if (phaseTextRef.current) phaseTextRef.current.textContent = cfg.label
    drawTicks(total, 0, 0)
    applyPhaseVisuals(cfg.kind, cfg.dur * 1000)
    if (p === 0) bpIn(); else bpTrans()
    timerRef.current = setInterval(() => {
      if (pausedRef.current) return
      ticksLeft--
      drawTicks(total, total - ticksLeft, 0)
      if (ticksLeft <= 0) {
        clearInterval(timerRef.current)
        runCompletePulse(total, () => {
          const el = phaseTextRef.current
          if (el) { el.style.transition = 'opacity 0.25s ease'; el.style.opacity = '0.28' }
          transRef.current = true
          setTimeout(() => { transRef.current = false; advancePhase(r, c, p) }, 700)
        })
      }
    }, 1000)
  }

  function advancePhase(r, c, p) {
    const nextP = p + 1, nextC = c + 1, nextR = r + 1
    if (nextP < OPEN_PHASES.length) { startPhase(r, c, nextP) }
    else if (nextC < OPEN_CENTRES.length) { bpTrans(); startPhase(r, nextC, 0) }
    else if (nextR <= OPEN_ROUNDS) { bpTrans(); startPhase(nextR, 0, 0) }
    else {
      bpDone()
      const el = phaseTextRef.current
      if (el) { el.style.transition = 'all 0.6s ease'; el.style.fontSize = '22px';
        el.style.letterSpacing = '0.02em'; el.style.opacity = '1'; el.style.color = tokens.dark }
      animateGlowTo(currentGlowRef.current, 0, 800)
      setTimeout(() => setScreen('done'), 900)
    }
  }

  function doStart() {
    setScreen('running')
    setTimeout(() => startPhase(1, 0, 0), 80)
  }

  function doPause() {
    setPaused(p => {
      const next = !p
      pausedRef.current = next
      if (next) cancelAnimationFrame(glowAnimRef.current)
      return next
    })
  }

  function doSkip() {
    clearInterval(timerRef.current)
    cancelAnimationFrame(glowAnimRef.current)
    cancelAnimationFrame(pulseAnimRef.current)
    onComplete()
  }

  useEffect(() => {
    function onVis() {
      if (document.hidden && !pausedRef.current) doPause()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  useEffect(() => () => {
    clearInterval(timerRef.current)
    cancelAnimationFrame(glowAnimRef.current)
    cancelAnimationFrame(pulseAnimRef.current)
  }, [])

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="hp-fade-in" style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
      <Eyebrow style={{ marginBottom: '6px' }}>Anchor</Eyebrow>
      <Heading size="lg" style={{ marginBottom: '6px' }}>Let it land.</Heading>

      {screen === 'intro' && (
        <div className="hp-fade-in">
          <div style={{
            background: tokens.goldTint, border: '1px solid ' + tokens.goldFaint,
            borderRadius: '14px', padding: '26px', margin: '28px 0', textAlign: 'left',
          }}>
            <Body dim style={{ marginBottom: '10px' }}>
              Three centres, descending. Breathe in, hold, exhale with a voiced "ah", hold.
            </Body>
            <Body dim>Let each breath anchor what you just declared.</Body>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <GhostButton onClick={onBack}>← Back</GhostButton>
            <SolidButton onClick={doStart}>Begin →</SolidButton>
            <button onClick={doSkip} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              ...sc, fontSize: '10px', fontWeight: 600, letterSpacing: '0.18em',
              color: tokens.whisper, textTransform: 'uppercase',
            }}>Skip</button>
          </div>
        </div>
      )}

      {screen === 'running' && (
        <div className="hp-fade-in">
          <div style={{
            ...sc, fontSize: '13px', letterSpacing: '0.18em', color: tokens.ghost,
            textTransform: 'uppercase', margin: '8px 0 36px',
          }}>
            {OPEN_CENTRES[openCentre]}
          </div>

          <div style={{
            position: 'relative', width: '220px', height: '220px',
            margin: '0 auto 36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div ref={glowRef} style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'radial-gradient(circle, transparent 30%, transparent 100%)',
              pointerEvents: 'none',
            }} />
            <canvas ref={canvasRef} width={220} height={220}
              style={{ position: 'absolute', inset: 0 }} />
            <div ref={phaseTextRef} style={{
              ...body, fontWeight: 400, color: tokens.dark, fontSize: '22px',
              letterSpacing: '0.02em', opacity: 1, lineHeight: 1.25,
              position: 'relative', zIndex: 1,
              transition: 'font-size 0.5s ease, letter-spacing 0.5s ease, opacity 0.4s ease, color 0.5s ease',
            }}>
              {OPEN_PHASES[openPhase]?.label}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
            {[1,2,3].map(r => (
              <div key={r} style={{
                height: '4px', borderRadius: '2px',
                width: r === openRound ? '24px' : '10px',
                background: r <= openRound ? tokens.goldChrome : tokens.goldFaint,
                transition: 'all 0.4s ease',
              }} />
            ))}
          </div>
          <div style={{
            ...sc, fontSize: '10px', letterSpacing: '0.18em',
            color: tokens.whisper, textTransform: 'uppercase', marginBottom: '36px',
          }}>
            Round {openRound} of {OPEN_ROUNDS}
          </div>

          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', alignItems: 'center' }}>
            <button onClick={doPause} style={{
              background: paused ? tokens.goldChrome : 'transparent',
              border: '1px solid ' + (paused ? tokens.goldChrome : tokens.goldFaint),
              borderRadius: '40px', cursor: 'pointer',
              ...sc, fontSize: '10px', fontWeight: 600, letterSpacing: '0.18em',
              color: paused ? '#FFFFFF' : tokens.gold, textTransform: 'uppercase',
              padding: '8px 18px',
            }}>{paused ? 'Resume →' : 'Pause'}</button>
            <button onClick={doSkip} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              ...sc, fontSize: '10px', fontWeight: 600, letterSpacing: '0.18em',
              color: tokens.whisper, textTransform: 'uppercase',
            }}>Skip →</button>
          </div>
        </div>
      )}

      {screen === 'done' && (
        <div className="hp-fade-in" style={{ padding: '28px 0' }}>
          <Eyebrow style={{ marginBottom: '12px' }}>Anchored</Eyebrow>
          <Heading size="md" style={{ marginBottom: '24px', color: tokens.gold }}>
            Locked in.
          </Heading>
          <SolidButton onClick={onComplete}>Plan →</SolidButton>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────── = 'hp_morning_progress'
function saveMorningProgress(data) {
  try {
    localStorage.setItem(MORNING_STORAGE_KEY, JSON.stringify({ ...data, date: getLocalDateStr() }))
  } catch (e) {}
}

// GroundBeat phase persisted separately so tab-close restores breath position
const GROUND_STORAGE_KEY = 'hp_ground_phase'
function saveGroundPhase(phase) {
  try { localStorage.setItem(GROUND_STORAGE_KEY, phase) } catch (e) {}
}
function loadGroundPhase() {
  try { return localStorage.getItem(GROUND_STORAGE_KEY) || 'intro' } catch (e) { return 'intro' }
}
function clearGroundPhase() {
  try { localStorage.removeItem(GROUND_STORAGE_KEY) } catch (e) {}
}
function loadMorningProgress() {
  try {
    const raw = localStorage.getItem(MORNING_STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data.date !== getLocalDateStr()) { localStorage.removeItem(MORNING_STORAGE_KEY); return null }
    return data
  } catch (e) { return null }
}
function clearMorningProgress() {
  try { localStorage.removeItem(MORNING_STORAGE_KEY) } catch (e) {}
}

function MorningSequence({ userId, iamStatements, horizonSelfStatement, protectorCovenant, icalUrl, onSaveIcalUrl, onComplete, onClose }) {
  const _saved = loadMorningProgress()

  const [beat, setBeatRaw] = useState(_saved?.beat || 1)
  const [sweep, setSweep] = useState(false)
  const [saving, setSaving] = useState(false)
  const [runId, setRunIdRaw] = useState(_saved?.runId || null)

  // Commit
  const [answers, setAnswersRaw] = useState(_saved?.answers || { ready: null, allowed: null, choosing: null })
  const [showCovenant, setShowCovenant] = useState(false)

  // Plan
  const [thresholds, setThresholdsRaw] = useState(_saved?.thresholds || [])

  // Persisting wrappers — use these instead of raw setters
  const beatRef = useRef(beat)
  const answersRef = useRef(answers)
  const thresholdsRef = useRef(thresholds)
  const runIdRef = useRef(runId)
  useEffect(() => { beatRef.current = beat }, [beat])
  useEffect(() => { answersRef.current = answers }, [answers])
  useEffect(() => { thresholdsRef.current = thresholds }, [thresholds])
  useEffect(() => { runIdRef.current = runId }, [runId])

  function persist(overrides = {}) {
    saveMorningProgress({
      beat: beatRef.current,
      answers: answersRef.current,
      thresholds: thresholdsRef.current,
      runId: runIdRef.current,
      ...overrides,
    })
  }

  function setBeat(v) { setBeatRaw(v); persist({ beat: v }) }
  function setAnswers(fn) {
    setAnswersRaw(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      answersRef.current = next
      saveMorningProgress({
        beat: beatRef.current,
        answers: next,
        thresholds: thresholdsRef.current,
        runId: runIdRef.current,
      })
      return next
    })
  }
  function setThresholds(fn) {
    setThresholdsRaw(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      persist({ thresholds: next }); return next
    })
  }
  function setRunId(v) { setRunIdRaw(v); persist({ runId: v }) }

  // Anchor
  const [iamIdx, setIamIdx] = useState(0)
  const [iamExpanded, setIamExpanded] = useState(false)
  const [voicedFinal, setVoicedFinal] = useState(false)
  const [pulseKey, setPulseKey] = useState(0)
  const [fastMode, setFastMode] = useState(false)
  const voicedDomainsRef = useRef([])

  // The seven iam statements ordered by DOMAIN_ORDER
  const orderedIam = DOMAIN_ORDER
    .map(d => ({
      domain: d,
      label: DOMAIN_LABELS[d],
      text: extractIamLine(iamStatements[d]),
      full: iamStatements[d],
    }))
    .filter(s => s.full && s.full.trim())

  const allYes = answers.ready === 'yes' && answers.allowed === 'yes' && answers.choosing === 'yes'
  const anyNo  = Object.values(answers).includes('no')

  // Ensure a morning run row exists when the user actually engages
  async function ensureRun() {
    if (runId) return runId
    if (!userId) return null
    const today = getLocalDateStr()
    // Try to fetch existing run for today
    const { data: existing } = await supabase
      .from('horizon_practice_morning_runs')
      .select('id')
      .eq('user_id', userId)
      .eq('run_date', today)
      .maybeSingle()
    if (existing?.id) {
      setRunId(existing.id)
      return existing.id
    }
    // Insert new
    const { data: created } = await supabase
      .from('horizon_practice_morning_runs')
      .insert({ user_id: userId, run_date: today })
      .select('id')
      .maybeSingle()
    if (created?.id) {
      setRunId(created.id)
      return created.id
    }
    return null
  }

  async function moveToGround() {
    const rid = await ensureRun()
    if (rid && userId) {
      await supabase.from('horizon_practice_morning_runs').update({
        commit_ready: answers.ready,
        commit_allowed: answers.allowed,
        commit_choosing: answers.choosing,
        commit_covenant_seen: showCovenant,
        light_run: anyNo,
      }).eq('id', rid)
    }
    setBeat(2)
  }

  async function moveToIAm() {
    // Beat 2 → 3: Ground complete
    const rid = await ensureRun()
    if (rid && userId) {
      await supabase.from('horizon_practice_morning_runs').update({
        ground_confirmed_at: new Date().toISOString(),
      }).eq('id', rid)
    }
    setBeat(3)
  }

  async function moveToAnchorBreath() {
    // Beat 3 → 4: I Am voiced, move to open breath
    setBeat(4)
  }

  async function moveToPlan() {
    // Beat 4 → 5: Anchor (open breath) complete
    setBeat(5)
  }

  async function moveToAct() {
    // Beat 5 → 6: Plan complete, persist thresholds
    const rid = await ensureRun()
    if (rid && userId && thresholds.length > 0) {
      const today = getLocalDateStr()
      const rows = thresholds
        .filter(t => !t.id)
        .map(t => ({
          user_id: userId,
          morning_run_id: rid,
          title: t.title,
          time_label: t.time_label || null,
          note: t.note || null,
          source: 'manual',
          run_date: today,
        }))
      if (rows.length > 0) {
        const { data: inserted } = await supabase
          .from('horizon_practice_thresholds')
          .insert(rows)
          .select('id, title')
        if (inserted) {
          const updated = thresholds.map(t => {
            if (t.id) return t
            const match = inserted.find(r => r.title === t.title)
            return match ? { ...t, id: match.id, tempId: undefined } : t
          })
          setThresholds(updated)
        }
      }
      await supabase.from('horizon_practice_morning_runs').update({
        plan_threshold_count: thresholds.length,
      }).eq('id', rid)
    }
    setBeat(6)
  }

  function handleIamVoiced() {
    Chimes.iamVoiced()
    setPulseKey(k => k + 1)
    setIamExpanded(false)
    const currentDomain = orderedIam[iamIdx].domain
    if (!voicedDomainsRef.current.includes(currentDomain)) {
      voicedDomainsRef.current = [...voicedDomainsRef.current, currentDomain]
    }
    if (iamIdx < orderedIam.length - 1) setIamIdx(iamIdx + 1)
    else setVoicedFinal(true)
  }

  function handleFastVoiced() {
    Chimes.iamVoiced()
    voicedDomainsRef.current = orderedIam.map(s => s.domain)
    setTimeout(() => setVoicedFinal(true), 200)
  }

  async function handleHorizonSelfVoiced() {
    Chimes.horizonSelf()
    setPulseKey(k => k + 1)
    if (runId && userId) {
      await supabase.from('horizon_practice_morning_runs').update({
        anchor_domains_voiced: voicedDomainsRef.current,
        anchor_fast_mode: fastMode,
        anchor_whole_voiced: true,
      }).eq('id', runId)
    }
    setTimeout(() => moveToAnchorBreath(), 800)
  }

  async function handleActComplete() {
    Chimes.morningComplete()
    setSweep(true)
    screenFlash()
    setSaving(true)
    if (runId && userId) {
      const now = new Date().toISOString()
      await supabase.from('horizon_practice_morning_runs').update({
        act_completed_at: now,
        completed_at: now,
      }).eq('id', runId)
    }
    clearMorningProgress()
    setTimeout(() => onComplete(thresholds), 1500)
  }

  // First threshold preview for the Act beat
  const firstThreshold = thresholds[0]

  return (
    <div style={{ maxWidth: '660px', margin: '0 auto',
      padding: 'clamp(28px, 5vw, 48px) clamp(20px, 4vw, 36px) 80px' }}>

      <div style={{
        ...sc, fontSize: '10px', letterSpacing: '0.20em',
        color: tokens.whisper, textTransform: 'uppercase',
        marginBottom: '20px', display: 'flex', justifyContent: 'space-between',
      }}>
        <span>Pre-flight · five beats</span>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
          font: 'inherit', letterSpacing: 'inherit', color: tokens.ghost,
        }}>Save and close ×</button>
      </div>

      <FiveBeatTracker currentBeat={beat} sweep={sweep} />

      {/* ━━━ COMMIT ━━━ */}
      {beat === 1 && (() => {
        const COMMIT_QS = [
          { key: 'ready',    label: 'Are you ready?' },
          { key: 'allowed',  label: 'Are you allowed?' },
          { key: 'choosing', label: 'Are you choosing this?' },
        ]
        // Find first unanswered question
        const activeIdx = COMMIT_QS.findIndex(q => answers[q.key] === null)
        const allAnswered = activeIdx === -1
        const currentQ = allAnswered ? null : COMMIT_QS[activeIdx]

        function handleAnswer(key, ans) {
          setAnswers(a => ({ ...a, [key]: ans }))
        }

        return (
          <div className="hp-fade-in">
            <Eyebrow style={{ marginBottom: '12px' }}>Commit</Eyebrow>

            {/* Horizon Self statement shown throughout */}
            {horizonSelfStatement && (
              <div style={{
                padding: '22px 24px', marginBottom: '28px',
                background: tokens.bgCard, border: `1px solid ${tokens.goldChrome}`,
                borderRadius: '12px',
              }}>
                <p style={{
                  ...body, fontSize: 'clamp(15px, 2vw, 17px)', fontWeight: 400,
                  color: tokens.dark, lineHeight: 1.55, margin: 0,
                }}>{horizonSelfStatement}</p>
              </div>
            )}

            {/* One question at a time */}
            {!allAnswered && currentQ && (
              <div key={currentQ.key} className="hp-fade-in">
                {/* Progress dots */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
                  {COMMIT_QS.map((q, i) => (
                    <div key={q.key} style={{
                      height: '3px', flex: 1, borderRadius: '2px',
                      background: answers[q.key] !== null
                        ? tokens.goldChrome
                        : i === activeIdx ? tokens.goldFaint : tokens.goldFaint,
                      transition: 'background 0.3s',
                    }} />
                  ))}
                </div>

                <p style={{
                  ...body, fontSize: 'clamp(18px, 2.4vw, 22px)', fontWeight: 400,
                  color: tokens.meta, margin: '0 0 28px', lineHeight: 1.45,
                }}>{currentQ.label}</p>

                <div style={{ display: 'flex', gap: '10px' }}>
                  {['yes', 'no'].map(ans => (
                    <button key={ans}
                      onClick={() => handleAnswer(currentQ.key, ans)}
                      style={{
                        flex: 1, padding: '14px 18px',
                        background: ans === 'yes' ? tokens.goldChrome : 'transparent',
                        color: ans === 'yes' ? '#FFFFFF' : tokens.ghost,
                        border: `1px solid ${ans === 'yes' ? tokens.goldChrome : tokens.goldFaint}`,
                        borderRadius: '40px',
                        ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.20em',
                        textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >{ans === 'yes' ? 'Yes' : 'No'}</button>
                  ))}
                </div>
              </div>
            )}

            {/* All answered */}
            {allAnswered && (
              <div className="hp-fade-in">
                {anyNo ? (
                  <Card style={{ background: tokens.goldTint, marginBottom: '24px' }}>
                    <Eyebrow color="ghost" style={{ marginBottom: '8px', fontSize: '11px' }}>A no is data</Eyebrow>
                    <Body dim style={{ margin: 0, fontSize: '14px' }}>
                      Run lighter today. Or close and return.
                    </Body>
                  </Card>
                ) : (
                  <div style={{
                    padding: '16px 20px', marginBottom: '24px',
                    background: tokens.goldTint, borderRadius: '10px',
                    textAlign: 'center',
                  }}>
                    <Body dim style={{ margin: 0, fontSize: '14px' }}>Ready.</Body>
                  </div>
                )}

                {protectorCovenant && (
                  <div style={{ marginBottom: '24px' }}>
                    <button onClick={() => setShowCovenant(s => !s)} style={{
                      background: 'transparent', border: 'none', padding: '8px 0',
                      cursor: 'pointer', ...sc, fontSize: '11px', fontWeight: 600,
                      letterSpacing: '0.18em', color: tokens.gold,
                      borderBottom: `1px solid ${tokens.goldFaint}`,
                    }}>{showCovenant ? '— Hide covenant' : '+ Covenant'}</button>
                    {showCovenant && (
                      <div style={{
                        marginTop: '14px', padding: '20px 22px',
                        background: tokens.goldTint,
                        borderLeft: `2px solid ${tokens.goldChrome}`, borderRadius: '4px',
                      }}>
                        <p style={{
                          margin: 0, ...body, fontSize: '16px',
                          color: tokens.meta, lineHeight: 1.6,
                        }}>{protectorCovenant}</p>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
                  <GhostButton onClick={() => setAnswers({ ready: null, allowed: null, choosing: null })}>
                    ← Reset
                  </GhostButton>
                  <SolidButton onClick={moveToGround}>
                    {anyNo ? 'Light run →' : 'Ground →'}
                  </SolidButton>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* ━━━ GROUND — two-stage breath ━━━ */}
      {/* ━━━ GROUND ━━━ */}
      {beat === 2 && (
        <GroundBeat onComplete={moveToIAm} onBack={() => setBeat(1)} />
      )}

      {/* ━━━ I AM — beat 3 ━━━ */}
      {beat === 3 && !voicedFinal && !fastMode && orderedIam.length > 0 && (
        <div className="hp-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'baseline', marginBottom: '12px' }}>
            <Eyebrow>I Am · {orderedIam[iamIdx].label}</Eyebrow>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <a href="/tools/map" style={{
                ...sc, fontSize: '10px', fontWeight: 600, letterSpacing: '0.16em',
                color: tokens.ghost, textDecoration: 'none',
                borderBottom: `1px solid ${tokens.goldFaint}`, paddingBottom: '1px',
              }}>Edit</a>
              <button onClick={() => setFastMode(true)} style={{
                background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                ...sc, fontSize: '10px', fontWeight: 600, letterSpacing: '0.18em',
                color: tokens.ghost, textTransform: 'uppercase',
                borderBottom: `1px solid ${tokens.goldFaint}`,
              }}>Fast mode</button>
            </div>
          </div>
          <Heading size="lg" style={{ marginBottom: '16px' }}>
            Declare it aloud.
          </Heading>

          <div
            key={pulseKey}
            className="hp-card-pulse"
            style={{
              marginTop: '24px', padding: '36px 32px', textAlign: 'center',
              background: tokens.goldTint, border: `1px solid ${tokens.goldChrome}`,
              borderRadius: '14px',
            }}>
            <p style={{
              ...body, fontSize: 'clamp(18px, 2.6vw, 24px)', fontWeight: 400,
              color: tokens.dark, lineHeight: 1.5,
              margin: 0, maxWidth: '460px', marginLeft: 'auto', marginRight: 'auto',
            }}>
              {iamExpanded ? orderedIam[iamIdx].full : orderedIam[iamIdx].text}
            </p>
            {orderedIam[iamIdx].full !== orderedIam[iamIdx].text && (
              <button onClick={() => setIamExpanded(e => !e)} style={{
                marginTop: '14px', background: 'transparent', border: 'none',
                cursor: 'pointer', ...sc, fontSize: '10px', fontWeight: 600,
                letterSpacing: '0.16em', color: tokens.ghost, textTransform: 'uppercase',
                borderBottom: `1px solid ${tokens.goldFaint}`, paddingBottom: '1px',
              }}>{iamExpanded ? 'Less' : 'More'}</button>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', margin: '22px 0' }}>
            {orderedIam.map((_, i) => (
              <div key={i} style={{
                width: i === iamIdx ? '20px' : '6px', height: '6px', borderRadius: '3px',
                background: i <= iamIdx ? tokens.goldChrome : tokens.goldFaint,
                transition: 'all 0.3s ease',
              }} />
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => {
              if (iamIdx > 0) setIamIdx(iamIdx - 1)
              else setBeat(2)
            }} style={{
              background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
              ...sc, fontSize: '11px', fontWeight: 600, letterSpacing: '0.18em', color: tokens.ghost,
            }}>← {iamIdx === 0 ? 'Ground' : 'Back'}</button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <GhostButton onClick={handleIamVoiced}>Skip</GhostButton>
              <SolidButton onClick={handleIamVoiced}>
                {iamIdx < orderedIam.length - 1 ? 'Locked · next' : 'Locked · the whole'}
              </SolidButton>
            </div>
          </div>
        </div>
      )}

      {/* ━━━ I AM — fast mode ━━━ */}
      {beat === 3 && !voicedFinal && fastMode && orderedIam.length > 0 && (
        <div className="hp-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'baseline', marginBottom: '12px' }}>
            <Eyebrow>I Am · fast run</Eyebrow>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <a href="/tools/map" style={{
                ...sc, fontSize: '10px', fontWeight: 600, letterSpacing: '0.16em',
                color: tokens.ghost, textDecoration: 'none',
                borderBottom: `1px solid ${tokens.goldFaint}`, paddingBottom: '1px',
              }}>Edit</a>
              <button onClick={() => setFastMode(false)} style={{
                background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                ...sc, fontSize: '10px', fontWeight: 600, letterSpacing: '0.18em',
                color: tokens.ghost, textTransform: 'uppercase',
                borderBottom: `1px solid ${tokens.goldFaint}`,
              }}>One at a time</button>
            </div>
          </div>
          <Heading size="lg" style={{ marginBottom: '16px' }}>
            Declare them aloud.
          </Heading>

          <div style={{ marginTop: '24px' }}>
            {orderedIam.map((stmt) => (
              <div key={stmt.domain} style={{
                padding: '14px 18px', marginBottom: '8px',
                background: tokens.goldTint,
                borderLeft: `2px solid ${tokens.goldChrome}`, borderRadius: '4px',
              }}>
                <Eyebrow style={{ marginBottom: '4px', fontSize: '10px' }}>{stmt.label}</Eyebrow>
                <p style={{
                  ...body, fontSize: '16px', color: tokens.dark,
                  lineHeight: 1.5, margin: 0,
                }}>{stmt.text}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginTop: '24px' }}>
            <GhostButton onClick={() => setBeat(2)}>← Ground</GhostButton>
            <SolidButton onClick={handleFastVoiced}>Locked · the whole →</SolidButton>
          </div>
        </div>
      )}

      {/* ━━━ I AM — integrated Horizon Self ━━━ */}
      {beat === 3 && voicedFinal && (
        <div className="hp-fade-in">
          <Eyebrow style={{ marginBottom: '12px' }}>I Am · integrated</Eyebrow>
          <Heading size="lg" style={{ marginBottom: '16px' }}>
            Now the whole.
          </Heading>
          <Body dim>Once. From the integrated state.</Body>

          {horizonSelfStatement ? (
            <div
              key={`hs-${pulseKey}`}
              className="hp-card-pulse"
              style={{
                marginTop: '24px', padding: '40px 32px',
                background: tokens.goldTint, border: `1px solid ${tokens.goldChrome}`,
                borderRadius: '14px',
              }}>
              <p style={{
                ...body, fontSize: 'clamp(17px, 2.4vw, 21px)', fontWeight: 400,
                color: tokens.dark, lineHeight: 1.6, margin: 0,
              }}>{horizonSelfStatement}</p>
            </div>
          ) : (
            <Card style={{ marginTop: '24px', textAlign: 'center', padding: '32px' }}>
              <Body dim style={{ margin: 0 }}>
                No integrated statement yet. Add one in your Map's synthesis to land here.
              </Body>
            </Card>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginTop: '28px' }}>
            <GhostButton onClick={() => {
              setVoicedFinal(false)
              if (!fastMode) setIamIdx(Math.max(0, orderedIam.length - 1))
            }}>← Back</GhostButton>
            <SolidButton onClick={handleHorizonSelfVoiced}>Locked · Anchor →</SolidButton>
          </div>
        </div>
      )}

      {/* ━━━ ANCHOR — open breath, beat 4 ━━━ */}
      {beat === 4 && (
        <OpenBreathBeat onComplete={moveToPlan} onBack={() => {
          setVoicedFinal(true)
          setBeat(3)
        }} />
      )}

      {/* ━━━ PLAN — beat 5 ━━━ */}
      {beat === 5 && (
        <div className="hp-fade-in">
          <Eyebrow style={{ marginBottom: '12px' }}>Plan</Eyebrow>
          <Heading size="lg" style={{ marginBottom: '16px' }}>
            Look at your day.
          </Heading>
          <p style={{ ...body, fontSize: '16px', color: tokens.dark, lineHeight: 1.6, margin: '0 0 24px' }}>Go through your get-to-do list and visualise meeting each moment as your Horizon Self.</p>

          <div style={{ marginTop: '24px' }}>
            <CalendarPlanBeat
              thresholds={thresholds}
              onChange={setThresholds}
              icalUrl={icalUrl}
              onSaveIcalUrl={onSaveIcalUrl}
              userId={userId}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginTop: '28px' }}>
            <GhostButton onClick={() => setBeat(4)}>← Back</GhostButton>
            <SolidButton onClick={moveToAct}>Act →</SolidButton>
          </div>
        </div>
      )}

      {/* ━━━ ACT — beat 6 ━━━ */}
      {beat === 6 && (
        <div className="hp-fade-in" style={{ textAlign: 'center', padding: '40px 0' }}>
          <Eyebrow style={{ marginBottom: '14px' }}>Act</Eyebrow>
          <Heading size="lg" style={{ marginBottom: '14px' }}>
            You are live.
          </Heading>

          {firstThreshold && (
            <div style={{
              display: 'inline-block', marginTop: '24px', marginBottom: '32px',
              padding: '14px 22px',
              background: tokens.goldTint, border: `1px solid ${tokens.goldFaint}`,
              borderRadius: '12px', textAlign: 'left',
            }}>
              <Eyebrow style={{ marginBottom: '6px', fontSize: '10px' }}>
                First threshold{firstThreshold.time_label ? ` · ${firstThreshold.time_label}` : ''}
              </Eyebrow>
              <p style={{
                ...body, fontSize: '18px',
                color: tokens.meta, margin: 0, lineHeight: 1.4,
              }}>{firstThreshold.title}</p>
            </div>
          )}

          <div style={{ marginTop: '8px' }}>
            <SolidButton onClick={handleActComplete} disabled={saving}
              style={{ padding: '14px 38px' }}>
              {saving ? 'Engaging…' : 'Engage →'}
            </SolidButton>
          </div>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Horizon Self Refresh — three screens, no jargon
// ────────────────────────────────────────────────────────────────────────────
function HorizonSelfRefresh({ open, onClose, variant, prefilledTask, onComplete }) {
  const [step, setStep] = useState(1)
  const [task, setTask] = useState('')
  const [response, setResponse] = useState('')

  useEffect(() => {
    if (open) {
      setStep(1)
      setTask(prefilledTask || '')
      setResponse('')
    }
  }, [open, prefilledTask])

  if (!open) return null
  const isCross = variant === 'cross'

  function finish() {
    if (isCross) Chimes.cross()
    else Chimes.backIn()
    onComplete({ task, response, variant })
  }

  return (
    <ModalShell open={true} onClose={onClose}>
      <div style={{
        ...sc, fontSize: '10px', letterSpacing: '0.20em',
        color: tokens.whisper, textTransform: 'uppercase',
        marginBottom: '14px', display: 'flex', justifyContent: 'space-between',
      }}>
        <span>Horizon Self Refresh</span>
        <span>{step} / 3</span>
      </div>

      {step === 1 && (
        <div className="hp-fade-in">
          <Heading size="md" style={{ marginBottom: '24px' }}>
            What's in front of you?
          </Heading>
          <textarea value={task} onChange={e => setTask(e.target.value)} autoFocus
            style={{ ...inputStyle(), minHeight: '110px' }}/>
          <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'flex-end' }}>
            <SolidButton onClick={() => setStep(2)} disabled={!task.trim()}>Next →</SolidButton>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="hp-fade-in">
          <Heading size="md" style={{ marginBottom: '24px' }}>
            How would your Horizon Self handle this?
          </Heading>
          <textarea value={response} onChange={e => setResponse(e.target.value)} autoFocus
            style={{ ...inputStyle(), minHeight: '110px' }}/>
          <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'space-between' }}>
            <GhostButton onClick={() => setStep(1)}>← Back</GhostButton>
            <SolidButton onClick={() => setStep(3)} disabled={!response.trim()}>Next →</SolidButton>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="hp-fade-in">
          <Heading size="md" style={{ marginBottom: '8px' }}>
            Anchor in. Execute as that version of you.
          </Heading>

          <div style={{ marginTop: '24px' }}>
            <Eyebrow style={{ marginBottom: '8px', fontSize: '11px' }}>What's in front of you</Eyebrow>
            <p style={{
              ...body, fontSize: '14.5px', color: tokens.ghost, lineHeight: 1.5,
              margin: '0 0 22px', paddingLeft: '14px',
              borderLeft: `1px solid ${tokens.goldFaint}`,
            }}>{task}</p>

            <Eyebrow style={{ marginBottom: '8px', fontSize: '11px' }}>Your approach</Eyebrow>
            <p style={{
              ...body, fontSize: '19px', fontWeight: 400, color: tokens.dark,
              lineHeight: 1.55, margin: 0, padding: '20px 22px',
              background: tokens.bgCard, borderRadius: '12px',
              border: `1px solid ${tokens.goldChrome}`,
            }}>{response}</p>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
            <GhostButton onClick={() => setStep(2)}>← Back</GhostButton>
            <SolidButton onClick={finish} style={{ padding: '13px 32px' }}>
              {isCross ? 'Cross →' : 'Engage →'}
            </SolidButton>
          </div>
        </div>
      )}
    </ModalShell>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Horizon Self panel — the always-available action
// ────────────────────────────────────────────────────────────────────────────
function HorizonSelfPanel({ statement, onRefresh }) {
  return (
    <div style={{
      background: tokens.goldTint, border: `1px solid ${tokens.goldFaint}`,
      borderRadius: '16px', padding: '34px 32px', textAlign: 'center',
    }}>
      <Eyebrow style={{ marginBottom: '14px' }}>Your Horizon Self</Eyebrow>
      {statement ? (
        <p style={{
          ...body, fontSize: 'clamp(17px, 2.4vw, 20px)', fontWeight: 400,
          color: tokens.dark, lineHeight: 1.6,
          maxWidth: '520px', margin: '0 auto 24px',
        }}>{statement}</p>
      ) : (
        <p style={{
          ...body, fontSize: '15px',
          color: tokens.ghost, lineHeight: 1.5,
          maxWidth: '420px', margin: '0 auto 24px',
        }}>Your integrated statement lands here once your Map's synthesis runs.</p>
      )}
      <SolidButton onClick={onRefresh} style={{ padding: '13px 32px' }}>
        Horizon Self Refresh
      </SolidButton>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Active Thresholds — with Cross action
// ────────────────────────────────────────────────────────────────────────────
function ActiveThresholds({ thresholds, onCross }) {
  if (!thresholds || thresholds.length === 0) {
    return (
      <div>
        <Eyebrow style={{ marginBottom: '12px' }}>Active thresholds</Eyebrow>
        <Card style={{ textAlign: 'center', padding: '24px' }}>
          <Body dim italic style={{ margin: 0 }}>None set for today.</Body>
        </Card>
      </div>
    )
  }
  return (
    <div>
      <Eyebrow style={{ marginBottom: '12px' }}>Active thresholds</Eyebrow>
      <div>
        {thresholds.map((t) => {
          const isCrossed = !!t.crossed_at
          return (
            <div key={t.id} style={{
              padding: '14px 18px', marginBottom: '8px',
              background: isCrossed ? tokens.goldTint : tokens.bgCard,
              border: `1px solid ${tokens.goldFaint}`, borderRadius: '12px',
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', gap: '12px',
              opacity: isCrossed ? 0.75 : 1, transition: 'all 0.4s ease',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  ...sc, fontSize: '10px', letterSpacing: '0.16em',
                  color: tokens.gold, marginBottom: '4px',
                }}>
                  {t.time_label || 'No time set'}{isCrossed ? ' · CROSSED' : ''}
                </div>
                <div style={{
                  ...body, fontSize: '14.5px', color: tokens.meta, lineHeight: 1.4,
                  textDecoration: isCrossed ? 'line-through' : 'none',
                  textDecorationColor: tokens.goldFaint,
                }}>{t.title}</div>
                {t.note && (
                  <div style={{
                    ...body, fontSize: '12.5px', fontStyle: 'italic',
                    color: tokens.ghost, marginTop: '3px', lineHeight: 1.4,
                  }}>{t.note}</div>
                )}
              </div>
              {!isCrossed && (
                <button onClick={() => onCross(t)} style={{
                  background: 'transparent', color: tokens.gold,
                  border: `1px solid ${tokens.goldFaint}`, borderRadius: '40px',
                  padding: '6px 14px', ...sc, fontSize: '10.5px', fontWeight: 600,
                  letterSpacing: '0.14em', cursor: 'pointer', whiteSpace: 'nowrap',
                  position: 'relative', overflow: 'hidden',
                }}>Cross →</button>
              )}
              {isCrossed && (
                <span style={{
                  ...sc, fontSize: '11px', fontWeight: 600,
                  letterSpacing: '0.18em', color: tokens.gold,
                }}>✓</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Hit / Drift bar + capture chips
// ────────────────────────────────────────────────────────────────────────────
function HitDriftBar({ onFlag, onCapture }) {
  const ripple = useRipple()
  const handleFlag = (e, kind) => {
    ripple(e)
    if (kind === 'hit') Chimes.hit()
    else if (kind === 'drift') Chimes.drift()
    onFlag(kind)
  }
  const handleCapture = (e, kind) => {
    ripple(e)
    onCapture(kind)
  }

  const flagBtnStyle = (bg, border) => ({
    background: bg, border: `1px solid ${border}`, borderRadius: '14px',
    padding: '18px 14px', textAlign: 'left', transition: 'all 0.2s',
    minHeight: '90px', cursor: 'pointer', position: 'relative', overflow: 'hidden',
  })
  const flagLabelStyle = {
    ...serif, fontStyle: 'italic', fontSize: '15px',
    color: tokens.dark, display: 'block', lineHeight: 1.35,
  }
  const captureChipStyle = {
    background: 'transparent', border: `1px solid ${tokens.goldFaint}`,
    borderRadius: '40px', padding: '6px 14px',
    ...sc, fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.14em',
    color: tokens.gold, cursor: 'pointer', transition: 'all 0.2s',
    position: 'relative', overflow: 'hidden',
  }

  return (
    <div>
      <Eyebrow style={{ marginBottom: '12px' }}>Mark the moment</Eyebrow>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '10px', marginBottom: '14px' }}>
        <button onClick={(e) => handleFlag(e, 'hit')}
          style={flagBtnStyle(tokens.goldTint, tokens.goldChrome)}
          onMouseEnter={e => e.currentTarget.style.background = tokens.goldGlow}
          onMouseLeave={e => e.currentTarget.style.background = tokens.goldTint}>
          <Eyebrow style={{ marginBottom: '6px', fontSize: '10px' }}>Hit</Eyebrow>
          <span style={flagLabelStyle}>I showed up. World responded.</span>
        </button>
        <button onClick={(e) => handleFlag(e, 'drift')}
          style={flagBtnStyle('transparent', tokens.goldFaint)}
          onMouseEnter={e => e.currentTarget.style.borderColor = tokens.goldChrome}
          onMouseLeave={e => e.currentTarget.style.borderColor = tokens.goldFaint}>
          <Eyebrow color="ghost" style={{ marginBottom: '6px', fontSize: '10px' }}>Drift</Eyebrow>
          <span style={flagLabelStyle}>Old self took the wheel.</span>
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{
          ...sc, fontSize: '10px', letterSpacing: '0.18em',
          color: tokens.whisper, textTransform: 'uppercase',
        }}>Archive ·</span>
        <button onClick={(e) => handleCapture(e, 'listening')} style={captureChipStyle}>
          External read
        </button>
        <button onClick={(e) => handleCapture(e, 'receipt')} style={captureChipStyle}>
          Receipt
        </button>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Hit / Drift capture modal
// ────────────────────────────────────────────────────────────────────────────
function HitOrDriftCapture({ kind, onClose, onSave, onRunRefresh }) {
  const [text, setText] = useState('')
  const [showText, setShowText] = useState(false)
  if (!kind || (kind !== 'hit' && kind !== 'drift')) return null
  const isHit = kind === 'hit'
  return (
    <ModalShell open={true} onClose={onClose} narrow>
      <Eyebrow style={{ marginBottom: '10px' }}>{isHit ? 'Hit · logged' : 'Drift · logged'}</Eyebrow>
      <Heading size="md" italic
        color={isHit ? tokens.gold : tokens.dark}
        style={{ marginBottom: '14px' }}>
        {isHit ? 'World responded.' : 'You named it.'}
      </Heading>
      <Body dim>
        {isHit
          ? 'Add a line if you want it remembered.'
          : 'Run the refresh, or add a line first.'}
      </Body>
      {!showText && (
        <div style={{ display: 'flex', gap: '10px', marginTop: '22px' }}>
          <GhostButton onClick={() => setShowText(true)}
            style={{ flex: 1, padding: '12px' }}>Add a line</GhostButton>
          <SolidButton onClick={() => {
            onSave(kind, { text: null })
            if (!isHit) onRunRefresh()
          }} style={{ flex: 1, padding: '12px' }}>
            {isHit ? 'Done' : 'Refresh →'}
          </SolidButton>
        </div>
      )}
      {showText && (
        <div style={{ marginTop: '18px' }}>
          <textarea value={text} onChange={e => setText(e.target.value)} autoFocus
            style={inputStyle()}/>
          <SolidButton onClick={() => {
            onSave(kind, { text })
            if (!isHit) onRunRefresh()
          }} style={{ width: '100%', marginTop: '12px', padding: '12px' }}>
            {isHit ? 'Save →' : 'Save · refresh →'}
          </SolidButton>
        </div>
      )}
    </ModalShell>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Listening / Receipt capture modals
// ────────────────────────────────────────────────────────────────────────────
function ListeningCapture({ open, onClose, onSave }) {
  const [from, setFrom] = useState('')
  const [text, setText] = useState('')
  if (!open) return null
  return (
    <ModalShell open={true} onClose={onClose}>
      <Eyebrow style={{ marginBottom: '10px' }}>External read</Eyebrow>
      <Heading size="md" italic style={{ marginBottom: '8px' }}>What they saw in you.</Heading>
      <Body dim style={{ fontSize: '14px', marginBottom: '24px' }}>
        Paste their words. Joins the ambient layer.
      </Body>
      <div style={{ marginBottom: '14px' }}>
        <Eyebrow style={{ marginBottom: '6px', fontSize: '11px' }}>From</Eyebrow>
        <input type="text" value={from} onChange={e => setFrom(e.target.value)}
          style={{ ...inputStyle(), minHeight: 'auto', padding: '10px 14px' }}/>
      </div>
      <div style={{ marginBottom: '20px' }}>
        <Eyebrow style={{ marginBottom: '6px', fontSize: '11px' }}>Their words</Eyebrow>
        <textarea value={text} onChange={e => setText(e.target.value)} autoFocus
          style={{ ...inputStyle(), minHeight: '110px' }}/>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <GhostButton onClick={onClose} style={{ flex: 1, padding: '12px' }}>Cancel</GhostButton>
        <SolidButton onClick={() => onSave({ from, text })}
          disabled={!text.trim() || !from.trim()}
          style={{ flex: 2, padding: '12px' }}>
          Archive →
        </SolidButton>
      </div>
    </ModalShell>
  )
}

function ReceiptCapture({ open, onClose, onSave }) {
  const [used, setUsed] = useState('')
  const [now, setNow] = useState('')
  if (!open) return null
  return (
    <ModalShell open={true} onClose={onClose}>
      <Eyebrow style={{ marginBottom: '10px' }}>Receipt</Eyebrow>
      <Heading size="md" italic style={{ marginBottom: '8px' }}>A shift worth logging.</Heading>
      <Body dim style={{ fontSize: '14px', marginBottom: '24px' }}>
        Specific. Recent. Lived.
      </Body>
      <div style={{ marginBottom: '14px' }}>
        <Eyebrow style={{ marginBottom: '6px', fontSize: '11px' }}>I used to...</Eyebrow>
        <input type="text" value={used} onChange={e => setUsed(e.target.value)} autoFocus
          style={{ ...inputStyle(), minHeight: 'auto', padding: '10px 14px' }}/>
      </div>
      <div style={{ marginBottom: '20px' }}>
        <Eyebrow style={{ marginBottom: '6px', fontSize: '11px' }}>Now I...</Eyebrow>
        <textarea value={now} onChange={e => setNow(e.target.value)}
          style={{ ...inputStyle(), minHeight: '90px' }}/>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <GhostButton onClick={onClose} style={{ flex: 1, padding: '12px' }}>Cancel</GhostButton>
        <SolidButton onClick={() => onSave({ used, now })}
          disabled={!used.trim() || !now.trim()}
          style={{ flex: 2, padding: '12px' }}>
          Archive →
        </SolidButton>
      </div>
    </ModalShell>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Ambient strip — rotates iam + listening entries
// ────────────────────────────────────────────────────────────────────────────
function AmbientStrip({ iam, listening }) {
  const rotation = []
  const max = Math.max(iam.length, listening.length)
  for (let i = 0; i < max; i++) {
    if (iam[i]) rotation.push({ kind: 'iam', ...iam[i] })
    if (listening[i]) rotation.push({ kind: 'listening', ...listening[i] })
  }
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (rotation.length === 0) return
    const t = setInterval(() => setIdx(i => (i + 1) % rotation.length), 7000)
    return () => clearInterval(t)
  }, [rotation.length])
  if (rotation.length === 0 || !rotation[idx]) return null
  const item = rotation[idx]
  const isIam = item.kind === 'iam'
  return (
    <div style={{
      background: tokens.bgCard, border: `1px solid ${tokens.goldFaint}`,
      borderRadius: '14px', padding: '24px 26px', textAlign: 'center',
    }}>
      <Eyebrow style={{ marginBottom: '12px', fontSize: '11px' }}>
        {isIam
          ? `Domain · ${item.label}`
          : `External read · ${item.from?.split(' ')[0] || 'they'}`}
      </Eyebrow>
      <p style={{
        ...body, fontSize: '17px', fontWeight: 400,
        color: tokens.dark, lineHeight: 1.55, margin: 0,
      }}>{item.text}</p>
      {!isIam && item.from && (
        <p style={{
          ...sc, fontSize: '11px', letterSpacing: '0.18em',
          color: tokens.whisper, marginTop: '10px', marginBottom: 0,
        }}>— {item.from}</p>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Recent entries (today)
// ────────────────────────────────────────────────────────────────────────────
function RecentEntries({ entries, onOpenJournal }) {
  if (!entries || entries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <Body dim italic style={{ marginBottom: '14px' }}>Log clear.</Body>
        <GhostButton onClick={onOpenJournal}>Open log →</GhostButton>
      </div>
    )
  }
  return (
    <div>
      {entries.map(item => (
        <div key={item.id} style={{ padding: '14px 0',
          borderBottom: `1px solid ${tokens.goldFaint}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'baseline', marginBottom: '4px', gap: '8px' }}>
            <span style={{
              ...sc, fontSize: '11px', fontWeight: 600, letterSpacing: '0.18em',
              color: item.kind === 'drift' ? tokens.ghost : tokens.gold,
            }}>{labelForKind(item.kind)}</span>
            <span style={{ ...body, fontSize: '12px', color: tokens.whisper }}>
              {relativeDate(item.occurred_at)}{item.from_who ? ` · ${item.from_who}` : ''}
            </span>
          </div>
          {item.text && (
            <div style={{
              ...body, fontSize: '14px', fontStyle: 'italic',
              color: tokens.meta, lineHeight: 1.6,
            }}>{item.text}</div>
          )}
        </div>
      ))}
    </div>
  )
}

function labelForKind(kind) {
  switch (kind) {
    case 'hit': return 'Hit'
    case 'drift': return 'Drift'
    case 'listening_glow': return 'External read'
    case 'receipt': return 'Receipt'
    default: return kind
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Full log
// ────────────────────────────────────────────────────────────────────────────
function LogView({ open, onClose, entries }) {
  const [filter, setFilter] = useState('all')
  const filterMap = {
    all: () => true,
    hit: e => e.kind === 'hit',
    listening: e => e.kind === 'listening_glow',
    receipt: e => e.kind === 'receipt',
    drift: e => e.kind === 'drift',
  }
  const filtered = entries.filter(filterMap[filter] || (() => true))
  return (
    <ModalShell open={open} onClose={onClose}>
      <Eyebrow style={{ marginBottom: '10px' }}>The Log</Eyebrow>
      <Heading size="md" italic style={{ marginBottom: '6px' }}>One continuous record.</Heading>
      <Body dim style={{ fontSize: '14px', marginBottom: '24px' }}>
        Your proof file. Read on a hard day.
      </Body>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          ['all', 'All'],
          ['hit', 'Hits'],
          ['listening', 'External'],
          ['receipt', 'Receipts'],
          ['drift', 'Drifts'],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            padding: '7px 13px',
            background: filter === key ? tokens.goldChrome : 'transparent',
            color: filter === key ? '#FFFFFF' : tokens.gold,
            border: `1px solid ${filter === key ? tokens.goldChrome : tokens.goldFaint}`,
            borderRadius: '40px',
            ...sc, fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.14em',
            cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>
      {filtered.map(entry => (
        <div key={entry.id} style={{ padding: '16px 0',
          borderBottom: `1px solid ${tokens.goldFaint}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'baseline', marginBottom: '6px', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', flexWrap: 'wrap' }}>
              <span style={{
                ...sc, fontSize: '11px', fontWeight: 600, letterSpacing: '0.18em',
                color: entry.kind === 'drift' ? tokens.ghost : tokens.gold,
              }}>{labelForKind(entry.kind)}</span>
              {entry.from_who && (
                <span style={{
                  ...sc, fontSize: '10px', letterSpacing: '0.16em', color: tokens.gold,
                }}>· {entry.from_who}</span>
              )}
            </div>
            <span style={{ ...body, fontSize: '12px', color: tokens.whisper }}>
              {relativeDate(entry.occurred_at)}
            </span>
          </div>
          <div style={{
            ...body, fontSize: '14.5px', fontStyle: 'italic',
            color: tokens.meta, lineHeight: 1.65,
          }}>{entry.text}</div>
        </div>
      ))}
      {filtered.length === 0 && (
        <Body dim italic style={{ textAlign: 'center', padding: '40px 0' }}>
          No entries.
        </Body>
      )}
    </ModalShell>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Settings modal — chimes
// ────────────────────────────────────────────────────────────────────────────
function SettingsModal({ open, onClose }) {
  const [enabled, setEnabled] = useState(Chimes.getEnabled())
  const [volume, setVolume]   = useState(Chimes.getVolume())
  if (!open) return null

  return (
    <ModalShell open={true} onClose={onClose} narrow>
      <Eyebrow style={{ marginBottom: '10px' }}>Audio</Eyebrow>
      <Heading size="md" italic style={{ marginBottom: '18px' }}>System confirmations.</Heading>
      <Body dim style={{ marginBottom: '24px', fontSize: '14px' }}>
        Each action confirmed by tone. Off in shared environments.
      </Body>

      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '20px' }}>
        <span style={{ ...serif, fontSize: '17px', color: tokens.meta }}>Chimes</span>
        <button onClick={() => {
          const next = !enabled
          setEnabled(next)
          Chimes.setEnabled(next)
          if (next) Chimes.iamVoiced()
        }} style={{
          width: '54px', height: '30px', borderRadius: '20px',
          background: enabled ? tokens.goldChrome : tokens.goldFaint,
          border: 'none', cursor: 'pointer', position: 'relative',
          transition: 'all 0.2s',
        }}>
          <div style={{
            position: 'absolute', top: '3px',
            left: enabled ? '27px' : '3px',
            width: '24px', height: '24px', borderRadius: '50%',
            background: '#FFFFFF', transition: 'all 0.2s',
          }} />
        </button>
      </div>

      <div style={{ marginBottom: '24px',
        opacity: enabled ? 1 : 0.4,
        pointerEvents: enabled ? 'auto' : 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ ...serif, fontSize: '17px', color: tokens.meta }}>Volume</span>
          <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em',
            color: tokens.gold }}>{Math.round(volume * 100)}%</span>
        </div>
        <input type="range" min="0" max="1" step="0.05" value={volume}
          onChange={e => {
            const v = parseFloat(e.target.value)
            setVolume(v); Chimes.setVolume(v)
          }}
          onMouseUp={() => Chimes.iamVoiced()}
          style={{ width: '100%', accentColor: tokens.goldChrome }}/>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <GhostButton onClick={() => Chimes.iamVoiced()} style={{ flex: 1, minWidth: '90px' }}>
          Voiced
        </GhostButton>
        <GhostButton onClick={() => Chimes.hit()} style={{ flex: 1, minWidth: '90px' }}>
          Hit
        </GhostButton>
        <GhostButton onClick={() => Chimes.drift()} style={{ flex: 1, minWidth: '90px' }}>
          Drift
        </GhostButton>
        <GhostButton onClick={() => Chimes.archive()} style={{ flex: 1, minWidth: '90px' }}>
          Archive
        </GhostButton>
      </div>

      <div style={{ marginTop: '24px', textAlign: 'right' }}>
        <SolidButton onClick={onClose}>Done</SolidButton>
      </div>
    </ModalShell>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Map prerequisite redirect
// ────────────────────────────────────────────────────────────────────────────
function MapRedirect({ onSkip }) {
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto',
      padding: 'clamp(80px, 10vw, 120px) clamp(20px, 5vw, 40px) 80px' }}>
      <Eyebrow style={{ marginBottom: '14px' }}>Horizon Practice</Eyebrow>
      <Heading size="xl" style={{ marginBottom: '20px' }}>
        Start with{' '}
        <em style={{ color: tokens.gold, fontStyle: 'italic' }}>The Map</em>.
      </Heading>
      <Body>
        Horizon Practice activates your <em>I am</em> statements daily. Those statements come from The Map — your honest read across the seven domains and what each of them looks like at full power.
      </Body>
      <Body dim>
        Run The Map first. It takes about an hour. Your Practice surface lands here when it's done.
      </Body>
      <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
        <SolidButton onClick={() => { window.location.href = '/tools/map' }}>
          Open The Map →
        </SolidButton>
        <GhostButton onClick={onSkip}>Skip for now</GhostButton>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ────────────────────────────────────────────────────────────────────────────
export function HorizonPracticePage() {
  const { user, loading: authLoading } = useAuth()
  const { loading: accessLoading } = useAccess('horizon-practice')

  // Profile data
  const [profileLoading, setProfileLoading] = useState(true)
  const [iamStatements, setIamStatements] = useState({})  // { path: '...', spark: '...' }
  const [horizonSelfStatement, setHorizonSelfStatement] = useState(null)
  const [protectorCovenant, setProtectorCovenant] = useState(null)
  const [hasMap, setHasMap] = useState(false)
  const [skipMap, setSkipMap] = useState(false)
  const [icalUrl, setIcalUrl] = useState(null)

  // Today's state
  const [todayRun, setTodayRun] = useState(null)
  const [thresholds, setThresholds] = useState([])
  const [entries, setEntries] = useState([])  // last ~30 days
  const [view, setView] = useState('loading')  // loading | morning | day

  // Modal state
  const [refreshOpen, setRefreshOpen] = useState(false)
  const [refreshVariant, setRefreshVariant] = useState('standard')
  const [refreshTask, setRefreshTask] = useState('')
  const [currentCrossingId, setCurrentCrossingId] = useState(null)
  const [flagKind, setFlagKind] = useState(null)
  const [listeningOpen, setListeningOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // ─── Load all profile + today's state ───────────────────────────────────
  useEffect(() => {
    if (!user) { setProfileLoading(false); return }
    let cancelled = false

    async function load() {
      setProfileLoading(true)
      try {
        const today = getLocalDateStr()

        // horizon_profile — ia_statements per domain
        const { data: hpRows } = await supabase
          .from('horizon_profile')
          .select('domain, ia_statement, avatar_statement')
          .eq('user_id', user.id)
        if (cancelled) return

        const iamMap = {}
        let protectorFromAvatar = null
        if (hpRows) {
          for (const r of hpRows) {
            if (r.ia_statement) iamMap[r.domain] = r.ia_statement
            // Optional: pull protector covenant from inner_game's avatar_statement
            // (architecture allows this until a proper profile field exists)
            if (r.domain === 'inner_game' && r.avatar_statement && r.avatar_statement.length > 80) {
              protectorFromAvatar = r.avatar_statement
            }
          }
        }
        setIamStatements(iamMap)
        if (protectorFromAvatar) setProtectorCovenant(protectorFromAvatar)

        // map_results — life_ia_statement (synthesised Horizon Self)
        const { data: mapRow } = await supabase
          .from('map_results')
          .select('life_ia_statement, horizon_goal_user')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (cancelled) return

        if (mapRow) {
          setHasMap(true)
          if (mapRow.life_ia_statement) setHorizonSelfStatement(mapRow.life_ia_statement)
        }

        // contributor_profiles_beta — ical_url for calendar integration
        const { data: profileRow } = await supabase
          .from('contributor_profiles_beta')
          .select('ical_url')
          .eq('user_id', user.id)
          .maybeSingle()
        if (cancelled) return
        if (profileRow?.ical_url) setIcalUrl(profileRow.ical_url)

        // Today's morning run
        const { data: runRow } = await supabase
          .from('horizon_practice_morning_runs')
          .select('*')
          .eq('user_id', user.id)
          .eq('run_date', today)
          .maybeSingle()
        if (cancelled) return

        setTodayRun(runRow)

        // Today's thresholds
        const { data: thresholdRows } = await supabase
          .from('horizon_practice_thresholds')
          .select('*')
          .eq('user_id', user.id)
          .eq('run_date', today)
          .order('time_label', { ascending: true, nullsFirst: false })
        if (cancelled) return

        if (thresholdRows) setThresholds(thresholdRows)

        // Recent entries (last 30 days, capped at 100 for the log view)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
        const { data: entryRows } = await supabase
          .from('horizon_practice_entries')
          .select('*')
          .eq('user_id', user.id)
          .gte('occurred_at', thirtyDaysAgo)
          .order('occurred_at', { ascending: false })
          .limit(100)
        if (cancelled) return

        if (entryRows) setEntries(entryRows)

        // Determine initial view: if morning complete today, go to day surface
        if (runRow?.completed_at) setView('day')
        else setView('morning')

      } catch (err) {
        console.error('Horizon Practice load error:', err)
        setView('day')  // graceful fallback
      } finally {
        if (!cancelled) setProfileLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user])

  // ─── Action handlers ──────────────────────────────────────────────────
  async function handleMorningComplete(morningThresholds) {
    // morningThresholds were already inserted during the Plan beat
    // Refresh from server to get canonical state
    if (user) {
      const today = getLocalDateStr()
      const { data: runRow } = await supabase
        .from('horizon_practice_morning_runs')
        .select('*')
        .eq('user_id', user.id)
        .eq('run_date', today)
        .maybeSingle()
      if (runRow) setTodayRun(runRow)

      const { data: thresholdRows } = await supabase
        .from('horizon_practice_thresholds')
        .select('*')
        .eq('user_id', user.id)
        .eq('run_date', today)
        .order('time_label', { ascending: true, nullsFirst: false })
      if (thresholdRows) setThresholds(thresholdRows)
    }
    setView('day')
  }

  async function handleHitOrDrift(kind, payload) {
    if (!user) return
    const dbKind = kind === 'hit' ? 'hit' : 'drift'
    const { data: inserted } = await supabase
      .from('horizon_practice_entries')
      .insert({
        user_id: user.id,
        kind: dbKind,
        text: payload.text || null,
      })
      .select('*')
      .maybeSingle()
    if (inserted) setEntries(e => [inserted, ...e])
    setFlagKind(null)
  }

  async function handleListening(payload) {
    if (!user) return
    Chimes.archive()
    screenFlash()
    const { data: inserted } = await supabase
      .from('horizon_practice_entries')
      .insert({
        user_id: user.id,
        kind: 'listening_glow',
        text: payload.text,
        from_who: payload.from,
      })
      .select('*')
      .maybeSingle()
    if (inserted) setEntries(e => [inserted, ...e])
    setListeningOpen(false)
  }

  async function handleReceipt(payload) {
    if (!user) return
    Chimes.archive()
    screenFlash()
    const formatted = `I used to ${payload.used}. Now I ${payload.now}.`
    const { data: inserted } = await supabase
      .from('horizon_practice_entries')
      .insert({
        user_id: user.id,
        kind: 'receipt',
        text: formatted,
        used_to: payload.used,
        now_i: payload.now,
      })
      .select('*')
      .maybeSingle()
    if (inserted) setEntries(e => [inserted, ...e])
    setReceiptOpen(false)
  }

  async function handleRefreshComplete({ task, response, variant }) {
    if (!user) return
    screenFlash()
    const isCross = variant === 'cross'
    const { data: inserted } = await supabase
      .from('horizon_practice_entries')
      .insert({
        user_id: user.id,
        kind: 'hit',
        text: `${task} · ${response}`,
        refresh_task: task,
        refresh_response: response,
        refresh_variant: variant,
        threshold_id: isCross ? currentCrossingId : null,
      })
      .select('*')
      .maybeSingle()
    if (inserted) setEntries(e => [inserted, ...e])

    if (isCross && currentCrossingId) {
      const now = new Date().toISOString()
      await supabase
        .from('horizon_practice_thresholds')
        .update({ crossed_at: now })
        .eq('id', currentCrossingId)
      setThresholds(ts => ts.map(t =>
        t.id === currentCrossingId ? { ...t, crossed_at: now } : t
      ))
      setCurrentCrossingId(null)
    }

    setRefreshOpen(false)
  }

  function handleCross(threshold) {
    setCurrentCrossingId(threshold.id)
    setRefreshVariant('cross')
    setRefreshTask(threshold.title + (threshold.note ? ` — ${threshold.note}` : ''))
    setRefreshOpen(true)
  }

  function handleStandardRefresh() {
    setRefreshVariant('standard')
    setRefreshTask('')
    setRefreshOpen(true)
  }

  function handleDriftRefresh() {
    setRefreshVariant('standard')
    setRefreshTask('')
    setTimeout(() => setRefreshOpen(true), 200)
  }

  async function handleSaveIcalUrl(url) {
    if (!user) return
    setIcalUrl(url)
    await supabase
      .from('contributor_profiles_beta')
      .update({ ical_url: url })
      .eq('user_id', user.id)
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  if (authLoading || accessLoading || profileLoading) {
    return (
      <div style={{ background: tokens.bg, minHeight: '100vh' }}>
        <Nav activePath="nextus-self" hideHamburger={view === 'morning'} />
        <div className="loading" />
      </div>
    )
  }

  return (
    <div style={{ background: tokens.bg, minHeight: '100vh' }}>
        <Nav activePath="nextus-self" hideHamburger={view === 'morning'} />

        {/* Global animations */}
        <style>{`
          @keyframes hp-dot-pulse {
            0%, 100% { opacity: 0.5; }
            50%      { opacity: 1; }
          }
          @keyframes hp-pulse-card {
            0%   { transform: scale(1);    box-shadow: 0 0 0 0 ${tokens.goldStrong}; }
            50%  { transform: scale(1.015); box-shadow: 0 0 0 14px transparent; }
            100% { transform: scale(1);    box-shadow: 0 0 0 0 transparent; }
          }
          @keyframes hp-fade-in {
            0%   { opacity: 0; transform: translateY(8px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .hp-card-pulse { animation: hp-pulse-card 0.9s ease-out; }
          .hp-fade-in    { animation: hp-fade-in 0.5s ease-out; }
          .hp-ground-step {
            opacity: 0;
            animation: hp-fade-in 0.6s ease-out forwards;
          }
        `}</style>

        {/* Map prerequisite */}
        {!hasMap && !skipMap && (
          <MapRedirect onSkip={() => setSkipMap(true)} />
        )}

        {/* Morning view */}
        {(hasMap || skipMap) && view === 'morning' && (
          <div style={{ paddingTop: 'clamp(80px, 10vw, 110px)' }}>
            <MorningSequence
              userId={user?.id}
              iamStatements={iamStatements}
              horizonSelfStatement={horizonSelfStatement}
              protectorCovenant={protectorCovenant}
              icalUrl={icalUrl}
              onSaveIcalUrl={handleSaveIcalUrl}
              onComplete={handleMorningComplete}
              onClose={() => setView('day')}
            />
          </div>
        )}

        {/* Day view */}
        {(hasMap || skipMap) && view === 'day' && (
          <div style={{ maxWidth: '760px', margin: '0 auto',
            padding: 'clamp(88px, 10vw, 112px) clamp(20px, 4vw, 40px) 80px' }}>

            <div style={{
              ...sc, fontSize: '10px', letterSpacing: '0.20em',
              color: tokens.whisper, textTransform: 'uppercase',
              marginBottom: '36px', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', gap: '12px', flexWrap: 'wrap',
            }}>
              <span>{todayRun?.completed_at ? 'Active' : 'Day surface'}</span>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <button onClick={() => setSettingsOpen(true)} style={{
                  background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                  font: 'inherit', letterSpacing: 'inherit', color: tokens.gold,
                }}>Settings</button>
                <button onClick={() => setView('morning')} style={{
                  background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                  font: 'inherit', letterSpacing: 'inherit', color: tokens.gold,
                }}>{todayRun?.completed_at ? '← Pre-flight' : '← Run pre-flight'}</button>
              </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <Heading size="xl">
                {getGreeting()}
                {user && <>, <em style={{ color: tokens.gold,
                  fontStyle: 'normal' }}>{
                    user.user_metadata?.full_name?.split(' ')[0] ||
                    user.user_metadata?.name?.split(' ')[0] ||
                    (user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1))
                  }</em></>}.
              </Heading>
            </div>

            <div style={{ marginBottom: '36px' }}>
              <HorizonSelfPanel
                statement={horizonSelfStatement}
                onRefresh={handleStandardRefresh}
              />
            </div>

            <div style={{ marginBottom: '36px' }}>
              <ActiveThresholds thresholds={thresholds} onCross={handleCross} />
            </div>

            <div style={{ marginBottom: '36px' }}>
              <HitDriftBar
                onFlag={(k) => setFlagKind(k)}
                onCapture={(k) => {
                  if (k === 'listening') setListeningOpen(true)
                  else if (k === 'receipt') setReceiptOpen(true)
                }}
              />
            </div>

            <div style={{ marginBottom: '36px' }}>
              <AmbientStrip
                iam={DOMAIN_ORDER
                  .filter(d => iamStatements[d])
                  .map(d => ({ domain: d, label: DOMAIN_LABELS[d], text: extractIamLine(iamStatements[d]) }))
                }
                listening={entries.filter(e => e.kind === 'listening_glow').slice(0, 5)
                  .map(e => ({ text: e.text, from: e.from_who }))
                }
              />
            </div>

            <div style={{ marginBottom: '36px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'baseline', marginBottom: '8px' }}>
                <Eyebrow>Today's log</Eyebrow>
                <button onClick={() => setLogOpen(true)} style={{
                  background: 'transparent', border: 'none', padding: 0,
                  ...sc, fontSize: '11px', fontWeight: 600, letterSpacing: '0.16em',
                  color: tokens.gold, cursor: 'pointer',
                  borderBottom: `1px solid ${tokens.goldFaint}`, paddingBottom: '2px',
                }}>Full log →</button>
              </div>
              <RecentEntries
                entries={entries.filter(e => {
                  const d = new Date(e.occurred_at)
                  return getLocalDateStr(d) === getLocalDateStr()
                }).slice(0, 5)}
                onOpenJournal={() => setLogOpen(true)}
              />
            </div>
          </div>
        )}

        {/* Modals */}
        <HorizonSelfRefresh
          open={refreshOpen}
          onClose={() => setRefreshOpen(false)}
          variant={refreshVariant}
          prefilledTask={refreshTask}
          onComplete={handleRefreshComplete}
        />
        <HitOrDriftCapture
          kind={flagKind}
          onClose={() => setFlagKind(null)}
          onSave={handleHitOrDrift}
          onRunRefresh={handleDriftRefresh}
        />
        <ListeningCapture
          open={listeningOpen}
          onClose={() => setListeningOpen(false)}
          onSave={handleListening}
        />
        <ReceiptCapture
          open={receiptOpen}
          onClose={() => setReceiptOpen(false)}
          onSave={handleReceipt}
        />
        <LogView
          open={logOpen}
          onClose={() => setLogOpen(false)}
          entries={entries}
        />
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      </div>
  )
}
