// src/app/components/WatchButton.jsx
//
// Two-state toggle for tuning in to an entity. Drop-in for Focus profiles,
// actor pages, and person profiles. Renders the InfoButton inline to
// explain the mechanic.
//
// User-visible vocabulary: "Tune in" / "Tuned in" / "Un-tune" on hover.
// Internal identifiers (useWatch, WatchButton, nextus_user_watches) keep
// their original names — the rename is UI-only.
//
// Props:
//   entityType — 'focus' | 'actor' | 'person'
//   entityId   — uuid
//   entityName — display name (used in the button label and the info copy)
//   size       — 'sm' | 'md' (default 'md')

import { useState } from 'react'
import { useWatch } from '../hooks/useWatch'
import { useAuth } from '../../hooks/useAuth'
import { InfoButton } from './InfoButton'
import { logActivity } from './pulse/logActivity'

const sc   = { fontFamily: "'IBM Plex Mono', Georgia, serif" }
const body = { fontFamily: "'Newsreader', Georgia, serif" }
const gold = '#262420'

export function WatchButton({ entityType, entityId, entityName, size = 'md', tone = 'light' }) {
  const { user } = useAuth()
  const { isWatching, toggle, capState, count, cap, loading } = useWatch()
  const [busy, setBusy]       = useState(false)
  const [errMsg, setErrMsg]   = useState(null)
  const [hovered, setHovered] = useState(false)

  if (!user) return null  // not shown to logged-out viewers
  if (loading) return null

  const watching = isWatching(entityType, entityId)
  const blockedByCap = capState === 'at-cap' && !watching

  async function handleClick() {
    setErrMsg(null)
    setBusy(true)
    try {
      const result = await toggle(entityType, entityId)
      // The pulse: anonymous motion only. The activity row names the
      // SUBJECT tuned into, never the person tuning in (the table has
      // no user column — see migration 109).
      if (result?.added) {
        logActivity({
          eventType: 'tune_in',
          subjectType: entityType,
          subjectId: entityId,
          subjectName: entityName,
        })
      }
    } catch (e) {
      if (e.code === 'WATCH_CAP_REACHED') {
        setErrMsg('Your Tuned In list is full. Manage it from your profile.')
      } else {
        setErrMsg(e.message || 'Could not update.')
      }
    } finally {
      setBusy(false)
    }
  }

  const fontSize     = '13px'
  const padding      = size === 'sm' ? '7px 16px' : '10px 22px'
  const letterSpace  = '0.16em'

  // Palette by surface. 'light' = Field Notes paper (graphite ink);
  // 'dark' = Atlas sea ink (cream outline, verdigris fill when active).
  const dark = tone === 'dark'
  const inkIdle    = dark ? '#EAF1ED' : gold
  const edgeIdle   = dark ? 'rgba(234,241,237,0.45)' : gold
  const bgIdle     = dark ? 'transparent' : 'rgba(76,107,69,0.04)'
  const inkActive  = dark ? '#0F1A15' : '#FFFFFF'
  const bgActive   = dark ? '#58A08A' : gold
  const edgeActive = dark ? '#58A08A' : gold

  // Label logic:
  //   - Tuned in + hover → "Un-tune {name}"  (signals the action available)
  //   - Tuned in        → "Tuned in to {name}"
  //   - Cap reached     → "Tuned In list full — manage"
  //   - Default         → "Tune in to {name}"
  const label = watching
    ? (hovered ? `Un-tune ${entityName}` : `Tuned in to ${entityName}`)
    : blockedByCap
      ? `Tuned In list full — manage`
      : `Tune in to ${entityName}`

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        disabled={busy}
        style={{
          ...sc,
          fontSize,
          letterSpacing: letterSpace,
          color: watching ? inkActive : inkIdle,
          background: watching ? bgActive : bgIdle,
          border: '1.5px solid ' + (watching ? edgeActive : edgeIdle),
          borderRadius: '30px',
          padding,
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy ? 0.6 : 1,
          transition: 'all 120ms ease',
        }}
      >
        {label}
      </button>

      <InfoButton title="Tuning in" size={size} tone={tone}>
        <p style={{ margin: '0 0 10px' }}>
          When you tune in to {entityName}, their published activity shows up
          in your Tuned In feed &mdash; chronologically, with no ranking
          pressure from anyone.
        </p>
        <p style={{ margin: '0 0 10px' }}>
          Tuning in is private. Only you can see who you&rsquo;re tuned in
          to. The platform doesn&rsquo;t tell {entityName}, and it
          doesn&rsquo;t tell anyone else.
        </p>
        <p style={{ margin: 0 }}>
          You can tune in to up to {cap} entities. You&rsquo;re tuned in to{' '}
          <strong>{count}</strong> so far. The cap protects the feed from
          becoming noise.
        </p>
      </InfoButton>

      {errMsg && (
        <span style={{ ...body, fontSize: '13px', color: dark ? '#E08A8A' : '#A23636' }}>
          {errMsg}
        </span>
      )}
    </span>
  )
}
