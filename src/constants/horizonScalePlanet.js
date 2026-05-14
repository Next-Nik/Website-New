// ─────────────────────────────────────────────────────────────
// Horizon Scale — Planet (Civilisational) constants
// Companion to horizonScale.js (personal scale)
//
// Same 21-point architecture, same tier labels.
// Descriptive labels and energetic signatures rewritten
// for civilisational domain / actor assessment context.
//
// The personal scale asks: "where am I?"
// The planet scale asks: "where is this domain / actor?"
//
// Below 5: dorsal vagal register — freeze, collapse, shutdown.
// Above 5: building, contributing, thriving toward Horizon Goal.
//
// Locked: May 2026
// ─────────────────────────────────────────────────────────────

// Tier labels are shared with the personal scale — imported from horizonScale.js
// This file provides only the planet-specific descriptive and signature layers.

export const PLANET_LABEL_MAP = {
  10:  'Best in the World',
  9.5: 'Global Standard Setter',
  9:   'Master of the Domain',
  8.5: 'Mature Steward',
  8:   'Seasoned Contributor',
  7.5: 'Evolving Contributor',
  7:   'Reliable Actor',
  6.5: 'Rebuilding Momentum',
  6:   'Managing the Basics',
  5.5: 'Reawakening',
  5:   'The Pass/Fail Mark',
  4.5: 'Stirring Awareness',
  4:   'Frozen but Aware',
  3.5: 'Deeper Freeze',
  3:   'Shutdown',
  2.5: 'Danger to the System',
  2:   'Barely Functioning',
  1.5: 'Deep Numbness',
  1:   'Almost Gone',
  0.5: 'Flickering',
  0:   'Complete Reset',
}

export const PLANET_SIGNATURE_MAP = {
  10:  'Complete systemic coherence. The domain is regenerating, the work is exemplary, and the impact uplifts adjacent domains. The model and the mission are one.',
  9.5: 'Integrated and at scale. Sets the benchmark others navigate by; influence radiates into the field naturally.',
  9:   'Deeply effective, structurally sound, reliably impactful. Excellence in this domain feels natural and sustainable.',
  8.5: 'Competence meets wisdom; growth through systemic curiosity and long-arc thinking.',
  8:   'Solid foundations, steady progress, clear-eyed about what the domain needs.',
  7.5: 'Consistent movement; confidence building through deliberate, evidence-backed work.',
  7:   'Dependable, engaged, purposeful. Does what it says it does.',
  6.5: 'Mostly consistent; stabilising systems, pacing for the long haul.',
  6:   'Competent, responsible; maintaining ground, sometimes fatigued by scale.',
  5.5: 'Curiosity stirring at the domain level; readiness to move again becoming visible.',
  5:   'Holding ground but not gaining it. The threshold between compounding progress and compounding stagnation. Everything above here tends to build. Everything below here tends to erode.',
  4.5: 'Restless recognition in the field that change is overdue.',
  4:   'The gap is seen. The system cannot yet move toward it.',
  3.5: 'Awareness contracting. Overwhelm displacing action. The field is going quiet.',
  3:   'Energy collapsed inward. Denial or dissociation active. Needs stabilisation, not more pressure.',
  2.5: 'Survival responses dominant. Coordination has broken down.',
  2:   'Foundational conditions failing. Chronic dysfunction. No clear path visible from inside.',
  1.5: 'Alternating between acute crisis and total shutdown. The field has stopped feeling it.',
  1:   'Systemic collapse underway. The signal is still there but barely.',
  0.5: 'The last indicators before silence. Still here.',
  0:   'End of a cycle. The conditions for this domain to exist have been destroyed. Stillness before reconstruction.',
}

// ── Intro copy — shown at the top of the modal ───────────────
export const PLANET_INTRO = {
  eyebrow: 'NextUs Atlas',
  title:   'The Horizon Scale',
  subtitle: 'Civilisational calibration · 0–10',
  body: [
    'Each domain of civilisation is assessed against this scale. The scale has two zones separated by The Pass/Fail Mark at 5. Above it, a domain is building — compounding toward its Horizon Goal. Below it, the domain is in contraction — losing ground.',
    'Below 5, the system is not failing from lack of effort. It has gone into freeze. The response is stabilisation, not acceleration.',
  ],
  aboveLine: { label: 'Building', note: 'above The Pass/Fail Mark — compounding toward the Horizon Goal' },
  belowLine: { label: 'Contracting', note: 'below The Pass/Fail Mark — freeze, stabilisation required' },
  footer: 'Any domain below 5 is actively consuming more than it generates. Pressure without stabilisation makes it worse.',
}
