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
const GLASS = {"y0":132,"rows":[[401,618],[400,620],[398,622],[396,624],[395,626],[393,628],[391,630],[390,631],[388,633],[386,634],[384,636],[382,638],[381,640],[379,641],[377,643],[376,644],[374,646],[372,647],[371,649],[369,650],[368,652],[367,653],[365,655],[364,656],[362,657],[361,658],[360,660],[358,661],[357,662],[356,664],[354,665],[353,666],[352,668],[350,669],[349,670],[348,671],[347,673],[346,674],[344,675],[343,676],[342,677],[341,678],[340,679],[339,681],[337,682],[336,683],[335,684],[334,685],[333,686],[332,687],[331,688],[330,689],[329,690],[328,691],[327,692],[326,693],[325,694],[324,695],[323,696],[323,697],[322,698],[321,699],[320,700],[319,701],[318,701],[317,702],[316,703],[315,704],[315,705],[314,706],[313,707],[312,708],[311,708],[310,709],[310,710],[309,711],[308,711],[307,712],[306,713],[305,714],[305,715],[304,715],[303,716],[303,717],[302,718],[301,718],[301,719],[300,720],[299,720],[299,721],[298,722],[297,723],[297,723],[296,724],[295,724],[295,725],[294,726],[293,726],[293,727],[292,727],[291,728],[291,729],[290,729],[289,730],[289,730],[288,731],[288,732],[287,732],[286,733],[286,733],[285,734],[285,735],[284,735],[284,736],[283,736],[283,736],[282,737],[282,738],[281,738],[281,739],[280,739],[280,740],[279,740],[278,741],[278,741],[278,742],[277,742],[277,743],[276,743],[276,744],[275,744],[275,744],[274,745],[274,745],[273,746],[273,746],[273,747],[272,747],[272,747],[271,748],[271,748],[270,748],[270,749],[270,749],[269,750],[269,750],[269,750],[268,751],[268,751],[267,751],[267,752],[267,752],[266,752],[266,753],[266,753],[265,754],[265,754],[265,754],[264,755],[264,755],[263,755],[263,756],[263,756],[263,756],[262,756],[262,757],[262,757],[261,757],[261,758],[261,758],[260,758],[260,758],[260,759],[260,759],[260,759],[260,759],[259,760],[259,760],[259,760],[258,760],[258,760],[258,761],[258,761],[258,761],[257,761],[257,762],[257,762],[257,762],[256,762],[256,763],[256,763],[256,763],[255,763],[255,764],[255,764],[255,764],[255,764],[254,764],[254,764],[254,764],[254,765],[254,765],[254,765],[253,765],[253,765],[253,765],[253,765],[252,765],[252,766],[252,766],[252,766],[252,766],[252,766],[252,766],[252,766],[252,766],[252,767],[252,767],[252,767],[252,767],[254,765],[254,765],[254,767],[255,766],[255,765],[256,764],[257,763],[258,761],[260,761],[261,759],[262,758],[264,754],[265,753],[266,752],[268,751],[269,750],[272,749],[270,751],[269,754],[267,755],[265,757],[264,758],[262,759],[267,759],[260,762],[258,763],[263,764],[262,765],[254,767],[253,768],[252,769],[250,771],[249,772],[246,773],[245,775],[252,767],[252,766],[252,766],[252,766],[252,766],[252,766],[253,766],[253,766],[253,765],[253,765],[253,765],[253,765],[253,765],[254,765],[254,765],[254,764],[254,764],[254,764],[254,764],[254,764],[255,764],[255,764],[255,763],[255,763],[255,763],[255,763],[255,763],[256,763],[256,762],[256,762],[256,762],[256,762],[257,762],[257,761],[257,761],[257,761],[257,761],[258,761],[258,760],[258,760],[258,760],[258,760],[259,759],[259,759],[259,759],[259,759],[260,759],[260,758],[260,758],[260,758],[261,758],[261,757],[261,757],[262,757],[262,757],[262,756],[262,756],[263,756],[263,755],[263,755],[264,755],[264,754],[264,754],[265,754],[265,754],[265,753],[266,753],[266,753],[266,752],[267,752],[267,752],[267,751],[268,751],[268,750],[268,750],[269,750],[269,749],[270,749],[270,749],[270,748],[271,748],[271,747],[272,747],[272,746],[272,746],[273,746],[273,745],[274,745],[274,744],[274,744],[277,743],[275,743],[276,743],[276,742],[277,742],[277,741],[278,741],[278,740],[279,740],[279,739],[280,739],[280,738],[281,738],[281,737],[282,736],[282,736],[283,735],[283,735],[284,734],[285,734],[285,733],[286,733],[286,732],[287,732],[285,731],[288,730],[286,730],[289,729],[290,729],[290,728],[291,727],[291,727],[292,726],[293,725],[293,725],[294,724],[294,724],[295,723],[296,722],[297,722],[297,721],[298,720],[298,721],[299,719],[300,718],[300,718],[301,717],[302,716],[302,716],[303,715],[304,714],[305,714],[303,713],[306,712],[307,711],[308,711],[308,710],[309,709],[310,708],[311,708],[310,707],[312,706],[313,705],[314,704],[315,703],[315,703],[316,702],[317,701],[318,700],[319,699],[320,698],[321,698],[322,697],[322,696],[323,695],[324,694],[325,693],[326,692],[327,691],[328,690],[329,689],[330,688],[331,687],[332,686],[333,685],[334,684],[335,683],[337,682],[338,681],[339,680],[340,679],[341,678],[343,677],[344,676],[345,675],[346,673],[347,672],[351,671],[350,669],[351,668],[352,667],[354,646],[355,644],[359,644],[361,643],[363,642],[365,642],[369,642],[371,641],[372,640],[372,640],[371,640],[373,640],[373,640],[373,640],[374,640],[375,638],[377,638],[379,641],[380,638],[382,636],[383,634],[388,632],[387,631],[389,629],[391,627],[393,625],[397,623],[399,621],[398,619],[401,617],[403,615],[405,610],[407,608]]}

const CORE = { x: 512, y: 385 }
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
