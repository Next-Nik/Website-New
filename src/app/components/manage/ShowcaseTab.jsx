// src/app/components/manage/ShowcaseTab.jsx
//
// Showcase layer editing for actor profile.
// Five owner-authored narrative fields that show the depth of the work:
// track_record, how_we_work, best_practices, direction, main_challenges.
// All owner-only — never seeded, only visible publicly once claimed.
// Only mounted when current user owns the profile.

import { useState } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import {
  body,
  Label, Hint, Btn, TextArea,
} from '../OrgShared'

export function ShowcaseTab({ actor, onSave, toast }) {
  const isPractice = actor.actor_mode === 'practice'

  const [form, setForm] = useState({
    track_record:    actor.track_record    || '',
    how_we_work:     actor.how_we_work     || '',
    best_practices:  actor.best_practices  || '',
    direction:       actor.direction       || '',
    main_challenges: actor.main_challenges || '',
  })
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    setSaving(true)
    const payload = {
      track_record:    form.track_record.trim()    || null,
      how_we_work:     form.how_we_work.trim()     || null,
      best_practices:  form.best_practices.trim()  || null,
      direction:       form.direction.trim()       || null,
      main_challenges: form.main_challenges.trim() || null,
    }
    const { error } = await supabase.from('nextus_actors')
      .update(payload).eq('id', actor.id)
    setSaving(false)
    if (error) { toast('Save failed: ' + error.message); return }
    toast('Showcase saved')
    onSave()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{ background: 'rgba(76,107,69,0.04)',
        border: '1px solid rgba(76,107,69,0.18)',
        borderRadius: '10px', padding: '14px 18px' }}>
        <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.65)',
          lineHeight: 1.6, margin: 0 }}>
          The Showcase layer is where the work gets room to breathe · what
          you've done, how you do it, what you've learned, where you're
          heading, and what's genuinely hard. Write plainly. Empty fields
          stay hidden on your public profile.
        </p>
      </div>

      {/* Track record */}
      <div>
        <Label>Track record</Label>
        <Hint>What you've done. Milestones, results, the work you'd point to as proof. Blank lines separate paragraphs.</Hint>
        <TextArea value={form.track_record}
          onChange={v => set('track_record', v)}
          placeholder="Over the last decade we've..." rows={6} />
      </div>

      {/* How we work */}
      <div>
        <Label>{isPractice ? 'How I work' : 'How we work'}</Label>
        <Hint>Your approach and method. What makes the way you do this work distinct.</Hint>
        <TextArea value={form.how_we_work}
          onChange={v => set('how_we_work', v)}
          placeholder="Our approach starts with..." rows={6} />
      </div>

      {/* Best practices */}
      <div>
        <Label>Best practices</Label>
        <Hint>What you've learned that others in this work could use. This is a giving field · knowledge you're passing on, not a pitch.</Hint>
        <TextArea value={form.best_practices}
          onChange={v => set('best_practices', v)}
          placeholder="If you're doing this kind of work, here's what we'd tell you..." rows={6} />
      </div>

      {/* Direction */}
      <div>
        <Label>Where this is heading</Label>
        <Hint>The direction of the work · not this month's focus (that's "Working on now" in Voice) but where the whole thing is going.</Hint>
        <TextArea value={form.direction}
          onChange={v => set('direction', v)}
          placeholder="In the next few years we want to..." rows={4} />
      </div>

      {/* Main challenges */}
      <div>
        <Label>Main challenges</Label>
        <Hint>What's genuinely hard right now. Honest context, not weakness · it tells the right people how to help. You can turn any of these into an open challenge on your profile's Calls.</Hint>
        <TextArea value={form.main_challenges}
          onChange={v => set('main_challenges', v)}
          placeholder="The hardest part of this work right now is..." rows={5} />
      </div>

      <div>
        <Btn onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save showcase'}
        </Btn>
      </div>
    </div>
  )
}
