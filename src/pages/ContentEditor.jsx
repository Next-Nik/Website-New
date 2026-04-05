import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SiteNav } from '../components/SiteNav'
import { useAuth } from '../hooks/useAuth'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const sc = { fontFamily: "'Cormorant SC', Georgia, serif" }

// Content editor is founder-only. For now it redirects to the
// vanilla content-editor implementation until the React version is built.
// Drop the full React content editor here when ready.

export function ContentEditorPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (!user) navigate('/login?redirect=/content-editor')
  }, [user, loading])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FAFAF7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.45)' }}>Loading{'\u2026'}</div>
    </div>
  )

  if (!user) return null

  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <SiteNav />
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '112px 40px 120px' }}>
        <span style={{ ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em', color: '#A8721A', display: 'block', marginBottom: '16px' }}>Content Editor</span>
        <h1 style={{ ...serif, fontSize: 'clamp(32px,4vw,48px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.1, marginBottom: '24px' }}>
          Domain content.<br /><em style={{ color: '#A8721A' }}>In progress.</em>
        </h1>
        <p style={{ ...serif, fontSize: '16px', fontWeight: 300, color: 'rgba(15,21,35,0.88)', lineHeight: 1.75, marginBottom: '48px', maxWidth: '520px' }}>
          The React content editor is being built. The Supabase-backed domain tree, RPC, and mobile-first editing interface will live here.
        </p>
        <div style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '28px 32px' }}>
          <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em', color: '#A8721A', display: 'block', marginBottom: '12px' }}>Status</span>
          <p style={{ ...serif, fontSize: '15px', color: '#0F1523', lineHeight: 1.7 }}>
            Supabase schema pending (domains table, get_domain_tree RPC). Once the migration runs, the editor mounts here with the full domain tree, inline editing, and publish controls.
          </p>
        </div>
      </div>
    </div>
  )
}
