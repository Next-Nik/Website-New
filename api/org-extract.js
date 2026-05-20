// api/org-extract.js
//
// NextUs Atlas — actor identification and placement extraction.
//
// Reads a URL, HTML source, or text description and returns an array of
// distinct actor records suitable for placement on the Atlas. No hardcoded
// label model — the AI proposes any distinct entity found in the source,
// whether it's a person, organisation, place, programme, podcast, or project.
//
// Response shape per record:
// {
//   name, type, tagline, description, image_url,
//   domains[], scale, location_name, website,
//   alignment_score, placement_tier, hal_signals[], sfp_patterns[],
//   confidence, score_reasoning,
//   links[]:    [{ link_type, url, label }],
//   press[]:    [{ publication, url?, title?, published_at? }],
//   relationships[]: [{ to_name, relationship_type }]
// }
//
// Output is JSON only, validated and shape-enforced before return.

const Anthropic = require('@anthropic-ai/sdk')
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

2. The Horizon Suite (programme)
   - Personal development tool suite: Horizon State, Purpose Piece, The Map,
     Target Sprint, Horizon Practice.
   - Built for nervous system regulation through civilisational contribution.
   - Domain: path (primary). Touches all seven personal domains.
   - Type: programme. Scale: global.
   - Score: 8. Parent: NextUs.

3. Nik Wood (practitioner)
   - Founder of NextUs. 25+ years one-on-one coaching practice.
   - Life coach, systems architect, futurist.
   - Domain: inner-game (primary). Also strong in path, signal.
   - Type: practitioner. Scale: local (1:1 practice). Location: Mexico City, Mexico.
   - Score: 9. Parent: NextUs.

The hierarchy is: NextUs is the umbrella. Nik Wood and The Horizon Suite
sit underneath it. Both are real, distinct actors.
`,
}

function getKnownContext(input) {
  for (const [domain, context] of Object.entries(KNOWN_ENTITIES)) {
    if (input.toLowerCase().includes(domain)) return context
  }
  return ''
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the NextUs Atlas placement extraction engine.

The Atlas is a living map of actors working toward civilisational Horizon Goals.
Your job is to read source material (a URL, HTML, or text description) and
identify EVERY distinct actor that belongs on the map.

──────────────────────────────────────────────────────────────────────────────
WHAT COUNTS AS A DISTINCT ACTOR
──────────────────────────────────────────────────────────────────────────────

An actor is any entity with its own identity, purpose, and audience. Look
carefully for ALL of these patterns in the source:

- A named individual whose personal practice, coaching, or work is distinct
- An organisation, company, non-profit, or collective
- A podcast that has its own brand and audience (separate from its host)
- A programme, course, methodology, or tool suite with its own identity
- A physical place (retreat centre, coworking space, land project)
- A project, initiative, or campaign with its own scope
- A group, network, or community

CRITICAL FRAMING for practitioner records:
When you propose a practitioner record for a named individual, the record
is about THEIR PUBLIC-FACING WORK — their coaching, teaching, consulting,
analysis, journalism, etc. NOT their personal biography, family life, or
private details. Description should focus on what they do publicly, their
methodology, the body of work they're known for. The name identifies the
practitioner; the content describes the practice.

One source can yield MULTIPLE distinct actors. A coach's website may surface:
- The coach (practitioner)
- Their podcast (programme)
- Their retreat venue (place)
- A coaching practice they run with a partner (programme)

Generate a separate record for each. Do not collapse multiple entities into one.
Do not assume only one actor per source.

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

programme      — a methodology, course, retreat experience, podcast, tool suite,
                 book series, or repeatable offering with its own identity
                 and audience. Often nested under a practitioner or org.
                 Examples: The Bridge Experience (Preston's workshop),
                 Spiritual Millionaire Academy (Preston's training),
                 The Horizon Suite (NextUs's tool suite),
                 a podcast like Brothers In Depth or The Preston Smiles Show.
                 Critical: podcasts are programmes, NOT organisations.
                 Courses are programmes. Workshops are programmes.

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
LINKS — EXTRACT STRUCTURED LINKS
──────────────────────────────────────────────────────────────────────────────

Look for these link types in the source. Return only those that are present.

Type values (use exact strings):
  website            — main public website
  podcast_rss        — podcast RSS feed URL if discoverable
  podcast_apple      — Apple Podcasts link
  podcast_spotify    — Spotify show link
  youtube_channel    — YouTube channel URL
  youtube_video      — specific YouTube video
  vimeo              — Vimeo channel or video
  substack           — Substack publication URL
  newsletter         — generic newsletter signup URL
  instagram          — Instagram profile URL
  twitter            — X/Twitter profile URL
  tiktok             — TikTok profile URL
  facebook           — Facebook page URL
  linkedin           — LinkedIn profile or company page
  medium             — Medium publication
  github             — GitHub profile or org
  book               — link to a published book (Amazon, publisher)
  email              — direct email address (use mailto: URL prefix)
  contact_form       — URL to a contact form page (e.g. /contact)
  calendly           — Calendly booking link or any direct scheduling URL
  phone              — phone number (use tel: URL prefix). Skip unless obviously public/professional.
  other              — anything else worth linking

CONTACT LINKS ARE IMPORTANT — extract them whenever they're discoverable.
Look at the footer, contact pages, "get in touch" sections, sidebar/header.
For practitioners and orgs, contact information is what enables coordination.
If you see an email address, return it as link_type 'email' with url 'mailto:<address>'.
If you see a contact form link, return link_type 'contact_form'.
If you see a Calendly link (calendly.com/...), return link_type 'calendly'.

Each link: { "link_type": "...", "url": "...", "label": "optional override" }

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
                       (UNEP inside UN; a podcast inside its host's umbrella)
  member_of          — one actor is a member or participant in another
  partner            — peer relationship, neither contains the other
                       (a coaching practice run by spouses)

Each relationship: { "to_name": "name of related actor", "relationship_type": "..." }

The relationship is recorded on the FROM actor's record. Example:
  Brothers In Depth (podcast, child) has relationship → { to_name: "James Mattingley", relationship_type: "parent_child" }

──────────────────────────────────────────────────────────────────────────────
IMAGE
──────────────────────────────────────────────────────────────────────────────

Return image_url with the most appropriate single anchor image for the actor:
  - logo for organisations
  - portrait for practitioners
  - hero image for places
Only return a URL you saw in the source. Don't invent.

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
OUTPUT FORMAT
──────────────────────────────────────────────────────────────────────────────

Respond ONLY with valid JSON. No markdown, no preamble, no explanation.

Return an array of 1-6 actor objects. Use this exact shape:

[
  {
    "name": "string",
    "type": "organisation | project | practitioner | programme | place | group | resource",
    "tagline": "string or null — short one-liner",
    "description": "string — 2-3 sentences in third person, evidence-based",
    "image_url": "string or null — single anchor image URL from source",
    "domains": ["primary-domain-slug", "secondary-slug", ...],
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
      { "link_type": "podcast_rss", "url": "...", "label": "optional" },
      { "link_type": "youtube_channel", "url": "..." }
    ],
    "press": [
      { "publication": "BBC", "url": "...", "title": "...", "published_at": "..." }
    ],
    "relationships": [
      { "to_name": "Other Actor Name", "relationship_type": "parent_child" }
    ]
  }
]

If a field is empty, omit it or return [] for arrays. Do not invent data.
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
  // Contact-specific link types (in-platform messaging not yet built)
  'email', 'contact_form', 'calendly', 'phone',
  'other',
]
const ALLOWED_REL_TYPES = ['parent_child', 'member_of', 'partner']

function enforceShape(record) {
  // Required fields with defaults
  record.type            = ALLOWED_TYPES.includes(record.type) ? record.type : 'organisation'
  record.domains         = Array.isArray(record.domains) ? record.domains.filter(Boolean) : []
  // Back-compat for old single-value callers
  if (!record.domains.length && record.domain_id) record.domains = [record.domain_id]
  record.domain_id       = record.domains[0] || null

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

  // Tier from score
  const s = record.alignment_score ?? 0
  if      (s <= 4) record.placement_tier = 'pattern_instance'
  else if (s <= 6) record.placement_tier = 'contested'
  else if (s <= 8) record.placement_tier = 'qualified'
  else             record.placement_tier = 'exemplar'

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

  if (mode === 'html') {
    content = `[HTML source provided]\n\n${stripHtml(input)}\n\n${knownContext}`
  } else if (mode === 'url') {
    content = `[URL provided: ${input.trim()}]\n\nRead this URL. Identify ALL distinct actors — look for: the main organisation/practitioner, any podcasts with their own brand, any retreat or physical places, any programmes with their own identity, any partner-run practices. Generate a separate record for each. Extract structured links (podcast RSS, YouTube, Substack, social), press mentions ("as seen in"), the most appropriate image, and any parent/child relationships between the actors you propose.\n\n${knownContext}`
  } else {
    content = `[Description provided]\n\n${input.trim()}\n\nIdentify ALL distinct actors and their relationships.\n\n${knownContext}`
  }

  const tools = mode === 'url' ? [{ type: 'web_search_20250305', name: 'web_search' }] : undefined

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      tools,
      messages: [{ role: 'user', content }],
    })

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
    const results = parsed.slice(0, 6).map(enforceShape)

    return res.status(200).json({ results, mode })

  } catch (err) {
    console.error('org-extract error:', err)
    return res.status(500).json({ error: 'extraction_failed', message: err.message })
  }
}
