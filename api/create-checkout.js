// api/create-checkout.js
// Creates a Stripe Checkout Session server-side.
// Passes client_reference_id so the webhook can grant access to the correct
// Supabase user regardless of which billing email is used at checkout.
//
// POST body: { priceId, userId, successUrl, cancelUrl }
// Returns:   { url } — the Stripe-hosted checkout URL to redirect to

const Stripe = require('stripe')
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { priceId, userId, successUrl, cancelUrl } = req.body

  if (!priceId)    return res.status(400).json({ error: 'Missing priceId' })
  if (!userId)     return res.status(400).json({ error: 'Missing userId — user must be logged in' })
  if (!successUrl) return res.status(400).json({ error: 'Missing successUrl' })
  if (!cancelUrl)  return res.status(400).json({ error: 'Missing cancelUrl' })

  try {
    const price = await stripe.prices.retrieve(priceId)
    const mode  = price.type === 'recurring' ? 'subscription' : 'payment'

    const sessionParams = {
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      success_url: successUrl,
      cancel_url:  cancelUrl,
    }

    if (mode === 'subscription') {
      sessionParams.subscription_data = { trial_period_days: 14 }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)
    return res.json({ url: session.url })

  } catch (err) {
    console.error('Checkout session error:', err)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}
