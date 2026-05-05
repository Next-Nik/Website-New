import { useState } from 'react'
import HorizonFloorCard from './HorizonFloorCard'
import { isValidDomainSlug } from '../constants/horizonFloor'

// ─────────────────────────────────────────────────────────────────────────────
// HorizonFloorAdmissionCheck
//
// Reusable admission check rendered inside actor / practice / contribution /
// bilateral artefact submission flows. It does not save the underlying
// submission itself — the parent flow does that. This component returns the
// contributor's compatibility decision plus an optional reason string.
//
// Voice: grown-up, not preachy. The Horizon is the commitment. The user
// reads it and confirms. No "are you sure?" theatre.
//
// Behaviour:
//   - Renders the relevant domain's Horizon Floor (Goal + explainer).
//   - Two paths:
//       1. Confirm compatibility — checkbox: "I have read the Horizon and
//          confirm this contribution is compatible." Then "Confirm and
//          continue."
//       2. Flag for review — "I am uncertain. Please review before
//          publishing." Optionally takes a short reason.
//   - On submit, calls onResolve({ status, reason }) where status is
//     'compatible' or 'flagged_for_review'.
//   - Withdraw cancels the submission outright. onResolve({ status:
//     'withdrawn' }).
//
// Explicitly incompatible content is NOT blocked here. That is a curator
// decision. This surface only records the contributor's stated stance.
//
// Props:
//   domainSlug   — primary domain of the submission (required)
//   contextLabel — short label naming what the contribution is, e.g.
//                  'this practice', 'this actor', 'this contribution'.
//                  Default 'this contribution'.
//   onResolve({ status, reason }) — required.
//   onCancel     — optional. If absent, the withdraw button is hidden.
//   className    — passthrough
// ─────────────────────────────────────────────────────────────────────────────

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

export default function HorizonFloorAdmissionCheck({
  domainSlug,
  contextLabel = 'this contribution',
  onResolve,
  onCancel,
  className,
}) {
  const [confirmed, setConfirmed] = useState(false)
  const [path, setPath] = useState('confirm')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isValidDomainSlug(domainSlug)) {
    return null
  }

  async function handleConfirm() {
    if (!confirmed || submitting) return
    setSubmitting(true)
    try {
      await onResolve?.({ status: 'compatible', reason: '' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleFlag() {
    if (submitting) return
    setSubmitting(true)
    try {
      await onResolve?.({
        status: 'flagged_for_review',
        reason: reason.trim(),
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleWithdraw() {
    if (submitting) return
    if (onCancel) {
      await onCancel()
      return
    }
    setSubmitting(true)
    try {
      await onResolve?.({ status: 'withdrawn', reason: '' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className={className}
      style={{
        background: '#FAFAF7',
        padding: '0',
      }}
    >
      <span
        style={{
          ...sc,
          display: 'block',
          fontSize: '13px',
          letterSpacing: '0.08em',
          color: '#A8721A',
          fontWeight: 600,
          marginBottom: '16px',
        }}
      >
        Horizon Floor
      </span>

      <HorizonFloorCard domainSlug={domainSlug} variant="full" />

      <div
        aria-hidden
        style={{
          height: '1px',
          background: 'rgba(200, 146, 42, 0.20)',
          margin: '32px 0',
        }}
      />

      {/* Path tabs. */}
      <div
        role="tablist"
        aria-label="Admission decision"
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <PathTab
          active={path === 'confirm'}
          onClick={() => setPath('confirm')}
          label="Confirm compatibility"
        />
        <PathTab
          active={path === 'flag'}
          onClick={() => setPath('flag')}
          label="Flag for review"
        />
      </div>

      {path === 'confirm' && (
        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              cursor: 'pointer',
              marginBottom: '20px',
            }}
          >
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              style={{
                marginTop: '4px',
                width: '16px',
                height: '16px',
                accentColor: '#A8721A',
              }}
            />
            <span
              style={{
                ...body,
                fontSize: '16px',
                lineHeight: 1.55,
                color: '#0F1523',
              }}
            >
              I have read the Horizon and confirm {contextLabel} is compatible
              with it.
            </span>
          </label>

          <ActionRow
            primary={{
              label: submitting ? 'Saving' : 'Confirm and continue',
              onClick: handleConfirm,
              disabled: !confirmed || submitting,
            }}
            secondary={
              onCancel
                ? {
                    label: 'Withdraw',
                    onClick: handleWithdraw,
                    disabled: submitting,
                  }
                : null
            }
          />
        </div>
      )}

      {path === 'flag' && (
        <div>
          <p
            style={{
              ...body,
              fontSize: '16px',
              lineHeight: 1.55,
              color: '#0F1523',
              margin: '0 0 12px',
            }}
          >
            A curator will review {contextLabel} before it publishes. Your
            submission is held in the queue until that review completes.
          </p>

          <label
            style={{
              ...sc,
              display: 'block',
              fontSize: '13px',
              letterSpacing: '0.06em',
              color: 'rgba(15, 21, 35, 0.72)',
              fontWeight: 600,
              marginBottom: '6px',
            }}
            htmlFor="horizon-floor-reason"
          >
            What is the uncertainty? (optional)
          </label>
          <textarea
            id="horizon-floor-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder=""
            style={{
              ...body,
              width: '100%',
              fontSize: '16px',
              lineHeight: 1.5,
              color: '#0F1523',
              padding: '10px 12px',
              border: '1px solid rgba(200, 146, 42, 0.30)',
              borderRadius: '14px',
              background: '#FFFFFF',
              resize: 'vertical',
              marginBottom: '20px',
            }}
          />

          <ActionRow
            primary={{
              label: submitting ? 'Saving' : 'Send for review',
              onClick: handleFlag,
              disabled: submitting,
            }}
            secondary={
              onCancel
                ? {
                    label: 'Withdraw',
                    onClick: handleWithdraw,
                    disabled: submitting,
                  }
                : null
            }
          />
        </div>
      )}
    </div>
  )
}

// ─── Internal: small chrome ──────────────────────────────────────────────────

function PathTab({ active, onClick, label }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        ...sc,
        background: active ? 'rgba(200, 146, 42, 0.08)' : 'transparent',
        border: '1px solid ' + (active ? 'rgba(200, 146, 42, 0.45)' : 'rgba(200, 146, 42, 0.20)'),
        borderRadius: '40px',
        padding: '6px 14px',
        fontSize: '14px',
        letterSpacing: '0.04em',
        color: active ? '#A8721A' : 'rgba(15, 21, 35, 0.72)',
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

function ActionRow({ primary, secondary }) {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={primary.onClick}
        disabled={primary.disabled}
        style={{
          ...sc,
          background: primary.disabled ? 'rgba(200, 146, 42, 0.20)' : '#0F1523',
          color: primary.disabled ? 'rgba(255, 255, 255, 0.7)' : '#FFFFFF',
          border: 'none',
          borderRadius: '40px',
          padding: '10px 22px',
          fontSize: '15px',
          letterSpacing: '0.04em',
          fontWeight: 600,
          cursor: primary.disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {primary.label}
      </button>
      {secondary && (
        <button
          type="button"
          onClick={secondary.onClick}
          disabled={secondary.disabled}
          style={{
            ...sc,
            background: 'transparent',
            color: 'rgba(15, 21, 35, 0.55)',
            border: 'none',
            padding: '10px 14px',
            fontSize: '14px',
            letterSpacing: '0.04em',
            cursor: secondary.disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {secondary.label}
        </button>
      )}
    </div>
  )
}
