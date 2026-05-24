// ─────────────────────────────────────────────────────────────
// TOOLS — Canonical tool definitions
// Single source of truth for tool names, paths, and metadata.
// Used by: ToolCompassPanel, ToolDrawer, NextUsSelf, any future
// surface that lists or links to tools.
//
// When a tool is renamed or rerouted, change it here only.
//
// `desc` carries the hospitable, benefit-led one-liner used on
// the public marketing surface and in the tool drawer.
// `hook` carries the longer, more architectural framing used on
// deeper surfaces inside the platform.
// ─────────────────────────────────────────────────────────────

export const TOOLS = [
  {
    key:      'nextsteps',
    label:    'NextSteps',
    eyebrow:  'Start here',
    subtitle: 'Turn caring into a step',
    path:     '/tools/nextsteps',
    desc:     'Feeling stuck? Get personalised guidance on what to focus on next based on where you are right now.',
    hook:     'When something is gripping you and you do not know what to do with it. NextSteps takes the fire, gives it a direction, and produces your next move.',
    anchor:   'nextsteps',
    featured: true,
  },
  {
    key:      'horizon-state',
    label:    'Horizon State',
    eyebrow:  'Ground first',
    subtitle: 'Daily regulation practice',
    path:     '/tools/horizon-state',
    desc:     'Calm your nervous system in 20 minutes. A guided daily audio practice to help you feel grounded, focused, and steady.',
    hook:     'Regulated nervous system first. A guided audio practice that builds the internal floor everything else runs on.',
    anchor:   'horizon-state',
  },
  {
    key:      'map',
    label:    'The Map',
    eyebrow:  'See the whole',
    subtitle: "See where you are. Set where you're going.",
    path:     '/tools/map',
    desc:     "See what's working — and what needs attention. Assess the seven core areas of your life and create a clearer path forward.",
    hook:     "A scored picture of your life across seven domains. See where you are. Set where you're going.",
    anchor:   'map',
  },
  {
    key:      'purpose-piece',
    label:    'Purpose Piece',
    eyebrow:  'Know your role',
    subtitle: 'Your role, your domain, your scale',
    path:     '/tools/purpose-piece',
    desc:     "Your life's purpose shapes how you show up. Find the work you're built for — your role, your domain, your scale.",
    hook:     "Surfaces the natural role you're built to play — archetype, domain, scale. The contribution coordinates.",
    anchor:   'purpose-piece',
  },
  {
    key:      'target-sprint',
    label:    'Target Stretch',
    eyebrow:  'Build momentum',
    subtitle: '90-day focused goal plan',
    path:     '/tools/target-sprint',
    desc:     'A focused plan. Real results. Ninety days to a new chapter — set clear goals and level up.',
    hook:     'Three domains. Ninety days. A goal with identity, milestones, and weekly structure built in.',
    anchor:   'target-sprint',
  },
  {
    key:      'horizon-practice',
    label:    'Horizon Practice',
    eyebrow:  'Become',
    subtitle: 'Daily becoming practice',
    path:     '/tools/horizon-practice',
    desc:     'Build better habits, one day at a time. Your daily skill development practice.',
    hook:     'T.E.A. daily practice, skill development, and thought loop work toward your Horizon Self.',
    anchor:   'horizon-practice',
  },
]

// Keyed lookup for direct access by tool key
export const TOOLS_BY_KEY = Object.fromEntries(TOOLS.map(t => [t.key, t]))
