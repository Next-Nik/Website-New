// src/pages/begin-build/Org.jsx
//
// /begin/build/org — for makers bringing an organisation. Captures the
// universal seven plus links, then hands off to /beta/nominate with the
// data passed via location.state.prefill. The destination form is the
// only thing that writes to the database.
//
// Self-nomination and third-party nomination are both honoured here.
// The recognition copy treats them as equally real contributions.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import {
  PageShell, PageHeader, Beats, PreFormLine, CloserAndSubmit,
  Field, Label, Hint, TextInput, TextArea, SelectInput, LinkList,
  COMMON_EMPTY, SCALE_OPTIONS, SHARED_OPENER, cleanLinks,
} from './shared.jsx'

const EMPTY = {
  ...COMMON_EMPTY,
  bringing:   'self',     // 'self' | 'nominating'
  org_name:   '',
}

export function BeginBuildOrgPage() {
  const navigate = useNavigate()
  const [form, setForm]   = useState(EMPTY)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function submit(e) {
    e?.preventDefault?.()
    if (!form.your_email.trim())  { setError('Your email is required.'); return }
    if (!form.org_name.trim())    { setError('Name of the organisation is required.'); return }
    if (!form.what_they_do.trim()){ setError('Tell us what they do.'); return }

    setSaving(true)
    setError(null)

    // Hand off to /beta/nominate with prefill. No DB write here.
    // The destination owns the write.
    const prefill = {
      // Maps to Nominate's EMPTY shape where field names align;
      // additional context is passed under `_begin_build` for the
      // destination to use as it sees fit.
      name:            form.org_name.trim(),
      website:         form.website.trim(),
      why:             buildWhy(form),
      nominator_name:  form.your_name.trim(),
      nominator_email: form.your_email.trim(),
      location_name:   form.where.trim(),
      scale:           form.scale,
      _begin_build: {
        bringing:        form.bringing,
        what_they_do:    form.what_they_do.trim(),
        where:           form.where.trim(),
        who_it_impacts:  form.who_it_impacts.trim(),
        scale_of_impact: form.scale_of_impact.trim(),
        accomplish:      form.accomplish.trim(),
        need_or_offering: form.need_or_offering.trim(),
        links:           cleanLinks(form.links),
      },
    }

    navigate('/nominate', { state: { prefill } })
  }

  return (
    <>
      <Nav />
      <PageShell>
        <PageHeader
          eyebrow="For makers · Org"
          title="You're bringing an organisation."
          opener={SHARED_OPENER}
          sub="Your own, or someone else's whose work belongs on the map. Both are real contributions. The map gets sharper either way."
        />

        <Beats items={[
          'The org gets placed across the seven NextUs domains — primary, secondary, where the work actually lives. Not a tag. A coordinate.',
          'A real human reviews each submission before it goes on the map. AI helps with the first pass; the call is human.',
          "Once placed, the org is findable by people working on adjacent problems. That's the point.",
        ]} />

        <PreFormLine>
          Tell us who they are and what they're doing. We'll take it from there.
        </PreFormLine>

        <form onSubmit={submit}>

          {/* Bringing your own / nominating someone else's */}
          <Field>
            <Label required>Are you bringing your own org, or nominating someone else's?</Label>
            <SelectInput
              value={form.bringing}
              onChange={v => set('bringing', v)}
              options={[
                { value: 'self',        label: "Bringing my own" },
                { value: 'nominating',  label: "Nominating someone else's work" },
              ]}
            />
          </Field>

          <Field>
            <Label required>Name of the organisation</Label>
            <TextInput value={form.org_name} onChange={v => set('org_name', v)} placeholder="Name" />
          </Field>

          <Field>
            <Label required>What they do</Label>
            <Hint>The work itself, in plain language. Not a tagline.</Hint>
            <TextArea value={form.what_they_do} onChange={v => set('what_they_do', v)} placeholder="They are…" rows={4} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field>
              <Label>Where they do it</Label>
              <TextInput value={form.where} onChange={v => set('where', v)} placeholder="City, country, or remote" />
            </Field>
            <Field>
              <Label>Scale</Label>
              <SelectInput value={form.scale} onChange={v => set('scale', v)} options={SCALE_OPTIONS} />
            </Field>
          </div>

          <Field>
            <Label>Who it impacts</Label>
            <TextArea value={form.who_it_impacts} onChange={v => set('who_it_impacts', v)} placeholder="The people, communities, ecosystems, or systems on the receiving end of the work." rows={3} />
          </Field>

          <Field>
            <Label>Scale of impact</Label>
            <Hint>How many, how widely, how deeply. Be honest — small and deep counts.</Hint>
            <TextArea value={form.scale_of_impact} onChange={v => set('scale_of_impact', v)} placeholder="" rows={3} />
          </Field>

          <Field>
            <Label>What they're trying to accomplish</Label>
            <Hint>The horizon they're moving toward.</Hint>
            <TextArea value={form.accomplish} onChange={v => set('accomplish', v)} placeholder="" rows={3} />
          </Field>

          <Field>
            <Label>What they need or are offering</Label>
            <Hint>Resources, capacity, capital, gaps, or what they bring to the table.</Hint>
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

          <div style={{ paddingTop: '24px', borderTop: '1px solid rgba(110,127,92,0.18)', marginTop: '8px' }}>
            <div style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '13px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase', marginBottom: '20px' }}>
              Your details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field>
                <Label>Your name</Label>
                <TextInput value={form.your_name} onChange={v => set('your_name', v)} placeholder="Name" />
              </Field>
              <Field>
                <Label required>Your email</Label>
                <TextInput value={form.your_email} onChange={v => set('your_email', v)} placeholder="email@example.com" type="email" />
                <Hint>So we can follow up on the nomination.</Hint>
              </Field>
            </div>
          </div>

          <CloserAndSubmit
            saving={saving}
            error={error}
            submitLabel="Continue  →"
            onSubmit={submit}
          />

          <p style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: '13px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.55, textAlign: 'center', marginTop: '12px' }}>
            Continue on the next page — there's a bit more to set, and a real human will see it before it goes live.
          </p>
        </form>
      </PageShell>
      <SiteFooter />
    </>
  )
}

// ── helpers ────────────────────────────────────────────────────────

// Compose a single "why they belong" block out of the granular fields,
// for the destination form's `why` textarea. The destination still
// receives the granular fields under `_begin_build` for richer rendering
// later — this is just a nice default for the compose-into-one field.
function buildWhy(f) {
  const parts = []
  if (f.what_they_do)     parts.push(f.what_they_do.trim())
  if (f.who_it_impacts)   parts.push(`Who it impacts: ${f.who_it_impacts.trim()}`)
  if (f.scale_of_impact)  parts.push(`Scale of impact: ${f.scale_of_impact.trim()}`)
  if (f.accomplish)       parts.push(`Trying to accomplish: ${f.accomplish.trim()}`)
  if (f.need_or_offering) parts.push(`Needing or offering: ${f.need_or_offering.trim()}`)
  return parts.join('\n\n')
}
