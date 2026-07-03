// api/claim-verify.js
// Claim verification for Atlas actor profiles (C1, June 2026).
//
// Actions:
//   check_domain  — given actor_id + user's current email, returns whether
//                   the email domain matches the actor's website domain.
//                   If yes, auto-approves (no code needed).
//   send_code     — sends a 6-digit verification code to a supplied
//                   org-domain email address via Resend.
//   verify_code   — checks the code, approves the claim on match.
//   submit_request — admin-fallback: stores a pending claim_request with
//                   the claimant's note and optional evidence URL.
//
// All writes use the Supabase service role so RLS doesn't block.

const { createClient }  = require('@supabase/supabase-js')
const { Resend }        = require('resend')
const { resolveUser }   = require('./_auth')

const supabase = createClient(
  process.env.SUPABASE_URL,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)
)
const resend = new Resend(process.env.RESEND_API_KEY)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractDomain(url) {
  if (!url) return null
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url)
    // Strip 'www.' prefix for loose matching
    return u.hostname.replace(/^www\./, '').toLowerCase()
  } catch { return null }
}

function emailDomain(email) {
  if (!email || !email.includes('@')) return null
  return email.split('@')[1].toLowerCase().replace(/^www\./, '')
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

async function approveClaim(actorId, userId) {
  const { error } = await supabase
    .from('nextus_actors')
    .update({
      profile_owner: userId,
      owner_id:      userId,
      updated_at:    new Date().toISOString(),
    })
    .eq('id', actorId)
    .is('profile_owner', null)   // only if still unclaimed
  return !error
}

// ─── Handler ─────────────────────────────────────────────────────────────────

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, actorId, email, code, note, evidenceUrl } = req.body || {}

  // Identity and the session's own email come from the verified token, never
  // from the body — this is the claim flow; trusting body-asserted identity
  // here means anyone could claim any unclaimed organisation.
  const sessionUser = await resolveUser(req)
  const userId = sessionUser ? sessionUser.id : null
  const sessionEmail = sessionUser ? sessionUser.email : null

  if (!actorId || !userId) return res.status(401).json({ error: 'Sign-in required' })

  // Load actor once for all actions
  const { data: actor } = await supabase
    .from('nextus_actors')
    .select('id, name, website, profile_owner')
    .eq('id', actorId)
    .maybeSingle()

  if (!actor) return res.status(404).json({ error: 'Actor not found' })
  if (actor.profile_owner) return res.status(409).json({ error: 'Already claimed', alreadyClaimed: true })

  // ── check_domain ──────────────────────────────────────────────────────────
  // Returns: { matches: bool, actorDomain: string|null, path: 'auto'|'code'|'request' }
  //   auto    — email domain matches; claim approved immediately
  //   code    — email doesn't match; offer org-email code flow
  //   request — no website on actor; offer admin fallback only
  if (action === 'check_domain') {
    const userEmailDomain = emailDomain(sessionEmail || '')
    const actorDomain     = extractDomain(actor.website)

    if (!actorDomain) {
      return res.json({ matches: false, actorDomain: null, path: 'request' })
    }

    const matches = userEmailDomain === actorDomain

    if (matches) {
      // Auto-approve — user's own email already proves domain ownership
      const approved = await approveClaim(actorId, userId)
      if (!approved) return res.status(500).json({ error: 'Could not complete claim. The profile may have just been claimed.' })
      return res.json({ matches: true, actorDomain, path: 'auto', approved: true })
    }

    return res.json({ matches: false, actorDomain, path: 'code' })
  }

  // ── send_code ─────────────────────────────────────────────────────────────
  // Validates the supplied email is at the actor's domain, generates a code,
  // stores it, and sends it via Resend.
  if (action === 'send_code') {
    if (!email) return res.status(400).json({ error: 'email required' })

    const actorDomain = extractDomain(actor.website)
    if (!actorDomain) {
      return res.status(400).json({ error: 'This actor has no website — use the admin-review path.' })
    }

    const supplied = emailDomain(email)
    if (supplied !== actorDomain) {
      return res.status(422).json({
        error: `That email address doesn't match ${actorDomain}. Enter an address at that domain.`,
        actorDomain,
      })
    }

    const verificationCode = generateCode()
    const expiresAt        = new Date(Date.now() + 30 * 60 * 1000).toISOString()

    // Upsert — replace any prior pending code for this pair
    await supabase.from('claim_verifications').upsert({
      actor_id:   actorId,
      user_id:    userId,
      email:      email.toLowerCase().trim(),
      code:       verificationCode,
      verified:   false,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    }, { onConflict: 'actor_id,user_id' })

    try {
      await resend.emails.send({
        from:    'NextUs <noreply@nextus.world>',
        to:      email.toLowerCase().trim(),
        subject: `Your NextUs claim code for ${actor.name}`,
        html: `
          <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; color: #0F1523;">
            <p style="font-size: 13px; letter-spacing: 0.18em; color: #A8721A; text-transform: uppercase; margin: 0 0 24px;">NextUs · Claim Verification</p>
            <h1 style="font-size: 28px; font-weight: 300; margin: 0 0 16px;">Your verification code.</h1>
            <p style="font-size: 16px; line-height: 1.65; color: rgba(15,21,35,0.72); margin: 0 0 28px;">
              Someone requested to claim <strong>${actor.name}</strong> on NextUs using this address.
              If this was you, enter the code below to complete the claim.
            </p>
            <div style="background: rgba(200,146,42,0.08); border: 1.5px solid rgba(200,146,42,0.4); border-radius: 10px; padding: 24px; text-align: center; margin: 0 0 28px;">
              <span style="font-family: 'Courier New', monospace; font-size: 36px; letter-spacing: 0.25em; color: #0F1523; font-weight: 600;">${verificationCode}</span>
            </div>
            <p style="font-size: 14px; color: rgba(15,21,35,0.55); line-height: 1.6; margin: 0;">
              This code expires in 30 minutes. If you didn't request this, ignore this email — no action is needed.
            </p>
          </div>
        `,
      })
    } catch (err) {
      console.error('[claim-verify] Resend error:', err)
      return res.status(500).json({ error: 'Could not send verification email. Please try again.' })
    }

    return res.json({ sent: true, emailDomain: actorDomain })
  }

  // ── verify_code ───────────────────────────────────────────────────────────
  if (action === 'verify_code') {
    if (!code) return res.status(400).json({ error: 'code required' })

    const { data: record } = await supabase
      .from('claim_verifications')
      .select('*')
      .eq('actor_id', actorId)
      .eq('user_id',  userId)
      .eq('verified', false)
      .maybeSingle()

    if (!record)              return res.status(404).json({ error: 'No pending verification found. Request a new code.' })
    if (new Date(record.expires_at) < new Date()) return res.status(410).json({ error: 'Code expired. Request a new one.', expired: true })
    if (record.code !== String(code).trim())      return res.status(422).json({ error: 'Incorrect code. Check and try again.', incorrect: true })

    // Mark verified
    await supabase.from('claim_verifications')
      .update({ verified: true, verified_at: new Date().toISOString() })
      .eq('id', record.id)

    const approved = await approveClaim(actorId, userId)
    if (!approved) return res.status(500).json({ error: 'Verification passed but claim failed. The profile may have just been claimed by someone else.' })

    return res.json({ verified: true, approved: true })
  }

  // ── submit_request ────────────────────────────────────────────────────────
  // Admin-fallback path: claimant can't access an org email.
  // Stores a pending claim_request for admin review.
  if (action === 'submit_request') {
    const { error } = await supabase.from('claim_requests').upsert({
      actor_id:     actorId,
      user_id:      userId,
      note:         (note || '').slice(0, 2000),
      evidence_url: (evidenceUrl || '').slice(0, 500) || null,
      user_email:   (sessionEmail || '').slice(0, 254) || null,
      status:       'pending',
      updated_at:   new Date().toISOString(),
    }, { onConflict: 'actor_id,user_id' })

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ submitted: true })
  }

  return res.status(400).json({ error: `Unknown action: ${action}` })
}
