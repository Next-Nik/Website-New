import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Nav } from './components/Nav'

// Tool pages — each lazy-loaded once built
import { OrienteeringPage } from './tools/orienteering/Orienteering'

// Placeholder for tools not yet migrated
function ComingSoon({ name }) {
  return (
    <div className="page-shell">
      <Nav />
      <div className="tool-wrap">
        <div className="tool-header">
          <span className="tool-eyebrow">Life OS</span>
          <h1 className="tool-title">{name}</h1>
        </div>
        <p style={{ color: 'var(--text-muted)' }}>Migration in progress.</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Orienteering — first tool, proves the pattern */}
        <Route path="/tools/orienteering" element={<OrienteeringPage />} />

        {/* Remaining tools — uncomment as each is built */}
        {/* <Route path="/tools/map"                element={<MapPage />} /> */}
        {/* <Route path="/tools/foundation"         element={<FoundationPage />} /> */}
        {/* <Route path="/tools/purpose-piece"      element={<PurposePiecePage />} /> */}
        {/* <Route path="/tools/purpose-piece/deep" element={<PurposePieceDeepPage />} /> */}
        {/* <Route path="/tools/target-goals"       element={<TargetGoalsPage />} /> */}
        {/* <Route path="/tools/pulse"              element={<PulsePage />} /> */}

        {/* Fallback placeholders so routes don't 404 during migration */}
        <Route path="/tools/map"           element={<ComingSoon name="The Map" />} />
        <Route path="/tools/foundation"    element={<ComingSoon name="Foundation" />} />
        <Route path="/tools/purpose-piece" element={<ComingSoon name="Purpose Piece" />} />
        <Route path="/tools/target-goals"  element={<ComingSoon name="Target Goals" />} />
        <Route path="/tools/pulse"         element={<ComingSoon name="Pulse" />} />

        {/* Catch-all — redirect unknown /tools/* to orienteering */}
        <Route path="/tools/*" element={<Navigate to="/tools/orienteering" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
