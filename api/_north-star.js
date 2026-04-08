// ─── North Star Cross-Tool Memory ─────────────────────────────────────────────
// Reads and writes north_star_notes in Supabase.
// All APIs import from here. Never instantiate Supabase directly in API files.
//
// North Star is seamless: it knows the person's story without narrating its notes.
// If asked directly how it knows something, it is transparent. Otherwise, it just knows.

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL     || 'https://tphbpwzozkskytoichho.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
)

// ─── Read all notes for a user ────────────────────────────────────────────────

async function getNorthStarContext(userId) {
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('north_star_notes')
      .select('tool, note, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error || !data?.length) return null

    // Build a structured context object from the notes
    const ctx = {}
    for (const row of data) {
      if (!ctx[row.tool]) ctx[row.tool] = []
      ctx[row.tool].push(row.note)
    }
    return ctx
  } catch {
    return null
  }
}

// ─── Format context into a system prompt block ────────────────────────────────

function formatNorthStarContext(ctx) {
  if (!ctx) return ''

  const lines = []
  lines.push('WHAT YOU KNOW ABOUT THIS PERSON (from their work across Life OS):')
  lines.push('This context comes from their own work in other tools. Use it naturally — you know their story. Do not narrate that you are reading notes. If asked directly how you know something, be honest that it comes from their previous work in the ecosystem.')
  lines.push('')

  const toolOrder = ['map', 'purpose-piece', 'target-goals', 'expansion', 'foundation', 'orienteering']
  const toolLabels = {
    'map': 'The Map',
    'purpose-piece': 'Purpose Piece',
    'target-goals': 'Target Sprint',
    'expansion': 'Expansion',
    'foundation': 'Foundation',
    'orienteering': 'Orienteering',
  }

  for (const tool of toolOrder) {
    if (ctx[tool]?.length) {
      lines.push(`${toolLabels[tool] || tool}:`)
      for (const note of ctx[tool]) {
        lines.push(`  - ${note}`)
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}

// ─── Write a note ─────────────────────────────────────────────────────────────

async function writeNorthStarNote(userId, tool, note) {
  if (!userId || !note?.trim()) return
  try {
    await supabase.from('north_star_notes').insert({
      user_id: userId,
      tool,
      note: note.trim(),
    })
  } catch {
    // Silent fail — never block the tool for a note write failure
  }
}

// ─── Upsert a note (replace most recent for this tool+key) ───────────────────
// Use this for things that change over time (e.g. active sprint domains)

async function upsertNorthStarNote(userId, tool, noteKey, noteValue) {
  if (!userId || !noteValue?.trim()) return
  const note = `${noteKey}: ${noteValue.trim()}`
  try {
    // Delete existing note with same key for this tool
    const { data: existing } = await supabase
      .from('north_star_notes')
      .select('id, note')
      .eq('user_id', userId)
      .eq('tool', tool)
      .ilike('note', `${noteKey}:%`)

    if (existing?.length) {
      await supabase.from('north_star_notes').delete().in('id', existing.map(r => r.id))
    }

    await supabase.from('north_star_notes').insert({
      user_id: userId,
      tool,
      note,
    })
  } catch {
    // Silent fail
  }
}

module.exports = { getNorthStarContext, formatNorthStarContext, writeNorthStarNote, upsertNorthStarNote }
