// src/beta/components/ProfileIdentityStrip.jsx
// Identity strip: name, focus, headline, primary "I am" statement.

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

export function ProfileIdentityStrip({ displayName, focusName, headline, primaryIAStatement, archetype, civDomain, scale }) {
  return (
    <div style={{ marginBottom: '64px' }}>
      {/* Name */}
      <h1 style={{
        ...body,
        fontSize: 'clamp(36px, 5vw, 54px)',
        fontWeight: 300,
        color: '#0F1523',
        lineHeight: 1.06,
        letterSpacing: '-0.01em',
        margin: '0 0 10px',
      }}>
        {displayName || 'This profile is still forming.'}
      </h1>

      {/* Location focus */}
      {focusName && (
        <div style={{
          ...sc,
          fontSize: '13px',
          letterSpacing: '0.20em',
          color: 'rgba(15,21,35,0.50)',
          marginBottom: '18px',
          textTransform: 'uppercase',
        }}>
          {focusName}
        </div>
      )}

      {/* Headline */}
      {headline && (
        <p style={{
          ...body,
          fontSize: 'clamp(17px, 2vw, 20px)',
          fontWeight: 300,
          color: 'rgba(15,21,35,0.80)',
          lineHeight: 1.55,
          margin: '0 0 24px',
          maxWidth: '560px',
        }}>
          {headline}
        </p>
      )}

      {/* Primary "I am" statement */}
      {primaryIAStatement && (
        <p style={{
          ...body,
          fontSize: 'clamp(15px, 1.8vw, 17px)',
          fontWeight: 300,
          fontStyle: 'italic',
          color: 'rgba(15,21,35,0.65)',
          lineHeight: 1.7,
          margin: '0 0 20px',
          maxWidth: '520px',
        }}>
          {primaryIAStatement}
        </p>
      )}

      {/* Purpose piece coordinates */}
      {(archetype || civDomain || scale) && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
          {[archetype, civDomain, scale].filter(Boolean).map((v, i) => (
            <span key={i} style={{
              ...sc,
              fontSize: '11px',
              letterSpacing: '0.14em',
              color: '#A8721A',
              background: 'rgba(200,146,42,0.06)',
              border: '1px solid rgba(200,146,42,0.25)',
              borderRadius: '4px',
              padding: '3px 9px',
            }}>
              {v}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
