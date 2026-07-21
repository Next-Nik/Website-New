// src/app/pages/Add.jsx
//
// Public "Add to the Atlas" page. Requires login.
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
//   "I'm adding this to the Atlas" → seeded_by: 'community', profile_owner: null
//   "I represent this org"        → seeded_by: 'self',      profile_owner: user.id

import { logActivity } from '../components/pulse/logActivity'
import { SHOW_ALIGNMENT_PUBLIC } from '../components/OrgShared'
import { useState, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import { CIV_DOMAINS } from '../components/NextUsWheel'
import { PRINCIPLES_ORDERED } from '../constants/principles'
import PrincipleStrip from '../components/PrincipleStrip'
import { SCALES as CANONICAL_SCALES } from '../constants/scales'
import { serif, body, sc, at } from '../../lib/designTokens'
import { downscaleImage } from '../../lib/imageDownscale'

// ── Design tokens ─────────────────────────────────────────────
const gold  = at.brass
const dark  = at.text
const parch = at.ground

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

// Canonical eight-level taxonomy — single source of truth (imported above).
const SCALES = [
  { value: '', label: '-- Select scale --' },
  ...CANONICAL_SCALES.map(s => ({ value: s.slug, label: s.label })),
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

// Accepts bare domains like "nasa.gov" and prepends https:// if no protocol present
function normaliseUrl(raw) {
  if (!raw || !raw.trim()) return raw
  const s = raw.trim()
  if (/^https?:\/\//i.test(s)) return s
  return 'https://' + s
}

// ── Primitives ─────────────────────────────────────────────────

function FieldLabel({ children, required }) {
  return (
    <label style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: gold,
      display: 'block', marginBottom: '6px' }}>
      {children}{required && <span style={{ color: '#8A3030', marginLeft: '3px' }}>*</span>}
    </label>
  )
}

function Hint({ children }) {
  return <p style={{ ...body, fontSize: '13px', color: at.ghost,
    marginTop: '5px', marginBottom: 0, lineHeight: 1.5 }}>{children}</p>
}

function TextInput({ value, onChange, onBlur, placeholder, type = 'text' }) {
  return (
    <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      style={{ ...body, fontSize: '15px', color: dark, padding: '10px 14px',
        borderRadius: '8px', border: '1.5px solid rgba(217,178,74,0.30)',
        background: at.object, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
  )
}

function SelectInput({ value, onChange, options }) {
  return (
    <select value={value ?? ''} onChange={e => onChange(e.target.value)}
      style={{ ...body, fontSize: '15px', color: dark, padding: '10px 14px',
        borderRadius: '8px', border: '1.5px solid rgba(217,178,74,0.30)',
        background: at.object, outline: 'none', width: '100%' }}>
      {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
    </select>
  )
}

function Field({ children, style }) {
  return <div style={{ marginBottom: '22px', ...style }}>{children}</div>
}

// ── Duplicate card ─────────────────────────────────────────────

function DuplicateCard({ actor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      gap: '12px', padding: '10px 14px', marginBottom: '6px',
      background: 'rgba(217,178,74,0.04)', borderRadius: '8px',
      border: '1px solid rgba(217,178,74,0.22)' }}>
      <div>
        <div style={{ ...body, fontSize: '14px', color: dark }}>{actor.name}</div>
        {actor.location_name && (
          <div style={{ ...body, fontSize: '13px', color: at.ghost }}>{actor.location_name}</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
        {!actor.profile_owner && (
          <Link to={`/org/${actor.slug || actor.id}/claim`} target="_blank"
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: at.object,
              textDecoration: 'none', whiteSpace: 'nowrap', padding: '5px 12px',
              borderRadius: '40px', border: '1px solid rgba(217,178,74,0.55)',
              background: gold }}>
            Claim it
          </Link>
        )}
        <Link to={`/org/${actor.slug || actor.id}`} target="_blank"
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: gold,
            textDecoration: 'none', whiteSpace: 'nowrap', padding: '5px 12px',
            borderRadius: '40px', border: '1px solid rgba(217,178,74,0.35)',
            background: 'rgba(217,178,74,0.05)' }}>
          View
        </Link>
      </div>
    </div>
  )
}

// ── Extra proposal card (AI-detected additional records) ───────

function ExtraProposalCard({ proposal, checked, onToggle, onChange }) {
  const primaryDomain = proposal.domains?.[0] || proposal.domain_id || ''
  return (
    <div style={{
      background: checked ? at.object : 'rgba(234,241,237,0.04)',
      border: checked ? '1.5px solid rgba(217,178,74,0.40)' : '1.5px solid rgba(217,178,74,0.16)',
      borderRadius: '10px', padding: '16px 18px', marginBottom: '10px',
      transition: 'all 0.15s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: checked ? '14px' : 0 }}>
        <button type="button" onClick={onToggle}
          style={{ width: '20px', height: '20px', borderRadius: '5px', flexShrink: 0,
            border: checked ? '2px solid at.brass' : '2px solid rgba(217,178,74,0.35)',
            background: checked ? at.brass : at.object,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {checked && <span style={{ color: at.object, fontSize: '13px', lineHeight: 1 }}>✓</span>}
        </button>
        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em',
          color: gold, background: 'rgba(217,178,74,0.08)',
          border: '1px solid rgba(217,178,74,0.25)',
          padding: '2px 10px', borderRadius: '40px' }}>
          {proposal.type || 'organisation'}
        </span>
        <span style={{ ...body, fontSize: '15px', color: dark }}>{proposal.name}</span>
        {SHOW_ALIGNMENT_PUBLIC && proposal.alignment_score != null && (
          <span style={{ ...sc, fontSize: '13px', color: at.ghost, marginLeft: 'auto' }}>
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
              <TextInput value={proposal.website} onChange={v => onChange('website', v)} placeholder="https://…" />
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
                borderRadius: '7px', border: '1.5px solid rgba(217,178,74,0.28)',
                background: at.object, outline: 'none', width: '100%',
                resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }} />
          </div>

          {/* Relationship + signal counts — these go in automatically with the save */}
          {(proposal.relationships?.length > 0 || proposal.links?.length > 0 || proposal.press?.length > 0) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '4px' }}>
              {proposal.relationships?.map((r, idx) => (
                <span key={idx} style={{ ...sc, fontSize: '13px', letterSpacing: '0.08em',
                  color: at.ghost, background: 'rgba(217,178,74,0.06)',
                  border: '1px solid rgba(217,178,74,0.20)',
                  borderRadius: '40px', padding: '2px 9px' }}>
                  {r.to_name}
                </span>
              ))}
              {proposal.links?.length > 0 && (
                <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.08em',
                  color: at.ghost, background: 'rgba(42,107,58,0.06)',
                  border: '1px solid rgba(42,107,58,0.20)',
                  borderRadius: '40px', padding: '2px 9px' }}>
                  {proposal.links.length} link{proposal.links.length !== 1 ? 's' : ''}
                </span>
              )}
              {proposal.press?.length > 0 && (
                <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.08em',
                  color: at.ghost, background: 'rgba(42,74,138,0.06)',
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

  // Where to send the author after a self-registration, if they arrived mid-flow
  // (e.g. the Earth Challenge "Create a challenge" door sends a new author here
  // to set up an org or profile, then back to the builder).
  const _params  = new URLSearchParams(location.search)
  const returnTo = _params.get('then')

  // Owned-only mode: the author-profile floor. Reached from the challenge author
  // surface, where the only valid outcome is a profile the person controls.
  // No third-party option, and name + picture + statement are all required —
  // you show up as a findable someone, or you don't publish a challenge.
  const mineMode = _params.get('mine') === '1'
  const mineType = _params.get('type') || ''   // 'org' | 'practitioner'

  // ── Primary form state ───────────────────────────────────────
  const [form, setForm]             = useState(mineType === 'practitioner'
    ? { ...EMPTY_FORM, type: 'practitioner' }
    : EMPTY_FORM)
  const [represents, setRepresents] = useState(mineMode ? true : false)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState([])
  const [error, setError]           = useState(null)

  // ── Staged flow: 'source' (paste URL / choose manual) → 'form' (review & edit)
  const [stage, setStage]           = useState('source')
  const [imgBroken, setImgBroken]   = useState(false)
  const [imgBusy, setImgBusy]       = useState(false)
  const [imgErr, setImgErr]         = useState('')

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
    if (!authLoading && !user) navigate(`/login?redirect=${encodeURIComponent('/add')}`)
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

  // Upload a file from the device, downscale in-browser, host it, and drop the
  // resulting public URL into image_url — same mechanic as the challenge author.
  async function onPickImage(e) {
    const file = e.target.files?.[0]
    if (e.target) e.target.value = ''
    if (!file) return
    setImgErr(''); setImgBusy(true)
    try {
      const { dataUrl } = await downscaleImage(file)
      let imgToken = null
      try { imgToken = (await supabase.auth.getSession()).data.session?.access_token || null } catch {}
      const res = await fetch('/api/actor-image-upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(imgToken ? { Authorization: `Bearer ${imgToken}` } : {}) },
        body: JSON.stringify({ imageData: dataUrl }),
      })
      const json = await res.json()
      if (!res.ok || !json.image_url) throw new Error(json.error || 'Upload failed')
      set('image_url', json.image_url); setImgBroken(false)
    } catch (err) {
      setImgErr(err.message || 'Could not upload that image')
    } finally {
      setImgBusy(false)
    }
  }

  // ── Duplicate check on name/website change ───────────────────
  useEffect(() => {
    clearTimeout(dupTimer)
    setDuplicates([]); setDupDismissed(false)
    // Short names (e.g. "Nik") over-match — require 4+ chars before checking.
    const name    = form.name.trim().length >= 4 ? form.name.trim() : ''
    // Compare on the normalised URL so "nasa.gov" and "https://nasa.gov" hit the same row.
    const website = normaliseUrl(form.website.trim()) || ''
    if (!name && !website) return
    const t = setTimeout(async () => {
      const queries = []
      if (name)    queries.push(supabase.from('nextus_actors').select('id,name,slug,website,location_name,profile_owner').ilike('name', `%${name}%`).eq('status','live').limit(3))
      if (website) queries.push(supabase.from('nextus_actors').select('id,name,slug,website,location_name,profile_owner').eq('website', website).eq('status','live').limit(3))
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
    setReading(true); setReadErr(null)
    setExtras([]); setExtraChecked([])
    setDupDismissed(false)

    try {
      const res  = await fetch('/api/org-extract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      })
      const data = await res.json()
      if (data.error) { setReadErr(data.message || 'Could not read the site.'); return }

      const results = data.results || []
      if (!results.length) { setReadErr('We could not find a person, organisation, or project at that URL.'); return }

      // First result populates the main form. Build from a clean slate rather
      // than merging into current state — a re-read must fully replace a prior
      // (possibly garbage) read, never mix with it.
      const primary = results[0]
      const base = mineMode ? { ...EMPTY_FORM, type: 'practitioner' } : EMPTY_FORM
      setForm({
        ...base,
        name:           primary.name           || base.name,
        type:           primary.type           || base.type,
        tagline:        primary.tagline        || base.tagline,
        image_url:      primary.image_url      || base.image_url,
        website:        primary.website        || aiUrl,
        primary_domain: primary.domains?.[0]   || primary.domain_id || base.primary_domain,
        scale:          primary.scale          || base.scale,
        location_name:  primary.location_name  || base.location_name,
        description:    primary.description    || base.description,
        // Placement — subdomain/field/chain slugs the extractor assigned
        subdomains:     primary.subdomains     || [],
        fields:         primary.fields         || [],
        problem_chains: primary.problem_chains || [],
        // Stash auxiliary data for save phase — saved into actor_links and actor_press
        _aiLinks:       primary.links          || [],
        _aiPress:       primary.press          || [],
        // Stash proposed new chains for save phase — saved to proposals table
        _proposedChains: primary.proposed_chains || [],
        // Stash proposed practices for save phase — persisted via /api/practice-persist
        practices:      primary.practices       || [],
        // Stash relationships so primary can have parent/child resolved
        relationships:  primary.relationships  || [],
      })
      setAiUsed(true)
      setImgBroken(false)

      // Remaining results become extra proposal cards (carrying their own links/press/relationships)
      if (results.length > 1) {
        setExtras(results.slice(1))
        setExtraChecked(results.slice(1).map(() => true))
      }

      // Source read — move to the review stage
      setStage('form')
    } catch {
      setReadErr('Something went wrong reading that source. You can try again or fill in manually.')
    } finally {
      setReading(false)
    }
  }

  // Reset everything and return to the source stage
  function startOver() {
    setForm(mineMode ? { ...EMPTY_FORM, type: 'practitioner' } : EMPTY_FORM)
    setRepresents(mineMode ? true : false)
    setExtras([]); setExtraChecked([])
    setAiUrl(''); setAiUsed(false); setReadErr(null)
    setImgBroken(false)
    setDuplicates([]); setDupDismissed(false)
    setError(null)
    setStage('source')
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

  // ── Ownership toggle ─────────────────────────────────────────
  // Rendered on BOTH stages. The pick must stay changeable on the review
  // form: locking it after the read forced a full restart when someone
  // picked wrong (July 2026). Hidden in owned-only mode: the only valid
  // outcome there is a profile the person controls.
  const representsToggle = !mineMode && (
        <div style={{ background: at.object, border: '1.5px solid rgba(217,178,74,0.22)',
          borderRadius: '12px', padding: '18px 20px', marginBottom: '32px' }}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.20em',
            color: at.ghost, textTransform: 'uppercase', marginBottom: '12px' }}>
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
              const otherLabel = "I'm adding this to the Atlas"
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
                    ? '1.5px solid rgba(217,178,74,0.55)' : '1.5px solid rgba(217,178,74,0.18)',
                  background: represents === opt.val ? 'rgba(217,178,74,0.04)' : at.object }}>
                <div style={{ width: '17px', height: '17px', borderRadius: '50%', flexShrink: 0,
                  marginTop: '2px',
                  border: represents === opt.val ? `5px solid ${at.brass}` : '2px solid rgba(217,178,74,0.38)',
                  background: at.object, transition: 'all 0.15s ease' }} />
                <div>
                  <div style={{ ...body, fontSize: '15px', color: dark, lineHeight: 1.3 }}>{opt.label}</div>
                  <div style={{ ...body, fontSize: '13px', color: at.ghost,
                    lineHeight: 1.5, marginTop: '3px' }}>{opt.hint}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
  )


  // ── Submit ───────────────────────────────────────────────────
  // The save runs entirely server-side via /api/add-actor (service-role). The
  // browser sends descriptive fields only; ownership, vetting and live status
  // are set on the server. See api/add-actor.js.
  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim())    { setError('Name is required.'); return }
    if (mineMode) {
      if (!form.image_url.trim())   { setError('A picture is required. Add a photo or logo so people can see who is showing up.'); return }
      if (!form.description.trim()) { setError('A statement of what you do is required.'); return }
    }
    if (!form.primary_domain) { setError('Please select a primary domain.'); return }

    setSaving(true); setError(null)

    // Only the rows the user ticked come along as extras.
    const chosenExtras = extras.filter((_, i) => extraChecked[i])

    // The save runs server-side under the service key: it attributes the add to
    // this user, sets ownership/vetting/status itself, and writes the actor plus
    // its links, press, relationships and chain proposals in one trusted pass —
    // so the browser never touches RLS. Authenticate the call with the session.
    let token = null
    try { token = (await supabase.auth.getSession()).data.session?.access_token || null } catch {}
    if (!token) {
      setError('Your session has expired. Please sign in again and retry.')
      setSaving(false)
      return
    }

    let results = []
    try {
      const resp = await fetch('/api/add-actor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ represents, aiUrl, primary: form, extras: chosenExtras }),
      })
      const json = await resp.json().catch(() => ({}))
      if (!resp.ok || !json.ok) {
        console.error('Add: actor save failed', json)
        setError(json.error || 'Something went wrong saving this entry. Please try again, or email hello@nextus.world if it keeps happening.')
        setSaving(false)
        return
      }
      results = json.results || []
      if (json.warnings?.length) console.warn('Add: saved with warnings', json.warnings)
    } catch (err) {
      console.error('Add: actor save failed', err)
      setError('Something went wrong saving this entry. Please try again, or email hello@nextus.world if it keeps happening.')
      setSaving(false)
      return
    }

    // Map saved names → ids so the follow-up passes can target the new rows.
    const nameToId = {}
    results.forEach(r => { if (r.name) nameToId[r.name.trim().toLowerCase()] = r.id })
    const primaryResult = results.find(r => r.label === 'Primary') || results[0]

    // The pulse: a new actor is live on the Atlas (public entity).
    if (primaryResult) {
      logActivity({
        eventType: 'actor_added',
        subjectType: 'actor',
        subjectId: primaryResult.id,
        subjectName: primaryResult.name || form.name,
        subjectSlug: primaryResult.slug,
        domain: form.primary_domain || null,
      })
    }

    // Rebuild the actor set (with their new ids) for the image + practice passes.
    const allActors = [
      primaryResult ? { data: form, id: primaryResult.id } : null,
      ...chosenExtras.map(ex => {
        const id = nameToId[ex.name?.trim().toLowerCase()]
        return id ? { data: ex, id } : null
      }),
    ].filter(Boolean)

    // Persist proposed practices (service-role, founder-gated endpoint).
    // Best-effort — never blocks the save.
    try {
      for (const actor of allActors) {
        const practices = actor.data.practices || []
        if (!practices.length) continue
        await fetch('/api/practice-persist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ actorId: actor.id, practices }),
        }).catch(() => {})
      }
    } catch (pracErr) {
      console.warn('Practice persistence skipped:', pracErr?.message)
    }

    // Re-host hotlinked images into Supabase Storage. Fire-and-forget —
    // a failure leaves the hotlink in place and the Floor tab can retry.
    for (const actor of allActors) {
      const img = (actor.data.image_url || '').trim()
      if (!img) continue
      fetch('/api/actor-image-upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ actorId: actor.id, imageUrl: img }),
      }).catch(() => {})
    }

    setSaving(false)
    setSaved(results)
  }

  function reset() {
    setForm(mineMode ? { ...EMPTY_FORM, type: 'practitioner' } : EMPTY_FORM); setRepresents(mineMode ? true : false); setSaved([]); setError(null)
    setAiUrl(''); setAiUsed(false); setReadErr(null)
    setImgBroken(false); setStage('source')
    setExtras([]); setExtraChecked([]); setDuplicates([]); setDupDismissed(false)
  }

  // ── Done state ───────────────────────────────────────────────
  if (saved.length > 0) {
    return (
      <div style={{ background: parch, minHeight: '100dvh' }}>
        <Nav />
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '120px 24px 80px', textAlign: 'center' }}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: gold,
            textTransform: 'uppercase', marginBottom: '18px' }}>Added to the Atlas</div>
          <h1 style={{ ...serif, fontSize: 'clamp(26px,4vw,38px)', fontWeight: 400,
            color: dark, lineHeight: 1.1, marginBottom: '24px' }}>
            {saved.length === 1 ? `${saved[0].name} is on the Atlas.` : `${saved.length} entries are on the Atlas.`}
          </h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
            {saved.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <span style={{ ...body, fontSize: '15px', color: dark }}>{s.name}</span>
                <Link to={`/org/${s.slug || s.id}`} target="_blank"
                  style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: gold, textDecoration: 'none' }}>
                  View
                </Link>
              </div>
            ))}
          </div>
          {!represents && (
            <p style={{ ...body, fontSize: '14px', color: at.meta,
              lineHeight: 1.7, marginBottom: '28px' }}>
              Send the profile link above to anyone who wants to claim and manage their entry.
            </p>
          )}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {returnTo && represents && (
              <button onClick={() => navigate(returnTo)}
                style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '12px 24px',
                  borderRadius: '40px', background: gold,
                  border: `1.5px solid ${gold}`, color: '#FBF8F0', cursor: 'pointer' }}>
                Continue &rarr;
              </button>
            )}
            <button onClick={reset}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '12px 24px',
                borderRadius: '40px', background: 'rgba(217,178,74,0.06)',
                border: '1.5px solid rgba(217,178,74,0.55)', color: gold, cursor: 'pointer' }}>
              Add another
            </button>
            <Link to="/feed"
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '12px 24px',
                borderRadius: '40px', background: 'transparent',
                border: '1px solid rgba(217,178,74,0.30)',
                color: at.meta, textDecoration: 'none' }}>
              Back to feed
            </Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    )
  }

  if (authLoading) return <div style={{ background: parch, minHeight: '100dvh' }}><Nav /></div>

  return (
    <div style={{ background: parch, minHeight: '100dvh' }}>
      <Nav />
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '96px 24px 120px' }}>

        {/* Header */}
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.22em', color: gold,
          textTransform: 'uppercase', marginBottom: '12px' }}>{mineMode ? 'Your author profile' : 'Atlas'}</div>
        <h1 style={{ ...serif, fontSize: 'clamp(30px,5vw,46px)', fontWeight: 400,
          color: dark, lineHeight: 1.08, marginBottom: '10px' }}>
          {mineMode
            ? (form.type === 'practitioner' ? 'Set up your profile' : 'Set up your organisation')
            : 'Add to the Atlas'}
        </h1>
        <p style={{ ...body, fontSize: '16px', color: at.meta,
          lineHeight: 1.7, marginBottom: '24px', maxWidth: '520px' }}>
          {mineMode
            ? 'This is yours to own and manage. A challenge is published by someone others can find and follow, so a name, a picture, and a statement of what you do are all required.'
            : 'The Atlas is the shared map of every person, organisation, and project on NextUs. Know someone doing serious work toward a Horizon Goal · the future their domain is aiming for? Add them. They go live immediately.'}
        </p>

        {/* ── STAGE 1 — SOURCE ────────────────────────────────
            Relationship first, then the source box (primary path),
            then a quiet manual-entry link. The form only appears
            after a source is read or manual entry is chosen. */}
        {stage === 'source' && (
          <>
        {representsToggle}

        {/* ── Optional URL autofill ─────────────────────────── */}
        <div style={{ background: at.object, border: '1.5px solid rgba(217,178,74,0.22)',
          borderRadius: '12px', padding: '18px 20px', marginBottom: '32px' }}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.20em',
            color: at.ghost, textTransform: 'uppercase', marginBottom: '8px' }}>
            {mineMode ? 'Have a website?' : 'Start from any source'}
          </div>
          <p style={{ ...body, fontSize: '13px', color: at.ghost,
            lineHeight: 1.55, marginBottom: '12px' }}>
            {mineMode
              ? 'Optional. Paste a link and we will fill in what we can, then you review it. Or skip and fill it in yourself below.'
              : 'Their website, or any page where their work shows up · or a few words if there\'s no URL. Podcasts, newsletters, and channels become links on their profile.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <textarea value={aiUrl}
              onChange={e => setAiUrl(e.target.value)}
              rows={2}
              placeholder={'Paste a URL or describe them…'}
              style={{ ...body, fontSize: '16px', color: dark, padding: '12px 16px',
                borderRadius: '8px', border: '1.5px solid rgba(217,178,74,0.55)',
                background: at.object, outline: 'none', width: '100%',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.30)',
                resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={readSite} disabled={reading || !aiUrl.trim()}
                style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em',
                  padding: '10px 22px', borderRadius: '40px', border: 'none',
                  background: reading || !aiUrl.trim() ? 'rgba(217,178,74,0.25)' : at.verdigris,
                  color: at.object, whiteSpace: 'nowrap',
                  cursor: reading || !aiUrl.trim() ? 'not-allowed' : 'pointer' }}>
                {reading ? (
                  <>
                    <span style={{
                      display: 'inline-block', width: '12px', height: '12px',
                      border: '2px solid rgba(255,255,255,0.4)',
                      borderTopColor: at.object,
                      borderRadius: '50%',
                      animation: 'add-spin 0.7s linear infinite',
                      marginRight: '6px', verticalAlign: 'middle',
                    }} />
                    Reading…
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
              Form filled from site · review everything before submitting.
            </p>
          )}
        </div>

            {/* Quiet manual path — always visible */}
            <div style={{ textAlign: 'center', marginTop: '-12px', marginBottom: '32px' }}>
              <button type="button" onClick={() => setStage('form')}
                style={{ ...body, fontSize: '14px', color: at.ghost,
                  background: 'none', border: 'none', cursor: 'pointer',
                  textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                {mineMode ? 'Fill it in yourself' : 'No URL? Fill in manually'}
              </button>
            </div>
          </>
        )}

        {/* ── STAGE 2 — REVIEW & EDIT ─────────────────────────── */}
        {stage === 'form' && (
          <>
            {/* Collapsed source summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
              background: at.object, border: '1px solid rgba(217,178,74,0.22)',
              borderRadius: '10px', padding: '12px 18px', marginBottom: '28px' }}>
              <span style={{ ...body, fontSize: '14px', color: at.meta }}>
                {aiUsed
                  ? `Read from ${(() => { try { return new URL(normaliseUrl(aiUrl.trim())).hostname.replace(/^www\./, '') } catch { return 'source' } })()} · review and edit below.`
                  : 'Filling in manually.'}
              </span>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {aiUsed && aiUrl.trim() && (
                  <button type="button" onClick={readSite} disabled={reading}
                    style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: gold,
                      background: 'none', border: 'none', cursor: reading ? 'default' : 'pointer', whiteSpace: 'nowrap',
                      opacity: reading ? 0.55 : 1 }}>
                    {reading ? 'Reading…' : 'Read again'}
                  </button>
                )}
                <button type="button" onClick={startOver}
                  style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: gold,
                    background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Start over
                </button>
              </div>
            </div>

            {readErr && (
              <div style={{ background: 'rgba(138,48,48,0.05)', border: '1px solid rgba(138,48,48,0.25)',
                borderRadius: '8px', padding: '12px 16px', marginBottom: '24px' }}>
                <p style={{ ...body, fontSize: '14px', color: '#8A3030', margin: 0 }}>{readErr}</p>
              </div>
            )}

            {representsToggle}

        {/* ── Duplicate warning ─────────────────────────────── */}
        {duplicates.length > 0 && !dupDismissed && (
          <div style={{ background: 'rgba(217,178,74,0.04)', border: '1px solid rgba(217,178,74,0.28)',
            borderRadius: '12px', padding: '16px 18px', marginBottom: '24px' }}>
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold,
              marginBottom: '10px' }}>
              Already on the map?
            </div>
            <p style={{ ...body, fontSize: '13px', color: at.meta,
              lineHeight: 1.55, marginBottom: '10px' }}>
              {duplicates.length === 1 ? 'A similar entry is' : 'Similar entries are'} already on the map.
              If one of these is what you're adding, view it · claim it if it's yours.
              This is only a heads-up · it doesn't stop you.
            </p>
            {duplicates.map(a => <DuplicateCard key={a.id} actor={a} />)}
            <div style={{ marginTop: '12px' }}>
              <button type="button" onClick={() => setDupDismissed(true)}
                style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '9px 20px',
                  borderRadius: '40px', cursor: 'pointer',
                  border: '1.5px solid rgba(217,178,74,0.55)',
                  background: 'rgba(217,178,74,0.06)', color: gold }}>
                I'm adding something different · continue
              </button>
            </div>
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
            <TextInput value={form.website} onChange={v => set('website', v)} onBlur={() => set('website', normaliseUrl(form.website))} placeholder="nasa.gov or https://nasa.gov" />
          </Field>

          {/* Image */}
          <Field>
            <FieldLabel required={mineMode}>Image</FieldLabel>
            <Hint>{mineMode
              ? 'A picture is required. A portrait if this is you, a logo or mark if it is your organisation. Upload one or paste an image URL.'
              : 'Logo for organisations, portrait for practitioners. Found automatically when reading a source · upload your own or paste an image URL to replace it.'}</Hint>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginTop: '8px' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '10px', flexShrink: 0,
                border: '1.5px solid rgba(217,178,74,0.28)',
                background: at.object,
                backgroundImage: 'linear-gradient(45deg, rgba(234,241,237,0.06) 25%, transparent 25%), linear-gradient(-45deg, rgba(234,241,237,0.06) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(234,241,237,0.06) 75%), linear-gradient(-45deg, transparent 75%, rgba(234,241,237,0.06) 75%)',
                backgroundSize: '12px 12px',
                backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {form.image_url && !imgBroken ? (
                  <img key={form.image_url} src={form.image_url} alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onError={() => setImgBroken(true)} />
                ) : (
                  <span style={{ ...sc, fontSize: '13px', color: at.ghost,
                    textAlign: 'center', padding: '4px' }}>
                    {form.image_url ? 'Broken link' : 'No image'}
                  </span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <TextInput value={form.image_url} onChange={v => { set('image_url', v); setImgBroken(false) }}
                      onBlur={() => set('image_url', normaliseUrl(form.image_url))}
                      placeholder="Upload a photo, or paste an image URL" />
                  </div>
                  <label style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase',
                    display: 'inline-flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap',
                    cursor: imgBusy ? 'default' : 'pointer', color: gold, opacity: imgBusy ? 0.55 : 1 }}>
                    <span style={{ ...body, fontSize: '14px', color: at.ghost, textTransform: 'none', letterSpacing: 'normal' }}>or</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center',
                      padding: '10px 18px', borderRadius: '8px',
                      border: '1.5px solid rgba(217,178,74,0.4)', background: at.object }}>
                      {imgBusy ? 'Uploading…' : 'Upload'}
                    </span>
                    <input type="file" accept="image/*" disabled={imgBusy} onChange={onPickImage} style={{ display: 'none' }} />
                  </label>
                </div>
                {imgErr && <p style={{ ...body, fontSize: '13px', color: '#B5482E', margin: '8px 0 0' }}>{imgErr}</p>}
              </div>
            </div>
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
                background: 'rgba(217,178,74,0.04)', border: '1px solid rgba(217,178,74,0.18)',
                borderRadius: '8px' }}>
                <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em',
                  color: at.ghost, marginBottom: '4px' }}>HORIZON GOAL</div>
                <p style={{ ...body, fontSize: '13px', color: at.meta,
                  lineHeight: 1.65, margin: 0 }}>{selectedGoal}</p>
              </div>
            )}
          </Field>

          {/* Secondary domains */}
          {form.primary_domain && (
            <Field>
              <FieldLabel>Secondary domains</FieldLabel>
              <Hint>Where else does this work belong? Only add what's true.</Hint>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {CIV_DOMAINS.filter(d => d.slug !== form.primary_domain).map(d => {
                  const isOn = form.secondary_domains.includes(d.slug)
                  return (
                    <button key={d.slug} type="button" onClick={() => toggleSecondary(d.slug)}
                      style={{ ...sc, fontSize: '13px', letterSpacing: '0.04em',
                        padding: '5px 12px', borderRadius: '40px', cursor: 'pointer',
                        color: isOn ? gold : at.meta,
                        background: isOn ? 'rgba(217,178,74,0.08)' : at.object,
                        border: isOn ? '1px solid rgba(217,178,74,0.55)' : '1px solid rgba(217,178,74,0.25)' }}>
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
            <FieldLabel required={mineMode}>{mineMode ? 'What you do' : 'Description'}</FieldLabel>
            <Hint>{mineMode
              ? 'One or two plain sentences on what you do and the part you are taking. This is what people read before they decide to join you.'
              : 'What do they actually do? One sentence on what they are, one on the specific thing that makes them worth adding.'}</Hint>
            <div style={{ marginTop: '8px' }}>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4}
                style={{ ...body, fontSize: '15px', color: dark, padding: '10px 14px',
                  borderRadius: '8px', border: '1.5px solid rgba(217,178,74,0.30)',
                  background: at.object, outline: 'none', width: '100%',
                  resize: 'vertical', lineHeight: 1.65, boxSizing: 'border-box' }} />
            </div>
          </Field>

          {/* Platform principles: internal placement dimension. The AI computes
             these and admins curate them; they are not surfaced to the person
             adding an entry, where the named principles read as jargon. */}

          {/* ── AI-detected extra records ─────────────────────── */}
          {extras.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em',
                color: gold, marginBottom: '10px' }}>
                Also identified · add these too?
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
              background: saving ? 'rgba(217,178,74,0.35)' : at.verdigris,
              color: at.object, cursor: saving ? 'not-allowed' : 'pointer',
              display: 'block', width: '100%', marginTop: '8px' }}>
            {saving ? 'Adding…' : extras.some((_, i) => extraChecked[i])
              ? `Add ${1 + extraChecked.filter(Boolean).length} entries to the Atlas`
              : 'Add to the Atlas'}
          </button>

          <p style={{ ...body, fontSize: '13px', color: at.ghost,
            lineHeight: 1.55, textAlign: 'center', marginTop: '12px' }}>
            {represents
              ? 'Your entry goes live immediately. You can edit it any time.'
              : 'This entry goes live immediately. The organisation can claim and manage it later.'
            }
          </p>
        </form>
          </>
        )}
      </div>
      <style>{`@keyframes add-spin { to { transform: rotate(360deg); } }`}</style>
      <SiteFooter />
    </div>
  )
}