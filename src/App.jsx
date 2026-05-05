import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
import { DashboardPage }          from './pages/Dashboard'
import { ContentEditorPage }      from './pages/ContentEditor'
import { AdminConsolePage }       from './pages/AdminConsole'
import { GroupJoinPage }          from './pages/GroupJoin'
import { ToolsPage }              from './pages/Tools'
import { PricingPage }            from './pages/Pricing'
import { CheckoutPage }          from './pages/Checkout'
import { AuthCallbackPage }       from './pages/AuthCallback'
import { WatchPage }              from './pages/Watch'

// ── Beta pages (Section 7 of NextUs Beta Build Architecture v1.2) ──
// Open access during the build. Walk the new flow at /beta/dashboard.
import BetaMissionControl         from './beta/pages/BetaMissionControl'
import BetaProfileEdit            from './beta/pages/BetaProfileEdit'
import { BetaPublicProfile }      from './beta/pages/BetaPublicProfile'
import { BetaFeedPage }           from './beta/pages/BetaFeed'
import BetaContribution           from './beta/pages/BetaContribution'
import { BetaOrgPublicPage }      from './beta/pages/BetaOrgPublic'
import { BetaOrgManagePage }      from './beta/pages/BetaOrgManage'
import { BetaMapPage }            from './beta/pages/BetaMap'
import { BetaAdminConsolePage }   from './beta/pages/BetaAdminConsole'
import { BetaNominatePage }       from './beta/pages/BetaNominate'
import { BetaDomainPage }         from './beta/pages/BetaDomain'
import BetaPractices              from './beta/pages/BetaPractices'
import BetaPracticeDetail         from './beta/pages/BetaPracticeDetail'
import BetaPracticeContribute     from './beta/pages/BetaPracticeContribute'
import { BetaInvitationPage }     from './beta/pages/BetaInvitation'
import { BetaInvitationIndexPage } from './beta/pages/BetaInvitationIndex'

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
        <Route path="/"                element={<HomePage />} />
        <Route path="/index"           element={<Navigate to="/" replace />} />
        <Route path="/about"           element={<AboutPage />} />
        <Route path="/nextus-self"     element={<NextUsSelfPage />} />
        <Route path="/nextus"                        element={<NextUsPage />} />
        <Route path="/nextus/actors"                 element={<NextUsActorsPage />} />
        <Route path="/nextus/actors/:id"             element={<NextUsActorPage />} />
        <Route path="/nextus/actors/:id/manage"      element={<NextUsActorManagePage />} />
        <Route path="/nextus/actors/:id/needs/new"   element={<NextUsNeedNewPage />} />
        <Route path="/nextus/map"                    element={<NextUsMapPage />} />
        <Route path="/nextus/nominate"               element={<NextUsNominatePage />} />
        <Route path="/nextus/place"                  element={<NextUsPlacePage />} />
        <Route path="/nextus/contributors/:id"       element={<NextUsContributorPage />} />
        <Route path="/nextus/contributors"           element={<NextUsContributorsPage />} />
        <Route path="/nextus/focus/:slug"            element={<NextUsFocusPage />} />
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
        <Route path="/dashboard"       element={<DashboardPage />} />
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

        {/* ── Beta — open access during the build. /beta lands on Mission Control. ── */}
        <Route path="/beta"                      element={<Navigate to="/beta/dashboard" replace />} />
        <Route path="/beta/dashboard"            element={<BetaMissionControl />} />
        <Route path="/beta/profile/edit"         element={<BetaProfileEdit />} />
        <Route path="/beta/profile/:id"          element={<BetaPublicProfile />} />
        <Route path="/beta/feed"                 element={<BetaFeedPage />} />
        <Route path="/beta/contribution"         element={<BetaContribution />} />
        <Route path="/beta/org/:slug"            element={<BetaOrgPublicPage />} />
        <Route path="/beta/org/:slug/manage"     element={<BetaOrgManagePage />} />
        <Route path="/beta/map"                  element={<BetaMapPage />} />
        <Route path="/beta/admin"                element={<BetaAdminConsolePage />} />
        <Route path="/beta/nominate"             element={<BetaNominatePage />} />
        <Route path="/beta/domain/:slug"         element={<BetaDomainPage />} />
        <Route path="/beta/practices"            element={<BetaPractices />} />
        <Route path="/beta/practices/new"        element={<BetaPracticeContribute />} />
        <Route path="/beta/practice/:slug"       element={<BetaPracticeDetail />} />
        <Route path="/beta/invitation"           element={<BetaInvitationIndexPage />} />
        <Route path="/beta/invitation/:slug"     element={<BetaInvitationPage />} />

        {/* ── Legacy redirects — clean once confirmed dead ── */}
        <Route path="/life-os"             element={<Navigate to="/nextus-self" replace />} />

        {/* ── Admin ── */}
        <Route path="/admin"           element={<AdminConsolePage />} />
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

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
