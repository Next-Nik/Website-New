import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { useEffect, Component } from 'react'
import { BottomTabs } from './components/BottomTabs'
import { TermsAcceptanceModal } from './components/TermsAcceptanceModal'

// Error boundary
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', background: '#FAFAF7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '17px', letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>Something went wrong</span>
            <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '18px', color: 'rgba(15,21,35,0.55)', marginBottom: '24px', lineHeight: 1.7 }}>
              We hit an unexpected error. Please refresh the page — your progress is saved.
            </p>
            <button onClick={() => window.location.reload()} style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', padding: '12px 28px', cursor: 'pointer' }}>
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
import { HomePage }               from './pages/Home'
import { AboutPage }              from './pages/About'
import { NextUsSelfPage }         from './pages/NextUsSelf'
import { NextUsPage }             from './pages/NextUs'
import { NextUsActorsPage }       from './pages/NextUsActors'
import { NextUsActorPage }        from './pages/NextUsActor'
import { NextUsActorManagePage }  from './pages/NextUsActorManage'
import { NextUsNeedNewPage }      from './pages/NextUsNeedNew'
import { NextUsMapPage }          from './pages/NextUsMap'
import { NextUsNominatePage }     from './pages/NextUsNominate'
import { NextUsPlacePage }        from './pages/NextUsPlace'
import { NextUsContributorPage }  from './pages/NextUsContributor'
import { NextUsContributorsPage } from './pages/NextUsContributors'
import { NextUsFocusPage }        from './pages/NextUsFocus'
import { DomainPage }             from './pages/Domain'
import { WorkWithNikPage, PodcastPage } from './pages/WorkAndPodcast'
import { LoginPage }              from './pages/Login'
import { PrivacyPage, TermsPage } from './pages/Legal'
import { SupportResourcesPage } from './pages/SupportResources'
import { FAQPage }               from './pages/FAQ'
import { ProfilePage }            from './pages/Profile'
import { ContentEditorPage }      from './pages/ContentEditor'
import { GroupJoinPage }          from './pages/GroupJoin'
import { ToolsPage }              from './pages/Tools'
import { PricingPage }            from './pages/Pricing'
import { CheckoutPage }          from './pages/Checkout'
import { AuthCallbackPage }       from './pages/AuthCallback'
import { WatchPage }              from './pages/Watch'

// ── Beta pages (Section 7 of NextUs Beta Build Architecture v1.2) ──
// Open access during the build. Walk the new flow at /beta/dashboard.
import BetaMissionControl         from './beta/pages/BetaMissionControl'
import BetaWelcomeStart           from './beta/pages/BetaWelcomeStart'
import BetaWelcomeSelf            from './beta/pages/BetaWelcomeSelf'
import BetaOrgWelcome             from './beta/pages/BetaOrgWelcome'
import BetaWelcomePractitioner    from './beta/pages/BetaWelcomePractitioner'
import BetaWelcomeNext            from './beta/pages/BetaWelcomeNext'
import BetaIntroGate              from './beta/components/BetaIntroGate'
import BetaProfileEdit            from './beta/pages/BetaProfileEdit'
import { BetaPublicProfile }      from './beta/pages/BetaPublicProfile'
import { BetaFeedPage }           from './beta/pages/BetaFeed'
import BetaContribution           from './beta/pages/BetaContribution'
import { BetaOrgPublicPage }      from './beta/pages/BetaOrgPublic'
import { BetaOrgManagePage }      from './beta/pages/BetaOrgManage'
import { BetaMapPage }            from './beta/pages/BetaMap'
import { NextMarketPage }         from './beta/pages/NextMarket'
import { BetaAdminConsolePage }   from './beta/pages/BetaAdminConsole'
import { BetaNominatePage }       from './beta/pages/BetaNominate'
import { BetaDomainPage }         from './beta/pages/BetaDomain'
import BetaPractices              from './beta/pages/BetaPractices'
import BetaPracticeDetail         from './beta/pages/BetaPracticeDetail'
import BetaPracticeContribute     from './beta/pages/BetaPracticeContribute'
import { BetaInvitationPage }     from './beta/pages/BetaInvitation'
import { BetaInvitationIndexPage } from './beta/pages/BetaInvitationIndex'

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
import { HorizonPracticePage }                     from './tools/horizon-practice/HorizonPractice'

const body = { fontFamily: "'Lora', Georgia, serif" }

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function ComingSoon({ name }) {
  const sc = { fontFamily: "'Cormorant SC', Georgia, serif" }
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
      <div style={{ textAlign: 'center' }}>
        <span style={{ ...sc, fontSize: '17px', letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>Horizon Suite</span>
        <h1 style={{ ...body, fontSize: 'clamp(28px,4vw,44px)', fontWeight: 300, color: '#0F1523', marginBottom: '12px' }}>{name}</h1>
        <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.55)' }}>Coming soon.</p>
      </div>
    </div>
  )
}

function AppInner() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* ── Site pages ── */}
        <Route path="/"                element={<BetaIntroGate><BetaMissionControl /></BetaIntroGate>} />
        <Route path="/index"           element={<Navigate to="/" replace />} />
        <Route path="/home"            element={<Navigate to="/" replace />} />
        <Route path="/about"           element={<AboutPage />} />
        {/* ── Legacy NextUs routes → redirect to new platform paths ── */}
        <Route path="/nextus-self"                   element={<Navigate to="/welcome/self" replace />} />
        <Route path="/nextus"                        element={<Navigate to="/" replace />} />
        <Route path="/nextus/actors"                 element={<Navigate to="/feed" replace />} />
        <Route path="/nextus/actors/:id"             element={<LegacyOrgRedirect />} />
        <Route path="/nextus/actors/:id/manage"      element={<LegacyOrgManageRedirect />} />
        <Route path="/nextus/actors/:id/needs/new"   element={<Navigate to="/contribution" replace />} />
        <Route path="/nextus/map"                    element={<Navigate to="/map" replace />} />
        <Route path="/nextus/nominate"               element={<Navigate to="/nominate" replace />} />
        <Route path="/nextus/place"                  element={<Navigate to="/welcome/org" replace />} />
        <Route path="/nextus/contributors/:id"       element={<LegacyContributorRedirect />} />
        <Route path="/nextus/contributors"           element={<Navigate to="/feed" replace />} />
        <Route path="/nextus/focus/:slug"            element={<Navigate to="/" replace />} />
        <Route path="/domain/:slug"                  element={<DomainPage />} />
        <Route path="/work-with-nik"   element={<WorkWithNikPage />} />
        <Route path="/podcast"         element={<PodcastPage />} />
        <Route path="/pricing"         element={<PricingPage />} />
        <Route path="/checkout"        element={<CheckoutPage />} />
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/privacy"         element={<PrivacyPage />} />
        <Route path="/terms"           element={<TermsPage />} />
        <Route path="/support"         element={<SupportResourcesPage />} />
        <Route path="/faq"             element={<FAQPage />} />
        <Route path="/profile"         element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"       element={<BetaIntroGate><BetaMissionControl /></BetaIntroGate>} />
        <Route path="/tools"           element={<ToolsPage />} />
        <Route path="/content-editor"  element={<ContentEditorPage />} />
        <Route path="/watch"           element={<WatchPage />} />

        {/* ── Tools ── */}
        <Route path="/tools/north-star"          element={<NorthStarPage />} />
        <Route path="/tools/orienteering"        element={<Navigate to="/tools/north-star" replace />} />
        <Route path="/tools/map"                 element={<MapPage />} />
        <Route path="/tools/horizon-state"       element={<HorizonStatePage />} />
        <Route path="/tools/purpose-piece"       element={<PurposePiecePage />} />
        <Route path="/tools/purpose-piece/deep"  element={<PurposePieceDeepPage />} />
        <Route path="/tools/target-sprint"       element={<TargetSprintPage />} />
        <Route path="/tools/horizon-practice"    element={<HorizonPracticePage />} />

        {/* ── Platform routes (beta prefix retired) ── */}
        <Route path="/welcome"                      element={<BetaWelcomeStart />} />
        <Route path="/welcome/self"                 element={<BetaWelcomeSelf />} />
        <Route path="/welcome/org"                  element={<BetaOrgWelcome />} />
        <Route path="/welcome/practitioner"         element={<BetaWelcomePractitioner />} />
        <Route path="/welcome/org-next"             element={<BetaWelcomeNext />} />
        <Route path="/welcome/practitioner-next"    element={<BetaWelcomeNext />} />
        <Route path="/profile/edit"                 element={<BetaProfileEdit />} />
        <Route path="/profile/:id"                  element={<BetaPublicProfile />} />
        <Route path="/feed"                         element={<BetaFeedPage />} />
        <Route path="/contribution"                 element={<BetaContribution />} />
        <Route path="/org/:slug"                    element={<BetaOrgPublicPage />} />
        <Route path="/org/:slug/manage"             element={<BetaOrgManagePage />} />
        <Route path="/map"                          element={<BetaMapPage />} />
        <Route path="/nextmarket"                   element={<NextMarketPage />} />
        <Route path="/alternatives"                 element={<Navigate to="/nextmarket" replace />} />
        <Route path="/nominate"                     element={<BetaNominatePage />} />
        <Route path="/domain/:slug"                 element={<BetaDomainPage />} />
        <Route path="/practices"                    element={<BetaPractices />} />
        <Route path="/practices/new"                element={<BetaPracticeContribute />} />
        <Route path="/practice/:slug"               element={<BetaPracticeDetail />} />
        <Route path="/invitation"                   element={<BetaInvitationIndexPage />} />
        <Route path="/invitation/:slug"             element={<BetaInvitationPage />} />

        {/* ── /beta/* redirects — preserve old links ── */}
        <Route path="/beta"                              element={<Navigate to="/dashboard" replace />} />
        <Route path="/beta/dashboard"                    element={<Navigate to="/dashboard" replace />} />
        <Route path="/beta/welcome"                      element={<Navigate to="/welcome" replace />} />
        <Route path="/beta/welcome/self"                 element={<Navigate to="/welcome/self" replace />} />
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
        <Route path="/admin"           element={<BetaAdminConsolePage />} />
        <Route path="/join/:slug"      element={<GroupJoinPage />} />
        <Route path="/auth/callback"   element={<AuthCallbackPage />} />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Mobile bottom tabs — hidden on desktop via CSS */}
      <BottomTabs />

      {/* Terms acceptance — appears once for signed-in users when version changes */}
      <TermsAcceptanceModal />
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

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
