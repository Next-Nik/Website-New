// api/actor-outreach.js
// C6 — Outreach email for seeded actors (June 2026).
//
// Sends the "you're on the map, claim it" email to a supplied address.
// Called from the AdminConsole Floor tab on a per-actor basis.
// Rate-limited: one email per actor per 7 days (checked in DB).
//
// The email is TED-tight: no origin story, no emotional setup.
// Reports what the platform is, what the profile contains, and
// gives a direct claim link.

const { createClient } = require('@supabase/supabase-js')
const { Resend }       = require('resend')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const resend   = new Resend(process.env.RESEND_API_KEY)

const BASE_URL = process.env.NEXTUS_BASE_URL || 'https://nextus.world'

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { actorId, toEmail, toName, adminUserId } = req.body || {}
  if (!actorId || !toEmail) return res.status(400).json({ error: 'actorId and toEmail required' })

  // Load actor
  const { data: actor } = await supabase
    .from('nextus_actors')
    .select('id, name, slug, description, domains, domain_id, website, image_url, profile_owner, outreach_sent_at')
    .eq('id', actorId)
    .maybeSingle()

  if (!actor) return res.status(404).json({ error: 'Actor not found' })
  if (actor.profile_owner) return res.status(409).json({ error: 'Actor already claimed' })

  // 7-day rate limit
  if (actor.outreach_sent_at) {
    const daysSince = (Date.now() - new Date(actor.outreach_sent_at)) / (1000 * 60 * 60 * 24)
    if (daysSince < 7) {
      return res.status(429).json({ error: `Outreach already sent ${Math.floor(daysSince)} day(s) ago. Wait ${7 - Math.floor(daysSince)} more day(s).` })
    }
  }

  const claimUrl   = `${BASE_URL}/org/${actor.slug || actor.id}/claim`
  const profileUrl = `${BASE_URL}/org/${actor.slug || actor.id}`
  const recipientName = toName || actor.name

  const html = `
    <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 48px 28px; color: #0F1523; background: #FAFAF7;">

      <p style="font-size: 13px; letter-spacing: 0.20em; color: #A8721A; text-transform: uppercase; margin: 0 0 32px; font-family: 'Cormorant SC', Georgia, serif;">
        NextUs · The Atlas
      </p>

      <h1 style="font-size: 30px; font-weight: 300; margin: 0 0 20px; line-height: 1.15; color: #0F1523;">
        ${recipientName} is on NextUs.
      </h1>

      <p style="font-size: 16px; line-height: 1.7; color: rgba(15,21,35,0.72); margin: 0 0 18px;">
        NextUs is an Atlas of the people, organisations, and projects building the future — organised around
        seven civilisational domains. A profile for ${actor.name} has been placed in the Atlas by the community
        and is currently held in trust by NextUs until claimed.
      </p>

      <p style="font-size: 16px; line-height: 1.7; color: rgba(15,21,35,0.72); margin: 0 0 28px;">
        You can see it here:
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

  try {
    await resend.emails.send({
      from:    'NextUs <outreach@nextus.world>',
      to:      toEmail,
      subject: `${actor.name} is on NextUs — claim your profile`,
      html,
    })

    // Record outreach
    await supabase.from('nextus_actors')
      .update({ outreach_sent_at: new Date().toISOString() })
      .eq('id', actorId)

    // Log for admin trail
    await supabase.from('actor_outreach_log').insert({
      actor_id:     actorId,
      to_email:     toEmail,
      sent_by:      adminUserId || null,
      sent_at:      new Date().toISOString(),
    }).catch(() => {})  // log table may not exist yet — fails silently

    return res.json({ sent: true, to: toEmail })
  } catch (err) {
    console.error('[actor-outreach] Resend error:', err)
    return res.status(500).json({ error: 'Email failed to send. Check Resend config.' })
  }
}
