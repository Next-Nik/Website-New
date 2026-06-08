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
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'
import {
  body, serif, sc, gold, dark, parch,
  DOMAIN_LABEL, SCALE_LABEL,
  PLACEMENT_TIER,
} from '../components/OrgShared'
import { DOMAIN_COLORS } from '../constants/domains'
import { ShareButton } from '../components/ShareButton'
import { WatchButton } from '../components/WatchButton'
import { MessageButton } from '../components/MessageButton'
import { EventsSection } from '../components/EventsSection'

// ── Design utilities ─────────────────────────────────────────

function Eyebrow({ children, style = {} }) {
  return (
    <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.22em',
      color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase',
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
        <p style={{ ...body, fontSize: '17px', fontWeight: 400,
          color: 'rgba(15,21,35,0.55)', lineHeight: 1.75 }}>
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

// ── Accepting-status, membership-status, and mode labels ─────

const ACCEPTING_STATUS_LABEL = {
  yes:      { label: 'Accepting clients',     color: '#2A6B3A', bg: 'rgba(42,107,58,0.08)',  border: 'rgba(42,107,58,0.25)' },
  waitlist: { label: 'Waitlist',              color: '#A8721A', bg: 'rgba(168,114,26,0.08)', border: 'rgba(168,114,26,0.25)' },
  not_now:  { label: 'Not accepting now',     color: 'rgba(15,21,35,0.55)', bg: 'rgba(15,21,35,0.55)', border: 'rgba(15,21,35,0.55)' },
}

const MEMBERSHIP_STATUS_LABEL = {
  open:                 'Open membership',
  application_required: 'By application',
  invite_only:          'Invite only',
  closed:               'Closed',
  not_applicable:       null,  // never render
}

// Mode-aware section ordering. Default order applies when actor_mode is NULL
// or when the mode doesn't change order materially. 'practice' foregrounds
// offerings (programmes / retreats) earlier in the page.
const MODE_PROFILE_ORDER = {
  practice:   ['identity', 'mission', 'story', 'description', 'placement', 'offers', 'testimonials', 'credentials', 'working_on', 'needs', 'events', 'contact', 'links', 'press', 'relationships', 'provenance'],
  enterprise: ['identity', 'mission', 'description', 'story', 'working_on', 'placement', 'offers', 'needs', 'credentials', 'testimonials', 'events', 'contact', 'links', 'press', 'relationships', 'provenance'],
  platform:   ['identity', 'mission', 'description', 'story', 'working_on', 'placement', 'offers', 'credentials', 'testimonials', 'needs', 'events', 'contact', 'links', 'press', 'relationships', 'provenance'],
  collective: ['identity', 'mission', 'description', 'story', 'placement', 'working_on', 'needs', 'offers', 'testimonials', 'credentials', 'events', 'contact', 'links', 'press', 'relationships', 'provenance'],
  mixed:      ['identity', 'mission', 'description', 'story', 'placement', 'offers', 'testimonials', 'credentials', 'working_on', 'needs', 'events', 'contact', 'links', 'press', 'relationships', 'provenance'],
  // default (NULL mode) — close to the original OrgPublic order
  default:    ['identity', 'mission', 'description', 'working_on', 'placement', 'offers', 'needs', 'story', 'testimonials', 'credentials', 'events', 'contact', 'links', 'press', 'relationships', 'provenance'],
}

function getSectionOrder(actorMode) {
  return MODE_PROFILE_ORDER[actorMode] || MODE_PROFILE_ORDER.default
}

// ── Identity strip ───────────────────────────────────────────

function IdentityStrip({ actor, primaryDomain, principalTier, isOwner }) {
  const domainColor = DOMAIN_COLORS[primaryDomain] || gold
  const tierConfig  = PLACEMENT_TIER?.[principalTier]

  return (
    <div style={{ marginBottom: '52px' }}>
      <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start',
        flexWrap: 'wrap' }}>

        {/* Image — double gold border, matched to the Work With Nik treatment.
            Tight gold inner border + softer gold outline floating 5px out.
            Signals "NextUs profile" at a glance. Portrait fit (`cover` + top
            alignment) for practitioners; contain fit with breathing room for
            logos and other org imagery. */}
        {actor.image_url && (() => {
          const isPortrait = actor.type === 'practitioner'
          return (
            <div className="org-identity-photo-wrap" style={{ flexShrink: 0, padding: '6px' }}>
              <div className="org-identity-photo-frame" style={{
                width: '160px', height: '160px',
                borderRadius: '4px', overflow: 'hidden',
                border: '1.5px solid rgba(200,146,42,0.70)',
                outline: '1px solid rgba(200,146,42,0.35)',
                outlineOffset: '5px',
                background: isPortrait
                  ? 'rgba(200,146,42,0.05)'
                  : '#FDFCF8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: isPortrait ? 0 : '16px',
                boxSizing: 'border-box',
              }}>
                <img src={actor.image_url} alt={actor.name}
                  style={{
                    width: '100%', height: '100%',
                    objectFit: isPortrait ? 'cover' : 'contain',
                    objectPosition: isPortrait ? 'center top' : 'center',
                    display: 'block',
                  }} />
              </div>
            </div>
          )
        })()}

        {/* Identity content */}
        <div style={{ flex: 1, minWidth: '260px' }}>

          {/* Domain + scale eyebrow */}
          {primaryDomain && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px',
              marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ width: '9px', height: '9px', borderRadius: '50%',
                background: domainColor, flexShrink: 0 }} />
              <span style={{ ...sc, fontSize: '13px', fontWeight: 600,
                letterSpacing: '0.18em',
                color: 'rgba(15,21,35,0.72)', textTransform: 'uppercase' }}>
                {DOMAIN_LABEL[primaryDomain] || primaryDomain}
              </span>
              {actor.scale && (
                <>
                  <span style={{ color: 'rgba(200,146,42,0.45)', fontSize: '13px' }}>·</span>
                  <span style={{ ...sc, fontSize: '13px', fontWeight: 600,
                    letterSpacing: '0.16em',
                    color: 'rgba(15,21,35,0.65)', textTransform: 'uppercase' }}>
                    {SCALE_LABEL?.[actor.scale] || actor.scale}
                  </span>
                </>
              )}
              {actor.type && (
                <>
                  <span style={{ color: 'rgba(200,146,42,0.45)', fontSize: '13px' }}>·</span>
                  <span style={{ ...sc, fontSize: '13px', fontWeight: 600,
                    letterSpacing: '0.16em',
                    color: 'rgba(15,21,35,0.65)', textTransform: 'uppercase' }}>
                    {actor.type.charAt(0).toUpperCase() + actor.type.slice(1)}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Name */}
          <h1 style={{ ...serif, fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 300,
            color: dark, lineHeight: 1.06, letterSpacing: '-0.012em',
            margin: '0 0 14px' }}>
            {actor.name}
          </h1>

          {/* Tagline */}
          {actor.tagline && (
            <p style={{ ...body, fontSize: '20px', fontWeight: 400,
              color: 'rgba(15,21,35,0.82)',
              lineHeight: 1.45, margin: '0 0 22px' }}>
              {actor.tagline}
            </p>
          )}

          {/* Stub-state description — folded into identity strip when the actor
              has no full story yet. Gives a thin profile real substance up top
              instead of dropping the description into its own thin section
              below. Skipped when a story exists (Story carries the narrative). */}
          {actor.description && !actor.story && (
            <p style={{ ...body, fontSize: '17px', fontWeight: 400,
              color: 'rgba(15,21,35,0.78)',
              lineHeight: 1.55, margin: '0 0 22px', maxWidth: '620px',
              whiteSpace: 'pre-wrap' }}>
              {actor.description}
            </p>
          )}

          {/* Location */}
          {actor.location_name && (
            <div style={{ ...sc, fontSize: '13px', fontWeight: 600,
              letterSpacing: '0.16em',
              color: 'rgba(15,21,35,0.65)', marginBottom: '14px',
              textTransform: 'uppercase' }}>
              {actor.location_name}
            </div>
          )}

          {/* Founder of NextUs — admin-set badge, small and plain */}
          {actor.is_platform_founder && (
            <div style={{ ...sc, fontSize: '13px', fontWeight: 600,
              letterSpacing: '0.16em',
              color: '#A8721A', marginBottom: '18px',
              textTransform: 'uppercase' }}>
              Founder of NextUs
            </div>
          )}

          {/* Accepting status — practitioner-facing signal */}
          {actor.accepting_status && ACCEPTING_STATUS_LABEL[actor.accepting_status] && (() => {
            const cfg = ACCEPTING_STATUS_LABEL[actor.accepting_status]
            return (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '5px 12px', background: cfg.bg,
                border: `1px solid ${cfg.border}`, borderRadius: '4px',
                marginBottom: '12px', marginRight: '8px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%',
                  background: cfg.color, display: 'inline-block' }} />
                <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em',
                  color: cfg.color, textTransform: 'uppercase' }}>
                  {cfg.label}
                </span>
              </div>
            )
          })()}

          {/* Membership status — groups, places, programmes */}
          {actor.membership_status && MEMBERSHIP_STATUS_LABEL[actor.membership_status] && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '5px 12px', background: 'rgba(42,74,138,0.06)',
              border: '1px solid rgba(42,74,138,0.20)', borderRadius: '4px',
              marginBottom: '12px' }}>
              <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em',
                color: '#2A4A8A', textTransform: 'uppercase' }}>
                {MEMBERSHIP_STATUS_LABEL[actor.membership_status]}
              </span>
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

  // Provenance — two honest states for an unclaimed live entry:
  //   - nominated by someone, then approved/seeded by NextUs
  //   - seeded directly by NextUs (no nominator on record)
  const wasNominated = Boolean(actor.nominator_name || actor.nominator_email)
  const provenance   = wasNominated
    ? 'Nominated by the community · Seeded by NextUs'
    : 'Seeded by NextUs'

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
            lineHeight: 1.6, margin: '0 0 8px' }}>
            NextUs holds this profile in trust until claimed.
            {actor.name === 'NextUs' ? '' : ` Is this you? Claim ${actor.name} to add your voice.`}
          </p>
          <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em',
            color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase' }}>
            {provenance}
          </div>
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
      <p style={{ ...serif, fontSize: '22px', color: dark, lineHeight: 1.4,
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
//
// Description text is now rendered inside the identity strip (for stub-state
// actors with no full story) — that gives thin profiles real substance up top
// instead of leaving the description floating in its own section. When a full
// story IS present, the Story section ("The work") carries the narrative.
//
// Either way, this standalone About section no longer renders. Kept as a stub
// component because the section registry references it; returning null is the
// signal to skip.

function Description({ actor }) {
  return null
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
            <span key={s} style={{ ...body, fontSize: '13px',
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

function OffersSection({ offers, actor, currentUser }) {
  if (!offers?.length) return null
  return (
    <div>
      <Eyebrow>What they offer</Eyebrow>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {offers.map(offer => (
          <OfferOrNeedCard key={offer.id} item={offer} kind="offer"
            actor={actor} currentUser={currentUser} />
        ))}
      </div>
    </div>
  )
}

// ── Needs section ────────────────────────────────────────────

function NeedsSection({ needs, actor, currentUser }) {
  if (!needs?.length) return null
  return (
    <div>
      <Eyebrow>What they need</Eyebrow>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {needs.map(need => (
          <OfferOrNeedCard key={need.id} item={need} kind="need"
            actor={actor} currentUser={currentUser} />
        ))}
      </div>
    </div>
  )
}

// ── Offer or Need card ───────────────────────────────────────

const TIMING_LABELS = {
  flexible: null,                              // don't render the chip if flexible
  ongoing:  'Ongoing',
  one_time: 'One-time',
  by_date:  null,                              // rendered with the date if present
}
const EXCHANGE_LABELS = {
  not_applicable: null,
  paid:           'Paid',
  unpaid:         'Unpaid',
  volunteer:      'Volunteer',
  barter:         'Barter',
  mutual:         'Mutual',
}
const URGENCY_LABELS = {
  low:    null,
  medium: 'Medium priority',
  high:   'Urgent',
}
const FORMAT_LABELS = {
  service:       'Service',
  consultation:  'Consultation',
  asset:         'Asset',
  introduction:  'Introduction',
  mentorship:    'Mentorship',
  collaboration: 'Collaboration',
  other:         'Other',
}

function OfferOrNeedCard({ item, kind, actor, currentUser }) {
  const accent       = kind === 'offer' ? '#2A6B3A' : '#2A4A8A'
  const accentBg     = kind === 'offer' ? 'rgba(42,107,58,0.04)' : 'rgba(42,74,138,0.04)'
  const accentBorder = kind === 'offer' ? 'rgba(42,107,58,0.20)' : 'rgba(42,74,138,0.20)'

  // Pull-tab interest state
  const [interestCount, setInterestCount] = useState(item.interest_count ?? 0)
  const [imInterested, setImInterested]   = useState(false)
  const [interestLoading, setInterestLoading] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const navigate = useNavigate()

  // On mount, load my interest state if signed in
  useEffect(() => {
    if (!currentUser) return
    let alive = true
    ;(async () => {
      const { data } = await supabase.rpc('interest_count', {
        p_target_type: kind, p_target_id: item.id,
      })
      if (alive && data && data[0]) {
        setInterestCount(Number(data[0].count) || 0)
        setImInterested(!!data[0].mine)
      }
    })()
    return () => { alive = false }
  }, [item.id, kind, currentUser])

  async function togglePull() {
    if (!currentUser) {
      navigate('/login', { state: { from: window.location.pathname } })
      return
    }
    setInterestLoading(true)
    try {
      const { data } = imInterested
        ? await supabase.rpc('release_interest', { p_target_type: kind, p_target_id: item.id })
        : await supabase.rpc('pull_interest',    { p_target_type: kind, p_target_id: item.id })
      if (data && data[0]) {
        setInterestCount(Number(data[0].count) || 0)
        setImInterested(!!data[0].pulled)
      }
    } finally {
      setInterestLoading(false)
    }
  }

  // Build the chips row
  let locationLabel = null
  if (item.location_mode === 'local_only') locationLabel = 'Local only'
  else if (item.location_mode === 'specific') locationLabel = item.location_specifics || 'Specific places'
  // Scale chip — show target focus name if any
  const scaleLabel = item.target_focus?.name
  // Timing chip
  let timingLabel = TIMING_LABELS[item.timing] || null
  if (item.timing === 'by_date' && item.timing_date) {
    const d = new Date(item.timing_date)
    timingLabel = `By ${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`
  }
  const exchangeLabel = EXCHANGE_LABELS[item.exchange_type]
  const urgencyLabel  = URGENCY_LABELS[item.urgency]
  const formatLabel   = FORMAT_LABELS[item.format]
  const compRange     = item.exchange_type === 'paid' && item.compensation_range

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

      {item.why && (
        <div style={{ background: accentBg, padding: '10px 14px',
          borderRadius: '8px', marginBottom: '12px',
          borderLeft: `2px solid ${accent}` }}>
          <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.18em',
            color: accent, marginBottom: '4px', textTransform: 'uppercase' }}>
            Why
          </div>
          <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.72)',
            lineHeight: 1.55, margin: 0, fontStyle: 'italic' }}>
            {item.why}
          </p>
        </div>
      )}

      {/* Chip row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px',
        alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.12em',
          color: accent, background: accentBg,
          border: `1px solid ${accentBorder}`,
          padding: '2px 9px', borderRadius: '40px',
          textTransform: 'uppercase' }}>
          {kind === 'offer' ? 'Offer' : 'Need'}
        </span>
        {scaleLabel && (
          <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.08em',
            color: 'rgba(15,21,35,0.65)', background: 'rgba(200,146,42,0.05)',
            border: '1px solid rgba(200,146,42,0.25)',
            padding: '2px 9px', borderRadius: '40px' }}>
            Scale: {scaleLabel}
          </span>
        )}
        {locationLabel && !scaleLabel && (
          <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.08em',
            color: 'rgba(15,21,35,0.55)',
            border: '1px solid rgba(200,146,42,0.20)',
            padding: '2px 9px', borderRadius: '40px' }}>
            {locationLabel}
          </span>
        )}
        {timingLabel && (
          <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.08em',
            color: 'rgba(15,21,35,0.55)',
            border: '1px solid rgba(200,146,42,0.20)',
            padding: '2px 9px', borderRadius: '40px' }}>
            {timingLabel}
          </span>
        )}
        {exchangeLabel && (
          <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.08em',
            color: accent,
            border: `1px solid ${accentBorder}`,
            padding: '2px 9px', borderRadius: '40px' }}>
            {exchangeLabel}{compRange ? ` · ${compRange}` : ''}
          </span>
        )}
        {formatLabel && (
          <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.08em',
            color: 'rgba(15,21,35,0.55)',
            border: '1px solid rgba(200,146,42,0.20)',
            padding: '2px 9px', borderRadius: '40px' }}>
            {formatLabel}
          </span>
        )}
        {urgencyLabel && (
          <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.10em',
            color: item.urgency === 'high' ? '#8A3030' : '#A8721A',
            background: item.urgency === 'high' ? 'rgba(138,48,48,0.05)' : 'rgba(200,146,42,0.06)',
            border: item.urgency === 'high' ? '1px solid rgba(138,48,48,0.30)' : `1px solid ${accentBorder}`,
            padding: '2px 9px', borderRadius: '40px',
            textTransform: 'uppercase' }}>
            {urgencyLabel}
          </span>
        )}
      </div>

      {/* Action row — Interested + Reach out */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center',
        paddingTop: '10px', borderTop: '1px solid rgba(200,146,42,0.10)' }}>
        <button
          onClick={togglePull}
          disabled={interestLoading}
          title={imInterested ? "You've expressed interest" : 'Pull a tab — express interest'}
          style={{
            ...sc, fontSize: '11px', letterSpacing: '0.10em',
            padding: '7px 14px', borderRadius: '40px',
            border: imInterested ? `1.5px solid ${accent}` : '1.5px solid rgba(200,146,42,0.25)',
            background: imInterested ? `${accent}10` : 'transparent',
            color: imInterested ? accent : 'rgba(15,21,35,0.65)',
            cursor: interestLoading ? 'wait' : 'pointer',
            transition: 'all 0.15s ease',
          }}>
          {imInterested ? '✓ Interested' : 'Interested'}
          {interestCount > 0 && (
            <span style={{ marginLeft: '6px', opacity: 0.6, fontSize: '10px' }}>
              · {interestCount}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            if (!currentUser) {
              navigate('/login', { state: { from: window.location.pathname } })
              return
            }
            if (!actor?.profile_owner) return
            setComposeOpen(true)
          }}
          disabled={!actor?.profile_owner}
          title={!actor?.profile_owner
            ? 'This profile has not been claimed yet — see contact links above'
            : `Reach out about this ${kind}`}
          style={{
            ...sc, fontSize: '11px', letterSpacing: '0.10em',
            padding: '7px 14px', borderRadius: '40px',
            border: 'none',
            background: !actor?.profile_owner ? 'rgba(200,146,42,0.20)' : accent,
            color: '#FFFFFF',
            cursor: !actor?.profile_owner ? 'not-allowed' : 'pointer',
          }}>
          Reach out
        </button>
      </div>

      {composeOpen && actor?.profile_owner && (
        <OfferNeedCompose
          item={item}
          kind={kind}
          actor={actor}
          currentUser={currentUser}
          onClose={() => setComposeOpen(false)}
        />
      )}
    </div>
  )
}

// ── Compose surface that carries the offer/need reference ────
// Lightweight version of ComposeMessage that pre-fills the body
// and stores the reference_type/reference_id on the message.

function OfferNeedCompose({ item, kind, actor, currentUser, onClose }) {
  const [body_text, setBody] = useState(`Re: ${item.title}\n\n`)
  const [sending, setSending] = useState(false)
  const [error, setError]     = useState(null)
  const [inboxes, setInboxes] = useState([{ id: 'personal', name: 'Personal', actorId: null }])
  const [senderInboxId, setSenderInboxId] = useState('personal')

  useEffect(() => {
    async function loadInboxes() {
      if (!currentUser) return
      const { data: owned } = await supabase.from('nextus_actors')
        .select('id, name, type')
        .eq('profile_owner', currentUser.id)
      const list = [{ id: 'personal', name: 'Personal', actorId: null }]
      for (const a of (owned || [])) {
        list.push({ id: a.id, name: a.name, actorId: a.id, actorType: a.type })
      }
      setInboxes(list)
    }
    loadInboxes()
  }, [currentUser])

  async function handleSend() {
    if (!body_text.trim() || sending) return
    setSending(true); setError(null)
    try {
      const senderInbox = inboxes.find(i => i.id === senderInboxId)
      const { error: sendError } = await supabase.rpc('send_message', {
        p_recipient_user_id:  null,
        p_recipient_actor_id: actor.id,
        p_body:               body_text.trim(),
        p_sender_actor_id:    senderInbox?.actorId || null,
      })
      if (sendError) throw sendError
      // Attach the reference — we need a follow-up update because send_message
      // doesn't take reference params. Simplest path: update the latest message
      // we just sent. (Better long-term: extend send_message to accept reference.)
      // For now we accept the message is sent without explicit reference; the
      // body contains "Re: <title>" which gives the context.
      onClose()
    } catch (e) {
      setError(e?.message || 'Send failed.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(15,21,35,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }} onClick={onClose}>
      <div style={{
        background: '#FAFAF7', borderRadius: '14px',
        maxWidth: '520px', width: '100%', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(15,21,35,0.30)',
        overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ padding: '18px 22px',
          borderBottom: '1px solid rgba(200,146,42,0.20)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.18em',
              color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase' }}>
              Reach out about
            </div>
            <h3 style={{ ...body, fontSize: '16px', color: dark,
              margin: '2px 0 0', fontWeight: 400 }}>
              {item.title}
            </h3>
          </div>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '22px',
              color: 'rgba(15,21,35,0.55)', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>
          {inboxes.length > 1 && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ ...sc, fontSize: '10px', letterSpacing: '0.18em',
                color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase',
                display: 'block', marginBottom: '6px' }}>
                Sending as
              </label>
              <select value={senderInboxId}
                onChange={e => setSenderInboxId(e.target.value)}
                style={{ ...body, width: '100%', padding: '10px 14px',
                  border: '1.5px solid rgba(200,146,42,0.20)',
                  borderRadius: '8px', background: '#FFFFFF',
                  fontSize: '14px', color: dark, outline: 'none', cursor: 'pointer' }}>
                {inboxes.map(ibx => (
                  <option key={ibx.id} value={ibx.id}>{ibx.name}</option>
                ))}
              </select>
            </div>
          )}

          <textarea
            value={body_text}
            onChange={e => setBody(e.target.value)}
            rows={8}
            placeholder="Tell them why you're reaching out..."
            style={{ ...body, width: '100%', padding: '12px 14px',
              border: '1.5px solid rgba(200,146,42,0.20)',
              borderRadius: '8px', background: '#FFFFFF',
              fontSize: '14px', color: dark, outline: 'none',
              resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.55 }}
          />

          {error && (
            <div style={{ background: 'rgba(138,48,48,0.06)',
              border: '1px solid rgba(138,48,48,0.25)',
              padding: '10px 14px', borderRadius: '8px',
              ...body, fontSize: '13px', color: '#8A3030',
              marginTop: '12px' }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ padding: '14px 22px',
          borderTop: '1px solid rgba(200,146,42,0.20)',
          display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose}
            style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em',
              padding: '10px 18px', borderRadius: '40px',
              background: 'none', border: '1px solid rgba(200,146,42,0.20)',
              color: 'rgba(15,21,35,0.55)', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSend}
            disabled={!body_text.trim() || sending}
            style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em',
              padding: '10px 20px', borderRadius: '40px', border: 'none',
              background: !body_text.trim() || sending ? 'rgba(200,146,42,0.30)' : '#C8922A',
              color: '#FFFFFF',
              cursor: !body_text.trim() || sending ? 'not-allowed' : 'pointer' }}>
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
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
            color: 'rgba(15,21,35,0.55)', marginBottom: '6px' }}>
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
            color: 'rgba(15,21,35,0.55)', marginBottom: '8px' }}>
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
            color: 'rgba(15,21,35,0.55)', marginBottom: '8px' }}>
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
    hint = actor.profile_owner
      ? 'Added by the community. Claimed and managed by the actor.'
      : 'Held in trust by NextUs until the owner claims and adds depth.'
  } else if (actor.seeded_by === 'nextus') {
    label = 'Seeded by NextUs'
    hint = actor.profile_owner
      ? 'Seeded by NextUs. Claimed and managed by the actor.'
      : 'Held in trust by NextUs until the owner claims and adds depth.'
  } else {
    return null
  }

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px',
      paddingTop: '8px', flexWrap: 'wrap' }}>
      <span style={{ ...sc, fontSize: '12px', fontWeight: 600,
        letterSpacing: '0.16em',
        color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ color: 'rgba(200,146,42,0.40)', fontSize: '12px' }}>·</span>
      <span style={{ ...body, fontSize: '14px', fontWeight: 400,
        color: 'rgba(15,21,35,0.62)', lineHeight: 1.5 }}>
        {hint}
      </span>
    </div>
  )
}

// ── Story — long-form narrative ──────────────────────────────

function StorySection({ actor }) {
  if (!actor.story) return null
  // Split paragraphs on blank lines to render naturally
  const paragraphs = actor.story.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  return (
    <div>
      <Eyebrow>The work</Eyebrow>
      {paragraphs.map((para, i) => (
        <p key={i} style={{ ...body, fontSize: '18px', fontWeight: 400,
          color: dark, lineHeight: 1.55, marginBottom: '20px',
          maxWidth: '620px' }}>
          {para}
        </p>
      ))}
    </div>
  )
}

// ── Credentials — grouped by kind ────────────────────────────

const CREDENTIAL_KIND_LABEL = {
  training:      'Training',
  certification: 'Certifications',
  membership:    'Memberships',
  license:       'Licenses',
  award:         'Awards',
  lineage:       'Lineage',
}

// Display order for credential groups
const CREDENTIAL_KIND_ORDER = ['training', 'lineage', 'certification', 'license', 'membership', 'award']

function CredentialsSection({ credentials }) {
  if (!credentials || credentials.length === 0) return null

  // Group by kind
  const grouped = {}
  credentials.forEach(c => {
    if (!grouped[c.kind]) grouped[c.kind] = []
    grouped[c.kind].push(c)
  })

  // Order the groups
  const orderedKinds = CREDENTIAL_KIND_ORDER.filter(k => grouped[k])

  return (
    <div>
      <Eyebrow>Background</Eyebrow>
      {orderedKinds.map(kind => (
        <div key={kind} style={{ marginBottom: '32px' }}>
          <h3 style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em',
            color: gold, textTransform: 'uppercase', marginBottom: '14px',
            fontWeight: 500 }}>
            {CREDENTIAL_KIND_LABEL[kind] || kind}
          </h3>
          <div style={{ display: 'grid', gap: '14px' }}>
            {grouped[kind].map(c => (
              <div key={c.id} style={{
                borderLeft: '2px solid rgba(200,146,42,0.20)',
                paddingLeft: '18px' }}>
                <div style={{ ...body, fontSize: '16px',
                  color: dark, lineHeight: 1.4, marginBottom: '3px' }}>
                  {c.url ? (
                    <a href={c.url} target="_blank" rel="noopener"
                       style={{ color: dark, textDecoration: 'none',
                         borderBottom: '1px solid rgba(200,146,42,0.30)' }}>
                      {c.title}
                    </a>
                  ) : c.title}
                </div>
                {(c.institution || c.year) && (
                  <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em',
                    color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase' }}>
                    {c.institution}
                    {c.institution && c.year && ' · '}
                    {c.year}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Testimonials ─────────────────────────────────────────────

function TestimonialsSection({ testimonials, actorMode }) {
  if (!testimonials || testimonials.length === 0) return null

  // Featured first, then sort_order
  const sorted = [...testimonials].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1
    return (a.sort_order || 0) - (b.sort_order || 0)
  })

  // Mode-aware section heading
  const heading = actorMode === 'practice'
    ? 'Participants say'
    : actorMode === 'enterprise'
      ? 'What customers and partners say'
      : 'What people say'

  return (
    <div>
      <Eyebrow>{heading}</Eyebrow>
      {sorted.map(t => (
        <div key={t.id} style={{
          borderLeft: '2px solid rgba(200,146,42,0.20)',
          paddingLeft: '24px',
          marginBottom: '32px',
          maxWidth: '620px' }}>
          <p style={{ ...body, fontSize: '17px', fontStyle: 'italic',
            color: dark, lineHeight: 1.55, marginBottom: '14px',
            fontWeight: 400 }}>
            "{t.quote}"
          </p>
          {(t.attribution || t.context) && (
            <div>
              {t.attribution && (
                <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em',
                  color: gold, textTransform: 'uppercase' }}>
                  — {t.attribution}
                </span>
              )}
              {t.context && (
                <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em',
                  color: 'rgba(15,21,35,0.55)', marginLeft: '10px' }}>
                  {t.context}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Bridge to developmental profile — REMOVED ────────────────
//
// The practitioner page no longer advertises a public link to the owner's
// developmental profile. Developmental profiles are intimate work, private
// by default (migration 068). Broadcasting their existence on a public
// practitioner page conflates two surfaces the platform deliberately keeps
// separate.
//
// The schema column `show_developmental_link` is left in place to avoid a
// breaking migration, but nothing reads it anymore. The checkbox is also
// removed from OrgManage.

// ── Main page ────────────────────────────────────────────────

export function OrgPublicPage() {
  // Route is /org/:slug (App.jsx line 230). Accept both `slug` (canonical) and
  // `id` (legacy / fallback for any route still using ':id') so the RPC always
  // gets a non-empty identifier. Without this, direct URL visits to /org/<slug>
  // produced an undefined identifier → empty RPC result → NotFound.
  const params = useParams()
  const idOrSlug = params.slug || params.id

  const { user } = useAuth()

  const [actor, setActor]         = useState(null)
  const [links, setLinks]         = useState([])
  const [press, setPress]         = useState([])
  const [offers, setOffers]       = useState([])
  const [needs, setNeeds]         = useState([])
  const [parent, setParent]       = useState(null)
  const [children, setChildren]   = useState([])
  const [partners, setPartners]   = useState([])
  const [credentials, setCredentials]   = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)

      // Use the privacy-locked RPC so people_in_the_work is stripped for
      // non-owners. The owner reading their own profile gets the field
      // populated; everyone else sees null. The function accepts either
      // a UUID or a slug.
      const { data: actorRows } = await supabase
        .rpc('get_actor_public', { p_actor_id_or_slug: idOrSlug })

      const actor = Array.isArray(actorRows) ? actorRows[0] : actorRows

      if (!actor) { setLoading(false); return }
      setActor(actor)

      // Parallel load auxiliary data
      const [linksRes, pressRes, offersRes, needsRes, parentRes, childrenRes, partnersRes, credentialsRes, testimonialsRes] = await Promise.all([
        supabase.from('actor_links').select('*').eq('actor_id', actor.id).order('sort_order'),
        supabase.from('actor_press').select('*').eq('actor_id', actor.id).order('sort_order'),
        supabase.from('actor_offers').select('*, target_focus:target_focus_id(id, name, type)').eq('actor_id', actor.id).eq('active', true).order('sort_order'),
        supabase.from('actor_needs').select('*, target_focus:target_focus_id(id, name, type)').eq('actor_id', actor.id).eq('active', true).order('sort_order'),

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

        // Credentials
        supabase.from('actor_credentials').select('*').eq('actor_id', actor.id).order('sort_order'),

        // Testimonials — public read policy restricts to active=true
        supabase.from('actor_testimonials').select('*').eq('actor_id', actor.id).eq('active', true).order('sort_order'),
      ])

      setLinks(linksRes.data || [])
      setPress(pressRes.data || [])
      setOffers(offersRes.data || [])
      setNeeds(needsRes.data || [])
      setParent(parentRes.data || null)
      setChildren(childrenRes.data || [])
      setPartners((partnersRes.data || []).map(r => r.related).filter(Boolean))
      setCredentials(credentialsRes.data || [])
      setTestimonials(testimonialsRes.data || [])

      setLoading(false)
    }
    load()
  }, [idOrSlug])

  if (loading) {
    return (
      <div style={{ background: parch, minHeight: '100vh' }}>
        <Nav />
        <div style={{ maxWidth: '680px', margin: '0 auto',
          padding: '160px 24px', textAlign: 'center' }}>
          <span style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)' }}>
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

  // Mode-aware section ordering. 'identity' is always first; everything
  // else respects MODE_PROFILE_ORDER for the actor's mode.
  const sectionOrder = getSectionOrder(actor.actor_mode)

  // Render registry — each key maps to a render function returning a node
  // (or null). The map is consulted in sectionOrder.
  const sectionRenderers = {
    identity: () => (
      <IdentityStrip
        actor={actor}
        primaryDomain={primaryDomain}
        principalTier={tier}
        isOwner={isOwner}
      />
    ),
    mission: () => (
      isClaimed && actor.mission_statement
        ? <MissionStatement actor={actor} />
        : null
    ),
    description: () => (
      actor.description ? <Description actor={actor} /> : null
    ),
    story: () => (
      actor.story ? <StorySection actor={actor} /> : null
    ),
    working_on: () => (
      isClaimed && actor.working_on_now ? <WorkingOnNow actor={actor} /> : null
    ),
    placement: () => (
      allDomains.length > 0
        ? <Placement domains={allDomains} subdomains={actor.subdomains || []} />
        : null
    ),
    offers: () => (
      offers.length > 0
        ? <OffersSection offers={offers} actor={actor} currentUser={user} />
        : null
    ),
    needs: () => (
      needs.length > 0
        ? <NeedsSection needs={needs} actor={actor} currentUser={user} />
        : null
    ),
    credentials: () => (
      credentials.length > 0
        ? <CredentialsSection credentials={credentials} />
        : null
    ),
    testimonials: () => (
      testimonials.length > 0
        ? <TestimonialsSection testimonials={testimonials} actorMode={actor.actor_mode} />
        : null
    ),
    events: () => (
      <EventsSection actor={actor} isOwner={isOwner} />
    ),
    contact: () => (
      links.some(l => CONTACT_LINK_TYPES.has(l.link_type))
        ? <ContactSection links={links} actorName={actor.name} />
        : null
    ),
    links: () => {
      const hasLinks = links.some(l => !CONTACT_LINK_TYPES.has(l.link_type)) || actor.website
      if (!hasLinks) return null
      return (
        <LinksRow links={[
          ...(actor.website && !links.find(l => l.link_type === 'website')
            ? [{ id: 'main-site', link_type: 'website', url: actor.website }]
            : []),
          ...links,
        ]} />
      )
    },
    press: () => (
      press.length > 0 ? <PressStrip press={press} /> : null
    ),
    relationships: () => (
      (parent || children.length > 0 || partners.length > 0)
        ? <RelationshipsSection parent={parent} children={children} partners={partners} />
        : null
    ),
    provenance: () => (
      <ProvenanceBadge actor={actor} />
    ),
  }

  // Sections that should NOT be followed by a Rule (visual separator):
  // - identity (always first, the rule comes after it from the next section)
  // - events (has its own internal chrome)
  // - provenance (last, no trailing rule)
  const SECTIONS_WITHOUT_TRAILING_RULE = new Set(['events', 'provenance'])

  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav />

      <style>{`
        @media (max-width: 640px) {
          .org-public-container { padding-left: 20px !important; padding-right: 20px !important; }
          .org-identity-photo-frame { width: 128px !important; height: 128px !important; }
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

        {/* Render sections in mode-determined order. Skip nulls. Each section
            is followed by a Rule (visual divider) except for the sections in
            SECTIONS_WITHOUT_TRAILING_RULE. This matches the original page's
            pattern of trailing-rules-only. */}
        {(() => {
          const rendered = []
          for (const key of sectionOrder) {
            const node = sectionRenderers[key]?.()
            if (node == null) continue
            const needsTrailingRule = !SECTIONS_WITHOUT_TRAILING_RULE.has(key)
            rendered.push(
              <div key={key}>
                {node}
                {needsTrailingRule && <Rule />}
              </div>
            )
          }
          return rendered
        })()}

      </div>

      <SiteFooter />
    </div>
  )
}
