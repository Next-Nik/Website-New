// src/app/pages/Add.jsx
//
// Public "Add to the ecosystem" page. Requires login.
//
// Structure:
//   1. Optional URL autofill at top — paste URL, AI reads site and
//      populates the form. If AI returns multiple records, additional
//      proposal cards appear below for the extras.
//   2. Form always visible — representation toggle + all fields.
//      Works without touching the URL section at all.
//   3. Save — primary record from form, plus any ticked extras from AI.
//      All go live immediately.
//
// Provenance:
//   "I'm adding to the ecosystem" → seeded_by: 'community', profile_owner: null
//   "I represent this org"        → seeded_by: 'self',      profile_owner: user.id

import { useState, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import { CIV_DOMAINS } from '../components/NextUsWheel'
import { PRINCIPLES_ORDERED } from '../constants/principles'
import PrincipleStrip from '../components/PrincipleStrip'
import { serif, body, sc } from '../../lib/designTokens'

// ── Design tokens ─────────────────────────────────────────────
const gold  = '#A8721A'
const dark  = '#0F1523'
const parch = '#FAFAF7'

const DOMAIN_LIST  = CIV_DOMAINS.map(d => ({ value: d.slug, label: d.label }))
const DOMAIN_OPTIONS = [{ value: '', label: '-- Select primary domain --' }, ...DOMAIN_LIST]

const DOMAIN_HORIZON_GOALS = {
  'human-being':     'Every human held in dignity, met with care, supported in becoming most fully themselves.',
  'society':         'A structure that gives everyone space to function and the possibility to thrive.',
  'nature':          'The living planet is thriving, and humanity lives as a regenerative participant in it.',
  'technology':      'Technology in service of life, human and planetary, designed to restore as it operates.',
  'finance-economy': 'An economy in which everyone has enough to act on what matters.',
  'legacy':          'A civilisation that knows what it carries, tends what it transmits, repairs what it broke.',
  'vision':          'Creating forward, as far as we can see, in service of the brightest future for all.',
}

const SCALES = [
  { value: '',              label: '-- Select scale --' },
  { value: 'local',         label: 'Local' },
  { value: 'municipal',     label: 'Municipal' },
  { value: 'regional',      label: 'Regional' },
  { value: 'national',      label: 'National' },
  { value: 'international', label: 'International' },
  { value: 'global',        label: 'Global' },
]

const ACTOR_TYPES = [
  { value: 'organisation', label: 'Organisation' },
  { value: 'project',      label: 'Project' },
  { value: 'practitioner', label: 'Practitioner' },
  { value: 'programme',    label: 'Programme' },
  { value: 'place',        label: 'Place' },
  { value: 'group',        label: 'Group' },
  { value: 'resource',     label: 'Resource' },
]

const LABEL_COLORS = {
  Planet:       { color: '#2A4A8A', bg: 'rgba(42,74,138,0.08)',  border: 'rgba(42,74,138,0.25)' },
  Self:         { color: '#2A6B3A', bg: 'rgba(42,107,58,0.08)',  border: 'rgba(42,107,58,0.25)' },
  Practitioner: { color: '#A8721A', bg: 'rgba(168,114,26,0.08)', border: 'rgba(168,114,26,0.25)' },
}

const EMPTY_FORM = {
  name: '', type: 'organisation', tagline: '', image_url: '',
  website: '', primary_domain: '',
  secondary_domains: [], scale: '', location_name: '',
  platform_principles: [], description: '',
  // AI-extracted placement (subdomain/field/chain slugs) — persisted on save
  subdomains: [], fields: [], problem_chains: [],
  // AI-extracted aux data (saved into actor_links / actor_press after insert)
  _aiLinks: [], _aiPress: [],
  // AI-proposed new problem-chains (saved to proposals table after insert)
  _proposedChains: [],
  // AI-proposed relationships (resolved during submit)
  relationships: [],
}

// ── Primitives ─────────────────────────────────────────────────

function FieldLabel({ children, required }) {
  return (
    <label style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: gold,
      display: 'block', marginBottom: '6px' }}>
      {children}{required && <span style={{ color: '#8A3030', marginLeft: '3px' }}>*</span>}
    </label>
  )
}

function Hint({ children }) {
  return <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
    marginTop: '5px', marginBottom: 0, lineHeight: 1.5 }}>{children}</p>
}

function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ ...body, fontSize: '15px', color: dark, padding: '10px 14px',
        borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)',
        background: '#FFFFFF', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
  )
}

function SelectInput({ value, onChange, options }) {
  return (
    <select value={value ?? ''} onChange={e => onChange(e.target.value)}
      style={{ ...body, fontSize: '15px', color: dark, padding: '10px 14px',
        borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)',
        background: '#FFFFFF', outline: 'none', width: '100%' }}>
      {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
    </select>
  )
}

function Field({ children, style }) {
  return <div style={{ marginBottom: '22px', ...style }}>{children}</div>
}

// ── Label badge for extra proposals ───────────────────────────

function LabelBadge({ label }) {
  const cfg = LABEL_COLORS[label] || LABEL_COLORS.Planet
  return (
    <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em',
      padding: '2px 10px', borderRadius: '40px',
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      {label}
    </span>
  )
}

// ── Duplicate card ─────────────────────────────────────────────

function DuplicateCard({ actor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      gap: '12px', padding: '10px 14px', marginBottom: '6px',
      background: 'rgba(200,146,42,0.04)', borderRadius: '8px',
      border: '1px solid rgba(200,146,42,0.22)' }}>
      <div>
        <div style={{ ...body, fontSize: '14px', color: dark }}>{actor.name}</div>
        {actor.location_name && (
          <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>{actor.location_name}</div>
        )}
      </div>
      <Link to={`/org/${actor.slug || actor.id}`} target="_blank"
        style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: gold,
          textDecoration: 'none', whiteSpace: 'nowrap', padding: '5px 12px',
          borderRadius: '40px', border: '1px solid rgba(200,146,42,0.35)',
          background: 'rgba(200,146,42,0.05)' }}>
        View
      </Link>
    </div>
  )
}

// ── Extra proposal card (AI-detected additional records) ───────

function ExtraProposalCard({ proposal, checked, onToggle, onChange }) {
  const primaryDomain = proposal.domains?.[0] || proposal.domain_id || ''
  return (
    <div style={{
      background: checked ? '#FFFFFF' : 'rgba(15,21,35,0.02)',
      border: checked ? '1.5px solid rgba(200,146,42,0.40)' : '1.5px solid rgba(200,146,42,0.16)',
      borderRadius: '10px', padding: '16px 18px', marginBottom: '10px',
      transition: 'all 0.15s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: checked ? '14px' : 0 }}>
        <button type="button" onClick={onToggle}
          style={{ width: '20px', height: '20px', borderRadius: '5px', flexShrink: 0,
            border: checked ? '2px solid #A8721A' : '2px solid rgba(200,146,42,0.35)',
            background: checked ? '#A8721A' : '#FFFFFF',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {checked && <span style={{ color: '#FFFFFF', fontSize: '12px', lineHeight: 1 }}>✓</span>}
        </button>
        <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em',
          color: gold, background: 'rgba(200,146,42,0.08)',
          border: '1px solid rgba(200,146,42,0.25)',
          padding: '2px 10px', borderRadius: '40px' }}>
          {proposal.type || 'organisation'}
        </span>
        <span style={{ ...body, fontSize: '15px', color: dark }}>{proposal.name}</span>
        {proposal.alignment_score != null && (
          <span style={{ ...sc, fontSize: '11px', color: 'rgba(15,21,35,0.55)', marginLeft: 'auto' }}>
            Score {proposal.alignment_score}
          </span>
        )}
      </div>

      {checked && (
        <div style={{ display: 'grid', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <FieldLabel>Name</FieldLabel>
              <TextInput value={proposal.name} onChange={v => onChange('name', v)} placeholder="Name" />
            </div>
            <div>
              <FieldLabel>Primary domain</FieldLabel>
              <SelectInput value={primaryDomain}
                onChange={v => onChange('domains', v ? [v] : [])}
                options={DOMAIN_OPTIONS} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <FieldLabel>Website</FieldLabel>
              <TextInput value={proposal.website} onChange={v => onChange('website', v)} placeholder="https://..." />
            </div>
            <div>
              <FieldLabel>Location</FieldLabel>
              <TextInput value={proposal.location_name} onChange={v => onChange('location_name', v)} placeholder="City, Country" />
            </div>
          </div>
          <div>
            <FieldLabel>Description</FieldLabel>
            <textarea value={proposal.description ?? ''} rows={2}
              onChange={e => onChange('description', e.target.value)}
              style={{ ...body, fontSize: '14px', color: dark, padding: '8px 12px',
                borderRadius: '7px', border: '1.5px solid rgba(200,146,42,0.28)',
                background: '#FFFFFF', outline: 'none', width: '100%',
                resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }} />
          </div>

          {/* Relationship + signal counts — these go in automatically with the save */}
          {(proposal.relationships?.length > 0 || proposal.links?.length > 0 || proposal.press?.length > 0) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '4px' }}>
              {proposal.relationships?.map((r, idx) => (
                <span key={idx} style={{ ...sc, fontSize: '10px', letterSpacing: '0.08em',
                  color: 'rgba(15,21,35,0.55)', background: 'rgba(200,146,42,0.06)',
                  border: '1px solid rgba(200,146,42,0.20)',
                  borderRadius: '40px', padding: '2px 9px' }}>
                  {r.relationship_type === 'parent_child' ? 'child of ' : r.relationship_type + ' '}{r.to_name}
                </span>
              ))}
              {proposal.links?.length > 0 && (
                <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.08em',
                  color: 'rgba(15,21,35,0.55)', background: 'rgba(42,107,58,0.06)',
                  border: '1px solid rgba(42,107,58,0.20)',
                  borderRadius: '40px', padding: '2px 9px' }}>
                  {proposal.links.length} link{proposal.links.length !== 1 ? 's' : ''}
                </span>
              )}
              {proposal.press?.length > 0 && (
                <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.08em',
                  color: 'rgba(15,21,35,0.55)', background: 'rgba(42,74,138,0.06)',
                  border: '1px solid rgba(42,74,138,0.20)',
                  borderRadius: '40px', padding: '2px 9px' }}>
                  {proposal.press.length} press mention{proposal.press.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────

export function AddPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // ── Primary form state ───────────────────────────────────────
  const [form, setForm]             = useState(EMPTY_FORM)
  const [represents, setRepresents] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState([])
  const [error, setError]           = useState(null)

  // ── URL autofill state ───────────────────────────────────────
  const [aiUrl, setAiUrl]           = useState('')
  const [reading, setReading]       = useState(false)
  const [readErr, setReadErr]       = useState(null)
  const [aiUsed, setAiUsed]         = useState(false)

  // ── Extra proposals from AI (beyond the first) ───────────────
  const [extras, setExtras]         = useState([])   // proposals[1], proposals[2]
  const [extraChecked, setExtraChecked] = useState([])

  // ── Duplicate detection ──────────────────────────────────────
  const [duplicates, setDuplicates]     = useState([])
  const [dupDismissed, setDupDismissed] = useState(false)
  const [dupTimer, setDupTimer]         = useState(null)

  // Auth gate
  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { state: { from: '/add' } })
  }, [user, authLoading, navigate])

  // Prefill from nav state (AddOverlay actor_type)
  useEffect(() => {
    const prefill = location.state?.prefill
    if (!prefill) return
    setForm(f => ({ ...f, type: prefill.actor_type ?? f.type }))
    navigate(location.pathname, { replace: true, state: null })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  // ── Duplicate check on name/website change ───────────────────
  useEffect(() => {
    clearTimeout(dupTimer)
    setDuplicates([]); setDupDismissed(false)
    const name = form.name.trim(); const website = form.website.trim()
    if (!name && !website) return
    const t = setTimeout(async () => {
      const queries = []
      if (name)    queries.push(supabase.from('nextus_actors').select('id,name,slug,website,location_name').ilike('name', `%${name}%`).eq('status','live').limit(3))
      if (website) queries.push(supabase.from('nextus_actors').select('id,name,slug,website,location_name').eq('website', website).eq('status','live').limit(3))
      const results = await Promise.all(queries)
      const all = results.flatMap(r => r.data || [])
      const seen = new Set()
      setDuplicates(all.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true }))
    }, 600)
    setDupTimer(t)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name, form.website])

  // ── AI autofill ──────────────────────────────────────────────
  async function readSite() {
    const input = aiUrl.trim()
    if (!input) return
    setReading(true); setReadErr(null); setAiUsed(false)
    setExtras([]); setExtraChecked([])

    try {
      const res  = await fetch('/api/org-extract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      })
      const data = await res.json()
      if (data.error) { setReadErr(data.message || 'Could not read the site.'); return }

      const results = data.results || []
      if (!results.length) { setReadErr('No actor found at that URL.'); return }

      // First result populates the main form
      const primary = results[0]
      setForm(f => ({
        ...f,
        name:           primary.name           || f.name,
        type:           primary.type           || f.type,
        tagline:        primary.tagline        || f.tagline,
        image_url:      primary.image_url      || f.image_url,
        website:        primary.website        || aiUrl,
        primary_domain: primary.domains?.[0]   || primary.domain_id || f.primary_domain,
        scale:          primary.scale          || f.scale,
        location_name:  primary.location_name  || f.location_name,
        description:    primary.description    || f.description,
        // Placement — subdomain/field/chain slugs the extractor assigned
        subdomains:     primary.subdomains     || [],
        fields:         primary.fields         || [],
        problem_chains: primary.problem_chains || [],
        // Stash auxiliary data for save phase — saved into actor_links and actor_press
        _aiLinks:       primary.links          || [],
        _aiPress:       primary.press          || [],
        // Stash proposed new chains for save phase — saved to proposals table
        _proposedChains: primary.proposed_chains || [],
        // Stash relationships so primary can have parent/child resolved
        relationships:  primary.relationships  || [],
      }))
      setAiUsed(true)

      // Remaining results become extra proposal cards (carrying their own links/press/relationships)
      if (results.length > 1) {
        setExtras(results.slice(1))
        setExtraChecked(results.slice(1).map(() => true))
      }
    } catch {
      setReadErr('Something went wrong. Fill the form manually below.')
    } finally {
      setReading(false)
    }
  }

  function updateExtra(i, key, value) {
    setExtras(ex => ex.map((e, idx) => idx === i ? { ...e, [key]: value } : e))
  }

  function toggleExtra(i) {
    setExtraChecked(c => c.map((v, idx) => idx === i ? !v : v))
  }

  // ── Domain helpers ───────────────────────────────────────────
  function toggleSecondary(slug) {
    const curr = form.secondary_domains
    set('secondary_domains', curr.includes(slug) ? curr.filter(s => s !== slug) : [...curr, slug])
  }
  function togglePrinciple(slug) {
    const curr = form.platform_principles
    set('platform_principles', curr.includes(slug) ? curr.filter(s => s !== slug) : [...curr, slug])
  }

  const selectedGoal = DOMAIN_HORIZON_GOALS[form.primary_domain]

  // ── Build save payload ───────────────────────────────────────
  function buildPayload(data, isExtra = false) {
    const domains = isExtra
      ? (data.domains?.length ? data.domains : (data.domain_id ? [data.domain_id] : []))
      : [form.primary_domain, ...form.secondary_domains.filter(s => s !== form.primary_domain)].filter(Boolean)

    return {
      name:                (data.name || '').trim(),
      type:                data.type || form.type || 'organisation',
      track:               data.track || null,
      tagline:             (data.tagline || '').trim() || null,
      image_url:           (data.image_url || '').trim() || null,
      description:         (data.description || '').trim() || null,
      story:               (data.story || '').trim() || null,
      domain_id:           domains[0] || null,
      domains,
      subdomains:          data.subdomains      || [],
      fields:              data.fields          || [],
      lenses:              data.lenses          || [],
      problem_chains:      data.problem_chains  || [],
      platform_principles: isExtra ? (data.platform_principles || []) : form.platform_principles,
      scale:               data.scale           || null,
      location_name:       (data.location_name || '').trim() || null,
      website:             (data.website || '').trim() || null,
      impact_summary:      (data.impact_summary || '').trim() || null,
      alignment_score:     data.alignment_score != null ? parseFloat(data.alignment_score) : null,
      alignment_score_computed:   true,
      alignment_score_updated_at: new Date().toISOString(),
      placement_tier:      data.placement_tier  || null,
      seeded_by:           represents ? 'self' : 'community',
      profile_owner:       represents ? user.id : null,
      owner_id:            represents ? user.id : null,
      represented_by_adder: represents,
      vetting_status:      'approved',
      status:              'live',
      lifecycle_status:    data.lifecycle_status || 'active',
      data_source:         aiUrl.trim() ? `community | ${aiUrl.trim()}` : 'community | manual',
      alignment_reasoning: data.hal_signals ? {
        hal_signals:     data.hal_signals,
        sfp_patterns:    data.sfp_patterns,
        score_reasoning: data.score_reasoning,
        confidence:      data.confidence,
        extracted_at:    new Date().toISOString(),
        input_mode:      'public_add',
        label:           data.label,
      } : null,
    }
  }

  // ── Save extracted links/press for an actor ──────────────────
  async function saveAuxiliaryData(actorId, data) {
    // Links
    if (Array.isArray(data.links) && data.links.length > 0) {
      const rows = data.links.map((l, idx) => ({
        actor_id:   actorId,
        link_type:  l.link_type,
        url:        l.url,
        label:      l.label || null,
        sort_order: idx,
      }))
      await supabase.from('actor_links').insert(rows)
    }
    // Press
    if (Array.isArray(data.press) && data.press.length > 0) {
      const rows = data.press.map((p, idx) => ({
        actor_id:     actorId,
        publication:  p.publication,
        url:          p.url          || null,
        title:        p.title        || null,
        published_at: p.published_at || null,
        sort_order:   idx,
      }))
      await supabase.from('actor_press').insert(rows)
    }
  }

  // ── Submit ───────────────────────────────────────────────────
  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim())    { setError('Name is required.'); return }
    if (!form.primary_domain) { setError('Please select a primary domain.'); return }

    setSaving(true); setError(null)
    const results = []
    const nameToId = {}  // for resolving relationship references

    // Save primary form record
    const { data: primary, error: pErr } = await supabase
      .from('nextus_actors').insert(buildPayload(form)).select('id, name, slug').single()
    if (pErr) { setError('Error saving: ' + pErr.message); setSaving(false); return }
    results.push({ id: primary.id, slug: primary.slug, name: form.name, label: 'Primary' })
    nameToId[form.name.trim().toLowerCase()] = primary.id

    // Save aux data for primary (from AI-populated form, if any)
    if (extras.length > 0 || aiUsed) {
      // Primary form may have aux data carried over from AI fill — save it
      const primaryAux = {
        links: form._aiLinks  || [],
        press: form._aiPress  || [],
      }
      await saveAuxiliaryData(primary.id, primaryAux)
    }

    // Save any ticked extras
    for (let i = 0; i < extras.length; i++) {
      if (!extraChecked[i]) continue
      const ex = extras[i]
      if (!ex.name?.trim() || !(ex.domains?.length || ex.domain_id)) continue
      const { data: saved, error: eErr } = await supabase
        .from('nextus_actors').insert(buildPayload(ex, true)).select('id, name, slug').single()
      if (!eErr && saved) {
        results.push({ id: saved.id, slug: saved.slug, name: ex.name, label: ex.label || 'Additional' })
        nameToId[ex.name.trim().toLowerCase()] = saved.id
        await saveAuxiliaryData(saved.id, ex)
      }
    }

    // Resolve and write parent/child/partner relationships proposed by AI
    // Only relationships where BOTH sides exist in this batch are written.
    const allActors = [
      { name: form.name, data: form, id: primary.id },
      ...extras
        .map((ex, i) => extraChecked[i] && nameToId[ex.name?.trim().toLowerCase()]
          ? { name: ex.name, data: ex, id: nameToId[ex.name.trim().toLowerCase()] }
          : null)
        .filter(Boolean),
    ]

    for (const actor of allActors) {
      const rels = actor.data.relationships || []
      for (const rel of rels) {
        const targetId = nameToId[rel.to_name?.trim().toLowerCase()]
        if (!targetId) continue
        // For parent_child, child's actor_id points to parent via parent_id column
        if (rel.relationship_type === 'parent_child') {
          await supabase.from('nextus_actors')
            .update({ parent_id: targetId })
            .eq('id', actor.id)
        } else {
          // member_of, partner — go into nextus_relationships, auto-confirmed
          // since both parties are being created together by the same user
          await supabase.from('nextus_relationships').insert({
            actor_id:          actor.id,
            related_actor_id:  targetId,
            relationship_type: rel.relationship_type,
            status:            'confirmed',
            initiated_by:      user.id,
            confirmed_by:      user.id,
            confirmed_at:      new Date().toISOString(),
          })
        }
      }
    }

    // Persist any AI-proposed new problem-chains for admin review. These are
    // suggestions only — never applied to the actor automatically. Each is
    // linked to the actor it surfaced from. Non-fatal: a failure here never
    // blocks the save.
    try {
      const proposalRows = []
      for (const actor of allActors) {
        const proposals = actor.data._proposedChains || actor.data.proposed_chains || []
        for (const p of proposals) {
          if (!p?.slug || !p?.label) continue
          proposalRows.push({
            proposed_slug: p.slug,
            label:         p.label,
            description:   p.description || null,
            domains:       Array.isArray(p.domains) ? p.domains : [],
            aliases:       Array.isArray(p.aliases) ? p.aliases : [],
            rationale:     p.rationale || null,
            actor_id:      actor.id,
            proposed_by:   user?.id || null,
          })
        }
      }
      if (proposalRows.length) {
        await supabase.from('nextus_problem_chain_proposals').insert(proposalRows)
      }
    } catch (propErr) {
      console.warn('Problem-chain proposal save skipped:', propErr?.message)
    }

    setSaving(false)
    setSaved(results)
  }

  function reset() {
    setForm(EMPTY_FORM); setRepresents(false); setSaved([]); setError(null)
    setAiUrl(''); setAiUsed(false); setReadErr(null)
    setExtras([]); setExtraChecked([]); setDuplicates([]); setDupDismissed(false)
  }

  // ── Done state ───────────────────────────────────────────────
  if (saved.length > 0) {
    return (
      <div style={{ background: parch, minHeight: '100vh' }}>
        <Nav />
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '120px 24px 80px', textAlign: 'center' }}>
          <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.22em', color: gold,
            textTransform: 'uppercase', marginBottom: '18px' }}>Added to the Atlas</div>
          <h1 style={{ ...serif, fontSize: 'clamp(26px,4vw,38px)', fontWeight: 400,
            color: dark, lineHeight: 1.1, marginBottom: '24px' }}>
            {saved.length === 1 ? `${saved[0].name} is on the map.` : `${saved.length} entries are on the map.`}
          </h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
            {saved.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                {s.label !== 'Primary' && <LabelBadge label={s.label} />}
                <span style={{ ...body, fontSize: '15px', color: dark }}>{s.name}</span>
                <Link to={`/org/${s.slug || s.id}`} target="_blank"
                  style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: gold, textDecoration: 'none' }}>
                  View
                </Link>
              </div>
            ))}
          </div>
          {!represents && (
            <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.65)',
              lineHeight: 1.7, marginBottom: '28px' }}>
              Send the profile link above to anyone who wants to claim and manage their entry.
            </p>
          )}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={reset}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '12px 24px',
                borderRadius: '40px', background: 'rgba(200,146,42,0.06)',
                border: '1.5px solid rgba(200,146,42,0.55)', color: gold, cursor: 'pointer' }}>
              Add another
            </button>
            <Link to="/feed"
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '12px 24px',
                borderRadius: '40px', background: 'transparent',
                border: '1px solid rgba(200,146,42,0.30)',
                color: 'rgba(15,21,35,0.72)', textDecoration: 'none' }}>
              Back to feed
            </Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    )
  }

  if (authLoading) return <div style={{ background: parch, minHeight: '100vh' }}><Nav /></div>

  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '96px 24px 120px' }}>

        {/* Header */}
        <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.22em', color: gold,
          textTransform: 'uppercase', marginBottom: '12px' }}>Atlas</div>
        <h1 style={{ ...serif, fontSize: 'clamp(30px,5vw,46px)', fontWeight: 400,
          color: dark, lineHeight: 1.08, marginBottom: '10px' }}>
          Add to the ecosystem
        </h1>
        <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.65)',
          lineHeight: 1.7, marginBottom: '24px', maxWidth: '520px' }}>
          Know an organisation, practitioner, place, or project doing serious work toward a Horizon Goal?
          Add them. They go live immediately.
        </p>

        {/* ── Optional URL autofill ─────────────────────────── */}
        <div style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.22)',
          borderRadius: '12px', padding: '18px 20px', marginBottom: '32px' }}>
          <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.20em',
            color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Autofill from any source — optional
          </div>
          <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
            lineHeight: 1.55, marginBottom: '12px' }}>
            Paste any public URL — their website, podcast, YouTube channel, Substack, LinkedIn,
            or another platform where they show up. Or paste a description if there's no URL.
            You review and edit before anything goes live.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <textarea value={aiUrl}
              onChange={e => setAiUrl(e.target.value)}
              rows={3}
              placeholder={'Paste any URL — https://example.com, a YouTube channel, a Substack, etc.\nOr paste raw page source — <!DOCTYPE html>...\nOr describe them in plain text'}
              style={{ ...body, fontSize: '14px', color: dark, padding: '10px 14px',
                borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.28)',
                background: parch, outline: 'none', width: '100%',
                resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={readSite} disabled={reading || !aiUrl.trim()}
                style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em',
                  padding: '10px 22px', borderRadius: '40px', border: 'none',
                  background: reading || !aiUrl.trim() ? 'rgba(200,146,42,0.25)' : '#C8922A',
                  color: '#FFFFFF', whiteSpace: 'nowrap',
                  cursor: reading || !aiUrl.trim() ? 'not-allowed' : 'pointer' }}>
                {reading ? (
                  <>
                    <span style={{
                      display: 'inline-block', width: '12px', height: '12px',
                      border: '2px solid rgba(255,255,255,0.4)',
                      borderTopColor: '#FFFFFF',
                      borderRadius: '50%',
                      animation: 'add-spin 0.7s linear infinite',
                      marginRight: '6px', verticalAlign: 'middle',
                    }} />
                    Reading...
                  </>
                ) : 'Read site'}
              </button>
            </div>
          </div>
          {readErr && (
            <p style={{ ...body, fontSize: '13px', color: '#8A3030', marginTop: '8px', marginBottom: 0 }}>
              {readErr}
            </p>
          )}
          {aiUsed && !readErr && (
            <p style={{ ...body, fontSize: '13px', color: gold, marginTop: '8px', marginBottom: 0 }}>
              Form filled from site — review everything before submitting.
            </p>
          )}
        </div>

        {/* ── Representation toggle ─────────────────────────── */}
        <div style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.22)',
          borderRadius: '12px', padding: '18px 20px', marginBottom: '32px' }}>
          <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.20em',
            color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase', marginBottom: '12px' }}>
            Your relationship to this entry
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(() => {
              // Adapt the toggle copy to the selected actor type
              const t = form.type
              const isPractitioner = t === 'practitioner'
              const isPerson       = isPractitioner
              const targetWord     = isPractitioner ? 'practitioner' :
                                     t === 'organisation' ? 'organisation' :
                                     t === 'place'        ? 'place' :
                                     t === 'programme'    ? 'programme' :
                                     t === 'project'      ? 'project' :
                                     t === 'group'        ? 'group' :
                                     t === 'resource'     ? 'resource' :
                                     'entry'
              const selfLabel = isPractitioner
                ? 'I am this person'
                : t === 'organisation' ? 'I represent this organisation'
                : t === 'place'        ? 'I run / steward this place'
                : t === 'programme'    ? 'I run this programme'
                : t === 'project'      ? 'I run this project'
                : t === 'group'        ? 'I run this group'
                : t === 'resource'     ? 'I created this resource'
                : 'This is mine'
              const selfHint = isPractitioner
                ? "I'm adding my own practitioner profile. I'll own and manage it."
                : `I'm adding my own ${targetWord}. I'll be the owner and can manage it directly.`
              const otherLabel = "I'm adding this to the ecosystem"
              const otherHint  = isPractitioner
                ? `I don't represent this person. NextUs holds the entry in trust until they claim it.`
                : `I don't run this ${targetWord}. NextUs holds the entry in trust until claimed.`
              return [
                { val: false, label: otherLabel, hint: otherHint },
                { val: true,  label: selfLabel,  hint: selfHint  },
              ]
            })().map(opt => (
              <button key={String(opt.val)} type="button" onClick={() => setRepresents(opt.val)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '13px 15px', borderRadius: '9px', cursor: 'pointer', textAlign: 'left',
                  border: represents === opt.val
                    ? '1.5px solid rgba(200,146,42,0.55)' : '1.5px solid rgba(200,146,42,0.18)',
                  background: represents === opt.val ? 'rgba(200,146,42,0.04)' : '#FAFAF7' }}>
                <div style={{ width: '17px', height: '17px', borderRadius: '50%', flexShrink: 0,
                  marginTop: '2px',
                  border: represents === opt.val ? '5px solid #A8721A' : '2px solid rgba(200,146,42,0.38)',
                  background: '#FFFFFF', transition: 'all 0.15s ease' }} />
                <div>
                  <div style={{ ...body, fontSize: '15px', color: dark, lineHeight: 1.3 }}>{opt.label}</div>
                  <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
                    lineHeight: 1.5, marginTop: '3px' }}>{opt.hint}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Duplicate warning ─────────────────────────────── */}
        {duplicates.length > 0 && !dupDismissed && (
          <div style={{ background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.28)',
            borderRadius: '12px', padding: '16px 18px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '10px' }}>
              <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: gold }}>
                Already on the map
              </div>
              <button onClick={() => setDupDismissed(true)}
                style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
                  background: 'none', border: 'none', cursor: 'pointer' }}>
                These are different, continue
              </button>
            </div>
            <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.65)',
              lineHeight: 1.55, marginBottom: '10px' }}>
              {duplicates.length === 1 ? 'A similar entry is' : 'Similar entries are'} already on the map.
              Is one of these what you're adding?
            </p>
            {duplicates.map(a => <DuplicateCard key={a.id} actor={a} />)}
          </div>
        )}

        {/* ── Main form ─────────────────────────────────────── */}
        <form onSubmit={submit}>

          {/* Name + Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', marginBottom: '22px' }}>
            <div>
              <FieldLabel required>Name</FieldLabel>
              <TextInput value={form.name} onChange={v => set('name', v)} placeholder="Name" />
            </div>
            <div style={{ minWidth: '160px' }}>
              <FieldLabel>Type</FieldLabel>
              <SelectInput value={form.type} onChange={v => set('type', v)} options={ACTOR_TYPES} />
            </div>
          </div>

          {/* Website */}
          <Field>
            <FieldLabel>Website</FieldLabel>
            <TextInput value={form.website} onChange={v => set('website', v)} placeholder="https://..." type="url" />
          </Field>

          {/* Primary domain */}
          <Field>
            <FieldLabel required>Primary domain</FieldLabel>
            <Hint>Which civilisational domain does the headline impact land in?</Hint>
            <div style={{ marginTop: '8px' }}>
              <SelectInput value={form.primary_domain}
                onChange={v => {
                  set('primary_domain', v)
                  set('secondary_domains', form.secondary_domains.filter(s => s !== v))
                }}
                options={DOMAIN_OPTIONS} />
            </div>
            {selectedGoal && (
              <div style={{ marginTop: '10px', padding: '11px 13px',
                background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.18)',
                borderRadius: '8px' }}>
                <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.14em',
                  color: 'rgba(15,21,35,0.55)', marginBottom: '4px' }}>HORIZON GOAL</div>
                <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.72)',
                  lineHeight: 1.65, margin: 0 }}>{selectedGoal}</p>
              </div>
            )}
          </Field>

          {/* Secondary domains */}
          {form.primary_domain && (
            <Field>
              <FieldLabel>Secondary domains</FieldLabel>
              <Hint>Where else does this work honestly live? Do not pad.</Hint>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {CIV_DOMAINS.filter(d => d.slug !== form.primary_domain).map(d => {
                  const isOn = form.secondary_domains.includes(d.slug)
                  return (
                    <button key={d.slug} type="button" onClick={() => toggleSecondary(d.slug)}
                      style={{ ...sc, fontSize: '12px', letterSpacing: '0.04em',
                        padding: '5px 12px', borderRadius: '40px', cursor: 'pointer',
                        color: isOn ? gold : 'rgba(15,21,35,0.72)',
                        background: isOn ? 'rgba(200,146,42,0.08)' : '#FFFFFF',
                        border: isOn ? '1px solid rgba(200,146,42,0.55)' : '1px solid rgba(200,146,42,0.25)' }}>
                      {d.label}
                    </button>
                  )
                })}
              </div>
            </Field>
          )}

          {/* Scale + Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field>
              <FieldLabel>Scale</FieldLabel>
              <SelectInput value={form.scale} onChange={v => set('scale', v)} options={SCALES} />
            </Field>
            <Field>
              <FieldLabel>Location</FieldLabel>
              <TextInput value={form.location_name} onChange={v => set('location_name', v)} placeholder="City, Country" />
            </Field>
          </div>

          {/* Description */}
          <Field>
            <FieldLabel>Description</FieldLabel>
            <Hint>What do they actually do? One sentence on what they are, one on the specific thing that makes them worth adding.</Hint>
            <div style={{ marginTop: '8px' }}>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4}
                style={{ ...body, fontSize: '15px', color: dark, padding: '10px 14px',
                  borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)',
                  background: '#FFFFFF', outline: 'none', width: '100%',
                  resize: 'vertical', lineHeight: 1.65, boxSizing: 'border-box' }} />
            </div>
          </Field>

          {/* Platform principles */}
          <Field>
            <FieldLabel>Platform principles engaged</FieldLabel>
            <Hint>Optional. Which cross-domain principles does this actor materially engage?</Hint>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '10px' }}>
              {PRINCIPLES_ORDERED.map(p => {
                const isOn = form.platform_principles.includes(p.slug)
                return (
                  <button key={p.slug} type="button" onClick={() => togglePrinciple(p.slug)}
                    style={{ ...sc, fontSize: '12px', letterSpacing: '0.04em',
                      padding: '5px 12px', borderRadius: '40px', cursor: 'pointer',
                      color: isOn ? gold : 'rgba(15,21,35,0.72)',
                      background: isOn ? 'rgba(200,146,42,0.08)' : '#FFFFFF',
                      border: isOn ? '1px solid rgba(200,146,42,0.55)' : '1px solid rgba(200,146,42,0.25)' }}>
                    {p.label}
                  </button>
                )
              })}
            </div>
            {form.platform_principles.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <PrincipleStrip slugs={form.platform_principles} size="sm" />
              </div>
            )}
          </Field>

          {/* ── AI-detected extra records ─────────────────────── */}
          {extras.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em',
                color: gold, marginBottom: '10px' }}>
                Also identified — add these too?
              </div>
              {extras.map((ex, i) => (
                <ExtraProposalCard
                  key={i}
                  proposal={ex}
                  checked={extraChecked[i]}
                  onToggle={() => toggleExtra(i)}
                  onChange={(key, value) => updateExtra(i, key, value)}
                />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(138,48,48,0.05)', border: '1px solid rgba(138,48,48,0.25)',
              borderRadius: '8px', padding: '12px 16px', marginBottom: '20px' }}>
              <p style={{ ...body, fontSize: '14px', color: '#8A3030', margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={saving}
            style={{ ...sc, fontSize: '14px', letterSpacing: '0.16em',
              padding: '14px 32px', borderRadius: '40px', border: 'none',
              background: saving ? 'rgba(200,146,42,0.35)' : '#C8922A',
              color: '#FFFFFF', cursor: saving ? 'not-allowed' : 'pointer',
              display: 'block', width: '100%', marginTop: '8px' }}>
            {saving ? 'Adding...' : extras.some((_, i) => extraChecked[i])
              ? `Add ${1 + extraChecked.filter(Boolean).length} entries to the Atlas`
              : 'Add to the Atlas'}
          </button>

          <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
            lineHeight: 1.55, textAlign: 'center', marginTop: '12px' }}>
            {represents
              ? 'Your entry goes live immediately. You can edit it any time.'
              : 'This entry goes live immediately. The organisation can claim and manage it later.'
            }
          </p>
        </form>
      </div>
      <style>{`@keyframes add-spin { to { transform: rotate(360deg); } }`}</style>
      <SiteFooter />
    </div>
  )
}