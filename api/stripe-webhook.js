// api/stripe-webhook.js
// Vercel serverless function — receives Stripe events and writes to access table
//
// Environment variables required:
//   STRIPE_SECRET_KEY       — Stripe secret key
//   STRIPE_WEBHOOK_SECRET   — from Stripe Dashboard → Webhooks → signing secret
//   SUPABASE_URL            — your Supabase project URL
//   SUPABASE_SERVICE_KEY    — service role key (NOT anon key — needs to bypass RLS)
//   KIT_API_KEY             — Kit (ConvertKit) API key
//   KIT_API_URL             — Kit API base URL (https://api.convertkit.com/v3)

const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// ── Promotion code → group mapping ────────────────────────────────────────────
// Add new promo codes here as they are created in Stripe.
// group:    written to users.beta_group in Supabase
// kitTagId: Kit tag ID — get from Kit Dashboard → Subscribers → Tags
const PROMO_GROUP_MAP = {
  'BETATESTER': { group: 'beta_tester', kitTagId: null }, // replace null with Kit tag ID
  'BETACORE':   { group: 'beta_core',   kitTagId: null },
  'NEXTCORE':   { group: 'nextus_core', kitTagId: null },
  'EARLYBIRD':  { group: 'early_bird',  kitTagId: null },
}

// ── Price → product mapping ───────────────────────────────────────────────────
// All product keys use canonical tool names from src/constants/tools.js
const PRICE_MAP = {
  // Individual tools — one-time
  'price_1TKSkxCWnSAIfnqOzwgzuOh0': { product: 'map',              tier: 'full', type: 'one_time'     },
  'price_1TKOiECWnSAIfnqOOjtYCm61': { product: 'map',              tier: 'full', type: 'one_time'     },
  'price_1TKOaGCWnSAIfnqO0s4UODYQ': { product: 'purpose-piece',    tier: 'full', type: 'one_time'     },
  'price_1TKOipCWnSAIfnqOkTYB0TIr': { product: 'target-sprint',    tier: 'full', type: 'one_time'     },

  // Individual tools — subscription
  'price_1TKOTXCWnSAIfnqOLKGOtzfG': { product: 'horizon-state',    tier: 'full', type: 'subscription' },
  'price_1TKOXtCWnSAIfnqOth3lKfoh': { product: 'horizon-state',    tier: 'full', type: 'subscription' },
  'price_1TKOl1CWnSAIfnqOy2easXyV': { product: 'horizon-practice', tier: 'full', type: 'subscription' },
  'price_1TKOlgCWnSAIfnqOMwJga9jB': { product: 'horizon-practice', tier: 'full', type: 'subscription' },

  // NextUs Self bundle — grants all tools
  'price_1TKOqcCWnSAIfnqOXXzytZiC': { product: ['horizon-state','purpose-piece','map','target-sprint','horizon-practice'], tier: 'full', type: 'subscription' },
  'price_1TKOr2CWnSAIfnqO6bIE7cEj': { product: ['horizon-state','purpose-piece','map','target-sprint','horizon-practice'], tier: 'full', type: 'subscription' },
}

// ── User lookup helpers ───────────────────────────────────────────────────────

async function getUserById(userId) {
  if (!userId) return null
  const { data } = await supabase.from('users').select('id').eq('id', userId).limit(1).maybeSingle()
  return data?.id ?? null
}

async function getUserIdByEmail(email) {
  if (!email) return null
  const { data } = await supabase.from('users').select('id').eq('email', email).limit(1).maybeSingle()
  return data?.id ?? null
}

async function getUserEmailById(userId) {
  if (!userId) return null
  const { data } = await supabase.from('users').select('email').eq('id', userId).limit(1).maybeSingle()
  return data?.email ?? null
}

async function getUserIdByStripeCustomer(stripeCustomerId) {
  if (!stripeCustomerId) return null
  const { data } = await supabase.from('users').select('id').eq('stripe_customer_id', stripeCustomerId).limit(1).maybeSingle()
  return data?.id ?? null
}

async function storeStripeCustomerId(userId, stripeCustomerId) {
  if (!userId || !stripeCustomerId) return
  await supabase.from('users').update({ stripe_customer_id: stripeCustomerId }).eq('id', userId).is('stripe_customer_id', null)
}

// ── Access helpers ────────────────────────────────────────────────────────────

async function grantAccess(userId, products, tier) {
  for (const product of products) {
    await supabase.from('access').upsert({
      user_id:    userId,
      product,
      tier,
      source:     'purchase',
      granted_at: new Date().toISOString(),
      expires_at: null,
    }, { onConflict: 'user_id,product' })
  }
}

async function revokeAccess(userId, products) {
  for (const product of products) {
    await supabase.from('access').update({ expires_at: new Date().toISOString() })
      .eq('user_id', userId).eq('product', product)
  }
}

// ── Group tagging ─────────────────────────────────────────────────────────────

async function tagUserGroup(userId, email, promoCode) {
  if (!promoCode) return
  const mapping = PROMO_GROUP_MAP[promoCode.toUpperCase()]
  if (!mapping) return

  // Write group to Supabase users table
  await supabase.from('users')
    .update({ beta_group: mapping.group })
    .eq('id', userId)

  // Tag in Kit
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

// ── Raw body helper ───────────────────────────────────────────────────────────

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

// ── Handler ───────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const sig = req.headers['stripe-signature']
  let event
  let rawBody

  try {
    rawBody = await getRawBody(req)
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature failed:', err.message)
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object

        // For subscriptions with a trial, payment_status is 'no_payment_required' until
        // the trial ends — grant access immediately so the user can get in.
        const isTrialling = session.mode === 'subscription' && session.payment_status === 'no_payment_required'
        if (session.payment_status !== 'paid' && !isTrialling) break

        let userId = await getUserById(session.client_reference_id)
        if (!userId) userId = await getUserIdByEmail(session.customer_details?.email)

        if (!userId) {
          const email = session.customer_details?.email
          console.error('No user found:', email)
          await supabase.from('access_pending').insert({
            email:              email ?? null,
            stripe_session_id:  session.id,
            stripe_customer_id: session.customer ?? null,
            created_at:         new Date().toISOString(),
          }).catch(() => {})
          break
        }

        if (session.customer) await storeStripeCustomerId(userId, session.customer)

        // Resolve email for Kit tagging
        const email = session.customer_details?.email ?? await getUserEmailById(userId)

        // Grant access for each line item
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
        for (const item of lineItems.data) {
          const mapping = PRICE_MAP[item.price?.id]
          if (!mapping) { console.warn('No mapping for price:', item.price?.id); continue }
          const products = Array.isArray(mapping.product) ? mapping.product : [mapping.product]
          await grantAccess(userId, products, mapping.tier)
        }

        // Tag group based on promo code used at checkout
        const promoCode = session.total_details?.breakdown?.discounts?.[0]?.discount?.promotion_code?.code
          ?? session.discounts?.[0]?.promotion_code?.code
          ?? null
        await tagUserGroup(userId, email, promoCode)

        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object
        let userId = await getUserIdByStripeCustomer(sub.customer)
        if (!userId) {
          try {
            const customer = await stripe.customers.retrieve(sub.customer)
            userId = await getUserIdByEmail(customer?.email)
          } catch {}
        }
        if (!userId) break

        const mapping = PRICE_MAP[sub.items?.data?.[0]?.price?.id]
        if (!mapping) break
        const products = Array.isArray(mapping.product) ? mapping.product : [mapping.product]
        if (sub.status === 'active' || sub.status === 'trialing') await grantAccess(userId, products, mapping.tier)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        let userId = await getUserIdByStripeCustomer(sub.customer)
        if (!userId) {
          try {
            const customer = await stripe.customers.retrieve(sub.customer)
            userId = await getUserIdByEmail(customer?.email)
          } catch {}
        }
        if (!userId) break

        const mapping = PRICE_MAP[sub.items?.data?.[0]?.price?.id]
        if (!mapping) break
        const products = Array.isArray(mapping.product) ? mapping.product : [mapping.product]
        await revokeAccess(userId, products)
        break
      }

      case 'invoice.payment_failed': {
        console.warn('Payment failed:', event.data.object.id)
        break
      }
    }

    res.status(200).json({ received: true })

  } catch (err) {
    console.error('Webhook handler error:', err)
    res.status(500).json({ error: 'Webhook handler failed' })
  }
}
