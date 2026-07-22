// src/app/components/manage/VoiceTab.jsx
//
// Voice layer editing for actor profile.
// First-person fields owned by the actor: tagline, image_url,
// mission_statement, working_on_now.
// Only mounted when current user owns the profile.

import { useState } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import {
  body, sc, gold, dark,
  Label, Hint, Btn, TextInput, TextArea,
} from '../OrgShared'

export function VoiceTab({ actor, onSave, toast }) {
  const [form, setForm] = useState({
    tagline:           actor.tagline           || '',
    image_url:         actor.image_url         || '',
    mission_statement: actor.mission_statement || '',
    working_on_now:    actor.working_on_now    || '',
    story:             actor.story             || '',
  })
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    setSaving(true)
    const payload = {
      tagline:           form.tagline.trim()           || null,
      image_url:         form.image_url.trim()         || null,
      mission_statement: form.mission_statement.trim() || null,
      working_on_now:    form.working_on_now.trim()    || null,
      story:             form.story.trim()             || null,
    }
    const { error } = await supabase.from('nextus_actors')
      .update(payload).eq('id', actor.id)
    setSaving(false)
    if (error) { toast('Save failed: ' + error.message); return }
    toast('Voice saved')
    onSave()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {!actor.profile_owner && (
        <div style={{ background: 'rgba(76,107,69,0.05)', border: '1px solid rgba(76,107,69,0.30)', borderRadius: '10px', padding: '14px 18px' }}>
          <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '13px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6, margin: 0 }}>
            This profile isn't claimed yet. Voice fields here · mission and what you're building · publish once the org claims it. Until then, the description and story carry the public profile, so put the essentials there.
          </p>
        </div>
      )}

      <div style={{ background: 'rgba(76,107,69,0.04)',
        border: '1px solid rgba(76,107,69,0.18)',
        borderRadius: '10px', padding: '14px 18px' }}>
        <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.65)',
          lineHeight: 1.6, margin: 0 }}>
          The Voice layer is yours. These are first-person fields — your words,
          your mission, what you're working on right now. Empty fields stay
          hidden on your public profile.
        </p>
      </div>

      {/* Image URL */}
      <div>
        <Label>Profile image URL</Label>
        <Hint>A logo (for organisations) or portrait (for practitioners). One image, hosted anywhere. Used at the top of your profile.</Hint>
        <TextInput value={form.image_url} onChange={v => set('image_url', v)}
          placeholder="https://..." />
        {form.image_url && (
          <div style={{ marginTop: '10px' }}>
            <img src={form.image_url} alt="preview"
              style={{ width: '80px', height: '80px', objectFit: 'cover',
                borderRadius: '10px',
                border: '1px solid rgba(76,107,69,0.25)' }} />
          </div>
        )}
      </div>

      {/* Tagline */}
      <div id="field-tagline">
        <Label>Tagline</Label>
        <Hint>A short one-liner. Appears under your name. Example: "Transformational Leader · Speaker · Author"</Hint>
        <TextInput value={form.tagline} onChange={v => set('tagline', v)}
          placeholder="Short one-liner" />
      </div>

      {/* Mission statement — invites toward grammar */}
      <div>
        <Label>What you're building toward</Label>
        <Hint>First-person, one or two sentences. The world you're working toward — not what you fight against, but the future you stand for. Appears prominently above your description on your profile.</Hint>
        <TextArea value={form.mission_statement}
          onChange={v => set('mission_statement', v)}
          placeholder="We're working toward a world where..." rows={4} />
      </div>

      {/* Story — long-form narrative */}
      <div>
        <Label>Your story</Label>
        <Hint>The longer narrative. How you came to this work, what turning points shaped it, what you're responding to. First or third person — your voice. 200–800 words is the natural range. Empty paragraphs separate sections.</Hint>
        <TextArea value={form.story} onChange={v => set('story', v)}
          placeholder="The longer version of your story..." rows={10} />
      </div>

      {/* Working on now */}
      <div>
        <Label>
          {actor.actor_mode === 'practice'
            ? 'Working on now through your practice'
            : 'Working on now'}
        </Label>
        <Hint>What you're focused on right now. A signal that this profile is alive. Update freely — there's no "stale" badge, just truth.</Hint>
        <TextArea value={form.working_on_now}
          onChange={v => set('working_on_now', v)}
          placeholder="Currently focused on..." rows={3} />
      </div>

      <div>
        <Btn onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save voice'}
        </Btn>
      </div>
    </div>
  )
}
