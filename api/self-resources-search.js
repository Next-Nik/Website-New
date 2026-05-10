// api/self-resources-search.js
//
// Server-side search proxy for Layer B of the NextUs Resources Engine.
// See the brief: "Resources Engine and Sensitive-Topic Doctrine."
//
// Responsibilities:
//   1. Take a (domain, band, sensitive, topicMarker) request from the
//      front-end.
//   2. Look up the authored query template for that pair from
//      src/beta/constants/resourceQueries.js.
//   3. Call the Brave Search API.
//   4. Filter results to a curated allowlist of source domains. The
//      allowlist tightens when sensitive=1.
//   5. Map Brave's response shape to the canonical resource shape used
//      by Layer A, so the panel renders the cards identically.
//   6. Return. Honest error states when the API is unconfigured, when
//      the upstream fails, or when nothing clears the filter.
//
// What this endpoint deliberately does NOT do:
//   • It does not generate, paraphrase, or "summarise with AI" any
//     content. The displayed snippet is the source's own description
//     as Brave returned it. Provenance is preserved.
//   • It does not personalise queries with anything user-identifying.
//     Templates are generic per (domain × band).
//
// Cache:
//   Vercel Edge Cache via response headers. 24h with stale-while-
//   revalidate. Cache key is the URL itself, so different (domain,
//   band, sensitive, topicMarker, version) tuples cache separately.
//
// Configuration (Vercel env vars):
//   BRAVE_SEARCH_API_KEY     — required. Get one at
//                              https://api.search.brave.com/
//                              (free tier: 2,000 queries/month).
//   SELF_RESOURCES_SEARCH_DEBUG — optional. "1" returns extra debug
//                              info in the response. Off in prod.

const {
  templateFor,
  SOURCE_ALLOWLIST,
  SENSITIVE_ALLOWLIST,
  SENSITIVE_TOPIC_MARKERS,
  QUERY_CACHE_VERSION,
} = require('../src/beta/constants/resourceQueries')

const BRAVE_ENDPOINT = 'https://api.search.brave.com/res/v1/web/search'

// Cache: 24 hours with 7-day stale-while-revalidate. Vercel's CDN
// handles caching off these headers; no Redis or DB needed.
const CACHE_HEADER = 'public, s-maxage=86400, stale-while-revalidate=604800'

// Limit how many results we ask Brave for, and how many we return.
const BRAVE_RESULT_COUNT  = 15
const RETURN_RESULT_COUNT = 6

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method-not-allowed' })
  }

  const debug = process.env.SELF_RESOURCES_SEARCH_DEBUG === '1'

  // ── Parse and validate input ──────────────────────────────
  const domain       = sanitiseShort(req.query.domain)
  const band         = sanitiseShort(req.query.band)
  const sensitiveReq = req.query.sensitive === '1' || req.query.sensitive === 'true'
  const topicMarker  = sanitiseShort(req.query.topicMarker)

  const SELF_KEYS = ['path','spark','body','finances','connection','inner_game','signal']
  if (!domain || !SELF_KEYS.includes(domain)) {
    return res.status(400).json({ error: 'invalid-domain' })
  }
  const VALID_BANDS = ['crisis','friction','plateau','capable','fluent']
  if (band && !VALID_BANDS.includes(band)) {
    return res.status(400).json({ error: 'invalid-band' })
  }

  // The "sensitive" flag flips on if the request says so explicitly OR
  // if a known sensitive topic marker came through. Either path lands
  // us in the tightened allowlist.
  const isSensitive = sensitiveReq
    || (topicMarker && SENSITIVE_TOPIC_MARKERS.has(topicMarker))

  // ── Configuration check ───────────────────────────────────
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) {
    return res.status(200).json({
      results: [],
      reason: 'unconfigured',
      message: 'Web sourcing has not been configured for this environment yet.',
      cacheVersion: QUERY_CACHE_VERSION,
    })
  }

  // ── Build the query ───────────────────────────────────────
  const baseQuery = templateFor(domain, band)
  if (!baseQuery) {
    return res.status(400).json({ error: 'no-template' })
  }

  // ── Hit Brave ─────────────────────────────────────────────
  let brave
  try {
    const url = new URL(BRAVE_ENDPOINT)
    url.searchParams.set('q', baseQuery)
    url.searchParams.set('count', String(BRAVE_RESULT_COUNT))
    url.searchParams.set('safesearch', 'moderate')

    const r = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey,
      },
    })
    if (!r.ok) {
      return res.status(502).json({
        results: [],
        reason: 'upstream-error',
        message: 'The search did not come back this time.',
        ...(debug ? { upstream: { status: r.status } } : {}),
      })
    }
    brave = await r.json()
  } catch (e) {
    return res.status(502).json({
      results: [],
      reason: 'upstream-exception',
      message: 'The search did not come back this time.',
      ...(debug ? { error: String(e) } : {}),
    })
  }

  // ── Filter to allowlist ───────────────────────────────────
  const allowlist = isSensitive ? SENSITIVE_ALLOWLIST : SOURCE_ALLOWLIST
  const rawResults = Array.isArray(brave?.web?.results) ? brave.web.results : []

  const filtered = []
  for (const r of rawResults) {
    if (!r?.url) continue
    if (!hostnameMatches(r.url, allowlist)) continue
    filtered.push(r)
    if (filtered.length >= RETURN_RESULT_COUNT) break
  }

  // ── Map to canonical resource shape ───────────────────────
  const results = filtered.map(r => mapToResource(r, { domain, band }))

  // ── Respond ───────────────────────────────────────────────
  res.setHeader('Cache-Control', CACHE_HEADER)
  res.setHeader('CDN-Cache-Control', CACHE_HEADER)
  res.setHeader('Vercel-CDN-Cache-Control', CACHE_HEADER)

  return res.status(200).json({
    results,
    reason: results.length > 0 ? 'ok' : 'no-quality-matches',
    cacheVersion: QUERY_CACHE_VERSION,
    ...(debug ? { query: baseQuery, totalReturned: rawResults.length, allowlistMode: isSensitive ? 'sensitive' : 'standard' } : {}),
  })
}

// ─── Helpers ────────────────────────────────────────────────

function sanitiseShort(v) {
  if (typeof v !== 'string') return null
  const trimmed = v.trim()
  if (!trimmed) return null
  if (trimmed.length > 64) return null
  // Allow letters, digits, dash, underscore. Reject anything else.
  if (!/^[a-zA-Z0-9_\-]+$/.test(trimmed)) return null
  return trimmed.toLowerCase()
}

function hostnameMatches(url, allowlist) {
  let host
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return false
  }
  // strip leading "www."
  host = host.replace(/^www\./, '')
  for (const entry of allowlist) {
    const e = entry.toLowerCase()
    // Bare TLD-like entries ('edu', 'gov') match suffixes after a dot.
    if (!e.includes('.')) {
      if (host === e || host.endsWith('.' + e)) return true
    } else {
      if (host === e || host.endsWith('.' + e)) return true
    }
  }
  return false
}

function mapToResource(braveResult, { domain, band }) {
  // Brave returns: { title, url, description, age, page_age,
  //                  meta_url: { hostname, ... }, profile?, ... }
  // We map to the canonical shape used by Layer A so the front-end
  // renders the same card.
  const url = braveResult.url || ''
  const host = (() => {
    try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
  })()

  return {
    id:         'web:' + hashShort(url),
    type:       inferType(braveResult, host),
    title:      stripHtml(braveResult.title || '(untitled)'),
    author:     stripHtml(braveResult.profile?.long_name || braveResult.author || ''),
    source:     stripHtml(braveResult.profile?.name || host),
    url,
    year:       extractYear(braveResult.age || braveResult.page_age) || null,
    domains:    [domain],
    scoreBands: band ? [band] : [],
    summary:    stripHtml(braveResult.description || ''),
    curatedBy:  null,    // null = not curated; the card uses the 'web' provenance pill
    addedAt:    null,
    sensitive:  false,   // honest: we did not vet this; flag stays off
                         //         until promoted into Layer A.
  }
}

function stripHtml(s) {
  if (!s) return ''
  return String(s)
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 320)
}

function inferType(b, host) {
  if (!host) return 'article'
  if (host.includes('ted.com')) return 'talk'
  if (host.includes('youtube.com') || host.includes('vimeo.com')) return 'talk'
  // Major book-publisher hosts → 'book'
  if (
    host.includes('penguinrandomhouse') ||
    host.includes('penguin.co.uk') ||
    host.includes('harpercollins') ||
    host.includes('simonandschuster') ||
    host.includes('macmillan') ||
    host.includes('hachettebookgroup') ||
    host.includes('beacon.org') ||
    host.includes('soundstrue') ||
    host.includes('shambhala') ||
    host.includes('basicbooks')
  ) return 'book'
  // Default: article. Conservative; "tool" and "practice" we reserve
  // for entries we can verify, not for things we infer from a URL.
  return 'article'
}

function extractYear(s) {
  if (!s) return null
  const m = String(s).match(/(19|20)\d{2}/)
  return m ? parseInt(m[0], 10) : null
}

function hashShort(s) {
  // Tiny non-crypto hash, just enough for stable React keys.
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h).toString(36).slice(0, 10)
}
