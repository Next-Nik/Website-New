// ─────────────────────────────────────────────────────────────
// useDraftGuard.js — keep a writing draft alive across app discards
//
// iOS/iPadOS quietly discards backgrounded pages; React state goes
// with them. This hook mirrors a single text field into localStorage:
//   • hydrates once per key, and only into an empty field — it will
//     never clobber text the person has already typed
//   • persists on a short debounce while typing
//   • flushes immediately on pagehide / visibilitychange — the exact
//     moment a glance-away would otherwise eat the work
//   • returns clearDraft() to call after a successful save
//
// Key convention: `{tool}-draft:{userId}` — add `:{domain}` or
// similar when one tool holds independent drafts per context.
// Pass a falsy key to disable (e.g. while auth is still loading).
//
// Sibling: SentenceCompletion carries its own inline version of this
// (it guards a keyed object of endings plus a reflection, not one
// string). Same behaviour, same triggers.
// ─────────────────────────────────────────────────────────────
import { useEffect } from 'react'

export default function useDraftGuard(key, value, setValue) {
  // Hydrate once per key — only fills an empty field.
  useEffect(() => {
    if (!key) return
    try {
      const raw = localStorage.getItem(key)
      if (raw && !(value || '').trim()) setValue(raw)
    } catch { /* storage unavailable — nothing to restore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Debounced persist while typing.
  useEffect(() => {
    if (!key) return
    const t = setTimeout(() => {
      try {
        if ((value || '').trim()) localStorage.setItem(key, value)
        else localStorage.removeItem(key)
      } catch { /* storage full or unavailable */ }
    }, 500)
    return () => clearTimeout(t)
  }, [key, value])

  // Immediate flush when the app is backgrounded — the debounce
  // window is exactly when the loss happens.
  useEffect(() => {
    function flush() {
      if (!key) return
      try {
        if ((value || '').trim()) localStorage.setItem(key, value)
        else localStorage.removeItem(key)
      } catch { /* */ }
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', flush)
    }
  }, [key, value])

  return function clearDraft() {
    if (!key) return
    try { localStorage.removeItem(key) } catch { /* */ }
  }
}
