// src/app/hooks/useFocusFeed.js
//
// Wraps useFeed and applies focus-aware re-ranking on top of the chronological
// sort, without filtering anything out.
//
// Why a wrapper (not a change to useFeed): useFeed is shared infrastructure
// used by /tuned-in, /curated, /feed, etc. We don't want focus to leak into
// surfaces that aren't focus-aware. This hook is the focus lens; pages that
// don't need it keep calling useFeed directly.
//
// Ranking rule (intentionally simple for v1):
//   - Items whose actor.id is in focus_actor_ids: +2.0 boost
//   - Items whose domain matches a focus_domain_slugs entry: +1.0 boost
//   - All other items: 0 boost
//
// Within the same boost tier, chronological order is preserved (useFeed
// already sorted by timestamp desc; this is a stable re-sort).
//
// Place filtering is NOT applied here. Place→actor and place→content links
// aren't wired across the feed item types yet; that's a follow-up. For now,
// places affect the panel header copy ("for Canada, Earth") but not the
// item stream itself.
//
// Sort, don't filter: a user with very specific focus shouldn't have their
// feed emptied. They see everything they'd normally see; focus matches just
// surface first.

import { useMemo } from 'react'
import { useFeed } from './useFeed'
import { useActiveFocus } from './useActiveFocus'

export function useFocusFeed(tab, viewerCtx) {
  const base = useFeed(tab, viewerCtx)
  const { focus, hasFocus } = useActiveFocus()

  const items = useMemo(() => {
    if (!hasFocus || !base.items?.length) return base.items
    const actorSet  = new Set(focus?.focus_actor_ids    || [])
    const domainSet = new Set(focus?.focus_domain_slugs || [])

    // Compute a focus score per item, preserving original index for stable sort.
    const scored = base.items.map((item, idx) => {
      let score = 0
      if (item.actor?.id && actorSet.has(item.actor.id)) score += 2
      if (item.domain && domainSet.has(item.domain))     score += 1
      return { item, score, idx }
    })

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score  // higher focus score first
      return a.idx - b.idx                                // then preserve chronological
    })

    return scored.map(s => s.item)
  }, [base.items, focus, hasFocus])

  return { ...base, items }
}
