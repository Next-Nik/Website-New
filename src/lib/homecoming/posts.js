// src/lib/homecoming/posts.js
//
// The four reassigned protector posts, from Protector_Reassignment_Covenant.md.
// The premise: protectors are promoted, not cleared. Each post honours the same
// original intent (keep him safe and good) with a strategy that lets the good
// things arrive. Voice is invitational and forward — the declaration names what
// the protector moves toward, not what it stops doing.
//
// PORTABLE: pure data. No app / Supabase / React imports.

export const POSTS = [
  {
    id: 'solvency',
    role: 'Solvency Guardian',
    // `decl` renders with <b> spans as the emphasised AND-pivot.
    decl: 'I will keep money flowing toward me <b>and</b> hold it with an open hand. Keeping me flush is keeping me safe — that’s your post.',
    steady: 'Money is handled, and it can come. You can relax your grip.',
    gripping: 'I have to lock it down or it disappears.',
  },
  {
    id: 'connection',
    role: 'Connection Keeper',
    decl: 'I will keep the door open <b>and</b> let people find me as I am. When the quiet stretches long, turn me toward people.',
    steady: 'The door is open and people are drawn in. I can ease off.',
    gripping: 'I have to keep them close or they leave.',
  },
  {
    id: 'love',
    role: 'Love Steward',
    decl: 'I will let love in <b>and</b> stay in the room, chest open, long enough to let it land. When love comes close, keep me here.',
    steady: 'Love is welcome here, and I can stay for it.',
    gripping: 'Leave first, before this can hurt.',
  },
  {
    id: 'joy',
    role: 'Joy Defender',
    decl: 'I will protect my joy <b>and</b> hold it lightly, trusting it to stay. When the good thing lands, stand at the window and let it in.',
    steady: 'The joy is safe to keep. I can let it in.',
    gripping: 'Brace — this is about to be taken.',
  },
]

export const POSTS_BY_ID = Object.fromEntries(POSTS.map(p => [p.id, p]))

// Rotate through the four by day so each Return surfaces a different post,
// deterministically (no randomness — same day, same post).
export function postForDay(dayIndex) {
  return POSTS[((dayIndex % POSTS.length) + POSTS.length) % POSTS.length]
}
