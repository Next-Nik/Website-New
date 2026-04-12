// api/stripe-webhook.js
// Vercel serverless function — receives Stripe events and writes to access table
//
// Environment variables required:
//   STRIPE_SECRET_KEY       — Stripe secret key
//   STRIPE_WEBHOOK_SECRET   — from Stripe Dashboard → Webhooks → signing secret
//   SUPABASE_URL            — your Supabase project URL
//   SUPABASE_SERVICE_KEY    — service role key (NOT anon key — needs to bypass RLS)

const PRICE_MAP = {

  // ── TEST PRODUCT — remove after testing ──
  'price_1TKSkxCWnSAIfnqOzwgzuOh0': { product: 'map', tier: 'full', type: 'one_time' },

  // Foundation — $15/month
  'price_1TKOTXCWnSAIfnqOLKGOtzfG': { product: 'foundation', tier: 'full', type: 'subscription' },
  // Foundation — $120/year
  'price_1TKOXtCWnSAIfnqOth3lKfoh': { product: 'foundation', tier: 'full', type: 'subscription' },

  // Purpose Piece — $39 one-time
  'price_1TKOaGCWnSAIfnqO0s4UODYQ': { product: 'purpose_piece', tier: 'full', type: 'one_time' },

  // The Map — $59 one-time
  'price_1TKOiECWnSAIfnqOOjtYCm61': { product: 'map', tier: 'full', type: 'one_time' },

  // Target Sprint — $29 one-time
  'price_1TKOipCWnSAIfnqOkTYB0TIr': { product: 'target_goals', tier: 'full', type: 'one_time' },

  // Expansion — $29/month
  'price_1TKOl1CWnSAIfnqOy2easXyV': { product: 'expansion', tier: 'full', type: 'subscription' },
  // Expansion — $229/year
  'price_1TKOlgCWnSAIfnqOMwJga9jB': { product: 'expansion', tier: 'full', type: 'subscription' },

  // Life OS Complete — $49/month
  'price_1TKOqcCWnSAIfnqOXXzytZiC': {
    product: ['foundation', 'purpose_piece', 'map', 'target_goals', 'expansion'],
    tier: 'full', type: 'subscription',
  },
  // Life OS Complete — $399/year
  'price_1TKOr2CWnSAIfnqO6bIE7cEj': {
    product: ['foundation', 'purpose_piece', 'map', 'target_goals', 'expansion'],
    tier: 'full', type: 'subscription',
  },
}

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Look up user by Supabase user ID (preferred — passed as client_reference_id)
async function getUserById(userId) {
  if (!userId) return null
  const { data } = await supabase.from('users').select('id').eq('id', userId).limit(1)
  return data?.[0]?.id ?? null
}

// Fall back to email lookup if no client_reference_id
async function getUserIdByEmail(email) {
  if (!email) return null
  const { data } = await supabase.from('users').select('id').eq('email', email).limit(1)
  return data?.[0]?.id ?? null
}

// Look up user by stored Stripe customer ID (for subscription events)
async function getUserIdByStripeCustomer(stripeCustomerId) {
  if (!stripeCustomerId) return null
  const { data } = await supabase
    .from('users').select('id').eq('stripe_customer_id', stripeCustomerId).limit(1)
  return data?.[0]?.id ?? null
}

// Store Stripe customer ID against user for future subscription event lookups
async function storeStripeCustomerId(userId, stripeCustomerId) {
  if (!userId || !stripeCustomerId) return
  await supabase
    .from('users')
    .update({ stripe_customer_id: stripeCustomerId })
    .eq('id', userId)
    .is('stripe_customer_id', null) // only write if not already set
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

        // Primary: use client_reference_id (Supabase user ID set by Pricing.jsx)
        // Fallback: email lookup
        let userId = await getUserById(session.client_reference_id)

        if (!userId) {
          const email = session.customer_details?.email
          userId = await getUserIdByEmail(email)
        }

        if (!userId) {
          const email = session.customer_details?.email
          console.error('No user found for session:', session.id, email)
          await supabase.from('access_pending').insert({
            email:             session.customer_details?.email ?? null,
            stripe_session_id: session.id,
            stripe_customer_id: session.customer ?? null,
            created_at:        new Date().toISOString(),
          }).catch(() => {})
          break
        }

        // Store Stripe customer ID so subscription events can find this user later
        if (session.customer) {
          await storeStripeCustomerId(userId, session.customer)
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
        const sub = event.data.object

        // Primary: look up by stored Stripe customer ID
        // Fallback: email lookup via Stripe customer object
        let userId = await getUserIdByStripeCustomer(sub.customer)

        if (!userId) {
          try {
            const customer = await stripe.customers.retrieve(sub.customer)
            userId = await getUserIdByEmail(customer?.email)
          } catch { /* silent */ }
        }

        if (!userId) break

        const mapping = PRICE_MAP[sub.items?.data?.[0]?.price?.id]
        if (!mapping) break

        const products = Array.isArray(mapping.product) ? mapping.product : [mapping.product]

        if (sub.status === 'active') {
          await grantAccess(userId, products, mapping.tier)
        } else if (sub.status === 'past_due' || sub.status === 'unpaid') {
          console.warn(`Subscription ${sub.id} is ${sub.status} for user ${userId}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object

        let userId = await getUserIdByStripeCustomer(sub.customer)

        if (!userId) {
          try {
            const customer = await stripe.customers.retrieve(sub.customer)
            userId = await getUserIdByEmail(customer?.email)
          } catch { /* silent */ }
        }

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
