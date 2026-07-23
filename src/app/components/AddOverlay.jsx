// ─────────────────────────────────────────────────────────────
// AddOverlay.jsx
//
// The universal "Add to the ecosystem" overlay. One component,
// one set of choices, used everywhere a user might want to add
// something to NextUs.
//
// Currently mounted from: Mission Control right-rail ADD tile.
// To be mounted from (Module 16): Domain, Feed, Profile, Org,
// Practice, Map, Invitation, Gap Signal headers.
//
// Behaviour:
//   • Asks the one question worth asking: what are you adding?
//   • Four cards: Organisation, Person, Project, Practice.
//   • Routes to the appropriate flow on selection, passing any
//     surface context via location.state.prefill.
//   • Closes on Escape, on backdrop click, on selection.
//   • Centred modal on wide viewports, bottom sheet on narrow.
//
// Props:
//   open         boolean                 — controls visibility
//   onClose      () => void              — called when user dismisses
//   context      { ...prefill }|undefined — optional contextual prefill
//                                          (e.g. { domain: 'society' }
//                                          when opened from a Domain page).
//                                          Forwarded to /nominate as
//                                          location.state.prefill.
//
// Design tokens locked: gold-on-cream, Lora / Cormorant SC / Lora.
// No em dashes in copy.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GOLD, GOLD_DK, GOLD_RULE, GOLD_HOVER,
  BG_CARD, BG_PARCHMENT,
  TEXT_INK, TEXT_META, TEXT_FAINT,
  FONT_DISPLAY, FONT_SC, FONT_BODY,
} from './mission-control/tokens'

// Card definitions. Adding a fifth (e.g. Need) is one entry here.
// Each card declares: a key, a label, a one-line description, a target
// route, and the prefill payload to attach as navigation state.
//
// `extraPrefill` is merged AFTER any context the caller passed, so a
// caller-supplied `domain` on a Domain page wins over nothing here, and
// the type marker added by the card wins over anything in context.
const CARDS = [
  {
    key:   'organisation',
    label: 'An organisation',
    desc:  'A company, non-profit, collective, programme, or initiative.',
    route: '/add',
    extraPrefill: { actor_type: 'organisation' },
  },
  {
    key:   'person',
    label: 'A person',
    desc:  'A practitioner, founder, elder, or independent operator doing the work.',
    route: '/add',
    extraPrefill: { actor_type: 'practitioner' },
  },
  {
    key:   'project',
    label: 'A project',
    desc:  'A project, sprint, or programme not yet anchored to a parent org.',
    route: '/add',
    extraPrefill: { actor_type: 'project' },
  },
  {
    key:   'practice',
    label: 'A practice',
    desc:  'A regenerative practice, technique, or method worth sharing.',
    route: '/practices/new',
    extraPrefill: null,
  },
]

export default function AddOverlay({ open, onClose, context }) {
  const navigate = useNavigate()
  const [isNarrow, setIsNarrow] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 720 : false
  )

  // Escape closes the overlay. Effect only registers when open.
  useEffect(() => {
    if (!open) return
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  // Track viewport so we can render bottom-sheet on narrow screens.
  useEffect(() => {
    if (!open) return
    function onResize() {
      setIsNarrow(window.innerWidth < 720)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open])

  // Body scroll lock while open. Releases on close or unmount.
  useEffect(() => {
    if (!open || typeof document === 'undefined') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  function choose(card) {
    const prefill = { ...(context || {}), ...(card.extraPrefill || {}) }
    const hasPrefill = Object.keys(prefill).length > 0
    onClose?.()
    navigate(card.route, hasPrefill ? { state: { prefill } } : undefined)
  }

  function onBackdropClick(e) {
    // Only close if the click was on the backdrop itself, not bubbled from the panel.
    if (e.target === e.currentTarget) onClose?.()
  }

  // ── Inline styles (locked design tokens) ────────────────────
  const backdrop = {
    position: 'fixed', inset: 0,
    background: 'rgba(15, 21, 35, 0.42)',
    zIndex: 1000,
    display: 'flex',
    alignItems: isNarrow ? 'flex-end' : 'center',
    justifyContent: 'center',
    padding: isNarrow ? 0 : '24px',
  }

  const panel = {
    background: BG_PARCHMENT,
    border: `1px solid ${GOLD_RULE}`,
    borderRadius: isNarrow ? '14px 14px 0 0' : '14px',
    width: '100%',
    maxWidth: isNarrow ? '100%' : '640px',
    maxHeight: isNarrow ? '88vh' : '86vh',
    overflowY: 'auto',
    boxShadow: '0 18px 48px rgba(15, 21, 35, 0.18)',
    padding: isNarrow ? '20px 18px 28px' : '34px 38px 34px',
    boxSizing: 'border-box',
    position: 'relative',
    // Slide-up on narrow, fade-in on wide.
    animation: isNarrow ? 'add-overlay-up 220ms ease-out' : 'add-overlay-fade 180ms ease-out',
  }

  const eyebrow = {
    fontFamily: FONT_SC, fontSize: '13px',
    letterSpacing: '0.18em', textTransform: 'uppercase',
    color: GOLD_DK, margin: 0,
  }

  const title = {
    fontFamily: FONT_DISPLAY, fontSize: isNarrow ? '24px' : '28px',
    fontWeight: 400, color: TEXT_INK,
    margin: '6px 0 2px', lineHeight: 1.15,
  }

  const lede = {
    fontFamily: FONT_BODY, fontSize: '14px',
    color: TEXT_META, lineHeight: 1.55,
    margin: '0 0 22px',
  }

  const close = {
    position: 'absolute', top: '14px', right: '14px',
    width: '32px', height: '32px',
    background: 'transparent', border: 'none',
    fontFamily: FONT_BODY, fontSize: '22px',
    color: TEXT_FAINT, cursor: 'pointer',
    lineHeight: 1, padding: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: '50%',
  }

  const grid = {
    display: 'grid',
    gridTemplateColumns: isNarrow ? '1fr' : '1fr 1fr',
    gap: '10px',
  }

  return (
    <>
      <style>{KEYFRAMES_CSS}</style>
      <div
        style={backdrop}
        onClick={onBackdropClick}
        role="presentation"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-overlay-title"
          style={panel}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={close}
            onMouseEnter={e => { e.currentTarget.style.background = GOLD_HOVER }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            ×
          </button>

          <p style={eyebrow}>Add</p>
          <h2 id="add-overlay-title" style={title}>Add to the ecosystem</h2>
          <p style={lede}>What would you like to add?</p>

          <div style={grid}>
            {CARDS.map(card => (
              <Card key={card.key} card={card} onChoose={choose} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Card ─────────────────────────────────────────────────────
// Hover state is local so we don't manage four pieces of state in the
// parent. Card is presentational; the parent owns routing.

function Card({ card, onChoose }) {
  const [hover, setHover] = useState(false)

  const card_s = {
    background: hover ? GOLD_HOVER : BG_CARD,
    border: `1px solid ${hover ? GOLD : GOLD_RULE}`,
    borderRadius: '10px',
    padding: '18px 18px 16px',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    textAlign: 'left',
    display: 'flex', flexDirection: 'column', gap: '6px',
    fontFamily: FONT_BODY,
    minHeight: '108px',
    boxSizing: 'border-box',
  }

  const cardLabel = {
    fontFamily: FONT_DISPLAY,
    fontSize: '20px', fontWeight: 400,
    color: TEXT_INK, lineHeight: 1.2,
  }

  const cardDesc = {
    fontFamily: FONT_BODY,
    fontSize: '13px', color: TEXT_META,
    lineHeight: 1.5, margin: 0,
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onChoose(card)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onChoose(card)
        }
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={card_s}
    >
      <span style={cardLabel}>{card.label}</span>
      <span style={cardDesc}>{card.desc}</span>
    </div>
  )
}

// Keyframes for the overlay entrance. Kept here so AddOverlay is fully
// self-contained — no global.css edits required to mount this component.
const KEYFRAMES_CSS = `
@keyframes add-overlay-fade {
  from { opacity: 0; transform: scale(0.985); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes add-overlay-up {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
`
