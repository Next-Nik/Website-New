import { useState, useEffect } from 'react'
import { supabase } from '../../hooks/useSupabase'

// ─────────────────────────────────────────────────────────────
// useGapSignal — fetches the Gap Signal payload for a (domain, focus).
//
// Calls the SQL RPC compute_gap_signal which handles caching server-side
// (10-min TTL, invalidated on indicator value writes by triggers).
// Returns null until both inputs are present, so the consumer doesn't
// have to short-circuit at every call site.
//
// Returns:
//   { payload, loading, error, refresh }
//
//   payload — full Gap Signal result; see 14_05_compute_gap_signal.sql
//             for the JSONB shape. Null until first successful fetch.
//   loading — true while the RPC is in flight
//   error   — Error object if the RPC failed; null otherwise
//   refresh — function that forces a re-fetch, bypassing local memo
//
// The SECURITY DEFINER on the RPC means anonymous and authenticated
// users can both call it. The result is the same regardless of who
// called.
// ─────────────────────────────────────────────────────────────
export function useGapSignal(domainId, focusId) {
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [tick,    setTick]    = useState(0)  // bump to force refresh

  useEffect(() => {
    if (!domainId || !focusId) {
      setPayload(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    supabase
      .rpc('compute_gap_signal', { p_domain_id: domainId, p_focus_id: focusId })
      .then(({ data, error: rpcError }) => {
        if (cancelled) return
        if (rpcError) {
          setError(rpcError)
          setPayload(null)
        } else {
          setPayload(data)
        }
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [domainId, focusId, tick])

  return {
    payload,
    loading,
    error,
    refresh: () => setTick(t => t + 1),
  }
}
