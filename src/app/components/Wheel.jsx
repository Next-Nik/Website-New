// ─────────────────────────────────────────────────────────────
// Wheel.jsx — the one radar instrument
//
// One component, every scale. First Light passes the personal seven
// and personal scores; Mission Control / the planet wheel passes the
// civ seven and civ scores. Personal and planetary stay separate as
// data and as surfaces — only the instrument and the look are shared.
// That shared code is the fractal made structural, not a visual rhyme.
//
// Depth is a set of props, not a mode wall:
//   now-only     → First Light, marketing home, the zoom transient
//   + headed     → the Map (personal) / the planet (collective), where
//                  the horizon goal is real. Headed is the hero when present.
//   + rings      → graded reference rings, Pass/Fail line emphasised at 5
//   + severity   → dots coloured by grade (getScoreColor) instead of hue
//   + interactive→ tap a spoke to read its tier
//
// Scores are 0–10 on the canonical horizon scale (horizonScale.js).
//
// Chrome 148 law: no style= props on any SVG element — presentation
// attributes only. Event handlers (onClick) are not styles and are fine.
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import { getScoreColor, TIER_MAP, LABEL_MAP, SIGNATURE_MAP } from '../../constants/horizonScale'

// Robust scale lookup — exact point, else nearest half-step, else rounded.
// Map scores can be half-steps; First Light / civ scores are integers.
function pickScale(map, v) {
  if (v == null) return undefined
  if (map[v] != null) return map[v]
  const half = Math.round(v * 2) / 2
  if (map[half] != null) return map[half]
  return map[Math.round(v)]
}

const GOLD     = '#4c6b45'   // chrome / borders
const GOLD_DK  = '#262420'   // gold text
const INK      = '#0F1523'
const LORA     = "'Lora', Georgia, serif"
const SC       = "'Cormorant SC', Georgia, serif"

// Graded reference rings. The Pass/Fail Mark at 5 (ratio 0.5) is the
// load-bearing line — everything above tends to compound, everything
// below tends to contract — so it is drawn stronger. The others are
// faint enough to survive the First Light zoom without clutter.
const RING_RATIOS = [0.3, 0.5, 0.65, 0.8]
const PASS_FAIL   = 0.5

function normDomains(domains) {
  return domains.map(d => ({
    key:   d.key ?? d.slug,
    name:  d.name ?? d.label ?? '',
    hex:   d.hex ?? d.color ?? GOLD,
  }))
}

// Robust label placement (ported from the planet wheel): push the label
// off the spoke tip along the centre→tip vector so it never sits on the
// polygon edge, and anchor by horizontal direction so it never clips.
function labelPlacement(tipX, tipY, cx, cy, gap) {
  const dx = tipX - cx, dy = tipY - cy
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const nx = dx / len, ny = dy / len
  const anchor = nx > 0.3 ? 'start' : nx < -0.3 ? 'end' : 'middle'
  return {
    x: tipX + nx * gap,
    y: tipY + ny * gap + (Math.abs(nx) < 0.3 ? (ny < 0 ? -4 : 8) : 0),
    anchor,
  }
}

export default function Wheel({
  domains,
  now = {},
  headed = null,         // when present, headed becomes the hero web
  placement = null,      // single slug to mark with a dot (planet placement)
  size = 220,
  dark = false,
  rings = true,
  severity = false,
  interactive = false,
  onSelect = null,
  notes = {},            // per-domain { nowNote?, goalText? } for the detail card
}) {
  const doms = useMemo(() => normDomains(domains), [domains])
  const N = doms.length

  const PAD = 60
  const VB  = size + PAD * 2
  const cx  = VB / 2
  const cy  = VB / 2
  const maxR   = (size / 2) * 0.6
  const labelGap = 20

  const [sel, setSel] = useState(null)

  const angleFor = i => (Math.PI * 2 * i) / N - Math.PI / 2
  const ratio    = v => (v == null ? null : Math.min(Math.max(v / 10, 0), 1))
  const radius   = v => Math.max(ratio(v) * maxR, maxR * 0.06)

  // Has a real headed web to draw?
  const headedScored = headed
    ? doms.filter(d => headed[d.key] != null).length
    : 0
  const hasHeaded = headedScored >= 3

  // Geometry: spokes, outer rim, labels
  const geo = useMemo(() => {
    const spokes = [], rim = [], labels = []
    for (let i = 0; i < N; i++) {
      const a = angleFor(i)
      const tx = cx + maxR * Math.cos(a)
      const ty = cy + maxR * Math.sin(a)
      spokes.push({ x2: tx, y2: ty })
      rim.push(`${tx.toFixed(2)},${ty.toFixed(2)}`)
      const lp = labelPlacement(tx, ty, cx, cy, labelGap)
      labels.push({ ...lp, name: doms[i].name.toUpperCase(), key: doms[i].key, hex: doms[i].hex, idx: i })
    }
    return { spokes, rimPts: rim.join(' '), labels }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doms, N, cx, cy, maxR])

  // Graded reference ring polygons
  const ringPolys = useMemo(() => {
    if (!rings) return []
    return RING_RATIOS.map(f => {
      const pts = []
      for (let i = 0; i < N; i++) {
        const a = angleFor(i)
        pts.push(`${(cx + f * maxR * Math.cos(a)).toFixed(2)},${(cy + f * maxR * Math.sin(a)).toFixed(2)}`)
      }
      return { f, pts: pts.join(' ') }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rings, N, cx, cy, maxR])

  // A web (now or headed) as polygon points + per-vertex dots
  function web(scores) {
    const scored = doms.filter(d => scores?.[d.key] != null).length
    if (scored < 3) return null
    const verts = doms.map((d, i) => {
      const v = scores[d.key]
      const a = angleFor(i)
      const r = v == null ? 0 : radius(v)
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), v, hex: d.hex }
    })
    return {
      pts: verts.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '),
      verts,
    }
  }

  const nowWeb    = web(now)
  const headedWeb = hasHeaded ? web(headed) : null

  // When headed is present it is the gold hero and now drops to a quiet
  // baseline web. When headed is absent, now keeps the gold hero styling
  // the existing surfaces already render — nothing changes for them.
  const nowIsHero = !hasHeaded

  const labelFill = dark ? 'rgba(250,250,247,0.85)' : 'rgba(15,21,35,0.72)'
  const spokeCol  = dark ? 'rgba(76,107,69,0.50)'  : 'rgba(76,107,69,0.30)'
  const rimCol    = dark ? 'rgba(76,107,69,0.40)'  : 'rgba(76,107,69,0.32)'
  const ringCol   = dark ? 'rgba(76,107,69,0.16)'  : 'rgba(76,107,69,0.14)'
  const passCol   = dark ? 'rgba(76,107,69,0.42)'  : 'rgba(76,107,69,0.38)'
  const nowHeroStroke = dark ? 'rgba(76,107,69,0.9)' : 'rgba(76,107,69,0.85)'
  const nowHeroFill   = dark ? 'rgba(76,107,69,0.18)' : 'rgba(76,107,69,0.15)'
  const nowBaseStroke = dark ? 'rgba(250,250,247,0.42)' : 'rgba(15,21,35,0.42)'
  const nowBaseFill   = dark ? 'rgba(250,250,247,0.05)' : 'rgba(15,21,35,0.05)'

  function dotFill(hex, v) {
    return severity && v != null ? getScoreColor(v) : hex
  }

  // Single placement marker (planet placement use)
  let placeMark = null
  if (placement) {
    const idx = doms.findIndex(d => d.key === placement)
    if (idx >= 0) {
      const a = angleFor(idx)
      placeMark = {
        x: cx + 0.66 * maxR * Math.cos(a),
        y: cy + 0.66 * maxR * Math.sin(a),
        hex: doms[idx].hex,
      }
    }
  }

  function selectSpoke(i) {
    setSel(i)
    if (onSelect) onSelect(doms[i].key)
  }

  const svg = (
    <svg
      width={VB}
      height={VB}
      viewBox={`0 0 ${VB} ${VB}`}
      display="block"
      overflow="visible"
    >
      {/* Outer rim */}
      <polygon points={geo.rimPts} fill="none" stroke={rimCol} strokeWidth="1.5" strokeDasharray="3 4" />

      {/* Graded reference rings — Pass/Fail at 5 emphasised */}
      {ringPolys.map(r => (
        <polygon
          key={`ring-${r.f}`}
          points={r.pts}
          fill="none"
          stroke={r.f === PASS_FAIL ? passCol : ringCol}
          strokeWidth={r.f === PASS_FAIL ? 1.4 : 1}
          strokeDasharray={r.f === PASS_FAIL ? '5 4' : undefined}
        />
      ))}

      {/* Spokes */}
      {geo.spokes.map((sp, i) => (
        <line key={`spoke-${i}`} x1={cx} y1={cy} x2={sp.x2} y2={sp.y2} stroke={spokeCol} strokeWidth="1.5" />
      ))}

      {/* Now web */}
      {nowWeb && (
        <>
          <polygon
            points={nowWeb.pts}
            fill={nowIsHero ? nowHeroFill : nowBaseFill}
            stroke={nowIsHero ? nowHeroStroke : nowBaseStroke}
            strokeWidth={nowIsHero ? 2.5 : 1.5}
            strokeLinejoin="round"
          />
          {nowWeb.verts.map((p, i) => p.v != null && (
            <circle key={`now-${i}`} cx={p.x} cy={p.y} r={nowIsHero ? 5 : 3.6} fill={dotFill(p.hex, p.v)} opacity="0.92" />
          ))}
        </>
      )}

      {/* Headed web — the hero when present */}
      {headedWeb && (
        <>
          <polygon
            points={headedWeb.pts}
            fill="rgba(76,107,69,0.10)"
            stroke={GOLD}
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          {headedWeb.verts.map((p, i) => p.v != null && (
            <circle key={`hd-${i}`} cx={p.x} cy={p.y} r="5.4" fill="none" stroke={GOLD} strokeWidth="2" />
          ))}
        </>
      )}

      {/* Selection ring (interactive) */}
      {interactive && sel != null && nowWeb && nowWeb.verts[sel] && (
        <circle cx={nowWeb.verts[sel].x} cy={nowWeb.verts[sel].y} r="9" fill="none" stroke={dark ? '#fff' : INK} strokeWidth="1.25" strokeOpacity="0.55" />
      )}

      {/* Hub */}
      <circle cx={cx} cy={cy} r={size * 0.05} fill={GOLD} />

      {/* Interactive hit targets (transparent) */}
      {interactive && geo.labels.map((l, i) => {
        const a = angleFor(i)
        return (
          <circle
            key={`hit-${i}`}
            cx={cx + maxR * 0.6 * Math.cos(a)}
            cy={cy + maxR * 0.6 * Math.sin(a)}
            r="20"
            fill="transparent"
            cursor="pointer"
            onClick={() => selectSpoke(i)}
          />
        )
      })}

      {/* Domain labels — last so they sit above everything */}
      {geo.labels.map(l => (
        <text
          key={`lab-${l.key}`}
          x={l.x} y={l.y}
          textAnchor={l.anchor}
          dominantBaseline="middle"
          fontFamily={LORA}
          fontSize={13}
          letterSpacing="0.06em"
          fill={interactive && sel === l.idx ? GOLD_DK : (dark ? labelFill : l.hex)}
          cursor={interactive ? 'pointer' : undefined}
          onClick={interactive ? () => selectSpoke(l.idx) : undefined}
        >
          {l.name}
        </text>
      ))}

      {/* Placement marker */}
      {placeMark && (
        <circle cx={placeMark.x} cy={placeMark.y} r="9" fill={placeMark.hex} opacity="0.95" />
      )}
    </svg>
  )

  if (!interactive) return svg

  // Interactive depth opens a detail card under the wheel: the read of
  // where you are (score, tier, the scale's signature) and the Horizon
  // Goal (score, tier, your authored goal text). Kept as HTML (not
  // foreignObject) so the SVG stays attribute-only.
  const selDom = sel != null ? doms[sel] : null
  const nowV   = selDom ? now[selDom.key] : null
  const hdV    = selDom && headed ? headed[selDom.key] : null
  const note   = selDom ? (notes[selDom.key] || {}) : {}
  const gap    = (nowV != null && hdV != null) ? +(hdV - nowV).toFixed(1) : null

  const metaCol = dark ? 'rgba(250,250,247,0.62)' : 'rgba(15,21,35,0.6)'
  const bodyCol = dark ? 'rgba(250,250,247,0.82)' : 'rgba(15,21,35,0.78)'
  const nameCol = dark ? 'rgba(250,250,247,0.9)'  : INK

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {svg}
      <div style={{ width: '100%', maxWidth: 360, minHeight: 110, padding: '10px 16px 4px' }}>
        {selDom ? (
          <>
            <div style={{ fontFamily: SC, fontSize: 15, letterSpacing: '0.12em', textTransform: 'uppercase', color: nameCol, marginBottom: 10 }}>
              {selDom.name}
            </div>

            {/* Where you are */}
            <div style={{ marginBottom: hdV != null ? 14 : 2 }}>
              <div style={{ fontFamily: SC, fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', color: metaCol, marginBottom: 4 }}>Where you are</div>
              {nowV != null ? (
                <>
                  <div style={{ fontFamily: SC, fontSize: 22, fontWeight: 600, color: getScoreColor(nowV), lineHeight: 1 }}>
                    {nowV}<span style={{ fontSize: 14, letterSpacing: '0.04em', marginLeft: 8 }}>{pickScale(TIER_MAP, nowV)}</span>
                  </div>
                  {pickScale(LABEL_MAP, nowV) && (
                    <div style={{ fontFamily: LORA, fontSize: 13, color: metaCol, marginTop: 3 }}>{pickScale(LABEL_MAP, nowV)}</div>
                  )}
                  {pickScale(SIGNATURE_MAP, nowV) && (
                    <p style={{ fontFamily: LORA, fontSize: 13, color: bodyCol, lineHeight: 1.5, marginTop: 6 }}>{pickScale(SIGNATURE_MAP, nowV)}</p>
                  )}
                  {note.nowNote && (
                    <p style={{ fontFamily: LORA, fontSize: 13, color: bodyCol, lineHeight: 1.5, marginTop: 6 }}>{note.nowNote}</p>
                  )}
                </>
              ) : (
                <div style={{ fontFamily: LORA, fontSize: 13, color: metaCol }}>Not yet placed.</div>
              )}
            </div>

            {/* Horizon Goal */}
            {hdV != null && (
              <div>
                <div style={{ fontFamily: SC, fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', color: GOLD_DK, marginBottom: 4 }}>Horizon Goal</div>
                <div style={{ fontFamily: SC, fontSize: 22, fontWeight: 600, color: GOLD_DK, lineHeight: 1 }}>
                  {hdV}<span style={{ fontSize: 14, letterSpacing: '0.04em', marginLeft: 8 }}>{pickScale(TIER_MAP, hdV)}</span>
                </div>
                {note.goalText && (
                  <p style={{ fontFamily: LORA, fontStyle: 'italic', fontSize: 14, color: bodyCol, lineHeight: 1.55, marginTop: 6 }}>{note.goalText}</p>
                )}
                {gap != null && gap > 0 && (
                  <div style={{ fontFamily: SC, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: GOLD_DK, marginTop: 8 }}>▲ {gap} to travel</div>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ fontFamily: LORA, fontSize: 13, color: metaCol, textAlign: 'center', paddingTop: 12 }}>
            Tap a domain to see where you are.
          </div>
        )}
      </div>
    </div>
  )
}
