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
import BeaconFire from '../challenge/BeaconFire'
import { computeChain, dotRow } from '../../../lib/challengeChain'
import { VOICE, dayStage } from '../../../constants/companionVoice'

const A = {
  bright: '#F2C45A', glow: '#FFE6A8', amber: '#C8922A', deep: '#7A4A12', night: '#141019',
}

import { supabase } from '../../../hooks/useSupabase'

async function postJSON(url, body) {
  let token = null
  try {
    token = (await supabase.auth.getSession()).data.session?.access_token || null
  } catch (_) { /* signed-out is a valid state */ }
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  return r.json()
}

const fmt = (n) => Number(n || 0).toLocaleString('en-GB')

// Dignity threshold, same rule as /earth: below this many sparks, the strip
// says the beacon is newly lit instead of arguing with a bald zero.
const NEWLY_LIT_BELOW = 25

function ago(at) {
  const secs = Math.max(0, (Date.now() - new Date(at).getTime()) / 1000)
  if (secs < 90) return 'just now'
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`
  if (secs < 86400) return `${Math.round(secs / 3600)}h ago`
  return `${Math.round(secs / 86400)}d ago`
}
function todayStr() { return new Date().toISOString().slice(0, 10) }
function fmtShort(iso) {
  const [y, m, d] = String(iso || '').split('-').map(Number)
  if (!y) return ''
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

// A run's day is KEPT with one real action; only daily-absolute requires the
// full sweep, because its author chose "every single day, no exceptions".
function runKeptToday(run) {
  const doneCount = (run.done_today || []).length
  const total = (run.strands || []).length
  if (run.cadence === 'daily-absolute') return total > 0 && doneCount >= total
  return doneCount > 0
}
function runSweptToday(run) {
  const total = (run.strands || []).length
  return total > 0 && (run.done_today || []).length >= total
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i)
  return out
}

const PUSH_SUPPORTED = typeof window !== 'undefined'
  && typeof Notification !== 'undefined'
  && 'serviceWorker' in navigator
  && 'PushManager' in window

export default function BeaconStrip({ userId }) {
  const navigate = useNavigate()
  const [beacon, setBeacon] = useState(null)
  const [mine, setMine] = useState([])
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [showMeaning, setShowMeaning] = useState(false)
  const [askPush, setAskPush] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [feed, setFeed] = useState(null)
  const [copied, setCopied] = useState(null)
  const panelRef = useRef(null)
  const lanternRef = useRef(null)
  const fireRef = useRef(null)

  const loadTally = useCallback(async () => {
    const b = await postJSON('/api/beacon', { action: 'get', slug: 'founding-nature' })
    setBeacon(b)
    return b
  }, [])

  const reload = useCallback(async () => {
    const b = await loadTally()
    if (!b || !b.rooted) { setReady(true); return }
    if (userId) {
      try {
        const [parts, bd] = await Promise.all([
          postJSON('/api/actor-calls', { action: 'my_participations', userId }),
          postJSON('/api/beacon', { action: 'breakdown', slug: 'founding-nature' }),
        ])
        const treeIds = new Set((bd.challenges || []).map((c) => c.call_id))
        const runs = (parts.participations || []).filter(
          (p) => treeIds.has(p.call_id) && p.status === 'active',
        )
        setMine(runs)
        setExpanded((cur) => {
          if (cur && runs.some((r) => r.participant_id === cur)) return cur
          const firstOpen = runs.find((r) => !runKeptToday(r)) || runs[0]
          return firstOpen ? firstOpen.participant_id : null
        })
      } catch (_) { /* keep prior state */ }
    }
    setReady(true)
  }, [userId, loadTally])

  const loadFeed = useCallback(async () => {
    try {
      const a = await postJSON('/api/actor-calls', { action: 'constellation_activity', limit: 6 })
      if (a && a.events) setFeed(a)
    } catch (_) { /* the fire still shows without the ticker */ }
  }, [])

  useEffect(() => {
    reload()
    const onVis = () => { if (document.visibilityState === 'visible') reload() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [reload])

  const openCount = mine.reduce((n, r) => n + (runKeptToday(r) ? 0 : 1), 0)
  const stage = dayStage()

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

  const checkStrand = useCallback(async (run, strand, btnEl) => {
    if ((run.done_today || []).includes(strand.id)) return
    // optimistic: mark the strand and today's date
    setMine((cur) => cur.map((r) => r.participant_id === run.participant_id
      ? { ...r,
          done_today: [...(r.done_today || []), strand.id],
          done_dates: (r.done_dates || []).includes(todayStr()) ? r.done_dates : [...(r.done_dates || []), todayStr()],
        } : r))
    flySpark(btnEl)
    try { fireRef.current && fireRef.current.fireSpark() } catch (_) { /* visual only */ }
    try {
      await postJSON('/api/actor-calls', {
        action: 'log_strand', userId, call_id: run.call_id, strand_id: strand.id, done: true,
      })
      await loadTally()
      try {
        if (PUSH_SUPPORTED && Notification.permission === 'default'
            && !localStorage.getItem('beaconPushAsked')) {
          setAskPush(true)
        }
      } catch (_) { /* ignore */ }
    } catch (_) { /* leave optimistic state; next load reconciles */ }
  }, [userId, flySpark, loadTally])

  const copyInvite = useCallback((run) => {
    const url = `${window.location.origin}/stretch/c/${run.slug || ''}`
    try { navigator.clipboard.writeText(url) } catch (_) { /* copy is best-effort */ }
    setCopied(run.participant_id)
    setTimeout(() => setCopied(null), 1800)
  }, [])

  const subscribePush = useCallback(async () => {
    try {
      if (!PUSH_SUPPORTED) { setAskPush(false); return }
      // Check the server can actually send before asking for permission, so a
      // missing-key run never spends the user's one permission grant.
      const { publicKey } = await postJSON('/api/push-subscribe', { action: 'get_key' })
      if (!publicKey) { try { localStorage.setItem('beaconPushAsked', '1') } catch (_) {}; setAskPush(false); return }
      const perm = await Notification.requestPermission()
      try { localStorage.setItem('beaconPushAsked', '1') } catch (_) {}
      if (perm !== 'granted') { setAskPush(false); return }
      const reg = await navigator.serviceWorker.ready
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
    if (next) { reload(); if (!mine.length) loadFeed() }
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
  useEffect(() => { if (open) setPanelHeight(measure(), false) }, [mine, feed, expanded, copied, askPush, open])

  if (!beacon || beacon.status === 'pending' || !beacon.rooted) return null

  const newcomer = ready && mine.length === 0
  const bandMsg = !ready
    ? beacon.label
    : newcomer
      ? 'The Earth Challenge is LIVE'
      : openCount > 0
        ? `${openCount === 1 ? '1 challenge' : `${openCount} challenges`} waiting for you`
        : 'You showed up! Well done!'

  return (
    <div className={`bcn-wrap${open ? ' open' : ''}`}>
      <style>{CSS}</style>

      <div className="bcn-bar" onClick={toggle} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } }}>
        <span className="bcn-mini" aria-hidden="true">
          <span className="bcn-mini-core" />
          <img className="bcn-mini-img" src="/beacon/mark.png?v=2" alt="" />
        </span>
        <span className="bcn-title">The beacon</span>
        <span className="bcn-msg">{bandMsg}</span>
        <span className="bcn-spacer" />
        <span className="bcn-count">
          {Number(beacon.sparks || 0) < NEWLY_LIT_BELOW
            ? 'Newly lit'
            : <>{fmt(beacon.sparks)}<small>sparks</small></>}
        </span>
      </div>

      <div className="bcn-panel" ref={panelRef}>
        <div className="bcn-panel-in">
          <div className="bcn-lcol">
            <div className="bcn-fire" ref={lanternRef}>
              <BeaconFire ref={fireRef} sparks={Number(beacon.sparks || 0)} />
            </div>
            <div className="bcn-lread">
              {Number(beacon.sparks || 0) < NEWLY_LIT_BELOW
                ? <div className="bcn-c" style={{ fontSize: '22px' }}>Newly lit</div>
                : <><div className="bcn-c">{fmt(beacon.sparks)}</div><div className="bcn-k">sparks</div></>}
            </div>
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
              <div className="bcn-livein">
                <p className="bcn-livetoday">
                  {feed && feed.sparks_today > 0
                    ? <><b>{feed.sparks_today}</b> sparks today, and counting</>
                    : 'The beacon is lit. Every check-in adds a spark.'}
                </p>
                <div className="bcn-live-cta">
                  <button className="bcn-go" onClick={() => navigate(beacon.root_slug ? `/stretch/c/${beacon.root_slug}` : '/challenges/browse')}>See the challenge &rarr;</button>
                  <button className="bcn-go ghost" onClick={() => navigate(beacon.root_slug ? `/stretch/c/${beacon.root_slug}?accept=1` : '/challenges/browse')}>Accept the challenge &rarr;</button>
                </div>
                {feed && (feed.field?.challenges || []).length > 0 && (
                  <div className="bcn-chals">
                    {(feed.field.challenges || []).slice(0, 4).map((c) => (
                      <button className="bcn-chal" key={c.call_id}
                        onClick={() => c.slug && navigate(`/stretch/c/${c.slug}`)}>
                        <span className="bcn-chal-t">{c.title}</span>
                        <span className="bcn-chal-by">{c.actor_name || 'Community'}</span>
                        <span className="bcn-chal-n">
                          {c.people > 0 ? `${c.people} in \u00b7 ${c.checkins} sparks` : 'open to you'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {(feed?.events || []).length > 0 && (
                  <div className="bcn-now">
                    <div className="bcn-orgs-k">Now &middot; as it happens</div>
                    {(feed.events || []).slice(0, 4).map((e, i) => (
                      <div className="bcn-ev" key={i}>
                        <span className={`bcn-ev-who${e.kind === 'spark' ? ' hot' : ''}`}>{e.name}</span>
                        <span className="bcn-ev-what">
                          {e.kind === 'spark' ? `checked in on ${e.title}`
                            : e.kind === 'join' ? `took on ${e.title}`
                            : `published ${e.title}`}
                        </span>
                        <span className="bcn-ev-when">{ago(e.at)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {feed && (feed.field?.orgs || []).length > 0 && (
                  <div className="bcn-orgs">
                    <div className="bcn-orgs-k">Participating organisations</div>
                    <div className="bcn-orgs-row">
                      {(feed.field.orgs || []).slice(0, 6).map((o, i) => (
                        <span className="bcn-org" key={i}>{o.name}</span>
                      ))}
                    </div>
                  </div>
                )}
                {feed?.beacon?.closes_on && (
                  <div className="bcn-arc">
                    <span>{feed.beacon.opens_on ? `Lit ${fmtShort(feed.beacon.opens_on)}` : 'Lit'}</span>
                    <span>Closes {fmtShort(feed.beacon.closes_on)}</span>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="bcn-today-h">Your runs &middot; today</div>
                {openCount === 0 && <p className="bcn-alldone">All done for today. Well done!</p>}
                {mine.map((run) => {
                  const chain = computeChain({ doneDates: run.done_dates || [], cadence: run.cadence })
                  const kept = runKeptToday(run)
                  const swept = runSweptToday(run)
                  const strands = run.strands || []
                  const isOpen = expanded === run.participant_id
                  const chainShown = chain.kept
                  let voice
                  if (run.cadence === 'once') {
                    voice = kept ? VOICE.completeOnce() : VOICE.onceOpen()
                  } else if (run.cadence === 'weekly' || run.cadence === 'monthly') {
                    voice = kept
                      ? (run.cadence === 'weekly' ? VOICE.weekComplete(chainShown) : VOICE.monthComplete(chainShown))
                      : (run.cadence === 'weekly' ? VOICE.weekOpen() : VOICE.monthOpen())
                  } else if (swept && strands.length > 1) {
                    voice = VOICE.swept()
                  } else if (kept && strands.length > 1) {
                    voice = VOICE.firstOfMany(strands.length - (run.done_today || []).length)
                  } else if (kept) {
                    voice = VOICE.MILESTONES.includes(chainShown)
                      ? VOICE.milestone(chainShown, 'days')
                      : VOICE.complete(chainShown)
                  } else if (chain.graceUsedYesterday) {
                    voice = VOICE.graceHeld()
                  } else if (chain.kept === 0 && (run.done_dates || []).length > 0) {
                    voice = VOICE.returned()
                  } else {
                    voice = VOICE[stage](chain.kept)
                  }
                  const chipLabel = kept
                    ? 'Kept today'
                    : (run.cadence === 'weekly' ? 'Week open' : run.cadence === 'monthly' ? 'Month open' : 'Today open')
                  const chainLabel = chain.unit === 'summit'
                    ? 'one summit'
                    : `${chainShown} ${chain.unit === 'days' ? (chainShown === 1 ? 'day' : 'days') : chain.unit}`
                  return (
                    <div className={`bcn-card${kept ? '' : ` stage-${stage}`}`} key={run.participant_id}>
                      <div className="bcn-card-bar" role="button" tabIndex={0}
                        onClick={() => setExpanded(isOpen ? null : run.participant_id)}
                        onKeyDown={(e) => { if (e.key === 'Enter') setExpanded(isOpen ? null : run.participant_id) }}>
                        <span className="bcn-card-t">{run.title}</span>
                        <span className="bcn-card-chain">{chainLabel}</span>
                        <span className={`bcn-chip${kept ? ' k' : ''}`}>{chipLabel}</span>
                      </div>
                      {isOpen && (
                        <div className="bcn-card-in">
                          <div className="bcn-voice">{voice}</div>
                          {strands.map((strand) => {
                            const done = (run.done_today || []).includes(strand.id)
                            return (
                              <div className={`bcn-move${done ? ' done' : ''}`} key={strand.id}>
                                <span className="bcn-move-t">{strand.text || strand.label || run.title}</span>
                                {done
                                  ? <button className="keep-btn done" disabled>Complete for today</button>
                                  : <button className="keep-btn" onClick={(e) => checkStrand(run, strand, e.currentTarget)}>
                                      {run.cadence === 'once' ? 'I did this' : 'I did this today'}
                                    </button>}
                              </div>
                            )
                          })}
                          {chain.unit === 'days' && (
                            <div className="bcn-dots">
                              {dotRow({ doneDates: run.done_dates || [], chain }).map((d, i) => (
                                <i key={i} className={d} />
                              ))}
                            </div>
                          )}
                          {chain.graceBanked > 0 && !kept && (
                            <div className="bcn-grace">{chain.graceBanked} grace {chain.graceBanked === 1 ? 'day' : 'days'} banked &middot; life happens, your chain holds</div>
                          )}
                          {kept && (
                            <div className="bcn-doors">
                              <button onClick={() => copyInvite(run)}>
                                {copied === run.participant_id ? 'Link copied' : `${VOICE.doorInvite()} \u2192`}
                              </button>
                              <button onClick={() => navigate('/challenges/browse?domain=nature')}>{VOICE.doorAnother()} &rarr;</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                <div className="bcn-foot">
                  <button className="bcn-record" onClick={() => navigate('/earth/journey')}>your journey &rarr;</button>
                  <button className="bcn-record" onClick={() => navigate('/earth')}>Earth Challenge live &rarr;</button>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="bcn-grip in-panel" onPointerDown={onGripDown} onPointerMove={onGripMove} onPointerUp={onGripUp} onPointerCancel={onGripUp}>
          <svg className="bcn-chev" viewBox="0 0 24 24" fill="none" stroke={A.bright} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
        </div>
      </div>

      {!open && (
        <div className="bcn-grip" onPointerDown={onGripDown} onPointerMove={onGripMove} onPointerUp={onGripUp} onPointerCancel={onGripUp}>
          <svg className="bcn-chev" viewBox="0 0 24 24" fill="none" stroke={A.bright} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
        </div>
      )}

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
.bcn-mini{position:relative;width:34px;height:38px;flex:none;display:flex;align-items:center;justify-content:center;transform-origin:left center;transition:opacity .4s,transform .4s cubic-bezier(.3,.7,.2,1)}
.bcn-wrap.open .bcn-mini{opacity:0;transform:scale(1.8) translateX(6px);pointer-events:none}
.bcn-mini-img{width:34px;height:34px;object-fit:contain;position:relative;z-index:2}
.bcn-mini-core{position:absolute;left:50%;top:42%;width:16px;height:16px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#fff 0%,${A.glow} 34%,rgba(242,196,90,.5) 62%,rgba(242,196,90,0) 78%);box-shadow:0 0 12px rgba(255,221,128,.8);animation:bcnbeat 2.6s ease-in-out infinite;z-index:1}
@keyframes bcnbeat{0%,100%{opacity:.7}50%{opacity:1}}
.bcn-title{font-family:'IBM Plex Mono',Georgia,serif;letter-spacing:.2em;text-transform:uppercase;font-size:14px}
.bcn-msg{font-family:'Fraunces',Georgia,serif;font-size:18px;color:${A.glow};min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bcn-spacer{flex:1}
.bcn-count{font-family:'Fraunces',Georgia,serif;font-size:22px;color:#fff;font-variant-numeric:tabular-nums;flex:none}
.bcn-count small{font-family:'IBM Plex Mono',Georgia,serif;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:rgba(250,241,222,.6);margin-left:6px}
@media(max-width:560px){.bcn-bar{gap:10px;padding:0 14px}.bcn-title{display:none}.bcn-msg{font-size:16px}.bcn-count{font-size:19px}}

.bcn-panel{position:absolute;top:100%;left:0;right:0;z-index:2;max-height:0;overflow:hidden;background:radial-gradient(140% 200% at 20% 0%,#1d1626,${A.night} 76%);border-bottom:1px solid ${A.amber}}
.bcn-panel-in{padding:10px 22px 24px;display:grid;grid-template-columns:auto 1fr;gap:28px;align-items:start}
@media(max-width:560px){.bcn-panel-in{grid-template-columns:1fr;gap:16px}}
.bcn-fire{position:relative;width:180px;max-width:44vw;transform-origin:top left;opacity:0;transform:scale(.55) translateY(-6px);transition:opacity .45s ease .08s,transform .5s cubic-bezier(.3,.7,.2,1) .08s}
.bcn-wrap.open .bcn-fire{opacity:1;transform:none}
.bcn-lread{text-align:center;margin-top:6px}
.bcn-c{font-family:'Fraunces',Georgia,serif;font-size:32px;color:#fff;line-height:1;font-variant-numeric:tabular-nums}
.bcn-k{font-family:'IBM Plex Mono',Georgia,serif;letter-spacing:.14em;text-transform:uppercase;font-size:13px;color:rgba(250,241,222,.66);margin-top:3px}
.bcn-what{display:block;margin:12px auto 0;font-family:'IBM Plex Mono',Georgia,serif;letter-spacing:.1em;text-transform:uppercase;font-size:13px;color:rgba(242,196,90,.85);background:none;border:none;border-bottom:1px solid rgba(242,196,90,.45);cursor:pointer;padding:0 0 1px}

.bcn-today-h{font-family:'IBM Plex Mono',Georgia,serif;letter-spacing:.18em;text-transform:uppercase;font-size:13px;color:${A.bright};margin:2px 0 10px}
.bcn-card{background:rgba(250,241,222,.04);border:1px solid rgba(242,196,90,.25);border-radius:14px;margin-bottom:10px;overflow:hidden}
.bcn-card-bar{display:flex;align-items:center;gap:12px;padding:12px 15px;cursor:pointer;flex-wrap:wrap}
.bcn-card-t{font-family:'Fraunces',Georgia,serif;font-size:19px;color:#FAF1DE;flex:1;line-height:1.2;min-width:0}
.bcn-card-chain{font-family:'IBM Plex Mono',Georgia,serif;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#D7A24A;white-space:nowrap}
.bcn-chip{font-family:'IBM Plex Mono',Georgia,serif;font-size:13px;letter-spacing:.08em;text-transform:uppercase;border-radius:14px;padding:4px 10px;white-space:nowrap;color:${A.bright};border:1px solid rgba(242,196,90,.5)}
.bcn-chip.k{color:#7FC7A4;border-color:rgba(74,140,111,.6)}
.bcn-card-in{padding:2px 15px 14px}
.bcn-voice{font-family:'Fraunces',Georgia,serif;font-size:18px;color:#FAF1DE;padding-bottom:10px}
.bcn-move{display:flex;justify-content:space-between;align-items:center;gap:12px;border:1px solid rgba(242,196,90,.25);border-radius:12px;padding:11px 13px;margin-bottom:8px}
.bcn-move.done{border-color:rgba(74,140,111,.5)}
.bcn-move-t{font-family:'Newsreader',Georgia,serif;font-size:14px;color:rgba(250,241,222,.88);line-height:1.4;min-width:0}
.keep-btn{position:relative;font-family:'IBM Plex Mono',Georgia,serif;font-size:13.5px;letter-spacing:.12em;text-transform:uppercase;color:#241703;border:none;border-radius:26px;padding:13px 20px;cursor:pointer;white-space:nowrap;background:linear-gradient(180deg,${A.glow},${A.bright});box-shadow:0 2px 0 rgba(122,74,18,.8);transition:all .3s}
.stage-afternoon .keep-btn{background:linear-gradient(180deg,#FFF0BE,#FFD86B);box-shadow:0 2px 0 rgba(122,74,18,.8),0 0 18px rgba(242,196,90,.35)}
.stage-evening .keep-btn{background:linear-gradient(180deg,#FFF4CC,#FFD86B);box-shadow:0 2px 0 rgba(122,74,18,.8),0 0 26px rgba(255,216,107,.55);animation:bcncheer 2.2s ease-in-out infinite}
.stage-lastlight .keep-btn{background:linear-gradient(180deg,#FFF8DD,#FFDF7E);box-shadow:0 2px 0 rgba(122,74,18,.8),0 0 34px rgba(255,222,126,.75);animation:bcncheer 1.4s ease-in-out infinite}
.stage-lastlight .keep-btn:after{content:"";position:absolute;inset:-7px;border-radius:32px;border:1.5px solid rgba(255,222,126,.5);animation:bcnring 1.4s ease-out infinite}
@keyframes bcncheer{0%,100%{transform:scale(1)}50%{transform:scale(1.045)}}
@keyframes bcnring{0%{opacity:.7;transform:scale(.95)}100%{opacity:0;transform:scale(1.12)}}
.keep-btn.done{background:transparent;color:#7FC7A4;border:1px solid rgba(74,140,111,.5);box-shadow:none;animation:none;cursor:default}
.keep-btn.done:after{display:none}
.bcn-dots{display:flex;gap:5px;padding-top:4px}
.bcn-dots i{width:11px;height:11px;border-radius:50%;background:rgba(250,241,222,.12);box-sizing:border-box}
.bcn-dots i.on{background:${A.amber}}
.bcn-dots i.grace{background:transparent;border:2px solid ${A.amber}}
.bcn-dots i.today{background:rgba(242,196,90,.25);border:1.5px dashed ${A.amber}}
.bcn-grace{font-family:'Newsreader',Georgia,serif;font-size:13px;color:rgba(250,241,222,.6);padding-top:8px}
.bcn-doors{display:flex;gap:16px;flex-wrap:wrap;padding-top:10px}
.bcn-doors button{font-family:'IBM Plex Mono',Georgia,serif;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#D7A24A;background:none;border:none;border-bottom:1px solid rgba(242,196,90,.35);cursor:pointer;padding:0 0 2px}
.bcn-alldone{font-family:'Fraunces',Georgia,serif;font-size:19px;color:${A.glow};padding:6px 0}
.bcn-livein{padding-top:2px}
.bcn-livetoday{font-family:'Fraunces',Georgia,serif;font-size:18px;color:#FAF1DE;margin:0 0 8px}
.bcn-livetoday b{color:${A.bright};font-weight:500}
.bcn-ev{display:flex;gap:10px;align-items:baseline;padding:8px 0;border-bottom:1px solid rgba(242,196,90,.12);font-size:14.5px}
.bcn-ev-who{font-family:'Fraunces',Georgia,serif;font-size:17px;color:#FAF1DE;white-space:nowrap}
.bcn-ev-who.hot{color:${A.bright}}
.bcn-ev-what{font-family:'Newsreader',Georgia,serif;color:rgba(250,241,222,.82);min-width:0}
.bcn-ev-when{margin-left:auto;font-family:'IBM Plex Mono',Georgia,serif;font-size:13px;letter-spacing:.06em;color:rgba(250,241,222,.55);white-space:nowrap}
.bcn-orgs{padding-top:12px}
.bcn-orgs-k{font-family:'IBM Plex Mono',Georgia,serif;font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:rgba(250,241,222,.55);margin-bottom:8px}
.bcn-orgs-row{display:flex;gap:8px;flex-wrap:wrap}
.bcn-org{font-family:'Newsreader',Georgia,serif;font-size:13px;color:rgba(250,241,222,.85);border:1px solid rgba(242,196,90,.3);border-radius:18px;padding:5px 12px}
.bcn-live-cta{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding-top:14px;padding-bottom:4px}
.bcn-chals{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding-top:12px}
@media(max-width:560px){.bcn-chals{grid-template-columns:1fr}}
.bcn-chal{text-align:left;background:rgba(250,241,222,.04);border:1px solid rgba(242,196,90,.25);border-radius:12px;padding:11px 13px;cursor:pointer;display:flex;flex-direction:column;gap:2px}
.bcn-chal-t{font-family:'Fraunces',Georgia,serif;font-size:18px;color:#FAF1DE;line-height:1.15}
.bcn-chal-by{font-family:'Newsreader',Georgia,serif;font-size:13px;color:rgba(250,241,222,.6)}
.bcn-chal-n{font-family:'IBM Plex Mono',Georgia,serif;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#D7A24A;margin-top:3px}
.bcn-now{padding-top:12px}
.bcn-arc{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:14px;padding-top:10px;border-top:1px solid rgba(242,196,90,.18);font-family:'IBM Plex Mono',Georgia,serif;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:rgba(250,241,222,.55)}
.bcn-go{font-family:'IBM Plex Mono',Georgia,serif;letter-spacing:.14em;text-transform:uppercase;font-size:13px;color:#1a1320;background:${A.bright};border:none;border-radius:24px;padding:12px 22px;cursor:pointer}
.bcn-go.ghost{background:transparent;color:${A.bright};border:1px solid rgba(242,196,90,.55)}
.bcn-foot{display:flex;gap:18px;flex-wrap:wrap;margin-top:12px}
.bcn-record{font-family:'IBM Plex Mono',Georgia,serif;letter-spacing:.1em;text-transform:uppercase;font-size:13px;color:rgba(242,196,90,.85);background:none;border:none;border-bottom:1px solid rgba(242,196,90,.45);cursor:pointer;padding:0 0 1px}
.bcn-push{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;justify-content:space-between;background:rgba(242,196,90,.08);border:1px solid rgba(242,196,90,.3);border-radius:12px;padding:11px 14px;margin-bottom:14px}
.bcn-push-q{font-family:'Fraunces',Georgia,serif;font-size:18px;color:#FAF1DE}
.bcn-push-act{display:flex;gap:8px;flex:none}
.bcn-push-act button{font-family:'IBM Plex Mono',Georgia,serif;letter-spacing:.12em;text-transform:uppercase;font-size:13px;color:#1a1320;background:${A.bright};border:none;border-radius:22px;padding:9px 16px;cursor:pointer}
.bcn-push-act button.ghost{background:transparent;color:rgba(242,196,90,.85);border:1px solid rgba(242,196,90,.45)}

.bcn-grip{position:relative;z-index:4;height:30px;display:flex;align-items:center;justify-content:center;cursor:grab;touch-action:none}
.bcn-grip.in-panel{height:34px;border-top:1px solid rgba(242,196,90,.15)}
.bcn-grip:active{cursor:grabbing}
.bcn-chev{width:20px;height:20px;transition:transform .35s}
.bcn-wrap.open .bcn-chev{transform:rotate(180deg)}

.bcn-fly{position:fixed;width:10px;height:10px;border-radius:50%;background:${A.glow};box-shadow:0 0 12px ${A.glow},0 0 4px #fff;z-index:1000;pointer-events:none;transition:transform .7s cubic-bezier(.4,0,.2,1),opacity .7s}

.bcn-veil{position:fixed;inset:0;z-index:1100;background:rgba(10,7,14,.72);display:flex;align-items:center;justify-content:center;padding:24px}
.bcn-meaning{max-width:460px;width:100%;background:radial-gradient(130% 120% at 20% 0%,#231a2e,${A.night} 72%);border:1px solid ${A.amber};border-radius:18px;padding:30px;color:#FAF1DE;position:relative}
.bcn-x{position:absolute;top:12px;right:16px;cursor:pointer;color:rgba(250,241,222,.6);font-size:22px;line-height:1}
.bcn-eyebrow{font-family:'IBM Plex Mono',Georgia,serif;letter-spacing:.18em;text-transform:uppercase;font-size:13px;color:${A.bright}}
.bcn-meaning h3{font-family:'Fraunces',Georgia,serif;font-weight:500;font-size:30px;margin:6px 0 18px;line-height:1.1}
.bcn-beat{margin-bottom:16px}
.bcn-bt{font-family:'IBM Plex Mono',Georgia,serif;letter-spacing:.12em;text-transform:uppercase;font-size:13px;color:${A.bright};margin-bottom:3px}
.bcn-bd{font-family:'Newsreader',Georgia,serif;font-size:15.5px;line-height:1.5;color:rgba(250,241,222,.92)}
@media (prefers-reduced-motion:reduce){.bcn-ml-light,.bcn-mini,.bcn-chev{animation:none!important;transition:none!important}.stage-evening .keep-btn,.stage-lastlight .keep-btn{animation:none!important}.stage-lastlight .keep-btn:after{display:none}}
`
