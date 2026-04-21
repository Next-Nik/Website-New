// ─────────────────────────────────────────────────────────────
// ROUTES — Canonical route paths
// Single source of truth for all internal paths.
// Import and use these instead of hardcoding strings.
//
// When a route changes, change it here only.
// ─────────────────────────────────────────────────────────────

// ── Site pages ───────────────────────────────────────────────
export const ROUTES = {
  home:           '/',
  about:          '/about',
  login:          '/login',
  profile:        '/profile',
  dashboard:      '/dashboard',
  pricing:        '/pricing',
  checkout:       '/checkout',
  tools:          '/tools',
  nextUsSelf:     '/nextus-self',
  nextUs:         '/nextus',
  nextUsActors:   '/nextus/actors',
  nextUsMap:      '/nextus/map',
  nextUsNominate: '/nextus/nominate',
  workWithNik:    '/work-with-nik',
  podcast:        '/podcast',
  privacy:        '/privacy',
  terms:          '/terms',
  admin:          '/admin',
  faq:            '/faq',
  nextUsPlace:    '/nextus/place',
  contentEditor:  '/content-editor',

  // ── Tool paths ─────────────────────────────────────────────
  northStar:        '/tools/north-star',
  map:              '/tools/map',
  horizonState:     '/tools/horizon-state',
  purposePiece:     '/tools/purpose-piece',
  purposePieceDeep: '/tools/purpose-piece/deep',
  targetSprint:     '/tools/target-sprint',
  horizonPractice:  '/tools/horizon-practice',

  // ── Tool API fetch paths ────────────────────────────────────
  api: {
    northStarChat:           '/tools/north-star/api/chat',
    mapChat:                 '/tools/map/api/chat',
    mapAvatarChat:           '/tools/map/api/avatar-chat',
    mapConnectionSynthesis:  '/tools/map/api/connection-synthesis',
    mapScoringChat:          '/api/map-scoring-chat',
    mapSynthesisChat:        '/api/map-synthesis-chat',
    horizonStateChat:        '/tools/horizon-state/api/chat',
    purposePieceChat:        '/tools/purpose-piece/api/chat',
    purposePieceDeepChat:    '/tools/purpose-piece/api/chat-deep',
    targetSprintChat:        '/tools/target-sprint/api/chat',
    targetSprintCoach:       '/tools/target-sprint/api/sprint-coach',
    horizonPracticeSetup:    '/tools/horizon-practice/api/setup-chat',
    horizonPracticeDaily:    '/tools/horizon-practice/api/daily-chat',
    horizonPracticeLoop:     '/tools/horizon-practice/api/loop-chat',
    createCheckout:          '/api/create-checkout',
    grantBetaAccess:         '/api/grant-beta-access',
    debriefChat:             '/api/debrief-chat',
    contact:                 '/api/contact',
    orgExtract:              '/api/org-extract',
    nextusMatch:             '/api/nextus-match',
  },
}
