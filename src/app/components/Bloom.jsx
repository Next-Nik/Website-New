// src/app/components/Bloom.jsx
//
// Social half · item 6 (tier two) · The loud moment. One full-screen diegetic
// bloom when something real changed, ending with the share artifact offered —
// celebration is the natural minting moment.
//
// The rule every kind here has to pass: the sky grows, it does not applaud.
// No badge, no confetti, no points, no rank, no "keep your streak alive". If a
// bloom would work equally well with a number in the middle of it, it is the
// wrong bloom.
//
// Rail-agnostic on purpose. `tone="personal"` renders the same grammar in
// Field Notes colours so Horizon, the Daily and Horizon State can use it
// without a second component.
//
// Never fires twice: the caller claims the milestone first (lib/milestones.js)
// and only mounts this on a true claim.
//
// SVG uses presentation attributes and SMIL only — no style= on any svg/path
// open tag (Chrome 148 law); motion and sizing live on wrapper divs.

import { useEffect, useState } from 'react'
import { fn, at, serif, body, sc } from '../../lib/designTokens'
import ShareArtifactButton from './ShareArtifactButton'
import { platformUrl } from '../lib/shareArtifact'

// ─── art ─────────────────────────────────────────────────────────────────────

function Plant({ stage, live }) {
  const soil = 'rgba(38,36,32,0.28)'
  const top  = 56 - stage * 9
  const els  = []
  els.push(<line key="soil" x1="10" y1="58" x2="50" y2="58" stroke={soil} strokeWidth="1.4" strokeLinecap="round" />)
  els.push(<path key="root1" d="M30 55 C 27 61, 24 63, 22 66" fill="none" stroke={live} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />)
  els.push(<path key="root2" d="M30 55 C 33 61, 36 63, 38 66" fill="none" stroke={live} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />)
  els.push(<path key="stem" d={`M30 56 L 30 ${top}`} fill="none" stroke={live} strokeWidth="2" strokeLinecap="round" />)
  els.push(<path key="leafA" d={`M30 ${top + 10} C 22 ${top + 8}, 20 ${top + 2}, 26 ${top + 1} C 29 ${top + 4}, 30 ${top + 7}, 30 ${top + 10} Z`} fill={live} opacity="0.9" />)
  if (stage >= 3) {
    els.push(
      <path key="leafB" d={`M30 ${top + 6} C 38 ${top + 4}, 40 ${top - 2}, 34 ${top - 3} C 31 ${top}, 30 ${top + 3}, 30 ${top + 6} Z`} fill={live} opacity="0">
        <animate attributeName="opacity" from="0" to="0.9" dur="0.9s" begin="0.5s" fill="freeze" />
      </path>
    )
  }
  if (stage >= 4) {
    els.push(
      <path key="leafC" d={`M30 ${top + 2} C 23 ${top - 1}, 22 ${top - 7}, 27 ${top - 7} C 29 ${top - 4}, 30 ${top - 1}, 30 ${top + 2} Z`} fill={live} opacity="0">
        <animate attributeName="opacity" from="0" to="0.95" dur="0.9s" begin="0.7s" fill="freeze" />
      </path>
    )
    els.push(
      <circle key="bud" cx="30" cy={top - 3} r="0" fill={live}>
        <animate attributeName="r" from="0" to="3" dur="0.8s" begin="1s" fill="freeze" />
      </circle>
    )
  }
  return <svg viewBox="0 0 60 72" width="100%" height="100%" role="img" aria-hidden="true">{els}</svg>
}

function Ring({ n, label, sub, live, ink }) {
  const R = 62
  const C = 2 * Math.PI * R
  return (
    <svg viewBox="0 0 160 160" width="100%" height="100%" role="img" aria-hidden="true">
      <circle cx="80" cy="80" r={R} fill="none" stroke="rgba(38,36,32,0.10)" strokeWidth="2" />
      <circle cx="80" cy="80" r={R} fill="none" stroke={live} strokeWidth="2.6" strokeLinecap="round"
        strokeDasharray={C} strokeDashoffset={C} transform="rotate(-90 80 80)">
        <animate attributeName="stroke-dashoffset" from={C} to="0" dur="1.5s" fill="freeze"
          calcMode="spline" keySplines=".2 .8 .3 1" keyTimes="0;1" />
      </circle>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * 2 * Math.PI - Math.PI / 2
        return (
          <circle key={i} cx={80 + Math.cos(a) * R} cy={80 + Math.sin(a) * R} r="4" fill={live} opacity="0">
            <animate attributeName="opacity" from="0" to="1" dur="0.3s" begin={`${0.15 + i * (1.3 / n)}s`} fill="freeze" />
          </circle>
        )
      })}
      <text x="80" y={sub ? 76 : 88} textAnchor="middle" fill={ink}
        fontFamily="Lora, Georgia, serif" fontSize="34" fontWeight="300">{label}</text>
      {sub && (
        <text x="80" y="98" textAnchor="middle" fill="rgba(38,36,32,0.58)"
          fontFamily="'Cormorant SC', Georgia, serif" fontSize="13" letterSpacing="2">{sub}</text>
      )}
    </svg>
  )
}

function Doorway({ live }) {
  return (
    <svg viewBox="0 0 120 160" width="100%" height="100%" role="img" aria-hidden="true">
      <path d="M22 150 L22 44 A38 38 0 0 1 98 44 L98 150" fill="none" stroke={live} strokeWidth="2.2"
        strokeDasharray="330" strokeDashoffset="330">
        <animate attributeName="stroke-dashoffset" from="330" to="0" dur="1.4s" fill="freeze"
          calcMode="spline" keySplines=".2 .8 .3 1" keyTimes="0;1" />
      </path>
      <line x1="16" y1="150" x2="104" y2="150" stroke="rgba(38,36,32,0.28)" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M40 150 L40 62 A20 20 0 0 1 80 62 L80 150" fill={live} opacity="0">
        <animate attributeName="opacity" from="0" to="0.14" dur="1.6s" begin="0.7s" fill="freeze" />
      </path>
    </svg>
  )
}

function Ripple({ live }) {
  return (
    <svg viewBox="0 0 160 160" width="100%" height="100%" role="img" aria-hidden="true">
      {[[30, 0, 1.5], [52, 0.25, 1.9], [72, 0.5, 2.3]].map(([r, begin, dur], i) => (
        <circle key={i} cx="80" cy="82" r="6" fill="none" stroke={live} strokeWidth={2 - i * 0.5} opacity="0">
          <animate attributeName="r" from={6 + i * 10} to={r} dur={`${dur}s`} begin={`${begin}s`} fill="freeze"
            calcMode="spline" keySplines=".2 .8 .3 1" keyTimes="0;1" />
          <animate attributeName="opacity" values="0;0.55;0.14" dur={`${dur}s`} begin={`${begin}s`} fill="freeze" />
        </circle>
      ))}
      <circle cx="80" cy="82" r="6" fill={live} />
    </svg>
  )
}

function HorizonLine({ live }) {
  return (
    <svg viewBox="0 0 200 140" width="100%" height="100%" role="img" aria-hidden="true">
      <line x1="14" y1="104" x2="186" y2="104" stroke="rgba(38,36,32,0.16)" strokeWidth="1.2" />
      <path d="M14 104 C 70 104, 116 74, 178 34" fill="none" stroke={live} strokeWidth="2.4" strokeLinecap="round"
        strokeDasharray="230" strokeDashoffset="230">
        <animate attributeName="stroke-dashoffset" from="230" to="0" dur="1.7s" fill="freeze"
          calcMode="spline" keySplines=".2 .8 .3 1" keyTimes="0;1" />
      </path>
      <circle cx="178" cy="34" r="0" fill={live}>
        <animate attributeName="r" from="0" to="5" dur="0.6s" begin="1.5s" fill="freeze" />
      </circle>
      <circle cx="14" cy="104" r="4" fill={live} />
    </svg>
  )
}

function Recovery({ live }) {
  return (
    <svg viewBox="0 0 200 140" width="100%" height="100%" role="img" aria-hidden="true">
      <line x1="14" y1="120" x2="186" y2="120" stroke="rgba(38,36,32,0.14)" strokeWidth="1.2" />
      <line x1="14" y1="62" x2="186" y2="62" stroke="rgba(38,36,32,0.10)" strokeWidth="1" strokeDasharray="3 5" />
      <path d="M14 52 C 46 58, 62 100, 92 104 C 124 108, 146 74, 186 44" fill="none" stroke={live}
        strokeWidth="2.4" strokeLinecap="round" strokeDasharray="260" strokeDashoffset="260">
        <animate attributeName="stroke-dashoffset" from="260" to="0" dur="2s" fill="freeze"
          calcMode="spline" keySplines=".3 .1 .2 1" keyTimes="0;1" />
      </path>
      <circle cx="92" cy="104" r="4.5" fill={live} opacity="0.45" />
      <circle cx="186" cy="44" r="0" fill={live}>
        <animate attributeName="r" from="0" to="5" dur="0.5s" begin="1.85s" fill="freeze" />
      </circle>
    </svg>
  )
}

function Grove({ live }) {
  const stages = []
  for (let i = 0; i < 24; i++) stages.push(i < 6 ? 4 : i < 13 ? 3 : 2)
  return (
    <svg viewBox="0 0 336 168" width="100%" height="100%" role="img" aria-hidden="true">
      {stages.map((stage, i) => {
        const top = 56 - stage * 9
        const x = (i % 8) * 40 + 10
        const y = Math.floor(i / 8) * 56
        return (
          <g key={i} transform={`translate(${x},${y}) scale(0.6)`} opacity="0">
            <animate attributeName="opacity" from="0" to="1" dur="0.7s" begin={`${i * 0.05}s`} fill="freeze" />
            <line x1="10" y1="58" x2="50" y2="58" stroke="rgba(38,36,32,0.28)" strokeWidth="1.4" strokeLinecap="round" />
            <path d={`M30 56 L 30 ${top}`} fill="none" stroke={live} strokeWidth="2" strokeLinecap="round" />
            <path d={`M30 ${top + 10} C 22 ${top + 8}, 20 ${top + 2}, 26 ${top + 1} C 29 ${top + 4}, 30 ${top + 7}, 30 ${top + 10} Z`} fill={live} opacity="0.9" />
            {stage >= 3 && <path d={`M30 ${top + 6} C 38 ${top + 4}, 40 ${top - 2}, 34 ${top - 3} C 31 ${top}, 30 ${top + 3}, 30 ${top + 6} Z`} fill={live} opacity="0.9" />}
            {stage >= 4 && <circle cx="30" cy={top - 3} r="3" fill={live} />}
          </g>
        )
      })}
    </svg>
  )
}

// A field of quiet points that fade up behind the bloom. The sky growing.
function Sky({ live }) {
  const pts = Array.from({ length: 26 }, (_, i) => ({
    x: (i * 37) % 100, y: (i * 53) % 100, r: i % 3 === 0 ? 0.32 : 0.2, d: (i % 7) * 0.22,
  }))
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" aria-hidden="true">
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={live} opacity="0">
          <animate attributeName="opacity" values="0;0.30;0.14" dur="2.6s" begin={`${p.d}s`} fill="freeze" />
        </circle>
      ))}
    </svg>
  )
}

// ─── the kinds ───────────────────────────────────────────────────────────────
// `ctx` carries the real particulars — a title, a domain, a horizon line — so
// no bloom ever states something the platform does not actually know.

function content(kind, ctx = {}) {
  const title = ctx.title || 'this'
  switch (kind) {
    case 'stage_up':
      return {
        art: 'plant',
        eyebrow: 'Your tended thing',
        head: ctx.stage >= 4 ? 'It came into its own.' : 'It came into leaf.',
        body: `Real days of work put that out. It did not come from time passing — it came from what you did on ${title}.`,
        share: 'A tended thing came into leaf',
      }
    case 'streak_7':
      return {
        art: 'ring7',
        eyebrow: 'Seven days',
        head: 'A week held.',
        body: 'Seven days you chose it. There were days in there you did not want to, and those are the ones that count.',
        share: 'Seven days kept',
      }
    case 'streak_21':
      return {
        art: 'ring21',
        eyebrow: 'Twenty-one days',
        head: 'Three weeks held.',
        body: 'This is the point where it stops being a decision you make each morning and starts being a thing you do.',
        share: 'Twenty-one days kept',
      }
    case 'run_complete':
      return {
        art: 'door',
        eyebrow: title,
        head: 'The run is finished.',
        body: 'Done — all of it, in real days. There is another door on the other side of this one, and it is open.',
        share: `${title} · finished`,
      }
    case 'first_moment':
      return {
        art: 'ripple',
        eyebrow: 'Your first moment',
        head: 'You’re in the room now.',
        body: 'That is the first thing you have put into the world here, and other people will see it today. There is nothing else you have to do.',
        share: 'A first moment on NextUs',
      }
    case 'grove_crest':
      return {
        art: 'grove',
        eyebrow: 'The constellation',
        head: 'The grove came into leaf.',
        body: 'Everyone who took this on and stayed is in that picture. It is not your streak — it is everyone’s, and it happened while nobody was watching a number.',
        share: 'The grove came into leaf',
      }
    case 'horizon_named':
      return {
        art: 'horizon',
        eyebrow: 'Your horizon',
        head: 'You said where you are going.',
        body: 'From here, every real thing you do gets measured against that line and nothing else.',
        share: 'A horizon, named',
      }
    case 'domain_recovery':
      return {
        art: 'recovery',
        eyebrow: ctx.domainLabel || 'A domain',
        head: 'It came back up.',
        body: 'It was at its lowest not long ago and it is not there now. Nothing was held against you while it was down — it came back because you kept turning up.',
        share: 'It came back up',
      }
    default:
      return null
  }
}

// ─── the bloom ───────────────────────────────────────────────────────────────

export default function Bloom({ kind, ctx = {}, tone = 'atlas', onClose }) {
  const [shown, setShown] = useState(false)
  const c = content(kind, ctx)

  useEffect(() => {
    if (!c) return
    const t = requestAnimationFrame(() => setShown(true))
    function onKey(e) { if (e.key === 'Escape' && onClose) onClose() }
    window.addEventListener('keydown', onKey)
    return () => { cancelAnimationFrame(t); window.removeEventListener('keydown', onKey) }
  }, [c, onClose])

  if (!c) return null

  const personal = tone === 'personal'
  const ground = personal ? fn.ground : at.ground
  const ink    = personal ? fn.ink    : at.text
  const meta   = personal ? fn.meta   : at.meta
  const ghost  = personal ? fn.ghost  : at.ghost
  const live   = personal ? fn.moss   : at.verdigris
  const edge   = personal ? fn.mossEdge : at.verdigrisEdge

  const art = {
    plant:   <Plant stage={ctx.stage >= 4 ? 4 : 3} live={live} />,
    ring7:   <Ring n={7}  label="7"  sub="DAYS KEPT" live={live} ink={ink} />,
    ring21:  <Ring n={21} label="21" sub="DAYS KEPT" live={live} ink={ink} />,
    door:    <Doorway live={live} />,
    ripple:  <Ripple live={live} />,
    grove:   <Grove live={live} />,
    horizon: <HorizonLine live={live} />,
    recovery:<Recovery live={live} />,
  }[c.art]

  const rise = (delay) => ({
    opacity: shown ? 1 : 0,
    transform: shown ? 'none' : 'translateY(10px)',
    transition: `opacity 0.9s ease ${delay}s, transform 0.9s ease ${delay}s`,
  })

  return (
    <div role="dialog" aria-modal="true" aria-label={c.head}
      style={{ position: 'fixed', inset: 0, zIndex: 1200, background: ground,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '28px', textAlign: 'center', overflow: 'hidden',
        opacity: shown ? 1 : 0, transition: 'opacity 0.5s ease' }}>

      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        <Sky live={live} />
      </div>

      <div style={{ position: 'relative', zIndex: 2, maxWidth: '480px', width: '100%' }}>
        <div style={{ height: '190px', marginBottom: '6px', display: 'flex',
          alignItems: 'flex-end', justifyContent: 'center',
          opacity: shown ? 1 : 0, transform: shown ? 'none' : 'translateY(16px) scale(0.8)',
          transition: 'opacity 1.2s ease, transform 1.5s cubic-bezier(.16,.9,.3,1)' }}>
          <div style={{ height: '100%', maxWidth: '340px', width: '100%' }}>{art}</div>
        </div>

        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.24em', textTransform: 'uppercase',
          color: live, ...rise(0.55) }}>
          {c.eyebrow}
        </div>

        <h2 style={{ ...serif, fontWeight: 300, fontSize: 'clamp(28px, 5.2vw, 40px)',
          color: ink, lineHeight: 1.14, margin: '16px 0 14px', ...rise(0.55) }}>
          {c.head}
        </h2>

        <p style={{ ...body, fontSize: '16px', color: meta, lineHeight: 1.6,
          margin: '0 auto', maxWidth: '400px', ...rise(0.85) }}>
          {c.body}
        </p>

        {ctx.horizonLine && (
          <div style={{ marginTop: '20px', ...rise(1.05) }}>
            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em',
              textTransform: 'uppercase', color: ghost }}>
              A step toward
            </span>
            <p style={{ ...body, fontSize: '15px', color: meta, lineHeight: 1.5,
              fontStyle: 'italic', margin: '4px auto 0', maxWidth: '380px' }}>
              {ctx.horizonLine}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center',
          marginTop: '30px', flexWrap: 'wrap', ...rise(1.25) }}>
          <ShareArtifactButton
            size="sm"
            tone={personal ? 'light' : 'dark'}
            label="Keep this"
            filename="nextus-moment.png"
            shareText={c.share}
            artifact={{
              eyebrow: c.eyebrow,
              headline: c.head,
              horizon: ctx.horizonLine || null,
              footNote: ctx.domainLabel || ctx.domain || null,
              url: platformUrl('/today'),
            }}
          />
          <button type="button" onClick={onClose}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase',
              color: ghost, background: 'transparent', border: `1px solid ${edge}`,
              borderRadius: '22px', padding: '6px 14px', cursor: 'pointer' }}>
            Back to the day
          </button>
        </div>
      </div>
    </div>
  )
}
