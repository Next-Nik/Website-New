// ─────────────────────────────────────────────────────────────
// Copy.jsx
//
// A pure text slot. <Copy id="home.hero.title" /> renders the founder's
// saved text for that id if one exists, otherwise the built-in default
// from the registry. It outputs a bare text node and carries no styling
// of its own, so the parent element's styles apply unchanged — wrapping a
// string with <Copy> never alters how it looks, only where its words come
// from. Editability and styling stay fully separate.
//
//   <h1 style={{ ...serif, fontSize: '58px' }}>
//     <Copy id="home.hero.title" />
//   </h1>
// ─────────────────────────────────────────────────────────────

import { useCopyText } from '../lib/siteCopy'

export function Copy({ id }) {
  const text = useCopyText(id)
  return <>{text}</>
}
