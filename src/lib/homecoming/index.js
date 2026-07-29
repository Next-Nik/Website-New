// src/lib/homecoming/index.js
//
// The Homecoming engine — public surface.
//
// PORTABLE BY DESIGN, exactly like src/lib/care/. Nothing in this directory
// imports from the NextUs app, from Supabase, or from React. It is pure data
// (the six moves, the four posts, the states, the copy) plus pure functions
// (the guard predicates and the evidence math). Placement is only ever a
// question of "where does this ship next", never a rewrite. No ephemeris here,
// so no code-split is needed — it is light.

export { POSTS, POSTS_BY_ID, postForDay, postIndexOf } from './posts'
export { STATES, STATES_BY_ID, FROZEN } from './states'
export { MOVES, MOVES_BY_ID, SCENE_ONE, THREE_QUESTIONS, REACH_FOR_A_PERSON, SAFETY } from './session'
export { dayKey, isDoneToday, returnsToday, repDaysInWindow } from './guards'
export { setpointTrend, trendDirection, evidenceSummary } from './evidence'
export { PLACEMENT, PLACEMENT_IDS, composePlacement, REACH_COPY } from './placement'

export const ENGINE_VERSION = '1.1.0'
