// ─────────────────────────────────────────────────────────────
// OrgWelcomeBeats.js
//
// Beat data for the org-side welcome narrative. Mirrors the
// Kin welcome's structure (Act 1 internal → Act 2 civ → Act 3
// convergence → closing) but with an organisation as the worked
// example.
//
// The example: HEARTH LAB — a small applied-research lab working
// on neighbourhood-scale food systems. Composite. Not a real org.
// Edit the names, copy, and scores freely; the structure does the
// load-bearing work.
//
// Seven org-coherence dimensions (the org's "personal" side):
//   Purpose · Practice · People · Resources · Reach · Reflection · Renewal
//
// Seven civ domains (the same ones as the individual flow):
//   Human · Society · Nature · Tech · Finance · Legacy · Vision
// ─────────────────────────────────────────────────────────────

// Org-coherence labels — the seven dimensions on the "personal" wheel
export const SELF_LABELS = ['Purpose', 'Practice', 'People', 'Resources', 'Reach', 'Reflection', 'Renewal']
export const SELF_KEYS   = ['purpose', 'practice', 'people', 'resources', 'reach', 'reflection', 'renewal']

// Hearth Lab's coherence scores. Same shape as Kin's: middling-to-good
// with two clear weak spots. They have strong practice and reach (good at
// the work, known in their niche) but Resources is fragile and Renewal
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
  { slug: 'human-being',     label: 'Human',    color: '#2A6B9E' },
  { slug: 'society',         label: 'Society',  color: '#6B2A9E' },
  { slug: 'nature',          label: 'Nature',   color: '#2A6B3A' },
  { slug: 'technology',      label: 'Tech',     color: '#8A6B2A' },
  { slug: 'finance-economy', label: 'Finance',  color: '#6B3A2A' },
  { slug: 'legacy',          label: 'Legacy',   color: '#4A6B2A' },
  { slug: 'vision',          label: 'Vision',   color: '#2A4A6B' },
]

export const HEARTH_CIV_PRIMARY = 'society'
export const HEARTH_CIV_ENGAGED = ['nature', 'human-being']

export function getTierColor(current, horizon) {
  if (current == null || !horizon) return 'rgba(200,146,42,0.5)'
  const ratio = current / horizon
  if (ratio >= 0.9) return '#3B6B9E'
  if (ratio >= 0.7) return '#5A8AB8'
  if (ratio >= 0.5) return '#8A8070'
  if (ratio >= 0.3) return '#8A7030'
  return '#8A3030'
}

// ─── Headers per act ───────────────────────────────────────
export const HEADERS = {
  internal: {
    eyebrow: 'The Org Map · Hearth Lab from the inside',
    meet: 'Meet',
    name: 'Hearth Lab',
    tagline: 'A small applied-research lab in Lisbon, working on neighbourhood food systems. Six people. Five years in. Doing real work, but stretched thin and not always sure where the work is going.',
  },
  external: {
    eyebrow: 'The Purpose Piece · Hearth Lab in the larger picture',
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

// ─── The 10-beat sequence ──────────────────────────────────
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
      body: `The Org Map shows where the lab actually stands. <span class="accent">Renewal is the lowest — the team is worn out.</span> Resources are thin. Reflection happens in fits and starts. Purpose, Practice and Reach are holding the org up: people know what they're doing, the work is good, and the right people know about it.`,
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
      body: `Based on Hearth Lab's responses, the Purpose Piece placed the lab in <span class="accent">Society</span> — the work of how people live together, organise, and feed each other.`,
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
    id: 'external-archetype',
    act: 2, header: 'external', wheel: 'civ', wheelMode: 'scale-zoom', dark: true,
    content: {
      kind: 'simple',
      label: 'The archetype',
      body: `Hearth Lab's archetype is <span class="accent">Anchor</span> — the org-shape that holds a place where the work happens. People come, the work is done, the place stays. Anchors don't scale. They hold.`,
    },
  },
  {
    id: 'external-gives',
    act: 2, header: 'external', wheel: 'civ', wheelMode: 'scale-zoom', dark: true,
    content: {
      kind: 'simple',
      label: 'What that placement gives Hearth Lab',
      body: `This places Hearth Lab in front of the people, funders, and adjacent orgs working on the same shape of problem at the same scale — surfacing connections that fit, instead of generic ones that don't.`,
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
          eyebrow: 'Mission · Open · accepting',
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
      subheadline: "Bring <span class=\"accent\">your organisation</span> in?",
    },
  },
]

// ─── Pre-packaged wheel data for the overlay ───────────────
// Hearth Lab's org welcome uses the same scale rings as the
// individual flow (lit at neighbourhood). No override needed today.
// If org-side scale ever needs different rings, set scaleRings here.
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
