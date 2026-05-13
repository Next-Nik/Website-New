// src/beta/components/feed/FeedItem.jsx
// Discriminated-union dispatcher. Routes a normalised feed item to the
// correct rendering component based on item.type.

import { SprintLaunchedItem }     from './items/SprintLaunchedItem'
import { SprintCompletedItem }    from './items/SprintCompletedItem'
import { IAStatementItem }        from './items/IAStatementItem'
import { NeedPostedItem }         from './items/NeedPostedItem'
import { BilateralPublishedItem } from './items/BilateralPublishedItem'
import { PracticeContributedItem }from './items/PracticeContributedItem'
import { PracticeAttestedItem }   from './items/PracticeAttestedItem'

export function FeedItem({ item }) {
  if (!item || !item.type) return null

  switch (item.type) {
    case 'sprint_launched':       return <SprintLaunchedItem     item={item} />
    case 'sprint_completed':      return <SprintCompletedItem    item={item} />
    case 'ia_statement':          return <IAStatementItem        item={item} />
    case 'need_posted':           return <NeedPostedItem         item={item} />
    case 'bilateral_published':   return <BilateralPublishedItem item={item} />
    case 'practice_contributed':  return <PracticeContributedItem item={item} />
    case 'practice_attested':     return <PracticeAttestedItem   item={item} />
    default:                       return null
  }
}
