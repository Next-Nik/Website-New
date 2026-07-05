// src/app/components/AffiliationManager.jsx
//
// The user's full affiliation surface on the profile edit page.
//
// Renders:
//   - A short header with an info button explaining what Places is and
//     how bounded attention will work
//   - The list of existing affiliations, grouped by relationship type, with
//     visibility editor and delete affordance per row
//   - An "Add a place" affordance that opens the AffiliationPicker inline
//
// Visibility for existing affiliations is editable in place via a small
// segmented control. Delete is confirmed once (a soft "Remove?" line).
//
// Schema: nextus_user_affiliations
//   columns: id, user_id, focus_id, relationship_type, visibility, note,
//            declared_at, updated_at
//   RLS:     users can read/insert/update/delete their own (migration 042)

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../hooks/useSupabase'
import { AffiliationPicker } from './AffiliationPicker'
import { InfoButton } from './InfoButton'
import { body, sc, gold, dark } from './OrgShared'

const RELATIONSHIP_GROUP_LABEL = {
  citizen:         'Citizen of',
  resident:        'Lives in',
  former_resident: 'Lived in',
  born_here:       'Born in',
  heritage:        'Heritage',
  working_here:    'Works at',
  connected_to:    'Connected to',
}

// Display order on the management UI. Citizenship first because for many
// users it is the strongest civic tie; residence next because it's the most
// active; the others follow in the natural order of an identity statement.
const RELATIONSHIP_ORDER = [
  'citizen',
  'resident',
  'former_resident',
  'born_here',
  'heritage',
  'working_here',
  'connected_to',
]

const VISIBILITY_LABEL = {
  public:             'Public',
  visible_to_matches: 'Matches',
  private:            'Private',
}

export function AffiliationManager({ userId }) {
  const [affiliations, setAffiliations] = useState([])
  const [focusCache, setFocusCache]     = useState({})  // focus_id → { id, name, type, kind, slug, parent_id }
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [addingNew, setAddingNew]       = useState(false)

  // Load affiliations + their referenced focuses in one pass.
  const loadAll = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)

    const { data: rows, error: rowErr } = await supabase
      .from('nextus_user_affiliations')
      .select('id, focus_id, relationship_type, visibility, note, declared_at')
      .eq('user_id', userId)
      .order('declared_at', { ascending: true })

    if (rowErr) { setError(rowErr); setLoading(false); return }

    const ids = Array.from(new Set((rows || []).map(r => r.focus_id)))
    let focusMap = {}
    if (ids.length > 0) {
      const { data: focuses, error: focErr } = await supabase
        .from('nextus_focuses')
        .select('id, name, type, kind, slug, parent_id')
        .in('id', ids)
      if (focErr) { setError(focErr); setLoading(false); return }
      focusMap = Object.fromEntries((focuses || []).map(f => [f.id, f]))
    }

    setAffiliations(rows || [])
    setFocusCache(focusMap)
    setLoading(false)
  }, [userId])

  useEffect(() => { loadAll() }, [loadAll])

  // Existing pairs — passed into the picker so the user can't double-declare
  // (the database has a unique key on user_id + focus_id + relationship_type
  // but we surface the constraint as a soft warning in the picker).
  const existingPairs = useMemo(() =>
    affiliations.map(a => ({ focus_id: a.focus_id, relationship_type: a.relationship_type })),
    [affiliations]
  )

  // Group affiliations by relationship_type for rendering.
  const grouped = useMemo(() => {
    const g = {}
    for (const a of affiliations) {
      if (!g[a.relationship_type]) g[a.relationship_type] = []
      g[a.relationship_type].push(a)
    }
    return g
  }, [affiliations])

  async function updateVisibility(id, newVisibility) {
    // Optimistic update.
    setAffiliations(prev => prev.map(a => a.id === id ? { ...a, visibility: newVisibility } : a))
    const { error: updErr } = await supabase
      .from('nextus_user_affiliations')
      .update({ visibility: newVisibility })
      .eq('id', id)
    if (updErr) {
      // Reload to reconcile if write failed.
      loadAll()
    }
  }

  async function removeAffiliation(id) {
    const previous = affiliations
    setAffiliations(prev => prev.filter(a => a.id !== id))
    const { error: delErr } = await supabase
      .from('nextus_user_affiliations')
      .delete()
      .eq('id', id)
    if (delErr) {
      setAffiliations(previous)
    }
  }

  function onSaved(newRow) {
    // Refresh the focus cache for the new row.
    supabase
      .from('nextus_focuses')
      .select('id, name, type, kind, slug, parent_id')
      .eq('id', newRow.focus_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setFocusCache(prev => ({ ...prev, [data.id]: data }))
      })
    setAffiliations(prev => [...prev, newRow])
    setAddingNew(false)
  }

  return (
    <div>
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
          Declare your ties to countries, cities, orgs, groups, or any other
          place that holds meaning for you. You set what each one says, and
          who sees it.
        </span>
        <InfoButton title="Places">
          <p style={{ margin: '0 0 10px' }}>
            Places is where you declare the entities you are connected to &mdash;
            countries, cities, orgs, groups. Each declaration carries a relationship
            (citizen, resident, born here, heritage, and so on) and a visibility
            you control per&#8209;item.
          </p>
          <p style={{ margin: '0 0 10px' }}>
            Claims cascade through the parent chain. If you declare you were born
            in Toronto, you appear on Ontario&rsquo;s page, Canada&rsquo;s page,
            and North America&rsquo;s page too &mdash; honest to the geography.
          </p>
          <p style={{ margin: 0 }}>
            Later, you&rsquo;ll be able to <em>watch</em> places and distribute
            your attention across them on a finite budget. The platform&rsquo;s
            commitment to <strong>bounded attention</strong> means it never
            pretends you can attend to infinite things. For now, just declare
            what is true.
          </p>
        </InfoButton>
      </p>

      {loading && (
        <div style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)' }}>
          Loading&hellip;
        </div>
      )}

      {error && (
        <div style={{ ...body, fontSize: '14px', color: '#A23636', marginBottom: '20px' }}>
          Could not load your places. Try refreshing.
        </div>
      )}

      {!loading && affiliations.length === 0 && !addingNew && (
        <div style={{
          ...body,
          fontSize: '14.5px',
          color: 'rgba(15,21,35,0.72)',
          fontStyle: 'italic',
          padding: '16px 18px',
          background: 'rgba(110,127,92,0.04)',
          border: '1px dashed rgba(110,127,92,0.35)',
          borderRadius: '8px',
          marginBottom: '20px',
        }}>
          You haven&rsquo;t added any places yet.
        </div>
      )}

      {!loading && affiliations.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          {RELATIONSHIP_ORDER
            .filter(rel => grouped[rel]?.length > 0)
            .map(rel => (
              <RelationshipGroup
                key={rel}
                relationshipType={rel}
                affiliations={grouped[rel]}
                focusCache={focusCache}
                onUpdateVisibility={updateVisibility}
                onRemove={removeAffiliation}
              />
            ))
          }
        </div>
      )}

      {addingNew ? (
        <AffiliationPicker
          userId={userId}
          existingPairs={existingPairs}
          onSaved={onSaved}
          onCancel={() => setAddingNew(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAddingNew(true)}
          style={{
            ...sc,
            fontSize: '13px',
            letterSpacing: '0.16em',
            color: gold,
            background: 'rgba(110,127,92,0.04)',
            border: '1.2px dashed rgba(110,127,92,0.55)',
            borderRadius: '30px',
            padding: '10px 22px',
            cursor: 'pointer',
          }}
        >
          + Add a place
        </button>
      )}
    </div>
  )
}

function RelationshipGroup({ relationshipType, affiliations, focusCache, onUpdateVisibility, onRemove }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <div style={{
        ...sc,
        fontSize: '13px',
        letterSpacing: '0.16em',
        color: 'rgba(15,21,35,0.72)',
        textTransform: 'uppercase',
        marginBottom: '8px',
      }}>
        {RELATIONSHIP_GROUP_LABEL[relationshipType] || relationshipType}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {affiliations.map(a => (
          <AffiliationRow
            key={a.id}
            affiliation={a}
            focus={focusCache[a.focus_id]}
            onUpdateVisibility={onUpdateVisibility}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  )
}

function AffiliationRow({ affiliation, focus, onUpdateVisibility, onRemove }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  if (!focus) return null  // focus reference missing — should not happen but safe

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      padding: '10px 14px',
      borderRadius: '8px',
      border: '1px solid rgba(110,127,92,0.18)',
      background: '#FFFFFF',
      flexWrap: 'wrap',
    }}>
      <div style={{ ...body, fontSize: '15px', color: dark, flexGrow: 1, minWidth: '160px' }}>
        {focus.name}
      </div>

      {/* Visibility segmented control */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {['public', 'visible_to_matches', 'private'].map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onUpdateVisibility(affiliation.id, v)}
            style={{
              ...sc,
              fontSize: '13px',
              letterSpacing: '0.12em',
              color: affiliation.visibility === v ? '#FFFFFF' : gold,
              background: affiliation.visibility === v ? gold : 'rgba(110,127,92,0.06)',
              border: '1px solid rgba(110,127,92,0.45)',
              borderRadius: '20px',
              padding: '5px 12px',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            {VISIBILITY_LABEL[v]}
          </button>
        ))}
      </div>

      {/* Remove */}
      {confirmingDelete ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.72)' }}>
            Remove?
          </span>
          <button
            type="button"
            onClick={() => onRemove(affiliation.id)}
            style={{
              ...sc, fontSize: '13px', letterSpacing: '0.12em',
              color: '#A23636', background: 'rgba(162,54,54,0.06)',
              border: '1px solid rgba(162,54,54,0.45)', borderRadius: '20px',
              padding: '5px 10px', cursor: 'pointer', textTransform: 'uppercase',
            }}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            style={{
              ...sc, fontSize: '13px', letterSpacing: '0.12em',
              color: 'rgba(15,21,35,0.55)', background: 'none', border: 'none',
              padding: '5px 4px', cursor: 'pointer', textTransform: 'uppercase',
            }}
          >
            No
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          aria-label={`Remove ${focus.name}`}
          style={{
            background: 'none', border: 'none', color: 'rgba(15,21,35,0.55)',
            cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '0 4px',
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}
