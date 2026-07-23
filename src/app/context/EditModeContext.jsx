// ─────────────────────────────────────────────────────────────
// EditModeContext.jsx
//
// A site-wide founder "Edit text" mode. When on, every string wired
// through <EditableText> becomes click-to-edit in place; when off,
// the site reads exactly as it does for everyone else. Only the
// founder can turn it on — for everyone else `editing` is always
// false and `canEdit` is false, so nothing renders differently.
// ─────────────────────────────────────────────────────────────

import { createContext, useContext, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

const EditModeContext = createContext({ editing: false, canEdit: false, setEditing: () => {} })

export function EditModeProvider({ children }) {
  const { user } = useAuth()
  const canEdit =
    user?.app_metadata?.role === 'founder' || user?.user_metadata?.role === 'founder'
  const [editing, setEditing] = useState(false)

  // A non-founder can never be in edit mode.
  const value = { editing: canEdit && editing, canEdit, setEditing }
  return <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>
}

export function useEditMode() {
  return useContext(EditModeContext)
}
