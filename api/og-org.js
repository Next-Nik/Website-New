// api/og-org.js
// ─────────────────────────────────────────────────────────────────────────────
// Link-preview endpoint for actor profile pages (/org/:slug).
//
// Why this exists: the site is a single-page app, so every URL serves the same
// static index.html. Link scrapers (WhatsApp, iMessage, Facebook, Slack,
// LinkedIn, Telegram…) do not run JavaScript — they read the static meta tags
// and show the site-wide logo and slogan for every profile link.
//
// A user-agent-conditioned rewrite in vercel.json sends ONLY those scrapers
// here. Humans never touch this endpoint; they get the SPA as normal. This
// endpoint fetches the actor via the same privacy-locked RPC the page uses
// (get_actor_public — people_in_the_work stays stripped) and returns a minimal
// HTML document whose Open Graph tags describe that specific actor.
//
// If a real browser ever lands here through a false-positive UA match, the
// inline script redirects it to the real page. Scrapers don't run it.
// ─────────────────────────────────────────────────────────────────────────────

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const SITE          = 'https://nextus.world'
const FALLBACK_IMG  = `${SITE}/logo_hero.png`
const SITE_TITLE    = 'NextUs · A life worth living. A future worth building.'
const SITE_DESC     = 'Step towards the horizon. Horizon Suite tools and a frame for the human project.'

// Escape for use inside HTML attribute values and text nodes.
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function page({ title, description, image, url }) {
  const t = esc(title)
  const d = esc(description)
  const i = esc(image)
  const u = esc(url)
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${t}</title>
<meta name="description" content="${d}" />
<link rel="canonical" href="${u}" />
<meta property="og:type" content="profile" />
<meta property="og:site_name" content="NextUs" />
<meta property="og:url" content="${u}" />
<meta property="og:title" content="${t}" />
<meta property="og:description" content="${d}" />
<meta property="og:image" content="${i}" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="${t}" />
<meta name="twitter:description" content="${d}" />
<meta name="twitter:image" content="${i}" />
<script>window.location.replace(${JSON.stringify(url)})</script>
</head>
<body>
<p><a href="${u}">${t}</a></p>
</body>
</html>`
}

module.exports = async function handler(req, res) {
  const slug = String(req.query.slug || '').trim()

  let title = SITE_TITLE
  let description = SITE_DESC
  let image = FALLBACK_IMG
  let url = SITE + '/'

  if (slug) {
    url = `${SITE}/org/${encodeURIComponent(slug)}`
    try {
      const { data } = await supabase
        .rpc('get_actor_public', { p_actor_id_or_slug: slug })
      const actor = Array.isArray(data) ? data[0] : data
      if (actor && actor.name) {
        title = `${actor.name} · NextUs`
        description =
          actor.tagline ||
          actor.description ||
          SITE_DESC
        if (actor.image_url) image = actor.image_url
        if (actor.slug) url = `${SITE}/org/${encodeURIComponent(actor.slug)}`
      }
    } catch (_) {
      // Fall through to site defaults — a broken preview endpoint must never
      // break the link itself.
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  // Scrapers cache aggressively anyway; an hour at the edge keeps Supabase
  // out of the hot path for repeat shares of the same profile.
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.status(200).send(page({ title, description, image, url }))
}
