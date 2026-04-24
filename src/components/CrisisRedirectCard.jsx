import { CrisisResources } from './CrisisResources'

const body = { fontFamily: "'Lora', Georgia, serif" }
const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }

/**
 * CrisisRedirectCard
 *
 * Rendered inside the Map when the synthesis API returns a crisisGate flag.
 * Replaces the developmental synthesis with an honest redirect to real
 * human support — no AI inference, no developmental framing.
 *
 * Visual treatment is warm and calm: same gold/cream palette as the
 * rest of the tool, soft border, generous spacing, no red, no warning
 * iconography. The tone matches the tool's existing voice — settled,
 * present, holding.
 *
 * Props:
 *   message  string — paragraph-broken text from the API
 *   onExit   func   — called when user clicks "Save and exit"
 */
export function CrisisRedirectCard({ message, onExit }) {
  const paragraphs = (message || '').split('\n\n').filter(p => p.trim())

  return (
    <div style={{
      maxWidth: '720px',
      margin: '0 auto',
      padding: '60px 40px 80px',
    }}>

      {/* Eyebrow */}
      <span style={{
        ...sc, fontSize: '12px', letterSpacing: '0.20em',
        color: '#A8721A', display: 'block', marginBottom: '16px',
        textAlign: 'center',
      }}>
        North Star
      </span>

      {/* Main message card */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid rgba(200,146,42,0.25)',
        borderRadius: '14px',
        padding: 'clamp(28px, 5vw, 48px)',
        marginBottom: '32px',
      }}>
        {paragraphs.map((p, i) => (
          <p
            key={i}
            style={{
              ...body,
              fontSize: i === 0 ? 'clamp(18px,2.4vw,22px)' : 'clamp(16px,2vw,18px)',
              fontWeight: 300,
              fontStyle: i === 0 ? 'italic' : 'normal',
              color: '#0F1523',
              lineHeight: 1.75,
              marginBottom: i === paragraphs.length - 1 ? 0 : '20px',
            }}
          >
            {p}
          </p>
        ))}
      </div>

      {/* Resources section */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{
          ...body, fontSize: '20px', fontWeight: 300, color: '#0F1523',
          marginBottom: '8px',
        }}>
          People who are trained to help
        </h3>
        <p style={{
          ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)',
          marginBottom: '24px', lineHeight: 1.6,
        }}>
          Free, confidential, available now. You don't have to be in crisis to call.
        </p>
        <CrisisResources variant="compact" />
      </div>

      {/* Footer with exit + reassurance */}
      <div style={{
        borderTop: '1px solid rgba(200,146,42,0.20)',
        paddingTop: '32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '14px',
      }}>
        <button
          onClick={onExit}
          style={{
            ...sc, fontSize: '14px', letterSpacing: '0.16em',
            padding: '12px 32px', borderRadius: '40px',
            border: '1.5px solid rgba(168,114,26,0.78)',
            background: 'rgba(200,146,42,0.05)',
            color: '#A8721A',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          Save and exit
        </button>
        <p style={{
          ...body, fontSize: '13px', fontStyle: 'italic',
          color: 'rgba(15,21,35,0.50)', textAlign: 'center', margin: 0,
        }}>
          Your Map is saved. You can return to it any time.
        </p>
      </div>
    </div>
  )
}
