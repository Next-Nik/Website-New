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
import SentenceCompletion from '../../pages/SentenceCompletion'
import MorningPages from '../../pages/MorningPages'

// Full writing tools that render inline, in embedded mode.
const PAGE_COMPONENTS = { IAmPractice, SentenceCompletion, MorningPages }

// Where a not-yet-extracted beat still lives, so we can offer its home
// without trapping the walk.
const WELD_HOME = {
  i_am_spoken: { label: 'Horizon State', route: '/tools/horizon-state' },
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

  const next = () => {
    if (isLast) { persist(i, { completed: true }); onExit(); return }
    const n = i + 1
    setI(n); persist(n)
  }
  const back = () => {
    if (i <= 0) return
    const n = i - 1
    setI(n); persist(n)
  }
  const exitNow = () => { persist(i); onExit() }
  const openRoom = (route) => { persist(i); onNavigate(route) }

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
            <Cmp embedded />
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
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* header — progress + exit */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 20px', maxWidth: '900px', margin: '0 auto', width: '100%', boxSizing: 'border-box',
      }}>
        <span style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.20em', textTransform: 'uppercase', color: tokens.gold }}>
          {title} · {i + 1} / {frozen.length}
        </span>
        <button onClick={exitNow} style={{
          ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
          background: 'transparent', border: 'none', color: tokens.ghost, cursor: 'pointer',
        }}>Save and close ✕</button>
      </div>

      {/* progress rail — tap a dot to move to that beat */}
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', padding: '0 20px 12px', flexWrap: 'wrap' }}>
        {frozen.map((_, n) => (
          <button key={n} onClick={() => { setI(n); persist(n) }} aria-label={`Beat ${n + 1}`} style={{
            width: n === i ? '22px' : '7px', height: '7px', borderRadius: '4px', border: 'none', padding: 0,
            background: n < i ? tokens.goldChrome : n === i ? tokens.gold : tokens.goldFaint,
            transition: 'all 0.4s ease', cursor: 'pointer',
          }} />
        ))}
      </div>

      {/* the beat */}
      <div ref={scrollRef} style={{
        flex: 1, display: 'flex',
        alignItems: isPage ? 'flex-start' : 'center',
        justifyContent: 'center',
        overflowY: 'auto',
        padding: isPage ? '14px 20px 24px' : '24px 20px 24px',
      }}>
        <div style={{ width: '100%' }}>{renderBlock()}</div>
      </div>

      {/* the one nav rail — Back on every beat, Continue where the beat
          has no commit of its own (the writing tools and pass-throughs) */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '12px', padding: '14px 20px calc(18px + env(safe-area-inset-bottom))',
        maxWidth: '720px', margin: '0 auto', width: '100%', boxSizing: 'border-box',
        borderTop: `1px solid ${tokens.goldFaint}`,
      }}>
        {i > 0 ? (
          <button
            onClick={back}
            style={{
              ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: tokens.ghost, padding: '8px 4px',
            }}
          >← Back</button>
        ) : <span />}

        {(isPage || isPassThrough) && (
          <StepButton solid onClick={next}>{isLast ? 'Done' : 'Continue →'}</StepButton>
        )}
      </div>
    </div>
  )
}
