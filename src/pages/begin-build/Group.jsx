// src/pages/begin-build/Group.jsx
//
// /begin/build/group — for makers bringing a formation (group, cohort,
// circle, collective, team). The destination surface is being built;
// for now this captures into nextus_waitlist with source='begin_build_group'
// and the seven fields stored as JSON in `note`. When the group surface
// ships in Phase 3, a migration script reads these rows and creates
// proper group records. No new schema migration needed today.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import { supabase } from '../../hooks/useSupabase'
import {
  PageShell, PageHeader, Beats, PreFormLine, CloserAndSubmit,
  Field, Label, Hint, TextInput, TextArea, SelectInput, LinkList,
  COMMON_EMPTY, SCALE_OPTIONS, SHARED_OPENER, SHARED_CLOSER,
  BODY, SC, SERIF, GOLD, DARK, PARCH, cleanLinks,
} from './shared.jsx'

const FORMATION_TYPES = [
  { value: '',           label: '— What kind of formation? —' },
  { value: 'group',      label: 'Group' },
  { value: 'cohort',     label: 'Cohort' },
  { value: 'circle',     label: 'Circle' },
  { value: 'collective', label: 'Collective' },
  { value: 'team',       label: 'Team' },
  { value: 'other',      label: 'Other' },
]

const EMPTY = {
  ...COMMON_EMPTY,
  your_role:        '',
  formation_name:   '',
  formation_type:   '',
}

export function BeginBuildGroupPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e) {
    e?.preventDefault?.()
    if (!form.your_email.trim())     { setError('Your email is required.'); return }
    if (!form.formation_name.trim()) { setError('The formation needs a name.'); return }
    if (!form.what_they_do.trim())   { setError('Tell us what the formation does.'); return }

    setSaving(true)
    setError(null)

    // Store the seven fields plus formation specifics as JSON in `note`.
    // When the group surface ships, the migration script parses this.
    const payload = {
      your_name:       form.your_name.trim(),
      your_role:       form.your_role.trim(),
      formation_name:  form.formation_name.trim(),
      formation_type:  form.formation_type,
      what_they_do:    form.what_they_do.trim(),
      where:           form.where.trim(),
      scale:           form.scale,
      who_it_impacts:  form.who_it_impacts.trim(),
      scale_of_impact: form.scale_of_impact.trim(),
      accomplish:      form.accomplish.trim(),
      need_or_offering: form.need_or_offering.trim(),
      website:         form.website.trim(),
      links:           cleanLinks(form.links),
    }

    const { error: saveError } = await supabase.from('nextus_waitlist').insert({
      email:  form.your_email.trim(),
      source: 'begin_build_group',
      note:   JSON.stringify(payload),
    })

    setSaving(false)

    if (saveError) {
      setError('Something went wrong. Please try again.')
      return
    }

    setDone(true)
  }

  // ── Success state ─────────────────────────────────────────────
  if (done) {
    return (
      <>
        <Nav />
        <PageShell>
          <div style={{ paddingTop: '40px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: 'rgba(42,107,58,0.10)', border: '1.5px solid rgba(42,107,58,0.40)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px',
            }}>
              <span style={{ color: '#2A6B3A', fontSize: '22px' }}>&#10003;</span>
            </div>

            <h2 style={{ ...SERIF, fontSize: '32px', fontWeight: 300, color: DARK, lineHeight: 1.15, margin: '0 0 20px' }}>
              Got it. The formation is registered.
            </h2>

            <p style={{ ...BODY, fontSize: '17px', fontWeight: 300, color: 'rgba(15,21,35,0.78)', lineHeight: 1.7, margin: '0 0 18px' }}>
              The group surface is being built now. We'll be in touch as it lands — and the people who came in this early will hear from us first.
            </p>

            <p style={{ ...BODY, fontSize: '17px', fontWeight: 300, color: 'rgba(15,21,35,0.78)', lineHeight: 1.7, margin: '0 0 40px' }}>
              In the meantime, if there's a person in your formation we should know about, point us toward them. Their work is part of yours.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => navigate('/begin/build/practice')}
                style={{ ...SC, fontSize: '13px', letterSpacing: '0.14em', padding: '12px 24px', borderRadius: '40px', border: 'none', background: '#6E7F5C', color: '#FFFFFF', cursor: 'pointer' }}>
                Bring another person  →
              </button>
              <button onClick={() => { setForm(EMPTY); setDone(false) }}
                style={{ ...SC, fontSize: '13px', letterSpacing: '0.14em', padding: '12px 24px', borderRadius: '40px', border: '1.5px solid rgba(110,127,92,0.78)', background: 'rgba(110,127,92,0.05)', color: GOLD, cursor: 'pointer' }}>
                Bring another formation  →
              </button>
              <button onClick={() => navigate('/')}
                style={{ ...SC, fontSize: '13px', letterSpacing: '0.14em', padding: '12px 24px', borderRadius: '40px', border: '1px solid rgba(15,21,35,0.55)', background: 'transparent', color: 'rgba(15,21,35,0.65)', cursor: 'pointer' }}>
                Back to home
              </button>
            </div>
          </div>
        </PageShell>
        <SiteFooter />
      </>
    )
  }

  // ── Form state ────────────────────────────────────────────────
  return (
    <>
      <Nav />
      <PageShell>
        <PageHeader
          eyebrow="For makers · Formation"
          title="You're bringing a formation."
          opener={SHARED_OPENER}
          sub="A group, a circle, a cohort, a collective — people who do something together that none of them could do alone. The platform's group surface is being built right now. The first formations through the door shape what it becomes."
        />

        <Beats items={[
          'A surface for running your formation through the same tools the rest of the platform uses — Map, Target Stretch, the architecture you already trust for individuals, scaled to a group.',
          'A way for the formation to be visible as a formation. Not seven individual profiles tagged with the same hashtag. One coordinate, with the people inside it.',
          "A direct line to us as we build it. The formations who come in early get to push back, ask for what's missing, and shape what ships.",
        ]} />

        <PreFormLine>
          Tell us what you've got. We'll be in touch as the surface lands.
        </PreFormLine>

        <form onSubmit={submit}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field>
              <Label>Your name</Label>
              <TextInput value={form.your_name} onChange={v => set('your_name', v)} placeholder="Name" />
            </Field>
            <Field>
              <Label required>Your email</Label>
              <TextInput value={form.your_email} onChange={v => set('your_email', v)} placeholder="email@example.com" type="email" />
            </Field>
          </div>

          <Field>
            <Label>Your role in the formation</Label>
            <TextInput value={form.your_role} onChange={v => set('your_role', v)} placeholder="Founder, facilitator, member, organiser…" />
          </Field>

          <Field>
            <Label required>Name of the formation</Label>
            <TextInput value={form.formation_name} onChange={v => set('formation_name', v)} placeholder="What it's called" />
          </Field>

          <Field>
            <Label>What kind of formation</Label>
            <SelectInput value={form.formation_type} onChange={v => set('formation_type', v)} options={FORMATION_TYPES} />
          </Field>

          <Field>
            <Label required>What you do</Label>
            <Hint>The work the formation is built around.</Hint>
            <TextArea value={form.what_they_do} onChange={v => set('what_they_do', v)} placeholder="We…" rows={4} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field>
              <Label>Where you do it</Label>
              <Hint>In person, distributed, hybrid; geography if it matters.</Hint>
              <TextInput value={form.where} onChange={v => set('where', v)} placeholder="" />
            </Field>
            <Field>
              <Label>Scale</Label>
              <Hint>Size of formation, reach of work.</Hint>
              <SelectInput value={form.scale} onChange={v => set('scale', v)} options={SCALE_OPTIONS} />
            </Field>
          </div>

          <Field>
            <Label>Who it impacts</Label>
            <TextArea value={form.who_it_impacts} onChange={v => set('who_it_impacts', v)} placeholder="" rows={3} />
          </Field>

          <Field>
            <Label>Scale of impact</Label>
            <TextArea value={form.scale_of_impact} onChange={v => set('scale_of_impact', v)} placeholder="" rows={3} />
          </Field>

          <Field>
            <Label>What you're trying to accomplish</Label>
            <TextArea value={form.accomplish} onChange={v => set('accomplish', v)} placeholder="" rows={3} />
          </Field>

          <Field>
            <Label>What you need or are offering</Label>
            <Hint>What would help, what you'd contribute back.</Hint>
            <TextArea value={form.need_or_offering} onChange={v => set('need_or_offering', v)} placeholder="" rows={3} />
          </Field>

          <Field>
            <Label>Website</Label>
            <TextInput value={form.website} onChange={v => set('website', v)} placeholder="https://…" type="url" />
          </Field>

          <Field>
            <Label>Social, podcast, or other links</Label>
            <Hint>Optional. Add as many as are useful.</Hint>
            <LinkList value={form.links} onChange={v => set('links', v)} />
          </Field>

          <CloserAndSubmit
            saving={saving}
            error={error}
            submitLabel="Save your place  →"
            onSubmit={submit}
          />
        </form>
      </PageShell>
      <SiteFooter />
    </>
  )
}
