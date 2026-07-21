// ─────────────────────────────────────────────────────────────
// Charge breath page — /tools/charge-breath
//
// The recovered companion to Anchor: the Charge breath. Tabata-style
// — three rounds of fast, deep breathing (work) separated by rest,
// a 3·2·1 countdown in, animated progress ring and pulsing core.
//
// This was Stage 1 of the original Ground beat (Charge → Open).
// Standalone for now; placement in the canvas is open.
// ─────────────────────────────────────────────────────────────

import { useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import WorldMapSubstrate from '../components/mission-control/WorldMapSubstrate'
import ChargeBreath from '../components/daily/ChargeBreath'
import { body } from '../../lib/designTokens'

export default function ChargeBreathPage() {
  const navigate = useNavigate()
  return (
    <div style={{ ...body, background: '#FAFAF7', minHeight: '100dvh', color: '#0F1523', position: 'relative' }}>
      <WorldMapSubstrate />
      <Nav />
      <main style={{ position: 'relative', maxWidth: 600, margin: '0 auto', padding: '56px 22px 120px' }}>
        <ChargeBreath
          title="Charge"
          heading="Wake the system."
          completeLabel="Done →"
          onComplete={() => navigate('/journal')}
          onBack={() => navigate('/')}
        />
      </main>
    </div>
  )
}
