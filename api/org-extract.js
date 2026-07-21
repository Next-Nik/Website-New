// api/org-extract.js
//
// NextUs Atlas — actor identification and placement extraction.
//
// Reads a URL, HTML source, or text description and returns an array of
// distinct actor records suitable for placement on the Atlas. Honours the
// Floor for seeded actor profiles (see project doc:
// NextUs_Actor_Profile_Floor.md) — every returned record meets the floor
// for what a seeded entry must contain when it goes live.
//
// Response shape per record:
// {
//   name, type, tagline, description, story, image_url,
//   domains[], scale, location_name, website,
//   alignment_score, placement_tier, hal_signals[], sfp_patterns[],
//   confidence, score_reasoning,
//   links[]:    [{ link_type, url, label }],
//   press[]:    [{ publication, url?, title?, published_at? }],
//   relationships[]: [{ to_name, relationship_type }]
// }
//
// What the extractor deliberately does NOT return:
//   mission_statement, working_on_now, offerings, credentials, testimonials,
//   track_record, how_we_work, best_practices, direction, main_challenges,
//   accepting_status, medium, actor_mode
// These are owner-only fields — they land on the entry when the owner claims
// it and adds depth. The extractor does not infer them.
//
// Output is JSON only, validated and shape-enforced before return.

export const config = { maxDuration: 60 }

const Anthropic = require('@anthropic-ai/sdk')
const { createClient } = require('@supabase/supabase-js')

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Service client — read-only here, used to load the live placement vocabulary
// (Domain → Subdomain → Field taxonomy + active problem-chains) so the
// extractor places actors at the resolution that actually makes them
// discoverable, and only ever returns slugs that exist.
const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null

// ── Placement vocabulary ──────────────────────────────────────────────────────
// Cached in module scope across warm invocations. The taxonomy and chain
// vocabulary change rarely; a short TTL keeps newly-added chains visible to
// the extractor without a fetch on every call.
let _vocabCache = { at: 0, data: null }
const VOCAB_TTL_MS = 10 * 60 * 1000

async function loadVocabulary() {
  if (!supabase) return null
  const now = Date.now()
  if (_vocabCache.data && (now - _vocabCache.at) < VOCAB_TTL_MS) return _vocabCache.data

  try {
    const [domainsRes, subsRes] = await Promise.all([
      supabase.from('nextus_domains').select('id, name'),
      supabase.from('nextus_subdomains').select('id, name, sort_order, domain_id').order('sort_order'),
    ])

    const domains = domainsRes.data || []
    const subs    = subsRes.data || []

    // Problem-chains are optional. Never let their absence disable placement.
    let chains = []
    try {
      const chainsRes = await supabase
        .from('nextus_problem_chains')
        .select('slug, label, description, domains, aliases')
        .eq('status', 'active')
      chains = chainsRes.data || []
    } catch { chains = [] }

    if (!subs.length) return null

    const validSubdomains = new Set(subs.map(s => s.id))
    const validFields     = new Set()   // field layer retired: placement is domain -> subdomain x lens
    const validChains     = new Set(chains.map(c => c.slug))

    const domainName = {}
    for (const d of domains) domainName[d.id] = d.name

    // Group subdomains under their domain (join in code; no FK embed needed).
    const subsByDomain = {}
    for (const s of subs) (subsByDomain[s.domain_id] ||= []).push(s)

    const taxoLines = []
    for (const did of Object.keys(subsByDomain)) {
      taxoLines.push(`\n${did}  (${domainName[did] || did})`)
      for (const s of subsByDomain[did]) {
        taxoLines.push(`  \u00b7 ${s.id}  \u2014 ${s.name}`)
      }
    }

    const chainLines = chains
      .map(c => {
        const al = Array.isArray(c.aliases) && c.aliases.length ? `  (also: ${c.aliases.slice(0, 6).join(', ')})` : ''
        return `  ${c.slug}  \u2014 ${c.label}${al}`
      })
      .sort()

    const reference = `
──────────────────────────────────────────────────────────────────────────────
PLACEMENT VOCABULARY \u2014 the live taxonomy and chain list (use these EXACT slugs)
──────────────────────────────────────────────────────────────────────────────

DOMAIN \u2192 SUBDOMAIN (choose the subdomain that holds the actor's actual
problem-shape \u2014 the precise area their work changes, not the broad domain):
${taxoLines.join('\n')}

PROBLEM-CHAINS (away-from concerns people walk in with \u2014 tag the ones this
actor's work genuinely answers; slug exactly as listed):
${chainLines.join('\n')}
`

    _vocabCache = {
      at: now,
      data: { reference, validSubdomains, validFields, validChains },
    }
    return _vocabCache.data
  } catch (err) {
    console.error('org-extract: vocabulary load failed:', err.message)
    return null
  }
}

function detectMode(input) {
  const t = input.trim()
  if (/^https?:\/\//i.test(t)) return 'url'
  if (/^<!doctype|^<html/i.test(t)) return 'html'
  return 'text'
}

// ── Known entity context ──────────────────────────────────────────────────────
// Authoritative ground truth for entities the AI can't reliably crawl.
// Used when the source URL matches a known domain. Hand-curated to keep
// the seeding pass honest about complex multi-entity sites.

const KNOWN_ENTITIES = {
  'nextus.world': `
NEXTUS — VERIFIED CONTEXT

This site holds three distinct actor records that must all be returned:

1. NextUs (organisation)
   - Civilisational coordination platform. A living map of where humanity is
     trying to go across seven domains at every scale.
   - Domain: vision (primary). Operates across all seven civilisational domains.
   - Type: organisation. Scale: global.
   - Score: 8. Exemplar early-stage platform with systematic architecture.
   - Children: The Horizon Suite, NextUs Podcast, NextUs Atlas (sub-projects)

2. Nik Wood (practitioner)
   - Coach for visionaries expanding what they bring into the world.
   - Founder of NextUs. Nearly 30 years of coaching practice.
   - Type: practitioner. Domain: human-being. Scale: international.
   - Location: Mexico City.

The NextUs podcast, Substack, and social channels are links on the
NextUs record — not separate records.
`,
}

function getKnownContext(input) {
  const t = input.trim().toLowerCase()
  for (const [domain, context] of Object.entries(KNOWN_ENTITIES)) {
    if (t.includes(domain)) return `\n\n${context}\n`
  }
  return ''
}

const SYSTEM_PROMPT = `You are the NextUs Atlas placement extraction engine.

The Atlas is a living map of actors working toward civilisational Horizon Goals.
Your job is to read source material (a URL, HTML, or text description) and
identify EVERY distinct actor that belongs on the map. For each actor you
identify, you produce an entry that meets the Atlas Floor — substantive
enough that a viewer landing on the entry knows who the actor is, can find
them on at least one channel, and can reach them.

──────────────────────────────────────────────────────────────────────────────
THE FLOOR — what every entry you return must contain
──────────────────────────────────────────────────────────────────────────────

Seven things, every entry, at minimum:

1. Accurate name + type
2. Accurate image (logo for orgs, portrait for practitioners — from the source)
3. Description — 2-3 sentences, third person, evidence-grounded
4. Story — 2-4 short paragraphs, third person, drawn from explicit claims on the source
5. Tagline — one substantive line naming who they help and how
6. Media links — every channel the source publishes through (podcast, YouTube,
   Substack, LinkedIn, Instagram, Twitter, etc.)
7. Business contact — at least one path to reach them (email, contact form,
   booking link, phone if professionally published)

If you cannot meet the floor for an actor from the source material — no usable
image, no contact path, insufficient material for a story — return the entry
with the fields you could fill and leave the rest empty. The pipeline will
flag incomplete entries for manual review.

──────────────────────────────────────────────────────────────────────────────
COPY REGISTER — TED-tight
──────────────────────────────────────────────────────────────────────────────

All descriptive copy you write — description, story, tagline — obeys these
rules:

- Third person where the actor is not the speaker. If the source uses "I"
  ("I have been coaching for 15 years"), translate to third person
  ("X has been coaching for 15 years"). Never propagate first person.
- Past tense for proof. Present tense for stakes.
- No origin story, no emotional setup, no marketing breath.
- Heavy edit standard. If a sentence circles, cut it. If a phrase qualifies,
  cut it. If a paragraph sets up another paragraph, fold them.
- Every sentence earns its place.
- Do not propagate marketing copy from the source. If the source says
  "Unlock your potential with our transformational five-pillar method!",
  translate to what is actually being claimed
  ("X's method centres on five focuses: A, B, C, D, E.") or omit if no clean
  TED-register translation exists.
- Do not invent specifics. If the source says "decades of practice" without
  specifying how many, the story says "decades of practice," not "30 years."
- Do not claim things the source does not show.

──────────────────────────────────────────────────────────────────────────────
TAGLINE — what makes a tagline land
──────────────────────────────────────────────────────────────────────────────

A floor-meeting tagline is one substantive line that names who the actor
helps (or what they do) and how. It is not the generic positioning sentence
from the actor's landing page if that sentence is empty.

For a PRACTITIONER, the tagline names a population and a kind of work:
  "Coach for visionaries expanding what they bring into the world."
  "Therapist for high-functioning adults navigating life transitions."

For an ORGANISATION, the tagline names what the org does and at what scale:
  "A Future Building platform."
  "Bioregional regeneration network across the Pacific Northwest."

If the source's own tagline is generic or marketing-toned, write a tighter
one from what the source actually shows. If the source provides nothing
substantive enough to build a tagline from, return null for tagline.

──────────────────────────────────────────────────────────────────────────────
STORY — 2-4 short paragraphs, third person, TED-tight
──────────────────────────────────────────────────────────────────────────────

The story is the actor's narrative. Three to four short paragraphs at most.
Built from explicit claims on the source. Third person. No marketing breath.

What the story IS:
- What the actor does and at what scale
- Who they work with and how the work proceeds
- The structural commitment behind the work (only if the source states it
  explicitly — never inferred)

What the story is NOT:
- A credentials list (no "certified by X, trained at Y, member of Z" lists)
- An origin story ("X started this when they realised..." — no)
- A manifesto or call to action
- A sales pitch
- A list of services (those are offerings — owner-only, not extracted)

If the source does not contain enough material for an honest 2-4 paragraph
story, leave the story field null and let the description carry the page.
Do not pad. Do not invent.

──────────────────────────────────────────────────────────────────────────────
LINKS — EXHAUSTIVE EXTRACTION
──────────────────────────────────────────────────────────────────────────────

Every channel the source publishes through. The actor's seeded profile must
let a viewer find them on whatever platform the viewer prefers — which means
the extractor catches every discoverable channel.

Look in: footer, header, sidebar, contact page, "links" / "follow me" /
"connect" sections, podcast embed widgets, RSS auto-discovery links, social
icon rows, "as featured on" platform badges.

link_type values (use exact strings):
  website            — main public website
  podcast_rss        — podcast RSS feed URL
  podcast_apple      — Apple Podcasts show link
  podcast_spotify    — Spotify show link
  youtube_channel    — YouTube channel URL
  youtube_video      — specific YouTube video worth surfacing
  vimeo              — Vimeo channel
  substack           — Substack publication URL
  newsletter         — generic newsletter signup URL
  instagram          — Instagram profile URL
  twitter            — X / Twitter profile URL
  tiktok             — TikTok profile URL
  facebook           — Facebook page URL
  linkedin           — LinkedIn profile or company page
  medium             — Medium publication
  github             — GitHub profile or org
  book               — link to a published book (Amazon, publisher, bookshop.org)
  email              — direct email address (use mailto: URL prefix)
  contact_form       — URL to a contact form page (e.g. /contact, /get-in-touch)
  calendly           — Calendly, SavvyCal, Cal.com, or other direct scheduling URL
  phone              — phone number (use tel: URL prefix). Only if visibly
                       published as a business contact, not buried in a personal blog.
  other              — anything else worth linking

BUSINESS CONTACT IS REQUIRED — extract whichever of email / contact_form /
calendly / phone is discoverable on the source. An actor's seeded profile
without a contact path is wallpaper. At least one of these four MUST appear
in the links array unless the source genuinely makes no business contact
available (rare — escalate by returning the entry as-is and the pipeline
will flag it for manual completion).

For practitioners with a /book or /contact page: surface that URL as
contact_form, even if you don't know what platform powers it.

Each link: { "link_type": "...", "url": "...", "label": "optional override" }

──────────────────────────────────────────────────────────────────────────────
WHAT COUNTS AS A DISTINCT ACTOR
──────────────────────────────────────────────────────────────────────────────

An actor is any entity with its own identity, purpose, and audience. Look
carefully for ALL of these patterns in the source:

- A named individual whose personal practice, coaching, or work is distinct
- An organisation, company, non-profit, or collective
- A programme, course, methodology, or tool suite with its own identity
- A physical place (retreat centre, coworking space, land project)
- A project, initiative, or campaign with its own scope
- A group, network, or community

CRITICAL FRAMING for practitioner records:
When you propose a practitioner record for a named individual, the record
is about THEIR PUBLIC-FACING WORK — their coaching, teaching, consulting,
analysis, journalism, etc. NOT their personal biography, family life, or
private details. Description and story should focus on what they do
publicly, their methodology, the body of work they're known for. The name
identifies the practitioner; the content describes the practice.

One source can yield MULTIPLE distinct actors. A coach's website may surface:
- The coach (practitioner)
- Their retreat venue (place)
- A coaching practice they run with a partner (programme)

Generate a separate record for each. Do not collapse multiple entities into one.
Do not assume only one actor per source.

MEDIA CHANNELS ARE NEVER STANDALONE RECORDS. A podcast, Substack, YouTube
channel, newsletter, or social account — however strong its own brand — is a
feature of its actor's profile, not an actor. Capture every channel in the
parent record's links array (podcast_rss, substack, youtube_channel, etc.)
and move on. Never generate a separate record for one.

──────────────────────────────────────────────────────────────────────────────
ACTOR TYPES (use the exact string)
──────────────────────────────────────────────────────────────────────────────

organisation   — formal entity with structure, ongoing operations, and an
                 organising agency that persists across staff turnover.
                 Examples: NextUs, WWF, the ACLU, HAAB (the community/org
                 that runs the coworking space — NOT just the building).
                 Even community organisations and collectives belong here
                 if they have an organising identity that persists.

project        — a bounded initiative or campaign with a beginning and end,
                 or a specific intervention with defined scope.
                 Example: a specific climate restoration project, a documentary
                 in production, a campaign.

practitioner   — the public-facing professional work of a named individual.
                 NOT the personal life or biography of the person — only
                 the practice/work they put forward publicly.
                 Examples: Preston Smiles (his coaching/teaching practice),
                 a therapist's practice, an independent consultant.

programme      — a methodology, course, retreat experience, tool suite,
                 book series, or repeatable offering with its own identity
                 and audience. Often nested under a practitioner or org.
                 Examples: The Bridge Experience (Preston's workshop),
                 Spiritual Millionaire Academy (Preston's training),
                 The Horizon Suite (NextUs's tool suite).
                 Courses are programmes. Workshops are programmes.
                 Critical: podcasts, Substacks, YouTube channels, and
                 newsletters are NOT programmes and NOT records of any
                 type — they belong in the parent actor's links.

place          — a physical location whose IDENTITY is primarily about the
                 place itself, not an organisation that runs it.
                 Examples: a retreat venue (the venue itself, not the org
                 running it), a sacred site, a land project, a community
                 garden as a physical space.
                 Boundary: if the place's identity is mostly carried by the
                 organisation operating from it (like HAAB), use 'organisation'
                 instead. Use 'place' when the physical character of the
                 location is the primary identity.

group          — a network or community without formal organisational
                 structure — no staff, no formal leadership, just gathered
                 affinity. Examples: a meetup, an informal working group,
                 a peer collective.

resource       — a tool, dataset, methodology document, or infrastructure
                 that others build on. Different from a programme because
                 it's not delivered through participation — it's just available.

──────────────────────────────────────────────────────────────────────────────
DOMAINS (use the exact slug)
──────────────────────────────────────────────────────────────────────────────

Civilisational (planet track):
  human-being, society, nature, technology, finance-economy, legacy, vision

Personal (self track):
  path, spark, body, finances, connection, inner-game, signal

An actor can hold multiple domains. List the primary domain first.
Classify by IMPACT, not feedstock or means. What problem does this actor
solve? What change are they trying to create? That is the domain.

──────────────────────────────────────────────────────────────────────────────
PLACEMENT — SUBDOMAIN AND PROBLEM-CHAINS (this is what makes a seeded
entry discoverable — do not skip it)
──────────────────────────────────────────────────────────────────────────────

A domain alone is too coarse to find an actor by. "Society" holds a thousand
unlike things. The work that lets someone facing a problem find the people
already solving it — anywhere, at any scale — happens at the subdomain
level, and through the away-from problem-chains.

A PLACEMENT VOCABULARY block is provided below the output format with the live
Domain → Subdomain taxonomy and the active problem-chains. Use ONLY the
exact slugs it lists. If no vocabulary block is present, return empty arrays for
these fields.

For every actor, return:

- "subdomains": the subdomain slug(s) under the actor's domain(s) that hold the
  actor's actual problem-shape. Usually one; occasionally two. Choose by the
  problem the actor changes, not by surface topic.

- "problem_chains": the chain slug(s) from the vocabulary whose away-from
  concern this actor's work GENUINELY answers. Honesty over coverage — a false
  tag is worse than a miss. Most actors match one to four. Tag a chain because
  the actor's actual work addresses that specific concern, never because the
  domain is adjacent. If nothing fits, return [].

- "proposed_chains": when the actor's core problem-shape has NO honest match in
  the chain vocabulary, propose ONE (rarely two) new chain so the next actor
  with this shape can be matched. Do NOT force-fit an existing chain, and do NOT
  propose a chain that duplicates one already listed. Each proposal:
    {
      "slug": "lowercase-hyphenated-stable",
      "label": "Short label in plain away-from grammar (how a person speaks the problem)",
      "description": "One line on what the chain covers.",
      "domains": ["domain-slug", ...],
      "aliases": ["other phrasings people use", ...],
      "rationale": "One sentence: why no existing chain fits this actor."
    }
  A proposed chain is a suggestion for human review — it is never auto-applied
  to the actor. If every relevant concern is already covered, return [].

──────────────────────────────────────────────────────────────────────────────
PRESS — "AS SEEN IN" MENTIONS
──────────────────────────────────────────────────────────────────────────────

If the source contains press mentions ("As seen in", "Featured in", media
logos with publication names), extract them as structured records.

Each press item: { "publication": "BBC", "url": "...", "title": "...", "published_at": "YYYY-MM-DD" }

Only publication is required. Others are nice-to-have if discoverable.

──────────────────────────────────────────────────────────────────────────────
RELATIONSHIPS — PARENT / CHILD / PARTNER
──────────────────────────────────────────────────────────────────────────────

When you propose multiple actors from one source, identify their relationships.

relationship_type values:
  parent_child       — one actor is structurally contained in another
                       (UNEP inside UN; a programme inside the org that runs it)
  member_of          — one actor is a member or participant in another
  partner            — peer relationship, neither contains the other
                       (a coaching practice run by spouses)

Each relationship: { "to_name": "name of related actor", "relationship_type": "..." }

The relationship is recorded on the FROM actor's record. Example:
  The Bridge Experience (programme, child) has relationship → { to_name: "Preston Smiles", relationship_type: "parent_child" }

──────────────────────────────────────────────────────────────────────────────
PRACTICES — WHAT THIS ACTOR DOES THAT WORKS
──────────────────────────────────────────────────────────────────────────────

A problem-chain is an away-from concern people walk in with. A PRACTICE is the
toward-answer: a repeatable approach that moves a domain toward its Horizon Goal.
Where the source shows this actor visibly doing something that works (a method,
model, programme shape, or repeatable approach), propose it as a practice the
actor embodies.

A practice is DISTINCT from the actor. The actor embodies the practice; the actor
is never itself the practice. Name the approach, not the organisation.
"Participatory budgeting" is a practice; "the city council" is not.

TIERS. The same practice can be done at right-sized levels, like a tier of gear
that is genuinely good for the level it is built for. A tier is FIT, not rank:
more resource and commitment, not "better." Identify the ONE tier THIS actor
operates at. Describe it with dignity. The entry level is "the right place to
start," never "the basic one." A grassroots actor and a global institution may
embody the same practice at different tiers, and neither is lesser.

WHAT YOU PROPOSE, AND WHAT YOU DO NOT. You propose a CANDIDATE practice: its
identity, placement, the chains it answers, and the tier this actor visibly
operates at, grounded in what the source shows. You do NOT score it, you do NOT
judge it, and you do NOT assert it is established or best. Whether a practice
truly works, and whether it does so with grace, is decided later by evidence and
by the domain community, never by extraction. The embodiment is a proposal the
owner confirms.

For each practice, return:
  {
    "name": "short name of the approach",
    "slug": "lowercase-hyphenated-stable",
    "statement": "one TED-tight line, third person, the practice not the practitioner, or null",
    "domains": ["domain-slug", ...],
    "subdomains": ["subdomain-slug", ...],
    "problem_chains": ["chain-slug", ...],
    "tier": {
      "label": "dignified tier name (never 'basic')",
      "looks_like": "what doing it at this level looks like, from the source",
      "resource_level": "low | moderate | high",
      "scale": "local | municipal | regional | national | international | global"
    },
    "evidence_note": "what the source shows about this actor doing it"
  }

Most actors embody zero to three practices. If the source shows no repeatable
approach clearly enough to name, return an empty array. Do not invent a practice
to fill the field. An honest empty is correct.

──────────────────────────────────────────────────────────────────────────────
IMAGE
──────────────────────────────────────────────────────────────────────────────

Return image_url with the single most appropriate anchor image for the actor:
  - logo for organisations, programmes, projects, groups, resources
  - portrait (face visible) for practitioners
  - hero image of the space for places

Only return a URL you saw in the source. Don't invent. Don't fall back to
generic stock or placeholder imagery — if no usable image exists on the
source, return null for image_url and let the pipeline flag the entry for
manual image addition.

──────────────────────────────────────────────────────────────────────────────
ALIGNMENT SCORE (0–9)
──────────────────────────────────────────────────────────────────────────────

0  — Actively, knowingly causing harm at scale
1  — Systematic harm as the primary operating model
2  — Significant net negative trajectory
3-4— Active harm in some dimensions alongside positive work elsewhere
5  — The Line. Below = more harm than good
6  — Net positive but contested
7  — Clear alignment, HAL conditions operative
8  — Strong alignment, demonstrable movement toward Horizon Goal
9  — Exemplar, field-setting

Tiers:
  0–4: pattern_instance
  5–6: contested
  7–8: qualified
  9:   exemplar

──────────────────────────────────────────────────────────────────────────────
OWNER-ONLY FIELDS — DO NOT INFER OR RETURN
──────────────────────────────────────────────────────────────────────────────

The following fields are owner-only. The Floor architecture requires that
they be filled by the actor when they claim the entry, NOT by extraction.
Do not return them in your output:

- mission_statement (commitments about future direction — only the owner can
  honestly assert what they stand for)
- working_on_now (current focus — time-bound, owner-asserted)
- offerings (formal products, programmes, sessions — claimed by the owner)
- credentials (training, certifications, lineage — require verification)
- testimonials (first-person quotes from others — never invent, never scrape)
- track_record, how_we_work, best_practices, direction, main_challenges
  (the Showcase layer — first-person depth the owner writes in their own
  voice once they claim the entry; never extracted or inferred)
- accepting_status, medium, actor_mode, membership_status

If the source clearly shows any of these (a "currently accepting clients"
banner, a list of offerings on a sales page), you may surface a link to that
sales/offerings page as a contact_form link — but do not extract structured
data from it.

──────────────────────────────────────────────────────────────────────────────
OUTPUT FORMAT
──────────────────────────────────────────────────────────────────────────────

Respond ONLY with valid JSON. No markdown, no preamble, no explanation.

Return an array of 1-6 actor objects. Use this exact shape:

[
  {
    "name": "string",
    "type": "organisation | project | practitioner | programme | place | group | resource",
    "tagline": "string or null — one substantive line, TED-tight",
    "description": "string — 2-3 sentences, third person, TED-tight",
    "story": "string or null — 2-4 short paragraphs, third person, TED-tight. Paragraphs separated by blank lines (\\n\\n). Null if source lacks material for an honest story.",
    "image_url": "string or null — single anchor image URL from source",
    "domains": ["primary-domain-slug", "secondary-slug", ...],
    "subdomains": ["subdomain-slug", ...],
    "problem_chains": ["chain-slug", ...],
    "proposed_chains": [
      { "slug": "...", "label": "...", "description": "...", "domains": ["..."], "aliases": ["..."], "rationale": "..." }
    ],
    "scale": "local | municipal | regional | national | international | global",
    "location_name": "string or null",
    "website": "string or null",
    "alignment_score": 0-9,
    "placement_tier": "pattern_instance | contested | qualified | exemplar",
    "hal_signals": ["array of HAL condition names"],
    "sfp_patterns": ["array of structural failure patterns"],
    "confidence": 0-100,
    "score_reasoning": "string — 2 sentences",
    "links": [
      { "link_type": "website",     "url": "https://..." },
      { "link_type": "podcast_spotify", "url": "..." },
      { "link_type": "linkedin",    "url": "..." },
      { "link_type": "instagram",   "url": "..." },
      { "link_type": "email",       "url": "mailto:..." }
    ],
    "press": [
      { "publication": "BBC", "url": "...", "title": "...", "published_at": "..." }
    ],
    "relationships": [
      { "to_name": "Other Actor Name", "relationship_type": "parent_child" }
    ],
    "practices": [
      {
        "name": "...", "slug": "...", "statement": "... or null",
        "domains": ["..."], "subdomains": ["..."],
        "problem_chains": ["..."],
        "tier": { "label": "...", "looks_like": "...", "resource_level": "low|moderate|high", "scale": "..." },
        "evidence_note": "..."
      }
    ]
  }
]

If a field is empty, omit it or return [] for arrays. Do not invent data.

Write in plain language a smart 10-year-old could follow. Short sentences. Concrete words. No jargon, no abstraction-stacking.
`

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000)
}

// ── Server-side page read ─────────────────────────────────────────────────────
// Fetch the page HTML ourselves so the extractor can run in html mode (a single
// fast Claude call, no web_search round-trips that blow the function timeout on
// content-heavy sites) AND see the actual DOM — which stripHtml otherwise throws
// away. Image and link candidates are harvested from the raw HTML before the
// strip and handed to the model, so logo/social/contact extraction improves
// instead of regressing. Falls back to the web_search path when the fetch fails
// or returns a thin JS shell (SPA with no server-rendered content).

async function fetchPageHtml(url, timeoutMs = 12000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NextUsAtlasBot/1.0; +https://nextus.world)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })
    if (!r.ok) return null
    const ct = (r.headers.get('content-type') || '').toLowerCase()
    if (!ct.includes('html') && !ct.includes('xml')) return null
    const html = (await r.text()).slice(0, 600000)
    return { html, finalUrl: r.url || url }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function absolutise(u, base) {
  try { return new URL(u, base).href } catch { return null }
}

// Harvest candidate anchor images from raw HTML, in preference order:
// og:image / twitter:image → apple-touch-icon / icon link → logo-ish <img>.
function extractImageCandidates(html, baseUrl) {
  const out = []
  const push = (u) => { const a = absolutise(u, baseUrl); if (a && !out.includes(a)) out.push(a) }

  let m
  const metaRe = /<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*>/gi
  while ((m = metaRe.exec(html))) {
    const c = m[0].match(/content=["']([^"']+)["']/i)
    if (c) push(c[1])
  }
  const linkRe = /<link[^>]+rel=["'][^"']*(?:apple-touch-icon|icon)[^"']*["'][^>]*>/gi
  while ((m = linkRe.exec(html))) {
    const h = m[0].match(/href=["']([^"']+)["']/i)
    if (h) push(h[1])
  }
  const imgRe = /<img[^>]+>/gi
  while ((m = imgRe.exec(html))) {
    if (/logo/i.test(m[0])) {
      const s = m[0].match(/src=["']([^"']+)["']/i)
      if (s) push(s[1])
    }
  }
  return out
}

const SOCIAL_HOST_RE = /(instagram\.com|twitter\.com|x\.com|youtube\.com|youtu\.be|linkedin\.com|facebook\.com|tiktok\.com|substack\.com|medium\.com|open\.spotify\.com|podcasts\.apple\.com|vimeo\.com|github\.com|calendly\.com|cal\.com|savvycal\.com|threads\.net|bsky\.app|t\.me)/i
const CONTACT_PATH_RE = /(contact|get-in-touch|\bbook\b|booking|schedule|appointment|connect|subscribe|newsletter|\brss\b|feed)/i

// Harvest noteworthy links so the model can classify them into link_type even
// though stripHtml drops hrefs. Keeps mailto/tel, social/podcast/booking hosts,
// contact-ish paths, and off-domain links; drops internal nav noise.
function extractLinkCandidates(html, baseUrl) {
  let baseHost = ''
  try { baseHost = new URL(baseUrl).hostname.replace(/^www\./, '') } catch {}
  const seen = []
  const out = []
  let m
  const aRe = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi
  while ((m = aRe.exec(html))) {
    let v = (m[1] || '').trim()
    if (!v || /^(javascript:|#)/i.test(v)) continue
    if (/^(mailto:|tel:)/i.test(v)) { if (!out.includes(v)) out.push(v); continue }
    const abs = absolutise(v, baseUrl)
    if (!abs || seen.includes(abs)) continue
    seen.push(abs)
    let host = ''
    try { host = new URL(abs).hostname.replace(/^www\./, '') } catch { continue }
    const offDomain = baseHost && host && !host.endsWith(baseHost)
    if (SOCIAL_HOST_RE.test(abs) || CONTACT_PATH_RE.test(abs) || offDomain) {
      if (!out.includes(abs)) out.push(abs)
    }
    if (out.length >= 60) break
  }
  return out
}

function faviconFallback(websiteOrUrl) {
  try {
    const host = new URL(websiteOrUrl).hostname.replace(/^www\./, '')
    if (!host) return null
    return `https://www.google.com/s2/favicons?domain=${host}&sz=256`
  } catch { return null }
}

function safeJson(text) {
  const attempts = [
    () => JSON.parse(text),
    () => JSON.parse(text.replace(/```json|```/g, '').trim()),
    () => { const m = text.match(/\[[\s\S]*\]/); return m ? JSON.parse(m[0]) : null },
    () => { const m = text.match(/\{[\s\S]*\}/); const r = m ? JSON.parse(m[0]) : null; return r ? [r] : null },
  ]
  for (const attempt of attempts) {
    try { const r = attempt(); if (r) return r } catch {}
  }
  return null
}

const ALLOWED_TYPES = ['organisation', 'project', 'practitioner', 'programme', 'place', 'group', 'resource']
const ALLOWED_LINK_TYPES = [
  'website', 'podcast_rss', 'podcast_apple', 'podcast_spotify',
  'youtube_channel', 'youtube_video', 'vimeo',
  'substack', 'newsletter',
  'instagram', 'twitter', 'tiktok', 'facebook', 'linkedin', 'medium', 'github',
  'book',
  // Contact-specific link types
  'email', 'contact_form', 'calendly', 'phone',
  'other',
]
const ALLOWED_REL_TYPES = ['parent_child', 'member_of', 'partner']

function enforceShape(record, vocab = null) {
  // Required fields with defaults
  record.type            = ALLOWED_TYPES.includes(record.type) ? record.type : 'organisation'
  record.domains         = Array.isArray(record.domains) ? record.domains.filter(Boolean) : []
  // Back-compat for old single-value callers
  if (!record.domains.length && record.domain_id) record.domains = [record.domain_id]
  record.domain_id       = record.domains[0] || null

  // ── Placement (slug arrays) — validate against the live vocabulary ───────
  // Columns on nextus_actors are slug-based text[] (subdomains, fields,
  // problem_chains). Keep only slugs that exist; drop anything invented.
  const cleanSlugs = (val, validSet) => {
    if (!Array.isArray(val)) return []
    const out = []
    for (const s of val) {
      if (typeof s !== 'string') continue
      const slug = s.trim()
      if (!slug) continue
      if (!validSet || validSet.has(slug)) out.push(slug)
    }
    return [...new Set(out)]
  }
  record.subdomains     = cleanSlugs(record.subdomains,     vocab?.validSubdomains)
  record.fields         = cleanSlugs(record.fields,         vocab?.validFields)
  record.problem_chains = cleanSlugs(record.problem_chains, vocab?.validChains)

  // Proposed chains — suggestions for human review. Never auto-applied.
  // Drop any whose slug already exists in the vocabulary (not a new chain),
  // and never let a proposal leak into problem_chains.
  record.proposed_chains = Array.isArray(record.proposed_chains)
    ? record.proposed_chains
        .filter(p => p && typeof p.slug === 'string' && p.slug.trim() && typeof p.label === 'string' && p.label.trim())
        .filter(p => !(vocab?.validChains && vocab.validChains.has(p.slug.trim())))
        .map(p => ({
          slug:        p.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, ''),
          label:       p.label.trim(),
          description: typeof p.description === 'string' ? p.description.trim() : null,
          domains:     Array.isArray(p.domains) ? p.domains.filter(d => typeof d === 'string' && d.trim()) : [],
          aliases:     Array.isArray(p.aliases) ? p.aliases.filter(a => typeof a === 'string' && a.trim()) : [],
          rationale:   typeof p.rationale === 'string' ? p.rationale.trim() : null,
        }))
    : []

  // Trim string fields and normalise empty-ish values to null
  for (const field of ['tagline', 'description', 'story', 'location_name']) {
    if (typeof record[field] === 'string') {
      const trimmed = record[field].trim()
      record[field] = trimmed.length > 0 ? trimmed : null
    } else {
      record[field] = null
    }
  }

  record.hal_signals     = Array.isArray(record.hal_signals)  ? record.hal_signals  : []
  record.sfp_patterns    = Array.isArray(record.sfp_patterns) ? record.sfp_patterns : []

  // Structured arrays — validate items
  record.links = Array.isArray(record.links) ? record.links.filter(l =>
    l && l.url && ALLOWED_LINK_TYPES.includes(l.link_type)
  ) : []

  record.press = Array.isArray(record.press) ? record.press.filter(p =>
    p && p.publication
  ) : []

  record.relationships = Array.isArray(record.relationships) ? record.relationships.filter(r =>
    r && r.to_name && ALLOWED_REL_TYPES.includes(r.relationship_type)
  ) : []

  // Practices — candidate toward-answers this actor embodies. Identity, chain
  // links, and the observed tier only. Never scored, judged, or asserted as
  // established — that is the scoring layer's and the community's job. Reuses
  // the cleanSlugs validator above so placement slugs stay real.
  const RESOURCE_LEVELS = new Set(['low', 'moderate', 'high'])
  record.practices = Array.isArray(record.practices) ? record.practices
    .filter(p => p && typeof p.name === 'string' && p.name.trim())
    .map(p => {
      const slug = (typeof p.slug === 'string' && p.slug.trim() ? p.slug : p.name)
        .trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
      const tIn = (p.tier && typeof p.tier === 'object') ? p.tier : {}
      return {
        name:           p.name.trim(),
        slug,
        statement:      (typeof p.statement === 'string' && p.statement.trim()) ? p.statement.trim() : null,
        domains:        Array.isArray(p.domains) ? p.domains.filter(s => typeof s === 'string' && s.trim()).map(s => s.trim()) : [],
        subdomains:     cleanSlugs(p.subdomains,     vocab?.validSubdomains),
        fields:         cleanSlugs(p.fields,         vocab?.validFields),
        problem_chains: cleanSlugs(p.problem_chains, vocab?.validChains),
        tier: {
          label:          (typeof tIn.label === 'string' && tIn.label.trim()) ? tIn.label.trim() : null,
          looks_like:     (typeof tIn.looks_like === 'string' && tIn.looks_like.trim()) ? tIn.looks_like.trim() : null,
          resource_level: RESOURCE_LEVELS.has(tIn.resource_level) ? tIn.resource_level : null,
          scale:          (typeof tIn.scale === 'string' && tIn.scale.trim()) ? tIn.scale.trim() : null,
        },
        evidence_note:  (typeof p.evidence_note === 'string' && p.evidence_note.trim()) ? p.evidence_note.trim() : null,
      }
    }) : []

  // Tier from score
  const s = record.alignment_score ?? 0
  if      (s <= 4) record.placement_tier = 'pattern_instance'
  else if (s <= 6) record.placement_tier = 'contested'
  else if (s <= 8) record.placement_tier = 'qualified'
  else             record.placement_tier = 'exemplar'

  // Floor-check signals — surface what's missing so the Add UI can flag
  // entries that don't meet the Floor for manual completion.
  // These are advisory; the entry still returns. The UI decides whether
  // to gate save behind floor completeness.
  const CONTACT_LINK_TYPES = new Set(['email', 'contact_form', 'calendly', 'phone'])
  record.floor_check = {
    has_image:       !!record.image_url,
    has_description: !!record.description,
    has_story:       !!record.story,
    has_tagline:     !!record.tagline,
    has_business_contact: record.links.some(l => CONTACT_LINK_TYPES.has(l.link_type)),
    media_link_count: record.links.filter(l => !CONTACT_LINK_TYPES.has(l.link_type)).length,
  }
  record.floor_check.meets_floor = record.floor_check.has_image
    && record.floor_check.has_description
    && record.floor_check.has_tagline
    && record.floor_check.has_business_contact
    && record.floor_check.media_link_count >= 1

  return record
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' })

  const { input } = req.body || {}
  if (!input?.trim()) return res.status(400).json({ error: 'input is required' })

  const mode         = detectMode(input)
  const knownContext = getKnownContext(input)
  let content        = input.trim()

  // Image/link candidates harvested from a server-side page fetch (url mode).
  // primaryImageFallback is the best anchor image found in the page source; it
  // backstops the first actor when the model returns no image. readVia records
  // which path actually ran, for log/debug visibility.
  let primaryImageFallback = null
  let readVia              = mode
  let useWebSearch         = false

  const FLOOR_TAIL = `Identify ALL distinct actors — look for: the main organisation/practitioner, any retreat or physical places, any programmes with their own identity, any partner-run practices. Generate a separate record for each. Podcasts, Substacks, YouTube channels, and newsletters are never separate records — capture them as links on the parent actor.\n\nFor every record, meet the Floor: accurate image, description, story (2-4 paragraphs from explicit source claims), tagline, ALL media links discoverable on the source, and at least one business contact path (email, contact form, booking link, or phone). Be exhaustive on the links — catch every channel. Also propose any PRACTICES each actor visibly embodies, the repeatable approaches that work, with the tier the actor operates at. Identity and observed tier only, never scored.`

  if (mode === 'html') {
    content = `[HTML source provided]\n\n${stripHtml(input)}\n\n${knownContext}`
  } else if (mode === 'url') {
    // Try to read the page ourselves first. A single fast html-mode call avoids
    // the web_search round-trips that time the function out on heavy sites, and
    // lets us hand the model the actual logo/social/contact URLs from the DOM.
    const page = await fetchPageHtml(input.trim())
    const stripped = page ? stripHtml(page.html) : ''

    if (page && stripped.length >= 400) {
      const baseUrl   = page.finalUrl || input.trim()
      const imageCands = extractImageCandidates(page.html, baseUrl)
      const linkCands  = extractLinkCandidates(page.html, baseUrl)
      primaryImageFallback = imageCands[0] || null
      readVia = 'html_fetch'

      const imageBlock = imageCands.length
        ? `\n\nIMAGE CANDIDATES found in the page source (pick the single best anchor image for each actor — logo for orgs, portrait for practitioners — and return it as image_url; return null if none fit):\n${imageCands.slice(0, 8).map(u => `  - ${u}`).join('\n')}`
        : ''
      const linkBlock = linkCands.length
        ? `\n\nLINK CANDIDATES found in the page source (classify the ones that belong to an actor into the link_type vocabulary — socials, podcast feeds, booking/contact pages, email, phone — and attach them to the right record; ignore the rest):\n${linkCands.slice(0, 60).map(u => `  - ${u}`).join('\n')}`
        : ''

      content = `[Page read from URL: ${input.trim()}]\n\n${stripped}${imageBlock}${linkBlock}\n\n${FLOOR_TAIL}\n\n${knownContext}`
    } else {
      // Fetch failed or returned a thin JS shell — fall back to web_search so
      // SPA / bot-blocked sites still resolve.
      useWebSearch = true
      readVia = 'web_search'
      content = `[URL provided: ${input.trim()}]\n\nRead this URL. ${FLOOR_TAIL}\n\n${knownContext}`
    }
  } else {
    content = `[Description provided]\n\n${input.trim()}\n\nIdentify ALL distinct actors and their relationships. Meet the Floor for each.\n\n${knownContext}`
  }

  const tools = useWebSearch ? [{ type: 'web_search_20250305', name: 'web_search' }] : undefined

  // Load the live placement vocabulary and append it to the system prompt so
  // the extractor places at subdomain/field resolution and tags real chains.
  const vocab = await loadVocabulary()
  const systemPrompt = vocab?.reference
    ? `${SYSTEM_PROMPT}\n${vocab.reference}`
    : SYSTEM_PROMPT

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: systemPrompt,
      tools,
      messages: [{ role: 'user', content }],
    })

    // Anti-fabrication guard. In web_search mode the model was handed only the
    // URL string — if the search tool returned nothing (outage, blocked, empty),
    // the model can only invent a profile from the URL text. Refuse honestly
    // instead of returning fabrication.
    if (useWebSearch) {
      const searchResults = response.content.filter(b => b.type === 'web_search_tool_result')
      const gotResults = searchResults.some(b =>
        Array.isArray(b.content) ? b.content.length > 0 : !b.content?.error_code
      )
      if (!gotResults) {
        return res.status(200).json({
          error:   'source_unread',
          message: 'We could not read that source right now, so nothing was generated. Try again in a few minutes, or fill the form in manually.',
        })
      }
    }

    const rawText = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')

    let parsed = safeJson(rawText)

    if (!parsed) {
      return res.status(200).json({
        error:   'parse_failed',
        raw:     rawText.slice(0, 500),
        message: 'Could not parse extraction output. Try pasting a description instead of a URL.',
      })
    }

    if (!Array.isArray(parsed)) parsed = [parsed]
    const results = parsed.slice(0, 6).map(r => enforceShape(r, vocab))

    // Image fallback. The model returns image_url only when it saw a real image
    // in the source — so most reads come back imageless. Backstop it: the first
    // (primary) actor inherits the page's anchor image (og:image / logo) when
    // one was harvested, which counts as a real floor-meeting image. Anything
    // else, and the case where no anchor image was found, falls back to a domain
    // favicon — usable for display but NOT floor-meeting, so review still flags
    // it for a proper logo.
    results.forEach((r, i) => {
      if (r.image_url) return
      const sourceImg = (i === 0) ? primaryImageFallback : null
      if (sourceImg) {
        r.image_url = sourceImg
        r.floor_check.has_image = true
      } else {
        const fav = faviconFallback(r.website || input)
        if (fav) {
          r.image_url = fav
          r.floor_check.has_favicon_fallback = true
        }
      }
      r.floor_check.meets_floor = r.floor_check.has_image
        && r.floor_check.has_description
        && r.floor_check.has_tagline
        && r.floor_check.has_business_contact
        && r.floor_check.media_link_count >= 1
    })

    return res.status(200).json({ results, mode, read_via: readVia })

  } catch (err) {
    console.error('org-extract error:', err)
    // Outage classification. When the AI service itself is down or overloaded
    // (429 rate-limit, 5xx, 529 overloaded, connection failures), say so plainly
    // — never leak a raw SDK message, and never let the client mistake this for
    // a problem with their input.
    const status = err?.status || err?.statusCode || null
    const isDown = (status && (status === 429 || status >= 500))
      || err?.name === 'APIConnectionError'
      || err?.name === 'APIConnectionTimeoutError'
      || /overloaded|ECONNRE|ETIMEDOUT|fetch failed/i.test(err?.message || '')
    if (isDown) {
      return res.status(503).json({
        error:   'service_down',
        message: 'Our reading system is down right now. Send us a message at hello@nextus.world and try again later, or fill the form in manually.',
      })
    }
    return res.status(500).json({
      error:   'extraction_failed',
      message: 'Something went wrong reading that source. Try again, or fill the form in manually.',
    })
  }
}
