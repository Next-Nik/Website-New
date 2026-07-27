// src/lib/homecoming/states.js
//
// The felt-state map for Move 1 (Land), from the Homecoming state map. Four
// states, held in LADDER order (summit to floor): Lit Up, Relaxed, Wired,
// Collapsed. Naming a state settles it — affect labelling, the nervous system
// quieting as soon as a word lands on it.
//
// Each state carries its Polyvagal term as the quiet subtitle for the tap. The
// somatic word (expansive/receptive/constricted/closed) and the energy/safety
// coordinates are here too, for a "read deeper" view and for the square layout,
// rather than the tap itself.
//
// `color` is a semantic key the renderer maps to design tokens (gold/moss/clay,
// and a neutral for slate) — this file imports nothing, staying portable.
//
// PORTABLE: pure data.

export const STATES = [
  {
    id: 'lit_up', label: 'Lit Up', rung: 4,
    energy: 'high', safe: true, color: 'gold',
    polyvagal: 'ventral · mobilised', soma: 'expansive',
    desc: 'Home, lit. Sparked, radiant, giving out. Energy that isn’t a threat response.',
  },
  {
    id: 'relaxed', label: 'Relaxed', rung: 3,
    energy: 'low', safe: true, color: 'moss',
    polyvagal: 'ventral · rest', soma: 'receptive',
    desc: 'Home, quiet, open. Soft, safe, nothing to defend. Where a good thing gets to land.',
  },
  {
    id: 'wired', label: 'Wired', rung: 2,
    energy: 'high', safe: false, color: 'clay',
    polyvagal: 'sympathetic', soma: 'constricted',
    desc: 'Guarded, lit, braced. Scanning, mobilised. Energy is back, safety isn’t yet.',
  },
  {
    id: 'collapsed', label: 'Collapsed', rung: 1,
    energy: 'low', safe: false, color: 'slate',
    polyvagal: 'dorsal · shut down', soma: 'closed',
    desc: 'Guarded, quiet, shut. Flat, foggy, withdrawn. The body pulled the plug to keep you safe.',
  },
]

// The freeze overlap (sympathetic and dorsal firing at once) — named, but held
// off the tap: it is the both-at-once state, not a rung on the ladder.
export const FROZEN = {
  id: 'frozen', label: 'Frozen', polyvagal: 'sympathetic + dorsal',
  desc: 'Both at once — high tension held still. The gas and the brake together.',
}

export const STATES_BY_ID = Object.fromEntries(STATES.map(s => [s.id, s]))
