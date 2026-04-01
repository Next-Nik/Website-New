import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Site pages
import { HomePage }          from './pages/Home'
import { AboutPage }         from './pages/About'
import { LifeOSPage }        from './pages/LifeOS'
import { NextUsPage }        from './pages/NextUs'
import { WorkWithNikPage, PodcastPage } from './pages/WorkAndPodcast'
import { LoginPage }         from './pages/Login'
import { PrivacyPage, TermsPage } from './pages/Legal'
import { ProfilePage }       from './pages/Profile'
import { ContentEditorPage } from './pages/ContentEditor'

// Tools
import { OrienteeringPage }  from './tools/orienteering/Orienteering'
import { MapPage }           from './tools/map/Map'
import { FoundationPage }    from './tools/foundation/Foundation'
import { PurposePiecePage, PurposePieceDeepPage } from './tools/purpose-piece/PurposePiece'
import { TargetGoalsPage }   from './tools/target-goals/TargetGoals'

function ComingSoon({ name }) {
  const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
  const sc = { fontFamily: "'Cormorant SC', Georgia, serif" }
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
      <div style={{ textAlign: 'center' }}>
        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>Life OS</span>
        <h1 style={{ ...serif, fontSize: 'clamp(28px,4vw,44px)', fontWeight: 300, color: '#0F1523', marginBottom: '12px' }}>{name}</h1>
        <p style={{ ...serif, fontSize: '16px', fontStyle: 'italic', color: 'rgba(15,21,35,0.55)' }}>Migration in progress.</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Site pages ── */}
        <Route path="/"                element={<HomePage />} />
        <Route path="/index"           element={<Navigate to="/" replace />} />
        <Route path="/about"           element={<AboutPage />} />
        <Route path="/life-os"         element={<LifeOSPage />} />
        <Route path="/nextus"          element={<NextUsPage />} />
        <Route path="/work-with-nik"   element={<WorkWithNikPage />} />
        <Route path="/podcast"         element={<PodcastPage />} />
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/privacy"         element={<PrivacyPage />} />
        <Route path="/terms"           element={<TermsPage />} />
        <Route path="/profile"         element={<ProfilePage />} />
        <Route path="/content-editor"  element={<ContentEditorPage />} />

        {/* ── Tools ── */}
        <Route path="/tools/orienteering"       element={<OrienteeringPage />} />
        <Route path="/tools/map"                element={<MapPage />} />
        <Route path="/tools/foundation"         element={<FoundationPage />} />
        <Route path="/tools/purpose-piece"      element={<PurposePiecePage />} />
        <Route path="/tools/purpose-piece/deep" element={<PurposePieceDeepPage />} />
        <Route path="/tools/target-goals"       element={<TargetGoalsPage />} />
        <Route path="/tools/pulse"              element={<ComingSoon name="Pulse" />} />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
