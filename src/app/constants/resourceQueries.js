// ─────────────────────────────────────────────────────────────
// resourceQueries.js
//
// Per-(domain × band) query templates for Layer B web sourcing.
// Authored once, reviewed deliberately, locked. Free-form generation
// by an LLM is NOT the model here — this file is the editorial layer
// that decides what we ask the open web for, and per which sources
// the search proxy will accept results from.
//
// Update process:
//   1. Edit the templates or allowlists below.
//   2. Note the change in api/README-self-resources-search.md.
//   3. Bump the cache key suffix at the bottom so old cached responses
//      do not mask the new query shape.
// ─────────────────────────────────────────────────────────────

// ── Source allowlist ─────────────────────────────────────────
//
// Domains we trust as starting points for "from the open web" suggestions.
// Mix of: research universities, peer-reviewed journals, established
// general-interest outlets with named-byline editorial standards, official
// author / org sites, and major book and talk platforms.
//
// This is the v1 list. Step 5 (sensitive-topic doctrine) tightens the
// allowlist for sensitive queries; that tighter subset is exported below
// as SENSITIVE_ALLOWLIST.
//
export const SOURCE_ALLOWLIST = [
  // Universities and research institutes
  'edu',  // any .edu — broad-stroke trust signal
  'harvard.edu', 'mit.edu', 'stanford.edu', 'berkeley.edu', 'yale.edu',
  'oxford.ac.uk', 'cam.ac.uk', 'lse.ac.uk', 'utoronto.ca',
  'greatergood.berkeley.edu',
  'positivepsychology.org',

  // Government health and research bodies
  'nih.gov', 'cdc.gov', 'samhsa.gov', 'health.gov', 'hhs.gov',
  'who.int', 'nice.org.uk',

  // Major peer-reviewed and clinical platforms
  'nature.com', 'science.org', 'cell.com', 'pnas.org',
  'thelancet.com', 'nejm.org', 'bmj.com', 'jamanetwork.com',
  'apa.org', 'psychologytoday.com',
  'ncbi.nlm.nih.gov', 'pubmed.gov',

  // Established general-interest outlets with editorial standards
  'theatlantic.com', 'nytimes.com', 'newyorker.com', 'theguardian.com',
  'aeon.co', 'wired.com', 'economist.com', 'ft.com', 'bbc.com',
  'npr.org', 'pbs.org',
  'hbr.org', 'mckinsey.com',

  // Major book platforms (publisher pages preferred over retailer pages)
  'penguinrandomhouse.com', 'penguin.co.uk', 'harpercollins.com',
  'simonandschuster.com', 'macmillan.com', 'us.macmillan.com',
  'hachettebookgroup.com', 'beacon.org', 'soundstrue.com', 'shambhala.com',
  'workman.com', 'basicbooks.com',

  // Talk and lecture platforms
  'ted.com', 'longnow.org',

  // Author / practitioner orgs we already trust at the curated layer
  'gottman.com', 'self-compassion.org', 'feelinggood.com',
  'jamesclear.com', 'calnewport.com', 'austinkleon.com',
  'nonviolentcommunication.com', 'besselvanderkolk.com',
  'peterattiamd.com', 'yourmoneyoryourlife.com', 'bogleheads.org',
  '988lifeline.org',

  // Open access and reputable archives
  'plos.org', 'doi.org',
]

// ── Sensitive-topic tightening ───────────────────────────────
//
// When a query is flagged sensitive (the panel will set the
// `sensitive=1` query param), the proxy restricts results to this
// narrower subset. The trade is: we lose long-tail recall and we
// gain confidence that nothing flammable comes through Layer B
// without editorial review.
//
export const SENSITIVE_ALLOWLIST = [
  'edu', 'gov',
  'harvard.edu', 'mit.edu', 'stanford.edu', 'berkeley.edu', 'yale.edu',
  'oxford.ac.uk', 'cam.ac.uk', 'lse.ac.uk',
  'greatergood.berkeley.edu',
  'nih.gov', 'cdc.gov', 'samhsa.gov', 'who.int', 'nice.org.uk',
  'nature.com', 'science.org',
  'thelancet.com', 'nejm.org', 'bmj.com', 'jamanetwork.com',
  'apa.org',
  'theatlantic.com', 'nytimes.com', 'newyorker.com', 'theguardian.com',
  'aeon.co', 'npr.org', 'pbs.org',
  'gottman.com', 'self-compassion.org',
  '988lifeline.org',
]

// ── Query templates ──────────────────────────────────────────
//
// Per (domain, band). Each template returns a Brave-compatible query
// string. Templates lean on stable phrases (e.g. "evidence-based",
// "longitudinal research", named experts) rather than transient
// SEO-bait language. Crisis-band templates point at qualified support.
//
// The user's own current/horizon scores are NOT inserted into queries.
// Queries are deliberately generic per band — we are not personalising
// in any way that would make the suggestions individually identifying.
//
// `band` may be null when the user has not placed the domain. In that
// case we fall back to a band-neutral default tilted toward beginners.

const T = {
  // ── PATH ────────────────────────────────────────────────
  path: {
    crisis:   'finding meaning in difficult times Frankl evidence-based',
    friction: 'finding life purpose evidence-based first steps',
    plateau:  'midlife purpose research vocational discernment',
    capable:  'integrating purpose meaningful work psychological research',
    fluent:   'callings vocational mastery psychological research',
    _default: 'finding meaning and purpose evidence-based',
  },

  // ── SPARK ───────────────────────────────────────────────
  spark: {
    crisis:   'burnout recovery evidence-based stress cycle',
    friction: 'building daily energy and joy research-based',
    plateau:  'overcoming hedonic adaptation research',
    capable:  'flow state research practical application',
    fluent:   'awe wonder peak experiences psychological research',
    _default: 'building vitality and joy evidence-based',
  },

  // ── BODY ────────────────────────────────────────────────
  body: {
    crisis:   'mental health crisis support how to get help',
    friction: 'beginner sustainable exercise habit formation evidence-based',
    plateau:  'breaking exercise plateau research-based protocols',
    capable:  'longevity healthspan evidence-based protocols',
    fluent:   'advanced training recovery sleep optimisation research',
    _default: 'foundations of physical health evidence-based',
  },

  // ── FINANCES ────────────────────────────────────────────
  finances: {
    crisis:   'getting out of debt nonprofit credit counselling',
    friction: 'personal finance basics evidence-based bogleheads',
    plateau:  'financial independence research index investing',
    capable:  'asset allocation tax efficient investing research',
    fluent:   'financial independence philosophy psychology of money',
    _default: 'evidence-based personal finance foundations',
  },

  // ── CONNECTION ──────────────────────────────────────────
  connection: {
    crisis:   'social isolation loneliness public health resources',
    friction: 'building friendships adult research-based',
    plateau:  'long-term relationship maintenance Gottman research',
    capable:  'cross-difference communication evidence-based',
    fluent:   'community building social fabric research',
    _default: 'building healthy relationships evidence-based',
  },

  // ── INNER GAME ──────────────────────────────────────────
  inner_game: {
    crisis:   'mental health support self-compassion crisis resources',
    friction: 'self-compassion practice Kristin Neff evidence-based',
    plateau:  'cognitive behavioural therapy self-help workbook',
    capable:  'identity work psychological research',
    fluent:   'mature ego development research',
    _default: 'self-compassion and inner work evidence-based',
  },

  // ── SIGNAL ──────────────────────────────────────────────
  signal: {
    crisis:   'overcoming anxiety about being seen evidence-based',
    friction: 'public speaking fundamentals research-based',
    plateau:  'building an audience writing research',
    capable:  'craft of nonfiction writing speaking',
    fluent:   'mastery in communication craft',
    _default: 'authentic self-expression evidence-based',
  },
}

// ── Sensitive-topic markers ──────────────────────────────────
//
// Per the brief Section 6.1, certain sub-domains and topic markers
// flip Layer B into restricted mode (SENSITIVE_ALLOWLIST + topic-
// specific framing). The panel can pass a `topicMarker` query param
// which the proxy looks up here.
//
// Initial v1 list. Expand as we encounter cases that should be flagged.
//
export const SENSITIVE_TOPIC_MARKERS = new Set([
  'gender-dynamics',
  'race-tolerance',
  'religious-pluralism',
  'sexuality',
  'gender-identity',
  'trauma',
  'addiction-recovery',
  'mental-health-crisis',
  'parenting-philosophy',
  'political-bridge-building',
  'class-economic-difference',
  'end-of-life-grief',
])

// ── Template lookup ──────────────────────────────────────────
//
// Returns a Brave-compatible query string for the (domain, band) pair,
// or null when domain is unknown.
//
export function templateFor(domainId, band) {
  if (!domainId || !T[domainId]) return null
  const map = T[domainId]
  if (!band) return map._default
  return map[band] || map._default
}

// ── Cache key version ────────────────────────────────────────
//
// Bump this whenever templates or allowlists change so old Vercel
// edge cache entries are not served against the new query shape.
//
export const QUERY_CACHE_VERSION = 'v1'
