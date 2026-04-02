// api/stripe-webhook.js
// Vercel serverless function — receives Stripe events and writes to access table
//
// Environment variables required:
//   STRIPE_WEBHOOK_SECRET   — from Stripe Dashboard → Webhooks → signing secret
//   SUPABASE_URL            — your Supabase project URL
//   SUPABASE_SERVICE_KEY    — service role key (NOT anon key — needs to bypass RLS)
//
// Stripe price ID → product key mapping lives in PRICE_MAP below.
// Add entries here as you create products in Stripe.

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// ── Map Stripe price IDs to your product keys ──────────────────
// Fill these in when you create products in Stripe Dashboard.
// Format: 'price_xxxx': { product: 'map', tier: 'full', type: 'one_time' }
const PRICE_MAP = {
  // 'price_FILL_ME_IN': { product: 'foundation',    tier: 'full', type: 'one_time' },
  // 'price_FILL_ME_IN': { product: 'map',           tier: 'full', type: 'one_time' },
  // 'price_FILL_ME_IN': { product: 'purpose_piece', tier: 'full', type: 'one_time' },
  // 'price_FILL_ME_IN': { product: 'target_goals',  tier: 'full', type: 'subscription' },
  // 'price_FILL_ME_IN': { product: 'horizon_leap',  tier: 'full', type: 'one_time' },
  // Bundle example:
  // 'price_FILL_ME_IN': { product: ['foundation','map','purpose_piece'], tier: 'full', type: 'one_time' },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify Stripe signature
  const sig  = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  // Handle relevant events
  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object
        if (session.payment_status !== 'paid') break

        const email      = session.customer_details?.email
        const lineItems  = await stripe.checkout.sessions.listLineItems(session.id)

        if (!email) {
          console.error('No email on checkout session', session.id)
          break
        }

        // Look up user by email
        const { data: users } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .limit(1)

        const userId = users?.[0]?.id
        if (!userId) {
          console.error('No user found for email:', email)
          // Store for retry / manual resolution
          await supabase.from('access_pending').insert({
            email,
            stripe_session_id: session.id,
            created_at: new Date().toISOString(),
          }).throwOnError().catch(() => {}) // best effort
          break
        }

        // Grant access for each line item
        for (const item of lineItems.data) {
          const priceId = item.price?.id
          const mapping = PRICE_MAP[priceId]
          if (!mapping) {
            console.warn('No mapping for price ID:', priceId)
            continue
          }

          const products = Array.isArray(mapping.product)
            ? mapping.product
            : [mapping.product]

          for (const product of products) {
            await supabase.from('access').upsert({
              user_id:   userId,
              product,
              tier:      mapping.tier,
              source:    'purchase',
              granted_at: new Date().toISOString(),
              expires_at: mapping.type === 'subscription'
                ? null // subscription expiry managed by subscription events
                : null, // one_time = never expires
            }, { onConflict: 'user_id,product' })
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        // Subscription cancelled — revoke access
        const sub     = event.data.object
        const email   = sub.customer_email

        if (email) {
          const { data: users } = await supabase
            .from('users').select('id').eq('email', email).limit(1)

          const userId = users?.[0]?.id
          if (userId) {
            // Find which products this subscription covered and expire them
            const priceId = sub.items?.data?.[0]?.price?.id
            const mapping = PRICE_MAP[priceId]
            if (mapping) {
              const products = Array.isArray(mapping.product)
                ? mapping.product : [mapping.product]
              for (const product of products) {
                await supabase.from('access')
                  .update({ expires_at: new Date().toISOString() })
                  .eq('user_id', userId)
                  .eq('product', product)
              }
            }
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        // Subscription payment failed — you may want to suspend rather than immediately revoke
        // For now: log it. Add grace period logic here if needed.
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

// Required for Vercel to receive raw body for signature verification
export const config = {
  api: { bodyParser: false },
}
