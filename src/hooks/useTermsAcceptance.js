import { useEffect, useState, useCallback } from 'react'
import { supabase } from './useSupabase'
import { useAuth } from './useAuth'
import { TERMS_VERSION } from '../pages/Legal'

/**
 * useTermsAcceptance
 *
 * Returns:
 *   accepted  boolean | null   — null while checking, true/false after
 *   checked   boolean          — true once the check has completed
 *   user      object | null    — the current user (passthrough)
 *   accept    function         — call to record acceptance for current version
 *   accepting boolean          — true during the accept request
 */
export function useTermsAcceptance() {
  const { user, loading: authLoading } = useAuth()
  const [accepted, setAccepted] = useState(null)
  const [checked, setChecked]   = useState(false)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setAccepted(null)
      setChecked(true)
      return
    }

    let cancelled = false
    supabase
      .from('user_terms_acceptance')
      .select('version')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          // On query error, fail open — don't block users from the app.
          // They'll be re-prompted next session if the table becomes accessible.
          setAccepted(true)
        } else {
          setAccepted(data?.version === TERMS_VERSION)
        }
        setChecked(true)
      })

    return () => { cancelled = true }
  }, [user, authLoading])

  const accept = useCallback(async () => {
    if (!user || accepting) return
    setAccepting(true)
    try {
      const { error } = await supabase
        .from('user_terms_acceptance')
        .upsert({
          user_id:     user.id,
          version:     TERMS_VERSION,
          accepted_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

      if (!error) setAccepted(true)
    } finally {
      setAccepting(false)
    }
  }, [user, accepting])

  return { accepted, checked, user, accept, accepting }
}
