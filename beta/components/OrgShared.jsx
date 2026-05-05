// src/beta/components/OrgShared.jsx
// Shared UI primitives used by BetaOrgManage and BetaOrgPublic.
// Extracted so both pages stay lean and consistent.

export const body = { fontFamily: "'Lora', Georgia, serif" }
export const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
export const gold = '#A8721A'
export const dark = '#0F1523'
export const parch = '#FAFAF7'

export const DOMAIN_LIST = [
  { value: 'human-being',    label: 'Human Being' },
  { value: 'society',        label: 'Society' },
  { value: 'nature',         label: 'Nature' },
  { value: 'technology',     label: 'Technology' },
  { value: 'finance-economy',label: 'Finance & Economy' },
  { value: 'legacy',         label: 'Legacy' },
  { value: 'vision',         label: 'Vision' },
]

export const DOMAIN_LABEL = Object.fromEntries(DOMAIN_LIST.map(d => [d.value, d.label]))

export const SUBDOMAIN_MAP = {
  'human-being':     [['hb-body','Body'],['hb-expression','Expression'],['hb-inner-life','Inner Life'],['hb-connection','Connection'],['hb-finances','Finances'],['hb-path','Path'],['hb-outer','Outer Conditions']],
  'society':         [['soc-family','Family & Kinship'],['soc-community','Community & Locality'],['soc-civil','Civil Society'],['soc-governance','Governance & Institutions'],['soc-commons','Commons'],['soc-public','Public Sphere']],
  'nature':          [['nat-earth','Earth'],['nat-air','Air'],['nat-water','Water'],['nat-flora','Flora'],['nat-fauna','Fauna']],
  'technology':      [['tech-materials','Materials & Making'],['tech-energy','Energy'],['tech-information','Information & Computation'],['tech-biological','Biological & Life Sciences'],['tech-mechanical','Mechanical & Structural'],['tech-built','Built Environment'],['tech-communication','Communication & Media'],['tech-regenerative','Regenerative Technologies']],
  'finance-economy': [['fe-capital','Capital & Investment'],['fe-currency','Currency & Exchange'],['fe-labour','Labour & Livelihoods'],['fe-markets','Markets & Commerce'],['fe-commons','Commons & Alternative Economies'],['fe-measurement','Measurement & Accounting'],['fe-ownership','Ownership & Property']],
  'legacy':          [['leg-memory','Memory & History'],['leg-cultural','Cultural Transmission'],['leg-lineage','Lineage & Ancestry'],['leg-material','Material & Built Heritage'],['leg-ecological','Ecological Legacy'],['leg-knowledge','Knowledge & Wisdom Traditions'],['leg-repair','Repair & Reckoning'],['leg-gift','Gift & Aspiration'],['leg-presence','Presence & Testimony']],
  'vision':          [['vis-imagination','Imagination & Possibility'],['vis-cultural','Cultural Creation'],['vis-intention','Intention & Direction'],['vis-blank','The Blank Slate Question'],['vis-ecological','Ecological Vision'],['vis-emerging','Emerging Knowledge'],['vis-design','Design & Intention'],['vis-horizon','Horizon & Commitment'],['vis-declaration','Declaration & Becoming']],
}

// v3.8 canonical lens sets per domain
export const LENSES_PER_DOMAIN = {
  'nature':          ['Climate','Pollution & Waste','Conservation & Regeneration','Human Use & Stewardship','Indigenous & Relational Knowledge'],
  'human-being':     ['Flourishing','Healing','Liberation Equality & Dignity','Indigenous & Relational Knowledge'],
  'society':         ['Belonging & Inclusion','Justice & Accountability','Solidarity & Mutual Obligation','Power & Self-Determination','Substrate Health','Harm & Reciprocity','Indigenous & Relational'],
  'technology':      ['Regeneration vs Extraction','Access & Sovereignty','Scale & Unintended Consequence','Alignment & Ethics','Labour & Displacement','Transition & Accountability','Indigenous & Relational'],
  'finance-economy': ['Regenerative vs Extractive','Distribution & Justice','Sovereignty & Self-Determination','Transparency & Accountability','Counting What Counts','Scale & Concentration','Indigenous & Relational'],
  'legacy':          ['Deep Cultural Continuity','The When Exactly Was That Test','Repair & Reckoning','Gift & Aspiration','Indigenous & Relational','Intentional Stewardship','Elder Wisdom','Shadow Legacy'],
  'vision':          ['Genuine Imagination','Grounded Honesty','For All','The Blank Slate Question','Commitment vs Aspiration','Indigenous & Relational','The Living Bid'],
}

export const SCALE_OPTIONS = [
  { value: 'local',          label: 'Local' },
  { value: 'municipal',      label: 'Municipal' },
  { value: 'state-province', label: 'State / Province' },
  { value: 'national',       label: 'National' },
  { value: 'regional',       label: 'Regional' },
  { value: 'international',  label: 'International' },
  { value: 'global',         label: 'Global' },
  { value: 'civilisational', label: 'Civilisational' },
]

export const SCALE_LABEL = Object.fromEntries(SCALE_OPTIONS.map(s => [s.value, s.label]))

export const OFFERING_TYPES = [
  { value: 'tool',      label: 'Tool' },
  { value: 'service',   label: 'Service' },
  { value: 'programme', label: 'Programme' },
  { value: 'resource',  label: 'Resource' },
  { value: 'content',   label: 'Content' },
  { value: 'event',     label: 'Event' },
  { value: 'other',     label: 'Other' },
]

export const CONTRIBUTION_MODES = [
  { value: 'functional',   label: 'Functional',   desc: 'Builds, organises, funds, connects' },
  { value: 'expressive',   label: 'Expressive',   desc: 'Makes, performs, creates, transmits' },
  { value: 'relational',   label: 'Relational',   desc: 'Heals, holds, facilitates, witnesses' },
  { value: 'intellectual', label: 'Intellectual', desc: 'Researches, synthesises, frames, teaches' },
  { value: 'mixed',        label: 'Mixed',        desc: 'Crosses more than one mode' },
]

export const ACCESS_TYPES = [
  { value: 'free',        label: 'Free' },
  { value: 'paid',        label: 'Paid' },
  { value: 'application', label: 'By application' },
  { value: 'open_source', label: 'Open source' },
  { value: 'invitation',  label: 'By invitation' },
]

export const PLATFORM_PRINCIPLE_LIST = [
  { value: 'indigenous-relational',    label: 'Indigenous & Relational' },
  { value: 'substrate-health',         label: 'Substrate Health' },
  { value: 'not-knowing-stance',       label: 'The Not-Knowing Stance' },
  { value: 'legacy-temporal-dimension',label: 'Legacy as Temporal Dimension' },
]

// Placement tier display
export const PLACEMENT_TIER = {
  exemplar:         { label: 'Exemplar',         color: '#3B6B9E', bg: 'rgba(59,107,158,0.08)'  },
  qualified:        { label: 'Qualified',         color: '#4A8C6F', bg: 'rgba(74,140,111,0.08)'  },
  contested:        { label: 'Contested',         color: '#8C7A3E', bg: 'rgba(140,122,62,0.08)'  },
  pattern_instance: { label: 'Pattern instance',  color: '#8A3030', bg: 'rgba(138,48,48,0.08)'   },
}

export const CONTRIBUTION_TYPE_LABEL = {
  hours:'Time & Hours', capital:'Financial', skills:'Skills',
  resources:'Resources', community:'Community', other:'Other',
}

// ── Shared UI components ─────────────────────────────────────

export function Label({ children, required }) {
  return (
    <label style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '6px' }}>
      {children}{required && <span style={{ color: '#8A3030', marginLeft: '4px' }}>*</span>}
    </label>
  )
}

export function Hint({ children }) {
  return <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginTop: '5px', lineHeight: 1.5 }}>{children}</p>
}

export function SectionCard({ children, style }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.18)', borderRadius: '14px', padding: '28px 32px', marginBottom: '24px', ...style }}>
      {children}
    </div>
  )
}

// Toast is in OrgToast.jsx (requires React hooks, can't be in a plain constants file)

export function Btn({ onClick, children, variant = 'primary', disabled, small }) {
  const styles = {
    primary: { background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', color: gold },
    solid:   { background: '#C8922A', border: '1.5px solid rgba(168,114,26,0.8)', color: '#FFFFFF' },
    ghost:   { background: 'transparent', border: '1px solid rgba(15,21,35,0.55)', color: 'rgba(15,21,35,0.55)' },
    danger:  { background: 'rgba(138,48,48,0.05)', border: '1.5px solid rgba(138,48,48,0.40)', color: '#8A3030' },
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...sc, fontSize: small ? '13px' : '14px', letterSpacing: '0.14em',
      padding: small ? '8px 16px' : '12px 24px', borderRadius: '40px',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
      ...styles[variant],
    }}>
      {children}
    </button>
  )
}

export function TextInput({ value, onChange, placeholder, type = 'text', disabled }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
      style={{ ...body, fontSize: '15px', color: dark, padding: '11px 16px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)', background: disabled ? 'rgba(200,146,42,0.03)' : '#FFFFFF', outline: 'none', width: '100%' }} />
  )
}

export function TextArea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{ ...body, fontSize: '15px', color: dark, padding: '11px 16px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', width: '100%', resize: 'vertical', lineHeight: 1.65 }} />
  )
}

export function SelectInput({ value, onChange, options, disabled }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
      style={{ ...body, fontSize: '15px', color: dark, padding: '11px 16px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', width: '100%' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export function ModeSelector({ value, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
      {CONTRIBUTION_MODES.map(m => {
        const on = value === m.value
        return (
          <button key={m.value} type="button" onClick={() => onChange(m.value)}
            style={{ textAlign: 'left', padding: '12px 14px', borderRadius: '10px', cursor: 'pointer', border: on ? '1.5px solid rgba(200,146,42,0.78)' : '1.5px solid rgba(200,146,42,0.20)', background: on ? 'rgba(200,146,42,0.07)' : '#FFFFFF', transition: 'all 0.15s' }}>
            <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: on ? gold : 'rgba(15,21,35,0.70)', marginBottom: '3px' }}>{m.label}</div>
            <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.4 }}>{m.desc}</div>
          </button>
        )
      })}
    </div>
  )
}

export function Eyebrow({ children, style = {} }) {
  return (
    <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.22em', color: 'rgba(15,21,35,0.40)', textTransform: 'uppercase', ...style }}>
      {children}
    </div>
  )
}

export function Rule() {
  return <div style={{ height: '1px', background: 'rgba(200,146,42,0.10)', margin: '40px 0' }} />
}
