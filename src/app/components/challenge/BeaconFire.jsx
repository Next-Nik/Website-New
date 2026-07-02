// src/app/components/challenge/BeaconFire.jsx
//
// The beacon, alive, made of the beacon artwork itself. The frame is the
// generated render with its glass emptied to true transparency; every star,
// streak, and the core flare are true-alpha sprites cut from the generated
// sheets. The canvas sits behind the frame and shines through the aperture.
//
// The sky is a tree, not a scatter: one seed at the centre (the founding
// challenge), and every star grows from a branch of it. Growth is
// deterministic (seeded PRNG), so every visitor sees the identical
// constellation for the same spark count. Density scales with live sparks:
// 24 stars lit and waiting, one more per 25 sparks, up to 78.
//
// Imperative API via ref: fireSpark() sends an energy pulse through a random
// lineage. Wire it to a check-in so showing up visibly feeds the fire.
//
// Assets load from /public/beacon/. prefers-reduced-motion stills everything
// to a lit, steady sky.

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'

// Glass aperture of the frame render, measured per row in its 1024 space.
const GLASS = {"y0":136,"rows":[[491,534],[482,543],[475,550],[470,555],[465,560],[460,565],[456,569],[452,573],[449,576],[445,580],[442,583],[439,586],[436,589],[433,592],[431,594],[428,597],[425,600],[423,602],[421,604],[418,607],[416,609],[414,611],[412,613],[410,615],[408,617],[406,619],[404,621],[402,623],[400,625],[399,626],[397,628],[395,630],[393,632],[392,633],[390,635],[389,636],[387,638],[385,640],[384,641],[382,643],[381,644],[380,645],[378,647],[377,648],[375,650],[374,651],[373,652],[371,654],[370,655],[369,656],[368,657],[366,659],[365,660],[364,661],[363,662],[362,663],[360,665],[359,666],[358,667],[357,668],[356,669],[355,670],[354,671],[353,672],[352,673],[351,674],[350,675],[349,676],[348,677],[347,678],[346,679],[345,680],[344,681],[343,682],[342,683],[341,684],[340,685],[339,686],[338,687],[337,688],[337,688],[336,689],[335,690],[334,691],[333,692],[332,693],[332,693],[331,694],[330,695],[329,696],[329,696],[328,697],[327,698],[326,699],[326,699],[325,700],[324,701],[323,702],[323,702],[322,703],[321,704],[321,704],[320,705],[319,706],[319,706],[318,707],[317,708],[317,708],[316,709],[315,710],[315,710],[314,711],[314,711],[313,712],[312,713],[312,713],[311,714],[311,714],[310,715],[310,715],[309,716],[309,716],[308,717],[307,718],[307,718],[306,719],[306,719],[305,720],[305,720],[304,721],[304,721],[303,722],[303,722],[303,722],[302,723],[302,723],[301,724],[301,724],[300,725],[300,725],[299,726],[299,726],[299,726],[298,727],[298,727],[297,728],[297,728],[297,728],[296,729],[296,729],[295,730],[295,730],[295,730],[294,731],[294,731],[294,731],[293,732],[293,732],[293,732],[292,733],[292,733],[292,733],[291,734],[291,734],[291,734],[290,735],[290,735],[290,735],[290,735],[289,736],[289,736],[289,736],[289,736],[288,737],[288,737],[288,737],[288,737],[287,738],[287,738],[287,738],[287,738],[286,739],[286,739],[286,739],[286,739],[286,739],[285,740],[285,740],[285,740],[285,740],[285,740],[284,741],[284,741],[284,741],[284,741],[284,741],[284,741],[283,742],[283,742],[283,742],[283,742],[283,742],[283,742],[283,742],[283,742],[282,743],[282,743],[282,743],[282,743],[282,743],[282,743],[282,743],[282,743],[282,743],[282,743],[282,743],[281,744],[281,744],[281,744],[281,744],[281,744],[281,744],[281,744],[281,744],[281,744],[281,744],[281,744],[281,744],[281,744],[281,744],[281,744],[281,744],[281,744],[281,744],[281,744],[281,744],[281,744],[281,744],[281,744],[281,744],[281,744],[281,744],[281,744],[281,744],[281,744],[281,744],[282,743],[282,743],[282,743],[282,743],[282,743],[282,743],[282,743],[282,743],[282,743],[282,743],[282,743],[283,742],[283,742],[283,742],[283,742],[283,742],[283,742],[283,742],[283,742],[284,741],[284,741],[284,741],[284,741],[284,741],[284,741],[285,740],[285,740],[285,740],[285,740],[285,740],[286,739],[286,739],[286,739],[286,739],[286,739],[287,738],[287,738],[287,738],[287,738],[288,737],[288,737],[288,737],[288,737],[289,736],[289,736],[289,736],[289,736],[290,735],[290,735],[290,735],[290,735],[291,734],[291,734],[291,734],[292,733],[292,733],[292,733],[293,732],[293,732],[293,732],[294,731],[294,731],[294,731],[295,730],[295,730],[295,730],[296,729],[296,729],[297,728],[297,728],[297,728],[298,727],[298,727],[299,726],[299,726],[299,726],[300,725],[300,725],[301,724],[301,724],[302,723],[302,723],[303,722],[303,722],[303,722],[304,721],[304,721],[305,720],[305,720],[306,719],[306,719],[307,718],[307,718],[308,717],[309,716],[309,716],[310,715],[310,715],[311,714],[311,714],[312,713],[312,713],[313,712],[314,711],[314,711],[315,710],[315,710],[316,709],[317,708],[317,708],[318,707],[319,706],[319,706],[320,705],[321,704],[321,704],[322,703],[323,702],[323,702],[324,701],[325,700],[326,699],[326,699],[327,698],[328,697],[329,696],[329,696],[330,695],[331,694],[332,693],[332,693],[333,692],[334,691],[335,690],[336,689],[337,688],[337,688],[338,687],[339,686],[340,685],[341,684],[342,683],[343,682],[344,681],[345,680],[346,679],[347,678],[348,677],[349,676],[350,675],[351,674],[352,673],[353,672],[354,671],[355,670],[356,669],[357,668],[358,667],[359,666],[360,665],[362,663],[363,662],[364,661],[365,660],[366,659],[368,657],[369,656],[370,655],[371,654],[373,652],[374,651],[375,650],[377,648],[378,647],[380,645],[381,644],[382,643],[384,641],[385,640],[387,638],[389,636],[390,635],[392,633],[393,632],[395,630],[397,628],[399,626],[400,625],[402,623],[404,621],[406,619],[408,617],[410,615],[412,613],[414,611],[416,609],[418,607],[421,604],[423,602],[425,600],[428,597],[431,594],[433,592],[436,589],[439,586],[442,583],[445,580],[449,576],[452,573],[456,569],[460,565],[465,560],[470,555],[475,550],[482,543],[491,534]]}

const CORE = { x: 512, y: 366 }
const ASSET = (n) => `/beacon/${n}.png`
const SPRITE_NAMES = ['star-small', 'star-mid', 'star-glint', 'star-core', 'streak-long']

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

    const rows = {}
    for (let i = 0; i < GLASS.rows.length; i++) rows[GLASS.y0 + i] = GLASS.rows[i]
    const Y0 = GLASS.y0 + 14
    const Y1 = GLASS.y0 + GLASS.rows.length - 1 - 14

    const st = {
      nodes: [], links: [], frontier: [], pulses: [], risers: [],
      rnd: null, K: 1, raf: 0, growQueue: 0, target: 24, running: true,
      spr: {}, loaded: 0,
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
        kind: roll < 0.5 ? 'star-small' : (roll < 0.8 ? 'star-mid' : 'star-glint'),
        ph: st.rnd() * 6.28, sp: 0.5 + st.rnd() * 1.0 }
    }
    function reset() {
      st.rnd = mulberry32(7)
      st.nodes = []; st.links = []; st.frontier = []; st.pulses = []
      const seed = makeNode(CORE.x, CORE.y, 0, null)
      st.nodes.push(seed); st.frontier.push(seed)
      st.risers = []
      const rr = mulberry32(41)
      for (let i = 0; i < 6; i++) {
        st.risers.push({ x: CORE.x + (rr() - 0.5) * 260, y: Y0 + rr() * (Y1 - Y0),
          vy: 9 + rr() * 9, ph: rr() * 6 })
      }
    }
    function childCap(n) { return n.depth === 0 ? 6 : (st.nodes.length < 36 ? 3 : 5) }
    function placeable(x, y) {
      const yi = Math.round(y)
      if (yi < Y0 || yi > Y1 || !rows[yi]) return false
      const r = rows[yi]
      if (x < r[0] + 12 || x > r[1] - 12) return false
      if (Math.hypot(x - CORE.x, y - CORE.y) < 95) return false
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
      while (attempts++ < 140) {
        if (!st.frontier.length) {
          for (let ri = 0; ri < st.nodes.length; ri++) {
            if (st.nodes[ri].children < childCap(st.nodes[ri])) st.frontier.push(st.nodes[ri])
          }
          if (!st.frontier.length) return null
        }
        const p = st.frontier[Math.floor(st.rnd() * st.frontier.length)]
        if (p.children >= childCap(p)) { removeFromFrontier(p); continue }
        let ang
        if (p.depth === 0) ang = p.children * (Math.PI * 2 / 6) + (st.rnd() - 0.5) * 0.5
        else ang = Math.atan2(p.y - CORE.y, p.x - CORE.x) + (st.rnd() - 0.5) * 3.6
        const dist = 58 + p.depth * 10 + st.rnd() * 26
        for (let si = 0; si < SHRINK.length; si++) {
          const x = p.x + Math.cos(ang) * dist * SHRINK[si] + (st.rnd() - 0.5) * 20
          const y = p.y + Math.sin(ang) * dist * SHRINK[si] + (st.rnd() - 0.5) * 20
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
      const count = Math.min(78, 24 + Math.floor(Number(sp || 0) / 25))
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

    function stamp(img, x, y, scale, alpha) {
      const w = img.width * scale, h = img.height * scale
      ctx.globalAlpha = alpha
      ctx.drawImage(img, x - w / 2, y - h / 2, w, h)
    }
    const KIND_SCALE = { 'star-small': 0.42, 'star-mid': 0.45, 'star-glint': 0.5 }

    function draw(t, dt) {
      ctx.setTransform(st.K, 0, 0, st.K, 0, 0)
      ctx.clearRect(0, 0, 1024, 1024)
      ctx.globalCompositeOperation = 'lighter'

      // lineage links: the streak artwork rotated along each edge
      for (let li = 0; li < st.links.length; li++) {
        const la = st.links[li].a, lb = st.links[li].b
        const ldx = lb.x - la.x, ldy = lb.y - la.y
        const llen = Math.hypot(ldx, ldy)
        const lh = Math.max(10, Math.min(22, llen * 0.16))
        ctx.save()
        ctx.translate((la.x + lb.x) / 2, (la.y + lb.y) / 2)
        ctx.rotate(Math.atan2(ldy, ldx))
        ctx.globalAlpha = 0.55
        ctx.drawImage(st.spr['streak-long'], -llen / 2, -lh / 2, llen, lh)
        ctx.restore()
      }

      // stars
      for (let ni = 1; ni < st.nodes.length; ni++) {
        const n = st.nodes[ni]
        const tw = reduced ? 0.8 : 0.62 + 0.38 * Math.sin(t * n.sp * 2 + n.ph)
        stamp(st.spr[n.kind], n.x, n.y, KIND_SCALE[n.kind] * (0.92 + tw * 0.16), 0.55 + 0.45 * tw)
      }

      // risers
      for (let mi = 0; mi < st.risers.length; mi++) {
        const m = st.risers[mi]
        if (!reduced) {
          m.y -= m.vy * dt / 1000
          if (m.y < Y0 + 30) { m.y = Y1 - 20; m.x = CORE.x + (Math.random() - 0.5) * 280 }
        }
        stamp(st.spr['star-small'], m.x, m.y, 0.2, 0.20 + 0.14 * Math.sin(t * 1.3 + m.ph))
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
        stamp(st.spr['star-mid'], A.x + (B.x - A.x) * e, A.y + (B.y - A.y) * e, 0.3, 0.95)
      }

      // the core, breathing
      const breathe = reduced ? 1 : 1 + 0.06 * Math.sin(t * 1.4)
      stamp(st.spr['star-core'], CORE.x, CORE.y, 0.75 * breathe, 1.0)
      stamp(st.spr['star-core'], CORE.x, CORE.y, 0.42 * breathe, 0.7)

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

    // load sprites, then start
    SPRITE_NAMES.forEach((name) => {
      const img = new Image()
      img.onload = () => {
        st.loaded++
        if (st.loaded === SPRITE_NAMES.length) {
          reset()
          st.setSparks(st.pendingSparks || 0)
          if (!reduced) st.raf = requestAnimationFrame((n) => { last = n; st.raf = requestAnimationFrame(frame) })
          else draw(0, 0)
        }
      }
      img.src = ASSET(name)
      st.spr[name] = img
    })

    return () => {
      st.running = false
      cancelAnimationFrame(st.raf)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  // spark count drives density; safe before load via pendingSparks
  useEffect(() => {
    const st = state.current
    if (!st) return
    if (st.setSparks && st.loaded === SPRITE_NAMES.length) st.setSparks(sparks)
    else st.pendingSparks = sparks
  }, [sparks])

  return (
    <div ref={boxRef} style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <img src={ASSET('frame')} alt="" draggable={false}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', userSelect: 'none' }} />
    </div>
  )
})

export default BeaconFire
