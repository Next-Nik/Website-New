// ─────────────────────────────────────────────────────────────
// MessagesIcon.jsx
//
// Tile glyph for the Messages tile in the Mission Control rail.
// A simple chat bubble outline. Stroke uses currentColor.
// ─────────────────────────────────────────────────────────────

export default function MessagesIcon() {
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
      <path d="M4 6.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9.5L6 21v-3.5H6a2 2 0 0 1-2-2v-9z" />
    </svg>
  )
}
