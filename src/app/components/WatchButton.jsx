// src/app/components/WatchButton.jsx
//
// Two-state watch toggle, drop-in for Focus profiles, actor pages, and
// person profiles. Renders the InfoButton inline to explain the mechanic.
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

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }
const gold = '#A8721A'

export function WatchButton({ entityType, entityId, entityName, size = 'md' }) {
  const { user } = useAuth()
  const { isWatching, toggle, capState, count, cap, loading } = useWatch()
  const [busy, setBusy]       = useState(false)
  const [errMsg, setErrMsg]   = useState(null)

  if (!user) return null  // not shown to logged-out viewers
  if (loading) return null

  const watching = isWatching(entityType, entityId)
  const blockedByCap = capState === 'at-cap' && !watching

  async function handleClick() {
    setErrMsg(null)
    setBusy(true)
    try {
      await toggle(entityType, entityId)
    } catch (e) {
      if (e.code === 'WATCH_CAP_REACHED') {
        setErrMsg('Your watched list is full. Manage it from your profile.')
      } else {
        setErrMsg(e.message || 'Could not update watch.')
      }
    } finally {
      setBusy(false)
    }
  }

  const fontSize     = size === 'sm' ? '12px' : '13px'
  const padding      = size === 'sm' ? '7px 16px' : '10px 22px'
  const letterSpace  = '0.16em'

  const label = watching
    ? `Watching ${entityName}`
    : blockedByCap
      ? `Watched list full — manage`
      : `Watch ${entityName}`

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        style={{
          ...sc,
          fontSize,
          letterSpacing: letterSpace,
          color: watching ? '#FFFFFF' : gold,
          background: watching ? gold : 'rgba(200,146,42,0.04)',
          border: '1.5px solid ' + gold,
          borderRadius: '30px',
          padding,
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy ? 0.6 : 1,
          transition: 'all 120ms ease',
        }}
      >
        {label}
      </button>

      <InfoButton title="Watching" size={size}>
        <p style={{ margin: '0 0 10px' }}>
          When you watch {entityName}, its published activity shows up in
          your Watched feed &mdash; chronologically, with no ranking pressure
          from anyone.
        </p>
        <p style={{ margin: '0 0 10px' }}>
          Watching is private. Only you can see your watched list. The
          platform doesn&rsquo;t tell {entityName}, and it doesn&rsquo;t
          tell anyone else.
        </p>
        <p style={{ margin: 0 }}>
          You can watch up to {cap} entities. You&rsquo;re watching{' '}
          <strong>{count}</strong> so far. The cap protects the feed from
          becoming noise.
        </p>
      </InfoButton>

      {errMsg && (
        <span style={{ ...body, fontSize: '12.5px', color: '#A23636' }}>
          {errMsg}
        </span>
      )}
    </span>
  )
}
