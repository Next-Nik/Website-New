// api/guide-ping.js
//
// Warm pings for the Field Guide (July 2026).
//
// Fired (fire-and-forget) from the client after a real guide act:
//   kind 'championed'      — the caller made this org one of their champions
//   kind 'added_to_guide'  — the caller wrote a field note (collected the org)
//
// The server VERIFIES the act happened (a matching row exists for the
// authenticated caller) before sending anything — the body is never
// trusted on its own. The ping goes to the actor's profile_owner's email.
// Unclaimed actors get nothing here (the cold invite in /api/add-actor
// covers first contact).
//
// Anti-noise:
//   · one ping per actor per kind per 7 days (guide_ping_log)
//   · the sender is never identified — "a NextUs member", by design
//   · one-tap ignorable; links only to the actor's own surfaces
//
// Auth:  Authorization: Bearer <supabase access token>.
// Body:  { actorId, kind }
// Returns 200 { sent: bool, reason? } — never a hard error to the UI flow.

const { createClient } = require('@supabase/supabase-js')
const { Resend } = require('resend')

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://tphbpwzozkskytoichho.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
)

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const BASE_URL = process.env.NEXTUS_BASE_URL || 'https://nextus.world'

const PING_COOLDOWN_DAYS = 7

const COPY = {
  championed: {
    subject: (name) => `${name} — a NextUs member made you one of their champions`,
    headline: 'You were made a champion.',
    body: (name) =>
      `A NextUs member made <b>${name}</b> one of their champions — the five to ten ` +
      `organisations they're choosing to be shaped by. Their guide holds many; ` +
      `their champions are few, and you're one of them.`,
    cta: 'See your entry',
  },
  added_to_guide: {
    subject: (name) => `${name} was added to a member's field guide on NextUs`,
    headline: 'Someone wrote you into their field guide.',
    body: (name) =>
      `A NextUs member encountered <b>${name}</b> and wrote you into their field ` +
      `guide — the record of the organisations they've met and want to keep track of.`,
    cta: 'See your entry',
  },
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ sent: false, reason: 'method' })
  if (!resend) return res.status(200).json({ sent: false, reason: 'email_unconfigured' })

  try {
    // ── Auth ──
    const auth = req.headers.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) return res.status(401).json({ sent: false, reason: 'no_token' })
    const { data: userData, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !userData?.user) return res.status(401).json({ sent: false, reason: 'bad_token' })
    const userId = userData.user.id

    const { actorId, kind } = req.body || {}
    if (!actorId || !COPY[kind]) return res.status(400).json({ sent: false, reason: 'bad_request' })

    // ── Verify the act actually exists for this caller ──
    const table = kind === 'championed' ? 'actor_champions' : 'actor_field_notes'
    const { data: actRow } = await supabase
      .from(table)
      .select('id')
      .eq('user_id', userId)
      .eq('actor_id', actorId)
      .maybeSingle()
    if (!actRow) return res.status(200).json({ sent: false, reason: 'no_matching_act' })

    // ── Load actor + owner ──
    const { data: actor } = await supabase
      .from('nextus_actors')
      .select('id, name, slug, profile_owner, status')
      .eq('id', actorId)
      .maybeSingle()
    if (!actor || actor.status !== 'live') return res.status(200).json({ sent: false, reason: 'no_actor' })
    if (!actor.profile_owner) return res.status(200).json({ sent: false, reason: 'unclaimed' })
    if (actor.profile_owner === userId) return res.status(200).json({ sent: false, reason: 'self' })

    // ── Throttle: one ping per actor per kind per 7 days ──
    const since = new Date(Date.now() - PING_COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from('guide_ping_log')
      .select('id')
      .eq('actor_id', actorId)
      .eq('kind', kind)
      .gte('sent_at', since)
      .limit(1)
    if (recent && recent.length > 0) return res.status(200).json({ sent: false, reason: 'throttled' })

    // ── Owner email (service key → auth admin) ──
    const { data: ownerData, error: ownerErr } =
      await supabase.auth.admin.getUserById(actor.profile_owner)
    const toEmail = ownerData?.user?.email
    if (ownerErr || !toEmail) return res.status(200).json({ sent: false, reason: 'no_owner_email' })

    const copy = COPY[kind]
    const entryUrl = `${BASE_URL}/org/${actor.slug || actor.id}`

    const html = `
      <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 48px 28px; color: #262420; background: #f3f0e9;">
        <p style="font-size: 13px; letter-spacing: 0.20em; color: #a9743f; text-transform: uppercase; margin: 0 0 32px; font-family: 'Cormorant SC', Georgia, serif;">
          NextUs · The Field Guide
        </p>
        <h1 style="font-size: 28px; font-weight: 300; margin: 0 0 20px; line-height: 1.2; color: #262420;">
          ${copy.headline}
        </h1>
        <p style="font-size: 16px; line-height: 1.7; color: rgba(38,36,32,0.72); margin: 0 0 28px;">
          ${copy.body(actor.name)}
        </p>
        <a href="${entryUrl}"
          style="display: inline-block; background: #a9743f; color: #FFFFFF; text-decoration: none;
                 font-family: 'Cormorant SC', Georgia, serif; font-size: 14px; letter-spacing: 0.16em;
                 text-transform: uppercase; padding: 13px 30px; border-radius: 40px;">
          ${copy.cta} →
        </a>
        <p style="font-size: 13px; line-height: 1.65; color: rgba(38,36,32,0.45); margin: 32px 0 0;">
          Members' guides are private — we don't share who. You'll hear this at most once a week.
          Manage what reaches you from your org settings on NextUs.
        </p>
        <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid rgba(169,116,63,0.25);">
          <p style="font-size: 13px; color: rgba(38,36,32,0.40); margin: 0;">
            NextUs · The Person and the Planet. Built for both, building both.<br />
            <a href="${BASE_URL}" style="color: rgba(38,36,32,0.40);">nextus.world</a>
          </p>
        </div>
      </div>
    `

    await resend.emails.send({
      from: 'NextUs <hello@nextus.world>',
      to: toEmail,
      subject: copy.subject(actor.name),
      html,
    })

    await supabase.from('guide_ping_log').insert({ actor_id: actorId, kind })

    return res.status(200).json({ sent: true })
  } catch (err) {
    console.error('[guide-ping] failed:', err?.message)
    return res.status(200).json({ sent: false, reason: 'error' })
  }
}
