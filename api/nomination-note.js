// api/nomination-note.js
// The human-vouched nomination note (2a).
//
// System-sent, but never junk mail. It inverts every sweepstakes tell:
//   - demonstrates the honour (the drafted profile does the work) rather than
//     declaring it,
//   - gives a specific, verifiable reason drawn from the nomination,
//   - carries a community vouch — a person suggested this, not an algorithm,
//   - offers a real one-click exit before the ask.
//
// Tiered: only human-vouched actors (community-seeded / nominated) get it.
// Pure system-seeds get silence — a manufactured welcome is junk mail no
// matter the words.

const { createClient } = require('@supabase/supabase-js')
const { Resend }       = require('resend')
const crypto           = require('crypto')

const supabase = createClient(process.env.SUPABASE_URL, (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY))
const resend   = new Resend(process.env.RESEND_API_KEY)
const BASE_URL = process.env.NEXTUS_BASE_URL || 'https://nextus.world'

const DOMAIN_LABELS = {
  'human-being': 'Human Being', 'society': 'Society', 'nature': 'Nature',
  'technology': 'Technology', 'finance-economy': 'Finance and Economy',
  'legacy': 'Legacy', 'vision': 'Vision',
}

function firstSentence(text) {
  if (!text) return ''
  const t = String(text).trim()
  const m = t.match(/^(.*?[.!?])(\s|$)/)
  const s = (m ? m[1] : t).trim()
  return s.length > 180 ? s.slice(0, 177).trimEnd() + '...' : s
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { actorId, toEmail, nominatorName } = req.body || {}
  if (!actorId || !toEmail) return res.status(400).json({ error: 'actorId and toEmail required' })

  const { data: actor } = await supabase
    .from('nextus_actors')
    .select('id, name, slug, description, tagline, domains, domain_id, seeded_by, vetting_status, profile_owner, nominator_name, nominator_can_name, outreach_sent_at, declined_at, status')
    .eq('id', actorId)
    .maybeSingle()

  if (!actor)                return res.status(404).json({ error: 'Actor not found' })
  if (actor.profile_owner)   return res.status(409).json({ error: 'Actor already claimed' })
  if (actor.declined_at || actor.status === 'suspended')
                             return res.status(409).json({ error: 'Actor was removed at the org\'s request' })

  // Tier gate: human-vouched only.
  const humanVouched = actor.seeded_by === 'community' || actor.vetting_status === 'nominated'
  if (!humanVouched) return res.status(403).json({ error: 'Not a human-vouched nomination; no note is sent.' })

  // 7-day send clock (shared with outreach).
  if (actor.outreach_sent_at) {
    const days = (Date.now() - new Date(actor.outreach_sent_at)) / 86400000
    if (days < 7) return res.status(429).json({ error: `A note was sent ${Math.floor(days)} day(s) ago.` })
  }

  // The vouch. Named only if the nominator opted in.
  const named   = (nominatorName && actor.nominator_can_name) ? nominatorName
                : (actor.nominator_can_name && actor.nominator_name) ? actor.nominator_name : null
  const vouch   = named
    ? `${named} suggested your work, so we drafted a profile for ${actor.name} on NextUs.`
    : `Someone in the NextUs community suggested your work, so we drafted a profile for ${actor.name} on NextUs.`

  const domainSlug  = (actor.domains && actor.domains[0]) || actor.domain_id || ''
  const domainLabel = DOMAIN_LABELS[domainSlug] || null
  const reason      = firstSentence(actor.description || actor.tagline)
  const reasonLine  = domainLabel
    ? (reason ? `We placed it under ${domainLabel} because ${reason}` : `We placed it under ${domainLabel}.`)
    : (reason ? reason : '')

  const declineToken = crypto.randomBytes(16).toString('hex')
  const claimUrl   = `${BASE_URL}/org/${actor.slug || actor.id}/claim`
  const profileUrl = `${BASE_URL}/org/${actor.slug || actor.id}`
  const removeUrl  = `${BASE_URL}/remove/${declineToken}`

  const html = `
    <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 48px 28px; color: #0F1523; background: #FAFAF7;">
      <p style="font-size: 13px; letter-spacing: 0.20em; color: #A8721A; text-transform: uppercase; margin: 0 0 30px; font-family: 'Cormorant SC', Georgia, serif;">NextUs · The Atlas</p>

      <p style="font-size: 17px; line-height: 1.7; color: #0F1523; margin: 0 0 18px;">${vouch}</p>

      ${reasonLine ? `<p style="font-size: 16px; line-height: 1.7; color: rgba(15,21,35,0.72); margin: 0 0 18px;">${reasonLine} You can read the full draft and see how it is framed: <a href="${profileUrl}" style="color:#A8721A;">${profileUrl}</a></p>` : `<p style="font-size: 16px; line-height: 1.7; color: rgba(15,21,35,0.72); margin: 0 0 18px;">You can read the full draft and see how it is framed: <a href="${profileUrl}" style="color:#A8721A;">${profileUrl}</a></p>`}

      <p style="font-size: 16px; line-height: 1.7; color: rgba(15,21,35,0.72); margin: 0 0 26px;">NextUs maps the people, organisations, and projects building a future worth living in, so others can find that work and join it.</p>

      <p style="font-size: 16px; line-height: 1.7; color: rgba(15,21,35,0.72); margin: 0 0 24px;">The profile is yours to claim, correct, or take down.</p>

      <a href="${claimUrl}" style="display:inline-block; background:#C8922A; color:#FFFFFF; text-decoration:none; font-family:'Cormorant SC', Georgia, serif; font-size:14px; letter-spacing:0.16em; text-transform:uppercase; padding:14px 32px; border-radius:40px;">Claim your profile &rarr;</a>

      <p style="font-size: 14px; line-height: 1.65; color: rgba(15,21,35,0.55); margin: 28px 0 0;">Not a fit? You can <a href="${removeUrl}" style="color:rgba(15,21,35,0.6);">remove it in one step</a>. No account needed.</p>

      <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid rgba(200,146,42,0.18);">
        <p style="font-size: 13px; color: rgba(15,21,35,0.40); margin: 0;">NextUs · The Person and the Planet. Built for both, building both.<br /><a href="${BASE_URL}" style="color: rgba(15,21,35,0.40);">nextus.world</a></p>
      </div>
    </div>
  `

  try {
    await resend.emails.send({
      from:    'NextUs <outreach@nextus.world>',
      to:      toEmail,
      subject: `A profile for ${actor.name} on NextUs`,
      html,
    })

    await supabase.from('nextus_actors')
      .update({ outreach_sent_at: new Date().toISOString(), decline_token: declineToken })
      .eq('id', actorId)

    return res.json({ sent: true, to: toEmail })
  } catch (err) {
    console.error('[nomination-note] Resend error:', err)
    return res.status(500).json({ error: 'Email failed to send.' })
  }
}
