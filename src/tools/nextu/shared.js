// ─────────────────────────────────────────────────────────────
// shared.js — NextU journey shared constants and helpers
//
// One source of truth for the journey's domain order, the locked
// Life's Mission questions, chapter routing, and the auto-save
// debounce + Saved whisper used across the chapter surfaces.
// ─────────────────────────────────────────────────────────────

import { useRef, useState, useCallback } from 'react'
import { tokens, sc } from '../../lib/designTokens'

// Canonical domain order — matches horizon_profile.domain keys.
export const DOMAIN_ORDER = [
  'path', 'spark', 'body', 'finances', 'connection', 'inner_game', 'signal',
]

export const DOMAIN_LABELS = {
  path: 'Path', spark: 'Spark', body: 'Body', finances: 'Finances',
  connection: 'Connection', inner_game: 'Inner Game', signal: 'Signal',
}

// Life's Mission questions (locked).
export const LIFES_MISSION_QUESTIONS = {
  path:       'Am I walking my path — or just walking?',
  spark:      "When did I last feel genuinely alive — and what's been costing me that?",
  body:       'Am I honouring this instrument — or running it into the ground?',
  finances:   'Do I have the agency to act on what matters?',
  connection: 'Am I truly known by anyone — and am I truly knowing them?',
  inner_game: 'What story about myself is quietly running the room — and is that story still true?',
  signal:     "Is what I'm broadcasting aligned with who I actually am?",
}

// Journey chapter registry — the thread's stations.
export const CHAPTERS = [
  { n: 1, key: 'map',        title: 'The Map',               route: '/nextu/map' },
  { n: 2, key: 'iam',        title: 'I Am Statements',       route: '/nextu/i-am' },
  { n: 3, key: 'horizon',    title: 'Horizon Self',          route: '/nextu/horizon-self' },
  { n: 4, key: 'biography',  title: 'The Horizon Biography', route: '/nextu/biography' },
]

// ─── Auto-save: debounce + visible whisper ───────────────────
//
// useAutoSave(saveFn) returns { queue, whisper } where queue(payload)
// debounces saveFn and whisper is 'idle' | 'saving' | 'saved'.
// The chapter surfaces render <SavedWhisper state={whisper} /> next
// to inputs. Every keystroke is safe; the user sees that it is.

export function useAutoSave(saveFn, delay = 1200) {
  const timer = useRef(null)
  const latest = useRef(saveFn)
  latest.current = saveFn
  const [whisper, setWhisper] = useState('idle')

  const queue = useCallback((payload) => {
    if (timer.current) clearTimeout(timer.current)
    setWhisper('saving')
    timer.current = setTimeout(async () => {
      try {
        await latest.current(payload)
        setWhisper('saved')
      } catch {
        setWhisper('idle')
      }
    }, delay)
  }, [delay])

  // flush — save immediately (used on step transitions / step away)
  const flush = useCallback(async (payload) => {
    if (timer.current) clearTimeout(timer.current)
    try {
      await latest.current(payload)
      setWhisper('saved')
    } catch {
      setWhisper('idle')
    }
  }, [])

  return { queue, flush, whisper }
}

export function SavedWhisper({ state }) {
  return (
    <span
      aria-live="polite"
      style={{
        ...sc, fontSize: '13px', letterSpacing: '0.16em',
        color: tokens.ghost,
        opacity: state === 'saved' ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    >
      SAVED
    </span>
  )
}
