// ─────────────────────────────────────────────────────────────
// FirstLightPrompt.jsx
//
// Gentle re-prompt for users who skipped First Light. Surfaces on
// Mission Control and the NextU journey page. Shows only when
// First Light is unfinished (first_light_completed_at is null).
//
// Dismissal is per-session (sessionStorage) so it returns next
// visit — the site has to come to life somehow. A user who finishes
// First Light never sees it again.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import { hasMapEngagement } from '../util/onboarding'

const BG   = '#FAFAF7'
const INK  = '#0F1523'
const GOLD = '#262420'
const GC   = '#4c6b45'
const SERIF = "'Lora', Georgia, serif"
const SC    = "'Cormorant SC', Georgia, serif"
const LORA  = "'Lora', Georgia, serif"

const DISMISS_KEY = 'nextus.flPromptDismissed'

export default function FirstLightPrompt({ style }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [show, setShow] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!user) { setShow(false); return }

    // Dismissed this session → stay quiet until next visit.
    let dismissed = false
    try { dismissed = sessionStorage.getItem(DISMISS_KEY) === '1' } catch {}
    if (dismissed) { setShow(false); return }

    ;(async () => {
      try {
        const [userRes, mapEngaged] = await Promise.all([
          supabase
            .from('users')
            .select('first_light_completed_at')
            .eq('id', user.id)
            .maybeSingle(),
          hasMapEngagement(user.id),
        ])
        if (cancelled) return
        // Hide once First Light is done, or once the Map — its deeper
        // sibling — has been engaged. No nagging someone who's already
        // placed themselves more thoroughly.
        setShow(!userRes?.data?.first_light_completed_at && !mapEngaged)
      } catch {
        if (!cancelled) setShow(false)
      }
    })()

    return () => { cancelled = true }
  }, [user])

  if (!show) return null

  function dismiss(e) {
    e?.stopPropagation()
    try { sessionStorage.setItem(DISMISS_KEY, '1') } catch {}
    setShow(false)
  }

  function open() { navigate('/welcome/first-light') }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', gap: 16,
        background: BG,
        border: `1px solid rgba(76,107,69,0.45)`,
        borderRadius: 10,
        padding: '16px 40px 16px 18px',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(15,21,35,0.06)',
        ...style,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: SC, fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', color: GOLD, margin: '0 0 4px' }}>
          First Light
        </p>
        <p style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 500, lineHeight: 1.2, color: INK, margin: 0 }}>
          Find where you are.
        </p>
        <p style={{ fontFamily: LORA, fontSize: 13, lineHeight: 1.5, color: 'rgba(15,21,35,0.55)', margin: '5px 0 0' }}>
          Five minutes to place yourself across the seven domains.
        </p>
      </div>

      <span style={{ fontFamily: SC, fontSize: 13, fontWeight: 600, letterSpacing: '0.14em', color: GC, whiteSpace: 'nowrap', flexShrink: 0 }}>
        BEGIN →
      </span>

      <button
        onClick={dismiss}
        aria-label="Dismiss for now"
        style={{
          position: 'absolute', top: 8, right: 10,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 18, lineHeight: 1, color: 'rgba(15,21,35,0.55)', padding: 4,
        }}
      >×</button>
    </div>
  )
}
