// src/beta/components/BetaLayout.jsx
//
// Module 0 — minimal shell. Renders the existing Nav above page content.
// No visible beta badge. No gate. The /beta surface is not gated for now;
// access is "type the URL." Wrap a gate around this later if the cohort
// model changes.
//
// Used by pages that opt in (currently BetaMap and BetaDomain). Pages
// that bring their own <Nav /> directly are unaffected.

import { Nav } from '../../components/Nav'

export function BetaLayout({ children, activePath }) {
  return (
    <>
      <Nav activePath={activePath} />
      {children}
    </>
  )
}

export default BetaLayout
