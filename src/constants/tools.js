// ─────────────────────────────────────────────────────────────
// TOOLS — Canonical tool definitions
// Single source of truth for tool names, paths, and metadata.
// Used by: ToolCompassPanel, ToolDrawer, NextUsSelf, any future
// surface that lists or links to tools.
//
// When a tool is renamed or rerouted, change it here only.
// ─────────────────────────────────────────────────────────────

export const TOOLS = [
  {
    key:      'horizon-state',
    label:    'Horizon State',
    eyebrow:  'Ground first',
    subtitle: 'Daily regulation practice',
    path:     '/tools/horizon-state',
    desc:     'Regulated baseline. The floor beneath everything.',
    hook:     'Regulated nervous system first. A guided audio practice that builds the internal floor everything else runs on.',
    anchor:   'horizon-state',
  },
  {
    key:      'map',
    label:    'The Map',
    eyebrow:  'See the whole',
    subtitle: "See where you are. Set where you're going.",
    path:     '/tools/map',
    desc:     'Seven domains. An honest read of where you are.',
    hook:     "A scored picture of your life across seven domains. See where you are. Set where you're going.",
    anchor:   'map',
  },
  {
    key:      'purpose-piece',
    label:    'Purpose Piece',
    eyebrow:  'Know your role',
    subtitle: 'Your role, your domain, your scale',
    path:     '/tools/purpose-piece',
    desc:     'Your contribution archetype, domain, and scale.',
    hook:     "Surfaces the natural role you're built to play — archetype, domain, scale. The contribution coordinates.",
    anchor:   'purpose-piece',
  },
  {
    key:      'target-sprint',
    label:    'Target Sprint',
    eyebrow:  'Build momentum',
    subtitle: '90-day focused goal plan',
    path:     '/tools/target-sprint',
    desc:     'Ninety days. Three areas. A clear level-up.',
    hook:     'Three domains. Ninety days. A sprint goal with identity, milestones, and weekly structure built in.',
    anchor:   'target-sprint',
  },
  {
    key:      'horizon-practice',
    label:    'Horizon Practice',
    eyebrow:  'Become',
    subtitle: 'Daily becoming practice',
    path:     '/tools/horizon-practice',
    desc:     'The daily return. T.E.A. practice, skill development, and thought loop work.',
    hook:     'T.E.A. daily practice, skill development, and thought loop work toward your Horizon Self.',
    anchor:   'horizon-practice',
  },
]

// Keyed lookup for direct access by tool key
export const TOOLS_BY_KEY = Object.fromEntries(TOOLS.map(t => [t.key, t]))
