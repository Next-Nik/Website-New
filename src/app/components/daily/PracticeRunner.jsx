// ─────────────────────────────────────────────────────────────
// PracticeRunner.jsx — the walk
//
// One room. Every beat the day's set holds plays inside it, in
// canonical order, with a single nav rail the runner owns: Back on
// every beat, and a Continue for the inline writing tools and any
// pass-through. Nothing launches you into a separate room and loses
// your place.
//
// How a beat renders, by status:
//   'ready' — a compact block component, inline. Owns its own commit.
//   'page'  — a full writing tool, rendered inline in embedded mode
//             (no nav, no chrome). The runner's Continue carries on.
//   'link'  — stays its own room; shown as a quiet, non-trapping
//             pass-through you can open or carry past.
//   'weld'  — not yet extracted; same quiet pass-through.
//
// The walk freezes the day's line on entry and remembers where you
// are (daily_practice_progress, migration 135). Leave the app and
// come back: you land on the exact beat. Nothing here is gated.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react'
import { tokens, serif, body, sc } from '../../../lib/designTokens'
import { supabase } from '../../../hooks/useSupabase'
import { resolve } from '../../constants/practiceBlocks'
import Readiness from './blocks/Readiness'
import FlameCheck from './blocks/FlameCheck'
import FoundationAudio from './blocks/FoundationAudio'
import BreathPacer from './BreathPacer'
import OpenBreath from './OpenBreath'
import ChargeBreath from './ChargeBreath'
import WinTheDay from './WinTheDay'
import Thresholds from './blocks/Thresholds'
import Act from './blocks/Act'
import IAmPractice from '../../pages/IAmPractice'
import IAmSpoken from '../../pages/IAmSpoken'
import SentenceCompletion from '../../pages/SentenceCompletion'
import MorningPages from '../../pages/MorningPages'

// Full writing tools that render inline, in embedded mode.
const PAGE_COMPONENTS = { IAmPractice, IAmSpoken, SentenceCompletion, MorningPages }

// Where a not-yet-extracted beat still lives, so we can offer its home
// without trapping the walk.
const WELD_HOME = {
  journal:     { label: 'your journal',  route: '/journal' },
  audio:       { label: 'Horizon State', route: '/tools/horizon-state' },
  embark:      { label: 'Horizon State', route: '/tools/horizon-state' },
}

const todayUTC = () => new Date().toISOString().slice(0, 10)

function StepShell({ label, children }) {
  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center' }}>
      <h2 style={{
        ...serif, fontWeight: 300, fontSize: 'clamp(26px,4vw,34px)',
        color: tokens.dark, lineHeight: 1.25, margin: '0 0 22px',
      }}>{label}</h2>
      {children}
    </div>
  )
}

function StepButton({ children, onClick, solid = false }) {
  return (
    <button onClick={onClick} style={{
      ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
      color: solid ? '#FFFFFF' : tokens.gold,
      background: solid ? tokens.goldChrome : 'transparent',
      border: solid ? 'none' : `1px solid ${tokens.goldFaint}`,
      borderRadius: '40px', padding: '12px 26px', cursor: 'pointer', margin: '0 6px',
    }}>{children}</button>
  )
}

export default function PracticeRunner({
  blocks = [], title = 'Practice', data = {}, entrance = 'morning',
  userId = null, onExit = () => {}, onNavigate = () => {},
}) {
  const uid = userId || data.userId || null

  // The frozen line + position for this session. Resolved once, from a
  // saved session if today's exists, otherwise from the set we were given.
  const [loaded, setLoaded] = useState(false)
  const [frozen, setFrozen] = useState(blocks)
  const [i, setI] = useState(0)

  // Beat-local memory carried across the walk.
  const [showCovenant, setShowCovenant] = useState(false)
  const [flameArrive, setFlameArrive] = useState(null)
  const [sessionThresholds, setSessionThresholds] = useState([])

  const scrollRef = useRef(null)

  // Imperative handle on the embedded writing tool for the current beat.
  // The runner's Continue calls flush() before moving, so the obvious
  // forward button always saves — no lost pages.
  const pageRef = useRef(null)

  // Visual-viewport height, so the room shrinks to the space the soft
  // keyboard leaves and the nav rail stays above it (iOS doesn't resize
  // a fixed 100dvh container for the keyboard on its own).
  const [vh, setVh] = useState(null)
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!vv) return
    const sync = () => setVh(vv.height)
    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => { vv.removeEventListener('resize', sync); vv.removeEventListener('scroll', sync) }
  }, [])

  // ── Load / resume ──────────────────────────────────────────
  useEffect(() => {
    let alive = true
    async function load() {
      if (!uid) { setFrozen(blocks); setI(0); setLoaded(true); return }
      const { data: row } = await supabase
        .from('daily_practice_progress')
        .select('block_ids, step_index, practice_date, completed')
        .eq('user_id', uid).eq('entrance', entrance).maybeSingle()

      const today = todayUTC()
      const fresh = () => {
        const line = blocks
        setFrozen(line)
        setI(0)
        supabase.from('daily_practice_progress').upsert({
          user_id: uid, entrance, practice_date: today,
          block_ids: line.map(b => b.id), step_index: 0, completed: false,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,entrance' }).then(() => {})
      }

      if (!alive) return
      if (row && row.practice_date === today && !row.completed && Array.isArray(row.block_ids) && row.block_ids.length) {
        const line = resolve(row.block_ids)
        setFrozen(line.length ? line : blocks)
        setI(Math.min(Math.max(row.step_index || 0, 0), (line.length || blocks.length) - 1))
      } else {
        fresh()
      }
      setLoaded(true)
    }
    load()
    return () => { alive = false }
  }, [uid, entrance]) // eslint-disable-line react-hooks/exhaustive-deps

  // Top of the beat whenever the step changes.
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0 }, [i])

  function persist(stepIndex, opts = {}) {
    if (!uid) return
    supabase.from('daily_practice_progress').upsert({
      user_id: uid, entrance, practice_date: todayUTC(),
      block_ids: frozen.map(b => b.id), step_index: stepIndex,
      completed: !!opts.completed, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,entrance' }).then(() => {})
  }

  if (!loaded) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ ...body, color: tokens.ghost, fontSize: '15px' }}>Finding your place…</p>
      </div>
    )
  }

  if (frozen.length === 0) {
    return (
      <div style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center', padding: '60px 0' }}>
        <p style={{ ...body, color: tokens.ghost, fontSize: '16px' }}>This path is empty. Add a block to begin.</p>
        <div style={{ marginTop: '20px' }}><StepButton onClick={onExit}>Close</StepButton></div>
      </div>
    )
  }

  const block = frozen[i]
  const isLast = i >= frozen.length - 1

  // Save the current writing beat before leaving it, so Continue / Back /
  // a dot tap / Save-and-close never drop the page you were on.
  async function flushPage() {
    if (block?.status === 'page' && pageRef.current?.flush) {
      try { await pageRef.current.flush() } catch { /* keep moving */ }
    }
  }

  const next = async () => {
    await flushPage()
    if (isLast) { persist(i, { completed: true }); onExit(); return }
    const n = i + 1
    setI(n); persist(n)
  }
  const back = async () => {
    if (i <= 0) return
    await flushPage()
    const n = i - 1
    setI(n); persist(n)
  }
  const jumpTo = async (n) => {
    if (n === i) return
    await flushPage()
    setI(n); persist(n)
  }
  const exitNow = async () => { await flushPage(); persist(i); onExit() }
  const openRoom = async (route) => { await flushPage(); persist(i); onNavigate(route) }

  const isPage = block.status === 'page'
  const isPassThrough = block.status === 'link' || block.status === 'weld' || block.status === 'new'

  function renderBlock() {
    if (block.status === 'ready') {
      if (block.component === 'Readiness') {
        return (
          <Readiness
            horizonSelfStatement={data.horizonSelfStatement}
            protectorCovenant={data.protectorCovenant}
            showCovenant={showCovenant}
            onToggleCovenant={() => setShowCovenant(s => !s)}
            onComplete={next}
            onSkip={next}
          />
        )
      }
      if (block.component === 'FoundationAudio') {
        return <FoundationAudio phase={block.phase} title={block.label} onComplete={next} onSkip={next} />
      }
      if (block.component === 'OpenBreath') {
        return <OpenBreath title={block.label} onComplete={next} />
      }
      if (block.component === 'FlameCheck') {
        const stage = block.id === 'embark' ? 'embark' : 'arrive'
        return (
          <FlameCheck
            stage={stage}
            ghostValue={stage === 'embark' ? flameArrive : null}
            onComplete={(v) => { if (block.id === 'flame_arrive') setFlameArrive(v); next() }}
            onSkip={next}
          />
        )
      }
      if (block.component === 'ChargeBreath') {
        return <ChargeBreath title={block.label} onComplete={next} />
      }
      if (block.component === 'WinTheDay') {
        return <WinTheDay sprintData={data.sprintData ?? null} onComplete={next} onClose={back} />
      }
      if (block.component === 'Thresholds') {
        return <Thresholds userId={uid} onComplete={(ths) => { setSessionThresholds(ths || []); next() }} onSkip={next} />
      }
      if (block.component === 'Act') {
        return <Act firstThreshold={sessionThresholds[0] || null} onComplete={next} onSkip={next} />
      }
      if (block.component === 'BreathPacer') {
        return (
          <StepShell label={block.label}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
              <BreathPacer caption="Breathe with me." />
            </div>
          </StepShell>
        )
      }
    }

    // Full writing tool, rendered inline.
    if (isPage) {
      const Cmp = PAGE_COMPONENTS[block.component]
      if (Cmp) {
        return (
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <p style={{ ...serif, fontWeight: 300, fontSize: 'clamp(22px,3.4vw,28px)', color: tokens.dark, textAlign: 'center', margin: '0 0 20px' }}>
              {block.label}
            </p>
            <Cmp ref={pageRef} embedded />
          </div>
        )
      }
    }

    // Pass-through — its own room, never a trap.
    const home = WELD_HOME[block.id] || (block.route ? { label: 'this', route: block.route } : null)
    return (
      <StepShell label={block.label}>
        <p style={{ ...body, color: tokens.ghost, fontSize: '15px', lineHeight: 1.6, margin: '0 0 26px' }}>
          {block.status === 'new'
            ? 'Opening soon. Carry on, or come back to it.'
            : 'This one opens in its own room. Open it now, or carry straight on — the walk keeps your place.'}
        </p>
        {home && home.route && (
          <StepButton onClick={() => openRoom(home.route)}>Open →</StepButton>
        )}
      </StepShell>
    )
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: vh ? `${vh}px` : '100dvh',
      zIndex: 1100, background: tokens.bg,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* header — progress + exit. Padded clear of the status bar so the
          title and dots never tuck under anything. */}
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'max(16px, env(safe-area-inset-top)) 20px 12px',
        maxWidth: '900px', margin: '0 auto', width: '100%', boxSizing: 'border-box',
      }}>
        <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.20em', textTransform: 'uppercase', color: tokens.gold }}>
          {title} · {i + 1} / {frozen.length}
        </span>
        <button onClick={exitNow} style={{
          ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
          background: 'transparent', border: 'none', color: tokens.gold, cursor: 'pointer', padding: '4px 0',
        }}>Save &amp; close ✕</button>
      </div>

      {/* progress rail — tap a dot to move to that beat */}
      <div style={{ flexShrink: 0, display: 'flex', gap: '6px', justifyContent: 'center', padding: '0 20px 12px', flexWrap: 'wrap' }}>
        {frozen.map((_, n) => (
          <button key={n} onClick={() => jumpTo(n)} aria-label={`Beat ${n + 1}`} style={{
            width: n === i ? '22px' : '7px', height: '7px', borderRadius: '4px', border: 'none', padding: 0,
            background: n < i ? tokens.goldChrome : n === i ? tokens.gold : tokens.goldFaint,
            transition: 'all 0.4s ease', cursor: 'pointer',
          }} />
        ))}
      </div>

      {/* the beat — scrolls; minHeight:0 lets it shrink so the rail below
          always stays in view, even with the keyboard up */}
      <div ref={scrollRef} style={{
        flex: 1, minHeight: 0, display: 'flex',
        alignItems: isPage ? 'flex-start' : 'center',
        justifyContent: 'center',
        overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        padding: isPage ? '14px 20px 24px' : '24px 20px 24px',
      }}>
        <div style={{ width: '100%' }}>{renderBlock()}</div>
      </div>

      {/* the one nav rail · Back and Forward on EVERY beat, so the walk is
          never a trap. Both read as real buttons now, and the rail rides
          above the keyboard. On writing tools and pass-throughs Forward is
          the solid primary (and it saves the page first). On compact beats
          the block owns its commit, so Forward is a clear "carry on". */}
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '12px', padding: '14px 20px calc(16px + env(safe-area-inset-bottom))',
        maxWidth: '720px', margin: '0 auto', width: '100%', boxSizing: 'border-box',
        borderTop: `1px solid ${tokens.goldFaint}`, background: tokens.bg,
      }}>
        {i > 0 ? (
          <button
            onClick={back}
            style={{
              ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
              background: 'transparent', border: `1px solid ${tokens.goldChrome}`, cursor: 'pointer',
              color: tokens.gold, borderRadius: '40px', padding: '10px 22px',
            }}
          >← Back</button>
        ) : <span />}

        {(isPage || isPassThrough) ? (
          <StepButton solid onClick={next}>{isLast ? 'Done' : 'Continue →'}</StepButton>
        ) : (
          <button
            onClick={next}
            style={{
              ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
              background: 'transparent', border: `1px solid ${tokens.goldChrome}`, cursor: 'pointer',
              color: tokens.gold, borderRadius: '40px', padding: '10px 22px',
            }}
          >{isLast ? 'Done →' : 'Carry on →'}</button>
        )}
      </div>
    </div>
  )
}
