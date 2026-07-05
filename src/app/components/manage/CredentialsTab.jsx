// src/app/components/manage/CredentialsTab.jsx
//
// CRUD for actor_credentials. Owner-only — mounted only when the current
// user owns the profile. The credentials primitive carries a kind enum
// so the same table serves practitioners (training, lineage) and
// orgs (certification, membership, license, award).

import { useState, useEffect } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import {
  body, sc, gold, dark,
  Label, Hint, Btn, TextInput, SelectInput,
} from '../OrgShared'

const KIND_OPTIONS = [
  { value: 'training',      label: 'Training' },
  { value: 'certification', label: 'Certification' },
  { value: 'membership',    label: 'Membership' },
  { value: 'license',       label: 'License' },
  { value: 'award',         label: 'Award' },
  { value: 'lineage',       label: 'Lineage' },
]

const KIND_HINT = {
  training:      'A course, certification programme, or apprenticeship.',
  certification: 'A formal certification (B-Corp, Fairtrade, regulatory).',
  membership:    'Belonging to a network, association, or peer body.',
  license:       'A license to operate or practice.',
  award:         'Recognition received.',
  lineage:       'The tradition the work comes from. For practitioners and practice-mode orgs.',
}

function CredentialRow({ credential, onSave, onDelete, toast }) {
  const [form, setForm] = useState({
    kind:        credential.kind,
    title:       credential.title,
    institution: credential.institution || '',
    year:        credential.year ?? '',
    url:         credential.url || '',
  })
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.title.trim()) { toast('Title is required'); return }
    setSaving(true)
    const payload = {
      kind:        form.kind,
      title:       form.title.trim(),
      institution: form.institution.trim() || null,
      year:        form.year === '' ? null : Number(form.year),
      url:         form.url.trim() || null,
    }
    const { error } = await supabase.from('actor_credentials')
      .update(payload).eq('id', credential.id)
    setSaving(false)
    if (error) { toast('Save failed: ' + error.message); return }
    toast('Credential saved')
    setEditing(false)
    onSave()
  }

  async function remove() {
    if (!window.confirm('Delete this credential?')) return
    const { error } = await supabase.from('actor_credentials')
      .delete().eq('id', credential.id)
    if (error) { toast('Delete failed: ' + error.message); return }
    toast('Credential removed')
    onDelete()
  }

  if (!editing) {
    return (
      <div style={{ borderLeft: '2px solid rgba(88,160,138,0.20)',
        paddingLeft: '18px', marginBottom: '14px',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: '14px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em',
            color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase',
            marginBottom: '4px' }}>
            {KIND_OPTIONS.find(k => k.value === credential.kind)?.label || credential.kind}
          </div>
          <div style={{ ...body, fontSize: '16px', color: dark,
            lineHeight: 1.4, marginBottom: '3px' }}>
            {credential.title}
          </div>
          {(credential.institution || credential.year) && (
            <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em',
              color: 'rgba(15,21,35,0.55)' }}>
              {credential.institution}
              {credential.institution && credential.year && ' · '}
              {credential.year}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button onClick={() => setEditing(true)}
            style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em',
              padding: '5px 12px', borderRadius: '40px', cursor: 'pointer',
              border: '1px solid rgba(88,160,138,0.30)',
              background: 'rgba(88,160,138,0.04)', color: gold }}>
            Edit
          </button>
          <button onClick={remove}
            style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em',
              padding: '5px 12px', borderRadius: '40px', cursor: 'pointer',
              border: '1px solid rgba(138,48,48,0.30)',
              background: 'rgba(138,48,48,0.04)', color: '#8A3030' }}>
            Remove
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'rgba(88,160,138,0.03)',
      border: '1px solid rgba(88,160,138,0.20)', borderRadius: '10px',
      padding: '20px', marginBottom: '14px',
      display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <Label>Kind</Label>
        <SelectInput value={form.kind} onChange={v => set('kind', v)}
          options={KIND_OPTIONS} />
        <Hint>{KIND_HINT[form.kind]}</Hint>
      </div>
      <div>
        <Label required>Title</Label>
        <TextInput value={form.title} onChange={v => set('title', v)}
          placeholder='e.g. "Certified Hakomi Practitioner"' />
      </div>
      <div>
        <Label>Institution / lineage</Label>
        <TextInput value={form.institution}
          onChange={v => set('institution', v)}
          placeholder='Where this came from' />
      </div>
      <div>
        <Label>Year</Label>
        <TextInput value={String(form.year)} onChange={v => set('year', v)}
          placeholder='YYYY' />
      </div>
      <div>
        <Label>Verification URL (optional)</Label>
        <Hint>A link to the credential record, if there is one.</Hint>
        <TextInput value={form.url} onChange={v => set('url', v)}
          placeholder='https://...' />
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <Btn onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Btn>
        <Btn variant='ghost' onClick={() => setEditing(false)} small>
          Cancel
        </Btn>
      </div>
    </div>
  )
}

function NewCredentialForm({ actorId, onCreate, toast }) {
  const [form, setForm] = useState({
    kind: 'training', title: '', institution: '', year: '', url: '',
  })
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function add() {
    if (!form.title.trim()) { toast('Title is required'); return }
    setSaving(true)
    const payload = {
      actor_id:    actorId,
      kind:        form.kind,
      title:       form.title.trim(),
      institution: form.institution.trim() || null,
      year:        form.year === '' ? null : Number(form.year),
      url:         form.url.trim() || null,
    }
    const { error } = await supabase.from('actor_credentials').insert(payload)
    setSaving(false)
    if (error) { toast('Add failed: ' + error.message); return }
    toast('Credential added')
    setForm({ kind: 'training', title: '', institution: '', year: '', url: '' })
    setOpen(false)
    onCreate()
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em',
          padding: '10px 22px', borderRadius: '40px', cursor: 'pointer',
          border: '1px dashed rgba(88,160,138,0.45)',
          background: 'rgba(88,160,138,0.04)', color: gold,
          marginTop: '8px' }}>
        + Add credential
      </button>
    )
  }

  return (
    <div style={{ background: 'rgba(88,160,138,0.03)',
      border: '1px solid rgba(88,160,138,0.20)', borderRadius: '10px',
      padding: '20px', marginTop: '8px',
      display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <Label>Kind</Label>
        <SelectInput value={form.kind} onChange={v => set('kind', v)}
          options={KIND_OPTIONS} />
        <Hint>{KIND_HINT[form.kind]}</Hint>
      </div>
      <div>
        <Label required>Title</Label>
        <TextInput value={form.title} onChange={v => set('title', v)}
          placeholder='e.g. "Certified Hakomi Practitioner"' />
      </div>
      <div>
        <Label>Institution / lineage</Label>
        <TextInput value={form.institution}
          onChange={v => set('institution', v)} placeholder='Where this came from' />
      </div>
      <div>
        <Label>Year</Label>
        <TextInput value={form.year} onChange={v => set('year', v)}
          placeholder='YYYY' />
      </div>
      <div>
        <Label>Verification URL (optional)</Label>
        <TextInput value={form.url} onChange={v => set('url', v)}
          placeholder='https://...' />
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <Btn onClick={add} disabled={saving}>
          {saving ? 'Adding…' : 'Add credential'}
        </Btn>
        <Btn variant='ghost' onClick={() => setOpen(false)} small>
          Cancel
        </Btn>
      </div>
    </div>
  )
}

export function CredentialsTab({ actorId, toast }) {
  const [credentials, setCredentials] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('actor_credentials')
      .select('*')
      .eq('actor_id', actorId)
      .order('sort_order')
      .order('created_at')
    setCredentials(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [actorId])

  if (loading) {
    return (
      <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)' }}>
        Loading…
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      <div style={{ background: 'rgba(88,160,138,0.04)',
        border: '1px solid rgba(88,160,138,0.18)',
        borderRadius: '10px', padding: '14px 18px' }}>
        <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.65)',
          lineHeight: 1.6, margin: 0 }}>
          Credentials are owner-curated. No tier or hierarchy is enforced —
          you choose what matters and in what order. Trainings and lineage
          fit practitioners; certifications, memberships, licenses, and
          awards fit organisations.
        </p>
      </div>

      {credentials.length === 0 && (
        <p style={{ ...body, fontSize: '15px',
          color: 'rgba(15,21,35,0.55)', fontStyle: 'italic' }}>
          No credentials yet.
        </p>
      )}

      {credentials.map(c => (
        <CredentialRow key={c.id} credential={c}
          onSave={load} onDelete={load} toast={toast} />
      ))}

      <NewCredentialForm actorId={actorId} onCreate={load} toast={toast} />

    </div>
  )
}
