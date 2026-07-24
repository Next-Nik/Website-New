// src/pages/NotFound.jsx
//
// Real 404 (audit T47). The old catch-all silently redirected every unknown
// path to home, which hid broken links for months — a mistyped or renamed
// route looked like a deliberate trip to the front door. Unknown paths now
// land here: named plainly, with the three doors that matter.
//
// Token-driven (fn.* — the bright warm ground). No raw hexes: the gold law
// forbids new heritage-gold usages outside the whitelist, so the accents
// here are moss, per the retheme.

import { Nav } from '../components/Nav'
import { SiteFooter } from '../components/SiteFooter'
import { fn } from '../lib/designTokens'

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const bodyF = { fontFamily: "'Lora', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }

export function NotFoundPage() {
  return (
    <div style={{ background: fn.ground, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Nav activePath="" />

      <div style={{
        flex: 1,
        maxWidth: '640px',
        margin: '0 auto',
        padding: 'clamp(120px, 16vw, 180px) clamp(20px, 5vw, 40px) 80px',
        textAlign: 'center',
      }}>
        <div style={{ ...sc, fontSize: '14px', letterSpacing: '0.2em', textTransform: 'uppercase', color: fn.moss, marginBottom: '16px' }}>
          Off the map
        </div>
        <h1 style={{ ...serif, fontSize: 'clamp(34px, 6vw, 48px)', fontWeight: 300, color: fn.ink, margin: '0 0 16px', lineHeight: 1.15 }}>
          This page isn&rsquo;t here.
        </h1>
        <p style={{ ...bodyF, fontSize: '17px', lineHeight: 1.7, color: fn.meta, margin: '0 0 36px' }}>
          The path may have moved, or the link that brought you here is out of date.
          Everything that matters is still one step away.
        </p>

        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/" style={{
            ...sc, fontSize: '14px', letterSpacing: '0.14em', textTransform: 'uppercase',
            background: fn.moss, color: fn.object, textDecoration: 'none',
            borderRadius: '30px', padding: '12px 28px', display: 'inline-block',
          }}>
            Home &rarr;
          </a>
          <a href="/guide" style={{
            ...sc, fontSize: '14px', letterSpacing: '0.14em', textTransform: 'uppercase',
            color: fn.moss, textDecoration: 'none',
            border: `1px solid ${fn.mossEdge}`, borderRadius: '30px', padding: '12px 28px', display: 'inline-block',
          }}>
            The Atlas &rarr;
          </a>
          <a href="/tools" style={{
            ...sc, fontSize: '14px', letterSpacing: '0.14em', textTransform: 'uppercase',
            color: fn.moss, textDecoration: 'none',
            border: `1px solid ${fn.mossEdge}`, borderRadius: '30px', padding: '12px 28px', display: 'inline-block',
          }}>
            The tools &rarr;
          </a>
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
