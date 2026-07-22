// ─────────────────────────────────────────────────────────────
// EditableText.jsx
//
// One string, editable in place by the founder when Edit Mode is on.
// For everyone else — and for the founder with Edit Mode off — it
// renders as plain text: the founder's saved override if there is
// one, otherwise the built-in wording.
//
// Two ways to use it, both fine:
//   <EditableText>Some copy</EditableText>            // self-keying
//   <EditableText id="x" defaultText="Some copy" />   // explicit key
//
// Self-keying means the string itself is the key (hashed), so wiring
// a new string is just wrapping it — no id to invent, no registry
// entry. Only literal, static copy should be wrapped; user-generated
// content is passed as {variables} and so is never wrapped, never
// editable. Overrides persist to `site_copy` (founder RLS, migration
// 156) and show for every visitor.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useCopyText, useSiteCopyMeta, saveCopy, clearCopy } from '../../lib/siteCopy'
import { useEditMode } from '../context/EditModeContext'

// Small stable hash (djb2) → base36. Same string, same key, every render.
function hashStr(s) {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

export default function EditableText({
  id,
  defaultText,
  as: Tag = 'span',
  multiline = false,
  className,
  style,
  children,
}) {
  const def = children != null ? String(children) : (defaultText || '')
  const key = id || `auto.${hashStr(def)}`

  const { editing } = useEditMode()
  const { refresh }  = useSiteCopyMeta()
  const override = useCopyText(key)
  const text = override || def

  const [active, setActive] = useState(false)   // this node is being edited
  const [draft, setDraft]   = useState('')
  const [busy, setBusy]     = useState(false)

  // Not in edit mode → plain text, identical to what every visitor sees.
  if (!editing) {
    return <Tag className={className} style={style}>{text}</Tag>
  }

  if (!active) {
    return (
      <Tag
        className={className}
        style={{ ...style, cursor: 'text' }}
        data-editable="true"
        title="Click to edit"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDraft(text); setActive(true) }}
      >
        {text}
      </Tag>
    )
  }

  const save = async () => {
    setBusy(true)
    const next = draft.trim()
    const ok = next && next !== def ? await saveCopy(key, next) : await clearCopy(key)
    setBusy(false)
    if (ok) { await refresh(); setActive(false) }
  }

  const Field = multiline ? 'textarea' : 'input'
  return (
    <span style={{ display: 'inline-block', width: '100%' }} onClick={e => e.stopPropagation()}>
      <Field
        autoFocus
        value={draft}
        disabled={busy}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Escape') setActive(false)
          if (e.key === 'Enter' && !multiline) { e.preventDefault(); save() }
        }}
        rows={multiline ? 3 : undefined}
        style={{
          font: 'inherit', color: 'inherit', letterSpacing: 'inherit', lineHeight: 'inherit',
          width: '100%', boxSizing: 'border-box', padding: '6px 8px',
          border: '1px solid var(--mc-accent, #4c6b45)', borderRadius: '8px',
          background: 'rgba(255,255,255,0.95)', resize: multiline ? 'vertical' : 'none',
        }}
      />
      <span style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
        <button type="button" onClick={save} disabled={busy}
          style={{ font: '600 13px/1 "IBM Plex Mono", monospace', letterSpacing: '0.08em',
            padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            color: '#fff', background: 'var(--mc-accent, #4c6b45)' }}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={() => setActive(false)} disabled={busy}
          style={{ font: '600 13px/1 "IBM Plex Mono", monospace', letterSpacing: '0.08em',
            padding: '7px 14px', borderRadius: '8px', border: '1px solid rgba(38,36,32,0.2)',
            cursor: 'pointer', color: 'inherit', background: 'transparent' }}>
          Cancel
        </button>
      </span>
    </span>
  )
}
