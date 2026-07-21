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
    label:    "Let's Talk",
    eyebrow:  'Start here',
    subtitle: 'Talk it through with North Star',
    path:     '/tools/nextsteps',
    desc:     'Tell North Star what is going on in your life or an area of focus for you, and they will see if they can point you at some next steps and resources.',
    hook:     'The entry conversation. Talk it through with North Star and let them point you at the next step.',
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
    label:    'The Practice',
    eyebrow:  'Become',
    subtitle: 'Daily becoming practice',
    path:     '/tools/horizon-practice',
    desc:     'A daily ritual that anchors you into your life from the place of the you that you are choosing to be. When you are ready, turn the focus up and run a 90-day Sprint.',
    hook:     'Daily T.E.A. practice, skill development, and thought-loop work toward your Horizon Self. Contains Sprint as the turn-up-the-focus mode.',
    anchor:   'horizon-practice',
  },
]

// Keyed lookup for direct access by tool key
export const TOOLS_BY_KEY = Object.fromEntries(TOOLS.map(t => [t.key, t]))
