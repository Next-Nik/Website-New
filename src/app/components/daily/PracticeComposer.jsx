// ─────────────────────────────────────────────────────────────
// PracticeComposer.jsx — reshape a flow, once
//
// Shows the whole pile in canonical order, grouped by region. Each
// block is either in (minus to remove) or out (plus to add). You
// choose which blocks are in; you never choose where they sit — the
// registry's order holds. Save writes your standing shape; it sticks.
//
// Two rules: the shape can't be emptied (a practice of nothing isn't
// a practice), and a not-yet-built block ('new') shows as soon, not
// addable.
//
// Contract: { entrance, value (block_ids[]), onSave(block_ids[]), onClose }
// ─────────────────────────────────────────────────────────────
import { useState } from 'react'
import { tokens, serif, body, sc } from '../../../lib/designTokens'
import { REGIONS, allBlocksInOrder } from '../../constants/practiceBlocks'

const REGION_ORDER = ['intro', 'meat', 'outro']

export default function PracticeComposer({ entrance = '', value = [], onSave = () => {}, onClose = () => {} }) {
  const [ids, setIds] = useState(() => new Set(value))

  const all = allBlocksInOrder()
  const inCount = all.filter(b => ids.has(b.id)).length

  function toggle(block) {
    if (block.status === 'new') return
    setIds(prev => {
      const nextSet = new Set(prev)
      if (nextSet.has(block.id)) {
        if (nextSet.size <= 1) return prev   // floor: never empty
        nextSet.delete(block.id)
      } else {
        nextSet.add(block.id)
      }
      return nextSet
    })
  }

  function save() {
    // Persist in canonical order — the registry owns sequence.
    const ordered = all.filter(b => ids.has(b.id)).map(b => b.id)
    onSave(ordered)
  }

  const title = entrance ? entrance.charAt(0).toUpperCase() + entrance.slice(1) : 'Flow'

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 20px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px' }}>
        <p style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: tokens.gold, margin: 0 }}>
          Shape · {title}
        </p>
        <button onClick={onClose} style={{
          ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
          background: 'transparent', border: 'none', color: tokens.ghost, cursor: 'pointer',
        }}>Close ✕</button>
      </div>

      <h1 style={{ ...serif, fontWeight: 300, fontSize: 'clamp(26px,4vw,36px)', color: tokens.dark, margin: '0 0 6px', lineHeight: 1.15 }}>
        Reshape your flow.
      </h1>
      <p style={{ ...body, fontSize: '15px', color: tokens.ghost, lineHeight: 1.6, margin: '0 0 28px', maxWidth: '480px' }}>
        Add or drop blocks. They always run in the same order — you’re choosing what’s in, not where it sits. Saved as your standing {title.toLowerCase()}.
      </p>

      {REGION_ORDER.map(region => {
        const blocks = all.filter(b => b.region === region)
        if (blocks.length === 0) return null
        return (
          <div key={region} style={{ marginBottom: '26px' }}>
            <p style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.20em', textTransform: 'uppercase', color: tokens.gold, margin: '0 0 10px' }}>
              {REGIONS[region]}
            </p>
            <div style={{ display: 'grid', gap: '8px' }}>
              {blocks.map(b => {
                const isIn = ids.has(b.id)
                const isNew = b.status === 'new'
                const canToggle = !isNew && !(isIn && inCount <= 1)
                return (
                  <div key={b.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 18px', borderRadius: '10px',
                    background: isIn ? tokens.goldTint : '#FFFFFF',
                    border: `1px solid ${isIn ? tokens.goldFaint : 'rgba(15,21,35,0.08)'}`,
                    opacity: isNew ? 0.55 : 1,
                  }}>
                    <span style={{ ...body, fontSize: '15px', color: tokens.dark }}>
                      {b.label}{isNew && <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: tokens.gold, marginLeft: '10px', textTransform: 'uppercase' }}>soon</span>}
                    </span>
                    <button
                      onClick={() => canToggle && toggle(b)}
                      disabled={!canToggle}
                      aria-label={isIn ? `Remove ${b.label}` : `Add ${b.label}`}
                      style={{
                        ...sc, fontSize: '18px', fontWeight: 600, lineHeight: 1,
                        width: '34px', height: '34px', borderRadius: '50%',
                        background: isIn ? tokens.goldChrome : 'transparent',
                        color: isIn ? '#FFFFFF' : tokens.gold,
                        border: `1px solid ${isIn ? tokens.goldChrome : tokens.goldFaint}`,
                        cursor: canToggle ? 'pointer' : 'default',
                        opacity: canToggle ? 1 : 0.4,
                      }}
                    >{isIn ? '−' : '+'}</button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '28px' }}>
        <button onClick={onClose} style={{
          ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
          background: 'transparent', border: `1px solid ${tokens.goldFaint}`, color: tokens.gold,
          borderRadius: '40px', padding: '12px 24px', cursor: 'pointer',
        }}>Cancel</button>
        <button onClick={save} style={{
          ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
          color: '#FFFFFF', background: tokens.goldChrome, border: 'none',
          borderRadius: '40px', padding: '12px 28px', cursor: 'pointer',
        }}>Save shape</button>
      </div>
    </div>
  )
}
