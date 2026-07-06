import { SCALE_POINTS, TIER_MAP, LABEL_MAP, SIGNATURE_MAP, getScoreColor } from '../constants/horizonScale'
import { body, sc } from '../lib/designTokens'

// ─── ScaleEmbedded ───────────────────────────────────────────────────────────
// The horizon scale, rendered inline rather than as a modal. Used on The Map's
// door page so the user encounters the scale at the start — the way the
// original NextU onboarding document showed it. Same content as
// HorizonScaleModal, but flat in the page flow.
//
// Why a separate component instead of unwrapping the modal:
//   • The modal is a fixed-position overlay with backdrop, scroll lock,
//     keyboard close, anchor scrolling — none of which we want here.
//   • The page-embedded version stays simple: header, intro, scale rows.
//     Anything beyond that is the modal's job.

export function ScaleEmbedded() {
  return (
    <div style={{
      background:   '#FFFFFF',
      border:       '1px solid rgba(110,127,92,0.25)',
      borderRadius: '12px',
      padding:      '28px 28px 24px',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid rgba(110,127,92,0.15)' }}>
        <span style={{
          ...sc,
          fontSize:      '13px',
          letterSpacing: '0.2em',
          color:         '#26302A',
          display:       'block',
          marginBottom:  '8px',
        }}>
          The Scale
        </span>
        <h3 style={{
          ...sc,
          fontSize:   '1.375rem',
          fontWeight: 400,
          color:      '#0F1523',
          lineHeight: 1.2,
          margin:     0,
        }}>
          One ruler. Seven readings.
        </h3>
      </div>

      {/* Intro */}
      <p style={{
        ...body,
        fontSize:     '15px',
        color:        'rgba(15,21,35,0.78)',
        lineHeight:   1.7,
        marginBottom: '10px',
      }}>
        Every score in The Map uses this scale. Zero is suffering. Five is the Line — the threshold between a domain that’s holding you up and a domain that’s pulling on the rest of your life. Ten is the character you’ll describe in Step 1 of each domain.
      </p>
      <p style={{
        ...body,
        fontSize:     '15px',
        color:        'rgba(15,21,35,0.78)',
        lineHeight:   1.7,
        marginBottom: '20px',
      }}>
        Same ruler across all seven domains. Hover or tap any number to see its name and description.
      </p>

      {/* Scale rows */}
      <div>
        {/* Above the Line band */}
        <div style={{ padding: '4px 8px 12px' }}>
          <span style={{
            ...sc,
            fontSize:      '13px',
            letterSpacing: '0.18em',
            color:         '#26302A',
            textTransform: 'uppercase',
            marginRight:   '8px',
          }}>
            Above the Line
          </span>
          <span style={{
            ...body,
            fontSize:  '13px',
            color:     'rgba(15,21,35,0.55)',
          }}>
            this domain is holding you up
          </span>
        </div>

        {SCALE_POINTS.map((n, i) => {
          const isLine    = n === 5
          const prevN     = SCALE_POINTS[i - 1]
          const showBelow = prevN !== undefined && prevN > 5 && n < 5
          const tier      = TIER_MAP[n]
          const label     = LABEL_MAP[n]
          const sig       = SIGNATURE_MAP[n]
          const col       = getScoreColor(n)
          const isWhole   = Number.isInteger(n)

          return (
            <div key={n}>
              {showBelow && (
                <div style={{ padding: '16px 8px 12px' }}>
                  <span style={{
                    ...sc,
                    fontSize:      '13px',
                    letterSpacing: '0.18em',
                    color:         'rgba(107,80,64,0.9)',
                    textTransform: 'uppercase',
                    marginRight:   '8px',
                  }}>
                    Below the Line
                  </span>
                  <span style={{
                    ...body,
                    fontSize:  '13px',
                    color:     'rgba(15,21,35,0.55)',
                  }}>
                    this domain is asking for attention
                  </span>
                </div>
              )}

              <div style={{
                display:             'grid',
                gridTemplateColumns: '36px 1fr',
                gap:                 '10px',
                padding:             isLine ? '12px 8px' : '8px 8px',
                borderRadius:        '8px',
                marginBottom:        '2px',
                background:          isLine
                  ? 'rgba(110,127,92,0.07)'
                  : i % 2 === 0 ? 'rgba(15,21,35,0.02)' : 'transparent',
                border: isLine ? '1px solid rgba(110,127,92,0.2)' : '1px solid transparent',
              }}>
                <span style={{
                  ...sc,
                  fontSize:   isWhole ? '1.25rem' : '1rem',
                  fontWeight: 600,
                  color:      col,
                  paddingTop: '2px',
                  lineHeight: 1,
                }}>
                  {n}
                </span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                    <span style={{
                      ...sc,
                      fontSize:      '14px',
                      letterSpacing: '0.08em',
                      color:         col,
                      fontWeight:    isLine ? 600 : 400,
                    }}>
                      {tier}
                    </span>
                    {label && (
                      <span style={{
                        ...body,
                        fontSize:  '14px',
                        color:     'rgba(15,21,35,0.6)',
                      }}>
                        {label}
                      </span>
                    )}
                  </div>
                  {sig && (
                    <p style={{
                      ...body,
                      fontSize:   '13px',
                      color:      'rgba(15,21,35,0.65)',
                      lineHeight: 1.6,
                      margin:     0,
                    }}>
                      {sig}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p style={{
        ...body,
        fontSize:   '13px',
        color:      'rgba(15,21,35,0.55)',
        lineHeight: 1.65,
        margin:     '20px 0 0',
        paddingTop: '16px',
        borderTop:  '1px solid rgba(110,127,92,0.12)',
      }}>
        You’ll see this scale at every domain. You can pull it up at any point from the “The Scale” button at the top of the tool.
      </p>
    </div>
  )
}
