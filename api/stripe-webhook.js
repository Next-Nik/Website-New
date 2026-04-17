// api/stripe-webhook.js
// Vercel serverless function — receives Stripe events and writes to access table
//
// Environment variables required:
//   STRIPE_SECRET_KEY       — Stripe secret key
//   STRIPE_WEBHOOK_SECRET   — from Stripe Dashboard → Webhooks → signing secret
//   SUPABASE_URL            — your Supabase project URL
//   SUPABASE_SERVICE_KEY    — service role key (NOT anon key — needs to bypass RLS)

const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const PRICE_MAP = {
  'price_1TKSkxCWnSAIfnqOzwgzuOh0': { product: 'map', tier: 'full', type: 'one_time' },
  'price_1TKOTXCWnSAIfnqOLKGOtzfG': { product: 'foundation', tier: 'full', type: 'subscription' },
  'price_1TKOXtCWnSAIfnqOth3lKfoh': { product: 'foundation', tier: 'full', type: 'subscription' },
  'price_1TKOaGCWnSAIfnqO0s4UODYQ': { product: 'purpose_piece', tier: 'full', type: 'one_time' },
  'price_1TKOiECWnSAIfnqOOjtYCm61': { product: 'map', tier: 'full', type: 'one_time' },
  'price_1TKOipCWnSAIfnqOkTYB0TIr': { product: 'target_goals', tier: 'full', type: 'one_time' },
  'price_1TKOl1CWnSAIfnqOy2easXyV': { product: 'expansion', tier: 'full', type: 'subscription' },
  'price_1TKOlgCWnSAIfnqOMwJga9jB': { product: 'expansion', tier: 'full', type: 'subscription' },
  'price_1TKOqcCWnSAIfnqOXXzytZiC': { product: ['foundation','purpose_piece','map','target_goals','expansion'], tier: 'full', type: 'subscription' },
  'price_1TKOr2CWnSAIfnqO6bIE7cEj': { product: ['foundation','purpose_piece','map','target_goals','expansion'], tier: 'full', type: 'subscription' },
}

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

async function getUserIdByStripeCustomer(stripeCustomerId) {
  if (!stripeCustomerId) return null
  const { data } = await supabase.from('users').select('id').eq('stripe_customer_id', stripeCustomerId).limit(1).maybeSingle()
  return data?.id ?? null
}

async function storeStripeCustomerId(userId, stripeCustomerId) {
  if (!userId || !stripeCustomerId) return
  await supabase.from('users').update({ stripe_customer_id: stripeCustomerId }).eq('id', userId).is('stripe_customer_id', null)
}

async function grantAccess(userId, products, tier) {
  for (const product of products) {
    await supabase.from('access').upsert({
      user_id: userId, product, tier,
      source: 'purchase',
      granted_at: new Date().toISOString(),
      expires_at: null,
    }, { onConflict: 'user_id,product' })
  }
}

async function revokeAccess(userId, products) {
  for (const product of products) {
    await supabase.from('access').update({ expires_at: new Date().toISOString() }).eq('user_id', userId).eq('product', product)
  }
}

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

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
        if (session.payment_status !== 'paid') break

        let userId = await getUserById(session.client_reference_id)
        if (!userId) userId = await getUserIdByEmail(session.customer_details?.email)

        if (!userId) {
          const email = session.customer_details?.email
          console.error('No user found:', email)
          await supabase.from('access_pending').insert({
            email: email ?? null,
            stripe_session_id: session.id,
            stripe_customer_id: session.customer ?? null,
            created_at: new Date().toISOString(),
          }).catch(() => {})
          break
        }

        if (session.customer) await storeStripeCustomerId(userId, session.customer)

        const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
        for (const item of lineItems.data) {
          const mapping = PRICE_MAP[item.price?.id]
          if (!mapping) { console.warn('No mapping for price:', item.price?.id); continue }
          const products = Array.isArray(mapping.product) ? mapping.product : [mapping.product]
          await grantAccess(userId, products, mapping.tier)
        }
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
        if (sub.status === 'active') await grantAccess(userId, products, mapping.tier)
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
