// src/beta/components/ProfileNotFor.jsx
// "What I am not for" — dont_count_on_me_for free-text.

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

export function ProfileNotFor({ dontCountOnMeFor }) {
  if (!dontCountOnMeFor) return null

  return (
    <div style={{ marginBottom: '72px' }}>
      <div style={{
        ...sc,
        fontSize: '11px',
        letterSpacing: '0.22em',
        color: 'rgba(15,21,35,0.40)',
        marginBottom: '20px',
        textTransform: 'uppercase',
      }}>
        What I am not for
      </div>
      <p style={{
        ...body,
        fontSize: '17px',
        fontWeight: 300,
        color: 'rgba(15,21,35,0.55)',
        lineHeight: 1.75,
        margin: 0,
        maxWidth: '560px',
      }}>
        {dontCountOnMeFor}
      </p>
    </div>
  )
}
