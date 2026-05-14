// ─────────────────────────────────────────────────────────────
// Horizon Scale — shared constants
// Used by: NextUs Self (Map tool) and NextUs Planet (domain panels)
//
// Three layers per score point:
//   TIER_MAP       — functional tier label (Cormorant SC, small caps)
//   LABEL_MAP      — descriptive label, short form (inline in picker)
//   SIGNATURE_MAP  — energetic signature, full (shown on hover / detail)
//
// Philosophy: no softening, no brutality. Honest without being cruel.
// The scale describes without judging. 0 is a complete reset — end of
// a cycle, stillness before rebirth. 10 is the furthest point currently
// visible. You never reach the horizon — reaching World-Class means
// the next horizon has just become visible.
//
// Locked: May 2026
// ─────────────────────────────────────────────────────────────

export const SCALE_POINTS = [
  10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5,
  5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0
]

// ── Tier labels ───────────────────────────────────────────────
// Functional descriptor. Cormorant SC, small caps.
// Shared across personal and civilisational scale.

export const TIER_MAP = {
  10:  'World-Class',
  9.5: 'Exemplar+',
  9:   'Exemplar',
  8.5: 'Fluent+',
  8:   'Fluent',
  7.5: 'Capable+',
  7:   'Capable',
  6.5: 'Functional+',
  6:   'Functional',
  5.5: 'Plateau+',
  5:   'Plateau',
  4.5: 'Friction+',
  4:   'Friction',
  3.5: 'Strain+',
  3:   'Strain',
  2.5: 'Crisis+',
  2:   'Crisis',
  1.5: 'Emergency+',
  1:   'Emergency',
  0.5: 'Emergency−',
  0:   'Ground Zero',
}

// ── Descriptive labels ────────────────────────────────────────
// Short form. Shown inline in the picker column.
// Domain-agnostic — works for Body, Finances, Connection, Nature, Society.

export const LABEL_MAP = {
  10:  'Best in the World',
  9.5: 'Global Standard Setter',
  9:   'Master of Craft',
  8.5: 'Mature Steward',
  8:   'Seasoned Practitioner',
  7.5: 'Evolving Practitioner',
  7:   'Reliable Contributor',
  6.5: 'Rebuilding Rhythm',
  6:   'Managing the Basics',
  5.5: 'Reawakening',
  5:   'The Pass/Fail Mark',
  4.5: 'Stirring Awareness',
  4:   'Attempting to Get Off the Couch',
  3.5: 'Leaving an Indent on the Couch',
  3:   'Afraid to Look in the Mirror',
  2.5: 'Danger to Oneself',
  2:   'Barely Functioning',
  1.5: 'Hurting Real Bad / Numb',
  1:   'Almost Dead',
  0.5: 'Flickering',
  0:   'Complete Reset',
}

// ── Energetic signatures ──────────────────────────────────────
// Full description. Shown on hover in the picker, in domain panels,
// and in practitioner matching context.

export const SIGNATURE_MAP = {
  10:  'Complete coherence. Effortless mastery, luminous presence, contribution that uplifts others. The art and the artist are one.',
  9.5: 'Integrated and at ease. Leads by example; influence radiates naturally.',
  9:   'Deeply skilled, balanced, reliable. Excellence feels natural and sustainable.',
  8.5: 'Competence meets wisdom; growth through curiosity and depth.',
  8:   'Solid foundations, steady excellence, self-aware and grounded.',
  7.5: 'Consistent progress; confidence building through deliberate practice.',
  7:   'Dependable, engaged, purposeful.',
  6.5: 'Mostly consistent; stabilising habits, pacing energy.',
  6:   'Competent, responsible; maintaining, sometimes fatigued.',
  5.5: 'Curiosity stirring; ready to move again.',
  5:   'Holding steady but uninspired. The threshold between compounding and contracting. Everything above here tends to grow. Everything below here tends to contract.',
  4.5: 'Restless recognition that change is due.',
  4:   'Desire present, momentum low. You can see the gap. You just haven\'t stood up yet.',
  3.5: 'Inconsistent, overwhelmed. The couch has your shape in it. Starting to notice that.',
  3:   'Energy collapsed inward; fear or shame active. Needs rest, not force.',
  2.5: 'High stress, low support; survival instincts active.',
  2:   'Basics unmet, clarity lost; exhaustion or anxiety chronic.',
  1.5: 'Alternating between intensity and shutdown.',
  1:   'Spiritually or emotionally collapsed. The light is still on but barely.',
  0.5: 'The last signal before silence. Still here.',
  0:   'End of a cycle. Stillness before rebirth.',
}

// ── Score colour ──────────────────────────────────────────────
// Consistent colour coding across all uses of the scale.

export function getScoreColor(n) {
  if (n >= 8)   return '#3B6B9E'   // blue    — advancing / fluent / world-class
  if (n >= 6.5) return '#5A8AB8'   // mid blue — functional / capable
  if (n >= 5)   return '#8A8070'   // warm grey — the line / plateau
  if (n >= 3)   return '#8A7030'   // amber    — friction / strain
  return '#8A3030'                  // deep red  — crisis / emergency / ground zero
}

// ── Qualitative band ──────────────────────────────────────────
// Five-band summary used in domain panel headers and gap signal.

export function getQualitativeBand(score) {
  if (score <= 0)  return { label: 'Ground Zero', description: 'End of a cycle. Stillness before rebirth.' }
  if (score < 2)   return { label: 'Emergency',   description: 'Systems failing. Immediate intervention required.' }
  if (score < 3)   return { label: 'Crisis',      description: 'Structural breakdown. Significant damage underway.' }
  if (score < 5)   return { label: 'Strain',      description: 'Under serious pressure. Movement is possible but costly.' }
  if (score === 5) return { label: 'The Pass/Fail Mark', description: 'The threshold between compounding and contracting.' }
  if (score < 6.5) return { label: 'Functional',  description: 'Working. Not yet thriving.' }
  if (score < 8)   return { label: 'Capable',     description: 'Meaningful progress. Real momentum building.' }
  if (score < 9.5) return { label: 'Fluent',      description: 'Near the horizon. Excellence is consistent.' }
  return                  { label: 'Exemplar',    description: 'At the edge of what is currently imaginable. The next horizon is visible.' }
}

// ── Horizon note ──────────────────────────────────────────────
// Shown at World-Class / Exemplar+ to hold the horizon truth.

export const HORIZON_NOTE = '10 is best in the world. Choose it if you mean it — heavy sits the crown.'
