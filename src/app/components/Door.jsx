// src/app/components/Door.jsx
//
// "Every story ends in a door." — the law made real. A page a stranger
// lands on from outreach (an actor page, a challenge page) never renders
// without a clear next action. This component is placed ONCE per page and
// picks its target by claim state:
//
//   Pre-claim  (owner fields locked) — the door points outward to the
//              domain: "See who else is working on {domain}" → the
//              constellation, or the domain trail.
//   Post-claim — the door sharpens to the actor's own asks (actor_calls,
//              rendered in the "Challenges & asks" section on the same
//              page — reached by the #asks anchor) with the domain kept
//              as a quiet secondary door.
//
// Presentational + a little routing logic. No data fetching, no writes,
// no owner-only fields. It never renders a dead end: if it can compute
// nothing else, it points at the live challenges index.
//
// Rail-aware via `tone`: 'dark' = The Atlas (actor/challenge pages, the
// default), 'light' = Field Notes. Colours come from designTokens only —
// no hardcoded hex, no heritage gold.

import { Link } from 'react-router-dom'
import { fn, at, space } from '../../lib/designTokens'

const serif = { fontFamily: "'Fraunces', Georgia, serif" }
const body  = { fontFamily: "'Newsreader', Georgia, serif" }
const mono  = { fontFamily: "'IBM Plex Mono', 'Courier New', monospace" }

// ── Target logic — the one place claim state decides the door ──────────
export function computeDoors({ isClaimed, actorName, calls = [], domainSlug, domainLabel }) {
  const doors = []
  const dLabel = domainLabel || 'this domain'
  const name   = actorName || 'they'

  const challenge = (calls || []).find(c => c.type === 'challenge' && c.slug)
  const hasAsks   = (calls || []).length > 0

  if (isClaimed && hasAsks) {
    // Sharpen to the actor's own asks.
    if (challenge) {
      doors.push({ to: `/stretch/c/${challenge.slug}`, label: `Take this on · ${challenge.title}`, primary: true })
    } else {
      doors.push({ href: '#asks', label: `See what ${name} is asking for`, primary: true })
    }
    if (domainSlug) {
      doors.push({ to: `/constellation/${domainSlug}`, label: `Others working on ${dLabel}`, primary: false })
    }
  } else if (domainSlug) {
    // Pre-claim, or claimed with nothing asked yet — point outward.
    doors.push({ to: `/constellation/${domainSlug}`, label: `See who else is working on ${dLabel}`, primary: true })
    doors.push({ to: `/domain/${domainSlug}`, label: `Walk the ${dLabel} domain`, primary: false })
  } else {
    // Nothing to anchor on — still not a dead end.
    doors.push({ to: '/challenges', label: 'Find a live challenge', primary: true })
  }
  return doors
}

function palette(tone) {
  const dark = tone !== 'light'
  return dark ? {
    card:       at.object,
    edge:       at.verdigrisEdge,
    eyebrow:    at.ghost,
    lead:       at.text,
    solidBg:    at.verdigris,
    solidInk:   '#0F1A15',
    ghostInk:   at.text,
    ghostEdge:  'rgba(38,36,32,0.40)',
  } : {
    card:       fn.object,
    edge:       fn.mossEdge,
    eyebrow:    fn.ghost,
    lead:       fn.ink,
    solidBg:    fn.moss,
    solidInk:   '#FFFFFF',
    ghostInk:   fn.ink,
    ghostEdge:  fn.mossEdge,
  }
}

function DoorLink({ door, pal }) {
  const base = {
    display: 'inline-block',
    ...mono,
    fontSize: '13px',
    letterSpacing: '0.10em',
    textDecoration: 'none',
    padding: '11px 20px',
    borderRadius: '8px',
    lineHeight: 1.3,
  }
  const style = door.primary
    ? { ...base, background: pal.solidBg, color: pal.solidInk, border: '1px solid transparent', fontWeight: 500 }
    // Available actions = dashed ghost buttons (affordance discipline).
    : { ...base, background: 'transparent', color: pal.ghostInk, border: `1px dashed ${pal.ghostEdge}` }

  const label = <>{door.label} <span aria-hidden="true">→</span></>

  // In-page anchors (the actor's own asks live on the same page) use a
  // plain <a>; route changes use <Link>.
  if (door.href) {
    return <a href={door.href} style={style}>{label}</a>
  }
  return <Link to={door.to} style={style}>{label}</Link>
}

export function Door({
  isClaimed,
  actorName,
  calls,
  domainSlug,
  domainLabel,
  tone = 'dark',
  eyebrow = 'Where this goes',
  lead,
}) {
  const pal   = palette(tone)
  const doors = computeDoors({ isClaimed, actorName, calls, domainSlug, domainLabel })
  if (!doors.length) return null

  const leadLine = lead
    || (isClaimed
        ? 'Admiration needs somewhere to land. Here is the next real step.'
        : 'You have been moved. Here is where that goes.')

  return (
    <section aria-label="Next step" style={{
      background: pal.card,
      border: `1px solid ${pal.edge}`,
      borderRadius: '12px',
      padding: `${space.xl} ${space.xl}`,
      marginTop: space.xxl,
    }}>
      <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.18em',
        textTransform: 'uppercase', color: pal.eyebrow, marginBottom: space.md }}>
        {eyebrow}
      </div>
      <p style={{ ...body, fontSize: '16px', lineHeight: 1.55, color: pal.lead,
        margin: `0 0 ${space.xl}` }}>
        {leadLine}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: space.md }}>
        {doors.map((d, i) => <DoorLink key={i} door={d} pal={pal} />)}
      </div>
    </section>
  )
}

export default Door
