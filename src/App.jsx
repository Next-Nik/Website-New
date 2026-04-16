import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, Component } from 'react'
import { BottomTabs } from './components/BottomTabs'

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

// Site pages
import { HomePage }          from './pages/Home'
import { AboutPage }         from './pages/About'
import { LifeOSPage }        from './pages/LifeOS'
import { NextUsPage }          from './pages/NextUs'
import { NextUsActorsPage }    from './pages/NextUsActors'
import { NextUsActorPage }     from './pages/NextUsActor'
import { NextUsActorManagePage } from './pages/NextUsActorManage'
import { NextUsNeedNewPage }   from './pages/NextUsNeedNew'
import { NextUsMapPage }       from './pages/NextUsMap'
import { NextUsNominatePage }  from './pages/NextUsNominate'
import { NextUsContributorPage } from './pages/NextUsContributor'
import { NextUsContributorsPage } from './pages/NextUsContributors'
import { NextUsFocusPage }        from './pages/NextUsFocus'
import { WorkWithNikPage, PodcastPage } from './pages/WorkAndPodcast'
import { LoginPage }         from './pages/Login'
import { PrivacyPage, TermsPage } from './pages/Legal'
import { ProfilePage }       from './pages/Profile'
import { ContentEditorPage } from './pages/ContentEditor'
import { AdminConsolePage }  from './pages/AdminConsole'
import { GroupJoinPage }      from './pages/GroupJoin'
import { ToolsPage }          from './pages/Tools'
import { PricingPage }        from './pages/Pricing'
import { AuthCallbackPage }  from './pages/AuthCallback'

// Tools
import { OrienteeringPage }  from './tools/orienteering/Orienteering'
import { MapPage }           from './tools/map/Map'
import { FoundationPage }    from './tools/foundation/Foundation'
import { PurposePiecePage, PurposePieceDeepPage } from './tools/purpose-piece/PurposePiece'
import { TargetGoalsPage }   from './tools/target-goals/TargetGoals'
import { ExpansionPage }     from './tools/expansion/Expansion'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function ComingSoon({ name }) {
  const body = { fontFamily: "'Lora', Georgia, serif" }
  const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
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
        <Route path="/life-os"         element={<LifeOSPage />} />
        <Route path="/nextus"                        element={<NextUsPage />} />
        <Route path="/nextus/actors"                 element={<NextUsActorsPage />} />
        <Route path="/nextus/actors/:id"             element={<NextUsActorPage />} />
        <Route path="/nextus/actors/:id/manage"      element={<NextUsActorManagePage />} />
        <Route path="/nextus/actors/:id/needs/new"   element={<NextUsNeedNewPage />} />
        <Route path="/nextus/map"                    element={<NextUsMapPage />} />
        <Route path="/nextus/nominate"               element={<NextUsNominatePage />} />
        <Route path="/nextus/contributors/:id"       element={<NextUsContributorPage />} />
        <Route path="/nextus/contributors"             element={<NextUsContributorsPage />} />
        <Route path="/nextus/focus/:slug"              element={<NextUsFocusPage />} />
        <Route path="/work-with-nik"   element={<WorkWithNikPage />} />
        <Route path="/podcast"         element={<PodcastPage />} />
        <Route path="/pricing"         element={<PricingPage />} />
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/privacy"         element={<PrivacyPage />} />
        <Route path="/terms"           element={<TermsPage />} />
        <Route path="/profile"         element={<ProfilePage />} />
        <Route path="/tools"           element={<ToolsPage />} />
        <Route path="/content-editor"  element={<ContentEditorPage />} />

        {/* ── Tools ── */}
        <Route path="/tools/orienteering"       element={<OrienteeringPage />} />
        <Route path="/tools/map"                element={<MapPage />} />
        <Route path="/tools/foundation"         element={<FoundationPage />} />
        <Route path="/tools/purpose-piece"      element={<PurposePiecePage />} />
        <Route path="/tools/purpose-piece/deep" element={<PurposePieceDeepPage />} />
        <Route path="/tools/target-goals"       element={<TargetGoalsPage />} />
        <Route path="/tools/expansion"           element={<ExpansionPage />} />

        <Route path="/admin"           element={<AdminConsolePage />} />
        <Route path="/join/:slug"      element={<GroupJoinPage />} />

        <Route path="/auth/callback"   element={<AuthCallbackPage />} />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Mobile bottom tabs — hidden on desktop via CSS */}
      <BottomTabs />
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
