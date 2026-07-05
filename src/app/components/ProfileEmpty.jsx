// src/beta/components/ProfileEmpty.jsx
// Empty profile state — sparse and intentional, not "you have nothing."

const sc   = { fontFamily: "'IBM Plex Mono', Georgia, serif" }
const body = { fontFamily: "'Newsreader', Georgia, serif" }

export function ProfileEmpty({ displayName }) {
  return (
    <div style={{
      paddingTop: '80px',
      paddingBottom: '120px',
      textAlign: 'center',
    }}>
      {displayName && (
        <h2 style={{
          ...body,
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: 400,
          color: '#0F1523',
          margin: '0 0 20px',
          lineHeight: 1.15,
        }}>
          {displayName}
        </h2>
      )}
      <p style={{
        ...body,
        fontSize: '17px',
        fontWeight: 400,
        color: 'rgba(15,21,35,0.55)',
        lineHeight: 1.75,
        margin: '0 auto',
        maxWidth: '340px',
      }}>
        This profile is still forming.
      </p>
    </div>
  )
}
