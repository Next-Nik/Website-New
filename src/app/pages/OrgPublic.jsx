// src/app/pages/OrgPublic.jsx
//
// Public Atlas profile page.
//
// Two-layer model:
//   EVIDENCE LAYER — always present, observable signals
//     identity (name, type, tagline, location, image)
//     description (AI-drafted, third-person)
//     domain placement
//     links (website, podcast, socials, etc.)
//     press mentions ("as seen in")
//     embedded media (podcast feed, YouTube channel)
//     relationships (parent, children, partners)
//     provenance badge
//
//   VOICE LAYER — only present when claimed
//     mission_statement (first-person)
//     working_on_now (current focus)
//     offers (what they bring)
//     needs (what they're looking for)
//
// Wards (community/NextUs-seeded, unclaimed) show only evidence with a
// prominent claim CTA. Claimed profiles show both layers.

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'
import {
  body, sc, gold, dark, parch,
  DOMAIN_LABEL, SCALE_LABEL,
  PLACEMENT_TIER,
} from '../components/OrgShared'
import { DOMAIN_COLORS } from '../constants/domains'
import { ShareButton } from '../components/ShareButton'
import { WatchButton } from '../components/WatchButton'
import { MessageButton } from '../components/MessageButton'

// ── Design utilities ─────────────────────────────────────────

function Eyebrow({ children, style = {} }) {
  return (
    <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.22em',
      color: 'rgba(15,21,35,0.40)', textTransform: 'uppercase',
      marginBottom: '18px', ...style }}>
      {children}
    </div>
  )
}

function Rule() {
  return <div style={{ height: '1px',
    background: 'rgba(200,146,42,0.10)', margin: '52px 0' }} />
}

function NotFound() {
  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '160px 24px', textAlign: 'center' }}>
        <p style={{ ...body, fontSize: '17px', fontWeight: 300,
          color: 'rgba(15,21,35,0.45)', lineHeight: 1.75 }}>
          This profile does not exist or is not publicly visible.
        </p>
      </div>
    </div>
  )
}

// ── Link type renderers ──────────────────────────────────────

const LINK_LABELS = {
  website:         'Website',
  podcast_rss:     'Podcast',
  podcast_apple:   'Apple Podcasts',
  podcast_spotify: 'Spotify',
  youtube_channel: 'YouTube',
  youtube_video:   'YouTube',
  vimeo:           'Vimeo',
  substack:        'Substack',
  newsletter:      'Newsletter',
  instagram:       'Instagram',
  twitter:         'X',
  tiktok:          'TikTok',
  facebook:        'Facebook',
  linkedin:        'LinkedIn',
  medium:          'Medium',
  github:          'GitHub',
  book:            'Book',
  email:           'Email',
  contact_form:    'Contact form',
  calendly:        'Book a call',
  phone:           'Phone',
  other:           'Link',
}

// Contact link types — surfaced separately as a "Get in touch" section
const CONTACT_LINK_TYPES = new Set(['email', 'contact_form', 'calendly', 'phone'])

// Display order for contact links (most direct first)
const CONTACT_PRIORITY = {
  email: 0, contact_form: 1, calendly: 2, phone: 3,
}

// Display priority for links (lower = shown first)
const LINK_PRIORITY = {
  website: 0, podcast_rss: 1, podcast_apple: 2, podcast_spotify: 3,
  youtube_channel: 4, substack: 5, newsletter: 6,
  book: 7,
  instagram: 8, linkedin: 9, twitter: 10, facebook: 11, tiktok: 12,
  vimeo: 13, medium: 14, github: 15,
  youtube_video: 16, other: 99,
}

// ── Identity strip ───────────────────────────────────────────

function IdentityStrip({ actor, primaryDomain, principalTier, isOwner }) {
  const domainColor = DOMAIN_COLORS[primaryDomain] || gold
  const tierConfig  = PLACEMENT_TIER?.[principalTier]

  return (
    <div style={{ marginBottom: '52px' }}>
      <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start',
        flexWrap: 'wrap' }}>

        {/* Image */}
        {actor.image_url && (
          <div style={{ flexShrink: 0 }}>
            <img src={actor.image_url} alt={actor.name}
              style={{ width: '120px', height: '120px', objectFit: 'cover',
                borderRadius: '12px',
                border: '1px solid rgba(200,146,42,0.20)' }} />
          </div>
        )}

        {/* Identity content */}
        <div style={{ flex: 1, minWidth: '260px' }}>

          {/* Domain + scale eyebrow */}
          {primaryDomain && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px',
              marginBottom: '16px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%',
                background: domainColor, flexShrink: 0 }} />
              <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.20em',
                color: 'rgba(15,21,35,0.50)', textTransform: 'uppercase' }}>
                {DOMAIN_LABEL[primaryDomain] || primaryDomain}
              </span>
              {actor.scale && (
                <>
                  <span style={{ color: 'rgba(200,146,42,0.30)', fontSize: '12px' }}>·</span>
                  <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em',
                    color: 'rgba(15,21,35,0.40)' }}>
                    {SCALE_LABEL?.[actor.scale] || actor.scale}
                  </span>
                </>
              )}
              {actor.type && (
                <>
                  <span style={{ color: 'rgba(200,146,42,0.30)', fontSize: '12px' }}>·</span>
                  <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em',
                    color: 'rgba(15,21,35,0.40)' }}>
                    {actor.type.charAt(0).toUpperCase() + actor.type.slice(1)}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Name */}
          <h1 style={{ ...body, fontSize: 'clamp(30px, 5vw, 48px)', fontWeight: 300,
            color: dark, lineHeight: 1.06, letterSpacing: '-0.01em',
            margin: '0 0 10px' }}>
            {actor.name}
          </h1>

          {/* Tagline */}
          {actor.tagline && (
            <p style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.65)',
              lineHeight: 1.5, margin: '0 0 16px',
              fontStyle: 'italic' }}>
              {actor.tagline}
            </p>
          )}

          {/* Location */}
          {actor.location_name && (
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em',
              color: 'rgba(15,21,35,0.45)', marginBottom: '16px',
              textTransform: 'uppercase' }}>
              {actor.location_name}
            </div>
          )}

          {/* Placement tier badge */}
          {tierConfig && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '5px 12px', background: tierConfig.bg,
              border: `1px solid ${tierConfig.color}30`, borderRadius: '4px',
              marginBottom: '16px' }}>
              <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em',
                color: tierConfig.color }}>
                {tierConfig.label}
              </span>
            </div>
          )}

          {/* Manage link for owner */}
          {isOwner && (
            <div style={{ marginTop: '8px' }}>
              <Link to={`/org/${actor.slug || actor.id}/manage`}
                style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em',
                  color: 'rgba(15,21,35,0.55)', textDecoration: 'none',
                  padding: '6px 14px', borderRadius: '40px',
                  border: '1px solid rgba(200,146,42,0.30)',
                  background: 'rgba(200,146,42,0.04)' }}>
                Manage profile
              </Link>
            </div>
          )}

          {/* Watch + Message — only for signed-in non-owners. */}
          {!isOwner && (
            <div style={{ marginTop: '12px', display: 'flex', gap: '10px',
              alignItems: 'center', flexWrap: 'wrap' }}>
              <WatchButton
                entityType="actor"
                entityId={actor.id}
                entityName={actor.name}
                size="sm"
              />
              <MessageButton actor={actor} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Claim banner — prominent on wards ────────────────────────

function ClaimBanner({ actor, user }) {
  if (actor.profile_owner) return null  // already claimed

  return (
    <div style={{ background: 'rgba(200,146,42,0.06)',
      border: '1.5px solid rgba(200,146,42,0.35)',
      borderRadius: '12px', padding: '20px 24px', marginBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px',
        flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em',
            color: gold, marginBottom: '6px' }}>
            HELD IN TRUST
          </div>
          <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)',
            lineHeight: 1.6, margin: 0 }}>
            This profile was added by the community. NextUs holds it in trust until claimed.
            {actor.name === 'NextUs' ? '' : ` Is this you? Claim ${actor.name} to add your voice.`}
          </p>
        </div>
        {user ? (
          <Link to={`/org/${actor.slug || actor.id}/claim`}
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em',
              color: '#FFFFFF', background: '#C8922A',
              padding: '10px 22px', borderRadius: '40px',
              textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Claim this profile
          </Link>
        ) : (
          <Link to="/login"
            style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em',
              color: '#FFFFFF', background: '#C8922A',
              padding: '10px 22px', borderRadius: '40px',
              textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Sign in to claim
          </Link>
        )}
      </div>
    </div>
  )
}

// ── Voice layer — Mission statement ──────────────────────────

function MissionStatement({ actor }) {
  if (!actor.mission_statement) return null
  return (
    <div>
      <Eyebrow>Mission</Eyebrow>
      <p style={{ ...body, fontSize: '20px', color: dark, lineHeight: 1.55,
        margin: 0, fontWeight: 300 }}>
        {actor.mission_statement}
      </p>
    </div>
  )
}

// ── Voice layer — Working on now ─────────────────────────────

function WorkingOnNow({ actor }) {
  if (!actor.working_on_now) return null
  return (
    <div>
      <Eyebrow>Working on now</Eyebrow>
      <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.78)',
        lineHeight: 1.65, margin: 0 }}>
        {actor.working_on_now}
      </p>
    </div>
  )
}

// ── Evidence layer — Description ─────────────────────────────

function Description({ actor }) {
  if (!actor.description) return null
  return (
    <div>
      <Eyebrow>About</Eyebrow>
      <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.78)',
        lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
        {actor.description}
      </p>
    </div>
  )
}

// ── Placement ────────────────────────────────────────────────

function Placement({ domains, subdomains }) {
  if (!domains?.length) return null
  return (
    <div>
      <Eyebrow>Placement</Eyebrow>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px',
        marginBottom: subdomains?.length ? '14px' : 0 }}>
        {domains.map(slug => (
          <span key={slug} style={{ ...sc, fontSize: '12px', letterSpacing: '0.06em',
            color: gold, background: 'rgba(200,146,42,0.06)',
            border: '1px solid rgba(200,146,42,0.30)',
            padding: '4px 11px', borderRadius: '40px' }}>
            {DOMAIN_LABEL[slug] || slug}
          </span>
        ))}
      </div>
      {subdomains?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {subdomains.map(s => (
            <span key={s} style={{ ...body, fontSize: '12px',
              color: 'rgba(15,21,35,0.55)',
              background: 'transparent',
              border: '1px solid rgba(200,146,42,0.18)',
              padding: '3px 9px', borderRadius: '40px' }}>
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Links row ────────────────────────────────────────────────

function LinksRow({ links }) {
  // Filter out contact links — they have their own ContactSection
  const nonContact = (links || []).filter(l => !CONTACT_LINK_TYPES.has(l.link_type))
  if (!nonContact.length) return null

  const sorted = [...nonContact].sort((a, b) =>
    (LINK_PRIORITY[a.link_type] ?? 99) - (LINK_PRIORITY[b.link_type] ?? 99)
  )

  return (
    <div>
      <Eyebrow>Links</Eyebrow>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {sorted.map(link => (
          <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
            style={{ ...sc, fontSize: '12px', letterSpacing: '0.10em',
              color: 'rgba(15,21,35,0.72)', textDecoration: 'none',
              padding: '7px 14px', borderRadius: '40px',
              border: '1px solid rgba(200,146,42,0.25)',
              background: '#FFFFFF',
              transition: 'all 0.15s ease' }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(200,146,42,0.55)'
              e.currentTarget.style.color = gold
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(200,146,42,0.25)'
              e.currentTarget.style.color = 'rgba(15,21,35,0.72)'
            }}>
            {link.label || LINK_LABELS[link.link_type] || link.link_type}
          </a>
        ))}
      </div>
    </div>
  )
}

// ── Contact section ──────────────────────────────────────────
// Surfaces contact-specific links (email, contact form, Calendly, phone) as
// a "Get in touch" section. Until in-platform messaging ships, this is the
// primary path for users to reach an actor — especially unclaimed wards.

function ContactSection({ links, actorName }) {
  const contact = (links || []).filter(l => CONTACT_LINK_TYPES.has(l.link_type))
  if (!contact.length) return null

  const sorted = [...contact].sort((a, b) =>
    (CONTACT_PRIORITY[a.link_type] ?? 99) - (CONTACT_PRIORITY[b.link_type] ?? 99)
  )

  return (
    <div>
      <Eyebrow>Get in touch</Eyebrow>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {sorted.map(link => {
          // Email links: ensure mailto: prefix
          let href = link.url
          if (link.link_type === 'email' && !href.startsWith('mailto:')) {
            href = 'mailto:' + href
          } else if (link.link_type === 'phone' && !href.startsWith('tel:')) {
            href = 'tel:' + href.replace(/[^\d+]/g, '')
          }
          const labelText = link.label || LINK_LABELS[link.link_type] || link.link_type
          return (
            <a key={link.id} href={href}
              target={['email','phone'].includes(link.link_type) ? '_self' : '_blank'}
              rel="noopener noreferrer"
              style={{ ...sc, fontSize: '12px', letterSpacing: '0.10em',
                color: '#FFFFFF', textDecoration: 'none',
                padding: '8px 16px', borderRadius: '40px',
                border: '1px solid #C8922A',
                background: '#C8922A',
                transition: 'all 0.15s ease' }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#A8721A'
                e.currentTarget.style.borderColor = '#A8721A'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#C8922A'
                e.currentTarget.style.borderColor = '#C8922A'
              }}>
              {labelText}
            </a>
          )
        })}
      </div>
    </div>
  )
}

// ── Press strip ──────────────────────────────────────────────

function PressStrip({ press }) {
  if (!press?.length) return null
  return (
    <div>
      <Eyebrow>Featured in</Eyebrow>
      <p style={{ ...body, fontSize: '15px',
        color: 'rgba(15,21,35,0.65)', lineHeight: 1.7, margin: 0,
        fontStyle: 'italic' }}>
        {press.map((p, idx) => (
          <span key={p.id}>
            {p.url ? (
              <a href={p.url} target="_blank" rel="noopener noreferrer"
                style={{ color: 'rgba(15,21,35,0.72)', textDecoration: 'none',
                  borderBottom: '1px dotted rgba(200,146,42,0.45)' }}>
                {p.publication}
              </a>
            ) : (
              <span>{p.publication}</span>
            )}
            {idx < press.length - 1 && <span style={{ color: 'rgba(200,146,42,0.30)' }}> · </span>}
          </span>
        ))}
      </p>
    </div>
  )
}

// ── Offers section ───────────────────────────────────────────

function OffersSection({ offers }) {
  if (!offers?.length) return null
  return (
    <div>
      <Eyebrow>What they offer</Eyebrow>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {offers.map(offer => <OfferOrNeedCard key={offer.id} item={offer} kind="offer" />)}
      </div>
    </div>
  )
}

// ── Needs section ────────────────────────────────────────────

function NeedsSection({ needs }) {
  if (!needs?.length) return null
  return (
    <div>
      <Eyebrow>What they need</Eyebrow>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {needs.map(need => <OfferOrNeedCard key={need.id} item={need} kind="need" />)}
      </div>
    </div>
  )
}

// ── Offer or Need card ───────────────────────────────────────

function OfferOrNeedCard({ item, kind }) {
  const accent = kind === 'offer' ? '#2A6B3A' : '#2A4A8A'
  const accentBg = kind === 'offer' ? 'rgba(42,107,58,0.04)' : 'rgba(42,74,138,0.04)'
  const accentBorder = kind === 'offer' ? 'rgba(42,107,58,0.20)' : 'rgba(42,74,138,0.20)'

  let locationLabel = null
  if (item.location_mode === 'local_only') locationLabel = 'Local only'
  else if (item.location_mode === 'specific') locationLabel = item.location_specifics || 'Specific places'
  // 'anywhere' shows no label

  return (
    <div style={{ background: '#FFFFFF',
      border: `1px solid ${accentBorder}`,
      borderRadius: '10px', padding: '16px 18px' }}>
      <h3 style={{ ...body, fontSize: '16px', fontWeight: 400,
        color: dark, margin: '0 0 6px', lineHeight: 1.4 }}>
        {item.title}
      </h3>
      {item.description && (
        <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.65)',
          lineHeight: 1.6, margin: '0 0 10px' }}>
          {item.description}
        </p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
        <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.12em',
          color: accent, background: accentBg,
          border: `1px solid ${accentBorder}`,
          padding: '2px 9px', borderRadius: '40px',
          textTransform: 'uppercase' }}>
          {kind === 'offer' ? 'Offer' : 'Need'}
        </span>
        {locationLabel && (
          <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.08em',
            color: 'rgba(15,21,35,0.55)', background: 'transparent',
            border: '1px solid rgba(200,146,42,0.20)',
            padding: '2px 9px', borderRadius: '40px' }}>
            {locationLabel}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Relationships section ────────────────────────────────────

function RelationshipsSection({ parent, children, partners }) {
  if (!parent && !children?.length && !partners?.length) return null
  return (
    <div>
      <Eyebrow>Relationships</Eyebrow>

      {parent && (
        <div style={{ marginBottom: children?.length || partners?.length ? '18px' : 0 }}>
          <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em',
            color: 'rgba(15,21,35,0.45)', marginBottom: '6px' }}>
            PART OF
          </div>
          <Link to={`/org/${parent.slug || parent.id}`}
            style={{ ...body, fontSize: '15px', color: dark,
              textDecoration: 'none', borderBottom: '1px dotted rgba(200,146,42,0.45)' }}>
            {parent.name}
          </Link>
        </div>
      )}

      {children?.length > 0 && (
        <div style={{ marginBottom: partners?.length ? '18px' : 0 }}>
          <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em',
            color: 'rgba(15,21,35,0.45)', marginBottom: '8px' }}>
            INCLUDES
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {children.map(c => (
              <Link key={c.id} to={`/org/${c.slug || c.id}`}
                style={{ ...body, fontSize: '14px', color: dark,
                  textDecoration: 'none', padding: '5px 12px',
                  borderRadius: '40px',
                  border: '1px solid rgba(200,146,42,0.25)',
                  background: '#FFFFFF' }}>
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {partners?.length > 0 && (
        <div>
          <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em',
            color: 'rgba(15,21,35,0.45)', marginBottom: '8px' }}>
            PARTNERS WITH
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {partners.map(p => (
              <Link key={p.id} to={`/org/${p.slug || p.id}`}
                style={{ ...body, fontSize: '14px', color: dark,
                  textDecoration: 'none', padding: '5px 12px',
                  borderRadius: '40px',
                  border: '1px solid rgba(200,146,42,0.25)',
                  background: '#FFFFFF' }}>
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Provenance badge ─────────────────────────────────────────

function ProvenanceBadge({ actor }) {
  let label, hint
  if (actor.seeded_by === 'self') {
    label = 'Self-declared'
    hint = 'Added and managed by the actor.'
  } else if (actor.seeded_by === 'community') {
    label = 'Community-added'
    hint = actor.profile_owner ? 'Added by community, claimed by the actor.' : 'Held in trust by NextUs until claimed.'
  } else if (actor.seeded_by === 'nextus') {
    label = 'Seeded by NextUs'
    hint = actor.profile_owner ? 'Editorially seeded, then claimed.' : 'Editorial seed entry. Held in trust until claimed.'
  } else {
    return null
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px',
      paddingTop: '8px' }}>
      <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.16em',
        color: 'rgba(15,21,35,0.40)', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ color: 'rgba(200,146,42,0.30)', fontSize: '10px' }}>·</span>
      <span style={{ ...body, fontSize: '12px', color: 'rgba(15,21,35,0.40)',
        fontStyle: 'italic' }}>
        {hint}
      </span>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────

export function OrgPublicPage() {
  const { id } = useParams()
  const { user } = useAuth()

  const [actor, setActor]         = useState(null)
  const [links, setLinks]         = useState([])
  const [press, setPress]         = useState([])
  const [offers, setOffers]       = useState([])
  const [needs, setNeeds]         = useState([])
  const [parent, setParent]       = useState(null)
  const [children, setChildren]   = useState([])
  const [partners, setPartners]   = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)

      // Allow slug OR id lookup
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      const actorQuery = supabase.from('nextus_actors').select('*')
      const { data: actor } = isUuid
        ? await actorQuery.eq('id', id).single()
        : await actorQuery.eq('slug', id).single()

      if (!actor) { setLoading(false); return }
      setActor(actor)

      // Parallel load auxiliary data
      const [linksRes, pressRes, offersRes, needsRes, parentRes, childrenRes, partnersRes] = await Promise.all([
        supabase.from('actor_links').select('*').eq('actor_id', actor.id).order('sort_order'),
        supabase.from('actor_press').select('*').eq('actor_id', actor.id).order('sort_order'),
        supabase.from('actor_offers').select('*').eq('actor_id', actor.id).eq('active', true).order('sort_order'),
        supabase.from('actor_needs').select('*').eq('actor_id', actor.id).eq('active', true).order('sort_order'),

        // Parent (single)
        actor.parent_id
          ? supabase.from('nextus_actors').select('id, slug, name').eq('id', actor.parent_id).single()
          : Promise.resolve({ data: null }),

        // Children (where this actor is parent)
        supabase.from('nextus_actors').select('id, slug, name').eq('parent_id', actor.id).eq('status', 'live'),

        // Partners via relationships table
        supabase.from('nextus_relationships')
          .select('related_actor_id, related:related_actor_id(id, slug, name)')
          .eq('actor_id', actor.id)
          .eq('relationship_type', 'partner')
          .eq('status', 'confirmed'),
      ])

      setLinks(linksRes.data || [])
      setPress(pressRes.data || [])
      setOffers(offersRes.data || [])
      setNeeds(needsRes.data || [])
      setParent(parentRes.data || null)
      setChildren(childrenRes.data || [])
      setPartners((partnersRes.data || []).map(r => r.related).filter(Boolean))

      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div style={{ background: parch, minHeight: '100vh' }}>
        <Nav />
        <div style={{ maxWidth: '680px', margin: '0 auto',
          padding: '160px 24px', textAlign: 'center' }}>
          <span style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.40)' }}>
            Loading...
          </span>
        </div>
      </div>
    )
  }

  if (!actor) return <NotFound />

  const isOwner       = user?.id === actor.profile_owner
  const isClaimed     = !!actor.profile_owner
  const primaryDomain = (actor.domains || [])[0] || actor.domain_id || null
  const allDomains    = actor.domains || (actor.domain_id ? [actor.domain_id] : [])

  const score = actor.alignment_score
  const tier  = score == null ? null
    : score >= 9 ? 'exemplar'
    : score >= 7 ? 'qualified'
    : score >= 5 ? 'contested'
    : 'pattern_instance'

  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav />

      <style>{`
        @media (max-width: 640px) {
          .org-public-container { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>

      <div className="org-public-container" style={{
        maxWidth: '680px', margin: '0 auto',
        padding: 'clamp(96px, 12vw, 128px) clamp(20px, 5vw, 48px) 160px',
        position: 'relative',
      }}>

        {/* Share button — top-right corner of the content area */}
        <div style={{ position: 'absolute',
          top: 'clamp(96px, 12vw, 128px)',
          right: 'clamp(20px, 5vw, 48px)',
          zIndex: 2 }}>
          <ShareButton
            url={typeof window !== 'undefined' ? window.location.href : null}
            title={actor.name}
            text={actor.tagline || actor.description}
          />
        </div>

        {/* Claim banner — only on unclaimed wards */}
        <ClaimBanner actor={actor} user={user} />

        {/* Identity strip — always */}
        <IdentityStrip
          actor={actor}
          primaryDomain={primaryDomain}
          principalTier={tier}
          isOwner={isOwner}
        />

        {/* Voice layer — only when claimed */}
        {isClaimed && actor.mission_statement && (
          <>
            <MissionStatement actor={actor} />
            <Rule />
          </>
        )}

        {/* Description (evidence) */}
        {actor.description && (
          <>
            <Description actor={actor} />
            <Rule />
          </>
        )}

        {/* Voice layer — working on now */}
        {isClaimed && actor.working_on_now && (
          <>
            <WorkingOnNow actor={actor} />
            <Rule />
          </>
        )}

        {/* Placement */}
        {allDomains.length > 0 && (
          <>
            <Placement
              domains={allDomains}
              subdomains={actor.subdomains || []}
            />
            <Rule />
          </>
        )}

        {/* Offers & needs */}
        {offers.length > 0 && (
          <>
            <OffersSection offers={offers} />
            <Rule />
          </>
        )}
        {needs.length > 0 && (
          <>
            <NeedsSection needs={needs} />
            <Rule />
          </>
        )}

        {/* Get in touch — contact links (email, contact form, calendly) */}
        {links.some(l => CONTACT_LINK_TYPES.has(l.link_type)) && (
          <>
            <ContactSection links={links} actorName={actor.name} />
            <Rule />
          </>
        )}

        {/* Links */}
        {(links.some(l => !CONTACT_LINK_TYPES.has(l.link_type)) || actor.website) && (
          <>
            <LinksRow links={[
              ...(actor.website && !links.find(l => l.link_type === 'website')
                ? [{ id: 'main-site', link_type: 'website', url: actor.website }]
                : []),
              ...links,
            ]} />
            <Rule />
          </>
        )}

        {/* Press */}
        {press.length > 0 && (
          <>
            <PressStrip press={press} />
            <Rule />
          </>
        )}

        {/* Relationships */}
        {(parent || children.length > 0 || partners.length > 0) && (
          <>
            <RelationshipsSection
              parent={parent}
              children={children}
              partners={partners}
            />
            <Rule />
          </>
        )}

        {/* Provenance */}
        <ProvenanceBadge actor={actor} />

      </div>

      <SiteFooter />
    </div>
  )
}
