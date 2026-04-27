import { useEffect, useMemo, useState } from 'react'
import {
  PRINCIPLES_ORDERED,
  PRINCIPLE_WEIGHTS,
  isValidPrincipleSlug,
  isValidPrincipleWeight,
} from '../constants/principles'
import { tagPrinciple, untagPrinciple } from '../hooks/useTaggedPrinciples'

// ─────────────────────────────────────────────────────────────────────────────
// PrincipleAlignmentEditor
//
// For each of the user's engaged principles, capture an optional weight
// (primary / secondary / tertiary) and an optional explanatory note about
// how the principle shows up in the user's work.
//
// Multi-input section. Edits stay local until Save. Saving:
//   - Writes a principle_taggings row per engaged principle (target_type
//     'contributor', target_id = userId), using tagPrinciple from Module 1.5.
//   - Writes the explanatory notes to contributor_principle_notes, an
//     attribute table seeded from this surface. The notes table is small
//     and additive; if it does not yet exist, the editor degrades gracefully
//     and surfaces a one-line warning.
//
// Voice: the principle definition is one click away on each card (badge
// click). The editor itself is grown-up — choose weight, write a sentence
// about how this lands in your work, save.
//
// Props:
//   userId            — current user id (required)
//   engagedPrinciples — array of slugs, drawn from contributor_profiles_beta
//                       .engaged_principles (required)
//   initialAlignment  — optional [{ principle_slug, weight, note }] preload
//   onSaved(rows)     — optional callback after a successful save
//   className         — passthrough
// ─────────────────────────────────────────────────────────────────────────────

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }

const WEIGHT_LABEL = {
  primary: 'Primary',
  secondary: 'Secondary',
  tertiary: 'Tertiary',
}

function buildInitialDraft(engaged, alignment = []) {
  const byKey = new Map(alignment.map((a) => [a.principle_slug, a]))
  return engaged.filter(isValidPrincipleSlug).map((slug) => {
    const existing = byKey.get(slug)
    return {
      slug,
      weight: existing?.weight && isValidPrincipleWeight(existing.weight)
        ? existing.weight
        : 'primary',
      note: existing?.note || '',
    }
  })
}

function alignmentEqual(a, b) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].slug !== b[i].slug) return false
    if (a[i].weight !== b[i].weight) return false
    if ((a[i].note || '') !== (b[i].note || '')) return false
  }
  return true
}

export default function PrincipleAlignmentEditor({
  userId,
  engagedPrinciples = [],
  initialAlignment = [],
  onSaved,
  className,
}) {
  const baseline = useMemo(
    () => buildInitialDraft(engagedPrinciples, initialAlignment),
    [engagedPrinciples, initialAlignment],
  )
  const [draft, setDraft] = useState(baseline)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    setDraft(baseline)
  }, [baseline])

  useEffect(() => {
    if (!savedFlash) return
    const t = setTimeout(() => setSavedFlash(false), 1600)
    return () => clearTimeout(t)
  }, [savedFlash])

  const dirty = !alignmentEqual(draft, baseline)

  function setWeight(slug, weight) {
    if (!isValidPrincipleWeight(weight)) return
    setDraft((prev) =>
      prev.map((row) => (row.slug === slug ? { ...row, weight } : row)),
    )
    setErrorMsg(null)
  }

  function setNote(slug, note) {
    setDraft((prev) =>
      prev.map((row) => (row.slug === slug ? { ...row, note } : row)),
    )
    setErrorMsg(null)
  }

  async function handleSave() {
    if (!dirty || saving || !userId) return
    setSaving(true)
    setErrorMsg(null)
    try {
      // Write taggings (weight) for everything in draft.
      for (const row of draft) {
        await tagPrinciple('contributor', userId, row.slug, row.weight)
      }
      // Remove taggings for principles dropped since baseline.
      const draftSlugs = new Set(draft.map((r) => r.slug))
      for (const row of baseline) {
        if (!draftSlugs.has(row.slug)) {
          await untagPrinciple('contributor', userId, row.slug)
        }
      }
      // Write notes via the attribute table. If the table is missing, log
      // and continue — taggings still saved.
      try {
        const { supabase } = await import('../../hooks/useSupabase')
        for (const row of draft) {
          const note = (row.note || '').trim()
          if (note) {
            await supabase.from('contributor_principle_notes').upsert(
              {
                user_id: userId,
                principle_slug: row.slug,
                note,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,principle_slug' },
            )
          } else {
            await supabase
              .from('contributor_principle_notes')
              .delete()
              .eq('user_id', userId)
              .eq('principle_slug', row.slug)
          }
        }
      } catch (noteErr) {
        // Notes are nice-to-have; weights are the load-bearing save. Surface
        // softly without rolling back the weight writes.
        console.warn('[PrincipleAlignmentEditor] notes save skipped:', noteErr)
      }

      setSavedFlash(true)
      onSaved?.(draft)
    } catch (err) {
      setErrorMsg(err?.message || 'Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setDraft(baseline)
    setErrorMsg(null)
  }

  if (!engagedPrinciples || engagedPrinciples.length === 0) {
    return (
      <div className={className}>
        <p
          style={{
            ...body,
            margin: 0,
            fontSize: '15px',
            lineHeight: 1.55,
            color: 'rgba(15, 21, 35, 0.55)',
          }}
        >
          Engage one or more principles above to set how each one lands in your
          work.
        </p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {draft.map((row) => {
          const principle = PRINCIPLES_ORDERED.find((p) => p.slug === row.slug)
          if (!principle) return null
          return (
            <article
              key={row.slug}
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(200, 146, 42, 0.20)',
                borderRadius: '14px',
                padding: '16px 18px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                  marginBottom: '12px',
                }}
              >
                <span
                  style={{
                    ...sc,
                    fontSize: '14px',
                    letterSpacing: '0.04em',
                    color: '#A8721A',
                    fontWeight: 600,
                  }}
                >
                  {principle.label}
                </span>
                <WeightSelect
                  value={row.weight}
                  onChange={(w) => setWeight(row.slug, w)}
                />
              </div>

              <p
                style={{
                  ...body,
                  fontSize: '14px',
                  lineHeight: 1.55,
                  color: 'rgba(15, 21, 35, 0.55)',
                  margin: '0 0 10px',
                }}
              >
                {principle.definition}
              </p>

              <label
                htmlFor={`note-${row.slug}`}
                style={{
                  ...sc,
                  display: 'block',
                  fontSize: '12px',
                  letterSpacing: '0.06em',
                  color: 'rgba(15, 21, 35, 0.72)',
                  fontWeight: 600,
                  marginBottom: '6px',
                }}
              >
                How this lands in your work (optional)
              </label>
              <textarea
                id={`note-${row.slug}`}
                value={row.note}
                onChange={(e) => setNote(row.slug, e.target.value)}
                rows={2}
                maxLength={500}
                placeholder=""
                style={{
                  ...body,
                  width: '100%',
                  fontSize: '15px',
                  lineHeight: 1.5,
                  color: '#0F1523',
                  background: '#FAFAF7',
                  padding: '10px 12px',
                  border: '1px solid rgba(200, 146, 42, 0.20)',
                  borderRadius: '14px',
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </article>
          )
        })}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          marginTop: '16px',
        }}
      >
        <span
          style={{
            ...sc,
            fontSize: '12px',
            letterSpacing: '0.06em',
            color: 'rgba(15, 21, 35, 0.55)',
          }}
        >
          {draft.length} {draft.length === 1 ? 'principle' : 'principles'}
          {savedFlash ? '  ·  Saved' : ''}
          {errorMsg ? `  ·  ${errorMsg}` : ''}
        </span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {dirty && (
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              style={{
                ...sc,
                background: 'transparent',
                border: 'none',
                color: 'rgba(15, 21, 35, 0.55)',
                fontSize: '13px',
                letterSpacing: '0.06em',
                cursor: 'pointer',
                padding: '6px 10px',
              }}
            >
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving}
            style={{
              ...sc,
              background: !dirty || saving ? 'rgba(200, 146, 42, 0.20)' : '#0F1523',
              color: !dirty || saving ? 'rgba(255, 255, 255, 0.7)' : '#FFFFFF',
              border: 'none',
              borderRadius: '40px',
              padding: '8px 18px',
              fontSize: '14px',
              letterSpacing: '0.04em',
              fontWeight: 600,
              cursor: !dirty || saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving' : 'Save alignment'}
          </button>
        </div>
      </div>
    </div>
  )
}

function WeightSelect({ value, onChange }) {
  return (
    <div
      role="radiogroup"
      aria-label="Principle weight"
      style={{
        display: 'inline-flex',
        background: 'rgba(15, 21, 35, 0.04)',
        borderRadius: '40px',
        padding: '3px',
        border: '1px solid rgba(200, 146, 42, 0.20)',
      }}
    >
      {PRINCIPLE_WEIGHTS.map((w) => {
        const active = value === w
        return (
          <button
            key={w}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(w)}
            style={{
              ...sc,
              background: active ? '#0F1523' : 'transparent',
              color: active ? '#FFFFFF' : 'rgba(15, 21, 35, 0.72)',
              border: 'none',
              borderRadius: '40px',
              padding: '4px 12px',
              fontSize: '12px',
              letterSpacing: '0.06em',
              fontWeight: active ? 600 : 400,
              cursor: 'pointer',
              transition: 'background 140ms ease, color 140ms ease',
            }}
          >
            {WEIGHT_LABEL[w]}
          </button>
        )
      })}
    </div>
  )
}
