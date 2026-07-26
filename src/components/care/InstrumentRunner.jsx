// src/components/care/InstrumentRunner.jsx
//
// One renderer, any instrument. Per the engine brief: adding assessment
// fourteen should be a data task, not a dev task — which only holds if nothing
// about a specific instrument is hard-coded in a component. This file knows
// about item TYPES (likert, choice, text, longtext) and nothing about IPIP,
// ECR-RS, or anything else by name.

import { fn, fnText, space, mono } from '../../lib/designTokens'

function Likert({ item, scale, value, onChange }) {
  const points = Array.from({ length: scale.points }, (_, i) => i + 1)
  return (
    <div style={{ marginBottom: space.xl }}>
      <p style={{ ...fnText.body, color: fn.ink, margin: `0 0 ${space.md}` }}>
        {item.label ? (
          <span style={{ ...mono, letterSpacing: '0.1em', color: fn.meta, display: 'block', fontSize: '13px' }}>
            {item.label.toUpperCase()}
          </span>
        ) : null}
        {item.text}
      </p>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'stretch' }}>
        {points.map((point) => {
          const active = Number(value) === point
          return (
            <button
              key={point}
              type="button"
              onClick={() => onChange(item.id, point)}
              aria-pressed={active}
              aria-label={scale.anchors?.[point] || `${point}`}
              style={{
                flex: 1,
                minHeight: '42px',
                cursor: 'pointer',
                background: active ? fn.moss : 'transparent',
                color: active ? fn.object : fn.meta,
                border: active ? `1px solid ${fn.moss}` : `1px dashed ${fn.rule}`,
                borderRadius: '2px',
                ...mono,
                fontSize: '15px',
                letterSpacing: '0.06em',
                transition: 'background 120ms ease, color 120ms ease',
              }}
            >
              {point}
            </button>
          )
        })}
      </div>
      {scale.anchors && Object.keys(scale.anchors).length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', gap: space.sm }}>
          <span style={{ ...fnText.caption, color: fn.ghost }}>{scale.anchors[1]}</span>
          <span style={{ ...fnText.caption, color: fn.ghost, textAlign: 'right' }}>
            {scale.anchors[scale.points]}
          </span>
        </div>
      )}
    </div>
  )
}

function Choice({ item, value, onChange }) {
  return (
    <div style={{ marginBottom: space.xl }}>
      <p style={{ ...fnText.body, color: fn.ink, margin: `0 0 ${space.md}` }}>{item.text}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {item.options.map((option) => {
          const active = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(item.id, option.value)}
              aria-pressed={active}
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                padding: `10px ${space.md}`,
                background: active ? fn.mossTint : 'transparent',
                color: active ? fn.ink : fn.meta,
                border: active ? `1px solid ${fn.mossEdge}` : `1px dashed ${fn.rule}`,
                borderRadius: '2px',
                ...fnText.body,
                fontSize: '15px',
              }}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// The reflection panel — the payoff for a freetext answer. Autosave alone
// means every disclosure goes into a database and nothing ever turns to look
// at the person who wrote it; this is that turn. See onReflect's call site in
// CareProtocol.jsx for the full reasoning. Deliberately not italic: the
// card's own design law reserves italic for the user's own words only (see
// CareCard.jsx), and this is the system speaking, not the person — using
// italic here would blur exactly the line that law exists to hold.
function ReflectionPanel({ reflection }) {
  // 'idle' (nothing attempted yet) stays invisible — that's correct, not a
  // failure. 'error' used to be invisible too, on the reasoning that a
  // missed reflection was a missed nicety not worth interrupting someone
  // over. That reasoning held for the person mid-disclosure, but not for
  // anyone trying to tell whether the feature works at all: a silent
  // failure and "this was never built" render identically. So error now
  // gets a single quiet line — no red, no icon, nothing that reads as
  // urgent — instead of nothing.
  if (!reflection || reflection.status === 'idle') return null
  if (reflection.status === 'error') {
    return (
      <p style={{ ...fnText.caption, color: fn.ghost, margin: `${space.sm} 0 0` }}>
        A reflection didn't load that time — your answer is still saved.
      </p>
    )
  }
  return (
    <div
      style={{
        marginTop: space.md,
        padding: `${space.sm} ${space.md}`,
        background: fn.mossTint,
        borderLeft: `2px solid ${fn.mossEdge}`,
        borderRadius: '2px',
      }}
    >
      {reflection.status === 'loading' ? (
        <p style={{ ...fnText.eyebrow, margin: 0 }}>reading this…</p>
      ) : (
        <>
          <p style={{ ...fnText.eyebrow, margin: `0 0 4px` }}>noticed</p>
          <p style={{ ...fnText.body, color: fn.ink, margin: 0 }}>{reflection.text}</p>
        </>
      )}
    </div>
  )
}

function TextItem({ item, value, onChange, onBlurText, reflection }) {
  const long = item.type === 'longtext'
  const shared = {
    width: '100%',
    boxSizing: 'border-box',
    background: fn.ground,
    border: `1px solid ${fn.rule}`,
    borderRadius: '2px',
    padding: space.md,
    ...fnText.body,
    fontSize: '15px',
    color: fn.ink,
    resize: long ? 'vertical' : 'none',
  }
  return (
    <div style={{ marginBottom: space.xl }}>
      <p style={{ ...fnText.body, color: fn.ink, margin: `0 0 6px` }}>
        {item.text}
        {item.optional && (
          <span style={{ ...fnText.caption, color: fn.ghost }}> · optional</span>
        )}
      </p>
      {item.hint && (
        <p style={{ ...fnText.caption, color: fn.ghost, margin: `0 0 ${space.sm}` }}>{item.hint}</p>
      )}
      {long ? (
        <textarea
          rows={4}
          maxLength={item.maxLength}
          value={value || ''}
          onChange={(e) => onChange(item.id, e.target.value)}
          onBlur={onBlurText ? () => onBlurText(item, value || '') : undefined}
          style={shared}
        />
      ) : (
        <input
          type="text"
          maxLength={item.maxLength}
          value={value || ''}
          onChange={(e) => onChange(item.id, e.target.value)}
          style={shared}
        />
      )}
      {item.maxLength && (
        <div style={{ ...fnText.caption, color: fn.ghost, textAlign: 'right', marginTop: '4px' }}>
          {(value || '').length} / {item.maxLength}
        </div>
      )}
      {onBlurText && <ReflectionPanel reflection={reflection} />}
    </div>
  )
}

export default function InstrumentRunner({ instrument, responses, onChange, reflections, onReflect }) {
  if (!instrument) return null

  // Reflection is opt-in per instrument via `kind: 'freetext'` in the data,
  // not hard-coded to a specific instrument by name or id — any future
  // freetext instrument gets the same in-the-moment "noticed" behaviour for
  // free, per the file's own architectural rule that adding instrument
  // fourteen should be a data task, not a dev task.
  const reflective = instrument.kind === 'freetext' && typeof onReflect === 'function'

  return (
    <div>
      {instrument.instructions && (
        <p style={{ ...fnText.body, color: fn.meta, margin: `0 0 ${space.xl}` }}>
          {instrument.instructions}
        </p>
      )}

      {instrument.items.map((item) => {
        if (item.type === 'choice') {
          return <Choice key={item.id} item={item} value={responses[item.id]} onChange={onChange} />
        }
        if (item.type === 'text' || item.type === 'longtext') {
          const reflect = reflective && item.type === 'longtext'
          return (
            <TextItem
              key={item.id}
              item={item}
              value={responses[item.id]}
              onChange={onChange}
              onBlurText={reflect ? onReflect : undefined}
              reflection={reflections?.[item.id]}
            />
          )
        }
        return (
          <Likert
            key={item.id}
            item={item}
            scale={instrument.scale}
            value={responses[item.id]}
            onChange={onChange}
          />
        )
      })}

      {/* The forced final pick, for instruments that declare one. */}
      {instrument.finalPick && (
        <Choice
          item={{
            id: instrument.finalPick.id,
            text: instrument.finalPick.prompt,
            options: instrument.finalPick.options,
          }}
          value={responses[instrument.finalPick.id]}
          onChange={onChange}
        />
      )}
    </div>
  )
}
