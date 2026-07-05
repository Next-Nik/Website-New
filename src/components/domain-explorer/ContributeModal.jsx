import React from 'react'

/**
 * ContributeModal — stub component for DomainExplorer
 *
 * Currently rendered with isOpen={false} as a placeholder for future
 * contribution flow from the domain explorer. When wired up, this modal
 * will allow users to signal interest in contributing to a specific domain.
 *
 * Props:
 *   isOpen    {boolean}  — controls visibility
 *   onClose   {function} — called when modal should close
 *   domainName {string}  — name of the domain being contributed to
 */
export function ContributeModal({ isOpen, onClose, domainName }) {
  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 21, 35, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#FDFAF5',
          borderRadius: '14px',
          padding: '48px 40px',
          maxWidth: '480px',
          width: '100%',
          position: 'relative',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '24px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', Georgia, serif",
            fontSize: '18px',
            color: '#26302A',
            lineHeight: 1,
          }}
        >
          ×
        </button>

        <p
          style={{
            fontFamily: "'IBM Plex Mono', Georgia, serif",
            fontSize: '13px',
            letterSpacing: '0.18em',
            color: '#26302A',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}
        >
          Contribute
        </p>

        <h2
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: '28px',
            fontWeight: 400,
            color: 'rgba(15,21,35,0.9)',
            marginBottom: '16px',
            lineHeight: 1.2,
          }}
        >
          {domainName}
        </h2>

        <p
          style={{
            fontFamily: "'Newsreader', Georgia, serif",
            fontSize: '15px',
            color: 'rgba(15,21,35,0.65)',
            lineHeight: 1.7,
          }}
        >
          Contribution pathways for this domain are coming soon.
        </p>
      </div>
    </div>
  )
}
