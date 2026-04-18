// api/create-checkout.js
// Creates a Stripe Checkout Session server-side.
// Passes client_reference_id so the webhook can grant access to the correct
// Supabase user regardless of which billing email is used at checkout.
//
// POST body: { priceId, userId, successUrl, cancelUrl, promoCode? }
// Returns:   { url } — the Stripe-hosted checkout URL to redirect to
//
// promoCode is optional. When supplied:
//   - The promotion code is looked up in Stripe and pre-applied to the session.
//   - If the promo code is in TRIAL_PROMO_CODES, a 14-day trial is added.
//   - The user sees the discount (and trial) already applied at checkout.

const Stripe = require('stripe')
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Promo codes that include a 14-day trial.
// Keep in sync with PROMO_GROUP_MAP in stripe-webhook.js.
const TRIAL_PROMO_CODES = new Set(['BETATESTER', 'BETACORE'])

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { priceId, userId, successUrl, cancelUrl, promoCode } = req.body

  if (!priceId)    return res.status(400).json({ error: 'Missing priceId' })
  if (!userId)     return res.status(400).json({ error: 'Missing userId — user must be logged in' })
  if (!successUrl) return res.status(400).json({ error: 'Missing successUrl' })
  if (!cancelUrl)  return res.status(400).json({ error: 'Missing cancelUrl' })

  try {
    const price = await stripe.prices.retrieve(priceId)
    const mode  = price.type === 'recurring' ? 'subscription' : 'payment'

    const sessionParams = {
      mode,
      line_items:          [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      success_url:         successUrl,
      cancel_url:          cancelUrl,
    }

    // Pre-apply promo code if supplied
    if (promoCode) {
      // Look up the promotion code object to get its ID
      const promoCodes = await stripe.promotionCodes.list({ code: promoCode, limit: 1, active: true })
      if (promoCodes.data.length > 0) {
        sessionParams.discounts = [{ promotion_code: promoCodes.data[0].id }]
        // Disable the coupon field so users can't override with a different code
        sessionParams.allow_promotion_codes = false
      } else {
        console.warn('Promo code not found or inactive:', promoCode)
        // Fall through — session created without discount
        sessionParams.allow_promotion_codes = true
      }
    } else {
      sessionParams.allow_promotion_codes = true
    }

    // Add trial only for promo codes that include one
    if (mode === 'subscription' && promoCode && TRIAL_PROMO_CODES.has(promoCode.toUpperCase())) {
      sessionParams.subscription_data = { trial_period_days: 14 }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)
    return res.json({ url: session.url })

  } catch (err) {
    console.error('Checkout session error:', err)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}
