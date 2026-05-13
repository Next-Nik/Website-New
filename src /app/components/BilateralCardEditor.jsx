// src/beta/components/BilateralCardEditor.jsx
// Reusable editor for creating and editing all four bilateral artefact types.
// Party A uses this to create a draft. Draft creation fires a notification for B.
// Party A may also edit payload while party_b_consent is still false.

import { useState, useEffect } from 'react'
import { supabase } from '../../hooks/useSupabase'
import {
  ARTEFACT_TYPES,
  defaultPayload,
  createDraft,
  updatePayload,
  withdrawDraft,
} from '../hooks/useBilateral'

const body = { fontFamily: "'Lora', Georgia, serif" }
const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const gold = '#A8721A'
const dark = '#0F1523'

// ── Shared form primitives ───────────────────────────────────

function Label({ children, required }) {
  return (
    <label style={{
      ...sc, fontSize: '12px', letterSpacing: '0.16em', color: gold,
      display: 'block', marginBottom: '6px',
    }}>
      {children}
      {required && <span style={{ color: '#8A3030', marginLeft: '4px' }}>*</span>}
    </label>
  )
}

function Hint({ children }) {
  return (
    <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginTop: '5px', lineHeight: 1.55 }}>
      {children}
    </p>
  )
}

function Field({ children, style }) {
  return <div style={{ marginBottom: '18px', ...style }}>{children}</div>
}

function TextInput({ value, onChange, placeholder, disabled }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        ...body, fontSize: '15px', color: dark,
        padding: '11px 16px', borderRadius: '8px',
        border: '1.5px solid rgba(200,146,42,0.30)',
        background: disabled ? 'rgba(200,146,42,0.03)' : '#FFFFFF',
        outline: 'none', width: '100%',
      }}
    />
  )
}

function TextArea({ value, onChange, placeholder, rows = 3, disabled }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      style={{
        ...body, fontSize: '15px', color: dark,
        padding: '11px 16px', borderRadius: '8px',
        border: '1.5px solid rgba(200,146,42,0.30)',
        background: disabled ? 'rgba(200,146,42,0.03)' : '#FFFFFF',
        outline: 'none', width: '100%', resize: 'vertical', lineHeight: 1.65,
      }}
    />
  )
}

// ── Party B search ───────────────────────────────────────────

function PartyBSearch({ value, onChange }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const debounce = { current: null }

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return }
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('contributor_profiles_beta')
        .select('user_id, display_name, headline')
        .ilike('display_name', `%${query.trim()}%`)
        .limit(8)
      setResults(data || [])
      setSearching(false)
    }, 280)
    return () => clearTimeout(debounce.current)
  }, [query])

  if (value) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderRadius: '8px',
        border: '1.5px solid rgba(200,146,42,0.55)',
        background: 'rgba(200,146,42,0.04)',
      }}>
        <div>
          <span style={{ ...body, fontSize: '15px', color: dark }}>{value.display_name}</span>
          {value.headline && (
            <span style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginLeft: '10px' }}>
              {value.headline}
            </span>
          )}
        </div>
        <button
          onClick={() => onChange(null)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '18px', color: 'rgba(15,21,35,0.55)', lineHeight: 1, padding: '0 0 0 10px',
          }}
        >
          x
        </button>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search by name..."
        style={{
          ...body, fontSize: '15px', color: dark,
          padding: '11px 16px', borderRadius: '8px',
          border: '1.5px solid rgba(200,146,42,0.30)',
          background: '#FFFFFF', outline: 'none', width: '100%',
        }}
      />
      {(results.length > 0 || searching) && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.30)',
          borderRadius: '0 0 8px 8px', boxShadow: '0 8px 24px rgba(15,21,35,0.10)',
          maxHeight: '220px', overflowY: 'auto',
        }}>
          {searching && (
            <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', padding: '10px 16px' }}>
              Searching...
            </div>
          )}
          {results.map(r => (
            <button
              key={r.user_id}
              onClick={() => { onChange(r); setQuery(''); setResults([]) }}
              style={{
                display: 'flex', flexDirection: 'column', width: '100%',
                padding: '10px 16px', background: 'none', border: 'none',
                borderBottom: '1px solid rgba(200,146,42,0.08)',
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,146,42,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <span style={{ ...body, fontSize: '15px', color: dark }}>{r.display_name}</span>
              {r.headline && (
                <span style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>{r.headline}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Payload editors per type ─────────────────────────────────

function SprintBuddyFields({ payload, onChange, locked }) {
  const SELF_DOMAINS = [
    { value: 'path', label: 'Path' }, { value: 'spark', label: 'Spark' },
    { value: 'body', label: 'Body' }, { value: 'finances', label: 'Finances' },
    { value: 'connection', label: 'Connection' }, { value: 'inner-game', label: 'Inner Game' },
    { value: 'signal', label: 'Signal' },
  ]
  function toggleDomain(slug) {
    const current = payload.shared_domains || []
    onChange({
      ...payload,
      shared_domains: current.includes(slug) ? current.filter(d => d !== slug) : [...current, slug],
    })
  }
  return (
    <>
      <Field>
        <Label>Sprint window</Label>
        <TextInput
          value={payload.sprint_window || ''}
          onChange={v => onChange({ ...payload, sprint_window: v })}
          placeholder="e.g. Q3 2026, January to March"
          disabled={locked}
        />
        <Hint>The time period you are committing to together.</Hint>
      </Field>
      <Field>
        <Label>Shared domains</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
          {SELF_DOMAINS.map(d => {
            const on = (payload.shared_domains || []).includes(d.value)
            return (
              <button
                key={d.value}
                type="button"
                disabled={locked}
                onClick={() => toggleDomain(d.value)}
                style={{
                  ...sc, fontSize: '11px', letterSpacing: '0.12em',
                  padding: '5px 12px', borderRadius: '40px', cursor: locked ? 'default' : 'pointer',
                  border: on ? '1.5px solid rgba(200,146,42,0.78)' : '1.5px solid rgba(200,146,42,0.25)',
                  background: on ? 'rgba(200,146,42,0.10)' : 'transparent',
                  color: on ? gold : 'rgba(15,21,35,0.55)',
                }}
              >
                {d.label}
              </button>
            )
          })}
        </div>
        <Hint>Which areas of life you are sprinting together on.</Hint>
      </Field>
      <Field>
        <Label>Commitment note</Label>
        <TextArea
          value={payload.commitment_note || ''}
          onChange={v => onChange({ ...payload, commitment_note: v })}
          placeholder="What are we committing to together? One or two sentences."
          rows={3}
          disabled={locked}
        />
      </Field>
    </>
  )
}

function PractitionerRelationshipFields({ payload, onChange, locked }) {
  return (
    <>
      <Field>
        <Label required>Relationship title</Label>
        <TextInput
          value={payload.title || ''}
          onChange={v => onChange({ ...payload, title: v })}
          placeholder="e.g. Coach and client, Mentorship, Supervision"
          disabled={locked}
        />
        <Hint>A short, honest name for the relationship.</Hint>
      </Field>
      <Field>
        <Label>Description</Label>
        <TextArea
          value={payload.description || ''}
          onChange={v => onChange({ ...payload, description: v })}
          placeholder="What does this relationship involve? What has it produced?"
          rows={3}
          disabled={locked}
        />
      </Field>
      <Field>
        <Label>Started</Label>
        <TextInput
          value={payload.started_at || ''}
          onChange={v => onChange({ ...payload, started_at: v })}
          placeholder="e.g. March 2024"
          disabled={locked}
        />
      </Field>
    </>
  )
}

function CollaborationCardFields({ payload, onChange, locked }) {
  const CIV_DOMAINS = [
    { value: 'human-being', label: 'Human Being' }, { value: 'society', label: 'Society' },
    { value: 'nature', label: 'Nature' }, { value: 'technology', label: 'Technology' },
    { value: 'finance-economy', label: 'Finance and Economy' }, { value: 'legacy', label: 'Legacy' },
    { value: 'vision', label: 'Vision' },
  ]
  function toggleDomain(slug) {
    const current = payload.domain_tags || []
    onChange({
      ...payload,
      domain_tags: current.includes(slug) ? current.filter(d => d !== slug) : [...current, slug],
    })
  }
  return (
    <>
      <Field>
        <Label required>Collaboration title</Label>
        <TextInput
          value={payload.title || ''}
          onChange={v => onChange({ ...payload, title: v })}
          placeholder="Project or collaboration name"
          disabled={locked}
        />
      </Field>
      <Field>
        <Label>Description</Label>
        <TextArea
          value={payload.description || ''}
          onChange={v => onChange({ ...payload, description: v })}
          placeholder="What are you building or doing together?"
          rows={3}
          disabled={locked}
        />
      </Field>
      <Field>
        <Label>Domains</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
          {CIV_DOMAINS.map(d => {
            const on = (payload.domain_tags || []).includes(d.value)
            return (
              <button
                key={d.value}
                type="button"
                disabled={locked}
                onClick={() => toggleDomain(d.value)}
                style={{
                  ...sc, fontSize: '11px', letterSpacing: '0.12em',
                  padding: '5px 12px', borderRadius: '40px', cursor: locked ? 'default' : 'pointer',
                  border: on ? '1.5px solid rgba(200,146,42,0.78)' : '1.5px solid rgba(200,146,42,0.25)',
                  background: on ? 'rgba(200,146,42,0.10)' : 'transparent',
                  color: on ? gold : 'rgba(15,21,35,0.55)',
                }}
              >
                {d.label}
              </button>
            )
          })}
        </div>
      </Field>
    </>
  )
}

function PodcastEmbedFields({ payload, onChange, locked }) {
  return (
    <>
      <Field>
        <Label required>Episode title</Label>
        <TextInput
          value={payload.episode_title || ''}
          onChange={v => onChange({ ...payload, episode_title: v })}
          placeholder="Episode or conversation title"
          disabled={locked}
        />
      </Field>
      <Field>
        <Label required>URL</Label>
        <TextInput
          value={payload.episode_url || ''}
          onChange={v => onChange({ ...payload, episode_url: v })}
          placeholder="https://..."
          disabled={locked}
        />
        <Hint>The podcast episode URL. Spotify, Apple Podcasts, a direct MP3, or any public link.</Hint>
      </Field>
      <Field>
        <Label>Published</Label>
        <TextInput
          value={payload.published_at || ''}
          onChange={v => onChange({ ...payload, published_at: v })}
          placeholder="e.g. January 2025"
          disabled={locked}
        />
      </Field>
      <Field>
        <Label>Description</Label>
        <TextArea
          value={payload.description || ''}
          onChange={v => onChange({ ...payload, description: v })}
          placeholder="What did you talk about?"
          rows={3}
          disabled={locked}
        />
      </Field>
    </>
  )
}

function PayloadEditor({ artefactType, payload, onChange, locked }) {
  switch (artefactType) {
    case 'sprint_buddy':              return <SprintBuddyFields payload={payload} onChange={onChange} locked={locked} />
    case 'practitioner_relationship': return <PractitionerRelationshipFields payload={payload} onChange={onChange} locked={locked} />
    case 'collaboration_card':        return <CollaborationCardFields payload={payload} onChange={onChange} locked={locked} />
    case 'podcast_embed':             return <PodcastEmbedFields payload={payload} onChange={onChange} locked={locked} />
    default:                          return null
  }
}

// ── Main editor ──────────────────────────────────────────────

export function BilateralCardEditor({
  currentUserId,
  // Pass existingBilateral to edit a draft already in the DB
  existingBilateral,
  // Called with the new bilateral id when a draft is created
  onCreated,
  // Called after a successful payload update
  onUpdated,
  // Called after withdrawal
  onWithdrawn,
  // Called when editor should close
  onClose,
}) {
  const isEdit = !!existingBilateral

  const [artefactType, setArtefactType] = useState(existingBilateral?.artefact_type || 'sprint_buddy')
  const [partyB, setPartyB]             = useState(
    existingBilateral?.party_b_user_id
      ? { user_id: existingBilateral.party_b_user_id, display_name: existingBilateral._partyBName || '' }
      : null
  )
  const [payload, setPayload] = useState(
    existingBilateral?.payload || defaultPayload('sprint_buddy')
  )
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)

  // Reset payload to type defaults when type changes (new draft only)
  useEffect(() => {
    if (!isEdit) setPayload(defaultPayload(artefactType))
  }, [artefactType, isEdit])

  // Locked once B has consented — payload edits are forbidden post-acceptance
  const locked = isEdit && existingBilateral?.party_b_consent === true

  async function handleSave() {
    setError(null)
    if (!partyB?.user_id && !existingBilateral?.party_b_user_id) {
      setError('Choose who to invite.')
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        await updatePayload(existingBilateral.id, payload, currentUserId)
        onUpdated?.()
      } else {
        const id = await createDraft({
          partyAUserId:  currentUserId,
          partyBUserId:  partyB.user_id,
          partyBActorId: null,
          artefactType,
          payload,
        })
        onCreated?.(id)
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleWithdraw() {
    if (!existingBilateral?.id) return
    setSaving(true)
    try {
      await withdrawDraft(existingBilateral.id, currentUserId)
      onWithdrawn?.()
    } catch (err) {
      setError(err.message || 'Could not withdraw.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1.5px solid rgba(200,146,42,0.30)',
      borderRadius: '14px',
      padding: '28px 32px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.20em', color: gold, marginBottom: '6px' }}>
            {isEdit ? 'Edit bilateral card' : 'Propose a bilateral card'}
          </p>
          <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.6, maxWidth: '440px' }}>
            {isEdit
              ? 'You can edit the details until the other person accepts.'
              : 'Both parties must consent before anything is published. The other person will receive an invitation.'}
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '20px', color: 'rgba(15,21,35,0.40)', lineHeight: 1, padding: '0 0 0 16px',
          }}>x</button>
        )}
      </div>

      {/* Type selector — locked once in edit mode */}
      <Field>
        <Label required>Type</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
          {ARTEFACT_TYPES.map(t => {
            const on = artefactType === t.value
            return (
              <button
                key={t.value}
                type="button"
                disabled={isEdit}
                onClick={() => setArtefactType(t.value)}
                style={{
                  ...sc, fontSize: '12px', letterSpacing: '0.12em',
                  padding: '10px 14px', borderRadius: '10px',
                  cursor: isEdit ? 'default' : 'pointer',
                  border: on ? '1.5px solid rgba(200,146,42,0.78)' : '1.5px solid rgba(200,146,42,0.20)',
                  background: on ? 'rgba(200,146,42,0.08)' : '#FAFAF7',
                  color: on ? gold : 'rgba(15,21,35,0.60)',
                  textAlign: 'left',
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </Field>

      {/* Party B — locked once in edit mode */}
      {!isEdit && (
        <Field>
          <Label required>Invite</Label>
          <PartyBSearch value={partyB} onChange={setPartyB} />
          <Hint>Search for the person you want to propose this card with.</Hint>
        </Field>
      )}

      {isEdit && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px',
          background: 'rgba(200,146,42,0.04)',
          border: '1px solid rgba(200,146,42,0.18)',
          marginBottom: '18px',
        }}>
          <span style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.65)' }}>
            With{' '}
            <strong>{existingBilateral?._partyBName || 'the other person'}</strong>
            {locked && (
              <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: '#2D6A4F', marginLeft: '10px' }}>
                Accepted -- read only
              </span>
            )}
          </span>
        </div>
      )}

      {/* Type-specific payload fields */}
      <PayloadEditor
        artefactType={artefactType}
        payload={payload}
        onChange={setPayload}
        locked={locked}
      />

      {/* Error */}
      {error && (
        <p style={{ ...body, fontSize: '14px', color: '#8A3030', marginBottom: '16px' }}>
          {error}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
        {!locked && (
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              ...sc, fontSize: '14px', letterSpacing: '0.14em',
              padding: '12px 24px', borderRadius: '40px', cursor: saving ? 'not-allowed' : 'pointer',
              background: '#C8922A', border: '1.5px solid rgba(168,114,26,0.8)',
              color: '#FFFFFF', opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Send invitation'}
          </button>
        )}

        {isEdit && !existingBilateral?.party_b_consent && (
          <button
            onClick={handleWithdraw}
            disabled={saving}
            style={{
              ...sc, fontSize: '14px', letterSpacing: '0.14em',
              padding: '12px 24px', borderRadius: '40px', cursor: 'pointer',
              background: 'rgba(138,48,48,0.05)',
              border: '1.5px solid rgba(138,48,48,0.40)',
              color: '#8A3030',
            }}
          >
            Withdraw invitation
          </button>
        )}

        {onClose && (
          <button
            onClick={onClose}
            style={{
              ...sc, fontSize: '14px', letterSpacing: '0.14em',
              padding: '12px 24px', borderRadius: '40px', cursor: 'pointer',
              background: 'transparent',
              border: '1px solid rgba(15,21,35,0.25)',
              color: 'rgba(15,21,35,0.55)',
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
