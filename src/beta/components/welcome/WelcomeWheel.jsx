// ─────────────────────────────────────────────────────────────
// WelcomeWheel.jsx
//
// Renders the seven-spoke wheel used in the welcome narrative.
// Two wheel kinds: 'self' (personal) and 'civ' (civilisational).
// Six modes:
//   self:  empty | populate | static
//   civ:   empty-spin | place-domain | scale-zoom | static
//
// The prototype mutates an SVG imperatively; we keep that approach
// inside a useEffect so the animation logic ports verbatim.
//
// Data is passed via props so the same component renders any
// narrative — Kin's individual welcome, Hearth Lab's org welcome,
// future practitioner / group flows.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'

const SVG_CFG = { size: 230, factor: 0.58, n: 7 }

function angleFor(i) { return (Math.PI * 2 * i) / SVG_CFG.n - Math.PI / 2 }

// Per-spoke label positioning. Spokes 1-7 clockwise from top.
function labelPositionFor(idx, n, tipX, tipY) {
  const spokeNum = idx + 1
  const GAP = 8
  const ABOVE_GAP = 14
  switch (spokeNum) {
    case 1: return { x: tipX, y: tipY - ABOVE_GAP, anchor: 'middle' }
    case 2: return { x: tipX + GAP, y: tipY - 4, anchor: 'start' }
    case 3: return { x: tipX + GAP, y: tipY - 6, anchor: 'start' }
    case 4: return { x: tipX + GAP, y: tipY + 14, anchor: 'start' }
    case 5: return { x: tipX - GAP, y: tipY + 14, anchor: 'end' }
    case 6: return { x: tipX - GAP, y: tipY - 6, anchor: 'end' }
    case 7: return { x: tipX - GAP, y: tipY - 4, anchor: 'end' }
    default: return { x: tipX, y: tipY, anchor: 'middle' }
  }
}

// ─── Self-wheel base (spokes + horizon ring + tip suns + labels) ─────
function selfWheelBase(svg, selfData) {
  const { size, factor, n } = SVG_CFG
  const cx = size / 2, cy = size / 2, maxR = (size / 2) * factor
  const labels = selfData.labels

  let html = ''
  const ringPts = []
  for (let i = 0; i < n; i++) {
    const a = angleFor(i)
    ringPts.push(`${cx + maxR * Math.cos(a)},${cy + maxR * Math.sin(a)}`)
  }
  html += `<polygon class="horizon-ring" points="${ringPts.join(' ')}"/>`
  for (let i = 0; i < n; i++) {
    const a = angleFor(i)
    const tx = cx + maxR * Math.cos(a), ty = cy + maxR * Math.sin(a)
    html += `<line x1="${cx}" y1="${cy}" x2="${tx}" y2="${ty}" class="horizon-spoke"/>`
    html += `<circle cx="${tx}" cy="${ty}" r="3" fill="rgba(200,146,42,0.5)"/>`
  }
  for (let i = 0; i < n; i++) {
    const a = angleFor(i)
    const tipX = cx + maxR * Math.cos(a)
    const tipY = cy + maxR * Math.sin(a)
    const txt = labels[i].toUpperCase()
    const pos = labelPositionFor(i, n, tipX, tipY)
    if (txt.includes(' ')) {
      const [w1, w2] = txt.split(' ')
      html += `<text class="label" x="${pos.x}" y="${pos.y - 6}" text-anchor="${pos.anchor}">${w1}</text>`
      html += `<text class="label" x="${pos.x}" y="${pos.y + 7}" text-anchor="${pos.anchor}">${w2}</text>`
    } else {
      html += `<text class="label" x="${pos.x}" y="${pos.y}" text-anchor="${pos.anchor}">${txt}</text>`
    }
  }
  svg.innerHTML = html
  return { cx, cy, maxR }
}

// Mutable list of timeout handles so we can clear on unmount
function renderSelfWheel(svg, mode, timers, selfData) {
  const { cx, cy, maxR } = selfWheelBase(svg, selfData)

  if (mode === 'empty') return

  const { keys, horizons, current, tierColor } = selfData
  const verts = keys.map((k, i) => {
    const h = horizons[k], c = current[k]
    const ratio = Math.min(c / h, 1)
    const a = angleFor(i)
    const r = ratio * maxR
    return { i, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), color: tierColor(c, h) }
  })

  if (mode === 'static') {
    const polyPts = verts.map(v => `${v.x},${v.y}`).join(' ')
    svg.insertAdjacentHTML('beforeend', `<polygon class="current-poly" points="${polyPts}"/>`)
    verts.forEach(v => {
      svg.insertAdjacentHTML('beforeend',
        `<circle class="self-vert" cx="${v.x}" cy="${v.y}" r="4" fill="${v.color}"/>`)
    })
    return
  }

  if (mode === 'populate') {
    const initPts = verts.map(() => `${cx},${cy}`).join(' ')
    svg.insertAdjacentHTML('beforeend',
      `<polygon class="current-poly" id="self-poly-anim" points="${initPts}" style="transition: all 0.5s cubic-bezier(0.4,0,0.2,1)"/>`)
    verts.forEach(v => {
      svg.insertAdjacentHTML('beforeend',
        `<circle class="self-vert" data-i="${v.i}" cx="${v.x}" cy="${v.y}" r="0" fill="${v.color}" opacity="0"/>`)
    })

    const polyEl = svg.querySelector('#self-poly-anim')
    verts.forEach((v, idx) => {
      const t = setTimeout(() => {
        const vertEl = svg.querySelector(`.self-vert[data-i="${v.i}"]`)
        if (vertEl) vertEl.classList.add('populating')
        const pts = verts.map((vv, ii) => {
          if (ii <= idx) return `${vv.x},${vv.y}`
          return `${cx},${cy}`
        }).join(' ')
        if (polyEl) polyEl.setAttribute('points', pts)
      }, idx * 450)
      timers.push(t)
    })
  }
}

// ─── Civ-wheel base (spokes + reference rings + domain labels) ───────
function civWheelBase(svg, civData) {
  const { size, factor, n } = SVG_CFG
  const cx = size / 2, cy = size / 2, maxR = (size / 2) * factor
  const { domains, primarySlug } = civData
  let html = ''
  const outer = []
  for (let i = 0; i < n; i++) {
    const a = angleFor(i)
    outer.push(`${cx + maxR * Math.cos(a)},${cy + maxR * Math.sin(a)}`)
  }
  html += `<polygon class="horizon-ring" points="${outer.join(' ')}"/>`
  ;[0.33, 0.66].forEach(f => {
    const pts = []
    for (let i = 0; i < n; i++) {
      const a = angleFor(i)
      pts.push(`${cx + f * maxR * Math.cos(a)},${cy + f * maxR * Math.sin(a)}`)
    }
    html += `<polygon points="${pts.join(' ')}" fill="none" stroke="rgba(200,146,42,0.18)" stroke-width="1"/>`
  })
  for (let i = 0; i < n; i++) {
    const a = angleFor(i)
    const tx = cx + maxR * Math.cos(a), ty = cy + maxR * Math.sin(a)
    html += `<line x1="${cx}" y1="${cy}" x2="${tx}" y2="${ty}" class="horizon-spoke"/>`
  }
  for (let i = 0; i < n; i++) {
    const a = angleFor(i)
    const tipX = cx + maxR * Math.cos(a)
    const tipY = cy + maxR * Math.sin(a)
    const dom = domains[i]
    const isPrimary = dom.slug === primarySlug
    const cls = isPrimary ? 'label label-active' : 'label'
    const pos = labelPositionFor(i, n, tipX, tipY)
    html += `<text class="${cls}" x="${pos.x}" y="${pos.y}" text-anchor="${pos.anchor}">${dom.label.toUpperCase()}</text>`
  }
  svg.innerHTML = html
  return { cx, cy, maxR }
}

function applyWheelSpin(svg) {
  const html = svg.innerHTML
  const labelMatches = html.match(/<text[\s\S]*?<\/text>/g) || []
  const labelHTML = labelMatches.join('')
  const nonLabel = html.replace(/<text[\s\S]*?<\/text>/g, '')
  svg.innerHTML = `
    <g class="civ-spinner" style="transform-origin: center; transform-box: fill-box;">
      ${nonLabel}
    </g>
    ${labelHTML}
  `
  const spinner = svg.querySelector('.civ-spinner')
  if (spinner) {
    spinner.style.animation = 'civSpin 4s cubic-bezier(0.4, 0, 0.2, 1) forwards'
  }
}

function placePrimaryDomainDot(svg, cx, cy, maxR, animate, timers, civData) {
  const { domains, primarySlug } = civData
  const idx = domains.findIndex(d => d.slug === primarySlug)
  if (idx < 0) return
  const a = angleFor(idx)
  const x = cx + 0.66 * maxR * Math.cos(a)
  const y = cy + 0.66 * maxR * Math.sin(a)
  const dom = domains[idx]
  if (animate) {
    svg.insertAdjacentHTML('beforeend',
      `<circle class="civ-marker primary-domain-dot populating" cx="${x}" cy="${y}" r="0" fill="${dom.color}" opacity="0" style="opacity: 1;"/>`)
    const t = setTimeout(() => {
      const m = svg.querySelector('.primary-domain-dot')
      if (m) { m.setAttribute('r', 9); m.style.opacity = '0.95' }
    }, 250)
    timers.push(t)
  } else {
    svg.insertAdjacentHTML('beforeend',
      `<circle class="civ-marker primary-domain-dot" cx="${x}" cy="${y}" r="9" fill="${dom.color}" opacity="0.95"/>`)
  }
}

function applyScaleZoom(svg, cx, cy, maxR, timers, civData) {
  // Fade out the seven-domain structure
  svg.querySelectorAll('.label').forEach(label => {
    label.style.transition = 'opacity 0.6s'
    label.style.opacity = '0'
  })
  svg.querySelectorAll('.horizon-spoke').forEach(line => {
    line.style.transition = 'opacity 0.6s'
    line.style.opacity = '0'
  })
  svg.querySelectorAll('polygon[stroke-dasharray]').forEach(p => {
    if (!p.classList.contains('horizon-ring')) {
      p.style.transition = 'opacity 0.6s'
      p.style.opacity = '0'
    }
  })
  const horizonRing = svg.querySelector('.horizon-ring')
  if (horizonRing) {
    horizonRing.style.transition = 'opacity 0.6s'
    horizonRing.style.opacity = '0'
  }

  // Scale rings — outermost to innermost (override via civData.scaleRings)
  const DEFAULT_SCALE_RINGS = [
    { name: 'global',        frac: 0.95, lit: false },
    { name: 'national',      frac: 0.80, lit: false },
    { name: 'regional',      frac: 0.65, lit: false },
    { name: 'city',          frac: 0.50, lit: false },
    { name: 'neighbourhood', frac: 0.35, lit: true  },
    { name: 'household',     frac: 0.22, lit: false },
    { name: 'one-person',    frac: 0.10, lit: false },
  ]
  const rings = civData.scaleRings || DEFAULT_SCALE_RINGS

  rings.forEach(ring => {
    const r = ring.frac * maxR
    const stroke = ring.lit ? 'var(--gold)' : 'rgba(200,146,42,0.32)'
    const strokeWidth = ring.lit ? '2' : '1'
    const dasharray = ring.lit ? 'none' : '2 4'
    svg.insertAdjacentHTML('beforeend',
      `<circle class="scale-ring scale-ring-${ring.name}" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-dasharray="${dasharray}" opacity="0" style="transition: opacity 0.7s ease-out;"/>`)
  })

  const LABEL_GAP = 8
  rings.forEach(ring => {
    const r = ring.frac * maxR
    const labelX = cx + r + LABEL_GAP
    const labelY = cy + 4
    const cls = ring.lit ? 'scale-label scale-label-lit' : 'scale-label'
    const labelText = ring.name.toUpperCase()
    svg.insertAdjacentHTML('beforeend',
      `<text class="${cls}" x="${labelX}" y="${labelY}" text-anchor="start" opacity="0" style="transition: opacity 0.7s ease-out;">${labelText}</text>`)
  })

  // Primary domain dot moves inward to its scale ring
  const { domains, primarySlug } = civData
  const litRing = rings.find(r => r.lit)
  const idxPrimary = domains.findIndex(d => d.slug === primarySlug)
  const aPrimary = angleFor(idxPrimary)
  const litFrac = litRing ? litRing.frac : 0.35
  const newR = litFrac * maxR
  const newX = cx + newR * Math.cos(aPrimary)
  const newY = cy + newR * Math.sin(aPrimary)

  const primaryDot = svg.querySelector('.primary-domain-dot')
  if (primaryDot) {
    primaryDot.style.transition = 'cx 0.9s cubic-bezier(0.4,0,0.2,1), cy 0.9s cubic-bezier(0.4,0,0.2,1)'
    requestAnimationFrame(() => {
      primaryDot.setAttribute('cx', newX)
      primaryDot.setAttribute('cy', newY)
    })
  }

  const t = setTimeout(() => {
    svg.querySelectorAll('.scale-ring').forEach(r => { r.style.opacity = '1' })
    svg.querySelectorAll('.scale-label').forEach(l => { l.style.opacity = '1' })
  }, 400)
  timers.push(t)
}

function renderCivWheel(svg, mode, timers, civData) {
  if (mode === 'empty' || mode === 'empty-spin') {
    civWheelBase(svg, civData)
    if (mode === 'empty-spin') applyWheelSpin(svg)
    return
  }
  if (mode === 'static') {
    const { cx, cy, maxR } = civWheelBase(svg, civData)
    placePrimaryDomainDot(svg, cx, cy, maxR, false, timers, civData)
    return
  }
  if (mode === 'place-domain') {
    const { cx, cy, maxR } = civWheelBase(svg, civData)
    placePrimaryDomainDot(svg, cx, cy, maxR, true, timers, civData)
    return
  }
  if (mode === 'scale-zoom') {
    const { cx, cy, maxR } = civWheelBase(svg, civData)
    placePrimaryDomainDot(svg, cx, cy, maxR, false, timers, civData)
    applyScaleZoom(svg, cx, cy, maxR, timers, civData)
    return
  }
}

/**
 * @typedef {Object} SelfData
 * @property {string[]} labels       Seven dimension labels.
 * @property {string[]} keys         Seven dimension keys (matched to labels by index).
 * @property {Object} horizons       { key: number } — horizon target per dimension.
 * @property {Object} current        { key: number } — current value per dimension.
 * @property {(c:number,h:number)=>string} tierColor   Returns colour for a current/horizon pair.
 */

/**
 * @typedef {Object} CivData
 * @property {Array<{slug:string,label:string,color:string}>} domains   Seven civ domains.
 * @property {string} primarySlug    Slug of the primary placed domain.
 * @property {Array<{name:string,frac:number,lit:boolean}>} [scaleRings]  Optional override for scale rings.
 */

/**
 * @typedef {Object} WelcomeWheelProps
 * @property {'self'|'civ'|null} kind
 * @property {'empty'|'populate'|'static'|'empty-spin'|'place-domain'|'scale-zoom'} mode
 * @property {SelfData} [selfData]   Required when kind === 'self'.
 * @property {CivData} [civData]     Required when kind === 'civ'.
 */

/**
 * @param {WelcomeWheelProps} props
 */
export default function WelcomeWheel({ kind, mode, selfData, civData }) {
  const svgRef = useRef(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg || !kind) return
    const timers = []
    if (kind === 'self' && selfData) renderSelfWheel(svg, mode, timers, selfData)
    else if (kind === 'civ' && civData) renderCivWheel(svg, mode, timers, civData)
    return () => timers.forEach(clearTimeout)
  }, [kind, mode, selfData, civData])

  if (!kind) return null

  return (
    <svg
      ref={svgRef}
      width="310"
      height="260"
      viewBox="-40 -10 310 260"
      style={{ display: 'block' }}
    />
  )
}
