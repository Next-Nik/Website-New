// tests/practice-harness/entry.jsx
//
// Renders the REAL exported PracticePage (not a recreation of its JSX) with a
// mocked login and a stateful in-memory database, so The Practice — its own
// standalone tool, no longer a Care Protocol tab — can be driven by real
// clicks. The /api/care-reflection endpoint is mocked at the fetch layer with
// canned practice-mode reflections.

import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import PracticePage from '../../src/pages/Practice'

const realFetch = window.fetch.bind(window)
window.fetch = async (url, opts) => {
  if (typeof url === 'string' && url.includes('/api/care-reflection')) {
    const body = JSON.parse(opts?.body || '{}')
    window.__lastReflectionRequest = body
    if (body.practice) {
      // Distinct canned text per kind, so an assertion on the return
      // reflection can't be satisfied by the urge reflection already
      // rendered elsewhere on the page.
      const reflection = body.practice.kind === 'return'
        ? 'Vague on the pricing email, and you still made the outreach call — the day held both, and the call is the part your old accounting would have skipped.'
        : 'The offer came in and the pull was to shrink it — that is the set-point talking, not the price of your work. You logged it before it moved you; nothing needs deciding tonight.'
      return new Response(
        JSON.stringify({ reflection, generatedAt: new Date().toISOString() }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    return new Response(
      JSON.stringify({ reflection: 'Seen.', generatedAt: new Date().toISOString() }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }
  return realFetch(url, opts)
}

createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['/practice']}>
    <PracticePage />
  </MemoryRouter>,
)
