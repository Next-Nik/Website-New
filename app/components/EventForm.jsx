// src/app/components/EventForm.jsx
//
// The Event create/edit form. Shared by the "new Event" flow and the
// "edit Event" flow. Returns the form state and a submit handler.
//
// Props:
//   actor        — the producing actor (required; owner is the user)
//   initial      — initial Event values (null for new)
//   onSubmitDone — (createdOrUpdated: nextus_events row) => void
//   toast        — function(msg)

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'
import {
  body, sc, gold, dark,
  DOMAIN_LIST,
  Label, Hint, TextInput, TextArea, SelectInput, Btn,
} from './OrgShared'
import { FocusSearch } from './FocusSearch'

const EMPTY_EVENT = {
  title:               '',
  description:         '',
  starts_at_local:     '',     // local datetime-input value
  ends_at_local:       '',
  timezone:            Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  recurrence_rule:     '',
  venue_id:            null,
  online_url:          '',
  event_types:         [],
  domain_placements:   [],     // [{ slug, is_primary }]
  primary_domain:      '',
  capacity:            '',
  ticket_url:          '',
  cover_image_url:     '',
  status:              'draft',
  visibility:          'public',
  was_historical:      false,
}

// ── Venue picker ─────────────────────────────────────────────
// Search-as-you-type over nextus_venues. Inline create when no match.

function VenuePicker({ value, onChange, focus }) {
  const [query,       setQuery]       = useState('')
  const [results,     setResults]     = useState([])
  const [selected,    setSelected]    = useState(value)
  const [showCreate,  setShowCreate]  = useState(false)
  const [createName,  setCreateName]  = useState('')
  const [createOnline, setCreateOnline] = useState(false)
  const [createFocus, setCreateFocus] = useState(focus || null)
  const [creating,    setCreating]    = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query || query.length < 2) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('nextus_venues')
        .select('*')
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(8)
      setResults(data || [])
    }, 200)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  function pick(v) {
    setSelected(v)
    setQuery('')
    setResults([])
    setShowCreate(false)
    onChange(v)
  }

  async function createNew() {
    if (!createName.trim()) return
    setCreating(true)
    const { data, error } = await supabase
      .from('nextus_venues')
      .insert({
        name:      createName.trim(),
        is_online: createOnline,
        focus_id:  createOnline ? null : (createFocus?.id || null),
      })
      .select()
      .single()
    setCreating(false)
    if (error) return
    pick(data)
    setCreateName('')
    setCreateOnline(false)
  }

  if (selected) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', background: 'rgba(168,114,26,0.06)',
        border: '1px solid rgba(200,146,42,0.30)', borderRadius: '8px',
      }}>
        <div>
          <div style={{ ...body, fontSize: '15px', color: dark }}>
            {selected.name}
          </div>
          {selected.is_online ? (
            <div style={{ fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>Online</div>
          ) : (
            selected.address && (
              <div style={{ fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>
                {selected.address}
              </div>
            )
          )}
        </div>
        <button
          type="button" onClick={() => { setSelected(null); onChange(null) }}
          style={{
            ...sc, fontSize: '13px', letterSpacing: '0.12em',
            color: gold, background: 'transparent', border: 'none',
            cursor: 'pointer', textTransform: 'uppercase',
          }}
        >
          Change
        </button>
      </div>
    )
  }

  return (
    <div>
      <TextInput value={query} onChange={setQuery} placeholder="Search venues — name, city…" />
      {results.length > 0 && (
        <div style={{
          marginTop: '6px', background: '#FFFFFF',
          border: '1px solid rgba(200,146,42,0.22)', borderRadius: '8px',
          maxHeight: '240px', overflowY: 'auto',
        }}>
          {results.map(v => (
            <button
              key={v.id} type="button" onClick={() => pick(v)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 14px', background: 'transparent',
                border: 'none', borderBottom: '1px solid rgba(200,146,42,0.10)',
                cursor: 'pointer', fontFamily: body.fontFamily, fontSize: '14px',
                color: dark,
              }}
            >
              <div>{v.name}</div>
              {v.address && (
                <div style={{ fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>
                  {v.address}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {query.length >= 2 && !showCreate && (
        <button
          type="button" onClick={() => { setShowCreate(true); setCreateName(query) }}
          style={{
            ...sc, fontSize: '13px', letterSpacing: '0.14em',
            color: gold, background: 'transparent', border: 'none',
            cursor: 'pointer', marginTop: '8px', textTransform: 'uppercase',
          }}
        >
          + Add "{query}" as a new venue
        </button>
      )}

      {showCreate && (
        <div style={{
          marginTop: '12px', padding: '14px',
          background: 'rgba(168,114,26,0.04)',
          border: '1px solid rgba(200,146,42,0.22)', borderRadius: '8px',
        }}>
          <Label>Venue name</Label>
          <TextInput value={createName} onChange={setCreateName} />
          <div style={{ marginTop: '12px' }}>
            <label style={{ ...body, fontSize: '13px', color: dark, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={createOnline} onChange={e => setCreateOnline(e.target.checked)} />
              This is an online venue
            </label>
          </div>
          {!createOnline && (
            <div style={{ marginTop: '12px' }}>
              <Label>City or area</Label>
              <FocusSearch value={createFocus} onChange={setCreateFocus} />
              <Hint>Pick the city or neighbourhood the venue is in. Optional.</Hint>
            </div>
          )}
          <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
            <Btn onClick={createNew} disabled={creating || !createName.trim()} small>
              {creating ? 'Creating…' : 'Create venue'}
            </Btn>
            <Btn onClick={() => setShowCreate(false)} variant="secondary" small>
              Cancel
            </Btn>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Event Type picker ───────────────────────────────────────
// Search canonical Event Types, allow proposing a new one inline.

function EventTypePicker({ selected, onChange }) {
  const [allTypes, setAllTypes] = useState([])
  const [query, setQuery]       = useState('')
  const [proposing, setProposing] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('nextus_event_types')
        .select('slug, label, is_canonical')
        .order('label')
      setAllTypes(data || [])
    }
    load()
  }, [])

  const lowerQ = query.toLowerCase().trim()
  const filtered = lowerQ
    ? allTypes.filter(t =>
        t.slug.includes(lowerQ) || t.label.toLowerCase().includes(lowerQ)
      ).filter(t => !selected.includes(t.slug)).slice(0, 8)
    : []

  function add(slug) {
    if (!selected.includes(slug)) onChange([...selected, slug])
    setQuery('')
  }

  function remove(slug) {
    onChange(selected.filter(s => s !== slug))
  }

  async function propose() {
    const candidate = query.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    if (!candidate) return
    if (allTypes.some(t => t.slug === candidate)) {
      add(candidate)
      return
    }
    setProposing(true)
    const { data, error } = await supabase
      .from('nextus_event_types')
      .insert({
        slug:         candidate,
        label:        query.trim(),
        is_canonical: false,
      })
      .select()
      .single()
    setProposing(false)
    if (error) {
      // race: another user proposed first. Try to fetch.
      const { data: existing } = await supabase
        .from('nextus_event_types')
        .select('*')
        .eq('slug', candidate)
        .single()
      if (existing) {
        setAllTypes(prev => prev.some(t => t.slug === candidate) ? prev : [...prev, existing])
        add(candidate)
      }
      return
    }
    setAllTypes(prev => [...prev, data])
    add(candidate)
  }

  return (
    <div>
      {/* Selected chips */}
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
          {selected.map(s => {
            const t = allTypes.find(x => x.slug === s)
            return (
              <span key={s} style={{
                ...sc, fontSize: '13px', letterSpacing: '0.12em',
                padding: '4px 10px', borderRadius: '40px',
                background: 'rgba(168,114,26,0.10)', color: gold,
                display: 'inline-flex', alignItems: 'center', gap: '8px',
              }}>
                {t?.label || s.replace(/-/g, ' ')}
                {t && !t.is_canonical && (
                  <span style={{ fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>
                    proposed
                  </span>
                )}
                <button
                  type="button" onClick={() => remove(s)}
                  style={{
                    background: 'transparent', border: 'none',
                    color: gold, cursor: 'pointer', padding: 0,
                    fontSize: '14px', lineHeight: 1,
                  }}
                  aria-label={`Remove ${s}`}
                >
                  ×
                </button>
              </span>
            )
          })}
        </div>
      )}

      <TextInput
        value={query}
        onChange={setQuery}
        placeholder="Search — storytelling, ecstatic dance, workshop…"
      />

      {filtered.length > 0 && (
        <div style={{
          marginTop: '6px', background: '#FFFFFF',
          border: '1px solid rgba(200,146,42,0.22)', borderRadius: '8px',
          maxHeight: '240px', overflowY: 'auto',
        }}>
          {filtered.map(t => (
            <button
              key={t.slug} type="button" onClick={() => add(t.slug)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 14px', background: 'transparent',
                border: 'none', borderBottom: '1px solid rgba(200,146,42,0.08)',
                cursor: 'pointer', fontFamily: body.fontFamily, fontSize: '14px',
                color: dark,
              }}
            >
              {t.label}
              {!t.is_canonical && (
                <span style={{
                  marginLeft: '8px', fontSize: '13px',
                  color: 'rgba(15,21,35,0.55)',
                }}>
                  proposed
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {lowerQ.length >= 2 && filtered.length === 0 && !allTypes.some(t => t.slug === lowerQ.replace(/\s+/g, '-')) && (
        <button
          type="button" onClick={propose} disabled={proposing}
          style={{
            ...sc, fontSize: '13px', letterSpacing: '0.14em',
            color: gold, background: 'transparent', border: 'none',
            cursor: 'pointer', marginTop: '8px', textTransform: 'uppercase',
          }}
        >
          {proposing ? 'Adding…' : `+ Propose "${query.trim()}" as a new Event Type`}
        </button>
      )}
    </div>
  )
}

// ── Domain placement picker (chips, with one primary) ────────

function DomainPlacementPicker({ placements, onChange, actorDomains = [] }) {
  function togglePresence(slug) {
    const exists = placements.some(p => p.slug === slug)
    if (exists) {
      const next = placements.filter(p => p.slug !== slug)
      // If we removed the primary, promote the first remaining to primary.
      if (placements.find(p => p.slug === slug)?.is_primary && next.length > 0) {
        next[0].is_primary = true
      }
      onChange(next)
    } else {
      const next = [...placements, { slug, is_primary: placements.length === 0 }]
      onChange(next)
    }
  }

  function setPrimary(slug) {
    onChange(placements.map(p => ({ ...p, is_primary: p.slug === slug })))
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {DOMAIN_LIST.map(d => {
          const placement = placements.find(p => p.slug === d.value)
          const on = !!placement
          const isPrimary = placement?.is_primary
          const isActorDomain = actorDomains.includes(d.value)
          return (
            <button
              key={d.value} type="button"
              onClick={() => togglePresence(d.value)}
              style={{
                ...sc, fontSize: '13px', letterSpacing: '0.12em',
                padding: '6px 14px', borderRadius: '40px', cursor: 'pointer',
                border: on
                  ? (isPrimary ? '2px solid rgba(200,146,42,0.78)' : '1.5px solid rgba(200,146,42,0.40)')
                  : '1.5px solid rgba(200,146,42,0.25)',
                background: on ? 'rgba(200,146,42,0.10)' : 'transparent',
                color: on ? gold : (isActorDomain ? 'rgba(168,114,26,0.62)' : 'rgba(15,21,35,0.55)'),
                position: 'relative',
              }}
            >
              {d.label}
              {isPrimary && (
                <span style={{
                  marginLeft: '6px', fontSize: '13px', fontWeight: 700,
                }}>
                  ★
                </span>
              )}
            </button>
          )
        })}
      </div>
      {placements.length > 1 && (
        <div style={{ marginTop: '10px' }}>
          <Label>Primary domain</Label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
            {placements.map(p => {
              const d = DOMAIN_LIST.find(x => x.value === p.slug)
              return (
                <button
                  key={p.slug} type="button" onClick={() => setPrimary(p.slug)}
                  style={{
                    ...sc, fontSize: '13px', letterSpacing: '0.12em',
                    padding: '4px 10px', borderRadius: '40px', cursor: 'pointer',
                    border: p.is_primary ? '1.5px solid rgba(200,146,42,0.78)' : '1.5px solid rgba(200,146,42,0.25)',
                    background: p.is_primary ? 'rgba(200,146,42,0.14)' : 'transparent',
                    color: p.is_primary ? gold : 'rgba(15,21,35,0.55)',
                  }}
                >
                  {p.is_primary && '★ '}{d?.label || p.slug}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main form ────────────────────────────────────────────────

export function EventForm({ actor, initial, onSubmitDone, toast }) {
  const { user } = useAuth()
  const [form, setForm]       = useState(EMPTY_EVENT)
  const [venue, setVenue]     = useState(null)
  const [actorDomains, setActorDomains] = useState([])
  const [saving, setSaving]   = useState(false)

  // Hydrate from initial Event (edit mode) or actor (create mode default placements)
  useEffect(() => {
    async function load() {
      // Actor primary/secondary domains
      const ad = [
        actor.primary_domain,
        ...(actor.secondary_domains || []),
      ].filter(Boolean)
      setActorDomains(ad)

      if (initial) {
        // Edit mode — load existing Event + its placements + its venue
        const { data: placements } = await supabase
          .from('nextus_event_domain_placements')
          .select('domain_slug, is_primary')
          .eq('event_id', initial.id)

        const dp = (placements || []).map(p => ({
          slug:       p.domain_slug,
          is_primary: p.is_primary,
        }))

        const { data: v } = initial.venue_id
          ? await supabase.from('nextus_venues').select('*').eq('id', initial.venue_id).single()
          : { data: null }
        setVenue(v || null)

        setForm({
          title:           initial.title || '',
          description:     initial.description || '',
          starts_at_local: initial.starts_at ? toLocalDatetimeInput(initial.starts_at) : '',
          ends_at_local:   initial.ends_at ? toLocalDatetimeInput(initial.ends_at) : '',
          timezone:        initial.timezone || EMPTY_EVENT.timezone,
          recurrence_rule: initial.recurrence_rule || '',
          venue_id:        initial.venue_id || null,
          online_url:      initial.online_url || '',
          event_types:     initial.event_types || [],
          domain_placements: dp,
          capacity:        initial.capacity ?? '',
          ticket_url:      initial.ticket_url || '',
          cover_image_url: initial.cover_image_url || '',
          status:          initial.status || 'draft',
          visibility:      initial.visibility || 'public',
          was_historical:  !!initial.was_historical,
        })
      } else {
        // Create mode — pre-fill placements from actor
        const dp = ad.map((slug, i) => ({ slug, is_primary: i === 0 }))
        setForm(prev => ({ ...prev, domain_placements: dp }))
      }
    }
    load()
  }, [initial, actor])

  function update(field, val) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  function toLocalDatetimeInput(iso) {
    const d = new Date(iso)
    // Format for datetime-local input (YYYY-MM-DDTHH:MM)
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  function localToIso(localStr, tz) {
    if (!localStr) return null
    // datetime-local has no timezone; we treat it as the chosen tz.
    // For storage we simply convert via Date (browser local). This is close
    // enough for v1; precise tz handling can be hardened later.
    return new Date(localStr).toISOString()
  }

  async function submit(targetStatus = null) {
    if (!form.title.trim()) {
      toast?.('Title is required.')
      return
    }
    if (form.domain_placements.length === 0) {
      toast?.('Pick at least one domain.')
      return
    }
    const finalStatus = targetStatus || form.status
    if (finalStatus === 'published' && form.event_types.length === 0) {
      toast?.('Pick at least one Event Type before publishing.')
      return
    }

    setSaving(true)

    const payload = {
      title:               form.title.trim(),
      description:         form.description.trim() || null,
      producer_actor_ids:  [actor.id],
      starts_at:           localToIso(form.starts_at_local),
      ends_at:             localToIso(form.ends_at_local),
      timezone:            form.timezone || null,
      recurrence_rule:     form.recurrence_rule.trim() || null,
      venue_id:            form.venue_id || null,
      online_url:          form.online_url.trim() || null,
      event_types:         form.event_types,
      capacity:            form.capacity === '' ? null : Number(form.capacity),
      ticket_url:          form.ticket_url.trim() || null,
      cover_image_url:     form.cover_image_url.trim() || null,
      status:              finalStatus,
      visibility:          form.visibility,
      was_historical:      form.was_historical,
      owner_id:            user.id,
      updated_at:          new Date().toISOString(),
    }

    let savedEvent
    if (initial) {
      const { data, error } = await supabase
        .from('nextus_events')
        .update(payload)
        .eq('id', initial.id)
        .select()
        .single()
      if (error) {
        toast?.('Could not save: ' + error.message)
        setSaving(false)
        return
      }
      savedEvent = data
    } else {
      const { data, error } = await supabase
        .from('nextus_events')
        .insert({
          ...payload,
          seeded_by: 'self',
        })
        .select()
        .single()
      if (error) {
        toast?.('Could not save: ' + error.message)
        setSaving(false)
        return
      }
      savedEvent = data
    }

    // Reconcile domain placements
    await supabase
      .from('nextus_event_domain_placements')
      .delete()
      .eq('event_id', savedEvent.id)

    if (form.domain_placements.length > 0) {
      await supabase
        .from('nextus_event_domain_placements')
        .insert(form.domain_placements.map(p => ({
          event_id:    savedEvent.id,
          domain_slug: p.slug,
          is_primary:  !!p.is_primary,
        })))
    }

    setSaving(false)
    toast?.(initial ? 'Event saved.' : 'Event created.')
    onSubmitDone?.(savedEvent)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div>
        <Label required>Title</Label>
        <TextInput
          value={form.title}
          onChange={v => update('title', v)}
          placeholder="Cuéntame Story Slam — November"
        />
      </div>

      {/* Description */}
      <div>
        <Label>Description</Label>
        <TextArea
          value={form.description}
          onChange={v => update('description', v)}
          placeholder="Two sentences: what happens, plus the signal of specificity."
          rows={3}
        />
        <Hint>
          Sentence one: what happens in plain language. Sentence two: the concrete
          detail that makes the Event honest (theme, format, who it's for).
        </Hint>
      </div>

      {/* Time */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div>
          <Label>Starts</Label>
          <input
            type="datetime-local"
            value={form.starts_at_local}
            onChange={e => update('starts_at_local', e.target.value)}
            style={{
              ...body, fontSize: '15px', color: dark, padding: '10px 14px',
              borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)',
              background: '#FFFFFF', outline: 'none', width: '100%', boxSizing: 'border-box',
            }}
          />
        </div>
        <div>
          <Label>Ends</Label>
          <input
            type="datetime-local"
            value={form.ends_at_local}
            onChange={e => update('ends_at_local', e.target.value)}
            style={{
              ...body, fontSize: '15px', color: dark, padding: '10px 14px',
              borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)',
              background: '#FFFFFF', outline: 'none', width: '100%', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>
      <div>
        <Label>Timezone</Label>
        <TextInput
          value={form.timezone}
          onChange={v => update('timezone', v)}
          placeholder="America/Mexico_City"
        />
        <Hint>IANA timezone name. Defaults to your browser's timezone.</Hint>
      </div>

      {/* Recurrence */}
      <div>
        <Label>Recurrence (optional)</Label>
        <TextInput
          value={form.recurrence_rule}
          onChange={v => update('recurrence_rule', v)}
          placeholder="FREQ=MONTHLY;BYDAY=2SU"
        />
        <Hint>
          iCal RRULE for recurring Events. Leave blank for one-offs. Examples:
          <br/>· <code>FREQ=MONTHLY;BYDAY=2SU</code> — second Sunday each month
          <br/>· <code>FREQ=WEEKLY;BYDAY=TH</code> — every Thursday
        </Hint>
      </div>

      {/* Venue */}
      <div>
        <Label>Venue</Label>
        <VenuePicker value={venue} onChange={v => { setVenue(v); update('venue_id', v?.id || null) }} />
        <Hint>The place this happens. Pick existing or add a new venue inline.</Hint>
      </div>

      {/* Online URL */}
      <div>
        <Label>Online URL (optional)</Label>
        <TextInput
          value={form.online_url}
          onChange={v => update('online_url', v)}
          placeholder="https://zoom.us/…"
        />
      </div>

      {/* Event Types */}
      <div>
        <Label required>Event Types</Label>
        <EventTypePicker
          selected={form.event_types}
          onChange={v => update('event_types', v)}
        />
        <Hint>
          What kind of Event is this? Pick one or more. Tags here are how people
          search — "ecstatic dance", "storytelling", "workshop".
        </Hint>
      </div>

      {/* Domain placements */}
      <div>
        <Label required>Domain placements</Label>
        <DomainPlacementPicker
          placements={form.domain_placements}
          onChange={v => update('domain_placements', v)}
          actorDomains={actorDomains}
        />
        <Hint>
          Which civilisational domains does this Event live in? Pre-filled from
          {' '}{actor?.name || 'the producer'}'s domains. Mark one as primary.
        </Hint>
      </div>

      {/* Operational */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div>
          <Label>Capacity</Label>
          <TextInput
            value={form.capacity}
            onChange={v => update('capacity', v)}
            placeholder="Optional"
            type="number"
          />
        </div>
        <div>
          <Label>Ticket URL</Label>
          <TextInput
            value={form.ticket_url}
            onChange={v => update('ticket_url', v)}
            placeholder="https://…"
          />
        </div>
      </div>
      <div>
        <Label>Cover image URL</Label>
        <TextInput
          value={form.cover_image_url}
          onChange={v => update('cover_image_url', v)}
          placeholder="https://…"
        />
      </div>

      {/* Visibility */}
      <div>
        <Label>Visibility</Label>
        <SelectInput
          value={form.visibility}
          onChange={v => update('visibility', v)}
          options={[
            { value: 'public',   label: 'Public — shown to everyone' },
            { value: 'unlisted', label: 'Unlisted — only with the link' },
            { value: 'private',  label: 'Private — only you' },
          ]}
        />
      </div>

      {/* Historical flag */}
      <div>
        <label style={{ ...body, fontSize: '14px', color: dark, display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.was_historical}
            onChange={e => update('was_historical', e.target.checked)}
            style={{ marginTop: '3px' }}
          />
          <span>
            <strong>This is a historical Event</strong>
            <div style={{ fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginTop: '2px' }}>
              Tick this when seeding past Events for archival completeness — old tour
              stops, past Story Slams, last year's gatherings. Past Events from this year
              will be sorted accordingly without this flag.
            </div>
          </span>
        </label>
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex', gap: '10px', flexWrap: 'wrap',
        paddingTop: '16px', borderTop: '1px solid rgba(200,146,42,0.20)',
      }}>
        <Btn onClick={() => submit('published')} disabled={saving}>
          {saving ? 'Saving…' : (initial && form.status === 'published' ? 'Save' : 'Publish')}
        </Btn>
        <Btn onClick={() => submit('draft')} variant="secondary" disabled={saving}>
          {initial && form.status === 'draft' ? 'Save draft' : 'Save as draft'}
        </Btn>
        {initial && form.status === 'published' && (
          <Btn onClick={() => submit('cancelled')} variant="secondary" disabled={saving}>
            Cancel Event
          </Btn>
        )}
      </div>
    </div>
  )
}

export default EventForm
