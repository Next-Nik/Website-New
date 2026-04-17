import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { SiteFooter } from '../components/SiteFooter'
import { supabase } from '../hooks/useSupabase'
import { useAuth } from '../hooks/useAuth'

const body = { fontFamily: "'Lora', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const gold  = '#A8721A'
const dark  = '#0F1523'
const parch = '#FAFAF7'

// ── Constants ────────────────────────────────────────────────

const DOMAIN_LABEL = {
  'human-being':'Human Being','society':'Society','nature':'Nature',
  'technology':'Technology','finance-economy':'Finance & Economy',
  'legacy':'Legacy','vision':'Vision',
}

const DOMAIN_HORIZON = {
  'human-being':    'Every person has what they need to know themselves, develop fully, and bring what they came here to bring.',
  'society':        'Humanity knows how to be human together — and every individual is better for it.',
  'nature':         'Ecosystems are thriving and we are living in harmony with the planet.',
  'technology':     'Our creations support and amplify life.',
  'finance-economy':'Resources flow toward what sustains and generates life — rewarding care, contribution, and long-term thinking.',
  'legacy':         'We are ancestors worth having.',
  'vision':         'Into the unknown. On purpose. Together.',
}

const SUBDOMAIN_LABEL = {
  'hb-body':'Body','hb-mind':'Mind','hb-inner-life':'Inner Life',
  'hb-development':'Development','hb-dignity':'Dignity & Rights','hb-expression':'Expression & Culture',
  'soc-governance':'Governance','soc-culture':'Culture','soc-conflict-peace':'Conflict & Peace',
  'soc-community':'Community','soc-communication':'Communication & Information','soc-global':'Global Coordination',
  'nat-earth':'Earth','nat-air':'Air','nat-salt-water':'Salt Water',
  'nat-fresh-water':'Fresh Water','nat-flora':'Flora','nat-fauna':'Fauna','nat-living-systems':'Living Systems',
  'tech-digital':'Digital Systems','tech-biological':'Biological Technology',
  'tech-infrastructure':'Physical Infrastructure','tech-energy':'Energy','tech-frontier':'Frontier & Emerging Technology',
  'fe-resources':'Resources','fe-exchange':'Exchange','fe-capital':'Capital',
  'fe-labour':'Labour','fe-ownership':'Ownership','fe-distribution':'Distribution',
  'leg-wisdom':'Wisdom','leg-memory':'Memory','leg-ceremony':'Ceremony & Ritual',
  'leg-intergenerational':'Intergenerational Relationship','leg-long-arc':'The Long Arc',
  'vis-imagination':'Imagination','vis-philosophy':'Philosophy & Worldview',
  'vis-leadership':'Leadership','vis-coordination':'Coordination','vis-foresight':'Foresight',
}

const SCALE_LABEL = {
  local:'Local', municipal:'Municipal', regional:'Regional',
  national:'National', international:'International', global:'Global',
}

const NEED_TYPE_LABEL = {
  skills:'Skills', capital:'Capital', time:'Time',
  resources:'Resources', partnerships:'Partnerships', data:'Data', other:'Other',
}

const COMP_LABEL = { token:'Token', financial:'Paid', acknowledged:'Acknowledged', none:'Volunteer' }

const CONTRIBUTION_TYPES = [
  { value: 'hours',     label: 'Time & Hours',  desc: 'I can commit time to this' },
  { value: 'skills',    label: 'Skills',         desc: 'I have a relevant expertise' },
  { value: 'capital',   label: 'Financial',      desc: 'I can contribute financially' },
  { value: 'resources', label: 'Resources',      desc: 'I have something tangible to offer' },
  { value: 'community', label: 'Community',      desc: 'I can amplify, connect, or advocate' },
  { value: 'other',     label: 'Other',           desc: 'Something else' },
]

// ── Shared primitives ────────────────────────────────────────

function Pill({ children, color = gold }) {
  return (
    <span style={{
      ...sc, fontSize: '12px', letterSpacing: '0.14em',
      padding: '4px 12px', borderRadius: '40px',
      border: `1px solid ${color}40`, color,
      background: `${color}12`, display: 'inline-block',
    }}>
      {children}
    </span>
  )
}

// ── Contribution Modal ───────────────────────────────────────
// Shown when an authenticated user clicks "I can help"
// Collects contribution type, message, and records to DB

function ContributionModal({ need, actor, user, onClose, onSuccess, existingOffers = [] }) {
  const [step, setStep]           = useState('type')
  // Pre-populate from best matching offer if available
  const defaultType = existingOffers.length > 0 ? (existingOffers[0].offer_type || '') : ''
  const [contribType, setContribType] = useState(defaultType)
  const [message, setMessage]     = useState('')
  const [amount, setAmount]       = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState(null)

  const selectedType = CONTRIBUTION_TYPES.find(t => t.value === contribType)

  async function submit() {
    if (!contribType) { setError('Please select a contribution type.'); return }
    setSaving(true)
    setError(null)

    const payload = {
      contributor_id:    user.id,
      actor_id:          actor.id,
      need_id:           need?.id || null,
      contribution_type: contribType,
      amount:            amount ? parseFloat(amount) : null,
      description:       message.trim() || null,
      visibility:        'public',
      contribution_date: new Date().toISOString().split('T')[0],
    }

    const { error: saveError } = await supabase
      .from('nextus_contributions')
      .insert(payload)

    setSaving(false)

    if (saveError) {
      setError('Something went wrong. Please try again.')
      return
    }

    // Also add to waitlist for follow-up comms
    await supabase.from('nextus_waitlist').insert({
      email:              user.email,
      actor_id:           actor.id,
      need_id:            need?.id || null,
      contribution_types: [contribType],
      source:             'contribution_modal',
    }).then(() => {})

    onSuccess()
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(15,21,35,0.60)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div style={{
        background: parch,
        border: '1.5px solid rgba(200,146,42,0.40)',
        borderRadius: '14px',
        padding: '36px',
        maxWidth: '500px', width: '100%',
        position: 'relative',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '20px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '20px', color: 'rgba(15,21,35,0.55)', lineHeight: 1,
          }}
        >
          ×
        </button>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: gold, display: 'block', marginBottom: '6px' }}>
            {actor.name}
          </span>
          <h3 style={{ ...body, fontSize: '22px', fontWeight: 300, color: dark, lineHeight: 1.2, marginBottom: '6px' }}>
            {need ? `I can help with: ${need.title}` : `I want to contribute to ${actor.name}`}
          </h3>
          {need?.description && (
            <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.6 }}>
              {need.description.slice(0, 120)}{need.description.length > 120 ? '…' : ''}
            </p>
          )}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.15)', marginBottom: '24px' }} />

        {/* Show contributor's offer context if available */}
        {existingOffers.length > 0 && existingOffers[0].title && (
          <div style={{ background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px' }}>
            <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: gold, marginBottom: '4px' }}>Your offer</p>
            <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.70)', margin: 0 }}>{existingOffers[0].title}</p>
          </div>
        )}

        {/* Step 1: Type selection */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.55)', marginBottom: '12px' }}>
            How would you like to contribute?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {CONTRIBUTION_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setContribType(t.value)}
                style={{
                  textAlign: 'left', padding: '12px 14px', borderRadius: '10px',
                  cursor: 'pointer',
                  border: contribType === t.value
                    ? '1.5px solid rgba(200,146,42,0.78)'
                    : '1.5px solid rgba(200,146,42,0.20)',
                  background: contribType === t.value
                    ? 'rgba(200,146,42,0.07)'
                    : '#FFFFFF',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: contribType === t.value ? gold : 'rgba(15,21,35,0.70)', marginBottom: '3px' }}>
                  {t.label}
                </div>
                <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.4 }}>
                  {t.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Amount — only for capital */}
        {contribType === 'capital' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '6px' }}>
              Amount (USD) — optional
            </label>
            <input
              type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 500"
              style={{ ...body, fontSize: '15px', color: dark, padding: '10px 14px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', width: '100%' }}
            />
          </div>
        )}

        {/* Hours — for time */}
        {contribType === 'hours' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '6px' }}>
              Hours available — optional
            </label>
            <input
              type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 10"
              style={{ ...body, fontSize: '15px', color: dark, padding: '10px 14px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', width: '100%' }}
            />
          </div>
        )}

        {/* Message */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '6px' }}>
            Message — optional
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Tell them a little about what you're offering, your background, or how you'd like to help. This goes to the organisation."
            rows={3}
            style={{ ...body, fontSize: '14px', color: dark, padding: '10px 14px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', width: '100%', resize: 'vertical', lineHeight: 1.65 }}
          />
        </div>

        {/* Transparency note */}
        <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.6, marginBottom: '20px' }}>
          Your contribution will be recorded on your profile and attributed to {actor.name}. You can set it to private at any time from your profile.
        </p>

        {/* Error */}
        {error && (
          <p style={{ ...body, fontSize: '14px', color: '#8A3030', marginBottom: '16px' }}>{error}</p>
        )}

        {/* Submit */}
        <button
          onClick={submit}
          disabled={saving || !contribType}
          style={{
            width: '100%', padding: '14px',
            ...sc, fontSize: '14px', letterSpacing: '0.16em',
            borderRadius: '40px', cursor: saving || !contribType ? 'not-allowed' : 'pointer',
            border: 'none',
            background: saving || !contribType ? 'rgba(200,146,42,0.30)' : '#C8922A',
            color: '#FFFFFF',
            transition: 'all 0.2s',
          }}
        >
          {saving ? 'Recording…' : 'Record my contribution →'}
        </button>
      </div>
    </div>
  )
}

// ── Auth prompt — shown to unauthenticated users ─────────────

function AuthPromptModal({ need, actor, onClose }) {
  const navigate = useNavigate()
  const [email, setEmail]   = useState('')
  const [sent, setSent]     = useState(false)
  const [saving, setSaving] = useState(false)

  async function saveWaitlist(e) {
    e.preventDefault()
    if (!email) return
    setSaving(true)
    await supabase.from('nextus_waitlist').insert({
      email,
      actor_id:           actor.id,
      need_id:            need?.id || null,
      contribution_types: need ? [need.need_type] : [],
      source:             'auth_prompt_modal',
    })
    setSaving(false)
    setSent(true)
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(15,21,35,0.60)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div style={{
        background: parch,
        border: '1.5px solid rgba(200,146,42,0.40)',
        borderRadius: '14px',
        padding: '36px',
        maxWidth: '440px', width: '100%',
        position: 'relative',
      }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'rgba(15,21,35,0.55)', lineHeight: 1 }}
        >×</button>

        {!sent ? (
          <>
            <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: gold, display: 'block', marginBottom: '12px' }}>
              Good instinct.
            </span>
            <h3 style={{ ...body, fontSize: '24px', fontWeight: 300, color: dark, lineHeight: 1.2, marginBottom: '12px' }}>
              Create an account to contribute.
            </h3>
            <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.7, marginBottom: '24px' }}>
              Your contributions are tracked, attributed, and visible on your profile. They build a record of what you've actually done in the world.
            </p>

            <button
              onClick={() => navigate('/login')}
              style={{ width: '100%', padding: '14px', ...sc, fontSize: '14px', letterSpacing: '0.16em', borderRadius: '40px', border: 'none', background: '#C8922A', color: '#FFFFFF', cursor: 'pointer', marginBottom: '12px' }}
            >
              Sign in or create account →
            </button>

            <div style={{ textAlign: 'center', ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', marginBottom: '20px' }}>
              or
            </div>

            <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.60)', marginBottom: '12px' }}>
              Leave your email and we'll follow up when you're ready.
            </p>
            <form onSubmit={saveWaitlist} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{ ...body, fontSize: '15px', color: dark, padding: '10px 14px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.35)', background: '#FFFFFF', outline: 'none', flex: 1 }}
              />
              <button type="submit" disabled={saving} style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', padding: '10px 18px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)', color: gold, cursor: 'pointer', flexShrink: 0 }}>
                {saving ? '…' : 'Save'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(42,107,58,0.10)', border: '1.5px solid rgba(42,107,58,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <span style={{ color: '#2A6B3A', fontSize: '18px' }}>✓</span>
            </div>
            <h3 style={{ ...body, fontSize: '22px', fontWeight: 300, color: dark, marginBottom: '10px' }}>Noted.</h3>
            <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.60)', lineHeight: 1.7 }}>
              We'll be in touch. When you're ready to formalise your contribution, create an account and it will be waiting.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Contribution success state ───────────────────────────────

function ContributionSuccess({ actor, onClose }) {
  const navigate = useNavigate()
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,21,35,0.60)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
    >
      <div style={{ background: parch, border: '1.5px solid rgba(200,146,42,0.40)', borderRadius: '14px', padding: '40px', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(42,107,58,0.10)', border: '1.5px solid rgba(42,107,58,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <span style={{ color: '#2A6B3A', fontSize: '22px' }}>✓</span>
        </div>
        <h3 style={{ ...body, fontSize: '26px', fontWeight: 300, color: dark, marginBottom: '12px' }}>Contribution recorded.</h3>
        <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.60)', lineHeight: 1.75, marginBottom: '28px' }}>
          Your contribution to {actor.name} is now on record. {actor.name} will be notified and can confirm when the work is done. It will appear on your profile.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/profile')}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '11px 28px', borderRadius: '40px', border: 'none', background: '#C8922A', color: '#FFFFFF', cursor: 'pointer' }}
          >
            View my profile →
          </button>
          <button
            onClick={onClose}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '11px 28px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)', color: gold, cursor: 'pointer' }}
          >
            Stay here
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Need card ────────────────────────────────────────────────

function NeedCard({ need, onHelp }) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1.5px solid rgba(200,146,42,0.18)',
      borderRadius: '14px',
      padding: '22px 26px',
      marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          {/* Tags */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <Pill>{NEED_TYPE_LABEL[need.need_type] || need.need_type}</Pill>
            <Pill color="rgba(15,21,35,0.55)">{need.size === 'micro' ? 'Task' : 'Role'}</Pill>
            {need.time_estimate && (
              <Pill color="rgba(15,21,35,0.55)">{need.time_estimate}</Pill>
            )}
            {need.compensation_type && need.compensation_type !== 'none' && (
              <Pill color="#2A6B3A">{COMP_LABEL[need.compensation_type]}</Pill>
            )}
          </div>

          {/* Title */}
          <h4 style={{ ...body, fontSize: '18px', fontWeight: 300, color: dark, marginBottom: '8px', lineHeight: 1.3 }}>
            {need.title}
          </h4>

          {/* Description */}
          {need.description && (
            <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.70)', lineHeight: 1.75, marginBottom: '10px' }}>
              {need.description}
            </p>
          )}

          {/* Skills */}
          {need.skills_required?.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {need.skills_required.map(s => (
                <span key={s} style={{
                  ...sc, fontSize: '11px', letterSpacing: '0.10em',
                  color: 'rgba(15,21,35,0.55)',
                  background: 'rgba(15,21,35,0.05)',
                  padding: '3px 10px', borderRadius: '4px',
                }}>
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <div style={{ flexShrink: 0 }}>
          <button
            onClick={() => onHelp(need)}
            style={{
              ...sc, fontSize: '13px', letterSpacing: '0.14em',
              padding: '11px 22px', borderRadius: '40px',
              border: '1.5px solid rgba(200,146,42,0.78)',
              background: 'rgba(200,146,42,0.05)',
              color: gold, cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#C8922A'; e.currentTarget.style.color = '#FFFFFF' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(200,146,42,0.05)'; e.currentTarget.style.color = gold }}
          >
            I can help →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Offering card (public) ───────────────────────────────────

const OFFERING_TYPE_LABEL = {
  tool:'Tool', service:'Service', programme:'Programme',
  resource:'Resource', content:'Content', event:'Event', other:'Other',
}

const CONTRIBUTION_MODE_LABEL = {
  functional:'Functional', expressive:'Expressive', relational:'Relational',
  intellectual:'Intellectual', mixed:'Mixed',
}

const ACCESS_TYPE_LABEL = {
  free:'Free', paid:'Paid', application:'By application',
  open_source:'Open source', invitation:'By invitation',
}

const ACCESS_TYPE_COLOR = {
  free: '#2A6B3A',
  paid: 'rgba(15,21,35,0.50)',
  application: gold,
  open_source: '#2A6B3A',
  invitation: gold,
}

function OfferingCard({ offering }) {
  const typeLabel   = OFFERING_TYPE_LABEL[offering.offering_type]   || offering.offering_type
  const modeLabel   = CONTRIBUTION_MODE_LABEL[offering.contribution_mode] || offering.contribution_mode
  const accessLabel = ACCESS_TYPE_LABEL[offering.access_type]       || offering.access_type
  const accessColor = ACCESS_TYPE_COLOR[offering.access_type]       || gold

  return (
    <div style={{
      background: offering.is_flagship ? 'rgba(200,146,42,0.05)' : '#FFFFFF',
      border: offering.is_flagship
        ? '1.5px solid rgba(200,146,42,0.78)'
        : '1.5px solid rgba(200,146,42,0.18)',
      borderRadius: '14px',
      padding: '22px 26px',
      marginBottom: '12px',
      position: 'relative',
    }}>
      {offering.is_flagship && (
        <span style={{
          position: 'absolute', top: '-10px', left: '20px',
          ...sc, fontSize: '11px', letterSpacing: '0.16em',
          background: '#C8922A', color: '#FFFFFF',
          padding: '3px 12px', borderRadius: '40px',
        }}>
          Flagship
        </span>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Pill>{typeLabel}</Pill>
            <Pill color="rgba(15,21,35,0.55)">{modeLabel}</Pill>
            <span style={{
              ...sc, fontSize: '12px', letterSpacing: '0.12em',
              color: accessColor,
            }}>
              {accessLabel}
            </span>
          </div>

          <h4 style={{ ...body, fontSize: '18px', fontWeight: 300, color: dark, marginBottom: '8px', lineHeight: 1.3 }}>
            {offering.title}
          </h4>

          {offering.description && (
            <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.70)', lineHeight: 1.75, marginBottom: '10px' }}>
              {offering.description}
            </p>
          )}
        </div>

        {offering.url && (
          <div style={{ flexShrink: 0 }}>
            <a
              href={offering.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...sc, fontSize: '13px', letterSpacing: '0.14em',
                padding: '11px 22px', borderRadius: '40px',
                border: '1.5px solid rgba(200,146,42,0.78)',
                background: 'rgba(200,146,42,0.05)',
                color: gold, cursor: 'pointer',
                textDecoration: 'none', display: 'inline-block',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#C8922A'; e.currentTarget.style.color = '#FFFFFF' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(200,146,42,0.05)'; e.currentTarget.style.color = gold }}
            >
              Explore →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────

export function NextUsActorPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [actor, setActor]           = useState(null)
  const [needs, setNeeds]           = useState([])
  const [offerings, setOfferings]   = useState([])
  const [actorDomains, setActorDomains] = useState([])
  const [loading, setLoading]       = useState(true)

  // Modal state
  const [modal, setModal] = useState(null)
  // modal = null | { type: 'contribute', need } | { type: 'auth', need } | { type: 'success' }

  // Claim state
  const [claiming, setClaiming]   = useState(false)
  const [claimSent, setClaimSent] = useState(false)

  // Waitlist
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [waitlistSent, setWaitlistSent]   = useState(false)

  const isOwner = user && actor?.profile_owner === user.id

  useEffect(() => {
    async function load() {
      const [
        { data: actorData },
        { data: needsData },
        { data: domainsData },
        { data: offeringsData },
      ] = await Promise.all([
        supabase.from('nextus_actors')
          .select('*, focus:focus_id(id, name, type, slug)')
          .eq('id', id).single(),
        supabase.from('nextus_needs')
          .select('*')
          .eq('actor_id', id)
          .eq('status', 'open')
          .order('created_at'),
        supabase.from('nextus_actor_domains')
          .select('*')
          .eq('actor_id', id)
          .order('is_primary', { ascending: false }),
        supabase.from('nextus_actor_offerings')
          .select('*')
          .eq('actor_id', id)
          .order('is_flagship', { ascending: false })
          .order('sort_order', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true }),
      ])
      setActor(actorData)
      setNeeds(needsData || [])
      setActorDomains(domainsData || [])
      setOfferings(offeringsData || [])
      setLoading(false)
    }
    load()
  }, [id])

  // When "I can help" is clicked on a need card
  async function handleHelp(need) {
    if (!user) { setModal({ type: 'auth', need }); return }

    // Fetch contributor's active offers to pre-populate the modal
    const { data: existingOffers } = await supabase
      .from('nextus_contributor_offers')
      .select('offer_type, contribution_mode, title, description')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(5)

    setModal({ type: 'contribute', need, existingOffers: existingOffers || [] })
  }

  // When "Contribute to this organisation" is clicked (no specific need)
  async function handleGeneralContribute() {
    if (!user) { setModal({ type: 'auth', need: null }); return }

    const { data: existingOffers } = await supabase
      .from('nextus_contributor_offers')
      .select('offer_type, contribution_mode, title, description')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(5)

    setModal({ type: 'contribute', need: null, existingOffers: existingOffers || [] })
  }

  async function submitClaim() {
    if (!user) { navigate('/login'); return }
    setClaiming(true)
    await supabase.from('nextus_claims').insert({
      actor_id: id,
      claimant_id: user.id,
      verification_method: 'manual',
      status: 'pending',
      notes: 'Submitted via actor profile page',
    })
    setClaiming(false)
    setClaimSent(true)
  }

  async function submitWaitlist(e) {
    e.preventDefault()
    if (!waitlistEmail) return
    await supabase.from('nextus_waitlist').insert({
      email: waitlistEmail,
      actor_id: id,
      source: 'actor_profile',
    })
    setWaitlistSent(true)
  }

  // ── Loading ──

  if (loading) {
    return (
      <div style={{ background: parch, minHeight: '100vh' }}>
        <Nav activePath="nextus" />
        <div style={{ maxWidth: '780px', margin: '0 auto', padding: '120px 40px' }}>
          <p style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.55)' }}>Loading…</p>
        </div>
      </div>
    )
  }

  if (!actor) {
    return (
      <div style={{ background: parch, minHeight: '100vh' }}>
        <Nav activePath="nextus" />
        <div style={{ maxWidth: '780px', margin: '0 auto', padding: '120px 40px', textAlign: 'center' }}>
          <p style={{ ...body, fontSize: '20px', color: 'rgba(15,21,35,0.55)', marginBottom: '20px' }}>
            Actor not found.
          </p>
          <button onClick={() => navigate('/nextus/actors')}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold, background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Back to actors
          </button>
        </div>
      </div>
    )
  }

  const domainLabel    = DOMAIN_LABEL[actor.domain_id]
  const subdomainLabel = SUBDOMAIN_LABEL[actor.subdomain_id]
  const horizonGoal    = DOMAIN_HORIZON[actor.domain_id]
  const scaleLabel     = SCALE_LABEL[actor.scale]

  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav activePath="nextus" />

      {/* Modals */}
      {modal?.type === 'contribute' && (
        <ContributionModal
          need={modal.need}
          actor={actor}
          user={user}
          onClose={() => setModal(null)}
          onSuccess={() => setModal({ type: 'success' })}
          existingOffers={modal.existingOffers || []}
        />
      )}
      {modal?.type === 'auth' && (
        <AuthPromptModal
          need={modal.need}
          actor={actor}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'success' && (
        <ContributionSuccess
          actor={actor}
          onClose={() => setModal(null)}
        />
      )}

      <style>{`
        @media (max-width: 640px) {
          .actor-main { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>

      <div className="actor-main" style={{ maxWidth: '780px', margin: '0 auto', padding: '80px 40px 120px' }}>

        {/* Back */}
        <button
          onClick={() => navigate('/nextus/actors')}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '36px', padding: 0 }}
        >
          ← All actors
        </button>

        {/* Claim prompt */}
        {!actor.claimed && !isOwner && (
          <div style={{
            background: 'rgba(200,146,42,0.04)',
            border: '1.5px solid rgba(200,146,42,0.28)',
            borderRadius: '12px', padding: '16px 22px', marginBottom: '32px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: '16px', flexWrap: 'wrap',
          }}>
            <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.70)', margin: 0 }}>
              Is this you or your organisation? This profile was created from public information.
            </p>
            {!claimSent ? (
              <button
                onClick={submitClaim} disabled={claiming}
                style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '9px 20px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)', color: gold, cursor: 'pointer', flexShrink: 0 }}
              >
                {claiming ? 'Sending…' : 'Claim this profile →'}
              </button>
            ) : (
              <span style={{ ...body, fontSize: '15px', color: '#2A6B3A' }}>Claim submitted — we'll be in touch.</span>
            )}
          </div>
        )}

        {/* Verified */}
        {actor.verified && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#2A6B3A' }} />
            <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em', color: '#2A6B3A' }}>Verified profile</span>
          </div>
        )}

        {/* Dormancy signal */}
        {actor.dormant_since && !isOwner && (() => {
          const days = Math.floor((Date.now() - new Date(actor.dormant_since).getTime()) / (1000 * 60 * 60 * 24))
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(15,21,35,0.25)' }} />
              <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)' }}>
                Last active {days} days ago
              </span>
            </div>
          )
        })()}

        {/* Meta pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {actor.type        && <Pill color="rgba(15,21,35,0.55)">{actor.type}</Pill>}
          {scaleLabel        && <Pill color="rgba(15,21,35,0.55)">{scaleLabel}</Pill>}
          {actor.focus?.name && <Pill color={gold}>{actor.focus.name}</Pill>}
          {actor.location_name && <Pill color="rgba(15,21,35,0.55)">{actor.location_name}</Pill>}
          {actor.winning     && <Pill color="#2A6B3A">Succeeding</Pill>}
        </div>

        {/* Name */}
        <h1 style={{
          ...body,
          fontSize: 'clamp(28px,4.5vw,46px)',
          fontWeight: 300, color: dark,
          lineHeight: 1.08, letterSpacing: '-0.01em',
          marginBottom: '16px',
        }}>
          {actor.name}
        </h1>

        {/* Domain breadcrumb — primary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: actorDomains.length > 1 ? '12px' : '32px' }}>
          {domainLabel && (
            <button
              onClick={() => navigate(`/nextus/actors?domain=${actor.domain_id}`)}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: gold, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
              {domainLabel}
            </button>
          )}
          {subdomainLabel && (
            <>
              <span style={{ color: 'rgba(200,146,42,0.35)', fontSize: '14px' }}>›</span>
              <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.13em', color: 'rgba(168,114,26,0.70)' }}>
                {subdomainLabel}
              </span>
            </>
          )}
          {actorDomains.length > 1 && (
            <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)', marginLeft: '4px' }}>
              Primary
            </span>
          )}
        </div>

        {/* Secondary domains */}
        {actorDomains.length > 1 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
            {actorDomains.filter(d => !d.is_primary).map(d => {
              const dLabel = DOMAIN_LABEL[d.domain_id]
              const sdLabel = SUBDOMAIN_LABEL[d.subdomain_id]
              if (!dLabel) return null
              return (
                <button
                  key={d.id}
                  onClick={() => navigate(`/nextus/actors?domain=${d.domain_id}`)}
                  style={{
                    ...sc, fontSize: '12px', letterSpacing: '0.12em',
                    color: 'rgba(168,114,26,0.72)',
                    background: 'rgba(200,146,42,0.05)',
                    border: '1px solid rgba(200,146,42,0.22)',
                    borderRadius: '40px', padding: '4px 12px',
                    cursor: 'pointer',
                  }}
                >
                  {dLabel}{sdLabel ? ` · ${sdLabel}` : ''}
                </button>
              )
            })}
          </div>
        )}

        {/* Owner controls */}
        {isOwner && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '32px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => navigate(`/nextus/actors/${id}/needs/new`)}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '10px 20px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)', color: gold, cursor: 'pointer' }}
            >
              + Post a need
            </button>
            <button
              onClick={() => navigate(`/nextus/actors/${id}/manage`)}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '10px 20px', borderRadius: '40px', border: '1px solid rgba(15,21,35,0.55)', background: 'transparent', color: 'rgba(15,21,35,0.55)', cursor: 'pointer' }}
            >
              Manage profile
            </button>
            <span style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)' }}>You own this profile</span>
          </div>
        )}

        {/* Description */}
        {actor.description && (
          <p style={{ ...body, fontSize: '17px', fontWeight: 300, color: 'rgba(15,21,35,0.82)', lineHeight: 1.85, marginBottom: '28px' }}>
            {actor.description}
          </p>
        )}

        {/* Impact + reach */}
        {(actor.impact_summary || actor.reach) && (
          <div style={{ borderLeft: '2px solid rgba(200,146,42,0.22)', paddingLeft: '22px', marginBottom: '36px' }}>
            {actor.impact_summary && (
              <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.75)', lineHeight: 1.8, marginBottom: actor.reach ? '8px' : 0 }}>
                {actor.impact_summary}
              </p>
            )}
            {actor.reach && (
              <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)', margin: 0 }}>
                Reach: {actor.reach}
              </p>
            )}
          </div>
        )}

        {/* Domain alignment notes — shown when actorDomains have notes */}
        {actorDomains.some(d => d.alignment_note) && (
          <div style={{ marginBottom: '40px' }}>
            {actorDomains.filter(d => d.alignment_note).map(d => {
              const dLabel = DOMAIN_LABEL[d.domain_id]
              const horizon = DOMAIN_HORIZON[d.domain_id]
              return (
                <div key={d.id} style={{
                  background: 'rgba(200,146,42,0.04)',
                  border: '1px solid rgba(200,146,42,0.18)',
                  borderRadius: '12px', padding: '18px 22px',
                  marginBottom: '10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: gold }}>
                      {dLabel}
                    </span>
                    {d.is_primary && (
                      <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.14em', color: 'rgba(168,114,26,0.60)' }}>
                        Primary domain
                      </span>
                    )}
                  </div>
                  <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.78)', lineHeight: 1.75, marginBottom: horizon ? '10px' : 0 }}>
                    {d.alignment_note}
                  </p>
                  {horizon && (
                    <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.6, margin: 0 }}>
                      Horizon: {horizon}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Horizon goal — fallback when no alignment notes */}
        {!actorDomains.some(d => d.alignment_note) && horizonGoal && (
          <div style={{ background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '12px', padding: '20px 24px', marginBottom: '40px' }}>
            <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: gold, marginBottom: '8px' }}>
              {domainLabel} · Horizon Goal
            </div>
            <p style={{ ...body, fontSize: '15px', fontWeight: 300, color: 'rgba(15,21,35,0.75)', lineHeight: 1.75, margin: 0 }}>
              {horizonGoal}
            </p>
          </div>
        )}

        {/* Alignment score — only show if computed by integrity cron (3+ closed loops) */}
        {actor.alignment_score != null && actor.alignment_score_computed && (
          <div style={{ marginBottom: '36px' }}>
            <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.55)', marginBottom: '8px' }}>
              Alignment to Horizon Goal — {actor.alignment_score}/10
            </div>
            <div style={{ height: '3px', background: 'rgba(200,146,42,0.12)', borderRadius: '2px', maxWidth: '280px' }}>
              <div style={{ height: '100%', width: `${(actor.alignment_score / 10) * 100}%`, background: gold, borderRadius: '2px' }} />
            </div>
          </div>
        )}
        {actor.alignment_score != null && !actor.alignment_score_computed && (
          <div style={{ marginBottom: '36px' }}>
            <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.55)', marginBottom: '4px' }}>
              Alignment to Horizon Goal
            </div>
            <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>
              Not yet established — confirmed contribution loops required
            </div>
          </div>
        )}

        {/* Website */}
        {actor.website && (
          <div style={{ marginBottom: '48px' }}>
            <a
              href={actor.website} target="_blank" rel="noopener noreferrer"
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold, textDecoration: 'none', borderBottom: `1px solid ${gold}35`, paddingBottom: '2px' }}
            >
              Visit website →
            </a>
          </div>
        )}

        {/* ── OFFERINGS ── */}
        {offerings.length > 0 && (
          <div style={{ marginBottom: '52px' }}>
            <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.15)', marginBottom: '36px' }} />
            <h2 style={{ ...body, fontSize: 'clamp(22px,3vw,32px)', fontWeight: 300, color: dark, marginBottom: '10px' }}>
              What they offer.
            </h2>
            <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.55)', marginBottom: '28px', lineHeight: 1.65, maxWidth: '520px' }}>
              Tools, services, programmes, and resources available from {actor.name}.
            </p>
            {offerings.map(o => (
              <OfferingCard key={o.id} offering={o} />
            ))}
          </div>
        )}

        {/* ── NEEDS ── */}
        {actor.needs_visible === false ? (
          <div style={{ marginBottom: '48px' }}>
            <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.15)', marginBottom: '36px' }} />
            <div style={{ background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.20)', borderRadius: '12px', padding: '20px 24px' }}>
              <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.55)', marginBottom: '8px' }}>
                Needs paused
              </p>
              <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.75, margin: 0 }}>
                {actor.name} is completing outstanding contribution reports before posting new needs. Check back soon.
              </p>
            </div>
          </div>
        ) : needs.length > 0 && (
          <div style={{ marginBottom: '48px' }}>
            <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.15)', marginBottom: '36px' }} />
            <h2 style={{ ...body, fontSize: 'clamp(22px,3vw,32px)', fontWeight: 300, color: dark, marginBottom: '10px' }}>
              What they need.
            </h2>
            <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.55)', marginBottom: '28px', lineHeight: 1.65, maxWidth: '520px' }}>
              {actor.name} is actively looking for contributors. If any of these match your skills or interests, let them know — your contribution will be tracked and attributed.
            </p>
            {needs.map(need => (
              <NeedCard key={need.id} need={need} onHelp={handleHelp} />
            ))}
          </div>
        )}

        {/* ── GENERAL CONTRIBUTE CTA ── */}
        <div style={{ marginBottom: '48px' }}>
          <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.15)', marginBottom: '36px' }} />
          <h2 style={{ ...body, fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 300, color: dark, marginBottom: '10px' }}>
            Want to contribute?
          </h2>
          <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.65, marginBottom: '20px', maxWidth: '480px' }}>
            {needs.length === 0
              ? `${actor.name} hasn't posted specific needs yet. You can still record a general contribution — it will appear on your profile and be visible to them.`
              : `You can also contribute in a way not listed above.`
            }
          </p>
          <button
            onClick={handleGeneralContribute}
            style={{
              ...sc, fontSize: '14px', letterSpacing: '0.16em',
              padding: '13px 28px', borderRadius: '40px',
              border: '1.5px solid rgba(200,146,42,0.78)',
              background: 'rgba(200,146,42,0.05)',
              color: gold, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#C8922A'; e.currentTarget.style.color = '#FFFFFF' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(200,146,42,0.05)'; e.currentTarget.style.color = gold }}
          >
            Contribute to {actor.name} →
          </button>
        </div>

        {/* ── FOLLOW / WAITLIST ── */}
        <div style={{ background: dark, borderRadius: '14px', padding: '36px 40px', marginBottom: '32px' }}>
          <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.20em', color: 'rgba(200,146,42,0.70)', marginBottom: '12px' }}>
            Stay informed
          </div>
          <h3 style={{ ...body, fontSize: '24px', fontWeight: 300, color: 'rgba(255,255,255,0.92)', marginBottom: '10px' }}>
            Follow {actor.name}.
          </h3>
          <p style={{ ...body, fontSize: '15px', color: 'rgba(255,255,255,0.50)', marginBottom: '24px', lineHeight: 1.7, maxWidth: '380px' }}>
            We'll let you know when new needs are posted or when something changes worth knowing about.
          </p>
          {!waitlistSent ? (
            <form onSubmit={submitWaitlist} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="email" required
                value={waitlistEmail}
                onChange={e => setWaitlistEmail(e.target.value)}
                placeholder="your@email.com"
                style={{ ...body, fontSize: '15px', color: dark, padding: '13px 18px', borderRadius: '40px', border: 'none', background: 'rgba(255,255,255,0.92)', outline: 'none', flex: 1, minWidth: '200px' }}
              />
              <button type="submit" style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '13px 26px', borderRadius: '40px', border: 'none', background: '#C8922A', color: '#FFFFFF', cursor: 'pointer', flexShrink: 0 }}>
                Follow →
              </button>
            </form>
          ) : (
            <p style={{ ...body, fontSize: '16px', color: '#C8922A', margin: 0 }}>
              You're following {actor.name}.
            </p>
          )}
        </div>

        {/* Data transparency */}
        {actor.data_source && (
          <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.6 }}>
            Profile sourced from: {actor.data_source}.
            {!actor.claimed && ' This profile has not been claimed or verified by the entity it describes.'}
          </p>
        )}

      </div>

      <SiteFooter />
    </div>
  )
}
