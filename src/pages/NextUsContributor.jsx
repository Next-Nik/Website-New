import { useState, useEffect } from 'react'
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

const OFFER_TYPE_LABEL = {
  skills:'Skills', time:'Time', capital:'Capital',
  community:'Community', knowledge:'Knowledge', creative:'Creative', other:'Other',
}

const CONTRIBUTION_MODE_LABEL = {
  functional:'Functional', expressive:'Expressive', relational:'Relational',
  intellectual:'Intellectual', mixed:'Mixed',
}

const CONTRIBUTION_MODE_DESC = {
  functional:   'Builds, organises, funds, connects',
  expressive:   'Makes, performs, creates, transmits',
  relational:   'Heals, holds, facilitates, witnesses',
  intellectual: 'Researches, synthesises, frames, teaches',
  mixed:        'Crosses more than one mode',
}

const RETURN_TYPE_LABEL = {
  none:'Volunteer', acknowledged:'Acknowledged', paid:'Paid',
  token:'Token', reciprocal:'Reciprocal',
}

const WILLING_TO_LABEL = {
  any:            'Open to any aligned org',
  domain_aligned: 'Domain-aligned orgs',
  verified_only:  'Verified orgs only',
  invitation_only:'By invitation only',
}

const CONTRIB_TYPE_LABEL = {
  hours:'Time', capital:'Capital', skills:'Skills',
  resources:'Resources', community:'Community', other:'Other',
}

// ── Shared primitives ────────────────────────────────────────

function Pill({ children, color = gold }) {
  return (
    <span style={{
      ...sc, fontSize: '12px', letterSpacing: '0.12em',
      padding: '4px 12px', borderRadius: '40px',
      border: `1px solid ${color}40`, color,
      background: `${color}12`, display: 'inline-block',
    }}>
      {children}
    </span>
  )
}

function Divider() {
  return <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.15)', margin: '40px 0' }} />
}

// ── Offer card (public view) ─────────────────────────────────

function OfferCard({ offer, onReach, canReach }) {
  const typeLabel   = OFFER_TYPE_LABEL[offer.offer_type] || offer.offer_type
  const modeLabel   = CONTRIBUTION_MODE_LABEL[offer.contribution_mode] || offer.contribution_mode
  const modeDesc    = CONTRIBUTION_MODE_DESC[offer.contribution_mode] || ''
  const returnLabel = RETURN_TYPE_LABEL[offer.return_type] || offer.return_type
  const willingLabel = WILLING_TO_LABEL[offer.willing_to_offer_to] || offer.willing_to_offer_to

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1.5px solid rgba(200,146,42,0.20)',
      borderRadius: '14px',
      padding: '22px 26px',
      marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          {/* Tags */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Pill>{typeLabel}</Pill>
            <Pill color="rgba(15,21,35,0.55)">{modeLabel}</Pill>
            <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.55)' }}>
              {returnLabel}
            </span>
          </div>

          {/* Title */}
          <h4 style={{ ...body, fontSize: '18px', fontWeight: 300, color: dark, marginBottom: '6px', lineHeight: 1.3 }}>
            {offer.title}
          </h4>

          {/* Mode description */}
          {modeDesc && (
            <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginBottom: '8px' }}>
              {modeDesc}
            </p>
          )}

          {/* Description */}
          {offer.description && (
            <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.75, marginBottom: '10px' }}>
              {offer.description}
            </p>
          )}

          {/* Domains */}
          {offer.domain_ids?.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {offer.domain_ids.map(d => (
                <span key={d} style={{
                  ...sc, fontSize: '11px', letterSpacing: '0.10em',
                  color: 'rgba(15,21,35,0.55)',
                  background: 'rgba(15,21,35,0.04)',
                  border: '1px solid rgba(15,21,35,0.08)',
                  borderRadius: '4px', padding: '2px 8px',
                }}>
                  {DOMAIN_LABEL[d] || d}
                </span>
              ))}
            </div>
          )}

          {/* Availability + willing */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {offer.availability && (
              <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.55)' }}>
                {offer.availability}
              </span>
            )}
            <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.55)' }}>
              {willingLabel}
            </span>
            {offer.open_to_adjacent && (
              <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(168,114,26,0.60)' }}>
                Open to adjacent enquiries
              </span>
            )}
          </div>
        </div>

        {/* CTA */}
        {canReach && (
          <div style={{ flexShrink: 0 }}>
            <button
              onClick={() => onReach(offer)}
              style={{
                ...sc, fontSize: '13px', letterSpacing: '0.14em',
                padding: '11px 22px', borderRadius: '40px',
                border: '1.5px solid rgba(200,146,42,0.78)',
                background: 'rgba(200,146,42,0.05)',
                color: gold, cursor: 'pointer',
                transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#C8922A'; e.currentTarget.style.color = '#FFFFFF' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(200,146,42,0.05)'; e.currentTarget.style.color = gold }}
            >
              Reach out →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Reach out modal ──────────────────────────────────────────

function ReachOutModal({ offer, contributor, user, onClose, onSuccess }) {
  const [message, setMessage] = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)

  async function submit() {
    if (!message.trim()) { setError('Please write a message.'); return }
    setSaving(true)
    const { error: saveError } = await supabase
      .from('nextus_contributor_enquiries')
      .insert({
        contributor_id:  contributor.id,
        enquirer_id:     user.id,
        offer_id:        offer?.id || null,
        message:         message.trim(),
        offer_title:     offer?.title || null,
      })
    setSaving(false)
    if (saveError) { setError('Something went wrong. Please try again.'); return }
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
        borderRadius: '14px', padding: '36px',
        maxWidth: '480px', width: '100%',
        position: 'relative', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'rgba(15,21,35,0.55)', lineHeight: 1 }}
        >×</button>

        <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: gold, display: 'block', marginBottom: '8px' }}>
          Reaching out
        </span>
        <h3 style={{ ...body, fontSize: '22px', fontWeight: 300, color: dark, lineHeight: 1.2, marginBottom: '6px' }}>
          {offer ? offer.title : `Contact ${contributor.display_name || 'this contributor'}`}
        </h3>
        {offer?.description && (
          <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.6, marginBottom: '20px' }}>
            {offer.description.slice(0, 120)}{offer.description.length > 120 ? '…' : ''}
          </p>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.15)', marginBottom: '20px' }} />

        <div style={{ marginBottom: '20px' }}>
          <label style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '8px' }}>
            Your message
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Tell them who you are, what you're working on, and why you think their offer is relevant to your work. Be specific — specific enquiries get responses."
            rows={5}
            style={{ ...body, fontSize: '14px', color: dark, padding: '11px 14px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', width: '100%', resize: 'vertical', lineHeight: 1.65 }}
          />
        </div>

        <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.6, marginBottom: '20px' }}>
          This message will be sent to the contributor. They decide whether to respond.
        </p>

        {error && (
          <p style={{ ...body, fontSize: '14px', color: '#8A3030', marginBottom: '16px' }}>{error}</p>
        )}

        <button
          onClick={submit}
          disabled={saving || !message.trim()}
          style={{
            width: '100%', padding: '14px',
            ...sc, fontSize: '14px', letterSpacing: '0.16em',
            borderRadius: '40px', border: 'none',
            background: saving || !message.trim() ? 'rgba(200,146,42,0.30)' : '#C8922A',
            color: '#FFFFFF',
            cursor: saving || !message.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Sending…' : 'Send message →'}
        </button>
      </div>
    </div>
  )
}

function AuthReachModal({ onClose }) {
  const navigate = useNavigate()
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,21,35,0.60)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
    >
      <div style={{ background: parch, border: '1.5px solid rgba(200,146,42,0.40)', borderRadius: '14px', padding: '36px', maxWidth: '400px', width: '100%', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'rgba(15,21,35,0.55)', lineHeight: 1 }}>×</button>
        <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.18em', color: gold, display: 'block', marginBottom: '12px' }}>Sign in to reach out</span>
        <h3 style={{ ...body, fontSize: '22px', fontWeight: 300, color: dark, marginBottom: '12px' }}>Create an account to contact contributors.</h3>
        <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.60)', lineHeight: 1.7, marginBottom: '24px' }}>
          Messages are tracked so contributors can see who's reaching out and why. An account gives you a presence on the platform too.
        </p>
        <button
          onClick={() => navigate('/login')}
          style={{ width: '100%', padding: '14px', ...sc, fontSize: '14px', letterSpacing: '0.16em', borderRadius: '40px', border: 'none', background: '#C8922A', color: '#FFFFFF', cursor: 'pointer' }}
        >
          Sign in or create account →
        </button>
      </div>
    </div>
  )
}

function ReachOutSuccess({ onClose }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,21,35,0.60)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
    >
      <div style={{ background: parch, border: '1.5px solid rgba(200,146,42,0.40)', borderRadius: '14px', padding: '40px', maxWidth: '380px', width: '100%', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(42,107,58,0.10)', border: '1.5px solid rgba(42,107,58,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <span style={{ color: '#2A6B3A', fontSize: '22px' }}>✓</span>
        </div>
        <h3 style={{ ...body, fontSize: '24px', fontWeight: 300, color: dark, marginBottom: '12px' }}>Message sent.</h3>
        <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.60)', lineHeight: 1.75, marginBottom: '28px' }}>
          The contributor will see your message and decide whether to respond. Good luck.
        </p>
        <button
          onClick={onClose}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '11px 28px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)', color: gold, cursor: 'pointer' }}
        >
          Close
        </button>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────

export function NextUsContributorPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [contributor, setContributor] = useState(null)
  const [offers, setOffers]           = useState([])
  const [contributions, setContributions] = useState([])
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState(null)
  // modal: null | { type: 'reach', offer } | { type: 'auth' } | { type: 'success' }

  const isOwner = user?.id === id

  useEffect(() => {
    async function load() {
      const [
        { data: userData },
        { data: offersData },
        { data: contribData },
      ] = await Promise.all([
        // Fetch public profile info from auth metadata via contributor_profiles view
        // Falls back to a minimal object if not available
        supabase.from('contributor_profiles')
          .select('*')
          .eq('id', id)
          .maybeSingle(),
        supabase.from('nextus_contributor_offers')
          .select('*')
          .eq('user_id', id)
          .eq('is_active', true)
          .in('willing_to_offer_to', ['any', 'domain_aligned'])
          .order('created_at', { ascending: true }),
        supabase.from('nextus_contributions')
          .select('*, nextus_actors(id, name, domain_id)')
          .eq('contributor_id', id)
          .eq('confirmed_by_actor', true)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      setContributor(userData)
      setOffers(offersData || [])
      setContributions(contribData || [])
      setLoading(false)
    }
    load()
  }, [id])

  function handleReach(offer) {
    if (isOwner) return
    if (user) {
      setModal({ type: 'reach', offer })
    } else {
      setModal({ type: 'auth' })
    }
  }

  if (loading) {
    return (
      <div style={{ background: parch, minHeight: '100vh' }}>
        <Nav activePath="nextus" />
        <div style={{ maxWidth: '740px', margin: '0 auto', padding: '120px 40px' }}>
          <p style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.55)' }}>Loading…</p>
        </div>
      </div>
    )
  }

  // If no contributor_profiles view yet, show a graceful stub
  const displayName = contributor?.display_name || contributor?.full_name || 'Contributor'
  const archetype   = contributor?.archetype
  const domain      = contributor?.domain_id
  const scale       = contributor?.scale
  const statement   = contributor?.civilisational_statement
  const lastActive  = contributor?.last_active_at

  // Dormancy — more than 90 days
  const dormantDays = lastActive
    ? Math.floor((Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24))
    : null
  const isDormant = dormantDays !== null && dormantDays > 90

  const domainLabel  = DOMAIN_LABEL[domain]
  const horizonGoal  = DOMAIN_HORIZON[domain]

  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav activePath="nextus" />

      {/* Modals */}
      {modal?.type === 'reach' && (
        <ReachOutModal
          offer={modal.offer}
          contributor={{ id, display_name: displayName }}
          user={user}
          onClose={() => setModal(null)}
          onSuccess={() => setModal({ type: 'success' })}
        />
      )}
      {modal?.type === 'auth' && (
        <AuthReachModal onClose={() => setModal(null)} />
      )}
      {modal?.type === 'success' && (
        <ReachOutSuccess onClose={() => setModal(null)} />
      )}

      <style>{`
        @media (max-width: 640px) {
          .contributor-main { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>

      <div className="contributor-main" style={{ maxWidth: '740px', margin: '0 auto', padding: '80px 40px 120px' }}>

        {/* Back */}
        <button
          onClick={() => navigate('/nextus/contributors')}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '36px', padding: 0 }}
        >
          ← All contributors
        </button>

        {/* Owner banner */}
        {isOwner && (
          <div style={{ background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.30)', borderRadius: '12px', padding: '14px 20px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.65)', margin: 0 }}>
              This is your contributor profile. Manage your offers from your main profile page.
            </p>
            <a href="/profile" style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold, textDecoration: 'none' }}>
              Go to profile →
            </a>
          </div>
        )}

        {/* Dormancy signal */}
        {isDormant && !isOwner && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(15,21,35,0.25)' }} />
            <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)' }}>
              Last active {dormantDays} days ago
            </span>
          </div>
        )}

        {/* Meta pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {archetype   && <Pill>{archetype}</Pill>}
          {domainLabel && <Pill color="rgba(15,21,35,0.55)">{domainLabel}</Pill>}
          {scale       && <Pill color="rgba(15,21,35,0.55)">{scale}</Pill>}
        </div>

        {/* Name */}
        <h1 style={{ ...body, fontSize: 'clamp(28px,4.5vw,46px)', fontWeight: 300, color: dark, lineHeight: 1.08, letterSpacing: '-0.01em', marginBottom: '20px' }}>
          {displayName}
        </h1>

        {/* Civilisational statement */}
        {statement && (
          <div style={{ borderLeft: '2px solid rgba(200,146,42,0.30)', paddingLeft: '20px', marginBottom: '32px' }}>
            <p style={{ ...body, fontSize: '17px', fontWeight: 300, color: 'rgba(15,21,35,0.80)', lineHeight: 1.75, margin: 0 }}>
              {statement}
            </p>
          </div>
        )}

        {/* Domain + horizon */}
        {domainLabel && horizonGoal && (
          <div style={{ background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '12px', padding: '18px 22px', marginBottom: '40px' }}>
            <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: gold, marginBottom: '6px' }}>
              {domainLabel} · Horizon Goal
            </div>
            <p style={{ ...body, fontSize: '14px', fontWeight: 300, color: 'rgba(15,21,35,0.65)', lineHeight: 1.75, margin: 0 }}>
              {horizonGoal}
            </p>
          </div>
        )}

        {/* ── OFFERS ── */}
        {offers.length > 0 && (
          <>
            <Divider />
            <h2 style={{ ...body, fontSize: 'clamp(20px,2.8vw,30px)', fontWeight: 300, color: dark, marginBottom: '10px' }}>
              What they're offering.
            </h2>
            <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.55)', marginBottom: '28px', lineHeight: 1.65, maxWidth: '500px' }}>
              {displayName} has placed the following on the table for the ecosystem.
            </p>
            {offers.map(o => (
              <OfferCard
                key={o.id}
                offer={o}
                onReach={handleReach}
                canReach={!isOwner}
              />
            ))}
          </>
        )}

        {offers.length === 0 && !isOwner && (
          <>
            <Divider />
            <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.7 }}>
              No active offers listed yet.
            </p>
          </>
        )}

        {/* ── CONTRIBUTION RECORD ── */}
        {contributions.length > 0 && (
          <>
            <Divider />
            <h2 style={{ ...body, fontSize: 'clamp(20px,2.8vw,30px)', fontWeight: 300, color: dark, marginBottom: '10px' }}>
              Contribution record.
            </h2>
            <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.55)', marginBottom: '28px', lineHeight: 1.65, maxWidth: '500px' }}>
              Confirmed contributions — loops that closed.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {contributions.map(c => {
                const actorDomain = c.nextus_actors?.domain_id
                return (
                  <div
                    key={c.id}
                    style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.15)', borderRadius: '12px', padding: '16px 20px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: '#2A6B3A', background: 'rgba(42,107,58,0.08)', border: '1px solid rgba(42,107,58,0.25)', borderRadius: '4px', padding: '2px 8px' }}>
                            {CONTRIB_TYPE_LABEL[c.contribution_type] || c.contribution_type}
                          </span>
                          {actorDomain && (
                            <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.55)' }}>
                              {DOMAIN_LABEL[actorDomain] || actorDomain}
                            </span>
                          )}
                          <span style={{ ...sc, fontSize: '11px', color: '#2A6B3A', letterSpacing: '0.10em' }}>
                            Confirmed ✓
                          </span>
                        </div>
                        {c.nextus_actors?.name && (
                          <a
                            href={`/nextus/actors/${c.nextus_actors.id}`}
                            style={{ ...body, fontSize: '16px', fontWeight: 300, color: dark, textDecoration: 'none' }}
                          >
                            {c.nextus_actors.name}
                          </a>
                        )}
                        {c.description && (
                          <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.65, marginTop: '4px' }}>
                            {c.description.slice(0, 120)}{c.description.length > 120 ? '…' : ''}
                          </p>
                        )}
                      </div>
                      <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.55)', flexShrink: 0 }}>
                        {new Date(c.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Empty state — no contributions yet */}
        {contributions.length === 0 && offers.length === 0 && !isOwner && (
          <>
            <Divider />
            <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.7 }}>
              No contributions recorded yet.
            </p>
          </>
        )}

        {/* ── BACK TO MAP ── */}
        <div style={{ marginTop: '56px', paddingTop: '32px', borderTop: '1px solid rgba(200,146,42,0.15)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/nextus/contributors')}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            ← All contributors
          </button>
          <button
            onClick={() => navigate('/nextus/actors')}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Browse orgs →
          </button>
        </div>

      </div>

      <SiteFooter />
    </div>
  )
}
