// src/app/components/AffiliationPicker.jsx
//
// The flow for adding one new affiliation. Renders inline inside the
// AffiliationManager — not a modal. The user works through it left-to-right
// (or top-to-bottom on mobile):
//
//   1. Pick a Focus (search by name)
//   2. Pick a relationship type (citizen / resident / born_here / ...)
//   3. Pick a visibility (public / visible_to_matches / private)
//   4. Confirm with Save, or Cancel to drop the draft
//
// Two pieces of teaching live inside this flow:
//
//   - Cascade preview: once a Focus is selected, a soft line appears
//     showing the parent chain ("You'll appear in: Toronto · Ontario ·
//     Canada · North America · Earth"). Informational, not a checklist.
//
//   - Citizen nudge: when the relationship is `citizen` but the picked
//     Focus is NOT a country, a soft prompt offers to switch the target
//     to the nearest ancestor country. The user can dismiss and keep
//     their choice — the nudge teaches the model without blocking.

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../hooks/useSupabase'
import { FocusSearch } from './FocusSearch'
import { body, sc, gold, dark } from './OrgShared'

const RELATIONSHIPS = [
  { value: 'citizen',          label: 'Citizen',           helper: 'A citizen of this place.' },
  { value: 'resident',         label: 'Resident',          helper: 'I live here.' },
  { value: 'former_resident',  label: 'Former resident',   helper: 'I lived here.' },
  { value: 'born_here',        label: 'Born here',         helper: 'I was born here.' },
  { value: 'heritage',         label: 'Heritage',          helper: 'I am of this place by ancestry.' },
  { value: 'working_here',     label: 'Working here',      helper: 'My work is here.' },
  { value: 'connected_to',     label: 'Connected to',      helper: 'A meaningful tie I do not want to specify further.' },
]

const VISIBILITIES = [
  { value: 'public',             label: 'Public',              helper: 'Anyone can see this on my profile and on this place\u2019s page.' },
  { value: 'visible_to_matches', label: 'Visible to matches',  helper: 'Hidden from public view; available to the matching layer in service to me.' },
  { value: 'private',            label: 'Private',             helper: 'Only I can see this. The platform may still use it to serve me.' },
]

const COUNTRY_TYPES = new Set(['country', 'nation'])

export function AffiliationPicker({ userId, onSaved, onCancel, existingPairs, initialFocus }) {
  const [focus, setFocus]               = useState(initialFocus || null)
  const [relationship, setRelationship] = useState(null)
  const [visibility, setVisibility]     = useState('public')
  const [saving, setSaving]             = useState(false)
  const [saveError, setSaveError]       = useState(null)
  const [ancestors, setAncestors]       = useState([])
  const [nearestCountry, setNearestCountry] = useState(null)
  const [dismissedCitizenNudge, setDismissedCitizenNudge] = useState(false)

  // Load ancestor chain whenever a Focus is picked. Used for the cascade
  // preview line and (for the citizen nudge) to find the nearest country
  // ancestor. We use the focus_ancestors() SQL function via .rpc().
  useEffect(() => {
    let cancelled = false
    if (!focus) { setAncestors([]); setNearestCountry(null); return }
    async function loadAncestors() {
      const { data, error } = await supabase
        .rpc('focus_ancestors', { p_focus_id: focus.id })
      if (cancelled) return
      if (error) { setAncestors([]); setNearestCountry(null); return }
      const chain = data || []
      setAncestors(chain)
      const country = chain.find(a => COUNTRY_TYPES.has(a.type))
      setNearestCountry(country || null)
    }
    loadAncestors()
    return () => { cancelled = true }
  }, [focus])

  // Detect the citizen-of-non-country case for the nudge.
  const focusIsCountry = focus ? COUNTRY_TYPES.has(focus.type) : false
  const showCitizenNudge =
    relationship === 'citizen' &&
    focus &&
    !focusIsCountry &&
    nearestCountry &&
    !dismissedCitizenNudge

  // Has the user already declared this exact relationship to this exact focus?
  const isDuplicate = useMemo(() => {
    if (!focus || !relationship) return false
    return existingPairs?.some(p => p.focus_id === focus.id && p.relationship_type === relationship)
  }, [focus, relationship, existingPairs])

  const canSave = focus && relationship && visibility && !saving && !isDuplicate

  async function save() {
    if (!canSave) return
    setSaving(true)
    setSaveError(null)

    const { data, error } = await supabase
      .from('nextus_user_affiliations')
      .insert({
        user_id: userId,
        focus_id: focus.id,
        relationship_type: relationship,
        visibility,
      })
      .select('id, focus_id, relationship_type, visibility, declared_at')
      .single()

    setSaving(false)
    if (error) { setSaveError(error.message || 'Could not save.'); return }
    onSaved?.(data)
  }

  function switchToCountry() {
    setFocus({
      id: nearestCountry.id,
      name: nearestCountry.name,
      type: nearestCountry.type,
      kind: nearestCountry.kind,
      slug: nearestCountry.slug,
    })
    setDismissedCitizenNudge(false)
  }

  return (
    <div style={{
      border: '1.5px solid rgba(76,107,69,0.22)',
      background: 'rgba(76,107,69,0.03)',
      borderRadius: '10px',
      padding: '20px 22px 22px',
      marginBottom: '20px',
    }}>
      <div style={{
        ...sc,
        fontSize: '13px',
        letterSpacing: '0.18em',
        color: gold,
        textTransform: 'uppercase',
        marginBottom: '14px',
      }}>
        New place
      </div>

      {/* Step 1 — pick the Focus */}
      <FieldLabel n={1}>Search for a place, org, or entity</FieldLabel>
      <FocusSearch value={focus} onChange={setFocus} />

      {/* Cascade preview */}
      {focus && ancestors.length > 0 && (
        <div style={{
          ...body,
          fontSize: '13px',
          color: 'rgba(15,21,35,0.72)',
          marginTop: '8px',
          paddingLeft: '2px',
        }}>
          Cascades through:{' '}
          {ancestors.map((a, i) => (
            <span key={a.id}>
              {a.name}{i < ancestors.length - 1 ? ' · ' : ''}
            </span>
          ))}
        </div>
      )}

      {/* Step 2 — relationship */}
      {focus && (
        <>
          <FieldLabel n={2}>How are you connected?</FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {RELATIONSHIPS.map(r => (
              <Chip
                key={r.value}
                selected={relationship === r.value}
                onClick={() => { setRelationship(r.value); setDismissedCitizenNudge(false) }}
              >
                {r.label}
              </Chip>
            ))}
          </div>
          {relationship && (
            <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.72)', marginTop: '8px' }}>
              {RELATIONSHIPS.find(r => r.value === relationship)?.helper}
            </div>
          )}
        </>
      )}

      {/* Citizen nudge — soft, dismissable, never blocks */}
      {showCitizenNudge && (
        <div style={{
          marginTop: '14px',
          padding: '12px 14px',
          background: 'rgba(76,107,69,0.06)',
          border: '1px dashed rgba(76,107,69,0.50)',
          borderRadius: '8px',
        }}>
          <div style={{ ...body, fontSize: '13.5px', color: dark, lineHeight: 1.6 }}>
            Citizenship usually applies to countries. Did you mean to claim
            citizenship of <strong>{nearestCountry.name}</strong> (the country
            containing {focus.name})?
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={switchToCountry}
              style={{
                ...sc,
                fontSize: '13px',
                letterSpacing: '0.14em',
                color: gold,
                background: 'rgba(76,107,69,0.10)',
                border: '1.2px solid rgba(76,107,69,0.55)',
                borderRadius: '30px',
                padding: '7px 16px',
                cursor: 'pointer',
              }}
            >
              Switch to {nearestCountry.name}
            </button>
            <button
              type="button"
              onClick={() => setDismissedCitizenNudge(true)}
              style={{
                ...sc,
                fontSize: '13px',
                letterSpacing: '0.14em',
                color: 'rgba(15,21,35,0.55)',
                background: 'none',
                border: '1.2px solid rgba(15,21,35,0.22)',
                borderRadius: '30px',
                padding: '7px 16px',
                cursor: 'pointer',
              }}
            >
              Keep my choice
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — visibility */}
      {focus && relationship && (
        <>
          <FieldLabel n={3}>Who can see this?</FieldLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {VISIBILITIES.map(v => (
              <label key={v.value} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === v.value}
                  onChange={() => setVisibility(v.value)}
                  style={{ marginTop: '4px', accentColor: gold }}
                />
                <span>
                  <span style={{ ...body, fontSize: '14.5px', color: dark }}>{v.label}</span>
                  <br />
                  <span style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.72)' }}>
                    {v.helper}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </>
      )}

      {/* Step 4 — save / cancel */}
      <div style={{ marginTop: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          style={{
            ...sc,
            fontSize: '13px',
            letterSpacing: '0.16em',
            color: canSave ? '#FFFFFF' : 'rgba(15,21,35,0.55)',
            background: canSave ? gold : 'rgba(15,21,35,0.06)',
            border: '1.5px solid ' + (canSave ? gold : 'rgba(15,21,35,0.10)'),
            borderRadius: '30px',
            padding: '9px 22px',
            cursor: canSave ? 'pointer' : 'not-allowed',
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            ...sc,
            fontSize: '13px',
            letterSpacing: '0.16em',
            color: 'rgba(15,21,35,0.55)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        {isDuplicate && (
          <span style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>
            You\u2019ve already declared this.
          </span>
        )}
        {saveError && (
          <span style={{ ...body, fontSize: '13px', color: '#A23636' }}>
            {saveError}
          </span>
        )}
      </div>
    </div>
  )
}

function FieldLabel({ n, children }) {
  return (
    <div style={{
      ...sc,
      fontSize: '13px',
      letterSpacing: '0.16em',
      color: 'rgba(15,21,35,0.72)',
      textTransform: 'uppercase',
      marginTop: '18px',
      marginBottom: '8px',
    }}>
      <span style={{ color: gold }}>{n}.</span>&nbsp;{children}
    </div>
  )
}

function Chip({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...sc,
        fontSize: '13px',
        letterSpacing: '0.14em',
        color: selected ? '#FFFFFF' : gold,
        background: selected ? gold : 'rgba(76,107,69,0.04)',
        border: '1.2px solid ' + (selected ? gold : 'rgba(76,107,69,0.45)'),
        borderRadius: '30px',
        padding: '7px 14px',
        cursor: 'pointer',
        transition: 'all 120ms ease',
      }}
    >
      {children}
    </button>
  )
}
