// ─────────────────────────────────────────────────────────────
// NextUShell.jsx — the chapter shell
//
// A thin persistent strip, not a frame. Wraps the four chapter
// surfaces so the user is never "inside a tool" — they are inside
// NextU, at a point on the thread.
//
//   ← JOURNEY   NEXTU · CHAPTER TWO — I AM STATEMENTS   ● ● ○ ○
//
// Rules (per NextU_Integrated_Experience_Design_v1.md §4):
//   · Appears on the four chapter surfaces only. Daily, Get To Do,
//     Journal, Purpose Piece, Target Stretch never wear it.
//   · Exit goes to the journey surface, not Mission Control.
//   · The miniature thread shows position, always.
// ─────────────────────────────────────────────────────────────

import { useNavigate } from 'react-router-dom'
import { tokens, sc } from '../../lib/designTokens'
import { CHAPTERS } from './shared'

const ORDINALS = { 1: 'ONE', 2: 'TWO', 3: 'THREE', 4: 'FOUR' }

export default function NextUShell({ chapter, chapterTitle, children }) {
  const navigate = useNavigate()
  const title = chapterTitle ||
    (CHAPTERS.find(c => c.n === chapter)?.title || '').toUpperCase()

  return (
    <div style={{ minHeight: '100dvh', background: tokens.bg }}>
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 40,
          background: tokens.bg,
          borderBottom: `1px solid ${tokens.goldFaint}`,
        }}
      >
        <div
          style={{
            maxWidth: '980px', margin: '0 auto',
            padding: '13px 22px',
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: '12px',
          }}
        >
          <button
            onClick={() => navigate('/nextu')}
            style={{
              ...sc, fontSize: '13px', fontWeight: 600,
              letterSpacing: '0.14em', color: tokens.gold,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, whiteSpace: 'nowrap',
            }}
          >
            ← JOURNEY
          </button>

          <div
            style={{
              ...sc, fontSize: '13px', letterSpacing: '0.16em',
              color: 'rgba(15,21,35,0.72)', textAlign: 'center',
              flex: 1, minWidth: 0, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            NEXTU · CHAPTER {ORDINALS[chapter]} — {title}
          </div>

          {/* The thread at miniature — four dots, position marked */}
          <div
            aria-label={`Chapter ${chapter} of 4`}
            style={{ display: 'flex', gap: '7px', alignItems: 'center', flexShrink: 0 }}
          >
            {CHAPTERS.map(c => (
              <span
                key={c.n}
                style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  border: `1px solid ${tokens.goldChrome}`,
                  background: c.n < chapter
                    ? tokens.goldChrome
                    : c.n === chapter ? tokens.goldChrome : tokens.bg,
                  boxShadow: c.n === chapter
                    ? `0 0 0 2.5px ${tokens.goldFaint}` : 'none',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {children}
    </div>
  )
}
