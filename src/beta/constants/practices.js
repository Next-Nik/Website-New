// src/beta/constants/practices.js
//
// Constants for the Practices layer. Canonical copy lives here.
// Voice on these strings matters; do not paraphrase without conversation.

// ── The two practice kinds ───────────────────────────────────

export const PRACTICE_KINDS = [
  {
    slug:        'best_for_all',
    label:       'Best for All',
    shortLabel:  'For All',
    homeDomain:  'society',
    color:       '#6B2A9E',
    voiceNote:
      'Population-level. Evidence-led. The voice names the practice, names the evidence, names the pushback. The Horizon Floor carries the moral framework; the entry stays factual.',
    contributePrompt:
      'Best for All practices answer: what has humanity learned about how to organise collective life well? Confident, comparative, evidence-led.',
  },
  {
    slug:        'best_for_individual',
    label:       'Best for the Individual',
    shortLabel:  'For the Individual',
    homeDomain:  'human-being',
    color:       '#2A6B9E',
    voiceNote:
      'Me-lens. Plural. Lineaged. Discernment-oriented. Each tradition has its evidence within its frame. The reader discerns what is theirs.',
    contributePrompt:
      'Best for the Individual practices hold lineages and traditions side by side. The reader discerns what is theirs. No "you should." No "the right way."',
  },
]

export const PRACTICE_KIND_BY_SLUG = Object.fromEntries(
  PRACTICE_KINDS.map(k => [k.slug, k]),
)

// ── Vetting status ───────────────────────────────────────────

export const VETTING_STATUSES = [
  { slug: 'self_submitted',      label: 'Self submitted',      color: 'rgba(15,21,35,0.55)' },
  { slug: 'community_attested',  label: 'Community attested',  color: '#2A6B3A' },
  { slug: 'curator_reviewed',    label: 'Curator reviewed',    color: '#A8721A' },
]

export const VETTING_BY_SLUG = Object.fromEntries(
  VETTING_STATUSES.map(v => [v.slug, v]),
)

// Threshold at which a self_submitted practice promotes to community_attested.
export const COMMUNITY_ATTESTED_THRESHOLD = 5

// ── Contributor / attester role options ─────────────────────

export const CONTRIBUTOR_ROLES = [
  { slug: 'practitioner', label: 'I have used this practice' },
  { slug: 'teacher',      label: 'I teach this practice' },
  { slug: 'lineage',      label: 'I am part of this lineage' },
  { slug: 'researcher',   label: 'I am a researcher or curator' },
]

// ── Canonical empty-state copy ──────────────────────────────
// This string is locked. Do not paraphrase.

// Note: this string contains an em dash. The spec instructs "do not paraphrase"
// for this exact copy AND lists "no em dashes" as a general voice rule. The
// "do not paraphrase" instruction governs in this case because the empty
// state copy is canonical text, not personal-tone copy authored by Claude.
export const PRACTICES_EMPTY_STATE_COPY =
  'This scaffolding is waiting for the people who know. ' +
  'If you carry a lineage, a method, or a tested practice \u2014 bring it. ' +
  'NextUs is the substrate; the colony is the people. ' +
  'Without you, the structure is empty. With you, it is alive.'

// ── Lineage detection heuristics ────────────────────────────
// Words that, when present in a lineage attribution, signal that the
// source carries indigenous, traditional, or ancestral lineage and should
// be rendered with extra dignity (italic, slim gold border, optional
// indigenous-relational principle prefix).
//
// Curators may revise this list; it is intentionally cautious and broad.

const TRADITIONAL_LINEAGE_MARKERS = [
  'indigenous', 'first nation', 'first nations', 'first peoples',
  'aboriginal', 'tribal', 'tribe', 'clan', 'lineage holder', 'lineage holders',
  'elder', 'elders', 'ancestral', 'ancestor', 'ancestors',
  'tradition', 'traditional', 'oral tradition',
  'sufi', 'buddhist', 'taoist', 'daoist', 'shamanic', 'shaman',
  'curandera', 'curandero', 'medicine person', 'medicine people',
  'kaupapa', 'whakapapa', 'mauri', 'tikanga',  // Maori
  'ubuntu', 'sankofa',                         // Pan-African
  'minga',                                     // Andean
  'ayllu', 'pachamama',
  'dreamtime', 'songline', 'songlines',
]

export function detectsTraditionalLineage(lineageAttributionText) {
  if (!lineageAttributionText || typeof lineageAttributionText !== 'string') return false
  const lower = lineageAttributionText.toLowerCase()
  return TRADITIONAL_LINEAGE_MARKERS.some(marker => lower.includes(marker))
}
