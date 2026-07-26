// src/lib/care/instruments/index.js
//
// The assessment roster. Adding assessment number fourteen should be a data
// task, not a dev task — that is the whole point of the schema — so this file
// is the only place the roster is declared.
//
// It also carries the PARKED table. Parked instruments stay visible in the
// product's own rights ledger rather than quietly disappearing, because
// "which of our inputs are science, and which are licensed" is a thing this
// product claims to be honest about.

import careReceiving from './careReceiving'
import ecrRS from './ecrRS'
import openNeeds from './openNeeds'
import ipip50 from './ipip50'
import dosha from './dosha'

// Core = the roughly five-minute intake that produces a complete card.
// Deepen = optional, enriches the trait vector and the synthesis.
export const CORE_INSTRUMENTS = [careReceiving, ecrRS, openNeeds]
export const DEEPEN_INSTRUMENTS = [ipip50, dosha]
export const INSTRUMENTS = [...CORE_INSTRUMENTS, ...DEEPEN_INSTRUMENTS]

export const INSTRUMENTS_BY_ID = Object.fromEntries(INSTRUMENTS.map((i) => [i.id, i]))

// Computed systems are instruments whose runner is a function rather than a
// quiz. Declared here so the rights ledger and the evidence display treat them
// exactly like the quizzes.
export const COMPUTED_SYSTEMS = [
  {
    id: 'astrology',
    name: 'Natal astrology',
    shortName: 'Placements',
    kind: 'computed',
    evidence: 'mythic',
    rights: { status: 'cleared', basis: 'Computed from birth data · pure mathematics', url: null },
  },
  {
    id: 'human_design',
    name: 'Human design',
    shortName: 'Type and authority',
    kind: 'computed',
    evidence: 'mythic',
    rights: { status: 'cleared', basis: 'Computed from birth data · pure mathematics', url: null },
  },
  {
    id: 'chinese_zodiac',
    name: 'Chinese zodiac',
    shortName: 'Year animal',
    kind: 'computed',
    evidence: 'mythic',
    rights: { status: 'cleared', basis: 'Computed · traditional system', url: null },
  },
  {
    id: 'numerology',
    name: 'Numerology',
    shortName: 'Life path',
    kind: 'computed',
    evidence: 'mythic',
    rights: { status: 'cleared', basis: 'Computed · traditional system', url: null },
  },
  {
    id: 'daily_transits',
    name: "Today's sky",
    shortName: 'Daily transits',
    kind: 'computed',
    evidence: 'mythic',
    rights: { status: 'cleared', basis: 'Computed from birth data · pure mathematics', url: null },
  },
]

// ── Parked ────────────────────────────────────────────────────────────────
// Questionable rights status. Not deleted from the roadmap · waiting on a
// licensing audit or a licensed integration. "Free for research" is not "free
// for a commercial app", so research-free instruments are parked rather than
// assumed clear.
export const PARKED_INSTRUMENTS = [
  {
    id: 'oejts',
    name: 'OEJTS (Jungian four-letter type)',
    issue: 'CC BY-NC-SA 4.0 · non-commercial clause plus ShareAlike. Verified at source; the brief listed this as public domain, which it is not.',
    quote: 'The items of the Open Extended Jungian Type Scales 1.2 are licenced under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.',
    url: 'https://openpsychometrics.org/tests/OJTS/development/OEJTS1.2.pdf',
    path: 'Author an original four-letter item set, or licence something. The construct is wanted; only the instrument is parked.',
  },
  {
    id: 'love_languages',
    name: "Chapman's 5 Love Languages quiz",
    issue: 'Quiz copyrighted, name trademarked',
    path: 'Never needed · our original "How I receive care" instrument replaces it. Avoid the trademarked phrase in product copy.',
  },
  { id: 'mbti', name: 'MBTI (official)', issue: 'Proprietary (The Myers-Briggs Company)', path: 'Original item set, or licence.' },
  { id: 'enneagram', name: 'Enneagram (RHETI)', issue: 'Proprietary instrument', path: 'Original items later, or a licensed API if demand justifies it.' },
  { id: 'via', name: 'VIA Character Strengths', issue: 'Proprietary platform', path: 'Licensing conversation, or skip.' },
  { id: 'tki', name: 'Thomas-Kilmann conflict styles', issue: 'Proprietary', path: 'Rahim ROCI-II may be adaptable · verify before use.' },
  { id: 'erq', name: 'ERQ (emotion regulation)', issue: 'Free for research; commercial status unverified', path: 'Licensing audit.' },
  { id: 'scs', name: 'Self-Compassion Scale (Neff)', issue: 'Free for research; commercial status unverified', path: 'Licensing audit.' },
  { id: 'who5', name: 'WHO-5 wellbeing', issue: 'Free with attribution; verify commercial terms', path: 'Licensing audit.' },
  { id: 'hsp', name: 'HSP scale (Aron)', issue: 'Free for research; author has enforced usage terms', path: 'Licensing audit.' },
  { id: 'meq', name: 'MEQ / rMEQ chronotype', issue: 'Journal-published 1976; status murky', path: 'Licensing audit, or author an original chronotype item set · likely the faster path.' },
  { id: 'cycle', name: 'Cycle tracking', issue: 'Not a rights issue · privacy and scope', path: 'Deliberately postponed. The card\'s "Right now" section is the future surface for it.' },
]

// Evidence tiers, displayed openly on the card. The one needs-app that tells
// you which of its inputs are science.
export const EVIDENCE_TIERS = {
  measured: {
    label: 'Measured',
    note: 'Validated instrument with research behind it.',
  },
  mapped: {
    label: 'Mapped',
    note: 'Structured self-report. Useful vocabulary, not a validated scale.',
  },
  mythic: {
    label: 'Mythic',
    note: 'No evidence base. Kept because it gives people language for things they already know.',
  },
}
