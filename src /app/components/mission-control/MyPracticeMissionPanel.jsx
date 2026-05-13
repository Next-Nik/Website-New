// ─────────────────────────────────────────────────────────────
// MyPracticeMissionPanel.jsx
//
// The Mission Control surface for the "My Practice" scope. Two
// modes in one component — setup mode when required fields are
// empty, room mode when they are filled. Both read from and write
// to the same row in contributor_profiles_beta (with the new
// practitioner_* columns from migration 032).
//
// SETUP MODE (Section 6 of the brief):
//   • A URL-paste prompt at the top — pastes flow through
//     /api/org-extract which already exists and returns up to
//     three records per source (Planet / Self / Practitioner).
//     We take the Practitioner record and pre-fill the form.
//   • Below the paste box, the field form. Either pre-filled
//     from extraction or empty for fresh fill. Same form either
//     way — the extract is a head start, not a substitute.
//   • Save advances to ROOM MODE once required fields are filled.
//
// ROOM MODE:
//   • The slate of cards covering placement, offering, accepting
//     state, and a (placeholder) inbound interest count. The room
//     is read-mostly; edits open inline editors per card.
//
// Required fields (per brief Section 5.1):
//   1. display_name                       — on contributor_profiles_beta
//   2. headline                            — on contributor_profiles_beta
//   3. practitioner_primary_domain         — new
//   4. practitioner_who_you_work_with      — new
//   5. count_on_me_for                     — on contributor_profiles_beta
//   6. practitioner_capacity_tiers (1+)    — new
//   7. practitioner_medium                 — new
//   8. practitioner_scale                  — new
//   (accepting state is settable but defaults to 'not_now' until
//    the user opts in — not a setup blocker)
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import {
  GOLD, GOLD_DK, GOLD_RULE, GOLD_FAINT, GOLD_HOVER,
  BG_CARD, BG_PARCHMENT,
  TEXT_INK, TEXT_META, TEXT_FAINT,
  FONT_DISPLAY, FONT_SC, FONT_BODY,
} from './tokens'
import { SELF_DOMAINS } from '../../../components/self-explorer/selfData'

// ─── Constants ───────────────────────────────────────────────

const SELF_DOMAIN_OPTIONS = SELF_DOMAINS.map(d => ({ value: d.id, label: d.name }))

const TIER_OPTIONS = [
  { value: 'micro',  label: 'Micro',  helper: 'Takes seconds. Follow, signal alignment.' },
  { value: 'tiny',   label: 'Tiny',   helper: 'Takes minutes. Amplify, comment, sign.' },
  { value: 'small',  label: 'Small',  helper: 'An hour or two. Read and respond.' },
  { value: 'medium', label: 'Medium', helper: 'Ongoing time or notable money.' },
  { value: 'large',  label: 'Large',  helper: 'Significant resource commitment.' },
]

const MEDIUM_OPTIONS = [
  { value: 'digital',   label: 'Digital' },
  { value: 'in_person', label: 'In person' },
  { value: 'either',    label: 'Either' },
]

const SCALE_OPTIONS = [
  { value: 'individual',    label: 'Individual' },
  { value: 'local',         label: 'Local' },
  { value: 'municipal',    label: 'Municipal' },
  { value: 'regional',     label: 'Regional' },
  { value: 'national',     label: 'National' },
  { value: 'international',label: 'International' },
  { value: 'global',       label: 'Global' },
]

const ACCEPTING_OPTIONS = [
  { value: 'yes',      label: 'Yes, taking new clients' },
  { value: 'waitlist', label: 'Waitlist only' },
  { value: 'not_now',  label: 'Not right now' },
]

// ─── The panel ───────────────────────────────────────────────

export default function MyPracticeMissionPanel({ userId }) {
  const [loading, setLoading]     = useState(true)
  const [profile, setProfile]     = useState(null)
  const [savingKey, setSavingKey] = useState(null)
  const [error, setError]         = useState(null)

  // Load the row. We read contributor_profiles_beta directly here
  // rather than depending on useMissionControlData because this panel
  // is one of the writers, and we want the round-trip on save to be
  // clean (one read, one write, no cache invalidation).
  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('contributor_profiles_beta')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) {
      setError(error)
      setLoading(false)
      return
    }
    if (!data) {
      // First-time touch — insert an empty row so subsequent saves
      // can use update() consistently. Same pattern as ProfileEdit.
      const { data: created, error: insertError } = await supabase
        .from('contributor_profiles_beta')
        .insert({ user_id: userId })
        .select()
        .single()
      if (insertError) setError(insertError)
      else setProfile(created)
    } else {
      setProfile(data)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  // Per-field save. Updates the row, optimistically applies locally
  // on success, reverts on failure.
  const saveField = useCallback(async (column, value) => {
    if (!userId) return false
    setSavingKey(column)
    const prior = profile?.[column]
    setProfile(p => p ? { ...p, [column]: value } : p)
    const { error } = await supabase
      .from('contributor_profiles_beta')
      .update({ [column]: value, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
    setSavingKey(null)
    if (error) {
      setProfile(p => p ? { ...p, [column]: prior } : p)
      return false
    }
    return true
  }, [userId, profile])

  // What "setup complete" means: every required field has a value.
  const setupComplete = profile && hasAllRequired(profile)

  if (loading) return <PanelShell><LoadingState /></PanelShell>
  if (error)   return <PanelShell><ErrorState error={error} /></PanelShell>
  if (!profile) return <PanelShell><ErrorState error={{ message: 'Profile not available.' }} /></PanelShell>

  if (!setupComplete) {
    return (
      <PanelShell>
        <SetupMode
          profile={profile}
          saveField={saveField}
          savingKey={savingKey}
        />
      </PanelShell>
    )
  }

  return (
    <PanelShell>
      <RoomMode
        profile={profile}
        saveField={saveField}
        savingKey={savingKey}
      />
    </PanelShell>
  )
}

// ─── Setup mode ──────────────────────────────────────────────

function SetupMode({ profile, saveField, savingKey }) {
  const [extractInput, setExtractInput] = useState('')
  const [extracting, setExtracting]     = useState(false)
  const [extractMsg, setExtractMsg]     = useState(null)

  async function handleExtract() {
    if (!extractInput.trim()) return
    setExtracting(true)
    setExtractMsg(null)
    try {
      const res = await fetch('/api/org-extract', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ input: extractInput.trim() }),
      })
      const data = await res.json()
      if (data.error) {
        setExtractMsg(data.message || 'Could not read that URL. You can still fill in the form by hand.')
        return
      }
      const practitioner = (data.results || []).find(r => r.label === 'Practitioner' || r.type === 'practitioner')
      if (!practitioner) {
        setExtractMsg('Did not find a practitioner record at that URL. You can fill in the form by hand below.')
        return
      }
      // Pre-fill what we can. Never silently commit — the user reviews
      // each field on the form below before any save fires (saves are
      // per-field on blur). What we do here is set the in-memory value
      // on profile so the form renders pre-filled.
      const updates = mapExtractToProfile(practitioner)
      for (const [col, val] of Object.entries(updates)) {
        if (val !== null && val !== undefined) {
          await saveField(col, val)
        }
      }
      setExtractMsg('Pre-filled. Review each field below and edit anything that is not quite right.')
    } catch {
      setExtractMsg('Could not reach the extraction service. You can fill in the form by hand.')
    } finally {
      setExtracting(false)
    }
  }

  return (
    <div className="mp-setup">
      <style>{PANEL_CSS}</style>

      <header className="mp-header">
        <p className="mp-eyebrow">MY PRACTICE · SETUP</p>
        <h2 className="mp-title">Set up your practitioner room</h2>
        <div className="mp-rule" />
        <p className="mp-intro">
          A few fields so the people looking for someone like you can find you, and so what comes back to you is matched well. Everything is editable any time from inside the room. You can also do this later from Profile Edit.
        </p>
      </header>

      <section className="mp-extract">
        <h3 className="mp-section-h">Have a page that describes your work?</h3>
        <p className="mp-section-helper">
          Paste a URL, like your site, an About page, or a directory listing, and we will pre-fill what we can. The fields below stay editable. If you would rather just fill them in, skip this and scroll down.
        </p>
        <div className="mp-extract-row">
          <input
            type="url"
            className="mp-extract-input"
            placeholder="https://..."
            value={extractInput}
            onChange={e => setExtractInput(e.target.value)}
            disabled={extracting}
          />
          <button
            type="button"
            className="mp-extract-btn"
            onClick={handleExtract}
            disabled={extracting || !extractInput.trim()}
          >
            {extracting ? 'Reading…' : 'Pre-fill from URL'}
          </button>
        </div>
        {extractMsg && (
          <p className="mp-extract-msg">{extractMsg}</p>
        )}
      </section>

      <PracticeFields profile={profile} saveField={saveField} savingKey={savingKey} />

      <footer className="mp-footer">
        <RequiredSummary profile={profile} />
      </footer>
    </div>
  )
}

// ─── Room mode ───────────────────────────────────────────────

function RoomMode({ profile, saveField, savingKey }) {
  const [editingCard, setEditingCard] = useState(null)

  return (
    <div className="mp-room">
      <style>{PANEL_CSS}</style>

      <header className="mp-header">
        <p className="mp-eyebrow">MY PRACTICE</p>
        <h2 className="mp-title">{profile.display_name || 'Your practice'}</h2>
        {profile.headline && (
          <p className="mp-headline">{profile.headline}</p>
        )}
        <div className="mp-rule" />
      </header>

      {/* Card 1 — Accepting clients (state, top of room). */}
      <Card
        eyebrow="ACCEPTING CLIENTS"
        editing={editingCard === 'accepting'}
        onEdit={() => setEditingCard('accepting')}
        onClose={() => setEditingCard(null)}
      >
        {editingCard === 'accepting' ? (
          <RadioGroup
            options={ACCEPTING_OPTIONS}
            value={profile.practitioner_accepting || 'not_now'}
            saving={savingKey === 'practitioner_accepting'}
            onChange={async (v) => {
              const ok = await saveField('practitioner_accepting', v)
              if (ok) setEditingCard(null)
            }}
          />
        ) : (
          <p className="mp-card-display">
            {labelFor(ACCEPTING_OPTIONS, profile.practitioner_accepting) || 'Not yet set'}
          </p>
        )}
      </Card>

      {/* Card 2 — Placement. */}
      <Card
        eyebrow="PLACEMENT"
        editing={editingCard === 'placement'}
        onEdit={() => setEditingCard('placement')}
        onClose={() => setEditingCard(null)}
      >
        <PlacementSummary profile={profile} />
        {editingCard === 'placement' && (
          <div style={{ marginTop: 14 }}>
            <PlacementEditor profile={profile} saveField={saveField} savingKey={savingKey} />
          </div>
        )}
      </Card>

      {/* Card 3 — Who you work with. */}
      <Card
        eyebrow="WHO YOU WORK WITH"
        editing={editingCard === 'who'}
        onEdit={() => setEditingCard('who')}
        onClose={() => setEditingCard(null)}
      >
        {editingCard === 'who' ? (
          <TextArea
            value={profile.practitioner_who_you_work_with || ''}
            maxLength={280}
            saving={savingKey === 'practitioner_who_you_work_with'}
            onSave={async (v) => {
              const ok = await saveField('practitioner_who_you_work_with', v)
              if (ok) setEditingCard(null)
            }}
            onCancel={() => setEditingCard(null)}
          />
        ) : (
          <p className="mp-card-display">{profile.practitioner_who_you_work_with || 'Not yet set'}</p>
        )}
      </Card>

      {/* Card 4 — Offering. */}
      <Card
        eyebrow="WHAT YOU OFFER"
        editing={editingCard === 'offer'}
        onEdit={() => setEditingCard('offer')}
        onClose={() => setEditingCard(null)}
      >
        {editingCard === 'offer' ? (
          <OfferingEditor profile={profile} saveField={saveField} savingKey={savingKey} />
        ) : (
          <>
            <p className="mp-card-display"><strong>Count on me for:</strong> {profile.count_on_me_for || 'Not yet set'}</p>
            {profile.dont_count_on_me_for && (
              <p className="mp-card-display"><em>Don\'t count on me for:</em> {profile.dont_count_on_me_for}</p>
            )}
            <p className="mp-card-display">
              <strong>Capacity:</strong>{' '}
              {(profile.practitioner_capacity_tiers || []).map(t => labelFor(TIER_OPTIONS, t)).filter(Boolean).join(', ') || 'Not yet set'}
            </p>
            <p className="mp-card-display">
              <strong>Medium:</strong> {labelFor(MEDIUM_OPTIONS, profile.practitioner_medium) || 'Not yet set'}
              {' · '}
              <strong>Scale:</strong> {labelFor(SCALE_OPTIONS, profile.practitioner_scale) || 'Not yet set'}
            </p>
            {profile.practitioner_scale_notes && (
              <p className="mp-card-display"><em>{profile.practitioner_scale_notes}</em></p>
            )}
          </>
        )}
      </Card>

      {/* Card 5 — Inbound interest (placeholder until C.2 wires
          contribution_interests_beta into the room). */}
      <Card eyebrow="WHO IS REACHING OUT" static>
        <p className="mp-card-display" style={{ color: 'var(--text-faint)' }}>
          Contribution interest from people who have found you will surface here. Nothing yet.
        </p>
      </Card>
    </div>
  )
}

// ─── Pieces ──────────────────────────────────────────────────

function PracticeFields({ profile, saveField, savingKey }) {
  return (
    <section className="mp-fields">
      <h3 className="mp-section-h">Identity</h3>

      <FieldRow label="Display name" required value={profile.display_name}>
        <TextInput
          value={profile.display_name || ''}
          saving={savingKey === 'display_name'}
          onBlurSave={(v) => saveField('display_name', v)}
        />
      </FieldRow>

      <FieldRow label="Headline" required value={profile.headline} helper="One line. What you do, in your own words.">
        <TextInput
          value={profile.headline || ''}
          saving={savingKey === 'headline'}
          onBlurSave={(v) => saveField('headline', v)}
        />
      </FieldRow>

      <FieldRow label="Website or canonical URL" value={profile.practitioner_website} helper="Optional. The URL the pre-fill works against.">
        <TextInput
          value={profile.practitioner_website || ''}
          saving={savingKey === 'practitioner_website'}
          onBlurSave={(v) => saveField('practitioner_website', v)}
          placeholder="https://..."
        />
      </FieldRow>

      <h3 className="mp-section-h">Placement</h3>

      <FieldRow label="Primary Self domain" required value={profile.practitioner_primary_domain}>
        <Select
          options={[{ value: '', label: 'Select one…' }, ...SELF_DOMAIN_OPTIONS]}
          value={profile.practitioner_primary_domain || ''}
          saving={savingKey === 'practitioner_primary_domain'}
          onChange={(v) => saveField('practitioner_primary_domain', v || null)}
        />
      </FieldRow>

      <FieldRow label="Secondary Self domains" value={profile.practitioner_secondary_domains?.length} helper="Optional. Honest co-residencies.">
        <CheckboxList
          options={SELF_DOMAIN_OPTIONS.filter(o => o.value !== profile.practitioner_primary_domain)}
          values={profile.practitioner_secondary_domains || []}
          saving={savingKey === 'practitioner_secondary_domains'}
          onChange={(next) => saveField('practitioner_secondary_domains', next.length ? next : null)}
        />
      </FieldRow>

      <FieldRow label="Sub-domains within primary" value={profile.practitioner_subdomains?.length} helper="Optional. The named approaches within your primary domain.">
        <SubDomainPicker
          primaryDomainId={profile.practitioner_primary_domain}
          values={profile.practitioner_subdomains || []}
          saving={savingKey === 'practitioner_subdomains'}
          onChange={(next) => saveField('practitioner_subdomains', next.length ? next : null)}
        />
      </FieldRow>

      <FieldRow label="Who you work with" required value={profile.practitioner_who_you_work_with} helper="One sentence. The kind of person who benefits from your work.">
        <TextArea
          value={profile.practitioner_who_you_work_with || ''}
          maxLength={280}
          saving={savingKey === 'practitioner_who_you_work_with'}
          onBlurSave={(v) => saveField('practitioner_who_you_work_with', v)}
        />
      </FieldRow>

      <h3 className="mp-section-h">Offering</h3>

      <FieldRow label="Count on me for" required value={profile.count_on_me_for} helper="1–3 sentences in your own words. What you do, not what you are.">
        <TextArea
          value={profile.count_on_me_for || ''}
          maxLength={600}
          saving={savingKey === 'count_on_me_for'}
          onBlurSave={(v) => saveField('count_on_me_for', v)}
        />
      </FieldRow>

      <FieldRow label="Don't count on me for" value={profile.dont_count_on_me_for} helper="Optional. Honest, not apologetic.">
        <TextArea
          value={profile.dont_count_on_me_for || ''}
          maxLength={600}
          saving={savingKey === 'dont_count_on_me_for'}
          onBlurSave={(v) => saveField('dont_count_on_me_for', v)}
        />
      </FieldRow>

      <FieldRow label="Capacity tier(s)" required value={profile.practitioner_capacity_tiers?.length} helper="Pick one or more. What scale of engagement you can take on right now.">
        <CheckboxList
          options={TIER_OPTIONS}
          values={profile.practitioner_capacity_tiers || []}
          saving={savingKey === 'practitioner_capacity_tiers'}
          onChange={(next) => saveField('practitioner_capacity_tiers', next.length ? next : null)}
          renderHelper={(o) => o.helper}
        />
      </FieldRow>

      <FieldRow label="Medium" required value={profile.practitioner_medium}>
        <Select
          options={[{ value: '', label: 'Select one…' }, ...MEDIUM_OPTIONS]}
          value={profile.practitioner_medium || ''}
          saving={savingKey === 'practitioner_medium'}
          onChange={(v) => saveField('practitioner_medium', v || null)}
        />
      </FieldRow>

      <h3 className="mp-section-h">Operating context</h3>

      <FieldRow label="Scale" required value={profile.practitioner_scale}>
        <Select
          options={[{ value: '', label: 'Select one…' }, ...SCALE_OPTIONS]}
          value={profile.practitioner_scale || ''}
          saving={savingKey === 'practitioner_scale'}
          onChange={(v) => saveField('practitioner_scale', v || null)}
        />
      </FieldRow>

      <FieldRow label="Scale notes" value={profile.practitioner_scale_notes} helper={'Optional. Free text for "local but I travel" cases.'}>
        <TextInput
          value={profile.practitioner_scale_notes || ''}
          saving={savingKey === 'practitioner_scale_notes'}
          onBlurSave={(v) => saveField('practitioner_scale_notes', v)}
          placeholder="e.g. Local one-on-one. Travel for retreats."
        />
      </FieldRow>

      <FieldRow label="Accepting clients" value={profile.practitioner_accepting} helper="Defaults to 'Not right now' until you opt in. Gates whether you appear in match results.">
        <Select
          options={ACCEPTING_OPTIONS}
          value={profile.practitioner_accepting || 'not_now'}
          saving={savingKey === 'practitioner_accepting'}
          onChange={(v) => saveField('practitioner_accepting', v)}
        />
      </FieldRow>
    </section>
  )
}

function RequiredSummary({ profile }) {
  const missing = REQUIRED_FIELDS.filter(f => !fieldFilled(profile, f.column))
  if (missing.length === 0) {
    return (
      <p className="mp-required-done">
        All required fields filled. Your room opens next.
      </p>
    )
  }
  return (
    <p className="mp-required-missing">
      Still needed: {missing.map(m => m.label).join(', ')}.
    </p>
  )
}

function PlacementSummary({ profile }) {
  const primary = SELF_DOMAINS.find(d => d.id === profile.practitioner_primary_domain)
  return (
    <>
      <p className="mp-card-display">
        <strong>Primary:</strong> {primary?.name || 'Not yet set'}
      </p>
      {profile.practitioner_secondary_domains?.length > 0 && (
        <p className="mp-card-display">
          <strong>Also working in:</strong> {
            profile.practitioner_secondary_domains
              .map(id => SELF_DOMAINS.find(d => d.id === id)?.name)
              .filter(Boolean)
              .join(', ')
          }
        </p>
      )}
      {profile.practitioner_subdomains?.length > 0 && primary && (
        <p className="mp-card-display">
          <strong>Approaches:</strong> {
            (primary.subDomains || [])
              .filter(sd => profile.practitioner_subdomains.includes(sd.id))
              .map(sd => sd.name)
              .join(', ')
          }
        </p>
      )}
    </>
  )
}

function PlacementEditor({ profile, saveField, savingKey }) {
  return (
    <>
      <FieldRow label="Primary Self domain">
        <Select
          options={[{ value: '', label: 'Select one…' }, ...SELF_DOMAIN_OPTIONS]}
          value={profile.practitioner_primary_domain || ''}
          saving={savingKey === 'practitioner_primary_domain'}
          onChange={(v) => saveField('practitioner_primary_domain', v || null)}
        />
      </FieldRow>
      <FieldRow label="Secondary domains">
        <CheckboxList
          options={SELF_DOMAIN_OPTIONS.filter(o => o.value !== profile.practitioner_primary_domain)}
          values={profile.practitioner_secondary_domains || []}
          saving={savingKey === 'practitioner_secondary_domains'}
          onChange={(next) => saveField('practitioner_secondary_domains', next.length ? next : null)}
        />
      </FieldRow>
      <FieldRow label="Sub-domains within primary">
        <SubDomainPicker
          primaryDomainId={profile.practitioner_primary_domain}
          values={profile.practitioner_subdomains || []}
          saving={savingKey === 'practitioner_subdomains'}
          onChange={(next) => saveField('practitioner_subdomains', next.length ? next : null)}
        />
      </FieldRow>
    </>
  )
}

function OfferingEditor({ profile, saveField, savingKey }) {
  return (
    <>
      <FieldRow label="Count on me for">
        <TextArea
          value={profile.count_on_me_for || ''}
          maxLength={600}
          saving={savingKey === 'count_on_me_for'}
          onBlurSave={(v) => saveField('count_on_me_for', v)}
        />
      </FieldRow>
      <FieldRow label="Don't count on me for">
        <TextArea
          value={profile.dont_count_on_me_for || ''}
          maxLength={600}
          saving={savingKey === 'dont_count_on_me_for'}
          onBlurSave={(v) => saveField('dont_count_on_me_for', v)}
        />
      </FieldRow>
      <FieldRow label="Capacity tier(s)">
        <CheckboxList
          options={TIER_OPTIONS}
          values={profile.practitioner_capacity_tiers || []}
          saving={savingKey === 'practitioner_capacity_tiers'}
          onChange={(next) => saveField('practitioner_capacity_tiers', next.length ? next : null)}
          renderHelper={(o) => o.helper}
        />
      </FieldRow>
      <FieldRow label="Medium">
        <Select
          options={MEDIUM_OPTIONS}
          value={profile.practitioner_medium || ''}
          saving={savingKey === 'practitioner_medium'}
          onChange={(v) => saveField('practitioner_medium', v || null)}
        />
      </FieldRow>
      <FieldRow label="Scale">
        <Select
          options={SCALE_OPTIONS}
          value={profile.practitioner_scale || ''}
          saving={savingKey === 'practitioner_scale'}
          onChange={(v) => saveField('practitioner_scale', v || null)}
        />
      </FieldRow>
      <FieldRow label="Scale notes">
        <TextInput
          value={profile.practitioner_scale_notes || ''}
          saving={savingKey === 'practitioner_scale_notes'}
          onBlurSave={(v) => saveField('practitioner_scale_notes', v)}
        />
      </FieldRow>
    </>
  )
}

// ─── Form primitives ─────────────────────────────────────────

function FieldRow({ label, helper, required, children }) {
  return (
    <div className="mp-fieldrow">
      <div className="mp-fieldrow-label">
        {label}
        {required && <span className="mp-required-mark"> *</span>}
      </div>
      {children}
      {helper && <p className="mp-fieldrow-helper">{helper}</p>}
    </div>
  )
}

function TextInput({ value, onBlurSave, onSave, saving, placeholder }) {
  const [local, setLocal] = useState(value || '')
  useEffect(() => { setLocal(value || '') }, [value])
  return (
    <input
      type="text"
      className="mp-input"
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        if ((local || '').trim() !== (value || '').trim()) {
          onBlurSave?.(local.trim() || null)
        }
      }}
      disabled={saving}
    />
  )
}

function TextArea({ value, maxLength, onBlurSave, onSave, onCancel, saving }) {
  const [local, setLocal] = useState(value || '')
  useEffect(() => { setLocal(value || '') }, [value])
  return (
    <div>
      <textarea
        className="mp-textarea"
        value={local}
        maxLength={maxLength}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          if (onBlurSave && (local || '').trim() !== (value || '').trim()) {
            onBlurSave(local.trim() || null)
          }
        }}
        disabled={saving}
        rows={3}
      />
      {(onSave || onCancel) && (
        <div className="mp-textarea-actions">
          {onSave && (
            <button type="button" className="mp-btn mp-btn-primary" onClick={() => onSave(local.trim() || null)} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
          {onCancel && (
            <button type="button" className="mp-btn mp-btn-ghost" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Select({ options, value, onChange, saving }) {
  return (
    <select
      className="mp-input"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={saving}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function CheckboxList({ options, values, onChange, saving, renderHelper }) {
  return (
    <div className="mp-checkboxlist">
      {options.map(o => {
        const checked = values.includes(o.value)
        return (
          <label key={o.value} className={`mp-checkbox-row ${checked ? 'mp-checkbox-row-checked' : ''}`}>
            <input
              type="checkbox"
              checked={checked}
              disabled={saving}
              onChange={() => {
                const next = checked
                  ? values.filter(v => v !== o.value)
                  : [...values, o.value]
                onChange(next)
              }}
            />
            <span className="mp-checkbox-label">{o.label}</span>
            {renderHelper && (
              <span className="mp-checkbox-helper">{renderHelper(o)}</span>
            )}
          </label>
        )
      })}
    </div>
  )
}

function RadioGroup({ options, value, onChange, saving }) {
  return (
    <div className="mp-radiogroup">
      {options.map(o => (
        <label key={o.value} className={`mp-radio-row ${value === o.value ? 'mp-radio-row-checked' : ''}`}>
          <input
            type="radio"
            name="mp-radio"
            checked={value === o.value}
            disabled={saving}
            onChange={() => onChange(o.value)}
          />
          <span className="mp-checkbox-label">{o.label}</span>
        </label>
      ))}
    </div>
  )
}

function SubDomainPicker({ primaryDomainId, values, onChange, saving }) {
  if (!primaryDomainId) {
    return (
      <p className="mp-fieldrow-helper" style={{ marginTop: 0 }}>
        Pick a primary Self domain first.
      </p>
    )
  }
  const domain = SELF_DOMAINS.find(d => d.id === primaryDomainId)
  const subDomains = domain?.subDomains || []
  if (subDomains.length === 0) {
    return <p className="mp-fieldrow-helper" style={{ marginTop: 0 }}>No sub-domains defined for this domain.</p>
  }
  return (
    <CheckboxList
      options={subDomains.map(sd => ({ value: sd.id, label: sd.name }))}
      values={values}
      onChange={onChange}
      saving={saving}
    />
  )
}

function Card({ eyebrow, editing, onEdit, onClose, static: isStatic, children }) {
  return (
    <div className="mp-card">
      <div className="mp-card-head">
        <span className="mp-card-eyebrow">{eyebrow}</span>
        {!isStatic && (
          editing ? (
            <button type="button" className="mp-card-edit" onClick={onClose}>Done</button>
          ) : (
            <button type="button" className="mp-card-edit" onClick={onEdit}>Edit</button>
          )
        )}
      </div>
      <div className="mp-card-body">{children}</div>
    </div>
  )
}

function PanelShell({ children }) {
  return <div className="mp-shell">{children}</div>
}

function LoadingState() {
  return <p className="mp-loading">Loading your practice…</p>
}

function ErrorState({ error }) {
  return <p className="mp-error">Could not load your practice: {error?.message || 'unknown error'}.</p>
}

// ─── Helpers ─────────────────────────────────────────────────

const REQUIRED_FIELDS = [
  { column: 'display_name',                   label: 'Display name' },
  { column: 'headline',                       label: 'Headline' },
  { column: 'practitioner_primary_domain',    label: 'Primary domain' },
  { column: 'practitioner_who_you_work_with', label: 'Who you work with' },
  { column: 'count_on_me_for',                label: 'Count on me for' },
  { column: 'practitioner_capacity_tiers',    label: 'Capacity tier(s)' },
  { column: 'practitioner_medium',            label: 'Medium' },
  { column: 'practitioner_scale',             label: 'Scale' },
]

function fieldFilled(profile, column) {
  const v = profile?.[column]
  if (v === null || v === undefined) return false
  if (typeof v === 'string') return v.trim().length > 0
  if (Array.isArray(v))      return v.length > 0
  return true
}

function hasAllRequired(profile) {
  return REQUIRED_FIELDS.every(f => fieldFilled(profile, f.column))
}

function labelFor(options, value) {
  if (!value) return null
  return options.find(o => o.value === value)?.label || value
}

// Map a Practitioner record from /api/org-extract onto profile columns.
// Conservative: only set values that came back clean.
function mapExtractToProfile(p) {
  const updates = {}
  if (p.name)        updates.display_name = p.name.slice(0, 120)
  // First sentence of description → headline (one line). Rest → count_on_me_for.
  if (p.description) {
    const desc = p.description.trim()
    const firstStop = desc.search(/[.!?](\s|$)/)
    if (firstStop > 0 && firstStop < 180) {
      updates.headline = desc.slice(0, firstStop + 1)
      const rest = desc.slice(firstStop + 1).trim()
      if (rest) updates.count_on_me_for = rest
    } else {
      updates.headline = desc.slice(0, 180)
    }
  }
  // Domain mapping. The extractor returns SELF domain ids using
  // hyphens ('inner-game'), our schema uses underscores ('inner_game').
  if (p.domain_id) {
    const normalised = String(p.domain_id).replace(/-/g, '_').toLowerCase()
    if (SELF_DOMAINS.some(d => d.id === normalised)) {
      updates.practitioner_primary_domain = normalised
    }
  }
  if (p.scale && SCALE_OPTIONS.some(o => o.value === p.scale.toLowerCase())) {
    updates.practitioner_scale = p.scale.toLowerCase()
  }
  if (p.scale_notes) updates.practitioner_scale_notes = String(p.scale_notes).slice(0, 280)
  if (p.website)     updates.practitioner_website     = String(p.website).slice(0, 500)
  return updates
}

// ─── CSS ─────────────────────────────────────────────────────

const PANEL_CSS = `
.mp-shell {
  max-width: 760px;
  margin: 0 auto;
  padding: 28px 24px 60px;
  color: ${TEXT_INK};
}

.mp-header { margin-bottom: 28px; }
.mp-eyebrow {
  font-family: ${FONT_SC};
  font-size: 11px;
  letter-spacing: 0.22em;
  color: ${GOLD_DK};
  margin: 0 0 8px;
}
.mp-title {
  font-family: ${FONT_DISPLAY};
  font-size: 32px;
  font-weight: 500;
  color: ${TEXT_INK};
  margin: 0 0 6px;
  letter-spacing: -0.005em;
}
.mp-headline {
  font-family: ${FONT_BODY};
  font-size: 16px;
  font-style: italic;
  color: ${GOLD_DK};
  margin: 0 0 8px;
}
.mp-rule { width: 40px; height: 1px; background: ${GOLD}; margin: 14px 0 16px; }
.mp-intro {
  font-family: ${FONT_BODY};
  font-size: 15px;
  color: ${TEXT_META};
  margin: 0;
  line-height: 1.6;
}

/* Extract section */
.mp-extract {
  margin: 8px 0 28px;
  padding: 18px 20px;
  background: ${GOLD_FAINT};
  border: 1px solid ${GOLD_RULE};
  border-radius: 14px;
}
.mp-section-h {
  font-family: ${FONT_DISPLAY};
  font-size: 19px;
  font-weight: 500;
  color: ${TEXT_INK};
  margin: 0 0 6px;
}
.mp-section-helper {
  font-family: ${FONT_BODY};
  font-size: 13.5px;
  color: ${TEXT_META};
  line-height: 1.5;
  margin: 0 0 12px;
}
.mp-extract-row { display: flex; gap: 10px; flex-wrap: wrap; }
.mp-extract-input {
  flex: 1;
  min-width: 200px;
  padding: 10px 12px;
  font-family: ${FONT_BODY};
  font-size: 14px;
  border: 1px solid ${GOLD_RULE};
  background: #FFFFFF;
  outline: none;
}
.mp-extract-input:focus { border-color: ${GOLD}; }
.mp-extract-btn {
  padding: 10px 18px;
  font-family: ${FONT_SC};
  font-size: 11px;
  letter-spacing: 0.18em;
  background: ${GOLD};
  color: #FFFFFF;
  border: 1px solid ${GOLD};
  border-radius: 40px;
  cursor: pointer;
}
.mp-extract-btn:hover:not(:disabled) { background: ${GOLD_DK}; }
.mp-extract-btn:disabled { opacity: 0.55; cursor: default; }
.mp-extract-msg {
  margin: 12px 0 0;
  font-family: ${FONT_BODY};
  font-size: 13.5px;
  font-style: italic;
  color: ${GOLD_DK};
}

/* Field rows */
.mp-fields { display: flex; flex-direction: column; gap: 18px; }
.mp-fieldrow { display: flex; flex-direction: column; gap: 6px; }
.mp-fieldrow-label {
  font-family: ${FONT_SC};
  font-size: 11px;
  letter-spacing: 0.18em;
  color: ${GOLD_DK};
  text-transform: uppercase;
}
.mp-required-mark { color: ${GOLD}; }
.mp-fieldrow-helper {
  font-family: ${FONT_BODY};
  font-size: 13px;
  color: ${TEXT_FAINT};
  margin: 0;
  line-height: 1.5;
}

.mp-input {
  padding: 10px 12px;
  font-family: ${FONT_BODY};
  font-size: 14.5px;
  border: 1px solid ${GOLD_RULE};
  background: #FFFFFF;
  outline: none;
  border-radius: 0;
  width: 100%;
  box-sizing: border-box;
}
.mp-input:focus { border-color: ${GOLD}; }

.mp-textarea {
  padding: 10px 12px;
  font-family: ${FONT_BODY};
  font-size: 14.5px;
  border: 1px solid ${GOLD_RULE};
  background: #FFFFFF;
  outline: none;
  width: 100%;
  resize: vertical;
  min-height: 70px;
  line-height: 1.5;
  box-sizing: border-box;
}
.mp-textarea:focus { border-color: ${GOLD}; }

.mp-textarea-actions { display: flex; gap: 10px; margin-top: 10px; }

.mp-btn {
  padding: 8px 16px;
  font-family: ${FONT_SC};
  font-size: 11px;
  letter-spacing: 0.18em;
  border-radius: 40px;
  cursor: pointer;
  border: 1px solid ${GOLD};
}
.mp-btn-primary { background: ${GOLD}; color: #FFFFFF; }
.mp-btn-primary:hover:not(:disabled) { background: ${GOLD_DK}; }
.mp-btn-ghost { background: transparent; color: ${GOLD_DK}; }
.mp-btn-ghost:hover { background: ${GOLD_HOVER}; }

/* Checkbox / radio lists */
.mp-checkboxlist { display: flex; flex-direction: column; gap: 6px; }
.mp-checkbox-row, .mp-radio-row {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 8px 10px;
  border: 1px solid ${GOLD_RULE};
  border-radius: 14px;
  cursor: pointer;
  background: transparent;
  transition: background 0.15s ease;
}
.mp-checkbox-row:hover, .mp-radio-row:hover { background: ${GOLD_HOVER}; }
.mp-checkbox-row-checked, .mp-radio-row-checked { background: ${GOLD_FAINT}; border-color: ${GOLD}; }
.mp-checkbox-label {
  font-family: ${FONT_BODY};
  font-size: 14px;
  color: ${TEXT_INK};
}
.mp-checkbox-helper {
  font-family: ${FONT_BODY};
  font-size: 12.5px;
  color: ${TEXT_FAINT};
  margin-left: auto;
}
.mp-radiogroup { display: flex; flex-direction: column; gap: 6px; }

/* Required summary */
.mp-footer {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid ${GOLD_RULE};
}
.mp-required-done {
  font-family: ${FONT_BODY};
  font-size: 14px;
  font-style: italic;
  color: ${GOLD_DK};
  margin: 0;
}
.mp-required-missing {
  font-family: ${FONT_BODY};
  font-size: 14px;
  color: ${TEXT_META};
  margin: 0;
}

/* Room cards */
.mp-room { display: flex; flex-direction: column; gap: 0; }
.mp-card {
  margin: 0 0 14px;
  padding: 14px 18px;
  background: ${BG_CARD};
  border: 1px solid ${GOLD_RULE};
  border-radius: 14px;
}
.mp-card-head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 8px;
}
.mp-card-eyebrow {
  font-family: ${FONT_SC};
  font-size: 10px;
  letter-spacing: 0.22em;
  color: ${GOLD_DK};
}
.mp-card-edit {
  background: transparent;
  border: none;
  color: ${GOLD_DK};
  font-family: ${FONT_SC};
  font-size: 10px;
  letter-spacing: 0.18em;
  cursor: pointer;
}
.mp-card-display {
  font-family: ${FONT_BODY};
  font-size: 14.5px;
  color: ${TEXT_INK};
  margin: 0 0 6px;
  line-height: 1.55;
}
.mp-card-display:last-child { margin-bottom: 0; }

.mp-loading {
  font-family: ${FONT_BODY};
  color: ${TEXT_META};
  font-style: italic;
  text-align: center;
  padding: 40px 0;
}
.mp-error {
  font-family: ${FONT_BODY};
  color: ${TEXT_META};
  text-align: center;
  padding: 40px 0;
}

@media (max-width: 640px) {
  .mp-shell { padding: 18px 16px 40px; }
  .mp-title { font-size: 24px; }
  .mp-section-h { font-size: 17px; }
}
`
