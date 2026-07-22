// src/app/components/TendedThing.jsx
//
// BP-11 · The tended thing — a person's own living thing, lit from the
// communal fire on joining a challenge. One mechanic, domain skins; the
// Nature (Terran Ecosystem) skin ships first: seed → roots → sprout →
// leaves → thriving.
//
// It grows only on real action. It never dies: when untended it dims, then
// rests, and one real act wakes it. No guilt mechanics — the deliberate
// inversion of the streak owl. Absence is met with grace.
//
// Atlas rail by default (it lives on challenge cards). SVG uses presentation
// attributes only — no style= on any <svg>/<path> open tag (Chrome 148 law);
// opacity and sizing live on the wrapper div.

import { at } from '../../lib/designTokens'
import { restStateFromLast } from '../lib/tendedThing'

const mono = { fontFamily: "'Cormorant SC', Georgia, serif" }

const STAGE_WORD = ['a seed', 'taking root', 'a sprout', 'in leaf', 'thriving']

// Opacity by rest state — never zero, never gone.
const REST_OPACITY = { new: 0.9, awake: 1, dim: 0.6, rest: 0.42 }

function Plant({ stage, live }) {
  const green = live               // living systems colour
  const soil  = 'rgba(38,36,32,0.28)'

  const stemTopY = 56 - stage * 9  // taller with each stage
  const els = []

  // Soil line — always.
  els.push(<line key="soil" x1="10" y1="58" x2="50" y2="58" stroke={soil} strokeWidth="1.4" strokeLinecap="round" />)

  if (stage === 0) {
    // Seed resting in the soil.
    els.push(<ellipse key="seed" cx="30" cy="55" rx="4.2" ry="3" fill={green} />)
  }
  if (stage >= 1) {
    // Roots reaching down.
    els.push(<path key="root1" d="M30 55 C 27 61, 24 63, 22 66" fill="none" stroke={green} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />)
    els.push(<path key="root2" d="M30 55 C 33 61, 36 63, 38 66" fill="none" stroke={green} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />)
    els.push(<ellipse key="seed1" cx="30" cy="54" rx="3.6" ry="2.6" fill={green} />)
  }
  if (stage >= 2) {
    // Stem rising from the soil.
    els.push(<path key="stem" d={`M30 56 L 30 ${stemTopY}`} fill="none" stroke={green} strokeWidth="2" strokeLinecap="round" />)
    // First leaf.
    els.push(<path key="leafA" d={`M30 ${stemTopY + 10} C 22 ${stemTopY + 8}, 20 ${stemTopY + 2}, 26 ${stemTopY + 1} C 29 ${stemTopY + 4}, 30 ${stemTopY + 7}, 30 ${stemTopY + 10} Z`} fill={green} opacity="0.9" />)
  }
  if (stage >= 3) {
    // Second leaf, opposite side.
    els.push(<path key="leafB" d={`M30 ${stemTopY + 6} C 38 ${stemTopY + 4}, 40 ${stemTopY - 2}, 34 ${stemTopY - 3} C 31 ${stemTopY}, 30 ${stemTopY + 3}, 30 ${stemTopY + 6} Z`} fill={green} opacity="0.9" />)
  }
  if (stage >= 4) {
    // Thriving — a crown of new leaves and a bud.
    els.push(<path key="leafC" d={`M30 ${stemTopY + 2} C 23 ${stemTopY - 1}, 22 ${stemTopY - 7}, 27 ${stemTopY - 7} C 29 ${stemTopY - 4}, 30 ${stemTopY - 1}, 30 ${stemTopY + 2} Z`} fill={green} opacity="0.95" />)
    els.push(<circle key="bud" cx="30" cy={stemTopY - 3} r="3" fill={green} />)
  }

  return (
    <svg viewBox="0 0 60 72" width="100%" height="100%" role="img" aria-hidden="true">
      {els}
    </svg>
  )
}

export default function TendedThing({
  stage = 0,
  lastTendedAt,
  size = 'md',
  caption = true,
  tone = 'dark',
}) {
  const rest    = restStateFromLast(lastTendedAt)
  const opacity = REST_OPACITY[rest] ?? 1
  const live    = tone === 'light' ? '#4c6b45' : at.verdigris
  const px      = size === 'sm' ? 34 : size === 'lg' ? 72 : 52

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <div style={{ width: px, height: Math.round(px * 1.2), opacity, transition: 'opacity 0.4s' }}>
        <Plant stage={stage} live={live} />
      </div>
      {caption && (
        <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.06em',
          color: tone === 'light' ? 'rgba(38,36,32,0.68)' : at.ghost, textAlign: 'center' }}>
          {rest === 'rest' ? `Resting · ${STAGE_WORD[stage]}`
            : rest === 'dim' ? `Waiting · ${STAGE_WORD[stage]}`
            : STAGE_WORD[stage]}
        </div>
      )}
    </div>
  )
}
