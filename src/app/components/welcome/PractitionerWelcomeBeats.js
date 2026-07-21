// ─────────────────────────────────────────────────────────────
// PractitionerWelcomeBeats.js
//
// Beat data for the practitioner welcome narrative. Same shape
// as the Kin and Org welcomes — same overlay engine, same
// four-act flow — with a practitioner as the worked example.
//
// The example: ASHA — a somatic therapist in Lisbon, eight years
// in practice, recently left a large group practice to work with
// fewer clients at a time. Composite. Not a real person.
//
// Seven practitioner-craft dimensions (the practitioner's internal map):
//   Craft · Presence · Boundaries · Practice Base · Learning · Lineage · Renewal
//
// Civ side uses the same seven civilisational domains as the
// Kin and Org intros.
//
// A practitioner is a person, not a thing — so the practitioner
// has both a Kin side (their personal life) and a practitioner
// side (their craft). This intro only walks them through the
// practitioner side. After onboarding, the platform offers to
// also set up Mission Control for their personal life — they
// can take it or leave it.
// ─────────────────────────────────────────────────────────────

import { CIV_COLORS, DOMAIN_COLORS, SELF_KEYS_ORDERED } from '../../../constants/domainColors'

// Practitioner-craft dimension labels — the seven on the "self" wheel
export const SELF_LABELS = ['Craft', 'Presence', 'Boundaries', 'Practice Base', 'Learning', 'Lineage', 'Renewal']
export const SELF_KEYS   = ['craft', 'presence', 'boundaries', 'practice_base', 'learning', 'lineage', 'renewal']

// Asha's craft scores. A practitioner who is strong on craft and
// presence, has good lineage, but a fragile practice base after
// leaving the group practice — and like a lot of givers, runs
// thin on renewal.
export const ASHA_HORIZONS = {
  craft: 8, presence: 8, boundaries: 7, practice_base: 7,
  learning: 7, lineage: 7, renewal: 7,
}
export const ASHA_CURRENT  = {
  craft: 7, presence: 7, boundaries: 6, practice_base: 4,
  learning: 6, lineage: 7, renewal: 3,
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

export const ASHA_CIV_PRIMARY = 'human-being'
export const ASHA_CIV_ENGAGED = ['society', 'legacy']

// Domain-coloured vertex helper. Practitioner dimensions inherit the
// seven personal-domain colours by index, same pattern as Org.
const PRAC_KEY_TO_SELF_KEY = {
  craft:          SELF_KEYS_ORDERED[0],   // path     — maroon
  presence:       SELF_KEYS_ORDERED[1],   // spark    — orange
  boundaries:     SELF_KEYS_ORDERED[2],   // body     — green
  practice_base:  SELF_KEYS_ORDERED[3],   // finances — yellow
  learning:       SELF_KEYS_ORDERED[4],   // connection — red
  lineage:        SELF_KEYS_ORDERED[5],   // inner_game — blue
  renewal:        SELF_KEYS_ORDERED[6],   // signal   — purple
}

export function getTierColor(current, horizon, key) {
  if (key && PRAC_KEY_TO_SELF_KEY[key]) {
    return DOMAIN_COLORS[PRAC_KEY_TO_SELF_KEY[key]].base
  }
  return 'rgba(110,127,92,0.5)'
}

// ─── Headers per act ───────────────────────────────────────
export const HEADERS = {
  craft: {
    eyebrow: 'Inside the practice · Asha from the inside',
    meet: 'Meet',
    name: 'Asha',
    tagline: "A somatic therapist in Lisbon. Eight years in practice. Recently left a large group to work with fewer clients at a time, more carefully. The craft is strong; the livelihood is shakier.",
  },
  reach: {
    eyebrow: 'In the picture · where Asha can serve',
    meet: 'Out in the world',
    name: 'Asha',
    tagline: "Asha wants to find the people most likely to be served by what she actually does — not whoever clicks first. The Purpose Piece places her where her craft fits the need.",
  },
}

export const ACT3_HEADER = {
  eyebrow: 'Both, at once',
  meet: 'Next for',
  name: 'Asha',
}

// ─── The beat sequence ─────────────────────────────────────
export const BEATS = [

  // ─── Act 1 — Inside the practice (parchment) ───
  {
    id: 'craft-wheel',
    act: 1, header: 'craft', wheel: 'self', wheelMode: 'empty',
    content: null,
  },
  {
    id: 'craft-where',
    act: 1, header: 'craft', wheel: 'self', wheelMode: 'populate',
    content: {
      kind: 'simple',
      label: 'Where Asha is now',
      body: `A practitioner has seven dimensions of craft. <span class="accent">Practice Base — the working livelihood — is the fragile one.</span> Renewal is thinner than it should be. Craft, Presence and Lineage are strong: the work is good, the room is held, and Asha knows who she answers to. Boundaries and Learning are doing fine.`,
    },
  },
  {
    id: 'craft-going',
    act: 1, header: 'craft', wheel: 'self', wheelMode: 'static',
    content: {
      kind: 'simple',
      label: 'Where Asha wants to go',
      body: `A steady caseload of the people most likely to be served by this particular craft. A weekly rhythm that includes rest, body work of her own, and time with her supervision group. <span class="accent">Not more clients. The right ones.</span>`,
    },
  },

  // ─── Act 2 — Out in the world (DARK theme) ───
  {
    id: 'reach-wheel-spin',
    act: 2, header: 'reach', wheel: 'civ', wheelMode: 'empty-spin', dark: true,
    content: null,
  },
  {
    id: 'reach-domain',
    act: 2, header: 'reach', wheel: 'civ', wheelMode: 'place-domain', dark: true,
    content: {
      kind: 'simple',
      label: 'The domain',
      body: `The Purpose Piece reads Asha's responses and places her in <span class="accent">Human Being</span> — the work of personal flourishing, the inside of the human condition. The civilisational domain a somatic therapist most directly serves.`,
    },
  },
  {
    id: 'reach-scale',
    act: 2, header: 'reach', wheel: 'civ', wheelMode: 'scale-zoom', dark: true,
    content: {
      kind: 'simple',
      label: 'The scale',
      body: `At the scale of <span class="accent">one person at a time</span> — the room, the hour, the body in it. Not platforms. Not retreat centres. The one human in front of her, for as long as the work takes.`,
    },
  },
  {
    id: 'reach-world-view',
    act: 2, header: 'reach', wheel: 'civ', wheelMode: 'scale-zoom', dark: true,
    content: {
      kind: 'simple',
      label: 'The state of the work',
      body: `<span class="accent">World View</span> shows the conditions in the domain Asha works in — population mental health, access to care, trauma indicators, the patchy data on what's actually being measured. Asha can see what her tradition addresses, what it doesn't, and where care is most missing.`,
    },
  },
  {
    id: 'reach-gives',
    act: 2, header: 'reach', wheel: 'civ', wheelMode: 'scale-zoom', dark: true,
    content: {
      kind: 'simple',
      label: 'What that placement gives Asha',
      body: `Placement makes Asha findable by the people most likely to be helped by this specific craft — and by the orgs running adjacent work who might refer well. <span class="accent">Not "another therapist online." The right one for what's there.</span>`,
    },
  },

  // ─── Act 3 — Convergence (parchment, no wheel) ───
  {
    id: 'act3-convergence',
    act: 3, header: 'act3', wheel: null,
    content: {
      kind: 'act3',
      frameEyebrow: 'Both move together',
      frameBody: "The craft stays strong when the practitioner is well. The placement makes sure the craft reaches the people who need it. Both move at once.",
      cards: [
        {
          label: 'On the practice side',
          eyebrow: 'Sprint · Renewal · day 4 of 30',
          body: 'Two unscheduled afternoons a week. No clients. No admin. Time on the body, in the body.',
          meta: 'Tier · Small · Cost · 6 hrs / week',
        },
        {
          label: 'On the public side',
          eyebrow: 'Offering · Somatic therapy · by referral',
          body: "Currently accepting one new client. Trauma-informed somatic work. Sliding scale. Lisbon and online.",
          meta: 'Scale · One person · Modality · Somatic',
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
      handoff: "Asha is in the picture — placed, findable,<br/>with the work and the rest both attended to.",
      headline: 'Your turn.',
      subheadline: 'Bring <span class="accent">your work</span> in?',
    },
  },
]

// ─── Pre-packaged wheel data for the overlay ───────────────
export const ASHA_SELF_DATA = {
  labels:   SELF_LABELS,
  keys:     SELF_KEYS,
  horizons: ASHA_HORIZONS,
  current:  ASHA_CURRENT,
  tierColor: getTierColor,
}

export const ASHA_CIV_DATA = {
  domains:     CIV_DOMAINS,
  primarySlug: ASHA_CIV_PRIMARY,
}
