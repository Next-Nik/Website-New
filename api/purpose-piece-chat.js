// ─── PURPOSE PIECE CHAT HANDLER (v10) ────────────────────────────────────────
// Main API endpoint for the Purpose Piece tool.
// Routes to the appropriate stage handler based on session.stage.
//
// Stage machine:
//   wish → pull → instinct → role → thinking → complete
//
// Each stage is handled by its own module. This dispatcher coordinates them.

const { handleWishStage }     = require('./_pp-wish-stage')
const { handlePullStage }     = require('./_pp-pull-stage')
const { handleInstinctStage } = require('./_pp-instinct-stage')
const { handleRoleStage }     = require('./_pp-role-stage')
const { runSynthesis }        = require('./_pp-synthesis')

// ─── Session shape migration ─────────────────────────────────────────────────
// Users with incomplete v9 sessions need their session migrated to v10 shape.
// v9 → v10 changes:
//   - Stage 1 was "archetype" (now split into wish → pull → instinct → role)
//   - Stage 2 was "role" (now absorbed into role stage as sub-function)
//   - Stage 3+ unchanged structurally but field names expanded
//
// Migration strategy: if session.stage exists and is a v9 value, redirect to
// fresh start. Don't try to salvage partial v9 sessions — the data shape is
// too different. Completed v9 sessions (status: complete) can stay as-is.

function migrateSessionIfNeeded(session) {
  // v9 stage values that no longer exist in v10
  const v9Stages = ['archetype', 'role_questions', 'profile', 'deep_dive']
  
  if (!session.stage) {
    // Fresh session — set to wish
    session.stage = 'wish'
    session.status = 'in_progress'
    return { migrated: false, action: 'start_fresh' }
  }

  // If session is complete, leave it alone regardless of version
  if (session.status === 'complete') {
    return { migrated: false, action: 'already_complete' }
  }

  // If session is in a v9 stage, restart
  if (v9Stages.includes(session.stage)) {
    return { migrated: true, action: 'restart_v9_session' }
  }

  // v10 session in progress — continue
  return { migrated: false, action: 'continue' }
}

// ─── Main handler ────────────────────────────────────────────────────────────

async function handlePurposePieceChat(req, res) {
  const { message, session: clientSession, northStarContext } = req.body

  // Initialize or restore session
  let session = clientSession || {
    stage: 'wish',
    status: 'in_progress',
    version: 'v10',
    created_at: new Date().toISOString(),
  }

  // Migration check
  const migration = migrateSessionIfNeeded(session)
  
  if (migration.action === 'restart_v9_session') {
    return res.status(200).json({
      migration_required: true,
      message: 'Purpose Piece has been redesigned. Your previous session will be archived. Ready to start fresh?',
      session: {
        stage: 'wish',
        status: 'in_progress',
        version: 'v10',
        created_at: new Date().toISOString(),
      },
      action: 'restart',
    })
  }

  if (migration.action === 'already_complete') {
    return res.status(200).json({
      complete: true,
      message: 'You\'ve already completed Purpose Piece. Your results are saved.',
      session,
      action: 'show_results',
    })
  }

  // Route to appropriate stage handler
  const stage = session.stage

  try {
    switch (stage) {
      case 'wish':
        return await handleWishStage(session, message, res, northStarContext)
      
      case 'pull':
        return await handlePullStage(session, message, res, northStarContext)
      
      case 'instinct':
        return await handleInstinctStage(session, message, res, northStarContext)
      
      case 'role':
        return await handleRoleStage(session, message, res, northStarContext)
      
      case 'thinking':
        // Auto-trigger synthesis — no user input required
        return await runSynthesis(session, res)
      
      case 'complete':
        return res.status(200).json({
          complete: true,
          message: 'Purpose Piece complete.',
          session,
          profile: session.profile,
          mirror_text: session.mirror_text,
          placement: session.placement,
          civilisational_statement: session.civilisational_statement,
        })
      
      default:
        return res.status(400).json({
          error: `Unknown stage: ${stage}`,
        })
    }
  } catch (error) {
    console.error('Purpose Piece handler error:', error)
    return res.status(500).json({
      error: 'An error occurred. Please try again.',
      details: error.message,
    })
  }
}

// ─── Supabase integration helpers ───────────────────────────────────────────
// These functions handle reading/writing the expanded v10 session shape.
// Call these from the main API route after handlePurposePieceChat returns.

async function savePurposePieceSession(supabase, userId, session) {
  const record = {
    user_id: userId,
    version: 'v10',
    status: session.status,
    stage: session.stage,
    
    // Wish stage
    wish: session.wish,
    wish_positive: session.wish_positive,
    domain: session.domain,
    domain_id: session.domain_id,
    domain_confidence: session.domain_confidence,
    domain_secondary: session.domain_secondary,
    
    // Pull stage
    subdomain_signal: session.subdomain_signal,
    
    // Instinct stage
    archetype: session.archetype,
    archetype_confidence: session.archetype_confidence,
    archetype_secondary: session.archetype_secondary,
    archetype_reasoning: session.archetype_reasoning,
    cost_signal: session.cost_signal,
    movement_style: session.movement_style,
    
    // Role stage
    sub_function: session.sub_function,
    sub_function_label: session.sub_function_label,
    sub_function_confidence: session.sub_function_confidence,
    scale: session.scale,
    scale_confidence: session.scale_confidence,
    scale_tension: session.scale_tension,
    mode: session.mode,
    node_candidate: session.node_candidate,
    
    // Synthesis
    mirror_text: session.mirror_text,
    profile: session.profile,
    placement: session.placement,
    civilisational_statement: session.civilisational_statement,
    horizon_goal: session.horizon_goal,
    
    // Full transcript storage
    wish_transcript: session.wishTranscript,
    pull_transcript: session.pullTranscript,
    instinct_transcript: session.instinctTranscript,
    role_transcript: session.roleTranscript,
    
    // Metadata
    created_at: session.created_at,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('purpose_piece_results')
    .upsert(record, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) throw error
  return data
}

async function loadPurposePieceSession(supabase, userId) {
  const { data, error } = await supabase
    .from('purpose_piece_results')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found
  return data
}

// ─── North Star context integration ─────────────────────────────────────────
// Purpose Piece writes to North Star's memory when complete.
// This makes the coordinates available across the NextUs ecosystem.

async function writeToNorthStar(supabase, userId, session) {
  if (session.status !== 'complete') return

  const note = `Purpose Piece complete.

Coordinates:
- Domain: ${session.domain}${session.subdomain_signal ? ` (${session.subdomain_signal.name})` : ''}
- Archetype: ${session.sub_function_label || session.archetype}
- Scale: ${session.scale}
- Mode: ${session.mode}
${session.node_candidate ? '- Node candidate: true' : ''}

Civilisational statement:
${session.civilisational_statement}

Horizon Goal:
${session.horizon_goal}`

  await supabase
    .from('north_star_notes')
    .insert({
      user_id: userId,
      note_type: 'purpose_piece_complete',
      content: note,
      metadata: {
        domain: session.domain,
        domain_id: session.domain_id,
        subdomain: session.subdomain_signal?.name,
        archetype: session.archetype,
        sub_function: session.sub_function,
        scale: session.scale,
        mode: session.mode,
        node_candidate: session.node_candidate,
      },
      created_at: new Date().toISOString(),
    })
}

// ─── Vercel serverless handler ───────────────────────────────────────────────
// Vercel hits the default export. Route rewrite in vercel.json maps
//   /tools/purpose-piece/api/chat  →  /api/purpose-piece-chat
// so this file needs to be a callable (req, res) handler, not just a library.
//
// We keep the named exports below for tests / other modules that import this
// file, but the default export is what Vercel invokes in production.

module.exports = async (req, res) => {
  // Basic method guard — the tool only POSTs
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }
  return handlePurposePieceChat(req, res)
}

// Named exports for tests and downstream modules
module.exports.handlePurposePieceChat  = handlePurposePieceChat
module.exports.savePurposePieceSession = savePurposePieceSession
module.exports.loadPurposePieceSession = loadPurposePieceSession
module.exports.writeToNorthStar        = writeToNorthStar
module.exports.migrateSessionIfNeeded  = migrateSessionIfNeeded
