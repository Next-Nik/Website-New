// api/grant-beta-access.js
// Grants full access directly — no Stripe checkout required.
// Handles two types:
//   - Beta codes (BETA50, BETACORE75, FRIEND) — known set, welcome type: 'beta'
//   - NextCore codes (personal per-user codes) — validated via Stripe, welcome type: 'nextcore'
//
// POST body: { userId, promoCode, ref? }
// Returns:   { success: true, welcomeType: 'beta'|'nextcore' } or { error: string }

const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Known beta codes
const BETA_PROMO_CODES = new Set(['BETA50', 'BETACORE75', 'FRIEND'])

// All tools granted with access
const ALL_PRODUCTS = ['horizon-state', 'purpose-piece', 'map', 'target-sprint', 'horizon-practice']

// Kit tag IDs
const PROMO_GROUP_MAP = {
  'BETA50':      { group: 'beta_tester', kitTagId: 19032269 },
  'BETACORE75':  { group: 'beta_core',   kitTagId: 19032272 },
  'EARLYBIRD50': { group: 'early_bird',  kitTagId: 19032276 },
  'FRIEND':      { group: 'referred',    kitTagId: 19032279 },
}

async function grantAccess(userId, source) {
  for (const product of ALL_PRODUCTS) {
    await supabase.from('access').upsert({
      user_id:    userId,
      product,
      tier:       'full',
      source,
      granted_at: new Date().toISOString(),
      expires_at: null,
    }, { onConflict: 'user_id,product' })
  }
}

async function tagUserGroup(userId, email, code, group, kitTagId) {
  if (group) {
    await supabase.from('users').update({ beta_group: group }).eq('id', userId)
  }
  if (email && kitTagId) {
    await tagInKit(email, kitTagId)
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
    if (!res.ok) console.error('Kit tag error:', res.status, await res.text())
  } catch (err) {
    console.error('Kit tag fetch failed:', err)
  }
}

async function getUserEmail(userId) {
  const { data } = await supabase.from('users').select('email').eq('id', userId).limit(1).maybeSingle()
  return data?.email ?? null
}

// Validate a NextCore code via Stripe — must be active and 100% off
async function validateNextCoreCode(code) {
  try {
    const promoCodes = await stripe.promotionCodes.list({ code, limit: 1, active: true })
    if (!promoCodes.data.length) return false
    const coupon = promoCodes.data[0].coupon
    return coupon.percent_off === 100
  } catch {
    return false
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, promoCode, ref } = req.body

  if (!userId)    return res.status(400).json({ error: 'Missing userId' })
  if (!promoCode) return res.status(400).json({ error: 'Missing promoCode' })

  const code = promoCode.toUpperCase()
  let welcomeType = null

  // Determine welcome type
  if (BETA_PROMO_CODES.has(code)) {
    welcomeType = 'beta'
  } else {
    // Check Stripe — NextCore personal code
    const isNextCore = await validateNextCoreCode(code)
    if (isNextCore) {
      welcomeType = 'nextcore'
    } else {
      return res.status(400).json({ error: 'Not a valid access code' })
    }
  }

  try {
    const source = welcomeType === 'nextcore' ? 'nextcore' : 'beta'
    await grantAccess(userId, source)

    const email = await getUserEmail(userId)
    const mapping = PROMO_GROUP_MAP[code]

    if (welcomeType === 'nextcore') {
      await supabase.from('users').update({ beta_group: 'nextus_core' }).eq('id', userId)
      if (email) await tagInKit(email, 19032283) // NextCore Kit tag
    } else {
      await tagUserGroup(userId, email, code, mapping?.group, mapping?.kitTagId)
    }

    if (ref) {
      await supabase.from('users').update({ referred_by: ref }).eq('id', userId)
    }

    return res.json({ success: true, welcomeType })

  } catch (err) {
    console.error('grant-beta-access error:', err)
    return res.status(500).json({ error: 'Failed to grant access' })
  }
}
