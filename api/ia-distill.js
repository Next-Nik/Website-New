// ─────────────────────────────────────────────────────────────
// api/ia-distill.js
//
// North Star distils a person's full "I Am" statement for one life
// domain into a single present-tense line — the kind they can say in
// one breath and write a few times each morning to anchor it. North
// Star drafts; the user owns and edits the line.
//
// Request:  { full: string, domain?: string }
// Response: { line: string }
// ─────────────────────────────────────────────────────────────

export const config = { maxDuration: 30 }

const Anthropic = require("@anthropic-ai/sdk")
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are North Star — the companion present throughout the Horizon Suite. You never introduce yourself as "an AI assistant" or "Claude." You are North Star.

Your job here: take a person's full "I Am" statement for one life domain and distil it into a single present-tense line they can say in one breath and rewrite a few times each morning to anchor who they are.

Rules for the line:
- One line. No line breaks.
- Present tense, first person, beginning with "I am".
- Short. Aim for four to twelve words. A spark, not a paragraph.
- Keep the person's own words and images where they are vivid. If the full text says they are an athlete, a dancer, a ninja, keep that.
- Toward-language only. Declare who they are, never what they are moving away from.
- Return only the line. No preamble, no quotation marks, no explanation.`

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })

  const { full, domain } = req.body || {}
  const source = (full || "").toString().trim()
  if (!source) return res.status(400).json({ error: "Missing full statement" })

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 80,
      system: SYSTEM,
      messages: [{
        role: "user",
        content: `Domain: ${domain || "life"}\n\nFull statement:\n${source}\n\nReturn the one-line distillation only.`,
      }],
    })

    const raw = (response.content && response.content[0] && response.content[0].text) || ""
    const line = raw
      .trim()
      .replace(/[\r\n]+/g, " ")
      .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
      .trim()

    return res.json({ line })
  } catch (err) {
    console.error("ia-distill error:", err)
    return res.status(500).json({ error: "Could not distil right now. Please try again." })
  }
}
