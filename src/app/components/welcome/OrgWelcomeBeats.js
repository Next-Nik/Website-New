// ─────────────────────────────────────────────────────────────
// OrgWelcomeBeats.js
//
// Beat data for the org-side welcome narrative. Mirrors the
// Kin welcome's structure with an organisation as the worked
// example.
//
// The example: HEARTH LAB — a small applied-research lab working
// on neighbourhood-scale food systems. Composite. Not a real org.
//
// Seven org-coherence dimensions (the org's internal map):
//   Purpose · Practice · People · Resources · Reach · Reflection · Renewal
//
// May 2026 alignment update:
//   - Archetype beat removed. Archetype isn't surfaced anywhere on
//     the platform today; the intro shouldn't promise a tool that
//     doesn't exist.
//   - World View beat added. The state-of-the-world surface is the
//     biggest new thing the platform offers an org placing itself
//     in a civ domain.
//   - "Mission" language replaced with "Offering" to match the
//     vocabulary an org actually uses on their manage page.
//   - "The Org Map" mentioned softly — described as the frame
//     rather than as a tool the org has already used. When The
//     Org Map exists, this language becomes literal; for now it's
//     a way of looking, not an instrument.
//
// 10 beats: Act 1 (3) + Act 2 (4) + Act 3 (2) + Closing (1).
// ─────────────────────────────────────────────────────────────

import { CIV_COLORS, DOMAIN_COLORS, SELF_KEYS_ORDERED } from '../../../constants/domainColors'

// Org-coherence labels — the seven dimensions on the "personal" wheel
export const SELF_LABELS = ['Purpose', 'Practice', 'People', 'Resources', 'Reach', 'Reflection', 'Renewal']
export const SELF_KEYS   = ['purpose', 'practice', 'people', 'resources', 'reach', 'reflection', 'renewal']

// Hearth Lab's coherence scores. Same shape as Kin's: middling-to-good
// with two clear weak spots. Strong practice and reach (good at the
// work, known in their niche) but Resources is fragile and Renewal
// is non-existent (everyone's tired).
export const HEARTH_HORIZONS = {
  purpose: 8, practice: 7, people: 7, resources: 7,
  reach: 7, reflection: 6, renewal: 7,
}
export const HEARTH_CURRENT  = {
  purpose: 6, practice: 6, people: 5, resources: 3,
  reach: 6, reflection: 4, renewal: 2,
}

export const CIV_DOMAINS = [
  { slug: 'human-being',     label: 'Human',    color: CIV_COLORS.human.base },
  { slug: 'society',         label: 'Society',  color: CIV_COLORS.society.base },
  { slug: 'nature',          label: 'Nature',   color: CIV_COLORS.nature.base },
  { slug: 'technology',      label: 'Tech',     color: CIV_COLORS.tech.base },
  { slug: 'finance-economy', label: 'Finance',  color: CIV_COLORS.finance.base },
  { slug: 'legacy',          label: 'Legacy',   color: CIV_COLORS.legacy.base },
  { slug: 'vision',          label: 'Vision',   color: CIV_COLORS.vision.base },
]

export const HEARTH_CIV_PRIMARY = 'society'
export const HEARTH_CIV_ENGAGED = ['nature', 'human-being']

// Domain-coloured vertex helper. Org dimensions map by index to the
// seven personal-domain colours so the wheel speaks the same colour
// language as everywhere else. Provisional — see header comment.
const ORG_KEY_TO_SELF_KEY = {
  purpose:    SELF_KEYS_ORDERED[0],   // path     — maroon
  practice:   SELF_KEYS_ORDERED[1],   // spark    — orange
  people:     SELF_KEYS_ORDERED[2],   // body     — green
  resources:  SELF_KEYS_ORDERED[3],   // finances — yellow
  reach:      SELF_KEYS_ORDERED[4],   // connection — red
  reflection: SELF_KEYS_ORDERED[5],   // inner_game — blue
  renewal:    SELF_KEYS_ORDERED[6],   // signal   — purple
}

export function getTierColor(current, horizon, key) {
  if (key && ORG_KEY_TO_SELF_KEY[key]) {
    return DOMAIN_COLORS[ORG_KEY_TO_SELF_KEY[key]].base
  }
  return 'rgba(200,146,42,0.5)'
}

// ─── Headers per act ───────────────────────────────────────
export const HEADERS = {
  internal: {
    eyebrow: 'Inside the lab · Hearth Lab from the inside',
    meet: 'Meet',
    name: 'Hearth Lab',
    tagline: 'A small applied-research lab in Lisbon, working on neighbourhood food systems. Six people. Five years in. Doing real work, but stretched thin and not always sure where the work is going.',
  },
  external: {
    eyebrow: 'In the picture · Hearth Lab in the larger world',
    meet: 'Out in the world',
    name: 'Hearth Lab',
    tagline: "Hearth Lab wants the work to land where it matters, not just where it's easy. The Purpose Piece places the lab in something larger — at the scale and scope that fits.",
  },
}

export const ACT3_HEADER = {
  eyebrow: 'Both, at once',
  meet: 'Next for',
  name: 'Hearth Lab',
}

// ─── The beat sequence ─────────────────────────────────────
export const BEATS = [

  // ─── Act 1 — Internal Hearth Lab (parchment) ───
  {
    id: 'internal-wheel',
    act: 1, header: 'internal', wheel: 'self', wheelMode: 'empty',
    content: null,
  },
  {
    id: 'internal-where',
    act: 1, header: 'internal', wheel: 'self', wheelMode: 'populate',
    content: {
      kind: 'simple',
      label: 'Where Hearth Lab is now',
      body: `An organisation has seven dimensions of coherence too — different from a person's, but recognisably the same shape. <span class="accent">Renewal is the lowest — the team is worn out.</span> Resources are thin. Reflection happens in fits and starts. Purpose, Practice and Reach are holding the lab up: they know what they're doing, the work is good, and the right people know about it.`,
    },
  },
  {
    id: 'internal-going',
    act: 1, header: 'internal', wheel: 'self', wheelMode: 'static',
    content: {
      kind: 'simple',
      label: 'Where Hearth Lab wants to go',
      body: `Steady funding so the team isn't always six months from broke. A weekly rhythm that includes rest, not just delivery. Clearer reflection — what worked, what didn't, what's next. <span class="accent">Not bigger. Just less fragile, and more itself.</span>`,
    },
  },

  // ─── Act 2 — External Hearth Lab (DARK theme) ───
  {
    id: 'external-wheel-spin',
    act: 2, header: 'external', wheel: 'civ', wheelMode: 'empty-spin', dark: true,
    content: null,
  },
  {
    id: 'external-domain',
    act: 2, header: 'external', wheel: 'civ', wheelMode: 'place-domain', dark: true,
    content: {
      kind: 'simple',
      label: 'The domain',
      body: `The Purpose Piece tool reads Hearth Lab's responses and places the lab in <span class="accent">Society</span> — the work of how people live together, organise, and feed each other. Seven civilisational domains; this is the one the lab's work points toward.`,
    },
  },
  {
    id: 'external-scale',
    act: 2, header: 'external', wheel: 'civ', wheelMode: 'scale-zoom', dark: true,
    content: {
      kind: 'simple',
      label: 'The scale',
      body: `At the scale of <span class="accent">neighbourhood</span> — a few streets, a few buildings, a market, a kitchen. Not nation-states. Not platforms. The streets the lab actually walks.`,
    },
  },
  {
    id: 'external-world-view',
    act: 2, header: 'external', wheel: 'civ', wheelMode: 'scale-zoom', dark: true,
    content: {
      kind: 'simple',
      label: 'The state of the world',
      body: `<span class="accent">World View</span> opens the planetary picture for the domain Hearth Lab works in. Live data on the conditions an org's work is meant to affect — and honest gaps where the data isn't yet there. Hearth Lab can see what's holding, what's failing, and what other orgs are already attending to.`,
    },
  },
  {
    id: 'external-gives',
    act: 2, header: 'external', wheel: 'civ', wheelMode: 'scale-zoom', dark: true,
    content: {
      kind: 'simple',
      label: 'What that placement gives Hearth Lab',
      body: `Placement puts Hearth Lab in front of the people, funders, and adjacent orgs working on the same shape of problem at the same scale — surfacing aligned offerings, needs, and contributors instead of generic ones. <span class="accent">From "we need help" to "here are the people who fit."</span>`,
    },
  },

  // ─── Act 3 — Convergence (parchment, no wheel) ───
  {
    id: 'act3-convergence',
    act: 3, header: 'act3', wheel: null,
    content: {
      kind: 'act3',
      frameEyebrow: 'Both move together',
      frameBody: 'The internal work makes the lab less fragile. The external placement puts the work where it matters. Both matter, both at once.',
      cards: [
        {
          label: 'On the internal side',
          eyebrow: 'Sprint · Renewal · day 8 of 60',
          body: 'A weekly half-day off the tools. No standups. No deliverables. The team can rest or reflect — their call.',
          meta: 'Tier · Small · Cost · 0.5 day / person / week',
        },
        {
          label: 'On the external side',
          eyebrow: 'Offering · Open kitchen · monthly',
          body: 'Hosting one open kitchen night a month for adjacent orgs. People show up, eat, swap notes. No agenda.',
          meta: 'Scale · Neighbourhood · Frequency · Monthly',
        },
      ],
    },
  },

  // ─── Closing ───
  {
    id: 'closing',
    act: 4, header: null, wheel: null,
    content: {
      kind: 'closing',
      handoff: "Hearth Lab is in the picture — placed, connected,<br/>with a clear next move on each side.",
      headline: 'Your turn.',
      subheadline: 'Bring <span class="accent">your organisation</span> in?',
    },
  },
]

// ─── Pre-packaged wheel data for the overlay ───────────────
// Hearth Lab's org welcome uses the same scale rings as the
// individual flow (lit at neighbourhood). No override needed today.
export const HEARTH_SELF_DATA = {
  labels:   SELF_LABELS,
  keys:     SELF_KEYS,
  horizons: HEARTH_HORIZONS,
  current:  HEARTH_CURRENT,
  tierColor: getTierColor,
}

export const HEARTH_CIV_DATA = {
  domains:     CIV_DOMAINS,
  primarySlug: HEARTH_CIV_PRIMARY,
  // scaleRings: undefined → uses default (neighbourhood lit)
}
