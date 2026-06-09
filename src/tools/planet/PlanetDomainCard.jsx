// src/tools/planet/PlanetDomainCard.jsx
// Expandable domain card for assessment scoring
// Each card handles one domain: open/close, score selection, optional notes

import { useState } from 'react'
import { PLANET_SCALE, getPlanetScoreColor } from '../../constants/horizonScalePlanet'
import { serif, body, sc } from '../../lib/designTokens'

export function PlanetDomainCard({
  domain,
  currentScore,
  notes,
  isActive,
  onOpen,
  onClose,
  onScore,
}) {
  const [localNotes, setLocalNotes] = useState(notes)
  const scored = currentScore != null

  function handleScore(score) {
    onScore(score, localNotes)
  }

  function handleNotesChange(e) {
    setLocalNotes(e.target.value)
    if (currentScore != null) {
      onScore(currentScore, e.target.value)
    }
  }

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: `1px solid ${isActive ? domain.color : 'rgba(200,146,42,0.20)'}`,
        borderRadius: 6,
        overflow: 'hidden',
        transition: 'border-color 0.2s ease',
      }}
    >
      {/* Card header — always visible */}
      <button
        onClick={isActive ? onClose : onOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          width: '100%',
          padding: '18px 20px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Domain colour strip */}
        <div style={{
          width: 4,
          height: 36,
          background: domain.color,
          borderRadius: 2,
          flexShrink: 0,
        }} />

        <div style={{ flex: 1 }}>
          <p style={{
            ...sc,
            fontSize: 11,
            letterSpacing: '0.08em',
            color: domain.color,
            marginBottom: 2,
          }}>
            {domain.label}
          </p>
          <p style={{
            ...body,
            fontSize: 13,
            color: 'rgba(15,21,35,0.72)',
          }}>
            {domain.tip}
          </p>
        </div>

        {/* Score badge or prompt */}
        {scored ? (
          <div style={{ textAlign: 'right' }}>
            <p style={{
              ...serif,
              fontSize: 32,
              fontWeight: 400,
              color: getPlanetScoreColor(currentScore),
              lineHeight: 1,
            }}>
              {currentScore}
            </p>
            <p style={{
              ...sc,
              fontSize: 10,
              letterSpacing: '0.06em',
              color: 'rgba(15,21,35,0.55)',
            }}>
              {PLANET_SCALE.find(s => s.score === currentScore)?.label}
            </p>
          </div>
        ) : (
          <p style={{
            ...sc,
            fontSize: 11,
            letterSpacing: '0.08em',
            color: 'rgba(15,21,35,0.55)',
          }}>
            {isActive ? 'Close ↑' : 'Score →'}
          </p>
        )}
      </button>

      {/* Expanded panel */}
      {isActive && (
        <div style={{ padding: '0 20px 24px', borderTop: '1px solid rgba(200,146,42,0.12)' }}>
          {/* Horizon goal */}
          <p style={{
            ...body,
            fontSize: 14,
            color: 'rgba(15,21,35,0.72)',
            lineHeight: 1.6,
            padding: '16px 0',
            borderBottom: '1px solid rgba(200,146,42,0.12)',
            marginBottom: 20,
          }}>
            <span style={{ ...sc, fontSize: 10, letterSpacing: '0.08em', color: '#A8721A', display: 'block', marginBottom: 4 }}>
              HORIZON GOAL
            </span>
            {domain.horizonGoal}
          </p>

          {/* Score selector — 1 through 10 */}
          <p style={{
            ...sc,
            fontSize: 11,
            letterSpacing: '0.08em',
            color: 'rgba(15,21,35,0.72)',
            marginBottom: 12,
          }}>
            Where does this actor stand today?
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 8,
            marginBottom: 20,
          }}>
            {PLANET_SCALE.map(({ score, label }) => (
              <button
                key={score}
                onClick={() => handleScore(score)}
                title={label}
                style={{
                  ...sc,
                  fontSize: 11,
                  letterSpacing: '0.06em',
                  padding: '10px 4px',
                  background: currentScore === score
                    ? getPlanetScoreColor(score)
                    : 'transparent',
                  color: currentScore === score
                    ? '#FFFFFF'
                    : getPlanetScoreColor(score),
                  border: `1.5px solid ${getPlanetScoreColor(score)}`,
                  borderRadius: 4,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <span style={{ fontSize: 16, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                  {score}
                </span>
                <span style={{ fontSize: 9 }}>{label}</span>
              </button>
            ))}
          </div>

          {/* Notes */}
          <div>
            <label style={{
              ...sc,
              fontSize: 10,
              letterSpacing: '0.08em',
              color: 'rgba(15,21,35,0.55)',
              display: 'block',
              marginBottom: 6,
            }}>
              Notes (optional)
            </label>
            <textarea
              value={localNotes}
              onChange={handleNotesChange}
              placeholder="What's driving this score? What's the key signal?"
              rows={3}
              style={{
                ...body,
                fontSize: 14,
                width: '100%',
                padding: '10px 14px',
                background: '#FAFAF7',
                border: '1px solid rgba(200,146,42,0.20)',
                borderRadius: 4,
                color: '#0F1523',
                resize: 'vertical',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
