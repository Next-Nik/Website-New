// ────────────────────────────────────────────────────────────────────────────
// Horizon Practice — the live tool.
//
// Expresses Horizon Practice Living Architecture v1.3:
//   - The morning is six beats: Commit · Ground · I Am · Open Breath · Plan · Act
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
import { useStreak } from './useStreak'

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
  whisper: 'rgba(15,21,35,0.55)',  // raised to opacity floor per design system
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
      color: dim ? tokens.ghost : tokens.meta, lineHeight: 1.65,
      fontWeight: 400, fontStyle: italic ? 'italic' : 'normal', margin: '0 0 12px', ...style,
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
  const beats = ['·', '·', '·', '·', '·', '·']
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
                ...sc, fontSize: '10px', fontWeight: 600, letterSpacing: '0.18em',
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
                <div style={{ ...body, fontSize: '13px',
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
                    ...body, fontSize: '13px',
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
// Morning Sequence — the five beats
// ────────────────────────────────────────────────────────────────────────────

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
    // Skip intro entirely — start at the charge ready countdown
    // Only restore if they were mid-session
    if (saved === 'charge-work' || saved === 'charge-rest') return 'charge-ready'
    if (saved === 'open-running') return 'charge-done'
    if (saved && saved !== 'intro') return saved
    return 'charge-ready'  // always skip intro
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

      {/* ── Charge: ready countdown ── */}
      {phase === 'charge-ready' && (
        <div className="hp-fade-in" style={{ textAlign: 'center', padding: '32px 0' }}>
          <Eyebrow style={{ marginBottom: '8px' }}>
            Round {chargeRound} of {CHARGE_ROUNDS} · Charge breath
          </Eyebrow>
          <Body dim style={{ margin: '0 0 20px', fontSize: '14px' }}>
            Fast, deep breaths. Focus on the exhale.
          </Body>
          <div style={{
            ...body, fontSize: 'clamp(60px, 14vw, 88px)', fontWeight: 300,
            color: tokens.gold, lineHeight: 1, marginBottom: '16px',
          }}>{tick}</div>
          <Body dim style={{ margin: '0 0 28px' }}>Ready…</Body>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <GhostButton onClick={() => { clearGroundPhase(); onBack() }}>← Back</GhostButton>
            <GhostButton onClick={() => { clearGroundPhase(); onComplete() }}>Skip</GhostButton>
          </div>
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

function MorningSequence({ userId, iamStatements, horizonSelfStatement, protectorCovenant, icalUrl, onSaveIcalUrl, onComplete, onClose }) {
  const [beat, setBeat] = useState(1)
  const [sweep, setSweep] = useState(false)
  const [saving, setSaving] = useState(false)
  const [runId, setRunId] = useState(null)

  // Commit
  const [answers, setAnswers] = useState({ ready: null, allowed: null, choosing: null })
  const [showCovenant, setShowCovenant] = useState(false)

  // Plan — thresholds the user adds
  const [thresholds, setThresholds] = useState([])

  // Anchor
  const [iamIdx, setIamIdx] = useState(0)
  const [voicedFinal, setVoicedFinal] = useState(false)
  const [pulseKey, setPulseKey] = useState(0)
  const [fastMode, setFastMode] = useState(false)
  const voicedDomainsRef = useRef([])

  // The seven iam statements ordered by DOMAIN_ORDER
  const orderedIam = DOMAIN_ORDER
    .map(d => ({ domain: d, label: DOMAIN_LABELS[d], text: iamStatements[d] }))
    .filter(s => s.text && s.text.trim())

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
    const rid = await ensureRun()
    if (rid && userId) {
      await supabase.from('horizon_practice_morning_runs').update({
        ground_confirmed_at: new Date().toISOString(),
      }).eq('id', rid)
    }
    clearGroundPhase()
    setBeat(3)
  }

  async function moveToAnchorBreath() {
    setBeat(4)
  }


  async function moveToPlan() {
    setBeat(5)
  }

  async function moveToAnchor() {
    const rid = await ensureRun()
    if (rid && userId && thresholds.length > 0) {
      // Persist thresholds to horizon_practice_thresholds
      const today = getLocalDateStr()
      const rows = thresholds
        .filter(t => !t.id)  // only insert new ones
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
        // Update local with real ids
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
    setBeat(4)
  }

  function handleIamVoiced() {
    Chimes.iamVoiced()
    setPulseKey(k => k + 1)
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
    setTimeout(() => setBeat(5), 800)
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
      {beat === 1 && (
        <div className="hp-fade-in">
          <Eyebrow style={{ marginBottom: '12px' }}>Commit</Eyebrow>
          <Heading size="lg" style={{ marginBottom: '16px' }}>
            Ready to step into your{' '}
            <em style={{ color: tokens.gold, fontStyle: 'italic' }}>Horizon</em>?
          </Heading>

          <div style={{ marginTop: '28px' }}>
            {[
              { key: 'ready',    label: 'Are you ready to step into your Horizon Self?' },
              { key: 'allowed',  label: 'Are you allowed to live as your Horizon Self?' },
              { key: 'choosing', label: 'Are you choosing to step into your Horizon Self?' },
            ].map((q) => (
              <Card key={q.key} style={{ marginBottom: '12px', padding: '18px 22px' }}>
                <p style={{
                  ...serif, fontSize: '18px',
                  color: tokens.dark, margin: '0 0 14px', lineHeight: 1.4, fontWeight: 300,
                }}>{q.label}</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['yes', 'no'].map(ans => (
                    <button key={ans}
                      onClick={() => {
                        const next = { ...answers, [q.key]: ans }
                        setAnswers(next)
                        // Auto-advance when all three are yes
                        if (ans === 'yes' && next.ready === 'yes' && next.allowed === 'yes' && next.choosing === 'yes') {
                          setTimeout(() => moveToGround(), 320)
                        }
                      }}
                      style={{
                        flex: 1,
                        background: answers[q.key] === ans
                          ? (ans === 'yes' ? tokens.goldChrome : tokens.ghost) : 'transparent',
                        color: answers[q.key] === ans ? '#FFFFFF'
                          : (ans === 'yes' ? tokens.gold : tokens.ghost),
                        border: `1px solid ${answers[q.key] === ans
                          ? (ans === 'yes' ? tokens.goldChrome : tokens.ghost) : tokens.goldFaint}`,
                        borderRadius: '40px', padding: '10px 18px',
                        ...sc, fontSize: '12px', fontWeight: 600, letterSpacing: '0.18em',
                        textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s',
                      }}>{ans}</button>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {protectorCovenant && (
            <div style={{ marginTop: '8px', marginBottom: '24px' }}>
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
                    margin: 0, ...serif, fontSize: '18px', fontWeight: 300,
                    color: tokens.meta, lineHeight: 1.6,
                  }}>{protectorCovenant}</p>
                </div>
              )}
            </div>
          )}

          {anyNo && (
            <Card style={{ background: tokens.goldTint, marginBottom: '24px' }}>
              <Eyebrow color="ghost" style={{ marginBottom: '8px', fontSize: '11px' }}>A no is data</Eyebrow>
              <Body dim style={{ margin: 0, fontSize: '14px' }}>
                Run lighter today. Or close and return.
              </Body>
            </Card>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            {anyNo && <GhostButton onClick={moveToGround}>Continue →</GhostButton>}
            <SolidButton onClick={moveToGround} disabled={!allYes && !anyNo}
              style={{ display: anyNo ? 'none' : 'inline-block' }}>Next →</SolidButton>
          </div>
        </div>
      )}

      {/* ━━━ GROUND ━━━ */}
      {/* ━━━ GROUND — breath practice ━━━ */}
      {beat === 2 && (
        <GroundBeat onComplete={moveToIAm} onBack={() => setBeat(1)} />
      )}

      {/* ━━━ ANCHOR — single statement ━━━ */}
      {beat === 3 && !voicedFinal && !fastMode && orderedIam.length > 0 && (
        <div className="hp-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'baseline', marginBottom: '12px' }}>
            <Eyebrow>Anchor · {orderedIam[iamIdx].label}</Eyebrow>
            <button onClick={() => setFastMode(true)} style={{
              background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
              ...sc, fontSize: '10px', fontWeight: 600, letterSpacing: '0.18em',
              color: tokens.ghost, textTransform: 'uppercase',
              borderBottom: `1px solid ${tokens.goldFaint}`,
            }}>Fast mode</button>
          </div>
          <Heading size="lg" style={{ marginBottom: '16px' }}>
            Declare it <em style={{ color: tokens.gold, fontStyle: 'italic' }}>aloud</em>.
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
              ...serif, fontSize: 'clamp(22px, 3.2vw, 28px)', fontWeight: 400,
              fontStyle: 'italic', color: tokens.gold, lineHeight: 1.45,
              margin: 0, maxWidth: '460px', marginLeft: 'auto', marginRight: 'auto',
            }}>{orderedIam[iamIdx].text}</p>
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

      {/* ━━━ ANCHOR — fast mode ━━━ */}
      {beat === 3 && !voicedFinal && fastMode && orderedIam.length > 0 && (
        <div className="hp-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'baseline', marginBottom: '12px' }}>
            <Eyebrow>Anchor · fast run</Eyebrow>
            <button onClick={() => setFastMode(false)} style={{
              background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
              ...sc, fontSize: '10px', fontWeight: 600, letterSpacing: '0.18em',
              color: tokens.ghost, textTransform: 'uppercase',
              borderBottom: `1px solid ${tokens.goldFaint}`,
            }}>One at a time</button>
          </div>
          <Heading size="lg" style={{ marginBottom: '16px' }}>
            Declare them <em style={{ color: tokens.gold, fontStyle: 'italic' }}>aloud</em>.
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
                  ...serif, fontSize: '17px', fontStyle: 'italic', color: tokens.gold,
                  lineHeight: 1.45, margin: 0,
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

      {/* ━━━ ANCHOR — synthesised Horizon Self ━━━ */}
      {beat === 3 && voicedFinal && (
        <div className="hp-fade-in">
          <Eyebrow style={{ marginBottom: '12px' }}>Anchor · integrated</Eyebrow>
          <Heading size="lg" style={{ marginBottom: '16px' }}>
            Now the <em style={{ color: tokens.gold, fontStyle: 'italic' }}>whole</em>.
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
                ...serif, fontSize: 'clamp(19px, 2.6vw, 23px)', fontWeight: 400,
                fontStyle: 'italic', color: tokens.gold, lineHeight: 1.55, margin: 0,
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
            <SolidButton onClick={handleHorizonSelfVoiced}>Locked · Act →</SolidButton>
          </div>
        </div>
      )}

      {/* ━━━ OPEN BREATH ━━━ */}
      {beat === 4 && (
        <OpenBreathBeat onComplete={moveToPlan} onBack={() => setBeat(3)} />
      )}

      {beat === 5 && (
        <div className="hp-fade-in">
          <Eyebrow style={{ marginBottom: '12px' }}>Plan</Eyebrow>
          <Heading size="lg" style={{ marginBottom: '16px' }}>
            Lock the <em style={{ color: tokens.gold, fontStyle: 'italic' }}>thresholds</em>.
          </Heading>
          <Body dim>The moments your Horizon Self will be tested today.</Body>

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
            <SolidButton onClick={moveToAct}>Next →</SolidButton>
          </div>
        </div>
      )}

      {/* ━━━ PLAN ━━━ */}

      {/* ━━━ ACT ━━━ */}
      {beat === 6 && (
        <div className="hp-fade-in" style={{ textAlign: 'center', padding: '40px 0' }}>
          <Eyebrow style={{ marginBottom: '14px' }}>Act</Eyebrow>
          <Heading size="lg" style={{ marginBottom: '14px' }}>
            You are <em style={{ color: tokens.gold, fontStyle: 'italic' }}>live</em>.
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
                ...serif, fontSize: '18px', fontWeight: 300,
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
  const [his, setHis] = useState('')

  useEffect(() => {
    if (open) {
      setStep(1)
      setTask(prefilledTask || '')
      setHis('')
    }
  }, [open, prefilledTask])

  if (!open) return null
  const isCross = variant === 'cross'

  function finish() {
    if (isCross) Chimes.cross()
    else Chimes.backIn()
    onComplete({ task, his, variant })
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
          <Heading size="md" italic style={{ marginBottom: '24px' }}>
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
          <Heading size="md" italic style={{ marginBottom: '24px' }}>
            How would your Horizon Self handle this?
          </Heading>
          <textarea value={his} onChange={e => setHis(e.target.value)} autoFocus
            style={{ ...inputStyle(), minHeight: '110px' }}/>
          <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'space-between' }}>
            <GhostButton onClick={() => setStep(1)}>← Back</GhostButton>
            <SolidButton onClick={() => setStep(3)} disabled={!his.trim()}>Next →</SolidButton>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="hp-fade-in">
          <Heading size="md" italic style={{ marginBottom: '8px' }}>
            Anchor in. Execute as him.
          </Heading>

          <div style={{ marginTop: '24px' }}>
            <Eyebrow style={{ marginBottom: '8px', fontSize: '11px' }}>What's in front of you</Eyebrow>
            <p style={{
              ...body, fontSize: '14.5px', color: tokens.ghost, lineHeight: 1.5,
              margin: '0 0 22px', paddingLeft: '14px',
              borderLeft: `1px solid ${tokens.goldFaint}`,
            }}>{task}</p>

            <Eyebrow style={{ marginBottom: '8px', fontSize: '11px' }}>Your move</Eyebrow>
            <p style={{
              ...serif, fontStyle: 'italic', fontSize: '21px', color: tokens.gold,
              lineHeight: 1.5, margin: 0, padding: '20px 22px',
              background: tokens.goldTint, borderRadius: '12px',
              border: `1px solid ${tokens.goldChrome}`,
            }}>{his}</p>
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
          ...serif, fontStyle: 'italic', fontSize: 'clamp(17px, 2.4vw, 20px)',
          color: tokens.meta, lineHeight: 1.55,
          maxWidth: '520px', margin: '0 auto 24px',
        }}>{statement}</p>
      ) : (
        <p style={{
          ...body, fontStyle: 'italic', fontSize: '15px',
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
// ── Priority config ────────────────────────────────────────────────────────────
const PRIORITY = {
  1: { label: 'P1', color: '#C0392B', bg: 'rgba(192,57,43,0.08)', title: 'High' },
  2: { label: 'P2', color: '#D4832A', bg: 'rgba(212,131,42,0.08)', title: 'Medium' },
  3: { label: 'P3', color: '#2980B9', bg: 'rgba(41,128,185,0.08)', title: 'Low' },
}

function PriorityFlag({ priority, size = 14, onClick }) {
  if (!priority) return (
    <button onClick={onClick} style={{
      background: 'transparent', border: 'none', padding: '2px', cursor: onClick ? 'pointer' : 'default',
      display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.35,
    }} title="Set priority">
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
        <path d="M2 2h10v7H2z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
        <path d="M2 9v5" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    </button>
  )
  const p = PRIORITY[priority]
  return (
    <button onClick={onClick} style={{
      background: p.bg, border: 'none', padding: '2px 6px', cursor: onClick ? 'pointer' : 'default',
      borderRadius: '4px', display: 'flex', alignItems: 'center',
    }} title={p.title}>
      <span style={{ fontSize: '10px', fontWeight: 700, color: p.color, letterSpacing: '0.06em', fontFamily: 'Cormorant SC, Georgia, serif' }}>{p.label}</span>
    </button>
  )
}


function TasksView({ thresholds, userId, calEvents, calLoading, icalUrl,
  tab, onTabChange, onComplete, onUncomplete, onCross,
  onSomeday, onSetDueDate, onSetPriority, onDelete, onAdd, onBack }) {

  const [newText, setNewText]     = useState('')
  const [newDate, setNewDate]     = useState('')
  const [newPriority, setNewPriority] = useState(null)  // 1|2|3|null
  const [adding, setAdding]       = useState(false)
  const [showDone, setShowDone]   = useState(false)

  const today = getLocalDateStr()
  const todayDate = new Date(today + 'T00:00:00')

  // ── Derived task sets ──────────────────────────────────────────────────────

  // Overdue: due_date before today, open
  const overdue = thresholds.filter(t =>
    t.status === 'open' && t.due_date && t.due_date < today
  ).sort((a, b) => a.due_date.localeCompare(b.due_date))

  // Today: run_date = today (no due_date) OR due_date = today, open
  const todayTasks = thresholds.filter(t =>
    t.status === 'open' &&
    (!t.due_date && t.run_date === today) ||
    (t.due_date === today)
  )

  // Upcoming: due_date > today, open — grouped by date
  const upcomingTasks = thresholds.filter(t =>
    t.status === 'open' && t.due_date && t.due_date > today
  ).sort((a, b) => a.due_date.localeCompare(b.due_date))

  // Group upcoming by date
  const upcomingByDate = upcomingTasks.reduce((acc, t) => {
    const d = t.due_date
    if (!acc[d]) acc[d] = []
    acc[d].push(t)
    return acc
  }, {})

  // Backlog: open, no due_date, run_date = today or carried
  const backlog = thresholds.filter(t =>
    t.status === 'open' && !t.due_date && t.run_date !== today
      ? false  // old undated tasks without carryover aren't shown
      : t.status === 'someday'
        ? false
        : t.status === 'open' && !t.due_date
  ).filter(t => t.run_date !== today || t.carried_from_id || !t.due_date)

  // Someday
  const someday = thresholds.filter(t => t.status === 'someday')

  // Done: last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const done = thresholds.filter(t =>
    t.status === 'done' && t.completed_at &&
    new Date(t.completed_at) >= sevenDaysAgo
  ).sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))

  // ── Calendar + today tasks merged timeline ─────────────────────────────────
  const scheduledToday = todayTasks.filter(t => t.time_label)
  const unscheduledToday = todayTasks.filter(t => !t.time_label)

  const timeline = [
    ...calEvents.map(e => ({ _type: 'event', ...e })),
    ...scheduledToday.map(t => ({ _type: 'task', ...t })),
  ].sort((a, b) => (a.time_label || '').localeCompare(b.time_label || ''))

  // ── Add task ───────────────────────────────────────────────────────────────
  async function handleAdd() {
    if (!newText.trim() || !userId) return
    setAdding(true)
    const { data: inserted } = await supabase
      .from('horizon_practice_thresholds')
      .insert({
        user_id:   userId,
        title:     newText.trim(),
        run_date:  today,
        due_date:  newDate || null,
        priority:  newPriority || null,
        status:    'open',
        source:    'manual',
      })
      .select('*')
      .maybeSingle()
    setAdding(false)
    if (inserted) { onAdd(inserted); setNewText(''); setNewDate(''); setNewPriority(null) }
  }

  // ── Format date label ──────────────────────────────────────────────────────
  function fmtDate(d) {
    if (!d) return ''
    const dt = new Date(d + 'T00:00:00')
    const diff = Math.round((dt - todayDate) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    if (diff === -1) return 'Yesterday'
    if (diff < -1) return `${Math.abs(diff)} days ago`
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    if (diff <= 6) return days[dt.getDay()]
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // ── Due date urgency colour ───────────────────────────────────────────────
  function dueDateColor(dueDate, status) {
    if (!dueDate || status === 'done') return tokens.ghost
    const diff = Math.round((new Date(dueDate + 'T00:00:00') - todayDate) / 86400000)
    if (diff < 0)  return '#C0392B'   // overdue — red
    if (diff === 0) return '#C0392B'  // due today — red
    if (diff <= 2)  return '#D4832A'  // due soon — amber
    return tokens.ghost               // fine — muted
  }

  // ── Shared styles ──────────────────────────────────────────────────────────
  const tabStyle = (active) => ({
    background: 'transparent',
    border: 'none',
    padding: '8px 16px',
    cursor: 'pointer',
    ...sc,
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.16em',
    color: active ? tokens.gold : tokens.ghost,
    borderBottom: `2px solid ${active ? tokens.gold : 'transparent'}`,
    textTransform: 'uppercase',
    transition: 'color 0.2s, border-color 0.2s',
  })

  return (
    <div className="hp-fade-in" style={{
      maxWidth: '640px', margin: '0 auto',
      padding: 'clamp(88px, 10vw, 112px) clamp(20px, 4vw, 40px) 80px',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <Heading size="lg">Tasks</Heading>
        <GhostButton onClick={onBack}>← Back</GhostButton>
      </div>

      {/* Add task */}
      <div style={{
        background: '#FFFFFF', border: `1px solid ${tokens.goldFaint}`,
        borderRadius: '12px', padding: '14px 18px', marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: newDate !== undefined ? '10px' : 0 }}>
          <input
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Add a task…"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              ...body, fontSize: '15px', color: tokens.meta, fontWeight: 400,
            }}
          />
          <button onClick={handleAdd} disabled={!newText.trim() || adding} style={{
            background: newText.trim() ? tokens.gold : tokens.goldFaint,
            color: '#FFF', border: 'none', borderRadius: '8px',
            padding: '8px 16px', cursor: newText.trim() ? 'pointer' : 'default',
            ...sc, fontSize: '11px', fontWeight: 600, letterSpacing: '0.14em',
            transition: 'background 0.2s',
          }}>Add</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="date"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            style={{
              border: `1px solid ${tokens.goldFaint}`, borderRadius: '6px',
              padding: '4px 8px', background: 'transparent',
              ...sc, fontSize: '11px', color: newDate ? tokens.gold : tokens.ghost,
              letterSpacing: '0.10em', outline: 'none', cursor: 'pointer',
            }}
          />
          {newDate && (
            <span style={{ ...sc, fontSize: '11px', color: tokens.gold, letterSpacing: '0.10em' }}>
              {fmtDate(newDate)}
            </span>
          )}
          <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
            {[1,2,3].map(p => (
              <button key={p} onClick={() => setNewPriority(newPriority === p ? null : p)} style={{
                background: newPriority === p ? PRIORITY[p].bg : 'transparent',
                border: `1px solid ${newPriority === p ? PRIORITY[p].color : tokens.goldFaint}`,
                borderRadius: '4px', padding: '3px 8px', cursor: 'pointer',
              }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: newPriority === p ? PRIORITY[p].color : tokens.ghost, fontFamily: 'Cormorant SC, Georgia, serif', letterSpacing: '0.06em' }}>
                  P{p}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: '24px',
        borderBottom: `1px solid ${tokens.goldFaint}`,
        overflowX: 'auto',
      }}>
        {[
          { key: 'today',    label: `Today${overdue.length > 0 ? ` +${overdue.length}` : ''}` },
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'backlog',  label: 'Backlog' },
          { key: 'done',     label: 'Done' },
        ].map(t => (
          <button key={t.key} onClick={() => onTabChange(t.key)} style={tabStyle(tab === t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TODAY TAB ── */}
      {tab === 'today' && (
        <div>
          {/* Overdue */}
          {overdue.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <Eyebrow style={{ marginBottom: '8px', color: '#C0392B' }}>Overdue</Eyebrow>
              {overdue.map(t => (
                <TaskRow key={t.id} task={t} fmtDate={fmtDate} dueDateColor={dueDateColor}
                  onComplete={onComplete} onUncomplete={onUncomplete}
                  onSomeday={onSomeday} onSetDueDate={onSetDueDate} onSetPriority={onSetPriority} onDelete={onDelete} />
              ))}
            </div>
          )}

          {/* Schedule (calendar + timed tasks) */}
          {(timeline.length > 0 || calLoading) && (
            <div style={{ marginBottom: '28px' }}>
              <Eyebrow style={{ marginBottom: '8px' }}>Schedule</Eyebrow>
              {calLoading && <Body dim style={{ margin: '0 0 8px', fontSize: '13px' }}>Loading calendar…</Body>}
              {timeline.map((item, i) => item._type === 'event' ? (
                <CalEventRow key={item.id || i} event={item} />
              ) : (
                <TaskRow key={item.id} task={item} fmtDate={fmtDate} dueDateColor={dueDateColor}
                  onComplete={onComplete} onUncomplete={onUncomplete}
                  onSomeday={onSomeday} onSetDueDate={onSetDueDate} onSetPriority={onSetPriority} onDelete={onDelete} />
              ))}
            </div>
          )}

          {/* Unscheduled today tasks */}
          {unscheduledToday.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              {timeline.length > 0 && <Eyebrow style={{ marginBottom: '8px' }}>Tasks</Eyebrow>}
              {unscheduledToday.map(t => (
                <TaskRow key={t.id} task={t} fmtDate={fmtDate} dueDateColor={dueDateColor}
                  onComplete={onComplete} onUncomplete={onUncomplete}
                  onSomeday={onSomeday} onSetDueDate={onSetDueDate} onSetPriority={onSetPriority} onDelete={onDelete} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {overdue.length === 0 && timeline.length === 0 && unscheduledToday.length === 0 && !calLoading && (
            <Card style={{ textAlign: 'center', padding: '32px' }}>
              <Body dim style={{ margin: '0 0 6px' }}>
                {icalUrl ? 'Nothing on for today.' : 'No tasks yet.'}
              </Body>
              {!icalUrl && (
                <Body dim style={{ margin: 0, fontSize: '13px' }}>
                  Connect your calendar in the morning Practice to see your day here.
                </Body>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ── UPCOMING TAB ── */}
      {tab === 'upcoming' && (
        <div>
          {Object.keys(upcomingByDate).length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '32px' }}>
              <Body dim style={{ margin: 0 }}>No upcoming tasks. Add one with a due date.</Body>
            </Card>
          ) : (
            Object.entries(upcomingByDate).map(([date, tasks]) => (
              <div key={date} style={{ marginBottom: '24px' }}>
                <div style={{
                  ...sc, fontSize: '11px', fontWeight: 600, letterSpacing: '0.18em',
                  color: tokens.gold, textTransform: 'uppercase',
                  marginBottom: '8px', paddingBottom: '6px',
                  borderBottom: `1px solid ${tokens.goldFaint}`,
                }}>
                  {fmtDate(date)} <span style={{ color: tokens.ghost, fontWeight: 400 }}>· {date}</span>
                </div>
                {tasks.map(t => (
                  <TaskRow key={t.id} task={t} fmtDate={fmtDate} dueDateColor={dueDateColor}
                    onComplete={onComplete} onUncomplete={onUncomplete}
                    onSomeday={onSomeday} onSetDueDate={onSetDueDate} onSetPriority={onSetPriority} onDelete={onDelete} />
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── BACKLOG TAB ── */}
      {tab === 'backlog' && (
        <div>
          {backlog.length === 0 && someday.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '32px' }}>
              <Body dim style={{ margin: 0 }}>Backlog is clear.</Body>
            </Card>
          ) : (
            <>
              {backlog.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                  <Eyebrow style={{ marginBottom: '8px' }}>No date</Eyebrow>
                  {backlog.map(t => (
                    <TaskRow key={t.id} task={t} fmtDate={fmtDate} dueDateColor={dueDateColor}
                      onComplete={onComplete} onUncomplete={onUncomplete}
                      onSomeday={onSomeday} onSetDueDate={onSetDueDate} onSetPriority={onSetPriority} onDelete={onDelete} />
                  ))}
                </div>
              )}
              {someday.length > 0 && (
                <div>
                  <Eyebrow style={{ marginBottom: '8px' }}>Someday</Eyebrow>
                  {someday.map(t => (
                    <TaskRow key={t.id} task={t} fmtDate={fmtDate} dueDateColor={dueDateColor}
                      onComplete={onComplete} onUncomplete={onUncomplete}
                      onSomeday={onSomeday} onSetDueDate={onSetDueDate} onSetPriority={onSetPriority} onDelete={onDelete} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── DONE TAB ── */}
      {tab === 'done' && (
        <div>
          {done.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '32px' }}>
              <Body dim style={{ margin: 0 }}>Nothing completed in the last 7 days.</Body>
            </Card>
          ) : (
            done.map(t => (
              <TaskRow key={t.id} task={t} fmtDate={fmtDate} dueDateColor={dueDateColor}
                onComplete={onComplete} onUncomplete={onUncomplete}
                onSomeday={onSomeday} onSetDueDate={onSetDueDate} onSetPriority={onSetPriority} onDelete={onDelete} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Calendar event row ────────────────────────────────────────────────────────
function CalEventRow({ event }) {
  return (
    <div style={{
      display: 'flex', gap: '14px', alignItems: 'flex-start',
      padding: '11px 0', borderBottom: `1px solid ${tokens.goldFaint}`,
      opacity: 0.8,
    }}>
      <div style={{
        minWidth: '44px', flexShrink: 0, paddingTop: '2px',
        ...sc, fontSize: '11px', fontWeight: 600,
        letterSpacing: '0.10em', color: tokens.ghost,
      }}>{event.time_label || '·'}</div>
      <div style={{ flex: 1 }}>
        <div style={{ ...body, fontSize: '15px', color: tokens.meta, fontWeight: 400 }}>
          {event.title}
        </div>
        {event.note && (
          <div style={{ ...body, fontSize: '13px', color: tokens.ghost, marginTop: '2px' }}>
            {event.note}
          </div>
        )}
      </div>
      <div style={{
        flexShrink: 0, width: '5px', height: '5px', borderRadius: '50%',
        background: tokens.goldFaint, marginTop: '7px',
      }} />
    </div>
  )
}

// ── Task row — shared across all tabs ────────────────────────────────────────
function TaskRow({ task, fmtDate, dueDateColor, onComplete, onUncomplete, onSomeday, onSetDueDate, onSetPriority, onDelete }) {
  const [showActions, setShowActions] = useState(false)
  const [editingDate, setEditingDate] = useState(false)

  const isDone    = task.status === 'done' || !!task.completed_at
  const isSomeday = task.status === 'someday'
  const isCarried = !!task.carried_from_id

  return (
    <div style={{
      borderBottom: `1px solid ${tokens.goldFaint}`,
      opacity: isDone ? 0.5 : 1,
      transition: 'opacity 0.3s',
    }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px 0' }}>
        {/* Priority flag */}
        <PriorityFlag
          priority={task.priority}
          onClick={onSetPriority && !isDone ? () => {
            const next = task.priority ? (task.priority < 3 ? task.priority + 1 : null) : 1
            onSetPriority(task, next)
          } : null}
        />

        {/* Tick */}
        <button
          onClick={() => isDone ? onUncomplete(task) : onComplete(task)}
          style={{
            flexShrink: 0, marginTop: '2px',
            width: '20px', height: '20px', borderRadius: '50%',
            border: `1.5px solid ${isDone ? tokens.goldChrome : task.priority === 1 ? 'rgba(192,57,43,0.5)' : 'rgba(200,146,42,0.35)'}`,
            background: isDone ? tokens.goldChrome : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s', padding: 0,
          }}
        >
          {isDone && <span style={{ color: '#FFF', fontSize: '11px' }}>✓</span>}
        </button>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }} onClick={() => !isDone && setShowActions(s => !s)}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              ...body, fontSize: '15px', color: tokens.meta, fontWeight: 400, lineHeight: 1.4,
              textDecoration: isDone ? 'line-through' : 'none',
              textDecorationColor: tokens.goldFaint, cursor: isDone ? 'default' : 'pointer',
            }}>{task.title}</span>
            {isCarried && !isDone && (
              <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.14em', color: tokens.ghost }}>carried</span>
            )}
            {isSomeday && (
              <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.14em', color: tokens.ghost }}>someday</span>
            )}
          </div>
          {(task.time_label || task.due_date || task.note) && (
            <div style={{ ...body, fontSize: '12px', marginTop: '2px', display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
              {task.time_label && (
                <span style={{ color: tokens.ghost }}>{task.time_label}</span>
              )}
              {task.due_date && !isDone && (
                <span style={{
                  color: dueDateColor ? dueDateColor(task.due_date, task.status) : tokens.ghost,
                  fontWeight: dueDateColor && dueDateColor(task.due_date, task.status) !== tokens.ghost ? 600 : 400,
                }}>
                  {fmtDate(task.due_date)}
                </span>
              )}
              {task.note && <span style={{ color: tokens.ghost }}>{task.note}</span>}
            </div>
          )}
        </div>

        {/* Cross indicator */}
        {!isDone && task.crossed_at && (
          <span style={{ flexShrink: 0, ...sc, fontSize: '10px', letterSpacing: '0.14em', color: tokens.gold }}>crossed</span>
        )}
      </div>

      {/* Expanded actions */}
      {showActions && !isDone && (
        <div style={{
          display: 'flex', gap: '8px', flexWrap: 'wrap',
          padding: '0 0 12px 32px',
        }}>
          {!editingDate ? (
            <button onClick={() => setEditingDate(true)} style={{
              ...sc, fontSize: '10px', fontWeight: 600, letterSpacing: '0.14em',
              color: tokens.gold, background: 'transparent',
              border: `1px solid ${tokens.goldFaint}`, borderRadius: '20px',
              padding: '4px 12px', cursor: 'pointer',
            }}>
              {task.due_date ? `📅 ${fmtDate(task.due_date)}` : '+ Date'}
            </button>
          ) : (
            <input
              type="date"
              defaultValue={task.due_date || ''}
              autoFocus
              onBlur={e => { setEditingDate(false); if (e.target.value) onSetDueDate(task, e.target.value) }}
              onChange={e => { if (e.target.value) { onSetDueDate(task, e.target.value); setEditingDate(false) } }}
              style={{
                border: `1px solid ${tokens.gold}`, borderRadius: '6px',
                padding: '4px 8px', ...sc, fontSize: '11px', color: tokens.gold, outline: 'none',
              }}
            />
          )}
          {!isSomeday && (
            <button onClick={() => { onSomeday(task); setShowActions(false) }} style={{
              ...sc, fontSize: '10px', fontWeight: 600, letterSpacing: '0.14em',
              color: tokens.ghost, background: 'transparent',
              border: `1px solid ${tokens.goldFaint}`, borderRadius: '20px',
              padding: '4px 12px', cursor: 'pointer',
            }}>Someday</button>
          )}
          <button onClick={() => { onDelete(task); setShowActions(false) }} style={{
            ...sc, fontSize: '10px', fontWeight: 600, letterSpacing: '0.14em',
            color: '#C0392B', background: 'transparent',
            border: '1px solid rgba(192,57,43,0.25)', borderRadius: '20px',
            padding: '4px 12px', cursor: 'pointer',
          }}>Delete</button>
        </div>
      )}
    </div>
  )
}



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
    ...sc, fontSize: '15px', fontWeight: 600,
    color: tokens.dark, display: 'block', lineHeight: 1.35, letterSpacing: '0.10em',
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
          <span style={flagLabelStyle}>I was him. World responded.</span>
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
        ...serif, fontStyle: 'italic', fontSize: '19px', fontWeight: 400,
        color: tokens.gold, lineHeight: 1.5, margin: 0,
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

  // Streak
  const {
    streak, streakLoading, streakBroken, pendingMilestone,
    isCadenceDay, recordEngagement, saveCadence, saveBadgePermission, clearMilestone,
  } = useStreak(user)
  const [cadenceSetupOpen, setCadenceSetupOpen] = useState(false)
  const [badgeAsked, setBadgeAsked] = useState(false)

  // Profile data
  const [profileLoading, setProfileLoading] = useState(true)
  const [iamStatements, setIamStatements] = useState({})  // { path: '...', spark: '...' }
  const [horizonSelfStatement, setHorizonSelfStatement] = useState(null)
  const [protectorCovenant, setProtectorCovenant] = useState(null)
  const [hasMap, setHasMap] = useState(false)
  const [skipMap, setSkipMap] = useState(false)
  const [icalUrl, setIcalUrl] = useState(null)
  const [calEvents, setCalEvents] = useState([])
  const [calLoading, setCalLoading] = useState(false)

  // Today's state
  const [todayRun, setTodayRun] = useState(null)
  const [thresholds, setThresholds] = useState([])
  const [entries, setEntries] = useState([])  // last ~30 days
  const [view, setView] = useState('loading')  // loading | hub | morning | tasks | evening

  // Respect ?view=tasks (or other) URL param for direct navigation from Mission Control
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const viewParam = params.get('view')
    if (viewParam === 'tasks') setTaskTab('today')  // ensure correct tab
    // view param is applied after load completes — see load function
  }, [])
  const [activeSprint, setActiveSprint] = useState(null)
  const [taskTab, setTaskTab] = useState('today')  // today | upcoming | backlog | done

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

        // ── Load active sprint for hub tile ────────────────────────────────
        const { data: sprintRow } = await supabase
          .from('target_sprint_sessions')
          .select('id, domains, status')
          .eq('user_id', user.id)
          .in('status', ['active', 'draft'])
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (cancelled) return
        if (sprintRow?.domains?.length) setActiveSprint(sprintRow)

        // ── Silent carryover: roll incomplete tasks from last 7 days ──────────
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const sevenDaysAgoStr = getLocalDateStr(sevenDaysAgo)
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = getLocalDateStr(yesterday)

        const { data: overdueTasks } = await supabase
          .from('horizon_practice_thresholds')
          .select('id, title, time_label, note, source, source_ref, due_date')
          .eq('user_id', user.id)
          .is('completed_at', null)
          .in('status', ['open'])
          .gte('run_date', sevenDaysAgoStr)
          .lte('run_date', yesterdayStr)
          .is('due_date', null)  // tasks with due_date surface in their own view
        if (cancelled) return
        if (overdueTasks?.length) {
          const alreadyCarried = (thresholdRows || [])
            .filter(t => t.carried_from_id).map(t => t.carried_from_id)
          const alreadyTitles = (thresholdRows || []).map(t => t.title)
          const toCarry = overdueTasks.filter(t =>
            !alreadyCarried.includes(t.id) &&
            !alreadyTitles.includes(t.title)
          )
          if (toCarry.length > 0) {
            const newRows = toCarry.map(t => ({
              user_id: user.id, title: t.title,
              time_label: t.time_label || null, note: t.note || null,
              source: t.source || 'manual', source_ref: t.source_ref || null,
              run_date: today, carried_from_id: t.id, status: 'open',
            }))
            const { data: carried } = await supabase
              .from('horizon_practice_thresholds').insert(newRows).select('*')
            if (cancelled) return
            if (carried) setThresholds(existing => [...(existing || []), ...carried])
          }
        }

        // Check URL param for direct navigation
        const params = new URLSearchParams(window.location.search)
        const viewParam = params.get('view')
        if (viewParam === 'tasks') {
          setView('tasks')
        } else {
          setView('hub')
        }
        recordEngagement()

      } catch (err) {
        console.error('Horizon Practice load error:', err)
        setView('hub')  // graceful fallback
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
    setView('hub')
    recordEngagement()
  }

  async function handleComplete(threshold) {
    if (!user || !threshold.id) return
    const now = new Date().toISOString()
    await supabase
      .from('horizon_practice_thresholds')
      .update({ completed_at: now, status: 'done' })
      .eq('id', threshold.id)
    Chimes.hit()
    setThresholds(ts => ts.map(t =>
      t.id === threshold.id ? { ...t, completed_at: now, status: 'done' } : t
    ))
  }

  async function handleSomeday(threshold) {
    if (!user || !threshold.id) return
    await supabase
      .from('horizon_practice_thresholds')
      .update({ status: 'someday', due_date: null })
      .eq('id', threshold.id)
    setThresholds(ts => ts.map(t =>
      t.id === threshold.id ? { ...t, status: 'someday', due_date: null } : t
    ))
  }

  async function handleSetPriority(threshold, priority) {
    if (!user || !threshold.id) return
    await supabase
      .from('horizon_practice_thresholds')
      .update({ priority })
      .eq('id', threshold.id)
    setThresholds(ts => ts.map(t =>
      t.id === threshold.id ? { ...t, priority } : t
    ))
  }

  async function handleSetDueDate(threshold, dueDate) {
    if (!user || !threshold.id) return
    await supabase
      .from('horizon_practice_thresholds')
      .update({ due_date: dueDate, status: 'open' })
      .eq('id', threshold.id)
    setThresholds(ts => ts.map(t =>
      t.id === threshold.id ? { ...t, due_date: dueDate, status: 'open' } : t
    ))
  }

  async function handleDelete(threshold) {
    if (!user || !threshold.id) return
    await supabase
      .from('horizon_practice_thresholds')
      .delete()
      .eq('id', threshold.id)
    setThresholds(ts => ts.filter(t => t.id !== threshold.id))
  }

  async function handleUncomplete(threshold) {
    if (!user || !threshold.id) return
    await supabase
      .from('horizon_practice_thresholds')
      .update({ completed_at: null, status: 'open' })
      .eq('id', threshold.id)
    setThresholds(ts => ts.map(t =>
      t.id === threshold.id ? { ...t, completed_at: null, status: 'open' } : t
    ))
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

  async function handleRefreshComplete({ task, his, variant }) {
    if (!user) return
    screenFlash()
    const isCross = variant === 'cross'
    const { data: inserted } = await supabase
      .from('horizon_practice_entries')
      .insert({
        user_id: user.id,
        kind: 'hit',
        text: `${task} · ${his}`,
        refresh_task: task,
        refresh_his: his,
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

  // Fetch today's calendar events at page level so they're available everywhere
  useEffect(() => {
    if (!icalUrl) return
    let cancelled = false
    setCalLoading(true)
    const today = getLocalDateStr()
    fetch('/api/ical-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ical_url: icalUrl, date: today }),
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (!data.error) setCalEvents(data.events || [])
        setCalLoading(false)
      })
      .catch(() => { if (!cancelled) setCalLoading(false) })
    return () => { cancelled = true }
  }, [icalUrl])

  // ─── Render ─────────────────────────────────────────────────────────────
  if (authLoading || accessLoading || profileLoading) {
    return (
      <div style={{ background: tokens.bg, minHeight: '100vh' }}>
        <Nav activePath="nextus-self" />
        <div className="loading" />
      </div>
    )
  }

  return (
    <div style={{ background: tokens.bg, minHeight: '100vh' }}>
        <Nav activePath="nextus-self" />

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

        {/* ── Hub ── */}
        {(hasMap || skipMap) && view === 'hub' && (
          <div className="hp-fade-in" style={{
            maxWidth: '640px', margin: '0 auto',
            padding: 'clamp(88px, 10vw, 112px) clamp(20px, 4vw, 40px) 80px',
          }}>

            {/* Milestone overlay */}
            {pendingMilestone && (
              <div style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(15,21,35,0.85)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '24px',
              }}>
                <div className="hp-fade-in" style={{
                  background: tokens.bg, borderRadius: '20px',
                  padding: '48px 36px', maxWidth: '360px', width: '100%',
                  textAlign: 'center', border: `1px solid ${tokens.goldChrome}`,
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>
                    {pendingMilestone === 21 ? '✦' : '✦✦'}
                  </div>
                  <div style={{ ...sc, fontSize: '10px', fontWeight: 600, letterSpacing: '0.22em', color: tokens.gold, textTransform: 'uppercase', marginBottom: '12px' }}>
                    {pendingMilestone} days
                  </div>
                  <Heading size="lg" style={{ marginBottom: '12px' }}>
                    {pendingMilestone === 21 ? 'The habit is taking root.' : 'Forty days. The groove is deep now.'}
                  </Heading>
                  <Body dim style={{ marginBottom: '32px' }}>
                    {pendingMilestone === 21
                      ? 'Twenty-one consecutive days. The neural pathway is forming. Keep going.'
                      : 'Forty days in. This is no longer something you do — it is something you are.'}
                  </Body>
                  <button onClick={clearMilestone} style={{
                    background: tokens.gold, color: '#FFFFFF', border: 'none',
                    borderRadius: '10px', padding: '14px 32px', cursor: 'pointer',
                    ...sc, fontSize: '11px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase',
                  }}>Continue →</button>
                </div>
              </div>
            )}

            {/* Return prompt */}
            {streakBroken && (
              <div style={{
                background: '#FFFFFF', border: `1px solid ${tokens.goldChrome}`,
                borderRadius: '14px', padding: '22px 24px', marginBottom: '28px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
              }}>
                <div>
                  <div style={{ ...sc, fontSize: '10px', fontWeight: 600, letterSpacing: '0.18em', color: tokens.gold, textTransform: 'uppercase', marginBottom: '6px' }}>Welcome back</div>
                  <Body style={{ margin: 0, fontSize: '14.5px' }}>Your practice is here. Pick it back up.</Body>
                </div>
                <button onClick={() => setView('morning')} style={{
                  flexShrink: 0, background: tokens.gold, color: '#FFFFFF',
                  border: 'none', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer',
                  ...sc, fontSize: '10px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
                }}>Begin →</button>
              </div>
            )}

            {/* Greeting + streak counter */}
            <div style={{ marginBottom: '40px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
              <Heading size="xl">
                {getGreeting()}
                {user && <>, <em style={{ color: tokens.gold, fontStyle: 'normal' }}>{
                  user.user_metadata?.full_name?.split(' ')[0] ||
                  user.user_metadata?.name?.split(' ')[0] ||
                  (user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1))
                }</em></>}.
              </Heading>
              {streak && streak.streak_current > 0 && (
                <button onClick={() => setCadenceSetupOpen(true)} style={{
                  flexShrink: 0, marginTop: '6px',
                  background: 'transparent', border: `1px solid ${tokens.goldFaint}`,
                  borderRadius: '40px', padding: '6px 14px',
                  display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                }}>
                  <span style={{ fontSize: '14px' }}>✦</span>
                  <span style={{ ...sc, fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: tokens.gold }}>{streak.streak_current}</span>
                </button>
              )}
              {(!streak || streak.streak_current === 0) && !streakLoading && (
                <button onClick={() => setCadenceSetupOpen(true)} style={{
                  flexShrink: 0, marginTop: '6px',
                  background: 'transparent', border: `1px solid ${tokens.goldFaint}`,
                  borderRadius: '40px', padding: '6px 14px', cursor: 'pointer',
                  ...sc, fontSize: '10px', fontWeight: 600, letterSpacing: '0.14em', color: tokens.ghost, textTransform: 'uppercase',
                }}>Set streak</button>
              )}
            </div>

            {/* Tiles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* Morning Practice */}
              <button onClick={() => setView('morning')} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: todayRun?.completed_at ? tokens.bgCard : '#FFFFFF',
                border: `1px solid ${todayRun?.completed_at ? tokens.goldFaint : tokens.goldChrome}`,
                borderRadius: '12px', padding: '20px 24px', cursor: 'pointer', textAlign: 'left', width: '100%',
              }}>
                <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em', color: tokens.gold }}>
                  Morning Practice {todayRun?.completed_at ? '✓' : ''}
                </span>
                <span style={{ ...sc, fontSize: '16px', color: tokens.goldChrome, marginLeft: '16px' }}>→</span>
              </button>

              {/* Tasks */}
              <button onClick={() => setView('tasks')} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#FFFFFF', border: `1px solid ${tokens.goldFaint}`,
                borderRadius: '12px', padding: '20px 24px', cursor: 'pointer', textAlign: 'left', width: '100%',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em', color: tokens.gold }}>Tasks</span>
                  {thresholds.filter(t => !t.completed_at).length > 0 && (
                    <span style={{
                      background: tokens.gold, color: '#FFF',
                      borderRadius: '40px', padding: '2px 8px',
                      ...sc, fontSize: '10px', fontWeight: 700, letterSpacing: '0.10em',
                    }}>{thresholds.filter(t => !t.completed_at).length}</span>
                  )}
                </div>
                <span style={{ ...sc, fontSize: '16px', color: tokens.gold, marginLeft: '16px' }}>→</span>
              </button>

              {/* Horizon Self Refresh */}
              <button onClick={() => { setRefreshVariant('standard'); setRefreshTask(''); setRefreshOpen(true) }} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#FFFFFF', border: `1px solid ${tokens.goldFaint}`,
                borderRadius: '12px', padding: '20px 24px', cursor: 'pointer', textAlign: 'left', width: '100%',
              }}>
                <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em', color: tokens.gold }}>Horizon Self Refresh</span>
                <span style={{ ...sc, fontSize: '16px', color: tokens.gold, marginLeft: '16px' }}>→</span>
              </button>

              {/* Sprint */}
              <button onClick={() => { window.location.href = '/tools/target-sprint' }} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#FFFFFF', border: `1px solid ${tokens.goldFaint}`,
                borderRadius: '12px', padding: '20px 24px', cursor: 'pointer', textAlign: 'left', width: '100%',
              }}>
                <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em', color: tokens.gold }}>
                  {activeSprint?.status === 'active' ? 'Active Sprint' : activeSprint?.status === 'draft' ? 'Sprint in Setup' : 'Target Stretch'}
                </span>
                <span style={{ ...sc, fontSize: '16px', color: tokens.gold, marginLeft: '16px' }}>→</span>
              </button>

              {/* Evening Integrate */}
              <button onClick={() => setView('evening')} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#FFFFFF', border: `1px solid ${tokens.goldFaint}`,
                borderRadius: '12px', padding: '20px 24px', cursor: 'pointer', textAlign: 'left', width: '100%',
              }}>
                <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em', color: tokens.gold }}>Evening Integrate</span>
                <span style={{ ...sc, fontSize: '16px', color: tokens.gold, marginLeft: '16px' }}>→</span>
              </button>

              {/* Journal */}
              <button onClick={() => setLogOpen(true)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#FFFFFF', border: `1px solid ${tokens.goldFaint}`,
                borderRadius: '12px', padding: '20px 24px', cursor: 'pointer', textAlign: 'left', width: '100%',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em', color: tokens.gold }}>Journal</span>
                  {entries.filter(e => getLocalDateStr(new Date(e.occurred_at)) === getLocalDateStr()).length > 0 && (
                    <span style={{
                      background: tokens.goldFaint, color: tokens.gold,
                      borderRadius: '40px', padding: '2px 8px',
                      ...sc, fontSize: '10px', fontWeight: 700, letterSpacing: '0.10em',
                    }}>{entries.filter(e => getLocalDateStr(new Date(e.occurred_at)) === getLocalDateStr()).length}</span>
                  )}
                </div>
                <span style={{ ...sc, fontSize: '16px', color: tokens.gold, marginLeft: '16px' }}>→</span>
              </button>

            </div>

            {/* Badge permission ask */}
            {streak && streak.streak_current >= 1 && !streak.badge_permission && !badgeAsked && 'setAppBadge' in navigator && (
              <div style={{
                marginTop: '24px', background: '#FFFFFF',
                border: `1px solid ${tokens.goldFaint}`, borderRadius: '12px', padding: '18px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
              }}>
                <Body dim style={{ margin: 0, fontSize: '13px', lineHeight: 1.5 }}>
                  Show a reminder dot on the app icon when your practice is waiting?
                </Body>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button onClick={() => { setBadgeAsked(true); saveBadgePermission(true) }} style={{
                    background: tokens.gold, color: '#FFF', border: 'none', borderRadius: '8px',
                    padding: '8px 14px', cursor: 'pointer',
                    ...sc, fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em',
                  }}>Yes</button>
                  <button onClick={() => setBadgeAsked(true)} style={{
                    background: 'transparent', color: tokens.ghost,
                    border: `1px solid ${tokens.goldFaint}`, borderRadius: '8px',
                    padding: '8px 14px', cursor: 'pointer',
                    ...sc, fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em',
                  }}>No</button>
                </div>
              </div>
            )}

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '20px' }}>
              <button onClick={() => setCadenceSetupOpen(true)} style={{
                background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                ...sc, fontSize: '10px', fontWeight: 600, letterSpacing: '0.18em', color: tokens.whisper, textTransform: 'uppercase',
              }}>Streak</button>
              <button onClick={() => setSettingsOpen(true)} style={{
                background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                ...sc, fontSize: '10px', fontWeight: 600, letterSpacing: '0.18em', color: tokens.whisper, textTransform: 'uppercase',
              }}>Settings</button>
            </div>

            {/* Cadence sheet */}
            {cadenceSetupOpen && (
              <div style={{
                position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(15,21,35,0.7)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              }} onClick={() => setCadenceSetupOpen(false)}>
                <div onClick={e => e.stopPropagation()} style={{
                  background: tokens.bg, borderRadius: '20px 20px 0 0',
                  padding: '32px 28px 48px', width: '100%', maxWidth: '480px',
                  borderTop: `1px solid ${tokens.goldFaint}`,
                }}>
                  <div style={{ ...sc, fontSize: '10px', fontWeight: 600, letterSpacing: '0.22em', color: tokens.gold, textTransform: 'uppercase', marginBottom: '16px' }}>Streak cadence</div>
                  <Heading size="md" style={{ marginBottom: '8px' }}>How often are you committing?</Heading>
                  <Body dim style={{ marginBottom: '24px', fontSize: '13.5px' }}>
                    Your streak only counts — and the reminder only fires — on days you commit to.
                  </Body>
                  {[
                    { key: 'daily',    label: 'Every day' },
                    { key: 'weekdays', label: 'Weekdays (Mon–Fri)' },
                    { key: '3x',       label: '3× a week (Mon · Wed · Fri)' },
                  ].map(opt => (
                    <button key={opt.key} onClick={async () => { await saveCadence(opt.key, null); setCadenceSetupOpen(false) }} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', background: streak?.cadence === opt.key ? tokens.goldTint : '#FFFFFF',
                      border: `1px solid ${streak?.cadence === opt.key ? tokens.goldChrome : tokens.goldFaint}`,
                      borderRadius: '10px', padding: '16px 20px', marginBottom: '10px',
                      cursor: 'pointer', textAlign: 'left',
                    }}>
                      <span style={{ ...body, fontSize: '14.5px', color: tokens.meta }}>{opt.label}</span>
                      {streak?.cadence === opt.key && <span style={{ color: tokens.gold, fontSize: '14px' }}>✓</span>}
                    </button>
                  ))}
                  {streak && (
                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: `1px solid ${tokens.goldFaint}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.16em', color: tokens.gold, marginBottom: '4px' }}>Current streak</div>
                          <div style={{ ...body, fontSize: '22px', fontWeight: 600, color: tokens.meta }}>{streak.streak_current} <span style={{ fontSize: '14px', color: tokens.ghost }}>days</span></div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.16em', color: tokens.gold, marginBottom: '4px' }}>Personal best</div>
                          <div style={{ ...body, fontSize: '22px', fontWeight: 600, color: tokens.meta }}>{streak.streak_longest} <span style={{ fontSize: '14px', color: tokens.ghost }}>days</span></div>
                        </div>
                      </div>
                      <div style={{ marginTop: '16px' }}>
                        <div style={{ height: '4px', background: tokens.goldFaint, borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: '2px', background: tokens.goldChrome,
                            width: `${Math.min(100, (streak.streak_current / (streak.streak_current < 21 ? 21 : 40)) * 100)}%`,
                            transition: 'width 0.4s ease',
                          }} />
                        </div>
                        <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: tokens.ghost, marginTop: '6px' }}>
                          {streak.streak_current < 21
                            ? `${21 - streak.streak_current} days to the 21-day milestone`
                            : streak.streak_current < 40
                            ? `${40 - streak.streak_current} days to the 40-day milestone`
                            : '40-day milestone reached ✦'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Morning Practice ── */}
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
              onClose={() => setView('hub')}
            />
          </div>
        )}

        {/* ── Tasks ── */}
        {(hasMap || skipMap) && view === 'tasks' && (
          <TasksView
            thresholds={thresholds}
            userId={user?.id}
            calEvents={calEvents}
            calLoading={calLoading}
            icalUrl={icalUrl}
            tab={taskTab}
            onTabChange={setTaskTab}
            onComplete={handleComplete}
            onUncomplete={handleUncomplete}
            onCross={handleCross}
            onSomeday={handleSomeday}
            onSetDueDate={handleSetDueDate}
            onSetPriority={handleSetPriority}
            onDelete={handleDelete}
            onAdd={(newTask) => setThresholds(ts => [newTask, ...ts])}
            onBack={() => setView('hub')}
          />
        )}

        {/* ── Evening Integrate (placeholder) ── */}
        {(hasMap || skipMap) && view === 'evening' && (
          <div className="hp-fade-in" style={{
            maxWidth: '520px', margin: '0 auto',
            padding: 'clamp(88px, 10vw, 112px) clamp(20px, 4vw, 40px) 80px',
          }}>
            <Eyebrow style={{ marginBottom: '12px' }}>Evening Integrate</Eyebrow>
            <Heading size="lg" style={{ marginBottom: '16px' }}>Close the day.</Heading>
            <Card style={{ padding: '32px', marginBottom: '28px' }}>
              <Body dim style={{ margin: 0, fontSize: '16px' }}>
                This is where you'll land the day — what showed up, what you met, what to carry forward. Coming soon.
              </Body>
            </Card>
            <GhostButton onClick={() => setView('hub')}>← Back</GhostButton>
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
