// src/tools/planet/ActorClaimGate.jsx
// Tool-first registration: fires when authenticated user has no actor record
// Three actor types: org, practice, group (mirrors /begin/build pages)
// On completion: creates nextus_actors record, calls onClaimed(actor)

import { useState } from 'react'
import { supabase } from '../../hooks/useSupabase'
import { serif, body, sc } from '../../lib/designTokens'

const ACTOR_TYPES = [
  {
    key: 'individual',
    label: 'Individual',
    description: 'Practitioner, thinker, leader, activist. One person working in the world.',
  },
  {
    key: 'organisation',
    label: 'Organisation',
    description: 'NGO, company, institution, agency. A registered entity with a mission.',
  },
  {
    key: 'group',
    label: 'Group or Movement',
    description: 'Collective, coalition, network, or community. Organised but not a formal entity.',
  },
  {
    key: 'nation',
    label: 'Nation or Government',
    description: 'A country, city, region, or governmental body.',
  },
]

export function ActorClaimGate({ user, onClaimed, onBack }) {
  const [actorType, setActorType]   = useState(null)
  const [name, setName]             = useState('')
  const [website, setWebsite]       = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState(null)

  async function handleCreate() {
    if (!actorType || !name.trim()) {
      setError('Please select a type and enter a name.')
      return
    }
    setSaving(true)
    setError(null)

    try {
      const { data, error: err } = await supabase
        .from('nextus_actors')
        .insert({
          name:          name.trim(),
          actor_type:    actorType,
          website:       website.trim() || null,
          claimed_by:    user.id,
          vetting_status: 'self_registered',
          seeded_by:     'self',
          created_at:    new Date().toISOString(),
        })
        .select()
        .single()

      if (err) throw err
      onClaimed(data)
    } catch (err) {
      console.error('ActorClaimGate: failed to create actor', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '60px 24px 120px' }}>
      {/* Back */}
      <button
        onClick={onBack}
        style={{
          ...sc,
          fontSize: 13,
          letterSpacing: '0.08em',
          color: '#A8721A',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          marginBottom: 40,
        }}
      >
        ← Back
      </button>

      <p style={{
        ...sc,
        fontSize: 13,
        letterSpacing: '0.12em',
        color: '#A8721A',
        textTransform: 'uppercase',
        marginBottom: 12,
      }}>
        Before you begin
      </p>

      <h2 style={{
        ...serif,
        fontSize: 'clamp(28px, 4vw, 38px)',
        fontWeight: 300,
        color: '#0F1523',
        marginBottom: 16,
      }}>
        Who are you assessing?
      </h2>

      <p style={{
        ...body,
        fontSize: 16,
        color: 'rgba(15,21,35,0.72)',
        lineHeight: 1.65,
        marginBottom: 40,
      }}>
        The assessment lives on an actor record. Tell us who this is — you can update the details later.
      </p>

      {/* Actor type selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
        {ACTOR_TYPES.map(type => (
          <button
            key={type.key}
            onClick={() => setActorType(type.key)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              padding: '16px 20px',
              background: actorType === type.key ? 'rgba(200,146,42,0.06)' : '#FFFFFF',
              border: `1.5px solid ${actorType === type.key ? '#C8922A' : 'rgba(200,146,42,0.20)'}`,
              borderRadius: 6,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ ...sc, fontSize: 13, letterSpacing: '0.08em', color: actorType === type.key ? '#A8721A' : '#0F1523' }}>
              {type.label}
            </span>
            <span style={{ ...body, fontSize: 13, color: 'rgba(15,21,35,0.72)' }}>
              {type.description}
            </span>
          </button>
        ))}
      </div>

      {/* Name */}
      <div style={{ marginBottom: 16 }}>
        <label style={{
          ...sc,
          fontSize: 13,
          letterSpacing: '0.08em',
          color: 'rgba(15,21,35,0.55)',
          display: 'block',
          marginBottom: 6,
        }}>
          Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="The name this actor is known by"
          style={{
            ...body,
            fontSize: 15,
            width: '100%',
            padding: '12px 14px',
            background: '#FAFAF7',
            border: '1px solid rgba(200,146,42,0.20)',
            borderRadius: 4,
            color: '#0F1523',
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
      </div>

      {/* Website */}
      <div style={{ marginBottom: 32 }}>
        <label style={{
          ...sc,
          fontSize: 13,
          letterSpacing: '0.08em',
          color: 'rgba(15,21,35,0.55)',
          display: 'block',
          marginBottom: 6,
        }}>
          Website (optional)
        </label>
        <input
          type="text"
          value={website}
          onChange={e => setWebsite(e.target.value)}
          placeholder="https://"
          style={{
            ...body,
            fontSize: 15,
            width: '100%',
            padding: '12px 14px',
            background: '#FAFAF7',
            border: '1px solid rgba(200,146,42,0.20)',
            borderRadius: 4,
            color: '#0F1523',
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
      </div>

      {error && (
        <p style={{ ...body, fontSize: 14, color: '#C0392B', marginBottom: 20 }}>
          {error}
        </p>
      )}

      <button
        onClick={handleCreate}
        disabled={saving || !actorType || !name.trim()}
        style={{
          ...sc,
          fontSize: 13,
          letterSpacing: '0.1em',
          background: actorType && name.trim() ? '#C8922A' : 'rgba(200,146,42,0.3)',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 4,
          padding: '14px 32px',
          cursor: actorType && name.trim() ? 'pointer' : 'not-allowed',
        }}
      >
        {saving ? 'Creating…' : 'Continue to assessment →'}
      </button>

      <p style={{
        ...body,
        fontSize: 13,
        color: 'rgba(15,21,35,0.55)',
        marginTop: 16,
        lineHeight: 1.5,
      }}>
        This creates a record in the NextUs Atlas. You can update the full profile later.
      </p>
    </div>
  )
}
