// src/app/components/manage/TestimonialsTab.jsx
//
// CRUD for actor_testimonials. Owner-only. v1 source_mode is always
// 'owner_entered' — the practitioner writes the testimonial with the
// attribution they have permission to use. The requested-flow (where
// a client writes and approves their own) is deferred.

import { useState, useEffect } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import {
  body, sc, gold, dark,
  Label, Hint, Btn, TextInput, TextArea,
} from '../OrgShared'

function TestimonialRow({ testimonial, onSave, onDelete, toast }) {
  const [form, setForm] = useState({
    quote:       testimonial.quote,
    attribution: testimonial.attribution || '',
    context:     testimonial.context || '',
    featured:    !!testimonial.featured,
    active:      !!testimonial.active,
  })
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.quote.trim()) { toast('Quote is required'); return }
    setSaving(true)
    const payload = {
      quote:       form.quote.trim(),
      attribution: form.attribution.trim() || null,
      context:     form.context.trim() || null,
      featured:    form.featured,
      active:      form.active,
    }
    const { error } = await supabase.from('actor_testimonials')
      .update(payload).eq('id', testimonial.id)
    setSaving(false)
    if (error) { toast('Save failed: ' + error.message); return }
    toast('Testimonial saved')
    setEditing(false)
    onSave()
  }

  async function remove() {
    if (!window.confirm('Delete this testimonial?')) return
    const { error } = await supabase.from('actor_testimonials')
      .delete().eq('id', testimonial.id)
    if (error) { toast('Delete failed: ' + error.message); return }
    toast('Testimonial removed')
    onDelete()
  }

  if (!editing) {
    return (
      <div style={{ borderLeft: testimonial.featured
          ? '2px solid rgba(88,160,138,0.60)'
          : '2px solid rgba(88,160,138,0.20)',
        paddingLeft: '20px', marginBottom: '18px',
        opacity: testimonial.active ? 1 : 0.55 }}>

        <p style={{ ...body, fontSize: '15.5px',
          color: dark, lineHeight: 1.7, marginBottom: '10px',
          fontWeight: 400 }}>
          "{testimonial.quote}"
        </p>

        {(testimonial.attribution || testimonial.context) && (
          <div style={{ marginBottom: '10px' }}>
            {testimonial.attribution && (
              <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em',
                color: gold, textTransform: 'uppercase' }}>
                — {testimonial.attribution}
              </span>
            )}
            {testimonial.context && (
              <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em',
                color: 'rgba(15,21,35,0.55)', marginLeft: '10px' }}>
                {testimonial.context}
              </span>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px',
          alignItems: 'center', flexWrap: 'wrap' }}>
          {testimonial.featured && (
            <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.16em',
              color: gold, textTransform: 'uppercase',
              padding: '3px 10px', borderRadius: '40px',
              background: 'rgba(88,160,138,0.10)',
              border: '1px solid rgba(88,160,138,0.30)' }}>
              Featured
            </span>
          )}
          {!testimonial.active && (
            <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.16em',
              color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase',
              padding: '3px 10px', borderRadius: '40px',
              background: 'rgba(15,21,35,0.04)',
              border: '1px solid rgba(15,21,35,0.15)' }}>
              Hidden
            </span>
          )}
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
      padding: '20px', marginBottom: '18px',
      display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <Label required>Quote</Label>
        <Hint>The exact words. Add quote marks within if you want them — the public render adds outer quotes.</Hint>
        <TextArea value={form.quote} onChange={v => set('quote', v)}
          rows={4} placeholder='What they said' />
      </div>
      <div>
        <Label>Attribution</Label>
        <Hint>How you want to credit them. Full name, initials, role, "anonymous" — your call, with their permission.</Hint>
        <TextInput value={form.attribution}
          onChange={v => set('attribution', v)}
          placeholder='e.g. "Sarah H." or "A coaching client"' />
      </div>
      <div>
        <Label>Context (optional)</Label>
        <Hint>A short role or situation. "Tech founder", "Mother of three", "Recovery from burnout".</Hint>
        <TextInput value={form.context} onChange={v => set('context', v)}
          placeholder='Role or situation' />
      </div>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px',
          ...body, fontSize: '14px', color: dark, cursor: 'pointer' }}>
          <input type='checkbox' checked={form.featured}
            onChange={e => set('featured', e.target.checked)} />
          Featured (shows first)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px',
          ...body, fontSize: '14px', color: dark, cursor: 'pointer' }}>
          <input type='checkbox' checked={form.active}
            onChange={e => set('active', e.target.checked)} />
          Visible on profile
        </label>
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

function NewTestimonialForm({ actorId, onCreate, toast }) {
  const [form, setForm] = useState({
    quote: '', attribution: '', context: '',
    featured: false, active: true,
  })
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function add() {
    if (!form.quote.trim()) { toast('Quote is required'); return }
    setSaving(true)
    const payload = {
      actor_id:    actorId,
      quote:       form.quote.trim(),
      attribution: form.attribution.trim() || null,
      context:     form.context.trim() || null,
      featured:    form.featured,
      active:      form.active,
      source_mode: 'owner_entered',
    }
    const { error } = await supabase.from('actor_testimonials').insert(payload)
    setSaving(false)
    if (error) { toast('Add failed: ' + error.message); return }
    toast('Testimonial added')
    setForm({ quote: '', attribution: '', context: '', featured: false, active: true })
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
        + Add testimonial
      </button>
    )
  }

  return (
    <div style={{ background: 'rgba(88,160,138,0.03)',
      border: '1px solid rgba(88,160,138,0.20)', borderRadius: '10px',
      padding: '20px', marginTop: '8px',
      display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <Label required>Quote</Label>
        <TextArea value={form.quote} onChange={v => set('quote', v)}
          rows={4} placeholder='What they said' />
      </div>
      <div>
        <Label>Attribution</Label>
        <Hint>How you want to credit them. Their permission is yours to honour.</Hint>
        <TextInput value={form.attribution}
          onChange={v => set('attribution', v)}
          placeholder='e.g. "Sarah H." or "A coaching client"' />
      </div>
      <div>
        <Label>Context (optional)</Label>
        <TextInput value={form.context} onChange={v => set('context', v)}
          placeholder='Role or situation' />
      </div>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px',
          ...body, fontSize: '14px', color: dark, cursor: 'pointer' }}>
          <input type='checkbox' checked={form.featured}
            onChange={e => set('featured', e.target.checked)} />
          Featured (shows first)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px',
          ...body, fontSize: '14px', color: dark, cursor: 'pointer' }}>
          <input type='checkbox' checked={form.active}
            onChange={e => set('active', e.target.checked)} />
          Visible on profile
        </label>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <Btn onClick={add} disabled={saving}>
          {saving ? 'Adding…' : 'Add testimonial'}
        </Btn>
        <Btn variant='ghost' onClick={() => setOpen(false)} small>
          Cancel
        </Btn>
      </div>
    </div>
  )
}

export function TestimonialsTab({ actorId, toast }) {
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    // Owners read all their testimonials including inactive via RLS policy.
    const { data } = await supabase
      .from('actor_testimonials')
      .select('*')
      .eq('actor_id', actorId)
      .order('featured', { ascending: false })
      .order('sort_order')
      .order('created_at', { ascending: false })
    setTestimonials(data || [])
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      <div style={{ background: 'rgba(88,160,138,0.04)',
        border: '1px solid rgba(88,160,138,0.18)',
        borderRadius: '10px', padding: '14px 18px' }}>
        <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.65)',
          lineHeight: 1.6, margin: 0 }}>
          You write the testimonial with the attribution you have permission
          to use. The platform trusts you to be honest about whose words these
          are. Featured testimonials show first; hidden testimonials stay on
          this page but don't render publicly.
        </p>
      </div>

      {testimonials.length === 0 && (
        <p style={{ ...body, fontSize: '15px',
          color: 'rgba(15,21,35,0.55)' }}>
          No testimonials yet.
        </p>
      )}

      {testimonials.map(t => (
        <TestimonialRow key={t.id} testimonial={t}
          onSave={load} onDelete={load} toast={toast} />
      ))}

      <NewTestimonialForm actorId={actorId} onCreate={load} toast={toast} />

    </div>
  )
}
