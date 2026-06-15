// ─────────────────────────────────────────────────────────────
// PracticeRunner.jsx — the walk
//
// Takes a resolved list of blocks (already sorted into canonical
// order by the registry) and walks them one at a time: bread, then
// fillings, then bread. Each block decides how it renders by its
// status:
//   'ready' — render the block component inline, it drives its own
//             completion and hands back to the runner
//   'link'  — a full page; offer to open it, then continue
//   'weld'  — still inside Horizon State / Practice; shown as a quiet
//             step you can pass through until it's extracted
//   'new'   — designed, not built yet (the midday pieces)
//
// Nothing here is gated. Every step can be skipped. The runner only
// sequences; the blocks own their own behaviour.
// ─────────────────────────────────────────────────────────────
import { useState } from 'react'
import { tokens, serif, body, sc } from '../../../lib/designTokens'
import Readiness from './blocks/Readiness'
import FlameCheck from './blocks/FlameCheck'
import FoundationAudio from './blocks/FoundationAudio'
import BreathPacer from './BreathPacer'
import OpenBreath from './OpenBreath'
import ChargeBreath from './ChargeBreath'
import WinTheDay from './WinTheDay'
import Thresholds from './blocks/Thresholds'
import Act from './blocks/Act'

// Where a not-yet-extracted beat still lives, so we can offer its home.
const WELD_HOME = {
  flame_arrive: { label: 'Horizon State', route: '/tools/horizon-state' },
  audio:        { label: 'Horizon State', route: '/tools/horizon-state' },
  embark:       { label: 'Horizon State', route: '/tools/horizon-state' },
  win_the_day:  { label: 'Horizon Practice', route: '/tools/horizon-practice' },
  thresholds:   { label: 'Horizon Practice', route: '/tools/horizon-practice' },
  act:          { label: 'Horizon Practice', route: '/tools/horizon-practice' },
}

function StepShell({ region, label, children }) {
  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center' }}>
      <p style={{
        ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.22em',
        textTransform: 'uppercase', color: tokens.gold, margin: '0 0 8px',
      }}>{region}</p>
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

export default function PracticeRunner({ blocks = [], title = 'Practice', data = {}, onExit = () => {}, onNavigate = () => {} }) {
  const [i, setI] = useState(0)
  const [showCovenant, setShowCovenant] = useState(false)
  const [flameArrive, setFlameArrive] = useState(null)   // arrival read, shown as ghost at embark
  const [sessionThresholds, setSessionThresholds] = useState([])   // named thresholds, surfaced at Act

  if (blocks.length === 0) {
    return (
      <div style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center', padding: '60px 0' }}>
        <p style={{ ...body, color: tokens.ghost, fontSize: '16px' }}>This path is empty. Add a block to begin.</p>
        <div style={{ marginTop: '20px' }}><StepButton onClick={onExit}>Close</StepButton></div>
      </div>
    )
  }

  const block = blocks[i]
  const isLast = i >= blocks.length - 1
  const next = () => { if (isLast) onExit(); else setI(n => n + 1) }
  const back = () => { if (i > 0) setI(n => n - 1) }

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
        return <OpenBreath title={block.label} onComplete={next} onBack={i > 0 ? back : undefined} />
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
        return <ChargeBreath title={block.label} onComplete={next} onBack={i > 0 ? back : undefined} />
      }
      if (block.component === 'WinTheDay') {
        return <WinTheDay sprintData={data.sprintData ?? null} onComplete={next} onClose={next} />
      }
      if (block.component === 'Thresholds') {
        return <Thresholds userId={data.userId} onComplete={(ths) => { setSessionThresholds(ths || []); next() }} onSkip={next} />
      }
      if (block.component === 'Act') {
        return <Act firstThreshold={sessionThresholds[0] || null} onComplete={next} onSkip={next} />
      }
      if (block.component === 'BreathPacer') {
        return (
          <StepShell region={block.region} label={block.label}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
              <BreathPacer caption="Breathe with me." />
            </div>
            <StepButton solid onClick={next}>{isLast ? 'Done' : 'Continue →'}</StepButton>
          </StepShell>
        )
      }
    }

    if (block.status === 'link') {
      return (
        <StepShell region={block.region} label={block.label}>
          <p style={{ ...body, color: tokens.ghost, fontSize: '15px', lineHeight: 1.6, margin: '0 0 26px' }}>
            Opens as its own room. Come back here when you’re done, or carry straight on.
          </p>
          <div>
            <StepButton solid onClick={() => onNavigate(block.route)}>Open →</StepButton>
            <StepButton onClick={next}>{isLast ? 'Done' : 'Skip →'}</StepButton>
          </div>
        </StepShell>
      )
    }

    // weld / new
    const home = WELD_HOME[block.id]
    return (
      <StepShell region={block.region} label={block.label}>
        <p style={{ ...body, color: tokens.ghost, fontSize: '15px', lineHeight: 1.6, margin: '0 0 26px' }}>
          {block.status === 'new'
            ? 'A new piece, on the way soon.'
            : home ? `Runs inside ${home.label} for now.` : 'Not a standalone module yet.'}
        </p>
        <div>
          {home && <StepButton solid onClick={() => onNavigate(home.route)}>Open {home.label} →</StepButton>}
          <StepButton onClick={next}>{isLast ? 'Done' : 'Skip →'}</StepButton>
        </div>
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
          {title} · {i + 1} / {blocks.length}
        </span>
        <button onClick={onExit} style={{
          ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
          background: 'transparent', border: 'none', color: tokens.ghost, cursor: 'pointer',
        }}>Save and close ✕</button>
      </div>

      {/* progress rail */}
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', padding: '0 20px 12px' }}>
        {blocks.map((_, n) => (
          <div key={n} style={{
            width: n === i ? '22px' : '7px', height: '7px', borderRadius: '4px',
            background: n < i ? tokens.goldChrome : n === i ? tokens.gold : tokens.goldFaint,
            transition: 'all 0.4s ease',
          }} />
        ))}
      </div>

      {/* the block */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px 60px' }}>
        <div style={{ width: '100%' }}>{renderBlock()}</div>
      </div>
    </div>
  )
}
