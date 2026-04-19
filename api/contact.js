// api/contact.js
// Contact / support form — sends submissions to support@nextus.world via Resend.

const { Resend } = require('resend')

const resend = new Resend(process.env.RESEND_API_KEY)

const ALLOWED_SUBJECTS = [
  'Question about the platform',
  'Something is broken',
  'I don\'t understand something',
  'Feedback or suggestion',
  'Other',
]

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, email, subject, message } = req.body || {}

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' })
  }
  if (!message || message.trim().length < 5) {
    return res.status(400).json({ error: 'Please include a message.' })
  }
  if (subject && !ALLOWED_SUBJECTS.includes(subject)) {
    return res.status(400).json({ error: 'Invalid subject.' })
  }

  const safeName    = (name    || '').slice(0, 120)
  const safeEmail   = (email   || '').slice(0, 254)
  const safeSubject = (subject || 'General enquiry').slice(0, 120)
  const safeMessage = (message || '').slice(0, 4000)

  try {
    await resend.emails.send({
      from:    'NextUs Support <support@nextus.world>',
      to:      'support@nextus.world',
      replyTo: safeEmail,
      subject: `[NextUs Support] ${safeSubject}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; color: #0F1523;">
          <p style="font-size: 13px; color: #A8721A; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px;">NextUs Support</p>
          <h2 style="font-size: 22px; font-weight: 400; margin: 0 0 24px;">${safeSubject}</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e8e4db; font-size: 13px; color: #888; width: 100px;">From</td><td style="padding: 8px 0; border-bottom: 1px solid #e8e4db; font-size: 15px;">${safeName || '(no name)'}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #e8e4db; font-size: 13px; color: #888;">Email</td><td style="padding: 8px 0; border-bottom: 1px solid #e8e4db; font-size: 15px;"><a href="mailto:${safeEmail}" style="color: #A8721A;">${safeEmail}</a></td></tr>
            <tr><td style="padding: 8px 0; font-size: 13px; color: #888;">Subject</td><td style="padding: 8px 0; font-size: 15px;">${safeSubject}</td></tr>
          </table>
          <div style="background: #FAFAF7; border-left: 3px solid #C8922A; padding: 16px 20px; border-radius: 0 6px 6px 0;">
            <p style="font-size: 16px; line-height: 1.75; margin: 0; white-space: pre-wrap;">${safeMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          </div>
          <p style="font-size: 12px; color: #aaa; margin-top: 32px;">Sent from nextus.world · Reply goes directly to the sender.</p>
        </div>
      `,
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('contact.js Resend error:', err)
    return res.status(500).json({ error: 'Failed to send. Please try again.' })
  }
}
