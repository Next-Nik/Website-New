// ─────────────────────────────────────────────────────────────
// logActivity.js — append a line to the platform's public pulse
//
// Fire-and-forget. Never blocks, never throws, never surfaces an
// error to the user — the pulse is ambience, not infrastructure.
//
// PRIVACY LAW: nextus_platform_activity has no user_id column.
// Never pass the acting user's name or id in subject_* fields for
// private actions. Tune-ins are logged with the SUBJECT tuned
// into ("someone tuned in to Nature"), never the person tuning in.
// Public entities (a live actor, a contributed practice) may be
// named because they are already public.
// ─────────────────────────────────────────────────────────────

import { supabase } from '../../../hooks/useSupabase'

/**
 * logActivity({ eventType, subjectType, subjectId, subjectName,
 *               subjectSlug, domain, detail })
 */
export function logActivity({
  eventType,
  subjectType = null,
  subjectId = null,
  subjectName = null,
  subjectSlug = null,
  domain = null,
  detail = null,
}) {
  try {
    supabase
      .from('nextus_platform_activity')
      .insert({
        event_type:   eventType,
        subject_type: subjectType,
        subject_id:   subjectId,
        subject_name: subjectName,
        subject_slug: subjectSlug,
        domain,
        detail,
      })
      .then(() => {}, () => {})
  } catch {
    /* ambience never errors */
  }
}
