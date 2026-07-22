// src/app/components/RosterSection.jsx
//
// The 100-spoon roster builder. Sits below Watching on /profile/edit.
//
// Four tier rows (Deep / Sustained / Regular / Light). Each row shows its
// filled slots and empty Add cells. Budget header shows spent/free/wasted.
// Picker draws from the user's watched list (only watched entities can be
// rostered; the spec).
//
// Tier-cap and budget triggers enforce constraints at the DB layer; we
// surface their typed error codes as friendly UI messages.

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useRoster } from '../hooks/useRoster'
import { useWatch } from '../hooks/useWatch'
import { supabase } from '../../hooks/useSupabase'
import { InfoButton } from './InfoButton'

const sc      = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body    = { fontFamily: "'Lora', Georgia, serif" }
const display = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const gold    = '#262420'
const dark    = '#0F1523'

const TIER_LABEL = {
  deep:      'Deep',
  sustained: 'Sustained',
  regular:   'Regular',
  light:     'Light',
}

const TIER_DESCRIPTION = {
  deep:      'full stream',
  sustained: 'significant updates',
  regular:   'major events only',
  light:     'highlights',
}

export function RosterSection() {
  const roster = useRoster()
  const { watches, count: watchCount } = useWatch()

  // Resolve entity display info for all rostered items.
  const [resolved, setResolved] = useState({ focus: {}, actor: {}, person: {} })
  useEffect(() => {
    let cancelled = false
    async function resolve() {
      const slots = roster.slots
      const focusIds  = slots.filter(s => s.entity_type === 'focus').map(s => s.entity_id)
      const actorIds  = slots.filter(s => s.entity_type === 'actor').map(s => s.entity_id)
      const personIds = slots.filter(s => s.entity_type === 'person').map(s => s.entity_id)

      const [f, a, p] = await Promise.all([
        focusIds.length  > 0 ? supabase.from('nextus_focuses').select('id, name, slug, type').in('id', focusIds) : Promise.resolve({ data: [] }),
        actorIds.length  > 0 ? supabase.from('nextus_actors').select('id, name, slug, kind').in('id', actorIds) : Promise.resolve({ data: [] }),
        personIds.length > 0 ? supabase.from('contributor_profiles_beta').select('user_id, display_name').in('user_id', personIds) : Promise.resolve({ data: [] }),
      ])
      if (cancelled) return
      setResolved({
        focus:  Object.fromEntries((f.data || []).map(r => [r.id, r])),
        actor:  Object.fromEntries((a.data || []).map(r => [r.id, r])),
        person: Object.fromEntries((p.data || []).map(r => [r.user_id, r])),
      })
    }
    resolve()
    return () => { cancelled = true }
  }, [roster.slots])

  const [addingForTier, setAddingForTier] = useState(null)

  return (
    <div>
      {/* Intro + info */}
      <p style={{
        ...body,
        fontSize: '15px',
        color: 'rgba(15,21,35,0.72)',
        lineHeight: 1.7,
        marginTop: 0,
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        flexWrap: 'wrap',
      }}>
        <span>
          Your sphere of influence &mdash; 100 spoons to allocate across four
          tiers. This shapes your Curated feed.
        </span>
        <InfoButton title="The 100-spoon budget">
          <p style={{ margin: '0 0 10px' }}>
            Attention is real and limited. Instead of pretending you can
            attend to everything, the platform asks you to allocate a finite
            budget of 100 attention spoons across the entities that matter
            most to you.
          </p>
          <p style={{ margin: '0 0 10px' }}>
            Four tiers, each at a different cost:
          </p>
          <ul style={{ margin: '0 0 10px', paddingLeft: '20px' }}>
            <li><strong>Deep</strong> (10 spoons): see everything they publish. Max 5 slots.</li>
            <li><strong>Sustained</strong> (5 spoons): significant updates. Max 10.</li>
            <li><strong>Regular</strong> (2 spoons): major events only. Max 20.</li>
            <li><strong>Light</strong> (1 spoon): highlights. Max 30.</li>
          </ul>
          <p style={{ margin: '0 0 10px' }}>
            Filling every tier would cost 170 spoons &mdash; more than you
            have. <strong>You can&rsquo;t fill everything.</strong> That&rsquo;s
            the point.
          </p>
          <p style={{ margin: 0 }}>
            Your roster is private. Nobody sees how you allocate.
          </p>
        </InfoButton>
      </p>

      <BudgetHeader spent={roster.spent} free={roster.free} wasted={roster.wasted} cap={roster.cap} />

      {/* Empty-roster CTA */}
      {!roster.loading && roster.slots.length === 0 && (
        <div style={{
          ...body,
          fontSize: '14.5px',
          color: 'rgba(15,21,35,0.72)',
          padding: '16px 18px',
          background: 'rgba(76,107,69,0.04)',
          border: '1px dashed rgba(76,107,69,0.35)',
          borderRadius: '8px',
          marginBottom: '20px',
        }}>
          Your roster is empty. Start by picking one entity you&rsquo;re
          tuned in to for the Deep tier &mdash; the one you most want to hear
          from in full.
        </div>
      )}

      {/* Pre-flight if not tuned in to anything yet */}
      {!roster.loading && watchCount === 0 && (
        <div style={{
          ...body,
          fontSize: '14.5px',
          color: gold,
          padding: '16px 18px',
          background: 'rgba(76,107,69,0.06)',
          border: '1px dashed rgba(76,107,69,0.55)',
          borderRadius: '8px',
          marginBottom: '20px',
        }}>
          You can only roster entities you&rsquo;re tuned in to. Tune in to a
          few places, organisations, or people from their profile pages
          first.
        </div>
      )}

      {/* Tier rows */}
      {!roster.loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {roster.tierOrder.map(tier => (
            <TierRow
              key={tier}
              tier={tier}
              roster={roster}
              resolved={resolved}
              addingHere={addingForTier === tier}
              onAdd={() => setAddingForTier(tier)}
              onAddCancel={() => setAddingForTier(null)}
              watches={watches}
              watchCount={watchCount}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function BudgetHeader({ spent, free, wasted, cap }) {
  const totalUsed = spent + wasted
  const spentPct = Math.min(100, (spent / cap) * 100)
  const wastedPct = Math.min(100 - spentPct, (wasted / cap) * 100)

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{
        ...sc,
        fontSize: '13px',
        letterSpacing: '0.16em',
        color: 'rgba(15,21,35,0.72)',
        textTransform: 'uppercase',
        marginBottom: '8px',
        display: 'flex',
        gap: '14px',
        flexWrap: 'wrap',
      }}>
        <span>{cap} spoons total</span>
        <span style={{ color: gold }}>· {spent} spent</span>
        <span style={{ color: 'rgba(15,21,35,0.55)' }}>· {free} free</span>
        {wasted > 0 && <span style={{ color: '#A23636' }}>· {wasted} wasted</span>}
      </div>

      {/* Bar */}
      <div style={{
        height: '10px',
        borderRadius: '6px',
        background: '#FAFAF7',
        border: '1px solid rgba(76,107,69,0.22)',
        overflow: 'hidden',
        display: 'flex',
      }}>
        <div style={{ width: `${spentPct}%`, background: gold, transition: 'width 200ms ease' }} />
        {wasted > 0 && (
          <div style={{ width: `${wastedPct}%`, background: 'rgba(162,54,54,0.55)' }} />
        )}
      </div>
    </div>
  )
}

function TierRow({ tier, roster, resolved, addingHere, onAdd, onAddCancel, watches, watchCount }) {
  const filled = roster.slots.filter(s => s.tier === tier)
  const cap = roster.tierCaps[tier]
  const cost = roster.tierCosts[tier]
  const canAdd = filled.length < cap && roster.free >= cost && watchCount > 0

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: '10px',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <div>
          <span style={{
            ...sc,
            fontSize: '13px',
            letterSpacing: '0.18em',
            color: gold,
            textTransform: 'uppercase',
          }}>
            {TIER_LABEL[tier]}
          </span>
          <span style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginLeft: '12px' }}>
            {cost} spoons each &middot; {TIER_DESCRIPTION[tier]}
          </span>
        </div>
        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)' }}>
          {filled.length} of {cap}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {filled.map(slot => (
          <SlotCard
            key={slot.id}
            slot={slot}
            roster={roster}
            resolved={resolved}
          />
        ))}
        {/* Add affordance — one cell, not 'cap - filled' empty cells */}
        {canAdd && !addingHere && (
          <button
            type="button"
            onClick={onAdd}
            style={{
              ...sc,
              fontSize: '13px',
              letterSpacing: '0.14em',
              color: gold,
              background: 'rgba(76,107,69,0.04)',
              border: '1.2px dashed rgba(76,107,69,0.55)',
              borderRadius: '20px',
              padding: '8px 18px',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            + Add
          </button>
        )}
        {!canAdd && filled.length < cap && (
          <span style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', alignSelf: 'center' }}>
            {roster.free < cost
              ? `Need ${cost} spoons (you have ${roster.free} free)`
              : watchCount === 0
                ? 'Tune in to entities first to roster them'
                : ''}
          </span>
        )}
      </div>

      {addingHere && (
        <RosterPicker
          tier={tier}
          roster={roster}
          watches={watches}
          resolved={resolved}
          onCancel={onAddCancel}
          onAdded={onAddCancel}
        />
      )}
    </div>
  )
}

function SlotCard({ slot, roster, resolved }) {
  const r = resolved[slot.entity_type]?.[slot.entity_id]
  const name = r
    ? (slot.entity_type === 'person' ? (r.display_name || 'Unnamed') : r.name)
    : '…'
  const [menuOpen, setMenuOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errMsg, setErrMsg] = useState(null)

  async function moveTo(newTier) {
    setErrMsg(null)
    setBusy(true)
    try {
      await roster.changeTier(slot.id, newTier)
      setMenuOpen(false)
    } catch (e) {
      setErrMsg(e.message || 'Could not change tier.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    try {
      await roster.removeSlot(slot.id)
    } catch (e) {
      setErrMsg(e.message || 'Could not remove.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setMenuOpen(o => !o)}
        disabled={busy}
        style={{
          ...body,
          fontSize: '13.5px',
          color: dark,
          background: '#FFFFFF',
          border: '1.2px solid rgba(76,107,69,0.30)',
          borderRadius: '20px',
          padding: '7px 14px 7px 14px',
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy ? 0.6 : 1,
        }}
      >
        {name}
      </button>
      {menuOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '6px',
          background: '#FFFFFF',
          border: '1.5px solid rgba(76,107,69,0.30)',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(15,21,35,0.10)',
          padding: '8px',
          minWidth: '160px',
          zIndex: 60,
        }}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase', padding: '4px 8px', marginBottom: '4px' }}>
            Move to
          </div>
          {roster.tierOrder
            .filter(t => t !== slot.tier)
            .map(t => (
              <button
                key={t}
                type="button"
                onClick={() => moveTo(t)}
                disabled={busy}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  ...body, fontSize: '13px', color: dark,
                  background: 'none', border: 'none', padding: '6px 8px',
                  borderRadius: '4px', cursor: busy ? 'wait' : 'pointer',
                }}
              >
                {TIER_LABEL[t]} ({roster.tierCosts[t]})
              </button>
            ))}
          <div style={{ height: '1px', background: 'rgba(76,107,69,0.20)', margin: '6px 0' }} />
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              ...body, fontSize: '13px', color: '#A23636',
              background: 'none', border: 'none', padding: '6px 8px',
              borderRadius: '4px', cursor: busy ? 'wait' : 'pointer',
            }}
          >
            Remove
          </button>
          {errMsg && (
            <div style={{ ...body, fontSize: '13px', color: '#A23636', padding: '6px 8px' }}>{errMsg}</div>
          )}
        </div>
      )}
    </span>
  )
}

function RosterPicker({ tier, roster, watches, resolved, onCancel, onAdded }) {
  const cost = roster.tierCosts[tier]

  // Set of (entity_type, entity_id) already in the roster.
  const rosteredSet = useMemo(() => {
    const s = new Set()
    for (const slot of roster.slots) s.add(`${slot.entity_type}:${slot.entity_id}`)
    return s
  }, [roster.slots])

  // Resolve watch display names — pull what we don't already have.
  const [watchResolved, setWatchResolved] = useState({ focus: {}, actor: {}, person: {} })
  useEffect(() => {
    let cancelled = false
    async function resolve() {
      const focusIds  = watches.filter(w => w.entity_type === 'focus').map(w => w.entity_id)
      const actorIds  = watches.filter(w => w.entity_type === 'actor').map(w => w.entity_id)
      const personIds = watches.filter(w => w.entity_type === 'person').map(w => w.entity_id)
      const [f, a, p] = await Promise.all([
        focusIds.length  > 0 ? supabase.from('nextus_focuses').select('id, name, slug, type').in('id', focusIds) : Promise.resolve({ data: [] }),
        actorIds.length  > 0 ? supabase.from('nextus_actors').select('id, name, slug, kind').in('id', actorIds) : Promise.resolve({ data: [] }),
        personIds.length > 0 ? supabase.from('contributor_profiles_beta').select('user_id, display_name').in('user_id', personIds) : Promise.resolve({ data: [] }),
      ])
      if (cancelled) return
      setWatchResolved({
        focus:  Object.fromEntries((f.data || []).map(r => [r.id, r])),
        actor:  Object.fromEntries((a.data || []).map(r => [r.id, r])),
        person: Object.fromEntries((p.data || []).map(r => [r.user_id, r])),
      })
    }
    resolve()
    return () => { cancelled = true }
  }, [watches])

  const candidates = watches.filter(w => !rosteredSet.has(`${w.entity_type}:${w.entity_id}`))

  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [errMsg, setErrMsg] = useState(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return candidates.filter(c => {
      if (!q) return true
      const r = watchResolved[c.entity_type]?.[c.entity_id]
      const name = c.entity_type === 'person' ? (r?.display_name || '') : (r?.name || '')
      return name.toLowerCase().includes(q)
    })
  }, [search, candidates, watchResolved])

  async function pick(candidate) {
    setErrMsg(null)
    setBusy(true)
    try {
      await roster.addSlot(candidate.entity_type, candidate.entity_id, tier)
      onAdded()
    } catch (e) {
      setErrMsg(e.message || 'Could not add.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{
      marginTop: '12px',
      padding: '16px',
      background: 'rgba(76,107,69,0.04)',
      border: '1.5px solid rgba(76,107,69,0.30)',
      borderRadius: '10px',
    }}>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: gold, textTransform: 'uppercase', marginBottom: '10px' }}>
        Add to {TIER_LABEL[tier]} ({cost} spoons)
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search your Tuned In list…"
        style={{
          ...body,
          fontSize: '14px',
          color: dark,
          padding: '8px 12px',
          borderRadius: '6px',
          border: '1.2px solid rgba(76,107,69,0.30)',
          background: '#FFFFFF',
          outline: 'none',
          width: '100%',
          maxWidth: '320px',
          marginBottom: '12px',
        }}
      />

      <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {filtered.length === 0 && (
          <div style={{ ...body, fontSize: '13.5px', color: 'rgba(15,21,35,0.55)', padding: '8px 4px' }}>
            {candidates.length === 0
              ? 'Everyone you&rsquo;re tuned in to is already in the roster.'
              : 'No matches.'}
          </div>
        )}
        {filtered.map(c => {
          const r = watchResolved[c.entity_type]?.[c.entity_id]
          const name = c.entity_type === 'person' ? (r?.display_name || 'Unnamed') : (r?.name || '…')
          return (
            <button
              key={`${c.entity_type}:${c.entity_id}`}
              type="button"
              onClick={() => pick(c)}
              disabled={busy}
              style={{
                ...body, fontSize: '14px', color: dark,
                background: '#FFFFFF',
                border: '1px solid rgba(76,107,69,0.18)',
                borderRadius: '6px',
                padding: '8px 12px',
                cursor: busy ? 'wait' : 'pointer',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{name}</span>
              <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: gold, textTransform: 'uppercase' }}>
                {c.entity_type}
              </span>
            </button>
          )
        })}
      </div>

      {errMsg && (
        <div style={{ ...body, fontSize: '13px', color: '#A23636', marginTop: '10px' }}>{errMsg}</div>
      )}

      <div style={{ marginTop: '12px' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            ...sc, fontSize: '13px', letterSpacing: '0.14em',
            color: 'rgba(15,21,35,0.55)', background: 'none',
            border: 'none', cursor: 'pointer', padding: '4px 0',
            textTransform: 'uppercase',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
