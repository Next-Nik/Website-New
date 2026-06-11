// ─────────────────────────────────────────────────────────────
// InterestsIcon.jsx
//
// Tile glyph for the My Interests panel — a paper-with-tabs
// metaphor, evoking the pull-tab cork-board notice.
// ─────────────────────────────────────────────────────────────

export default function InterestsIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      display="block"
    >
      {/* Paper rectangle */}
      <path d="M5 3.5h14v12.5H5z" />
      {/* Pull tabs at the bottom */}
      <path d="M6.5 16v3.5M9 16v3.5M11.5 16v3.5M14 16v3.5M16.5 16v3.5" />
    </svg>
  )
}
