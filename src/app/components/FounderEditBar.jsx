// ─────────────────────────────────────────────────────────────
// FounderEditBar.jsx
//
// The floating "Edit text" toggle. Founder-only, fixed bottom-right,
// present on every page. Off by default so normal browsing is clean;
// flip it on to make every <EditableText> string editable in place,
// flip it off (Done) to return to normal. Renders nothing for anyone
// who is not the founder.
// ─────────────────────────────────────────────────────────────

import { useEditMode } from '../context/EditModeContext'

export default function FounderEditBar() {
  const { editing, canEdit, setEditing } = useEditMode()
  if (!canEdit) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setEditing(e => !e)}
        style={{
          position: 'fixed', right: '18px', bottom: '18px', zIndex: 4000,
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '11px 18px', borderRadius: '999px', cursor: 'pointer',
          fontFamily: "'Cormorant SC', Georgia, serif",
          fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em',
          color: editing ? '#ffffff' : '#262420',
          background: editing ? '#4c6b45' : '#ffffff',
          border: `1.5px solid ${editing ? '#4c6b45' : 'rgba(38,36,32,0.18)'}`,
          boxShadow: '0 2px 6px rgba(38,36,32,0.10), 0 12px 30px rgba(38,36,32,0.14)',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        {editing ? 'Done editing' : 'Edit text'}
      </button>

      {editing && (
        <style>{`
          [data-editable] {
            outline: 1px dashed rgba(76,107,69,0.55);
            outline-offset: 2px;
            border-radius: 3px;
            transition: background 0.15s ease;
          }
          [data-editable]:hover { background: rgba(76,107,69,0.08); cursor: text; }
        `}</style>
      )}
    </>
  )
}
