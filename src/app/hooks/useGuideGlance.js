// src/app/hooks/useGuideGlance.js
//
// Just enough of the viewer's field guide to draw the entry card's specimen
// collage on Mission Control: how many they've collected, and the eight most
// recent, champions first, with their domain colours.
//
// Deliberately small. Mission Control is already a heavy page, so this is
// three indexed reads and no joins, it never blocks render, and every failure
// path returns an empty glance — the card then falls back to its plain
// gradient exactly as it does today. Nothing here is allowed to be the reason
// Mission Control doesn't paint.

import { useEffect, useState } from 'react'
import { supabase } from '../../hooks/useSupabase'
import { CIV_DOMAINS } from '../constants/domains'

const TILES = 8

const EMPTY = { count: 0, tiles: [] }

// First CODE POINT, not first code unit. `charAt(0)` on a name beginning with
// an emoji or a maths-alphanumeric character returns half a surrogate pair,
// and a lone surrogate makes encodeURIComponent throw URIError inside
// guideCollageSrc — which runs during Mission Control's render, so it took the
// whole app down to the error boundary. Spreading the string iterates code
// points and keeps the pair intact.
function firstLetter(name) {
  const cp = [...String(name || '').trim()][0]
  return cp ? cp.toUpperCase() : '?'
}

function domainColor(domains) {
  const ds = Array.isArray(domains) ? domains : []
  const home = CIV_DOMAINS.find(d => ds.includes(d.slug))
  return home?.color || null
}

export function useGuideGlance(userId) {
  const [glance, setGlance] = useState(EMPTY)

  useEffect(() => {
    if (!userId) { setGlance(EMPTY); return }
    let cancelled = false

    async function load() {
      try {
        // 1. The collection: exact total, plus the most recent handful.
        const { data: notes, count, error } = await supabase
          .from('actor_field_notes')
          .select('actor_id, created_at', { count: 'exact' })
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(TILES)
        if (error) throw error
        if (cancelled) return

        const total = count ?? (notes || []).length
        if (!notes || notes.length === 0) { setGlance(EMPTY); return }

        // 2. Champions, so their tiles come back foiled. Optional: a
        //    database still on 178 has the table, one on neither degrades
        //    to an unfoiled sheet rather than no sheet.
        let championIds = new Set()
        try {
          const { data: champs } = await supabase
            .from('actor_champions')
            .select('actor_id')
            .eq('user_id', userId)
          championIds = new Set((champs || []).map(c => c.actor_id))
        } catch { /* unfoiled is fine */ }

        // 3. Names and domains for just those actors.
        const ids = notes.map(n => n.actor_id).filter(Boolean)
        const { data: actors, error: aErr } = await supabase
          .from('nextus_actors')
          .select('id, name, domains')
          .in('id', ids)
        if (aErr) throw aErr
        if (cancelled) return

        const byId = new Map((actors || []).map(a => [a.id, a]))

        const tiles = notes
          .map(n => {
            const a = byId.get(n.actor_id)
            if (!a) return null
            return {
              letter: firstLetter(a.name),
              color: domainColor(a.domains),
              champion: championIds.has(a.id),
            }
          })
          .filter(Boolean)
          // Champions to the front, recency preserved within each band —
          // the same sort the guide and the Tuned In feed use.
          .sort((x, y) => (y.champion ? 1 : 0) - (x.champion ? 1 : 0))
          .slice(0, TILES)

        setGlance({ count: total, tiles })
      } catch {
        if (!cancelled) setGlance(EMPTY)
      }
    }

    load()
    return () => { cancelled = true }
  }, [userId])

  return glance
}
