// src/app/components/mission-control/BeaconStrip.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The beacon at the top of Mission Control. A pull-down slider: collapsed it is
// a band of light; pulled, it reveals the lantern, the count, and today's
// check-ins. A check-in writes a real strand-log row (api/actor-calls log_strand)
// and a spark flies to the lantern; the tally re-reads from api/beacon.
//
// Meaning ("what is this?") and the record ("see what we've done") hang off the
// beacon, one tap away, never on the daily surface. The daily loop stays wordless.
//
// Renders nothing until the beacon is rooted and live (status !== 'pending'), so
// it appears on Mission Control automatically the moment the founding challenge
// is published and the beacon is rooted.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const A = {
  bright: '#F2C45A', glow: '#FFE6A8', amber: '#C8922A', deep: '#7A4A12', night: '#141019',
}

async function postJSON(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return r.json()
}

const fmt = (n) => Number(n || 0).toLocaleString('en-GB')

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i)
  return out
}

export default function BeaconStrip({ userId }) {
  const navigate = useNavigate()
  const [beacon, setBeacon] = useState(null)
  const [mine, setMine] = useState([])
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [showMeaning, setShowMeaning] = useState(false)
  const [askPush, setAskPush] = useState(false)
  const panelRef = useRef(null)
  const lanternRef = useRef(null)

  const loadTally = useCallback(async () => {
    const b = await postJSON('/api/beacon', { action: 'get', slug: 'founding-nature' })
    setBeacon(b)
    return b
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const b = await loadTally()
        if (!alive || !b || !b.rooted) return
        if (userId) {
          const [parts, bd] = await Promise.all([
            postJSON('/api/actor-calls', { action: 'my_participations', userId }),
            postJSON('/api/beacon', { action: 'breakdown', slug: 'founding-nature' }),
          ])
          if (!alive) return
          const treeIds = new Set((bd.challenges || []).map((c) => c.call_id))
          const runs = (parts.participations || []).filter(
            (p) => treeIds.has(p.call_id) && p.status === 'active',
          )
          setMine(runs)
        }
      } catch (_) { /* fail quiet; the strip simply shows the tally */ }
      finally { if (alive) setReady(true) }
    })()
    return () => { alive = false }
  }, [userId, loadTally])

  const openCount = mine.reduce((n, r) => {
    const strands = r.strands || []
    const allDone = strands.length > 0 && strands.every((s) => (r.done_today || []).includes(s.id))
    return n + (allDone ? 0 : 1)
  }, 0)

  const flySpark = useCallback((fromEl) => {
    if (!fromEl || !lanternRef.current) return
    const r = fromEl.getBoundingClientRect()
    const tr = lanternRef.current.getBoundingClientRect()
    const f = document.createElement('div')
    f.className = 'bcn-fly'
    f.style.left = `${r.left + r.width / 2 - 5}px`
    f.style.top = `${r.top + r.height / 2 - 5}px`
    document.body.appendChild(f)
    requestAnimationFrame(() => {
      f.style.transform = `translate(${tr.left + tr.width / 2 - (r.left + r.width / 2)}px,${tr.top + tr.height / 2 - (r.top + r.height / 2)}px) scale(.6)`
      f.style.opacity = '0.2'
    })
    setTimeout(() => f.remove(), 700)
  }, [])

  const checkIn = useCallback(async (run, btnEl) => {
    const strands = run.strands || []
    const todo = strands.filter((s) => !(run.done_today || []).includes(s.id))
    if (!todo.length) return
    // optimistic
    setMine((cur) => cur.map((r) => r.participant_id === run.participant_id
      ? { ...r, done_today: strands.map((s) => s.id) } : r))
    flySpark(btnEl)
    try {
      await Promise.all(todo.map((s) => postJSON('/api/actor-calls', {
        action: 'log_strand', userId, call_id: run.call_id, strand_id: s.id, done: true,
      })))
      await loadTally()
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'default'
            && !localStorage.getItem('beaconPushAsked')) {
          setAskPush(true)
        }
      } catch (_) { /* ignore */ }
    } catch (_) { /* leave optimistic state; next load reconciles */ }
  }, [userId, flySpark, loadTally])

  const subscribePush = useCallback(async () => {
    try {
      if (typeof Notification === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        setAskPush(false); return
      }
      const perm = await Notification.requestPermission()
      try { localStorage.setItem('beaconPushAsked', '1') } catch (_) {}
      if (perm !== 'granted') { setAskPush(false); return }
      const reg = await navigator.serviceWorker.ready
      const { publicKey } = await postJSON('/api/push-subscribe', { action: 'get_key' })
      if (!publicKey) { setAskPush(false); return }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
      await postJSON('/api/push-subscribe', { action: 'subscribe', userId, subscription: sub.toJSON() })
    } catch (_) { /* ignore */ }
    setAskPush(false)
  }, [userId])

  const dismissPush = useCallback(() => {
    try { localStorage.setItem('beaconPushAsked', '1') } catch (_) {}
    setAskPush(false)
  }, [])

  // ── slider drag ──
  const drag = useRef({ on: false, startY: 0, startH: 0, moved: 0, max: 0 })
  const measure = () => (panelRef.current ? panelRef.current.scrollHeight : 0)
  const setPanelHeight = (h, animate) => {
    const p = panelRef.current
    if (!p) return
    p.style.transition = animate ? 'max-height .42s cubic-bezier(.3,.7,.2,1)' : 'none'
    p.style.maxHeight = `${h}px`
  }
  const toggle = () => {
    const next = !open
    setOpen(next)
    setPanelHeight(next ? measure() : 0, true)
  }
  const onGripDown = (e) => {
    drag.current = { on: true, startY: e.clientY, startH: parseFloat(panelRef.current?.style.maxHeight || '0') || 0, moved: 0, max: measure() }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch (_) {}
  }
  const onGripMove = (e) => {
    const d = drag.current
    if (!d.on) return
    const dy = e.clientY - d.startY
    d.moved = Math.max(d.moved, Math.abs(dy))
    const h = Math.min(d.max, Math.max(0, d.startH + dy))
    setPanelHeight(h, false)
  }
  const onGripUp = () => {
    const d = drag.current
    if (!d.on) return
    d.on = false
    if (d.moved < 6) { toggle(); return }
    const h = parseFloat(panelRef.current?.style.maxHeight || '0') || 0
    const isOpen = h > d.max * 0.4
    setOpen(isOpen)
    setPanelHeight(isOpen ? d.max : 0, true)
  }

  // keep height correct when content changes while open
  useEffect(() => { if (open) setPanelHeight(measure(), false) }, [mine, open])

  if (!beacon || beacon.status === 'pending' || !beacon.rooted) return null

  const newcomer = ready && mine.length === 0
  const bandMsg = !ready
    ? beacon.label
    : newcomer
      ? 'The Founding Nature Constellation is live'
      : openCount > 0
        ? `${openCount === 1 ? '1 challenge' : `${openCount} challenges`} waiting for you`
        : 'you\u2019ve shown up today'

  return (
    <div className={`bcn-wrap${open ? ' open' : ''}`}>
      <style>{CSS}</style>

      <div className="bcn-bar" onClick={toggle} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } }}>
        <span className="bcn-mini" aria-hidden="true">
          <span className="bcn-ml-cap" />
          <span className="bcn-ml-glass"><span className="bcn-ml-light" /></span>
          <span className="bcn-ml-base" />
          <span className="bcn-ml-halo" />
        </span>
        <span className="bcn-title">The beacon</span>
        <span className="bcn-msg">{bandMsg}</span>
        <span className="bcn-spacer" />
        <span className="bcn-count">{fmt(beacon.sparks)}<small>sparks</small></span>
      </div>

      <div className="bcn-panel" ref={panelRef}>
        <div className="bcn-panel-in">
          <div className="bcn-lcol">
            <div className="bcn-lantern" ref={lanternRef}>
              <div className="bcn-l-handle" />
              <div className="bcn-l-cap" />
              <div className="bcn-l-glass"><div className="bcn-l-light" /></div>
              <div className="bcn-l-base" />
              <div className="bcn-l-halo" />
            </div>
            <div className="bcn-lread"><div className="bcn-c">{fmt(beacon.sparks)}</div><div className="bcn-k">sparks</div></div>
            <button className="bcn-what" onClick={() => setShowMeaning(true)}>what is this?</button>
          </div>

          <div className="bcn-today">
            {askPush && (
              <div className="bcn-push">
                <span className="bcn-push-q">Want a nudge when your challenge is waiting?</span>
                <span className="bcn-push-act">
                  <button onClick={subscribePush}>Turn on</button>
                  <button className="ghost" onClick={dismissPush}>Not now</button>
                </span>
              </div>
            )}
            {newcomer ? (
              <div className="bcn-invite">
                <p className="bcn-lead">The NextUs Nature challenge is the constellation made by an invitation to organisations working for the living world, and the people who show up alongside them. Every spark is one of those people, showing up, and taking action. The beacon is all of our actions, made visible, together. We&rsquo;re mighty together.</p>
                <button className="bcn-go" onClick={() => navigate('/challenges/browse')}>Take part</button>
              </div>
            ) : (
              <>
                <div className="bcn-today-h">Today</div>
                {openCount === 0 && <p className="bcn-alldone">All checked in. The beacon&rsquo;s brighter for it.</p>}
                {mine.map((run) => {
                  const strands = run.strands || []
                  const done = strands.length > 0 && strands.every((s) => (run.done_today || []).includes(s.id))
                  return (
                    <div className="bcn-ci" key={run.participant_id}>
                      <div className="bcn-ci-info">
                        <div className="bcn-ci-nm">{(run.strands && run.strands[0] && run.strands[0].text) || run.title}</div>
                        <div className="bcn-ci-commit">you committed</div>
                      </div>
                      {done
                        ? <button className="bcn-ci-btn done" disabled>Done &#10003;</button>
                        : <button className="bcn-ci-btn" onClick={(e) => checkIn(run, e.currentTarget)}>I did this today</button>}
                    </div>
                  )
                })}
                <button className="bcn-record" onClick={() => navigate('/constellation/record')}>see what we&rsquo;ve done &rarr;</button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bcn-grip" onPointerDown={onGripDown} onPointerMove={onGripMove} onPointerUp={onGripUp} onPointerCancel={onGripUp}>
        <svg className="bcn-chev" viewBox="0 0 24 24" fill="none" stroke={A.bright} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
      </div>

      {showMeaning && (
        <div className="bcn-veil" onClick={(e) => { if (e.target === e.currentTarget) setShowMeaning(false) }}>
          <div className="bcn-meaning">
            <span className="bcn-x" onClick={() => setShowMeaning(false)}>&times;</span>
            <div className="bcn-eyebrow">What is this?</div>
            <h3>The Founding Nature Constellation</h3>
            <div className="bcn-beat"><div className="bcn-bt">What you&rsquo;re part of</div><div className="bcn-bd">A constellation of organisations working with and for the living world, linked, and open to you.</div></div>
            <div className="bcn-beat"><div className="bcn-bt">What a spark is</div><div className="bcn-bd">Show up, take one real action, that&rsquo;s a spark. Every spark you add, the beacon brightens.</div></div>
            <div className="bcn-beat"><div className="bcn-bt">Why it matters</div><div className="bcn-bd">This work is already making a difference. Together we can scale it, more people, more action. Your participation adds sparks to the beacon. The beacon invites others in, and shows us all we&rsquo;re not caring alone.</div></div>
          </div>
        </div>
      )}
    </div>
  )
}

const CSS = `
.bcn-wrap{position:relative;z-index:60;background:radial-gradient(140% 240% at 22% 0%,#1d1626,${A.night} 72%);color:#FAF1DE;border-bottom:1px solid ${A.amber};user-select:none}
.bcn-bar{position:relative;z-index:3;display:flex;align-items:center;gap:14px;padding:0 20px;height:56px;cursor:pointer}
.bcn-mini{position:relative;width:18px;height:32px;flex:none;display:block;transform-origin:left center;transition:opacity .4s,transform .4s cubic-bezier(.3,.7,.2,1)}
.bcn-wrap.open .bcn-mini{opacity:0;transform:scale(2.4) translateX(6px);pointer-events:none}
.bcn-ml-cap{position:absolute;top:0;left:50%;transform:translateX(-50%);width:14px;height:4px;background:linear-gradient(180deg,#3a2c1a,#241a10);clip-path:polygon(14% 0,86% 0,100% 100%,0 100%);border-radius:2px 2px 0 0}
.bcn-ml-glass{position:absolute;top:4px;left:50%;transform:translateX(-50%);width:16px;height:24px;border:1.2px solid ${A.amber};border-radius:3px;overflow:hidden;background:rgba(20,14,9,.6)}
.bcn-ml-light{position:absolute;left:0;right:0;bottom:0;height:62%;background:linear-gradient(180deg,${A.glow},${A.bright} 45%,${A.amber});box-shadow:0 0 11px rgba(255,221,128,.7);animation:bcnbeat 2.6s ease-in-out infinite}
@keyframes bcnbeat{0%,100%{box-shadow:0 0 8px rgba(255,221,128,.55)}50%{box-shadow:0 0 15px rgba(255,221,128,.85)}}
.bcn-ml-base{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:12px;height:3px;background:linear-gradient(180deg,#3a2c1a,#241a10);clip-path:polygon(0 0,100% 0,86% 100%,14% 100%);border-radius:0 0 2px 2px}
.bcn-ml-halo{position:absolute;left:50%;top:55%;width:50px;height:50px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,rgba(255,221,128,.4),rgba(255,221,128,0) 64%);pointer-events:none}
.bcn-title{font-family:'Cormorant SC',Georgia,serif;letter-spacing:.2em;text-transform:uppercase;font-size:14px}
.bcn-msg{font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:18px;color:${A.glow};min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bcn-spacer{flex:1}
.bcn-count{font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;color:#fff;font-variant-numeric:tabular-nums;flex:none}
.bcn-count small{font-family:'Cormorant SC',Georgia,serif;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:rgba(250,241,222,.6);margin-left:6px}
@media(max-width:560px){.bcn-bar{gap:10px;padding:0 14px}.bcn-title{display:none}.bcn-msg{font-size:16px}.bcn-count{font-size:19px}}

.bcn-panel{position:absolute;top:100%;left:0;right:0;z-index:2;max-height:0;overflow:hidden;background:radial-gradient(140% 200% at 20% 0%,#1d1626,${A.night} 76%);border-bottom:1px solid ${A.amber}}
.bcn-panel-in{padding:10px 22px 24px;display:grid;grid-template-columns:auto 1fr;gap:28px;align-items:start}
@media(max-width:560px){.bcn-panel-in{grid-template-columns:1fr;gap:16px}}
.bcn-lantern{position:relative;width:78px;transform-origin:top left;opacity:0;transform:scale(.35) translateY(-6px);transition:opacity .45s ease .08s,transform .5s cubic-bezier(.3,.7,.2,1) .08s}
.bcn-wrap.open .bcn-lantern{opacity:1;transform:none}
.bcn-l-handle{width:28px;height:15px;border:2px solid ${A.amber};border-bottom:none;border-radius:15px 15px 0 0;margin:0 auto -1px}
.bcn-l-cap{width:56px;height:12px;margin:0 auto;background:linear-gradient(180deg,#3a2c1a,#241a10);clip-path:polygon(14% 0,86% 0,100% 100%,0 100%);border-radius:3px 3px 0 0}
.bcn-l-glass{position:relative;width:66px;height:108px;margin:0 auto;border:1.8px solid ${A.amber};border-radius:8px;overflow:hidden;background:linear-gradient(180deg,rgba(30,22,14,.5),rgba(20,14,9,.82))}
.bcn-l-light{position:absolute;left:0;right:0;bottom:0;height:60%;background:linear-gradient(180deg,${A.glow},${A.bright} 35%,${A.amber} 70%,${A.deep});box-shadow:0 0 28px rgba(255,221,128,.5)}
.bcn-l-base{width:52px;height:10px;margin:0 auto;background:linear-gradient(180deg,#3a2c1a,#241a10);clip-path:polygon(0 0,100% 0,86% 100%,14% 100%);border-radius:0 0 4px 4px}
.bcn-l-halo{position:absolute;left:39px;top:56px;width:180px;height:180px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,rgba(255,221,128,.38),rgba(255,221,128,0) 64%);pointer-events:none}
.bcn-lread{text-align:center;margin-top:6px}
.bcn-c{font-family:'Cormorant Garamond',Georgia,serif;font-size:32px;color:#fff;line-height:1;font-variant-numeric:tabular-nums}
.bcn-k{font-family:'Cormorant SC',Georgia,serif;letter-spacing:.14em;text-transform:uppercase;font-size:13px;color:rgba(250,241,222,.66);margin-top:3px}
.bcn-what{display:block;margin:12px auto 0;font-family:'Cormorant SC',Georgia,serif;letter-spacing:.1em;text-transform:uppercase;font-size:13px;color:rgba(242,196,90,.85);background:none;border:none;border-bottom:1px solid rgba(242,196,90,.45);cursor:pointer;padding:0 0 1px}

.bcn-today-h{font-family:'Cormorant SC',Georgia,serif;letter-spacing:.18em;text-transform:uppercase;font-size:13px;color:${A.bright};margin:2px 0 10px}
.bcn-ci{display:flex;align-items:center;gap:14px;padding:11px 0;border-bottom:1px solid rgba(250,241,222,.12)}
.bcn-ci-info{flex:1;min-width:0}
.bcn-ci-nm{font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;color:#FAF1DE;line-height:1.15}
.bcn-ci-commit{font-size:13px;color:rgba(250,241,222,.55)}
.bcn-ci-btn{font-family:'Cormorant SC',Georgia,serif;letter-spacing:.13em;text-transform:uppercase;font-size:13px;color:#1a1320;background:${A.bright};border:none;border-radius:24px;padding:11px 18px;cursor:pointer;white-space:nowrap}
.bcn-ci-btn.done{background:transparent;color:${A.bright};border:1px solid rgba(242,196,90,.5);cursor:default}
.bcn-alldone{font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:19px;color:${A.glow};padding:6px 0}
.bcn-invite .bcn-lead{font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;line-height:1.4;color:#FAF1DE;margin:0 0 16px;max-width:48ch}
.bcn-go{font-family:'Cormorant SC',Georgia,serif;letter-spacing:.14em;text-transform:uppercase;font-size:13px;color:#1a1320;background:${A.bright};border:none;border-radius:24px;padding:12px 22px;cursor:pointer}
.bcn-record{margin-top:14px;font-family:'Cormorant SC',Georgia,serif;letter-spacing:.1em;text-transform:uppercase;font-size:13px;color:rgba(242,196,90,.85);background:none;border:none;border-bottom:1px solid rgba(242,196,90,.45);cursor:pointer;padding:0 0 1px}
.bcn-push{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;justify-content:space-between;background:rgba(242,196,90,.08);border:1px solid rgba(242,196,90,.3);border-radius:12px;padding:11px 14px;margin-bottom:14px}
.bcn-push-q{font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;color:#FAF1DE}
.bcn-push-act{display:flex;gap:8px;flex:none}
.bcn-push-act button{font-family:'Cormorant SC',Georgia,serif;letter-spacing:.12em;text-transform:uppercase;font-size:13px;color:#1a1320;background:${A.bright};border:none;border-radius:22px;padding:9px 16px;cursor:pointer}
.bcn-push-act button.ghost{background:transparent;color:rgba(242,196,90,.85);border:1px solid rgba(242,196,90,.45)}

.bcn-grip{position:relative;z-index:4;height:30px;display:flex;align-items:center;justify-content:center;cursor:grab;touch-action:none}
.bcn-grip:active{cursor:grabbing}
.bcn-chev{width:20px;height:20px;transition:transform .35s}
.bcn-wrap.open .bcn-chev{transform:rotate(180deg)}

.bcn-fly{position:fixed;width:10px;height:10px;border-radius:50%;background:${A.glow};box-shadow:0 0 12px ${A.glow},0 0 4px #fff;z-index:1000;pointer-events:none;transition:transform .7s cubic-bezier(.4,0,.2,1),opacity .7s}

.bcn-veil{position:fixed;inset:0;z-index:1100;background:rgba(10,7,14,.72);display:flex;align-items:center;justify-content:center;padding:24px}
.bcn-meaning{max-width:460px;width:100%;background:radial-gradient(130% 120% at 20% 0%,#231a2e,${A.night} 72%);border:1px solid ${A.amber};border-radius:18px;padding:30px;color:#FAF1DE;position:relative}
.bcn-x{position:absolute;top:12px;right:16px;cursor:pointer;color:rgba(250,241,222,.6);font-size:22px;line-height:1}
.bcn-eyebrow{font-family:'Cormorant SC',Georgia,serif;letter-spacing:.18em;text-transform:uppercase;font-size:13px;color:${A.bright}}
.bcn-meaning h3{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:30px;margin:6px 0 18px;line-height:1.1}
.bcn-beat{margin-bottom:16px}
.bcn-bt{font-family:'Cormorant SC',Georgia,serif;letter-spacing:.12em;text-transform:uppercase;font-size:13px;color:${A.bright};margin-bottom:3px}
.bcn-bd{font-family:'Lora',Georgia,serif;font-size:15.5px;line-height:1.5;color:rgba(250,241,222,.92)}
@media (prefers-reduced-motion:reduce){.bcn-ml-light,.bcn-mini,.bcn-lantern,.bcn-chev{animation:none!important;transition:none!important}}
`
