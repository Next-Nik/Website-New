// src/pages/begin-build/Practice.jsx
//
// /begin/build/practice — for makers bringing a practice (coaching,
// facilitation, somatic work, ritual, teaching, etc.). Captures the
// universal seven plus links, then hands off to /beta/profile/edit?tab=offering
// with the data passed via location.state.prefill.
//
// One form, no branching. Logged-in vs new-user logic happens at the
// destination — the destination page reads the prefill, opens the
// offering tab, and either pre-fills empty fields or surfaces an
// auth gate before applying the prefill. That's not this page's job.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import {
  PageShell, PageHeader, Beats, PreFormLine, CloserAndSubmit,
  Field, Label, Hint, TextInput, TextArea, SelectInput, LinkList,
  COMMON_EMPTY, SHARED_OPENER, cleanLinks,
} from './shared.jsx'

const EMPTY = {
  ...COMMON_EMPTY,
}

const PRACTICE_SCALES = [
  { value: '',                label: '— Select scale —' },
  { value: 'one-to-one',      label: 'One to one' },
  { value: 'small-group',     label: 'Small group' },
  { value: 'cohort',          label: 'Cohort' },
  { value: 'public',          label: 'Public' },
  { value: 'mixed',           label: 'Mixed' },
]

const PRACTICE_WHERE = [
  { value: '',         label: '— Where do you work? —' },
  { value: 'in-person', label: 'In person' },
  { value: 'online',    label: 'Online' },
  { value: 'hybrid',    label: 'Hybrid' },
]

export function BeginBuildPracticePage() {
  const navigate = useNavigate()
  const [form, setForm]   = useState({ ...EMPTY, where_mode: '', where_geo: '' })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function submit(e) {
    e?.preventDefault?.()
    if (!form.your_email.trim())  { setError('Your email is required.'); return }
    if (!form.your_name.trim())   { setError('Your name is required.'); return }
    if (!form.what_they_do.trim()){ setError('Tell us what you do.'); return }

    setSaving(true)
    setError(null)

    // Compose a single "what I am offering" string for the destination's
    // count_on_me_for field. Granular data passes through under _begin_build.
    const offeringText = composeOffering(form)
    const whereCombined = [form.where_mode, form.where_geo].filter(Boolean).join(' · ')

    const prefill = {
      // Maps to ProfileEdit's contributor_profiles_beta shape.
      display_name:    form.your_name.trim(),
      headline:        form.what_they_do.trim().split('\n')[0].slice(0, 120),
      count_on_me_for: offeringText,
      _begin_build: {
        your_email:       form.your_email.trim(),
        what_you_do:      form.what_they_do.trim(),
        where:            whereCombined,
        who:              form.who_it_impacts.trim(),
        scale:            form.scale,
        change:           form.accomplish.trim(),
        offering:         form.need_or_offering.trim(),
        website:          form.website.trim(),
        links:            cleanLinks(form.links),
      },
    }

    navigate('/profile/edit?tab=offering', { state: { prefill } })
  }

  return (
    <>
      <Nav />
      <PageShell>
        <PageHeader
          eyebrow="For makers · Practice"
          title="You're bringing a practice."
          opener={SHARED_OPENER}
          sub="Coaching, facilitation, somatic work, ritual, teaching — whatever shape your practice takes, it's a way you offer yourself to the work. The platform's job is to make you findable to the people who need exactly what you do."
        />

        <Beats items={[
          'Your practice lands inside a profile that already knows who you are as a person — not a directory listing scraped from a bio. The work emerges from the practitioner.',
          'Your offering gets placed across the same seven domains everyone else uses. Someone working on Connection finds you because you actually work in Connection. Findability comes from fit, not from how loud you are.',
          'Visibility is yours to control. Everything is private until you turn it on. You decide what the world sees.',
        ]} />

        <PreFormLine>
          Tell us about the practice. The detail goes on your profile; this is the shape of it.
        </PreFormLine>

        <form onSubmit={submit}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field>
              <Label required>Your name</Label>
              <TextInput value={form.your_name} onChange={v => set('your_name', v)} placeholder="Name" />
            </Field>
            <Field>
              <Label required>Your email</Label>
              <TextInput value={form.your_email} onChange={v => set('your_email', v)} placeholder="email@example.com" type="email" />
            </Field>
          </div>

          <Field>
            <Label required>What you do</Label>
            <Hint>The practice itself — modality, approach, the actual work.</Hint>
            <TextArea value={form.what_they_do} onChange={v => set('what_they_do', v)} placeholder="I work with…" rows={4} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field>
              <Label>Where you do it</Label>
              <SelectInput value={form.where_mode} onChange={v => set('where_mode', v)} options={PRACTICE_WHERE} />
            </Field>
            <Field>
              <Label>Geography</Label>
              <Hint>If it matters.</Hint>
              <TextInput value={form.where_geo} onChange={v => set('where_geo', v)} placeholder="City, country, region" />
            </Field>
          </div>

          <Field>
            <Label>Who you work with</Label>
            <Hint>The people you're for.</Hint>
            <TextArea value={form.who_it_impacts} onChange={v => set('who_it_impacts', v)} placeholder="" rows={3} />
          </Field>

          <Field>
            <Label>Scale</Label>
            <SelectInput value={form.scale} onChange={v => set('scale', v)} options={PRACTICE_SCALES} />
          </Field>

          <Field>
            <Label>What you're trying to do for them</Label>
            <Hint>The change you help make possible.</Hint>
            <TextArea value={form.accomplish} onChange={v => set('accomplish', v)} placeholder="" rows={3} />
          </Field>

          <Field>
            <Label>What you're offering</Label>
            <Hint>Format, mediums, the headline of how someone engages you.</Hint>
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
            submitLabel="Continue  →"
            onSubmit={submit}
          />

          <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '13px', color: 'rgba(15,21,35,0.45)', lineHeight: 1.55, textAlign: 'center', marginTop: '12px', fontStyle: 'italic' }}>
            Continue on your profile — your offering tab is where the rest gets built. You can refine, control visibility, and add depth at your own pace.
          </p>
        </form>
      </PageShell>
      <SiteFooter />
    </>
  )
}

// Compose the granular fields into a single "what I am offering" block
// for count_on_me_for. The destination still has the granular data
// under _begin_build for richer rendering later.
function composeOffering(f) {
  const parts = []
  if (f.what_they_do)     parts.push(f.what_they_do.trim())
  if (f.who_it_impacts)   parts.push(`I work with: ${f.who_it_impacts.trim()}`)
  if (f.accomplish)       parts.push(`What I help with: ${f.accomplish.trim()}`)
  if (f.need_or_offering) parts.push(`How to engage: ${f.need_or_offering.trim()}`)
  return parts.join('\n\n')
}
