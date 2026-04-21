// api/grant-beta-access.js
// Grants full access to beta users directly — no Stripe checkout required.
// Called from Checkout.jsx when a beta promo code is detected.
//
// POST body: { userId, promoCode, ref? }
// Returns:   { success: true } or { error: string }

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Beta promo codes that bypass Stripe entirely.
// Must match TRIAL_PROMO_CODES in create-checkout.js.
const BETA_PROMO_CODES = new Set(['BETA50', 'BETACORE75', 'FRIEND'])

// All tools granted with beta access
const BETA_PRODUCTS = ['horizon-state', 'purpose-piece', 'map', 'target-sprint', 'horizon-practice']

// Kit tag IDs — keep in sync with PROMO_GROUP_MAP in stripe-webhook.js
const PROMO_GROUP_MAP = {
  'BETA50':      { group: 'beta_tester', kitTagId: 19032269 },
  'BETACORE75':  { group: 'beta_core',   kitTagId: 19032272 },
  'EARLYBIRD50': { group: 'early_bird',  kitTagId: 19032276 },
  'FRIEND':      { group: 'referred',    kitTagId: 19032279 },
}

async function grantAccess(userId) {
  for (const product of BETA_PRODUCTS) {
    await supabase.from('access').upsert({
      user_id:    userId,
      product,
      tier:       'full',
      source:     'beta',
      granted_at: new Date().toISOString(),
      expires_at: null,
    }, { onConflict: 'user_id,product' })
  }
}

async function tagUserGroup(userId, email, promoCode) {
  if (!promoCode) return
  const mapping = PROMO_GROUP_MAP[promoCode.toUpperCase()]
  if (!mapping) return

  await supabase.from('users')
    .update({ beta_group: mapping.group })
    .eq('id', userId)

  if (email && mapping.kitTagId) {
    await tagInKit(email, mapping.kitTagId)
  }
}

async function tagInKit(email, tagId) {
  if (!email || !tagId) return
  try {
    const res = await fetch(`${process.env.KIT_API_URL}/tags/${tagId}/subscribe`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ api_key: process.env.KIT_API_KEY, email }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error('Kit tag error:', res.status, body)
    }
  } catch (err) {
    console.error('Kit tag fetch failed:', err)
  }
}

async function getUserEmail(userId) {
  const { data } = await supabase.from('users').select('email').eq('id', userId).limit(1).maybeSingle()
  return data?.email ?? null
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, promoCode, ref } = req.body

  if (!userId)    return res.status(400).json({ error: 'Missing userId' })
  if (!promoCode) return res.status(400).json({ error: 'Missing promoCode' })

  const code = promoCode.toUpperCase()

  if (!BETA_PROMO_CODES.has(code)) {
    return res.status(400).json({ error: 'Not a beta promo code' })
  }

  try {
    // Grant access to all tools
    await grantAccess(userId)

    // Tag in Supabase and Kit
    const email = await getUserEmail(userId)
    await tagUserGroup(userId, email, code)

    // Store referral source if present
    if (ref) {
      await supabase.from('users').update({ referred_by: ref }).eq('id', userId)
    }

    return res.json({ success: true })

  } catch (err) {
    console.error('grant-beta-access error:', err)
    return res.status(500).json({ error: 'Failed to grant access' })
  }
}
