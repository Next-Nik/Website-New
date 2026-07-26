// src/app/components/FeaturedTop.jsx
//
// Social half · item 7 · What sits at the top of Today, and the request that
// gets it there.
//
// Two exports, one concern:
//   FeaturedTop      — the one or two consented moments above the daily surface
//   FeaturedConsent  — "May we put this at the top of Today?", shown to the
//                      owner where they already are, because there is no
//                      notification system and nothing here chases anyone
//
// Never metric-derived, never a leaderboard, rotation not accumulation. The
// eyebrow says what is actually true — we wanted you to see this — rather than
// implying the person won something.

import { useState } from 'react'
import { at, body, sc } from '../../lib/designTokens'
import { momentImageUrl } from '../../lib/momentCapture'
import { answerFeature, virtueLabel } from '../lib/featured'

function Thumb({ moment, size }) {
  const src = moment.image_path ? momentImageUrl(moment.thumb_path || moment.image_path) : null
  if (!src) return null
  return (
    <img src={src} alt="A moment"
      style={{ width: size, height: size, flex: `0 0 ${size}`, objectFit: 'cover',
        borderRadius: '10px', display: 'block' }} />
  )
}

// ─── the top of the day ──────────────────────────────────────────────────────

export function FeaturedTop({ moments = [] }) {
  if (!moments.length) return null
  return (
    <section aria-label="At the top of today" style={{ marginBottom: '28px' }}>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', textTransform: 'uppercase',
        color: at.brass, marginBottom: '16px' }}>
        We wanted you to see this
      </div>

      {moments.map(m => {
        const virtue = virtueLabel(m.featured_virtue)
        return (
          <div key={m.id} style={{ border: `1px solid ${at.brassEdge}`,
            background: 'rgba(169,116,63,0.08)', borderRadius: '14px',
            padding: '20px 22px', marginBottom: '12px',
            display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <Thumb moment={m} size="110px" />
            <div style={{ flex: 1, minWidth: '220px' }}>
              {m.line && (
                <p style={{ ...body, fontSize: '16px', color: at.text, lineHeight: 1.6,
                  fontStyle: 'italic', margin: '0 0 8px' }}>
                  &ldquo;{m.line}&rdquo;
                </p>
              )}
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em',
                textTransform: 'uppercase', color: at.ghost }}>
                {m.domain ? String(m.domain) : 'Today'}
              </div>
              {virtue && (
                <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: at.brass, border: `1px solid ${at.brassEdge}`,
                  borderRadius: '22px', padding: '3px 10px', marginTop: '12px',
                  display: 'inline-block' }}>
                  {virtue}
                </span>
              )}
            </div>
          </div>
        )
      })}

      <p style={{ ...body, fontSize: '13px', color: at.ghost, lineHeight: 1.6, margin: '14px 0 0' }}>
        Shown with permission, chosen for the work — never for numbers. Different people tomorrow.
      </p>
      <hr style={{ height: '1px', background: at.grid, border: 0, margin: '26px 0 0' }} />
    </section>
  )
}

// ─── the request, owner side ─────────────────────────────────────────────────

export function FeaturedConsent({ moment, onAnswered }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState(null)
  if (!moment) return null

  async function answer(yes) {
    setBusy(true); setErr(null)
    const r = await answerFeature(moment.id, yes)
    setBusy(false)
    if (!r.ok) { setErr(r.message); return }
    if (onAnswered) onAnswered(yes)
  }

  return (
    <section aria-label="A request" style={{ background: at.object,
      border: `1px solid ${at.verdigrisEdge}`, borderRadius: '14px',
      padding: '24px 26px', marginBottom: '28px' }}>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', textTransform: 'uppercase',
        color: at.verdigris }}>
        A request
      </div>
      <h2 style={{ ...body, fontSize: '20px', fontWeight: 500, color: at.text,
        lineHeight: 1.25, margin: '10px 0 0' }}>
        May we put this at the top of Today?
      </h2>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start',
        marginTop: '16px', flexWrap: 'wrap' }}>
        <Thumb moment={moment} size="72px" />
        {moment.line && (
          <p style={{ ...body, fontSize: '15px', color: at.text, lineHeight: 1.6,
            fontStyle: 'italic', margin: 0, flex: 1, minWidth: '200px' }}>
            &ldquo;{moment.line}&rdquo;
          </p>
        )}
      </div>

      <p style={{ ...body, fontSize: '14px', color: at.meta, lineHeight: 1.6, margin: '16px 0 0' }}>
        It would sit above today’s moments until midnight, exactly as you wrote it. Nothing else
        changes, and nothing happens if you would rather not.
      </p>

      {err && (
        <div style={{ ...body, fontSize: '14px', color: at.brass, lineHeight: 1.5, marginTop: '10px' }}>
          {err}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => answer(true)} disabled={busy}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#0F241D', background: at.verdigris, border: 'none', borderRadius: '22px',
            padding: '10px 20px', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
          Yes, go ahead
        </button>
        <button type="button" onClick={() => answer(false)} disabled={busy}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase',
            color: at.ghost, background: 'transparent', border: `1px solid ${at.grid}`,
            borderRadius: '22px', padding: '10px 20px', cursor: busy ? 'default' : 'pointer' }}>
          No thanks
        </button>
      </div>
    </section>
  )
}

export default FeaturedTop
