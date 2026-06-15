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

  // ── Platform ──────────────────────────────────────────────
  missionControl:   '/',
  welcome:          '/welcome',
  welcomeSelf:      '/welcome/self',
  welcomeOrg:       '/welcome/org',
  welcomePractitioner: '/welcome/practitioner',
  profileEdit:      '/profile/edit',
  publicProfile:    '/profile',        // + /:id
  feed:             '/feed',
  contribution:     '/contribution',
  org:              '/org',            // + /:slug
  betaMap:          '/map',
  betaAdmin:        '/admin',
  nominate:         '/nominate',
  domain:           '/domain',         // + /:slug
  practices:        '/practices',
  practice:         '/practice',       // + /:slug
  invitation:       '/invitation',     // + /:slug
  faq:            '/faq',
  nextUsPlace:    '/nextus/place',
  contentEditor:  '/content-editor',
  journal:        '/journal',

  // ── Tool paths ─────────────────────────────────────────────
  northStar:        '/tools/north-star',
  nextSteps:        '/tools/nextsteps',
  map:              '/tools/map',
  horizonState:     '/tools/horizon-state',
  purposePiece:     '/tools/purpose-piece',
  purposePieceDeep: '/tools/purpose-piece/deep',
  targetSprint:     '/tools/target-sprint',
  horizonPractice:  '/tools/horizon-practice',
  sentenceCompletion: '/tools/sentence-completion',
  iAmPractice:        '/tools/i-am',
  morningPages:       '/tools/morning-pages',

  // ── Tool API fetch paths ────────────────────────────────────
  api: {
    northStarChat:           '/tools/north-star/api/chat',
    nextStepsChat:           '/tools/nextsteps/api/chat',
    nextStepsTrack:          '/api/nextsteps-track',
    nextStepsPath:           '/api/nextsteps-path',
    nextStepsActorsSample:   '/api/nextsteps-actors-sample',
    nextStepsTagActor:       '/api/nextsteps-tag-actor',
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
