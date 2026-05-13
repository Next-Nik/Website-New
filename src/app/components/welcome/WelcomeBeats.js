// ─────────────────────────────────────────────────────────────
// WelcomeBeats.js
//
// Pure data for the Kin welcome narrative.
//
// May 2026 rewrite — Mission Control alignment.
// The platform now carries surfaces the original intro didn't yet
// know about: World View (state of the world), Horizon State (daily
// check-in), Horizon Practice (daily anchors), and the planet-side
// drill-down. The beats below fold those in without breaking the
// arc: Act 1 personal (Map → orientation → direction), Act 2
// planetary (Purpose Piece → drill into a domain → World View),
// Act 3 convergence (a sprint and a practice on the personal side,
// a contribution on the planetary side), Closing handoff.
//
// 11 beats: Act 1 (3) + Act 2 (5) + Act 3 (2) + Closing (1).
//
// Wheel modes supported by WelcomeOverlay/WelcomeWheel:
//   empty · empty-spin · populate · static · place-domain · scale-zoom
//
// Content kinds supported by WelcomeOverlay:
//   simple · act3 · closing
// ─────────────────────────────────────────────────────────────

import { CIV_COLORS, selfColor } from '../../../constants/domainColors'

// Kin's wheel data — middle-of-the-range, "good not great"
export const SELF_LABELS = ['Path', 'Spark', 'Body', 'Finances', 'Connection', 'Inner Game', 'Signal']
export const SELF_KEYS   = ['path', 'spark', 'body', 'finances', 'connection', 'inner_game', 'signal']

export const KIN_HORIZONS = {
  path: 7, spark: 7, body: 7, finances: 7,
  connection: 8, inner_game: 7, signal: 6,
}
export const KIN_CURRENT  = {
  path: 3, spark: 4, body: 5, finances: 5,
  connection: 4, inner_game: 5, signal: 4,
}

// Civilisational domains — colour from the locked palette via
// /constants/domainColors.js.
export const CIV_DOMAINS = [
  { slug: 'human-being',     label: 'Human',    color: CIV_COLORS.human_being.base },
  { slug: 'society',         label: 'Society',  color: CIV_COLORS.society.base },
  { slug: 'nature',          label: 'Nature',   color: CIV_COLORS.nature.base },
  { slug: 'technology',      label: 'Tech',     color: CIV_COLORS.technology.base },
  { slug: 'finance-economy', label: 'Finance',  color: CIV_COLORS.finance_economy.base },
  { slug: 'legacy',          label: 'Legacy',   color: CIV_COLORS.legacy.base },
  { slug: 'vision',          label: 'Vision',   color: CIV_COLORS.vision.base },
]

export const KIN_CIV_PRIMARY = 'society'
export const KIN_CIV_ENGAGED = ['human-being', 'legacy']

// Domain-coloured vertex helper. Falls back to gold for legacy
// two-arg calls.
export function getTierColor(current, horizon, key) {
  if (key) return selfColor(key).base
  return 'rgba(200,146,42,0.5)'
}

// ─── Headers per act ───────────────────────────────────────
export const HEADERS = {
  personal: {
    eyebrow: "The Map · Kin's personal life",
    meet: 'Meet',
    name: 'Kin',
    tagline: "Kin is doing fine in life, but knows they're capable of more. They're not clear on their purpose, and they want to work on that.",
  },
  planet: {
    eyebrow: "The Purpose Piece · Kin's place in the larger picture",
    meet: 'Planet',
    name: 'Kin',
    tagline: "Kin wants to matter in the world, so they use the Purpose Piece to find a place in something larger — at the scale and scope that fits their life.",
  },
}

export const ACT3_HEADER = {
  eyebrow: 'Both, at once',
  meet: 'Next for',
  name: 'Kin',
}

// ─── The beat sequence ─────────────────────────────────────
export const BEATS = [

  // ─── Act 1 — Personal Kin (parchment) ───
  {
    id: 'personal-wheel',
    act: 1, header: 'personal', wheel: 'self', wheelMode: 'empty',
    content: null,
  },
  {
    id: 'personal-where',
    act: 1, header: 'personal', wheel: 'self', wheelMode: 'populate',
    content: {
      kind: 'simple',
      label: 'Where Kin is now',
      body: `The Map asks honest questions across seven domains of personal life. Kin's answers draw the shape. <span class="accent">Path — purpose, mission — is the lowest.</span> Connection, Spark, and Signal are dragging too. Body, Finances, and Inner Game are holding them up, close to where Kin wants them.`,
    },
  },
  {
    id: 'personal-going',
    act: 1, header: 'personal', wheel: 'self', wheelMode: 'static',
    content: {
      kind: 'simple',
      label: 'Where Kin wants to go',
      body: `Work that means something. A body a notch fitter and healthier. Start saving. Closer connections with the people who already matter. Some people want to summit Everest — Kin just wants to live a little more fully. <span class="accent">For Kin, that would be a good life.</span> Two daily surfaces hold the work: Horizon State for how today is arriving, Horizon Practice for the small anchors that compound.`,
    },
  },

  // ─── Act 2 — Planet Kin (DARK theme) ───
  {
    id: 'planet-wheel-spin',
    act: 2, header: 'planet', wheel: 'civ', wheelMode: 'empty-spin', dark: true,
    content: null,
  },
  {
    id: 'planet-domain',
    act: 2, header: 'planet', wheel: 'civ', wheelMode: 'place-domain', dark: true,
    content: {
      kind: 'simple',
      label: 'The domain',
      body: `The Purpose Piece tool reads Kin's responses and places them in <span class="accent">Society</span> — the work of how people live together, organise, and care for each other. Seven civilisational domains; this is the one Kin's life points toward.`,
    },
  },
  {
    id: 'planet-scale',
    act: 2, header: 'planet', wheel: 'civ', wheelMode: 'scale-zoom', dark: true,
    content: {
      kind: 'simple',
      label: 'The scale',
      body: `At the scale of <span class="accent">neighbourhood</span> — the streets and rooms within a few minutes' walk. Not global. Not abstract. The world Kin can actually reach with the time they have.`,
    },
  },
  {
    id: 'planet-world-view',
    act: 2, header: 'planet', wheel: 'civ', wheelMode: 'scale-zoom', dark: true,
    content: {
      kind: 'simple',
      label: 'The state of the world',
      body: `<span class="accent">World View</span> opens the planetary picture. Each spoke rolls up live data from authoritative sources — atmospheric CO₂, life expectancy, languages endangered, refugees displaced, more. When the system doesn't yet have a source for something, it says so. The gaps invite you to point us at sources we don't yet know about.`,
    },
  },
  {
    id: 'planet-gives',
    act: 2, header: 'planet', wheel: 'civ', wheelMode: 'scale-zoom', dark: true,
    content: {
      kind: 'simple',
      label: 'What that placement gives Kin',
      body: `NextUs surfaces the organisations, people, practices, and groups working on the kind of future Kin is most aligned with — at the scale Kin can actually reach. <span class="accent">From "I want to matter" to "here's the work, here are the people."</span>`,
    },
  },

  // ─── Act 3 — Convergence (parchment, no wheel) ───
  {
    id: 'act3-convergence',
    act: 3, header: 'act3', wheel: null,
    content: {
      kind: 'act3',
      frameEyebrow: 'Both move together',
      frameBody: "The personal work clears Kin's direction. The planetary work places Kin in something larger. Both matter. Both move at once.",
      cards: [
        {
          label: 'On the personal side',
          eyebrow: 'Target Sprint · Path · day 12 of 90',
          body: "Three conversations a week with people doing work I'd want to do. Notes after each.",
          meta: 'Tier · Small · Time · 2 hrs / week',
        },
        {
          label: 'On the planetary side',
          eyebrow: 'Planet Sprint · contribution · committed',
          body: 'Showing up monthly to the local food coordination meeting. Bringing a notebook. Not running it.',
          meta: 'Org · Brixton Mutual · Focus · neighbourhood',
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
      handoff: 'Kin is on their way — with direction on the personal side,<br/>a place to stand on the planetary side, and a clear next move on each.',
      headline: 'Your turn.',
      subheadline: 'Ready to do <span class="accent">the work</span>?',
    },
  },
]

// ─── Pre-packaged wheel data for the overlay ───────────────
// Kin's individual welcome uses the standard scale rings (global →
// one-person, lit at neighbourhood). No override needed.
export const KIN_SELF_DATA = {
  labels:   SELF_LABELS,
  keys:     SELF_KEYS,
  horizons: KIN_HORIZONS,
  current:  KIN_CURRENT,
  tierColor: getTierColor,
}

export const KIN_CIV_DATA = {
  domains:     CIV_DOMAINS,
  primarySlug: KIN_CIV_PRIMARY,
  // scaleRings: undefined → uses default (neighbourhood lit)
}
