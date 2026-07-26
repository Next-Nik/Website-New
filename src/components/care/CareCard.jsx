// src/components/care/CareCard.jsx
//
// The Care Card. A garment care tag: punched grommet, hanging string, and a
// strip of reinterpreted laundry-care symbols. Funny at first glance, sincere
// on the second read, and built to be screenshotted.
//
// Structure runs most permanent to most alive, which is also the trust
// gradient of the systems it draws on: placements, then synthesis, then the
// symbol strip, then what fills them, then attachment, then Right now.
//
// DESIGN LAW NOTES
//   · Field Notes rail throughout. Every colour comes from designTokens.
//   · Top rule is the signature element: moss = living and settled, clay =
//     asking for attention. Only "Right now" gets clay, because it is the only
//     section that goes stale.
//   · Progress lines are the existing segmented hand-ruled treatment.
//   · Italic appears exactly once, on the user's own sentence. That is the
//     design law and it is also the point: a partner should receive
//     "silence reads louder than you mean it to" in the person's voice, not
//     the system's.
//   · The renderer holds no computation. Everything arrives shaped from
//     lib/care/cardModel.js, so this component works unchanged wherever the
//     engine is dropped.

import { fn, fnText, space, shadow, display, mono } from '../../lib/designTokens'

const CARD_WIDTH = 460

/* ── small parts ──────────────────────────────────────────── */

// The signature Field Notes top rule.
function Section({ tone = 'moss', eyebrow, children, last = false }) {
  return (
    <section
      style={{
        borderTop: `3px solid ${tone === 'clay' ? fn.clay : fn.moss}`,
        padding: `${space.lg} 0 ${last ? 0 : space.lg}`,
      }}
    >
      {eyebrow && (
        <div style={{ ...fnText.eyebrow, marginBottom: space.sm }}>{eyebrow}</div>
      )}
      {children}
    </section>
  )
}

// Segmented hand-ruled progress. Twelve segments, moss fill.
function RuledBar({ value }) {
  const segments = 12
  const filled = Math.round((value / 100) * segments)
  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
      {Array.from({ length: segments }, (_, i) => (
        <div
          key={i}
          style={{
            height: '7px',
            flex: 1,
            background: i < filled ? fn.moss : 'transparent',
            borderBottom: i < filled ? 'none' : `1px solid ${fn.rule}`,
            borderRadius: '1px',
          }}
        />
      ))}
    </div>
  )
}

// The punched grommet and its hanging string. The string is an SVG path with
// presentation attributes only — no style= prop, per the Chrome 148 law.
function Grommet() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="120" height="52" viewBox="0 0 120 52" aria-hidden="true" focusable="false">
        {/* A single loop of string through the hole, the way a swing tag
            hangs. One stroke, closed — two strands read as a stethoscope. */}
        <path
          d="M60 50 C 44 42, 32 26, 40 14 C 48 3, 72 3, 80 14 C 88 26, 76 42, 60 50 Z"
          fill="none"
          stroke={fn.ink}
          strokeOpacity="0.3"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          border: `1.5px solid ${fn.rule}`,
          background: fn.ground,
          boxShadow: 'inset 0 1px 3px rgba(38,36,32,.20)',
          marginTop: '-13px',
        }}
      />
    </div>
  )
}

// Care symbols are enclosed glyphs on a real garment tag, and the enclosure is
// most of what makes them read as symbols rather than as decoration.
function SymbolStrip({ symbols }) {
  return (
    <div
      style={{
        border: `1px solid ${fn.rule}`,
        borderRadius: '2px',
        padding: `${space.md} ${space.lg}`,
        background: fn.ground,
      }}
    >
      {symbols.map((symbol, index) => (
        <div
          key={symbol.key}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: space.md,
            paddingTop: index === 0 ? 0 : '7px',
            marginTop: index === 0 ? 0 : '7px',
            borderTop: index === 0 ? 'none' : `1px solid ${fn.rule}`,
          }}
        >
          <span
            style={{
              width: '26px',
              height: '26px',
              flexShrink: 0,
              border: `1px solid ${fn.mossEdge}`,
              borderRadius: '2px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px',
              lineHeight: 1,
              color: fn.moss,
            }}
            aria-hidden="true"
          >
            {symbol.glyph}
          </span>
          <span style={{ ...fnText.caption, color: fn.ink }}>{symbol.label}</span>
        </div>
      ))}
    </div>
  )
}

function EvidenceChip({ tier }) {
  const labels = { measured: 'measured', mapped: 'mapped', mythic: 'mythic' }
  return (
    <span
      style={{
        ...mono,
        fontSize: '13px',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: fn.ghost,
        border: `1px solid ${fn.rule}`,
        borderRadius: '2px',
        padding: '1px 6px',
        marginLeft: space.sm,
        whiteSpace: 'nowrap',
      }}
    >
      {labels[tier] || tier}
    </span>
  )
}

/* ── the card ─────────────────────────────────────────────── */

export default function CareCard({ card, showRightNow = true, qrDataUrl = null, width = CARD_WIDTH }) {
  if (!card) return null
  const { header, wired, symbols, fills, attach, rightNow, footer } = card

  return (
    <article
      style={{
        width: '100%',
        maxWidth: `${width}px`,
        margin: '0 auto',
        background: fn.object,
        border: `1px solid ${fn.rule}`,
        borderRadius: '3px',
        boxShadow: shadow.fn.rest,
        padding: `${space.md} ${space.xl} ${space.xl}`,
        boxSizing: 'border-box',
      }}
    >
      <Grommet />

      {/* 1 — Header */}
      <header style={{ textAlign: 'center', paddingBottom: space.lg }}>
        <div style={{ ...fnText.eyebrow, marginBottom: space.sm }}>{header.eyebrow}</div>
        <h1 style={{ ...display, fontSize: '30px', fontWeight: 500, color: fn.ink, margin: 0, lineHeight: 1.1 }}>
          {header.name}
        </h1>
        {header.placements.length > 0 && (
          <div
            style={{
              ...mono,
              fontSize: '13px',
              letterSpacing: '0.08em',
              color: fn.meta,
              marginTop: space.md,
              lineHeight: 1.7,
            }}
          >
            {header.placements.join('  ·  ')}
          </div>
        )}
      </header>

      {/* 2 — How I'm wired */}
      <Section eyebrow="HOW I'M WIRED">
        {wired.pending ? (
          <p style={{ ...fnText.body, margin: 0, color: fn.ghost }}>
            Not synthesised yet. Run the synthesis from the protocol page and this
            becomes a plain-language portrait drawn across every system at once.
          </p>
        ) : (
          <p style={{ ...fnText.body, margin: 0, color: fn.ink }}>{wired.text}</p>
        )}

        {wired.convergences?.length > 0 && (
          <div style={{ marginTop: space.lg }}>
            <div style={{ ...fnText.eyebrow, marginBottom: space.sm }}>WHERE THE SYSTEMS AGREE</div>
            {wired.convergences.map((c, i) => (
              <p key={i} style={{ ...fnText.caption, color: fn.meta, margin: `0 0 ${space.sm}` }}>
                {c.need ? <strong style={{ fontWeight: 600, color: fn.ink }}>{c.need}. </strong> : null}
                {c.reading}
              </p>
            ))}
          </div>
        )}

        {wired.tensions?.length > 0 && (
          <div style={{ marginTop: space.md }}>
            <div style={{ ...fnText.eyebrow, marginBottom: space.sm }}>WHERE THEY DISAGREE</div>
            {wired.tensions.map((t, i) => (
              <p key={i} style={{ ...fnText.caption, color: fn.meta, margin: `0 0 ${space.sm}` }}>
                {t.tension ? <strong style={{ fontWeight: 600, color: fn.ink }}>{t.tension}. </strong> : null}
                {t.inPractice}
              </p>
            ))}
          </div>
        )}
      </Section>

      {/* 3 — Care instructions: the symbol strip */}
      <Section eyebrow="CARE INSTRUCTIONS">
        <SymbolStrip symbols={symbols} />
      </Section>

      {/* 4 — What fills me */}
      {fills.length > 0 && (
        <Section eyebrow="WHAT FILLS ME">
          {fills.map((mode) => (
            <div key={mode.key} style={{ marginBottom: space.md }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '5px',
                  gap: space.sm,
                }}
              >
                <span style={{ ...fnText.body, fontSize: '15px', color: fn.ink }}>{mode.label}</span>
                {mode.keeper && (
                  <span style={{ ...mono, fontSize: '13px', letterSpacing: '0.12em', color: fn.moss }}>
                    THE ONE
                  </span>
                )}
              </div>
              <RuledBar value={mode.value} />
              <p style={{ ...fnText.caption, color: fn.meta, margin: `5px 0 0` }}>{mode.forOthers}</p>
            </div>
          ))}
        </Section>
      )}

      {/* 5 — How I attach, and the one user-voice moment */}
      {(attach?.anxiety || attach?.userLine) && (
        <Section eyebrow="HOW I ATTACH">
          {attach.anxiety && (
            <>
              <p style={{ ...fnText.caption, color: fn.meta, margin: `0 0 ${space.md}` }}>
                <span style={{ ...mono, letterSpacing: '0.1em', color: fn.ink }}>
                  WHEN THINGS GET DISTANT
                </span>
                <EvidenceChip tier="measured" />
                <br />
                {attach.anxiety.line}
              </p>
              <p style={{ ...fnText.caption, color: fn.meta, margin: `0 0 ${space.md}` }}>
                <span style={{ ...mono, letterSpacing: '0.1em', color: fn.ink }}>
                  WHEN THINGS GET HEAVY
                </span>
                <br />
                {attach.avoidance.line}
              </p>
            </>
          )}

          {attach.userLine && (
            <blockquote
              style={{
                margin: `${space.lg} 0 0`,
                paddingLeft: space.lg,
                borderLeft: `2px solid ${fn.mossEdge}`,
              }}
            >
              {/* The card's single italic moment. User-authored words only. */}
              <p style={{ ...fnText.userVoice, margin: 0 }}>{attach.userLine}</p>
            </blockquote>
          )}
        </Section>
      )}

      {/* 6 — Right now: the only clay section */}
      {showRightNow && rightNow.text && (
        <Section tone="clay" eyebrow={`RIGHT NOW${rightNow.updatedAt ? ` · ${String(rightNow.updatedAt).slice(0, 10)}` : ''}`}>
          <p style={{ ...fnText.body, margin: 0, color: fn.ink }}>{rightNow.text}</p>
          {rightNow.stale && (
            <p style={{ ...fnText.caption, color: fn.ghost, margin: `${space.sm} 0 0` }}>
              This part has not been updated in a while.
            </p>
          )}
        </Section>
      )}

      {/* 7 — Footer */}
      <Section tone="moss" last>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: space.lg }}>
          <div>
            <div style={{ ...fnText.caption, color: fn.meta, fontStyle: 'normal' }}>{footer.tagline}</div>
            <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.12em', color: fn.ghost, marginTop: space.sm }}>
              {footer.issued ? `ISSUED ${footer.issued} · ` : ''}LIVING DOCUMENT
            </div>
          </div>
          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt="QR code linking to this card"
              width="60"
              height="60"
              style={{ display: 'block', opacity: 0.85, flexShrink: 0 }}
            />
          )}
        </div>
      </Section>
    </article>
  )
}
