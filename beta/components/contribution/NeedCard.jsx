// src/beta/components/contribution/NeedCard.jsx
//
// Single org need rendered as a card on the contribution ladder.
// Composes: org name → tier badge + medium icon → description →
// metadata row (time estimate, urgency, focus location) →
// principle alignment (PrincipleStrip from Module 1.5) →
// Express interest button.
//
// Props:
//   need              — row from org_needs_beta with joined fields:
//                         { id, actor_id, tier, medium, description, time_estimate_minutes,
//                           urgency, focus_id, status,
//                           actor_name, actor_slug, focus_name,
//                           tier_label, principle_slugs }
//   userInterest      — existing contribution_interests_beta row for this user/need (or null)
//   onExpressInterest — async (need, message) => void
//   pendingExpress    — boolean; disables button when true

import { useState } from 'react'
import { Link } from 'react-router-dom'
import PrincipleStrip from '../PrincipleStrip'

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

const URGENCY_STYLES = {
  high:   { color: '#8A3030', label: 'High urgency' },
  medium: { color: '#8A7030', label: 'Medium urgency' },
  low:    { color: 'rgba(15,21,35,0.55)', label: 'Low urgency' },
}

const MEDIUM_LABELS = {
  digital:   'Digital',
  in_person: 'In person',
  either:    'Either',
}

function formatTime(mins) {
  if (mins == null) return null
  if (mins < 60)   return `${mins}m`
  if (mins < 480)  return `${Math.round(mins / 60)}h`
  if (mins < 2400) return `${Math.round(mins / 480)}d`
  return `${Math.round(mins / 2400)}w`
}

// Inline SVG icons — no external dependency
function DigitalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1.5" y="3" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <line x1="5" y1="14" x2="11" y2="14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function InPersonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 14c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function EitherIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="5" cy="6" r="2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="8.5" y="4" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function MediumIcon({ medium }) {
  if (medium === 'digital')   return <DigitalIcon />
  if (medium === 'in_person') return <InPersonIcon />
  return <EitherIcon />
}

export default function NeedCard({
  need,
  userInterest = null,
  onExpressInterest,
  pendingExpress = false,
}) {
  const [showInterestForm, setShowInterestForm] = useState(false)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const urgency = URGENCY_STYLES[need.urgency] || null
  const time    = formatTime(need.time_estimate_minutes)
  const principles = need.principle_slugs || []

  // If user already expressed interest, surface that state.
  const alreadyInterested = userInterest && userInterest.status !== 'declined'

  async function handleSubmitInterest() {
    setSubmitting(true)
    try {
      await onExpressInterest(need, message.trim() || null)
      setShowInterestForm(false)
      setMessage('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      padding: '20px 22px',
      background: '#FFFFFF',
      border: '1px solid rgba(200,146,42,0.20)',
      borderRadius: '14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      {/* Top row: org name + tier + medium */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {need.actor_slug ? (
            <Link
              to={`/beta/org/${need.actor_slug}`}
              style={{
                ...sc,
                fontSize: '14px',
                letterSpacing: '0.06em',
                color: '#0F1523',
                textDecoration: 'none',
                fontWeight: 500,
                display: 'block',
              }}
            >
              {need.actor_name}
            </Link>
          ) : (
            <span style={{
              ...sc,
              fontSize: '14px',
              letterSpacing: '0.06em',
              color: '#0F1523',
              fontWeight: 500,
              display: 'block',
            }}>
              {need.actor_name || 'Organisation'}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Tier badge */}
          <span style={{
            ...sc,
            fontSize: '10px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#A8721A',
            background: 'rgba(200,146,42,0.08)',
            border: '1px solid rgba(200,146,42,0.35)',
            borderRadius: '40px',
            padding: '2px 10px',
          }}>
            {need.tier_label || need.tier}
          </span>

          {/* Medium icon */}
          <span
            title={MEDIUM_LABELS[need.medium] || need.medium}
            style={{
              ...sc,
              fontSize: '10px',
              letterSpacing: '0.1em',
              color: 'rgba(15,21,35,0.55)',
              border: '1px solid rgba(200,146,42,0.18)',
              borderRadius: '40px',
              padding: '2px 8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <MediumIcon medium={need.medium} />
            <span style={{ display: 'none' }}>{MEDIUM_LABELS[need.medium]}</span>
          </span>
        </div>
      </div>

      {/* Description */}
      <p style={{
        ...body,
        fontSize: '15px',
        color: '#0F1523',
        lineHeight: 1.6,
        margin: 0,
      }}>
        {need.description}
      </p>

      {/* Skill tag */}
      {need.skill_tag && (
        <div>
          <span style={{
            ...sc,
            fontSize: '11px',
            letterSpacing: '0.1em',
            color: 'rgba(15,21,35,0.55)',
            background: 'rgba(200,146,42,0.04)',
            border: '1px solid rgba(200,146,42,0.18)',
            borderRadius: '40px',
            padding: '2px 10px',
          }}>
            {need.skill_tag}
          </span>
        </div>
      )}

      {/* Metadata row */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '14px',
        alignItems: 'center',
        ...sc,
        fontSize: '11px',
        letterSpacing: '0.08em',
        color: 'rgba(15,21,35,0.55)',
      }}>
        {time && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ClockIcon /> {time}
          </span>
        )}
        {urgency && (
          <span style={{ color: urgency.color }}>
            {urgency.label}
          </span>
        )}
        {need.focus_name && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <PinIcon /> {need.focus_name}
          </span>
        )}
      </div>

      {/* Principle alignment */}
      {principles.length > 0 && (
        <div>
          <PrincipleStrip slugs={principles} size="sm" />
        </div>
      )}

      {/* Express interest CTA / form */}
      <div style={{
        marginTop: '4px',
        paddingTop: '12px',
        borderTop: '1px solid rgba(200,146,42,0.10)',
      }}>
        {alreadyInterested ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckIcon />
            <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.1em', color: '#2D6A4F' }}>
              Interest expressed
            </span>
            {userInterest.status === 'accepted' && (
              <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.1em', color: '#A8721A' }}>
                · Org accepted
              </span>
            )}
          </div>
        ) : showInterestForm ? (
          <div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="A brief note for the organisation. Optional."
              rows={2}
              style={{
                ...body,
                fontSize: '14px',
                color: '#0F1523',
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(200,146,42,0.30)',
                background: '#FAFAF7',
                outline: 'none',
                resize: 'vertical',
                lineHeight: 1.55,
                marginBottom: '10px',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleSubmitInterest}
                disabled={submitting || pendingExpress}
                style={{
                  ...sc,
                  fontSize: '11px',
                  letterSpacing: '0.14em',
                  color: '#FFFFFF',
                  background: submitting ? 'rgba(200,146,42,0.5)' : '#C8922A',
                  border: 'none',
                  borderRadius: '40px',
                  padding: '8px 18px',
                  cursor: submitting ? 'wait' : 'pointer',
                }}
              >
                {submitting ? 'Sending' : 'Send interest'}
              </button>
              <button
                type="button"
                onClick={() => { setShowInterestForm(false); setMessage('') }}
                style={{
                  ...sc,
                  fontSize: '11px',
                  letterSpacing: '0.14em',
                  color: 'rgba(15,21,35,0.55)',
                  background: 'transparent',
                  border: '1px solid rgba(15,21,35,0.20)',
                  borderRadius: '40px',
                  padding: '8px 18px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
            <p style={{
              ...body,
              fontSize: '12px',
              color: 'rgba(15,21,35,0.55)',
              margin: '8px 0 0',
              lineHeight: 1.5,
            }}>
              Expressing interest does not auto-commit you. The organisation will see your note and reply.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowInterestForm(true)}
            style={{
              ...sc,
              fontSize: '11px',
              letterSpacing: '0.14em',
              color: '#A8721A',
              background: 'rgba(200,146,42,0.06)',
              border: '1px solid rgba(200,146,42,0.30)',
              borderRadius: '40px',
              padding: '8px 18px',
              cursor: 'pointer',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,146,42,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(200,146,42,0.06)'}
          >
            Express interest
          </button>
        )}
      </div>
    </div>
  )
}

function ClockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 4.5V8L10 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 14.5s5-4.6 5-9a5 5 0 1 0-10 0c0 4.4 5 9 5 9z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="8" cy="5.5" r="1.6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="7" stroke="#2D6A4F" strokeWidth="1.4" fill="rgba(45,106,79,0.08)" />
      <path d="M5 8.2L7 10.2L11 6" stroke="#2D6A4F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
