import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { supabase } from './hooks/useSupabase'
import { ActingAsProvider } from './app/context/ActingAsContext'
import { SiteCopyProvider } from './lib/siteCopy'
import { useEffect, useState, Component } from 'react'
import { BottomTabs } from './components/BottomTabs'
import { InstallPrompt } from './app/components/InstallPrompt'

// Error boundary
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100dvh', background: '#FAFAF7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <span style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '17px', letterSpacing: '0.2em', color: '#26302A', display: 'block', marginBottom: '16px' }}>Something went wrong</span>
            <p style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: '18px', color: 'rgba(15,21,35,0.55)', marginBottom: '24px', lineHeight: 1.7 }}>
              We hit an unexpected error. Please refresh the page — your progress is saved.
            </p>
            <button onClick={() => window.location.reload()} style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '15px', letterSpacing: '0.14em', color: '#26302A', background: 'rgba(110,127,92,0.05)', border: '1.5px solid rgba(110,127,92,0.78)', borderRadius: '40px', padding: '12px 28px', cursor: 'pointer' }}>
              Refresh
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Site pages ────────────────────────────────────────────────
import { AboutPage }              from './pages/About'
import { WorkWithNikPage, PodcastPage } from './pages/WorkAndPodcast'
import { LoginPage }              from './pages/Login'
import { PrivacyPage, TermsPage } from './pages/Legal'
import { SupportResourcesPage } from './pages/SupportResources'
import { FAQPage }               from './pages/FAQ'
import { ContentEditorPage }      from './pages/ContentEditor'
import { GroupJoinPage }          from './pages/GroupJoin'
import { ToolsPage }              from './pages/Tools'
import { MarketingHomePage }      from './pages/MarketingHome'
import { MarketingToolsPage }     from './pages/MarketingTools'
import { PricingPage }            from './pages/Pricing'
import { CheckoutPage }          from './pages/Checkout'
import { AuthCallbackPage }       from './pages/AuthCallback'
import { WatchPage }              from './pages/Watch'

// ── Main app pages ──
// The live NextUs application. Mission Control, Welcome flows,
// profiles, organisations, the Atlas (map / domain / actors / practices).
import MissionControl         from './app/pages/MissionControl'
import WelcomeStart           from './app/pages/WelcomeStart'
import FirstLight             from './app/pages/FirstLight'
import { hasMapEngagement } from './app/util/onboarding'
import WelcomeSelf            from './app/pages/WelcomeSelf'
import OrgWelcome             from './app/pages/OrgWelcome'
import WelcomePractitioner    from './app/pages/WelcomePractitioner'
import WelcomeNext            from './app/pages/WelcomeNext'
import IntroGate              from './app/components/IntroGate'
import ProfileEdit            from './app/pages/ProfileEdit'
// PublicProfile retired (migration to sealed member card). /profile/:id now
// renders MemberPublicPage. The old component leaked developmental-rail data
// (Map scores, I Am Statements) and must not be routed.
import { FeedPage }           from './app/pages/Feed'
import { HorizonGoalsPage }          from './app/pages/HorizonGoalsPage'
import ContributionPage      from './app/pages/ContributionPage'
import Contribution          from './app/pages/Contribution'
import { OrgPublicPage }      from './app/pages/OrgPublic'
import { OrgManagePage }      from './app/pages/OrgManage'
import { MapPage as PlanetMapPage } from './app/pages/Map'
import { NextMarketPage }         from './app/pages/NextMarket'
import { AdminConsolePage }   from './app/pages/AdminConsole'
import { MovieMagicPage }     from './pages/MovieMagic'
import { NominatePage }       from './app/pages/Nominate'
import { AddPage }            from './app/pages/Add'
import { EventManagePage }    from './app/pages/EventManage'
import { EventPublicPage }    from './app/pages/EventPublic'
import { DomainPage } from './app/pages/Domain'
import { ConstellationPage } from './app/pages/ConstellationPage'
import ConstellationRecord from './app/pages/ConstellationRecord'
import ConstellationLedger from './app/pages/ConstellationLedger'
import AskAuthor from './app/pages/AskAuthor'
import { IssueViewPage } from './app/pages/IssueView'
import { MemberPublicPage } from './app/pages/MemberPublic'
import { FocusProfile } from './app/pages/FocusProfile'
import { FocusIndex } from './app/pages/FocusIndex'
import { Explore } from './app/pages/Explore'
import { SearchPage } from './app/pages/Search'
import { ClaimPage } from './app/pages/Claim'
import { InviteAuthorPage } from './app/pages/InviteAuthor'
import { InvitePage } from './app/pages/InvitePage'
import { RemovePage } from './app/pages/RemovePage'
import InstallPage from './app/pages/InstallPage'
import WatchedFeed from './app/pages/WatchedFeed'
import CuratedFeed from './app/pages/CuratedFeed'
import Practices              from './app/pages/Practices'
import PracticeDetail         from './app/pages/PracticeDetail'
import PracticeContribute     from './app/pages/PracticeContribute'
import { InvitationPage }     from './app/pages/Invitation'
import { InvitationIndexPage } from './app/pages/InvitationIndex'

// ── Begin / Build ────────────────────────────────────────────────
import { BeginBuildOrgPage }      from './pages/begin-build/Org'
import { BeginBuildPracticePage } from './pages/begin-build/Practice'
import { BeginBuildGroupPage }    from './pages/begin-build/Group'

// ── Tools ─────────────────────────────────────────────────────
import { NorthStarPage }                           from './tools/orienteering/Orienteering'
import { MapPage }                                 from './tools/map/Map'
import { HorizonStatePage }                        from './tools/horizon-state/HorizonState'
import { PurposePiecePage, PurposePieceDeepPage }  from './tools/purpose-piece/PurposePiece'
import { TargetSprintPage }                        from './tools/target-sprint/TargetSprint'
import { ChallengePage }                           from './app/pages/ChallengePage'
import MyChallenges                                 from './app/pages/MyChallenges'
import ChallengeAuthor                              from './app/pages/ChallengeAuthor'
import ChallengeBrowse                              from './app/pages/ChallengeBrowse'
import EarthLive                                    from './app/pages/EarthLive'
import EarthJourney                                 from './app/pages/EarthJourney'
import PartnerInbox                                 from './app/pages/PartnerInbox'
import { HorizonPracticePage }                     from './tools/horizon-practice/HorizonPractice'
import { NextStepsPage }                           from './tools/nextsteps/NextSteps'
import JournalPage                                 from './app/pages/Journal'
import SentenceCompletion                          from './app/pages/SentenceCompletion'
import IAmPractice                                 from './app/pages/IAmPractice'
import IAmSpoken                                    from './app/pages/IAmSpoken'
import MorningPages                                 from './app/pages/MorningPages'
import DailyEntrances                               from './app/pages/DailyEntrances'
import Training                                     from './app/pages/Training'
import AnchorBreathPage                             from './app/pages/AnchorBreathPage'
import ChargeBreathPage                             from './app/pages/ChargeBreathPage'
import PlanetMap                                    from './tools/planet/PlanetMap'
import { NextUJourneyPage }                        from './tools/nextu/NextUJourney'
import { IAmChapterPage }                          from './tools/nextu/IAmChapter'
import { HorizonSelfOnboardingPage }               from './tools/nextu/HorizonSelfOnboarding'
import { HorizonBiographyPage }                    from './tools/nextu/HorizonBiography'
import NextUShell                                  from './tools/nextu/NextUShell'
import { body } from './lib/designTokens'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function ComingSoon({ name }) {
  const sc = { fontFamily: "'IBM Plex Mono', Georgia, serif" }
  return (
    <div style={{ minHeight: '100dvh', background: '#FAFAF7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
      <div style={{ textAlign: 'center' }}>
        <span style={{ ...sc, fontSize: '17px', letterSpacing: '0.2em', color: '#26302A', display: 'block', marginBottom: '16px' }}>Horizon Suite</span>
        <h1 style={{ ...body, fontSize: 'clamp(28px,4vw,44px)', fontWeight: 400, color: '#0F1523', marginBottom: '12px' }}>{name}</h1>
        <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.55)' }}>Coming soon.</p>
      </div>
    </div>
  )
}

// ── Root route ──
//
// Signed-out → MarketingHomePage (the wrapper)
// Signed-in → MissionControl, UNLESS the user just came from a
//   wrapper CTA (welcomePath set in localStorage) AND hasn't seen
//   the welcome yet — then route to the matching welcome flow.
//
// The 'welcomePath' flag is set by Login when ?path=... is on the
// URL, so it only exists for users who arrived via the wrapper.
// Existing users on a new device won't have it set and will go
// straight to Mission Control — they don't need a re-introduction.
function RootRoute() {
  const { user, loading } = useAuth()

  if (loading) return null
  if (!user) return <MarketingHomePage />

  // First Light is no longer forced on login. The civ rail and the whole
  // site stay open; First Light invites from the personal side (a Start over
  // the dormant wheel) rather than walling anyone on arrival. Brand-new users
  // fall straight through to Mission Control.
  // Legacy wrapper welcome flow
  let welcomePath = null
  let seen = true
  try {
    welcomePath = window.localStorage.getItem('nextus.welcomePath')
    seen = window.localStorage.getItem('nextus.welcomeSeen') === '1'
  } catch {}

  if (!welcomePath || seen) return <MissionControl />

  const path = ['org', 'practitioner', 'self'].includes(welcomePath)
    ? welcomePath
    : 'self'
  try { window.localStorage.removeItem('nextus.welcomePath') } catch {}

  const target = {
    self:         '/welcome/self',
    org:          '/welcome/org',
    practitioner: '/welcome/practitioner',
  }[path]

  return <Navigate to={target} replace />
}

// ── Personal-rail guard ───────────────────────────────────────
// First Light is the light-touch activation the personal tools lean on —
// where you are, where you're headed. When a signed-in user steps onto a
// personal surface without it (and without the deeper Map, which supersedes
// it), we surface the First Light cover and send them back to what they
// reached for. The civ rail is never gated. Session-cached so it checks once,
// and fails open so an error never walls anyone.
let _flSeen = false
function RequirePersonal({ children }) {
  const { user, loading } = useAuth()
  const { pathname } = useLocation()
  const [status, setStatus] = useState(_flSeen ? 'ok' : 'checking')

  useEffect(() => {
    if (!user || _flSeen) { setStatus('ok'); return }
    let cancelled = false
    ;(async () => {
      try {
        const [userRes, mapEngaged] = await Promise.all([
          supabase.from('users')
            .select('first_light_completed_at, first_light_skipped_at')
            .eq('id', user.id).maybeSingle(),
          hasMapEngagement(user.id),
        ])
        if (cancelled) return
        const seen = !!userRes?.data?.first_light_completed_at
          || !!userRes?.data?.first_light_skipped_at || mapEngaged
        if (seen) _flSeen = true
        setStatus(seen ? 'ok' : 'gate')
      } catch { if (!cancelled) setStatus('ok') }   // fail open — never trap anyone
    })()
    return () => { cancelled = true }
  }, [user])

  if (loading) return null
  if (!user) return children            // auth is the tools' own concern
  if (status === 'checking') return null
  if (status === 'gate') return <Navigate to={`/welcome/first-light?from=${encodeURIComponent(pathname)}`} replace />
  return children
}

function AppInner() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  // Mission Control owns the whole viewport when signed in.
  const hideBottomTabs = (pathname === '/' && !!user) || pathname === '/welcome/first-light'

  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* ── Site pages ── */}
        <Route path="/"                element={<RootRoute />} />
        <Route path="/index"           element={<Navigate to="/" replace />} />
        <Route path="/home"            element={<Navigate to="/" replace />} />
        <Route path="/about"           element={<AboutPage />} />
        {/* ── Legacy NextUs routes → redirect to new platform paths ── */}
        <Route path="/nextus-self"                   element={<Navigate to="/" replace />} />
        <Route path="/nextus"                        element={<Navigate to="/" replace />} />
        <Route path="/nextus/actors"                 element={<Navigate to="/feed" replace />} />
        <Route path="/nextus/actors/:id"             element={<LegacyOrgRedirect />} />
        <Route path="/nextus/actors/:id/manage"      element={<LegacyOrgManageRedirect />} />
        <Route path="/nextus/actors/:id/needs/new"   element={<Navigate to="/tools/target-sprint" replace />} />
        <Route path="/nextus/map"                    element={<Navigate to="/map" replace />} />
        <Route path="/nextus/nominate"               element={<Navigate to="/nominate" replace />} />
        <Route path="/nextus/place"                  element={<Navigate to="/welcome/org" replace />} />
        <Route path="/nextus/contributors/:id"       element={<LegacyContributorRedirect />} />
        <Route path="/nextus/contributors"           element={<Navigate to="/feed" replace />} />
        <Route path="/nextus/focus/:slug"            element={<LegacyFocusRedirect />} />
        <Route path="/work-with-nik"   element={<WorkWithNikPage />} />
        <Route path="/podcast"         element={<PodcastPage />} />
        <Route path="/pricing"         element={<PricingPage />} />
        <Route path="/checkout"        element={<CheckoutPage />} />
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/privacy"         element={<PrivacyPage />} />
        <Route path="/terms"           element={<TermsPage />} />
        <Route path="/support"         element={<SupportResourcesPage />} />
        <Route path="/faq"             element={<FAQPage />} />
        <Route path="/profile"         element={<Navigate to="/" replace />} />
        <Route path="/dashboard"       element={<Navigate to="/" replace />} />
        <Route path="/tools"           element={<MarketingToolsPage />} />
        <Route path="/content-editor"  element={<ContentEditorPage />} />
        <Route path="/watch"           element={<WatchPage />} />

        {/* ── NextU — the journey (Chapters One–Four) ── */}
        <Route path="/nextu"              element={<RequirePersonal><NextUJourneyPage /></RequirePersonal>} />
        <Route path="/nextu/map"          element={<NextUShell chapter={1} chapterTitle="THE MAP"><MapPage /></NextUShell>} />
        <Route path="/nextu/i-am"         element={<IAmChapterPage />} />
        <Route path="/nextu/horizon-self" element={<HorizonSelfOnboardingPage />} />
        <Route path="/nextu/biography"    element={<HorizonBiographyPage />} />

        {/* ── Tools ── */}
        <Route path="/tools/north-star"          element={<NorthStarPage />} />
        <Route path="/tools/orienteering"        element={<Navigate to="/tools/north-star" replace />} />
        <Route path="/tools/map"                 element={<Navigate to="/nextu/map" replace />} />  {/* re-homed — Chapter One */}
        <Route path="/tools/horizon-state"       element={<HorizonStatePage />} />
        <Route path="/tools/nextsteps"           element={<RequirePersonal><NextStepsPage /></RequirePersonal>} />
        <Route path="/tools/purpose-piece"       element={<RequirePersonal><PurposePiecePage /></RequirePersonal>} />
        <Route path="/tools/purpose-piece/deep"  element={<RequirePersonal><PurposePieceDeepPage /></RequirePersonal>} />
        <Route path="/tools/target-sprint"       element={<RequirePersonal><TargetSprintPage /></RequirePersonal>} />
        <Route path="/atlas/goals"              element={<HorizonGoalsPage />} />
        <Route path="/atlas/goals/:domain"      element={<HorizonGoalsPage />} />
        <Route path="/tools/horizon-practice"    element={<RequirePersonal><HorizonPracticePage /></RequirePersonal>} />
        <Route path="/journal"                   element={<RequirePersonal><JournalPage /></RequirePersonal>} />
        <Route path="/tools/sentence-completion" element={<SentenceCompletion />} />
        <Route path="/tools/i-am"                element={<IAmPractice />} />
        <Route path="/tools/i-am-spoken"         element={<IAmSpoken />} />
        <Route path="/tools/morning-pages"       element={<MorningPages />} />
        <Route path="/daily"                     element={<RequirePersonal><DailyEntrances /></RequirePersonal>} />
        <Route path="/tools/training"            element={<Training />} />
        <Route path="/tools/anchor-breath"       element={<AnchorBreathPage />} />
        <Route path="/tools/charge-breath"       element={<ChargeBreathPage />} />
        <Route path="/tools/planet"              element={<PlanetMap />} />  {/* founder-only beta — gate inside PlanetMap */}

        {/* ── Platform routes (beta prefix retired) ── */}
        <Route path="/welcome/first-light"          element={<FirstLight />} />
        <Route path="/welcome"                      element={<WelcomeStart />} />
        <Route path="/welcome/self"                 element={<WelcomeSelf />} />
        <Route path="/welcome/org"                  element={<OrgWelcome />} />
        <Route path="/welcome/practitioner"         element={<WelcomePractitioner />} />
        <Route path="/welcome/org-next"             element={<WelcomeNext />} />
        <Route path="/welcome/practitioner-next"    element={<WelcomeNext />} />
        <Route path="/profile/edit"                 element={<ProfileEdit />} />
        <Route path="/profile/:id"                  element={<MemberPublicPage />} />
        <Route path="/feed"                         element={<FeedPage />} />
        <Route path="/contribution"                 element={<ContributionPage />} />
        <Route path="/contribution/legacy"          element={<Contribution />} />
        <Route path="/stretch/c/:slug"              element={<ChallengePage />} />
        <Route path="/challenges"                   element={<MyChallenges />} />
        <Route path="/challenges/new"               element={<ChallengeAuthor />} />
        <Route path="/challenges/browse"            element={<ChallengeBrowse />} />
        <Route path="/earth"                        element={<EarthLive />} />
        <Route path="/earth/journey"                element={<EarthJourney />} />
        <Route path="/challenges/partners"          element={<PartnerInbox />} />
        <Route path="/org/:slug"                    element={<OrgPublicPage />} />
        <Route path="/org/:id/claim"                element={<ClaimPage />} />
        <Route path="/invite/new"                   element={<InviteAuthorPage />} />
        <Route path="/i/:token"                     element={<InvitePage />} />
        <Route path="/remove/:token"                element={<RemovePage />} />
        <Route path="/search"                       element={<SearchPage />} />
        <Route path="/app"                          element={<InstallPage />} />
        <Route path="/org/:slug/manage"             element={<OrgManagePage />} />
        <Route path="/org/:slug/events/new"             element={<EventManagePage />} />
        <Route path="/org/:slug/events/:eventId/edit"   element={<EventManagePage />} />
        <Route path="/events/:id"                       element={<EventPublicPage />} />
        <Route path="/map"                          element={<PlanetMapPage />} />
        <Route path="/nextmarket"                   element={<NextMarketPage />} />
        <Route path="/alternatives"                 element={<Navigate to="/nextmarket" replace />} />
        <Route path="/nominate"                     element={<Navigate to="/add" replace />} />
        <Route path="/add"                          element={<AddPage />} />
        <Route path="/member/:slug"                 element={<MemberPublicPage />} />
        <Route path="/domain/:slug"                 element={<DomainPage />} />
        <Route path="/asks/new"                    element={<AskAuthor />} />
        <Route path="/constellation/record"         element={<ConstellationRecord />} />
        <Route path="/constellation/ledger"         element={<ConstellationLedger />} />
        <Route path="/constellation/:domain"        element={<ConstellationPage />} />
        <Route path="/issue/:slug"                  element={<IssueViewPage />} />
        <Route path="/focus"                        element={<FocusIndex />} />
        <Route path="/focus/:slug"                  element={<FocusProfile />} />

        {/* /explore — the wheel-as-navigator surface */}
        <Route path="/explore"                                          element={<Explore />} />
        <Route path="/explore/:domain"                                   element={<Explore />} />
        <Route path="/explore/:domain/:subdomain"                        element={<Explore />} />
        <Route path="/explore/:domain/:subdomain/:field"                 element={<Explore />} />
        <Route path="/tuned-in"                     element={<WatchedFeed />} />
        <Route path="/watched"                      element={<Navigate to="/tuned-in" replace />} />
        <Route path="/curated"                      element={<CuratedFeed />} />
        <Route path="/practices"                    element={<Practices />} />
        <Route path="/practices/new"                element={<PracticeContribute />} />
        <Route path="/practice/:slug"               element={<PracticeDetail />} />
        <Route path="/invitation"                   element={<InvitationIndexPage />} />
        <Route path="/invitation/:slug"             element={<InvitationPage />} />

        {/* ── /beta/* redirects — preserve old links ── */}
        <Route path="/beta"                              element={<Navigate to="/" replace />} />
        <Route path="/beta/dashboard"                    element={<Navigate to="/" replace />} />
        <Route path="/beta/welcome"                      element={<Navigate to="/" replace />} />
        <Route path="/beta/welcome/self"                 element={<Navigate to="/" replace />} />
        <Route path="/beta/welcome/org"                  element={<Navigate to="/welcome/org" replace />} />
        <Route path="/beta/welcome/practitioner"         element={<Navigate to="/welcome/practitioner" replace />} />
        <Route path="/beta/profile/edit"                 element={<Navigate to="/profile/edit" replace />} />
        <Route path="/beta/profile/:id"                  element={<Navigate to="/profile/:id" replace />} />
        <Route path="/beta/feed"                         element={<Navigate to="/feed" replace />} />
        <Route path="/beta/contribution"                 element={<Navigate to="/contribution" replace />} />
        <Route path="/beta/org/:slug/manage"             element={<Navigate to="/org/:slug/manage" replace />} />
        <Route path="/beta/org/:slug"                    element={<Navigate to="/org/:slug" replace />} />
        <Route path="/beta/map"                          element={<Navigate to="/map" replace />} />
        <Route path="/beta/admin"                        element={<Navigate to="/admin" replace />} />
        <Route path="/beta/nominate"                     element={<Navigate to="/nominate" replace />} />
        <Route path="/beta/domain/:slug"                 element={<Navigate to="/domain/:slug" replace />} />
        <Route path="/beta/practices"                    element={<Navigate to="/practices" replace />} />
        <Route path="/beta/practices/new"                element={<Navigate to="/practices/new" replace />} />
        <Route path="/beta/practice/:slug"               element={<Navigate to="/practice/:slug" replace />} />
        <Route path="/beta/invitation"                   element={<Navigate to="/invitation" replace />} />
        <Route path="/beta/invitation/:slug"             element={<Navigate to="/invitation/:slug" replace />} />

        {/* ── Begin / Build — maker registration ── */}
        <Route path="/begin/build/org"      element={<BeginBuildOrgPage />} />
        <Route path="/begin/build/practice" element={<BeginBuildPracticePage />} />
        <Route path="/begin/build/group"    element={<BeginBuildGroupPage />} />

        {/* ── Legacy redirects — clean once confirmed dead ── */}
        <Route path="/life-os"             element={<Navigate to="/nextus-self" replace />} />

        {/* ── Admin ── */}
        <Route path="/admin"           element={<AdminConsolePage />} />
        <Route path="/movie-magic"     element={<MovieMagicPage />} />
        <Route path="/join/:slug"      element={<GroupJoinPage />} />
        <Route path="/auth/callback"   element={<AuthCallbackPage />} />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Mobile bottom tabs — hidden on Mission Control where the brand
          bar menu and rail tiles already cover navigation. Hidden on
          desktop via CSS. */}
      {!hideBottomTabs && <BottomTabs />}

      {/* Add-to-home-screen invitation · mobile browsers only, never when
          already installed. Chromium gets the native prompt via our button;
          iOS Safari gets a Share → Add to Home Screen instruction card. */}
      <InstallPrompt />

      {/* Terms acceptance — appears once for signed-in users when version changes */}
    </>
  )
}

// ── Legacy redirect helpers that preserve route params ──
function LegacyOrgRedirect() {
  const { id } = useParams()
  return <Navigate to={`/org/${id}`} replace />
}
function LegacyOrgManageRedirect() {
  const { id } = useParams()
  return <Navigate to={`/org/${id}/manage`} replace />
}
function LegacyContributorRedirect() {
  const { id } = useParams()
  return <Navigate to={`/profile/${id}`} replace />
}
function LegacyFocusRedirect() {
  const { slug } = useParams()
  return <Navigate to={`/focus/${slug}`} replace />
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SiteCopyProvider>
          <ActingAsProvider>
            <AppInner />
          </ActingAsProvider>
        </SiteCopyProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
