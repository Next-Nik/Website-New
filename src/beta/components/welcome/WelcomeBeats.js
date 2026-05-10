// ─────────────────────────────────────────────────────────────
// WelcomeBeats.js
//
// Pure data for the Kin welcome narrative. Ported verbatim from
// alex_welcome_prototype__4_.html, with Design System v3 corrections
// applied at the consumer layer (italic-on-tagline removed in
// WelcomeOverlay; structural copy lives here untouched).
//
// 10 beats: Act 1 (3) + Act 2 (5) + Act 3 (1) + Closing (1).
//
// May 2026 update — domain colour identity:
//   Civ domain colours sourced from /constants/domainColors.js
//   so the Welcome wheel speaks the same colour language as
//   Mission Control. The ad-hoc getTierColor helper now returns
//   the domain colour for the wheel vertex (same as elsewhere).
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
// /constants/domainColors.js. Self → NextUs fractal mappings:
//   human-being     ← Spark (orange)
//   society         ← Connection (red)
//   nature          ← Body (green)
//   technology      ← Signal (purple)
//   finance-economy ← Finances (yellow)
//   legacy          ← Inner Game (blue)
//   vision          ← Path (maroon)
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

// Domain-coloured vertex helper. Signature kept (current, horizon)
// for backwards compatibility with the wheel's vertex calls — but
// the inputs are now ignored in favour of the domain key, which is
// passed through the third argument when available. When called
// without a key (legacy two-arg signature) we fall back to gold so
// the wheel still renders rather than breaking.
//
// In practice the wheel calls keys.map((k, i) => tierColor(c, h, k))
// when this is provided; the renderer in WelcomeWheel.jsx is updated
// to pass the key as a third argument.
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
    tagline: "Kin is doing fine in life, but knows they're capable of more. They're not clear on their purpose, and want to work on that.",
  },
  planet: {
    eyebrow: "The Purpose Piece · Kin's place in the larger picture",
    meet: 'Planet',
    name: 'Kin',
    tagline: "Kin wants to make a difference in the world, so they use the Purpose Piece to place themselves in something larger — at the scale and scope that works for them.",
  },
}

export const ACT3_HEADER = {
  eyebrow: 'Both, at once',
  meet: 'Next for',
  name: 'Kin',
}

// ─── The 10-beat sequence ──────────────────────────────────
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
      body: `Based on Kin's answers to the Map, <span class="accent">Path — purpose, mission — is the lowest.</span> Connection, Spark (vitality, energy, expression) and Signal (how Kin shows up in the world) are also dragging them down. Body, Finances and Inner Game are holding them up, close to the point on the Horizon Kin wants them to be.`,
    },
  },
  {
    id: 'personal-going',
    act: 1, header: 'personal', wheel: 'self', wheelMode: 'static',
    content: {
      kind: 'simple',
      label: 'Where Kin wants to go',
      body: `Work that means something to them. A body that's a notch fitter and healthier. Start saving. Some people want to summit Everest — Kin just wants the freedom to enjoy life a little more fully, with closer connections. <span class="accent">For Kin, that would be a good life.</span>`,
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
      body: `Based on Kin's responses, the Purpose Piece tool placed Kin in <span class="accent">Society</span> — the work of how people live together, organise, and care for each other.`,
    },
  },
  {
    id: 'planet-scale',
    act: 2, header: 'planet', wheel: 'civ', wheelMode: 'scale-zoom', dark: true,
    content: {
      kind: 'simple',
      label: 'The scale',
      body: `At the scale of <span class="accent">neighbourhood</span> — the streets and rooms within a few minutes' walk. Not global. Not abstract. The world Kin can actually reach.`,
    },
  },
  {
    id: 'planet-archetype',
    act: 2, header: 'planet', wheel: 'civ', wheelMode: 'scale-zoom', dark: true,
    content: {
      kind: 'simple',
      label: 'The archetype',
      body: `Kin's archetype is <span class="accent">Connector</span> — the role of drawing people together, holding the threads, helping the right person meet the right person.`,
    },
  },
  {
    id: 'planet-gives',
    act: 2, header: 'planet', wheel: 'civ', wheelMode: 'scale-zoom', dark: true,
    content: {
      kind: 'simple',
      label: 'What that placement gives Kin',
      body: `This allows NextUs to place Kin exactly where they're most interested and most useful in the ecosystem — surfacing the organisations, people, and groups working on the kind of future Kin is most aligned with.`,
    },
  },
  // ─── Act 3 — Convergence (parchment, no wheel) ───
  {
    id: 'act3-convergence',
    act: 3, header: 'act3', wheel: null,
    content: {
      kind: 'act3',
      frameEyebrow: 'Both move together',
      frameBody: "The personal work clears Kin's direction. The planetary work places Kin in something larger. Both matter.",
      cards: [
        {
          label: 'On the personal side',
          eyebrow: 'Sprint · Path · day 12 of 90',
          body: "Three conversations a week with people doing work I'd want to do. Notes after each.",
          meta: 'Tier · Small · Time · 2 hrs / week',
        },
        {
          label: 'On the planetary side',
          eyebrow: 'Contribution · Tiny · committed',
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
      handoff: 'Kin is on their way — with resources, connections,<br/>and a clear next move on each side.',
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
