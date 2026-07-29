// src/lib/homecoming/posts.js
//
// The reassigned protector posts — the league of seven guardians (see the
// Guardian Team brief and Protector_Reassignment_Covenant.md). Protectors are
// promoted, not cleared: each keeps its original intent (keep him safe and
// good) with a strategy that lets the good things arrive. Voice is invitational
// and forward — the vow names what the guardian moves toward.
//
// `decl` renders with a <b>and</b> as the emphasised pivot. `color` is a
// semantic key the renderer maps to a design token.
//
// PORTABLE: pure data. No app / Supabase / React imports.

export const POSTS = [
  {
    id: 'alchemist', role: 'The Alchemist', domain: 'Wealth & flow', color: 'gold',
    decl: 'I will keep money flowing toward me <b>and</b> hold it with an open hand. Keeping me flush is keeping me safe.',
    steady: 'Money is handled, and it can come. I can ease the grip.',
    gripping: 'Lock it down or it vanishes.',
  },
  {
    id: 'triad', role: 'The Triad', domain: 'The body', color: 'moss',
    decl: 'I will tend this body daily and easy <b>and</b> trust it to carry me the long way. Strong, mobile, here for the decades.',
    steady: 'The body is cared for. I can train gently and rest.',
    gripping: 'Push it hard or it falls apart.',
  },
  {
    id: 'witness', role: 'The Witness', domain: 'Worth', color: 'moss',
    decl: 'I will let the evidence land <b>and</b> receive the good already said about me. Worth grows by being received.',
    steady: 'The proof is in. I can let it in.',
    gripping: 'Prove it again — it never quite counts.',
  },
  {
    id: 'sovereign', role: 'The Sovereign', domain: 'Full presence', color: 'gold',
    decl: 'I will take up my whole space <b>and</b> let my size be used in service. Fully here, without apology.',
    steady: 'There is room for all of me. I can fill it.',
    gripping: 'Shrink — take less, do not be too much.',
  },
  {
    id: 'gentle_titan', role: 'The Gentle Titan', domain: 'Power in service', color: 'clay',
    decl: 'I will be big <b>and</b> kind, my certainty used to lift, never as a weapon. Strong with a gentle hand.',
    steady: 'My power is safe to hold. I can be certain and warm.',
    gripping: 'Hold it back, or you become them.',
  },
  {
    id: 'heart_star', role: 'Heart Star', domain: 'The open heart', color: 'clay',
    decl: 'I will keep my heart open to the world <b>and</b> love freely without it costing me. Open, not walled.',
    steady: 'The heart is safe to keep open. Love can flow both ways.',
    gripping: 'Guard the chest — do not let it show.',
  },
  {
    id: 'companion', role: 'The Companion', domain: 'The beloved', color: 'clay',
    decl: 'I will let love in <b>and</b> stay in the room, giving and receiving in equal measure. A partnership worth staying for.',
    steady: 'Love is welcome here, and I can stay for it.',
    gripping: 'Leave first, before this can hurt.',
  },
]

export const POSTS_BY_ID = Object.fromEntries(POSTS.map(p => [p.id, p]))

// Rotate through the league by day, deterministically (same day, same guardian).
export function postForDay(dayIndex) {
  return POSTS[((dayIndex % POSTS.length) + POSTS.length) % POSTS.length]
}

// Index of a guardian by id, for opening Reassign on the Placement's pick.
export function postIndexOf(id) {
  const i = POSTS.findIndex(p => p.id === id)
  return i < 0 ? 0 : i
}
