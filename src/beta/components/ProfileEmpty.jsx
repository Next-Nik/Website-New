// src/beta/components/ProfileEmpty.jsx
// Empty profile state — sparse and intentional, not "you have nothing."

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

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
          fontWeight: 300,
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
        fontWeight: 300,
        color: 'rgba(15,21,35,0.45)',
        lineHeight: 1.75,
        margin: '0 auto',
        maxWidth: '340px',
      }}>
        This profile is still forming.
      </p>
    </div>
  )
}
