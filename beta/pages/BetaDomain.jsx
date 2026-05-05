import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { BetaLayout } from '../components/BetaLayout'
import { supabase } from '../../hooks/useSupabase'
import { GapSignalBadge } from '../components/GapSignalBadge'
import { CIV_DOMAINS } from '../constants/domains'

// ─────────────────────────────────────────────────────────────
// BetaDomain — Module 11 stub with Module 14 integration point.
//
// REQUIRES: Module 14 SQL migrations applied (compute_gap_signal RPC,
//   nextus_score_cache, threshold and weight tables). The page renders
//   without those — the GapSignalBadge stays silent on errors — but
//   Gap Signal will never fire until Module 14 is live.
//
// The Module 11 owner replaces this stub with the real Domain Page
// build. The integration contract Module 14 establishes:
//
//   <GapSignalBadge
//     domainId={domainSlug}    // 'nature', 'society', etc.
//     focusId={selectedFocus.id}
//     focusName={selectedFocus.name}
//   />
//
// Place near the actor grid. Component renders nothing when the
// signal is not firing. No layout space reserved when silent.
// ─────────────────────────────────────────────────────────────
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const body  = { fontFamily: "'Lora', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const dark     = '#0F1523'
const goldDark = '#A8721A'

export function BetaDomainPage() {
  const { slug } = useParams()
  const [focuses, setFocuses] = useState([])
  const [selectedFocusId, setSelectedFocusId] = useState('')
  const [loading, setLoading] = useState(true)

  // Resolve domain metadata from the canonical constants
  const domain = CIV_DOMAINS.find(d => d.slug === slug)

  // Load focuses for the focus picker (placeholder UX until Module 11 ships)
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('nextus_focuses')
        .select('id, name, slug, type')
        .order('name')
        .limit(50)
      setFocuses(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const selectedFocus = focuses.find(f => f.id === selectedFocusId)

  if (!domain) {
    return (
      <BetaLayout>
        <div style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <div style={{ textAlign: 'center', maxWidth: '480px' }}>
            <span style={{ ...sc, fontSize: '14px', letterSpacing: '0.2em', color: goldDark, display: 'block', marginBottom: '16px' }}>Module 11</span>
            <h1 style={{ ...serif, fontSize: 'clamp(28px,4vw,44px)', fontWeight: 300, color: dark, marginBottom: '12px' }}>Unknown domain</h1>
            <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.7 }}>
              No domain matches "{slug}". Try one of the seven canonical slugs.
            </p>
          </div>
        </div>
      </BetaLayout>
    )
  }

  return (
    <BetaLayout>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '72px 32px 80px' }}>

        {/* Header */}
        <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.20em', color: goldDark, display: 'block', marginBottom: '10px' }}>
          NextUs Beta · Module 11 (placeholder)
        </span>
        <h1 style={{ ...serif, fontSize: 'clamp(28px,4vw,44px)', fontWeight: 300, color: dark, marginBottom: '14px', lineHeight: 1.1 }}>
          {domain.label}
        </h1>
        <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.7, marginBottom: '32px', maxWidth: '640px' }}>
          {domain.horizonGoal}
        </p>

        {/* Focus picker — placeholder. Module 11 replaces with proper Focus UX. */}
        <div style={{
          background: 'rgba(15,21,35,0.03)',
          border: '1px solid rgba(15,21,35,0.08)',
          borderRadius: '10px',
          padding: '18px 22px',
          marginBottom: '24px',
        }}>
          <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.50)', marginBottom: '8px' }}>
            Module 14 demonstration · pick a Focus
          </div>
          <select
            value={selectedFocusId}
            onChange={e => setSelectedFocusId(e.target.value)}
            disabled={loading}
            style={{
              ...body, fontSize: '14px',
              padding: '8px 12px',
              border: '1px solid rgba(15,21,35,0.15)',
              borderRadius: '6px',
              background: 'white',
              minWidth: '260px',
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            <option value="">{loading ? 'Loading focuses…' : 'Select a Focus'}</option>
            {focuses.map(f => (
              <option key={f.id} value={f.id}>{f.name} ({f.type})</option>
            ))}
          </select>
        </div>

        {/* Actor grid placeholder */}
        <div style={{
          border: '1.5px dashed rgba(200,146,42,0.30)',
          borderRadius: '14px',
          padding: '40px',
          textAlign: 'center',
          marginBottom: '14px',
        }}>
          <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.50)', margin: 0 }}>
            Actor grid · Module 11 ships this
          </p>
        </div>

        {/* Gap Signal annotation slot —
            this is the integration point Module 14 owns.
            Renders nothing when the signal is not firing.
            Silent on error.
            Module 11 keeps this exactly here. */}
        {selectedFocus && (
          <GapSignalBadge
            domainId={domain.slug}
            focusId={selectedFocus.id}
            focusName={selectedFocus.name}
          />
        )}

      </div>
    </BetaLayout>
  )
}
