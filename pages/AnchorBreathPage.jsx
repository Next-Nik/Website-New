// ─────────────────────────────────────────────────────────────
// Anchor page — /tools/anchor-breath
//
// The Anchor breath, restored. Renders the recovered OpenBreath
// module: three rounds descending the body — chest/heart, belly,
// sacrum — each a deep breath in, hold, exhale on a voiced "ah",
// hold. Canvas tick-ring, swelling glow, audio cues.
//
// In the morning canvas this fills the second-breath region, after
// "look at your day". Standalone for now.
// ─────────────────────────────────────────────────────────────

import { useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import WorldMapSubstrate from '../components/mission-control/WorldMapSubstrate'
import OpenBreath from '../components/daily/OpenBreath'
import { body } from '../../lib/designTokens'

export default function AnchorBreathPage() {
  const navigate = useNavigate()
  return (
    <div style={{ ...body, background: '#FAFAF7', minHeight: '100dvh', color: '#0F1523', position: 'relative' }}>
      <WorldMapSubstrate />
      <Nav />
      <main style={{ position: 'relative', maxWidth: 600, margin: '0 auto', padding: '56px 22px 120px' }}>
        <OpenBreath
          title="Anchor"
          heading="Open the body."
          completeLabel="Done →"
          onComplete={() => navigate('/journal')}
          onBack={() => navigate('/')}
        />
      </main>
    </div>
  )
}
