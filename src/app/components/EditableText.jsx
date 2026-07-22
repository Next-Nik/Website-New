// ─────────────────────────────────────────────────────────────
// EditableText.jsx
//
// On-site copy editing. For everyone, it renders a string: the
// founder's saved override if there is one, otherwise the in-code
// default passed as `defaultText`. For the founder (and only the
// founder), the text becomes click-to-edit in place — click it,
// change it, save. The override persists to `site_copy` (founder
// RLS at the DB, migration 156) and shows for every visitor.
//
// No registry entry is required: the id + defaultText are enough.
// Reverting to the default is a click away (Reset).
// ─────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useCopyText, useSiteCopyMeta, saveCopy, clearCopy } from '../../lib/siteCopy'

function isFounder(user) {
  return user?.app_metadata?.role === 'founder' || user?.user_metadata?.role === 'founder'
}

export default function EditableText({
  id,
  defaultText = '',
  as: Tag = 'span',
  multiline = false,
  className,
  style,
}) {
  const { user } = useAuth()
  const { refresh } = useSiteCopyMeta()
  const override = useCopyText(id)
  const text = override || defaultText

  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState('')
  const [busy, setBusy]       = useState(false)

  const founder = isFounder(user)

  // Everyone else — and the founder when not editing this node — sees plain text.
  if (!founder) {
    return <Tag className={className} style={style}>{text}</Tag>
  }

  if (!editing) {
    return (
      <Tag
        className={className}
        style={{ ...style, cursor: 'text', outline: 'none' }}
        title="Click to edit · founder"
        onClick={() => { setDraft(text); setEditing(true) }}
      >
        {text}
        <span aria-hidden="true" style={{
          marginLeft: '8px', fontSize: '13px', verticalAlign: 'middle',
          opacity: 0.55, cursor: 'pointer', WebkitTextFillColor: 'currentColor',
        }}>✎</span>
      </Tag>
    )
  }

  const save = async () => {
    setBusy(true)
    const next = draft.trim()
    // Empty draft = revert to the in-code default.
    const ok = next && next !== defaultText ? await saveCopy(id, next) : await clearCopy(id)
    setBusy(false)
    if (ok) { await refresh(); setEditing(false) }
  }

  const Field = multiline ? 'textarea' : 'input'
  return (
    <span style={{ display: 'block' }}>
      <Field
        autoFocus
        value={draft}
        disabled={busy}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Escape') setEditing(false)
          if (e.key === 'Enter' && !multiline) { e.preventDefault(); save() }
        }}
        rows={multiline ? 3 : undefined}
        style={{
          font: 'inherit', color: 'inherit', letterSpacing: 'inherit', lineHeight: 'inherit',
          width: '100%', boxSizing: 'border-box', padding: '6px 8px',
          border: '1px solid var(--mc-accent, #4c6b45)', borderRadius: '8px',
          background: 'rgba(255,255,255,0.9)', resize: multiline ? 'vertical' : 'none',
        }}
      />
      <span style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
        <button type="button" onClick={save} disabled={busy}
          style={{ font: '600 13px/1 "IBM Plex Mono", monospace', letterSpacing: '0.08em',
            padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            color: '#fff', background: 'var(--mc-accent, #4c6b45)' }}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={() => setEditing(false)} disabled={busy}
          style={{ font: '600 13px/1 "IBM Plex Mono", monospace', letterSpacing: '0.08em',
            padding: '7px 14px', borderRadius: '8px', border: '1px solid rgba(38,36,32,0.2)',
            cursor: 'pointer', color: 'inherit', background: 'transparent' }}>
          Cancel
        </button>
      </span>
    </span>
  )
}
