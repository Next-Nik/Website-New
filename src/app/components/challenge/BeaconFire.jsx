// src/app/components/challenge/BeaconFire.jsx
//
// The beacon, alive, built around the golden mark itself. The mark
// (public/beacon/mark.png) sits over a canvas; the flame glow is seated in
// the circle of the spire — the ring the needle passes through — and
// breathes there. Stars grow up and out of that ring, filling the mark's
// large outer circle and overflowing past it as sparks accrue.
//
// The sky is a tree, not a scatter: one seed at the ring, every star grows
// from a branch of it. Growth is deterministic (seeded PRNG), so every
// visitor sees the identical constellation for the same spark count. The
// sky is honest: one star per real spark, up to 78 — no decorative
// baseline. At zero sparks, only the flame burns in the ring.
//
// Imperative API via ref: fireSpark() sends an energy pulse through a random
// lineage. Wire it to a check-in so showing up visibly feeds the fire.
//
// prefers-reduced-motion stills everything to a lit, steady sky.

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'

// Geometry in the engine's 1024 space, measured from the mark artwork:
// the ring of the spire (glow home) and the large outer circle (fill target).
const RING  = { x: 512, y: 662, r: 94 }
const OUTER = { x: 511, y: 543, r: 389 }
// v=2: cache-buster. The service worker serves same-origin images
// stale-while-revalidate, so a changed mark.png under the same URL shows
// the OLD artwork for one full visit after every deploy. Bump the query
// whenever the artwork changes.
const MARK_SRC = '/beacon/mark.png?v=2'

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const BeaconFire = forwardRef(function BeaconFire({ sparks = 0 }, ref) {
  const boxRef = useRef(null)
  const canvasRef = useRef(null)
  const state = useRef(null)

  useImperativeHandle(ref, () => ({
    fireSpark() {
      const st = state.current
      if (!st || st.nodes.length < 2 || st.pulses.length > 4) return
      const n = st.nodes[1 + Math.floor(Math.random() * (st.nodes.length - 1))]
      st.pulses.push({ path: pathToRoot(n), seg: 0, t: 0, dur: 240 })
    },
  }))

  function pathToRoot(node) {
    const p = []
    let cur = node
    while (cur) { p.unshift(cur); cur = cur.parent }
    return p
  }

  // one mount = one engine
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const DPR = Math.min(2, window.devicePixelRatio || 1)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const st = {
      nodes: [], links: [], frontier: [], pulses: [],
      rnd: null, K: 1, raf: 0, growQueue: 0, target: 1, running: true,
    }
    state.current = st

    function fit() {
      const box = boxRef.current.getBoundingClientRect()
      canvas.width = box.width * DPR
      canvas.height = box.width * DPR
      st.K = (box.width * DPR) / 1024
    }
    fit()
    const onResize = () => fit()
    window.addEventListener('resize', onResize)

    function makeNode(x, y, depth, parent) {
      const roll = st.rnd()
      return { x, y, depth, parent, children: 0,
        size: roll < 0.5 ? 7 : (roll < 0.85 ? 9.5 : 12.5),
        ph: st.rnd() * 6.28, sp: 0.5 + st.rnd() * 1.0 }
    }
    function reset() {
      st.rnd = mulberry32(7)
      st.nodes = []; st.links = []; st.frontier = []; st.pulses = []
      const seed = makeNode(RING.x, RING.y, 0, null)
      st.nodes.push(seed); st.frontier.push(seed)
      // No ambient embers, no decorative motes: the beacon is a live read.
      // Every point of light above the flame is one real spark — nothing else.
    }
    function childCap(n) { return n.depth === 0 ? 6 : (st.nodes.length < 36 ? 3 : 5) }
    function placeable(x, y) {
      // Up and out: stars live above the ring line, filling the outer circle
      // and overflowing to the edges. Nothing settles below the ring, and the
      // glow owns its circle.
      if (x < 24 || x > 1000 || y < 30) return false
      if (y > RING.y + 36) return false
      if (Math.hypot(x - RING.x, y - RING.y) < RING.r + 46) return false
      for (let i = 0; i < st.nodes.length; i++) {
        if (Math.hypot(st.nodes[i].x - x, st.nodes[i].y - y) < 36) return false
      }
      return true
    }
    const SHRINK = [1.0, 0.65, 1.5]
    function removeFromFrontier(n) {
      const i = st.frontier.indexOf(n)
      if (i > -1) st.frontier.splice(i, 1)
    }
    function growOne() {
      let attempts = 0
      while (attempts++ < 160) {
        if (!st.frontier.length) {
          for (let ri = 0; ri < st.nodes.length; ri++) {
            if (st.nodes[ri].children < childCap(st.nodes[ri])) st.frontier.push(st.nodes[ri])
          }
          if (!st.frontier.length) return null
        }
        const p = st.frontier[Math.floor(st.rnd() * st.frontier.length)]
        if (p.children >= childCap(p)) { removeFromFrontier(p); continue }
        let ang
        if (p.depth === 0) {
          // First branches leave the ring in a wide upward fan — up and out,
          // never down.
          ang = -Math.PI / 2 + (p.children - 2.5) * 0.66 + (st.rnd() - 0.5) * 0.4
        } else {
          // Radial growth away from the ring with a gentle upward pull, so
          // the constellation climbs to fill the outer circle then spills
          // past it.
          ang = Math.atan2(p.y - RING.y, p.x - RING.x) + (st.rnd() - 0.5) * 2.6
          ang = ang * 0.85 + (-Math.PI / 2) * 0.15
        }
        const dist = 92 + p.depth * 14 + st.rnd() * 46
        for (let si = 0; si < SHRINK.length; si++) {
          const x = p.x + Math.cos(ang) * dist * SHRINK[si] + (st.rnd() - 0.5) * 30
          const y = p.y + Math.sin(ang) * dist * SHRINK[si] + (st.rnd() - 0.5) * 30
          if (placeable(x, y)) {
            const n = makeNode(x, y, p.depth + 1, p)
            p.children++
            if (p.children >= childCap(p)) removeFromFrontier(p)
            st.nodes.push(n); st.frontier.push(n)
            st.links.push({ a: p, b: n })
            return n
          }
        }
      }
      return null
    }
    st.setSparks = function (sp) {
      // Honest sky: one visible star per real spark, capped at 78. The node
      // count includes the invisible seed at the ring (stars render from
      // index 1), so N sparks = N + 1 nodes.
      const count = 1 + Math.min(78, Math.max(0, Math.floor(Number(sp || 0))))
      if (count < st.nodes.length) {
        reset()
        while (st.nodes.length < count) { if (!growOne()) break }
        st.growQueue = 0
      } else {
        st.growQueue = count - st.nodes.length
      }
      st.target = count
      if (reduced) draw(0, 0)
    }

    function drawStar(x, y, r, alpha, tw) {
      const pr = r * (0.9 + tw * 0.25)
      const g = ctx.createRadialGradient(x, y, 0, x, y, pr * 4)
      g.addColorStop(0, `rgba(255,236,190,${alpha})`)
      g.addColorStop(0.35, `rgba(242,196,90,${alpha * 0.55})`)
      g.addColorStop(1, 'rgba(242,196,90,0)')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(x, y, pr * 4, 0, 6.29); ctx.fill()
      // glint cross
      ctx.strokeStyle = `rgba(255,240,205,${alpha * 0.8})`
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.moveTo(x - pr * 2.2, y); ctx.lineTo(x + pr * 2.2, y)
      ctx.moveTo(x, y - pr * 2.2); ctx.lineTo(x, y + pr * 2.2)
      ctx.stroke()
    }

    function draw(t, dt) {
      ctx.setTransform(st.K, 0, 0, st.K, 0, 0)
      ctx.clearRect(0, 0, 1024, 1024)
      ctx.globalCompositeOperation = 'lighter'

      // lineage links
      ctx.strokeStyle = 'rgba(242,196,90,0.22)'
      ctx.lineWidth = 1.8
      for (let li = 0; li < st.links.length; li++) {
        const la = st.links[li].a, lb = st.links[li].b
        ctx.beginPath()
        ctx.moveTo(la.x, la.y)
        ctx.lineTo(lb.x, lb.y)
        ctx.stroke()
      }

      // stars
      for (let ni = 1; ni < st.nodes.length; ni++) {
        const n = st.nodes[ni]
        const tw = reduced ? 0.8 : 0.62 + 0.38 * Math.sin(t * n.sp * 2 + n.ph)
        drawStar(n.x, n.y, n.size, 0.5 + 0.5 * tw, tw)
      }

      // energy pulses along the lineage
      for (let pi = st.pulses.length - 1; pi >= 0; pi--) {
        const p = st.pulses[pi]
        p.t += dt
        let segT = p.t / p.dur
        while (segT >= 1 && p.seg < p.path.length - 2) { p.t -= p.dur; p.seg++; segT = p.t / p.dur }
        if (p.seg >= p.path.length - 1 || (segT >= 1 && p.seg >= p.path.length - 2)) { st.pulses.splice(pi, 1); continue }
        const A = p.path[p.seg], B = p.path[p.seg + 1]
        const e = Math.max(0, Math.min(1, segT))
        drawStar(A.x + (B.x - A.x) * e, A.y + (B.y - A.y) * e, 11, 0.95, 1)
      }

      // the flame, seated in the circle of the spire, breathing
      const breathe = reduced ? 1 : 1 + 0.07 * Math.sin(t * 1.4)
      const R = RING.r * 1.7 * breathe
      const g1 = ctx.createRadialGradient(RING.x, RING.y, 0, RING.x, RING.y, R)
      g1.addColorStop(0, 'rgba(255,224,150,0.85)')
      g1.addColorStop(0.4, 'rgba(242,180,70,0.32)')
      g1.addColorStop(1, 'rgba(242,180,70,0)')
      ctx.fillStyle = g1
      ctx.beginPath(); ctx.arc(RING.x, RING.y, R, 0, 6.29); ctx.fill()
      const g2 = ctx.createRadialGradient(RING.x, RING.y, 0, RING.x, RING.y, R * 0.35)
      g2.addColorStop(0, 'rgba(255,246,220,0.95)')
      g2.addColorStop(1, 'rgba(255,246,220,0)')
      ctx.fillStyle = g2
      ctx.beginPath(); ctx.arc(RING.x, RING.y, R * 0.35, 0, 6.29); ctx.fill()

      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }

    let last = 0, growTimer = 0, ambientTimer = 0
    function frame(now) {
      if (!st.running) return
      const dt = Math.min(50, now - last); last = now
      const t = now / 1000
      growTimer += dt
      if (st.growQueue > 0 && growTimer > 130) {
        growTimer = 0
        const n = growOne()
        if (n) { st.growQueue--; st.pulses.push({ path: pathToRoot(n), seg: 0, t: 0, dur: 240 }) }
        else st.growQueue = 0
      }
      ambientTimer += dt
      if (ambientTimer > 4200 && st.nodes.length > 3 && st.pulses.length < 3) {
        ambientTimer = 0
        const n = st.nodes[1 + Math.floor(Math.random() * (st.nodes.length - 1))]
        st.pulses.push({ path: pathToRoot(n), seg: 0, t: 0, dur: 240 })
      }
      draw(t, dt)
      st.raf = requestAnimationFrame(frame)
    }

    // no sprite sheets: the engine draws procedurally, so it starts at once
    reset()
    st.setSparks(st.pendingSparks ?? 0)
    if (!reduced) st.raf = requestAnimationFrame((n) => { last = n; st.raf = requestAnimationFrame(frame) })
    else draw(0, 0)
    st.ready = true

    return () => {
      st.running = false
      cancelAnimationFrame(st.raf)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  // spark count drives density; safe before mount via pendingSparks
  useEffect(() => {
    const st = state.current
    if (!st) return
    if (st.ready && st.setSparks) st.setSparks(sparks)
    else st.pendingSparks = sparks
  }, [sparks])

  return (
    <div ref={boxRef} style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <img src={MARK_SRC} alt="" draggable={false}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', userSelect: 'none' }} />
    </div>
  )
})

export default BeaconFire
