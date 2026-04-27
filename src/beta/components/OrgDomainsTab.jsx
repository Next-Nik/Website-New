// src/beta/components/OrgDomainsTab.jsx
// Four-dimensional placement tab for BetaOrgManage.
// Replaces the single-domain/subdomain model with:
//   domains[]  subdomains[]  fields[]  lenses[]  problem_chains[]  platform_principles[]
// Primary-first ordering at every level.
// Uses Module 1.5 PrincipleStrip for principle display.

import { useState, useEffect } from 'react'
import { supabase } from '../../hooks/useSupabase'
import {
  body, sc, gold, dark,
  DOMAIN_LIST, DOMAIN_LABEL, SUBDOMAIN_MAP, LENSES_PER_DOMAIN,
  PLATFORM_PRINCIPLE_LIST,
  Label, Hint, SectionCard, Btn, TextInput, TextArea, SelectInput,
} from './OrgShared'
import { PrincipleStrip } from './PrincipleStrip'

// Canonical horizon goals per domain (v3.8)
const DOMAIN_HORIZON = {
  'human-being':    'Every human held in dignity, met with care, supported in becoming most fully themselves.',
  'society':        'A structure that gives everyone space to function and the possibility to thrive.',
  'nature':         'The living planet is thriving, and humanity lives as a regenerative participant in it.',
  'technology':     'Technology in service of life — human and planetary — designed to restore as it operates.',
  'finance-economy':'An economy in which everyone has enough to act on what matters, contribution is freely chosen rather than coerced.',
  'legacy':         'A civilisation that knows what it carries, tends what it transmits, repairs what it broke.',
  'vision':         'Creating forward — as far as we can see — in service of the brightest future for all.',
}

// ── Chip multi-select ────────────────────────────────────────

function ChipSelect({ options, selected, onChange, small }) {
  function toggle(val) {
    onChange(
      selected.includes(val)
        ? selected.filter(v => v !== val)
        : [...selected, val]
    )
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {options.map(o => {
        const on = selected.includes(o.value || o)
        const val = o.value || o
        const label = o.label || o
        return (
          <button key={val} type="button" onClick={() => toggle(val)}
            style={{
              ...sc, fontSize: small ? '11px' : '12px', letterSpacing: '0.12em',
              padding: small ? '4px 10px' : '6px 14px', borderRadius: '40px', cursor: 'pointer',
              border: on ? '1.5px solid rgba(200,146,42,0.78)' : '1.5px solid rgba(200,146,42,0.25)',
              background: on ? 'rgba(200,146,42,0.10)' : 'transparent',
              color: on ? gold : 'rgba(15,21,35,0.55)',
              transition: 'all 0.15s',
            }}>
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ── Ordered list editor (for primary-first arrays) ───────────

function OrderedList({ items, onReorder, onRemove, renderItem }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {items.map((item, i) => (
        <div key={item} style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '8px 12px', background: i === 0 ? 'rgba(200,146,42,0.06)' : '#FFFFFF',
          border: i === 0 ? '1px solid rgba(200,146,42,0.35)' : '1px solid rgba(200,146,42,0.15)',
          borderRadius: '8px',
        }}>
          {i === 0 && (
            <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.16em', color: gold, background: '#C8922A', color: '#FFFFFF', padding: '2px 8px', borderRadius: '40px', flexShrink: 0 }}>
              Primary
            </span>
          )}
          <span style={{ ...body, fontSize: '14px', color: dark, flex: 1 }}>
            {renderItem ? renderItem(item) : item}
          </span>
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            {i > 0 && (
              <button onClick={() => onReorder(i, i - 1)}
                style={{ ...sc, fontSize: '12px', color: 'rgba(15,21,35,0.45)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>
                ↑
              </button>
            )}
            {i < items.length - 1 && (
              <button onClick={() => onReorder(i, i + 1)}
                style={{ ...sc, fontSize: '12px', color: 'rgba(15,21,35,0.45)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>
                ↓
              </button>
            )}
            <button onClick={() => onRemove(i)}
              style={{ ...sc, fontSize: '12px', color: '#8A3030', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 8px' }}>
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Problem chain editor ─────────────────────────────────────

function ProblemChainEditor({ chains, onChange }) {
  const [draft, setDraft] = useState('')

  function add() {
    const trimmed = draft.trim()
    if (!trimmed || chains.includes(trimmed)) return
    onChange([...chains, trimmed])
    setDraft('')
  }

  function reorder(from, to) {
    const next = [...chains]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }

  function remove(i) {
    onChange(chains.filter((_, idx) => idx !== i))
  }

  return (
    <div>
      {chains.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <OrderedList items={chains} onReorder={reorder} onRemove={remove} />
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="civilisational > sector > specific"
          style={{ ...body, fontSize: '14px', color: dark, padding: '9px 14px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', flex: 1 }}
        />
        <button onClick={add} disabled={!draft.trim()}
          style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', padding: '9px 16px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.60)', background: 'rgba(200,146,42,0.05)', color: gold, cursor: 'pointer' }}>
          Add
        </button>
      </div>
      <p style={{ ...body, fontSize: '12px', color: 'rgba(15,21,35,0.45)', marginTop: '6px', lineHeight: 1.5 }}>
        Format: civilisational level &gt; sector &gt; specific problem. Press Enter to add. First entry is primary.
      </p>
    </div>
  )
}

// ── Main DomainsTab ──────────────────────────────────────────

export function OrgDomainsTab({ actorId, toast }) {
  const [placement, setPlacement] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [alignmentNotes, setAlignmentNotes] = useState({})

  // Local editable state mirrors nextus_actors four-dim columns
  const [domains,           setDomains]           = useState([])
  const [subdomains,        setSubdomains]         = useState([])
  const [fields,            setFields]             = useState([])
  const [lenses,            setLenses]             = useState([])
  const [problemChains,     setProblemChains]      = useState([])
  const [platformPrinciples,setPlatformPrinciples] = useState([])
  const [alignmentScore,    setAlignmentScore]     = useState('')
  const [resolution,        setResolution]         = useState('')

  // domain being previewed for horizon goal card
  const [previewDomain, setPreviewDomain] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('nextus_actors')
        .select('domains, subdomains, fields, lenses, problem_chains, platform_principles, alignment_score, resolution, domain_alignment_notes')
        .eq('id', actorId)
        .single()

      if (data) {
        setDomains(data.domains || [])
        setSubdomains(data.subdomains || [])
        setFields(data.fields || [])
        setLenses(data.lenses || [])
        setProblemChains(data.problem_chains || [])
        setPlatformPrinciples(data.platform_principles || [])
        setAlignmentScore(data.alignment_score ?? '')
        setResolution(data.resolution || '')
        setAlignmentNotes(data.domain_alignment_notes || {})
      }
      setLoading(false)
    }
    load()
  }, [actorId])

  // Reorder helper — primary-first
  function reorderItem(arr, setArr, from, to) {
    const next = [...arr]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setArr(next)
  }

  // Add a domain (and auto-populate available subdomains / lenses)
  function addDomain(slug) {
    if (!slug || domains.includes(slug)) return
    setDomains(d => [...d, slug])
    setPreviewDomain(slug)
  }

  function removeDomain(i) {
    const slug = domains[i]
    setDomains(d => d.filter((_, idx) => idx !== i))
    // Remove associated subdomains for this domain
    const domainSubSlugs = (SUBDOMAIN_MAP[slug] || []).map(([v]) => v)
    setSubdomains(s => s.filter(sub => !domainSubSlugs.includes(sub)))
  }

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('nextus_actors').update({
      domains:             domains,
      subdomains:          subdomains,
      fields:              fields,
      lenses:              lenses,
      problem_chains:      problemChains,
      platform_principles: platformPrinciples,
      alignment_score:     alignmentScore !== '' ? parseFloat(alignmentScore) : null,
      resolution:          resolution || null,
      domain_alignment_notes: alignmentNotes,
      // Keep legacy single-value columns in sync for map compatibility
      domain_id:    domains[0] || null,
      subdomain_id: subdomains[0] || null,
      updated_at:   new Date().toISOString(),
    }).eq('id', actorId)
    setSaving(false)
    if (error) { toast('Error saving: ' + error.message); return }
    toast('Placement saved')
  }

  // Available subdomains across all selected domains
  const availableSubdomains = domains.flatMap(d =>
    (SUBDOMAIN_MAP[d] || []).map(([v, l]) => ({ value: v, label: `${DOMAIN_LABEL[d]} › ${l}` }))
  )

  // Available lenses across all selected domains
  const availableLenses = [...new Set(
    domains.flatMap(d => LENSES_PER_DOMAIN[d] || [])
  )]

  if (loading) return <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading placement…</p>

  return (
    <div style={{ maxWidth: '700px' }}>

      {/* Explainer */}
      <SectionCard style={{ marginBottom: '28px', background: 'rgba(200,146,42,0.02)' }}>
        <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: gold, marginBottom: '8px' }}>
          Four-dimensional placement
        </p>
        <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.75, marginBottom: '8px' }}>
          Where your work belongs in the civilisational map. Multi-residency is the default — most organisations touch more than one domain. The first item in each list is primary.
        </p>
        <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.50)', lineHeight: 1.65 }}>
          Domains set the civilisational layer. Subdomains name the substrate. Lenses describe how you relate to it. Problem chains identify what you are solving, from civilisational to specific.
        </p>
      </SectionCard>

      {/* ── DOMAINS ─────────────────────────────────────────── */}
      <SectionCard style={{ marginBottom: '20px' }}>
        <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: gold, marginBottom: '16px' }}>
          Domains <span style={{ color: 'rgba(15,21,35,0.40)', fontSize: '11px' }}>(first = primary)</span>
        </p>

        {domains.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <OrderedList
              items={domains}
              onReorder={(from, to) => reorderItem(domains, setDomains, from, to)}
              onRemove={removeDomain}
              renderItem={slug => DOMAIN_LABEL[slug] || slug}
            />
          </div>
        )}

        {domains.length < 7 && (
          <div>
            <Label>Add a domain</Label>
            <SelectInput
              value=""
              onChange={addDomain}
              options={[
                { value: '', label: '— Select domain to add —' },
                ...DOMAIN_LIST.filter(d => !domains.includes(d.value)),
              ]}
            />
          </div>
        )}

        {domains.length === 7 && (
          <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.50)' }}>Your work spans all seven domains.</p>
        )}

        {/* Horizon goal preview */}
        {previewDomain && DOMAIN_HORIZON[previewDomain] && (
          <div style={{ marginTop: '16px', background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '10px', padding: '14px 18px' }}>
            <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: gold, marginBottom: '6px' }}>
              {DOMAIN_LABEL[previewDomain]} Horizon Goal
            </p>
            <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.65, margin: 0 }}>
              {DOMAIN_HORIZON[previewDomain]}
            </p>
            <div style={{ marginTop: '14px' }}>
              <Label>Alignment note for {DOMAIN_LABEL[previewDomain]}</Label>
              <TextArea
                value={alignmentNotes[previewDomain] || ''}
                onChange={v => setAlignmentNotes(n => ({ ...n, [previewDomain]: v }))}
                placeholder="How does your work relate to this domain's horizon goal? One or two honest sentences."
                rows={2}
              />
            </div>
          </div>
        )}

        {/* Alignment notes for all selected domains */}
        {domains.filter(d => d !== previewDomain).map(slug => (
          <div key={slug} style={{ marginTop: '12px' }}>
            <Label>Alignment note — {DOMAIN_LABEL[slug]}</Label>
            <TextArea
              value={alignmentNotes[slug] || ''}
              onChange={v => setAlignmentNotes(n => ({ ...n, [slug]: v }))}
              placeholder={`How does your work relate to the ${DOMAIN_LABEL[slug]} horizon goal?`}
              rows={2}
            />
          </div>
        ))}
      </SectionCard>

      {/* ── SUBDOMAINS ───────────────────────────────────────── */}
      {domains.length > 0 && (
        <SectionCard style={{ marginBottom: '20px' }}>
          <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: gold, marginBottom: '6px' }}>
            Subdomains <span style={{ color: 'rgba(15,21,35,0.40)', fontSize: '11px' }}>(first = primary)</span>
          </p>
          <Hint>Select every subdomain your work genuinely addresses. First selected is primary.</Hint>
          <div style={{ marginTop: '12px' }}>
            {availableSubdomains.length === 0 ? (
              <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.50)' }}>Select domains first.</p>
            ) : (
              <ChipSelect
                options={availableSubdomains}
                selected={subdomains}
                onChange={setSubdomains}
              />
            )}
          </div>
          {subdomains.length > 1 && (
            <div style={{ marginTop: '12px' }}>
              <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.40)', marginBottom: '8px' }}>Order — drag first to set primary</p>
              <OrderedList
                items={subdomains}
                onReorder={(from, to) => reorderItem(subdomains, setSubdomains, from, to)}
                onRemove={i => setSubdomains(s => s.filter((_, idx) => idx !== i))}
                renderItem={slug => availableSubdomains.find(s => s.value === slug)?.label || slug}
              />
            </div>
          )}
        </SectionCard>
      )}

      {/* ── LENSES ───────────────────────────────────────────── */}
      {domains.length > 0 && (
        <SectionCard style={{ marginBottom: '20px' }}>
          <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: gold, marginBottom: '6px' }}>
            Lenses <span style={{ color: 'rgba(15,21,35,0.40)', fontSize: '11px' }}>(how you relate to the substrate)</span>
          </p>
          <Hint>Stable, few. Each domain has its own lens set. Select all that describe how your work operates.</Hint>
          <div style={{ marginTop: '12px' }}>
            <ChipSelect
              options={availableLenses}
              selected={lenses}
              onChange={setLenses}
              small
            />
          </div>
        </SectionCard>
      )}

      {/* ── PROBLEM CHAINS ───────────────────────────────────── */}
      <SectionCard style={{ marginBottom: '20px' }}>
        <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: gold, marginBottom: '6px' }}>
          Problem chains <span style={{ color: 'rgba(15,21,35,0.40)', fontSize: '11px' }}>(first = primary)</span>
        </p>
        <Hint>What specific problem are you solving? Use the hierarchy: civilisational level &gt; sector &gt; specific problem.</Hint>
        <div style={{ marginTop: '12px' }}>
          <ProblemChainEditor chains={problemChains} onChange={setProblemChains} />
        </div>
      </SectionCard>

      {/* ── PLATFORM PRINCIPLES ─────────────────────────────── */}
      <SectionCard style={{ marginBottom: '20px' }}>
        <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: gold, marginBottom: '6px' }}>
          Platform principles
        </p>
        <Hint>Which of the four cross-domain principles does your work materially engage?</Hint>
        <div style={{ marginTop: '12px' }}>
          <ChipSelect
            options={PLATFORM_PRINCIPLE_LIST}
            selected={platformPrinciples}
            onChange={setPlatformPrinciples}
          />
        </div>
        {platformPrinciples.length > 0 && (
          <div style={{ marginTop: '14px' }}>
            <PrincipleStrip
              taggings={platformPrinciples.map((slug, i) => ({
                principle_slug: slug,
                weight: i === 0 ? 'primary' : i === 1 ? 'secondary' : 'tertiary',
              }))}
            />
          </div>
        )}
      </SectionCard>

      {/* ── ALIGNMENT SCORE + RESOLUTION ────────────────────── */}
      <SectionCard style={{ marginBottom: '28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <Label>Alignment score (0–10)</Label>
            <TextInput
              value={alignmentScore}
              onChange={setAlignmentScore}
              placeholder="e.g. 8.5"
              type="number"
            />
            <Hint>How closely does the work align with its primary domain horizon goal?</Hint>
          </div>
          <div>
            <Label>Resolution</Label>
            <SelectInput
              value={resolution}
              onChange={setResolution}
              options={[
                { value: '', label: '— None —' },
                { value: 'local',    label: 'Local (Micro)' },
                { value: 'regional', label: 'Regional (Meso)' },
                { value: 'planetary',label: 'Planetary (Macro)' },
                { value: 'individual',    label: 'Individual' },
                { value: 'interpersonal', label: 'Interpersonal' },
                { value: 'civilisational',label: 'Civilisational' },
              ]}
            />
            <Hint>Optional refinement for Nature and Human Being actors.</Hint>
          </div>
        </div>
      </SectionCard>

      <div style={{ display: 'flex', gap: '12px' }}>
        <Btn onClick={save} disabled={saving || domains.length === 0} variant="solid">
          {saving ? 'Saving…' : 'Save placement'}
        </Btn>
      </div>

      {domains.length === 0 && (
        <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.50)', marginTop: '10px' }}>
          Add at least one domain to save.
        </p>
      )}
    </div>
  )
}
