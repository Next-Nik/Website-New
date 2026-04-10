// api/stripe-webhook.js
// Vercel serverless function — receives Stripe events and writes to access table
//
// Environment variables required:
//   STRIPE_SECRET_KEY       — Stripe secret key
//   STRIPE_WEBHOOK_SECRET   — from Stripe Dashboard → Webhooks → signing secret
//   SUPABASE_URL            — your Supabase project URL
//   SUPABASE_SERVICE_KEY    — service role key (NOT anon key — needs to bypass RLS)
//
// ── PRICING MODEL (April 2026) ──────────────────────────────────────────────
//
//  Foundation        $15/mo · $120/yr   subscription
//  Purpose Piece     $39                one-time
//  The Map           $59                one-time
//  Target Sprint     $29                one-time
//  Expansion         $29/mo · $229/yr   subscription
//  Life OS Complete  $49/mo · $399/yr   subscription (bundle of all 5)
//
//  Founding Member coupon: FOUNDING50 — 50% off, expires 30 days post-launch
//  Beta trial: 14-day free trial via Stripe trial_period_days on subscription checkout
//
// ── HOW TO WIRE THIS UP ──────────────────────────────────────────────────────
// 1. Go to Stripe Dashboard → Products → Create each product with prices below
// 2. Copy each price_xxxx ID and replace the placeholder strings in PRICE_MAP
// 3. Create coupon FOUNDING50: 50% off, duration=once, max_redemptions per customer=1
// 4. In Stripe → Webhooks, add your endpoint: https://nextus.world/api/stripe-webhook
//    Events to listen for:
//      checkout.session.completed
//      customer.subscription.updated
//      customer.subscription.deleted
//      invoice.payment_failed
// 5. Copy the webhook signing secret into STRIPE_WEBHOOK_SECRET env var on Vercel
//
// ── PASTE YOUR REAL PRICE IDs BELOW (replace the placeholder strings) ────────
const PRICE_MAP = {

  // ── TEST PRODUCT — remove after testing ──
  'price_1TKSkxCWnSAIfnqOzwgzuOh0': {
    product: 'map',
    tier: 'full',
    type: 'one_time',
  },

  // Foundation — $15/month
  'price_1TKOTXCWnSAIfnqOLKGOtzfG': {
    product: 'foundation',
    tier: 'full',
    type: 'subscription',
  },
  // Foundation — $120/year
  'price_1TKOXtCWnSAIfnqOth3lKfoh': {
    product: 'foundation',
    tier: 'full',
    type: 'subscription',
  },

  // Purpose Piece — $39 one-time
  'price_1TKOaGCWnSAIfnqO0s4UODYQ': {
    product: 'purpose_piece',
    tier: 'full',
    type: 'one_time',
  },

  // The Map — $59 one-time
  'price_1TKOiECWnSAIfnqOOjtYCm61': {
    product: 'map',
    tier: 'full',
    type: 'one_time',
  },

  // Target Sprint — $29 one-time
  'price_1TKOipCWnSAIfnqOkTYB0TIr': {
    product: 'target_goals',
    tier: 'full',
    type: 'one_time',
  },

  // Expansion — $29/month
  'price_1TKOl1CWnSAIfnqOy2easXyV': {
    product: 'expansion',
    tier: 'full',
    type: 'subscription',
  },
  // Expansion — $229/year
  'price_1TKOlgCWnSAIfnqOMwJga9jB': {
    product: 'expansion',
    tier: 'full',
    type: 'subscription',
  },

  // Life OS Complete — $49/month (bundle: all 5 tools)
  'price_1TKOqcCWnSAIfnqOXXzytZiC': {
    product: ['foundation', 'purpose_piece', 'map', 'target_goals', 'expansion'],
    tier: 'full',
    type: 'subscription',
  },
  // Life OS Complete — $399/year (bundle: all 5 tools)
  'price_1TKOr2CWnSAIfnqO6bIE7cEj': {
    product: ['foundation', 'purpose_piece', 'map', 'target_goals', 'expansion'],
    tier: 'full',
    type: 'subscription',
  },
}

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function getUserId(email) {
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .limit(1)
  return users?.[0]?.id ?? null
}

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
    await supabase.from('access')
      .update({ expires_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('product', product)
  }
}

async function getEmailFromSub(sub) {
  if (sub.customer_email) return sub.customer_email
  try {
    const customer = await stripe.customers.retrieve(sub.customer)
    return customer?.email ?? null
  } catch { return null }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature failed:', err.message)
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object
        if (session.payment_status !== 'paid') break

        const email = session.customer_details?.email
        if (!email) { console.error('No email on session', session.id); break }

        const userId = await getUserId(email)
        if (!userId) {
          console.error('No user for email:', email)
          await supabase.from('access_pending').insert({
            email,
            stripe_session_id: session.id,
            created_at: new Date().toISOString(),
          }).catch(() => {})
          break
        }

        const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
        for (const item of lineItems.data) {
          const mapping = PRICE_MAP[item.price?.id]
          if (!mapping) { console.warn('No mapping for price ID:', item.price?.id); continue }
          const products = Array.isArray(mapping.product) ? mapping.product : [mapping.product]
          await grantAccess(userId, products, mapping.tier)
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub   = event.data.object
        const email = await getEmailFromSub(sub)
        if (!email) break

        const userId = await getUserId(email)
        if (!userId) break

        const mapping = PRICE_MAP[sub.items?.data?.[0]?.price?.id]
        if (!mapping) break

        const products = Array.isArray(mapping.product) ? mapping.product : [mapping.product]

        if (sub.status === 'active') {
          await grantAccess(userId, products, mapping.tier)
        } else if (sub.status === 'past_due' || sub.status === 'unpaid') {
          console.warn(`Subscription ${sub.id} is ${sub.status} for ${email}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub   = event.data.object
        const email = await getEmailFromSub(sub)
        if (!email) break

        const userId = await getUserId(email)
        if (!userId) break

        const mapping = PRICE_MAP[sub.items?.data?.[0]?.price?.id]
        if (!mapping) break

        const products = Array.isArray(mapping.product) ? mapping.product : [mapping.product]
        await revokeAccess(userId, products)
        break
      }

      case 'invoice.payment_failed': {
        console.warn('Payment failed for invoice:', event.data.object.id)
        break
      }
    }

    res.status(200).json({ received: true })

  } catch (err) {
    console.error('Webhook handler error:', err)
    res.status(500).json({ error: 'Webhook handler failed' })
  }
}

export const config = {
  api: { bodyParser: false },
}
