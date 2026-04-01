import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Nav } from './components/Nav'
import { OrienteeringPage } from './tools/orienteering/Orienteering'
import { MapPage } from './tools/map/Map'
import { FoundationPage } from './tools/foundation/Foundation'
import { PurposePiecePage, PurposePieceDeepPage } from './tools/purpose-piece/PurposePiece'

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
        <Route path="/tools/orienteering"        element={<OrienteeringPage />} />
        <Route path="/tools/map"                 element={<MapPage />} />
        <Route path="/tools/foundation"          element={<FoundationPage />} />
        <Route path="/tools/purpose-piece"       element={<PurposePiecePage />} />
        <Route path="/tools/purpose-piece/deep"  element={<PurposePieceDeepPage />} />

        {/* <Route path="/tools/target-goals"  element={<TargetGoalsPage />} /> */}
        {/* <Route path="/tools/pulse"         element={<PulsePage />} /> */}

        <Route path="/tools/target-goals"  element={<ComingSoon name="Target Goals" />} />
        <Route path="/tools/pulse"         element={<ComingSoon name="Pulse" />} />

        <Route path="/tools/*" element={<Navigate to="/tools/orienteering" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
