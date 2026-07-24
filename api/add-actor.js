// api/add-actor.js
//
// Server-side "Add to the Atlas" save. Replaces the browser-side inserts the
// public /add page used to do directly against nextus_actors.
//
// Why this exists:
//   The /add page built the full actor row in the browser and inserted it under
//   the adder's own session. That insert is subject to RLS, and there was no
//   insert policy for ordinary users — so every non-founder add was denied 403.
//   It also meant links/press silently failed to attach to community entries
//   (those tables are owner-scoped), parent linking silently failed, and the
//   browser was trusted to set vetting_status / status / profile_owner.
//
//   This endpoint runs under the service key (RLS bypassed) and sets every
//   trust-sensitive field server-side from the authenticated caller:
//     · seeded_by / profile_owner / represented_by_adder  — from `represents`
//     · vetting_status = 'approved', status = 'live'        — never client-set
//   The browser sends only the descriptive form fields. It cannot forge
//   ownership, approval, or live status.
//
// Auth:  Authorization: Bearer <supabase access token>. Any authenticated user.
// Body:  { represents: bool, aiUrl: string, primary: <form>, extras: [<extra>] }
//        `extras` is already filtered by the client to the ticked rows.
// Returns: { ok, results: [{ id, slug, name, label }], warnings: [string] }
//          200 with ok:false + error on a hard failure (primary insert).

export const config = { maxDuration: 60 }

const { createClient } = require('@supabase/supabase-js')
const { Resend } = require('resend')

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://tphbpwzozkskytoichho.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
)

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const BASE_URL = process.env.NEXTUS_BASE_URL || 'https://nextus.world'

// ── Helpers ──────────────────────────────────────────────────────────────────

function arr(v) { return Array.isArray(v) ? v : [] }
function str(v) { const s = (v == null ? '' : String(v)).trim(); return s || null }

function normaliseUrl(raw) {
  const s = (raw == null ? '' : String(raw)).trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  return 'https://' + s
}

function num(v) {
  if (v == null || v === '') return null
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : null
}

async function getUser(req) {
  const auth = req.headers.authorization || req.headers.Authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return { ok: false, code: 401, error: 'Missing token' }
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return { ok: false, code: 401, error: 'Invalid token' }
  return { ok: true, userId: data.user.id }
}

// Mirror of the old client buildPayload, with the trust-sensitive fields forced
// server-side rather than taken from the client.
function buildPayload(data, { isExtra, represents, userId, aiUrl }) {
  const primaryDomain   = str(data.primary_domain)
  const secondary       = arr(data.secondary_domains)
  const domains = isExtra
    ? (arr(data.domains).length ? arr(data.domains) : (data.domain_id ? [data.domain_id] : []))
    : [primaryDomain, ...secondary.filter(s => s && s !== primaryDomain)].filter(Boolean)

  const image = str(data.image_url)
  const nowIso = new Date().toISOString()
  const aiUrlTrim = (aiUrl == null ? '' : String(aiUrl)).trim()

  return {
    name:                str(data.name),
    type:                str(data.type) || 'organisation',
    track:               data.track || null,
    tagline:             str(data.tagline),
    image_url:           image,
    image_provenance:    image ? 'hotlink' : null,
    description:         str(data.description),
    story:              str(data.story),
    domain_id:           domains[0] || null,
    domains,
    subdomains:          arr(data.subdomains),
    fields:              arr(data.fields),
    lenses:              arr(data.lenses),
    problem_chains:      arr(data.problem_chains),
    platform_principles: arr(data.platform_principles),
    scale:               str(data.scale),
    location_name:       str(data.location_name),
    website:             normaliseUrl(data.website),
    impact_summary:      str(data.impact_summary),
    alignment_score:     num(data.alignment_score),
    alignment_score_computed:   true,
    alignment_score_updated_at: nowIso,
    placement_tier:      data.placement_tier || null,

    // ── Trust-sensitive: server-set, never from the client ──
    seeded_by:            represents ? 'self' : 'community',
    profile_owner:        represents ? userId : null,
    represented_by_adder: !!represents,
    vetting_status:       'approved',
    status:               'live',

    lifecycle_status:    data.lifecycle_status || 'active',
    data_source:         aiUrlTrim ? `community | ${aiUrlTrim}` : 'community | manual',
    alignment_reasoning: data.hal_signals ? {
      hal_signals:     data.hal_signals,
      sfp_patterns:    data.sfp_patterns,
      score_reasoning: data.score_reasoning,
      confidence:      data.confidence,
      extracted_at:    new Date().toISOString(),
      input_mode:      'public_add',
      label:           data.label,
    } : null,
  }
}

// Extract the contact email from the actor's links array.
// Looks for link_type='email' first, then contact_form, calendly, phone.
// Returns the URL string or null.
function extractContactEmail(data) {
  const links = arr(data._aiLinks).length ? arr(data._aiLinks) : arr(data.links)
  // Prefer email link, then contact_form, calendly, phone
  const email = links.find(l => l.link_type === 'email')
  if (email) return email.url
  const contactForm = links.find(l => l.link_type === 'contact_form')
  if (contactForm) return contactForm.url
  const calendly = links.find(l => l.link_type === 'calendly')
  if (calendly) return calendly.url
  const phone = links.find(l => l.link_type === 'phone')
  if (phone) return phone.url
  return null
}

// Send a cold invite email to an org that was just added to the platform.
// This is a non-blocking operation — failures don't affect the response.
async function sendColdInvite(actorName, actorSlug, actorId, contactUrl) {
  if (!resend || !contactUrl) return // Resend not configured or no contact info
  try {
    // If contactUrl is a mailto: or tel: link, extract the email/phone
    let toEmail = contactUrl
    if (contactUrl.startsWith('mailto:')) toEmail = contactUrl.slice(7).split('?')[0]
    if (contactUrl.startsWith('tel:')) return // Skip phone numbers, can't send email

    // Only send to email addresses, not contact forms or URLs
    if (!toEmail.includes('@')) return

    const claimUrl = `${BASE_URL}/org/${actorSlug || actorId}/claim`
    const profileUrl = `${BASE_URL}/org/${actorSlug || actorId}`

    const html = `
      <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 48px 28px; color: #0F1523; background: #FAFAF7;">

        <p style="font-size: 13px; letter-spacing: 0.20em; color: #A8721A; text-transform: uppercase; margin: 0 0 32px; font-family: 'Cormorant SC', Georgia, serif;">
          NextUs · The Atlas
        </p>

        <h1 style="font-size: 30px; font-weight: 300; margin: 0 0 20px; line-height: 1.15; color: #0F1523;">
          Someone believes in what you're doing.
        </h1>

        <p style="font-size: 16px; line-height: 1.7; color: rgba(15,21,35,0.72); margin: 0 0 18px;">
          ${actorName} has been added to NextUs, an Atlas of people, organisations, and projects building the future across seven civilisational domains. Someone in our community added you because they believe in your work.
        </p>

        <p style="font-size: 16px; line-height: 1.7; color: rgba(15,21,35,0.72); margin: 0 0 28px;">
          You can see your profile here:
          <a href="${profileUrl}" style="color: #A8721A;">${profileUrl}</a>
        </p>

        <div style="background: rgba(200,146,42,0.06); border: 1.5px solid rgba(200,146,42,0.35); border-radius: 10px; padding: 22px 24px; margin: 0 0 28px;">
          <p style="font-size: 14px; font-family: 'Cormorant SC', Georgia, serif; letter-spacing: 0.16em; color: #A8721A; text-transform: uppercase; margin: 0 0 10px;">
            Claiming your profile lets you
          </p>
          <ul style="font-size: 15px; line-height: 1.75; color: rgba(15,21,35,0.72); margin: 0; padding: 0 0 0 18px;">
            <li>Add your mission, what you're working on now, and your offers</li>
            <li>Name the Horizon Goal your work moves toward</li>
            <li>Connect with challenges, asks, and people aligned with your work</li>
            <li>Control what your profile shows — the community-seeded floor stays, you add depth</li>
          </ul>
        </div>

        <a href="${claimUrl}"
          style="display: inline-block; background: #C8922A; color: #FFFFFF; text-decoration: none;
                 font-family: 'Cormorant SC', Georgia, serif; font-size: 14px; letter-spacing: 0.16em;
                 text-transform: uppercase; padding: 14px 32px; border-radius: 40px;">
          Claim this profile →
        </a>

        <p style="font-size: 13px; line-height: 1.65; color: rgba(15,21,35,0.45); margin: 32px 0 0;">
          If this entry contains incorrect information, you can dispute it directly from the profile page.
          If you believe this email was sent in error, you can ignore it — no action is needed.
        </p>

        <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid rgba(200,146,42,0.18);">
          <p style="font-size: 13px; color: rgba(15,21,35,0.40); margin: 0;">
            NextUs · The Person and the Planet. Built for both, building both.<br />
            <a href="${BASE_URL}" style="color: rgba(15,21,35,0.40);">nextus.world</a>
          </p>
        </div>

      </div>
    `

    await resend.emails.send({
      from: 'NextUs <hello@nextus.world>',
      to: toEmail,
      subject: `${actorName} is on NextUs — claim your profile`,
      html,
    })

    console.log(`[add-actor] Cold invite sent to ${toEmail} for ${actorName}`)
  } catch (err) {
    console.error(`[add-actor] Cold invite failed for ${actorName}:`, err.message)
    // Don't block the response — this is a best-effort notification
  }
}

// Links + press for one actor. data may carry primary-style (_aiLinks/_aiPress)
// or extra-style (links/press) field names — accept both.
async function saveAux(actorId, data, warnings, who) {
  const links = arr(data._aiLinks).length ? arr(data._aiLinks) : arr(data.links)
  const press = arr(data._aiPress).length ? arr(data._aiPress) : arr(data.press)

  if (links.length) {
    const rows = links.map((l, idx) => ({
      actor_id:   actorId,
      link_type:  l.link_type,
      url:        l.url,
      label:      l.label || null,
      sort_order: idx,
    }))
    const { error } = await supabase.from('actor_links').insert(rows)
    if (error) warnings.push(`${who}: links not saved (${error.message})`)
  }
  if (press.length) {
    const rows = press.map((p, idx) => ({
      actor_id:     actorId,
      publication:  p.publication,
      url:          p.url          || null,
      title:        p.title        || null,
      published_at: p.published_at || null,
      sort_order:   idx,
    }))
    const { error } = await supabase.from('actor_press').insert(rows)
    if (error) warnings.push(`${who}: press not saved (${error.message})`)
  }
}

// ── Handler ──────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  if (!process.env.SUPABASE_SERVICE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ ok: false, error: 'Service key not configured on the server.' })
  }

  const auth = await getUser(req)
  if (!auth.ok) return res.status(auth.code).json({ ok: false, error: auth.error })
  const userId = auth.userId

  const body = req.body || {}
  const represents = !!body.represents
  const aiUrl = body.aiUrl || ''
  const primary = body.primary || {}
  const extras = arr(body.extras)

  if (!str(primary.name))           return res.status(400).json({ ok: false, error: 'Name is required.' })
  if (!str(primary.primary_domain)) return res.status(400).json({ ok: false, error: 'A primary domain is required.' })

  const results   = []
  const warnings  = []
  const nameToId  = {}        // lowercased name → actor id (for relationships)
  const allActors = []        // { name, data, id }

  // ── Primary ──
  const { data: primaryRow, error: pErr } = await supabase
    .from('nextus_actors')
    .insert(buildPayload(primary, { isExtra: false, represents, userId, aiUrl }))
    .select('id, name, slug')
    .single()

  if (pErr || !primaryRow) {
    console.error('add-actor: primary insert failed', pErr)
    return res.status(200).json({
      ok: false,
      error: 'Something went wrong saving this entry. Please try again, or email hello@nextus.world if it keeps happening.',
      detail: pErr?.message || 'insert returned no row',
    })
  }

  const primaryName = str(primary.name)
  results.push({ id: primaryRow.id, slug: primaryRow.slug, name: primaryName, label: 'Primary' })
  nameToId[primaryName.toLowerCase()] = primaryRow.id
  allActors.push({ name: primaryName, data: primary, id: primaryRow.id })
  await saveAux(primaryRow.id, primary, warnings, primaryName)

  // ── Extras (ticked rows the client sent). Each is best-effort. ──
  for (const ex of extras) {
    const exName = str(ex.name)
    const hasDomain = arr(ex.domains).length || ex.domain_id
    if (!exName || !hasDomain) continue
    const { data: saved, error: eErr } = await supabase
      .from('nextus_actors')
      .insert(buildPayload(ex, { isExtra: true, represents, userId, aiUrl }))
      .select('id, name, slug')
      .single()
    if (eErr || !saved) {
      warnings.push(`Extra "${exName}" not saved (${eErr?.message || 'no row'})`)
      continue
    }
    results.push({ id: saved.id, slug: saved.slug, name: exName, label: ex.label || 'Additional' })
    nameToId[exName.toLowerCase()] = saved.id
    allActors.push({ name: exName, data: ex, id: saved.id })
    await saveAux(saved.id, ex, warnings, exName)
  }

  // ── Relationships — only where both sides exist in this batch. ──
  for (const actor of allActors) {
    for (const rel of arr(actor.data.relationships)) {
      const targetId = nameToId[str(rel.to_name)?.toLowerCase()]
      if (!targetId) continue
      if (rel.relationship_type === 'parent_child') {
        const { error } = await supabase.from('nextus_actors')
          .update({ parent_id: targetId }).eq('id', actor.id)
        if (error) warnings.push(`${actor.name}: parent link not set (${error.message})`)
      } else {
        const { error } = await supabase.from('nextus_relationships').insert({
          actor_id:          actor.id,
          related_actor_id:  targetId,
          relationship_type: rel.relationship_type,
          status:            'confirmed',
          initiated_by:      userId,
          confirmed_by:      userId,
          confirmed_at:      new Date().toISOString(),
        })
        if (error) warnings.push(`${actor.name}: relationship not saved (${error.message})`)
      }
    }
  }

  // ── Problem-chain proposals (admin review queue). Never blocks. ──
  try {
    const rows = []
    for (const actor of allActors) {
      const proposals = arr(actor.data._proposedChains).length
        ? arr(actor.data._proposedChains)
        : arr(actor.data.proposed_chains)
      for (const p of proposals) {
        if (!p?.slug || !p?.label) continue
        rows.push({
          proposed_slug: p.slug,
          label:         p.label,
          description:   p.description || null,
          domains:       arr(p.domains),
          aliases:       arr(p.aliases),
          rationale:     p.rationale || null,
          actor_id:      actor.id,
          proposed_by:   userId,
        })
      }
    }
    if (rows.length) {
      const { error } = await supabase.from('nextus_problem_chain_proposals').insert(rows)
      if (error) warnings.push(`Problem-chain proposals not saved (${error.message})`)
    }
  } catch (err) {
    warnings.push(`Problem-chain proposals skipped (${err?.message})`)
  }

  // ── Cold invites — send "you've been added" email if contact found. Never blocks. ──
  try {
    for (const actor of allActors) {
      const contactUrl = extractContactEmail(actor.data)
      if (contactUrl) {
        // Fire and forget — don't await, don't block on failures
        sendColdInvite(actor.name, results.find(r => r.id === actor.id)?.slug, actor.id, contactUrl)
          .catch(err => console.error(`[add-actor] Cold invite send failed: ${err.message}`))
      }
    }
  } catch (err) {
    console.error(`[add-actor] Cold invite phase failed: ${err.message}`)
    // Don't add to warnings — this is fully optional
  }

  return res.status(200).json({ ok: true, results, warnings })
}
