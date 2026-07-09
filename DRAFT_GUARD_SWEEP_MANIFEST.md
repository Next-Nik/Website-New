# Draft Guard Sweep · Manifest

Follow-up to the daily fixes: verification of that delivery in the live
repo, plus a sweep for the same two failure classes elsewhere.

## Verification (no action needed)
- All three prior fixes are live: gold aliases in `designTokens.js`,
  18-week `sentenceCompletion.js`, draft persistence in
  `SentenceCompletion.jsx`.
- Token sweep: every `import {...} from designTokens` resolves; no other
  undefined token-property access anywhere in `src/` (three grep hits were
  false positives — `shadow.at.rest`, a `|| fallback`, a filename in a
  comment). The mission-control local `tokens.js` files already bridge
  GOLD_* → moss the same way, so the alias fix matches existing convention.
- `audit-design.js`: 1271 pre-existing, zero new.

## Changed files (new work)
- `src/app/hooks/useDraftGuard.js` — NEW. Shared hook: mirrors a text
  field into localStorage (hydrate-into-empty on mount, 500ms debounced
  persist, immediate flush on pagehide/visibilitychange, `clearDraft()`
  after save). Same behaviour as the inline version in SentenceCompletion.
- `src/app/pages/MorningPages.jsx` — guarded (`mp-draft:{userId}`).
  Free-writing pages were the highest-stakes loss surface.
- `src/app/pages/IAmPractice.jsx` — guarded, one draft per domain
  (`iam-draft:{userId}:{domain}`). Domain navigation already clears the
  field in the same render as the index change, so drafts never mis-file.
- `src/app/pages/Journal.jsx` — write tab guarded
  (`journal-draft:{userId}`). Draft survives domain-chip changes.

## Judgment calls
- Scope: guarded the four long-form daily writing surfaces (these three +
  SentenceCompletion, already shipped). Short transactional forms (Add,
  Nominate, ComposeMessage, AttestationForm, etc.) share the pattern at
  much lower stakes — the hook exists now if any of them ever bites.
- DailySessionPanel (Mission Control Horizon State check-in) commits at
  each step transition and restores today's row from Supabase on mount —
  already resilient enough; left as is.
- SentenceCompletion keeps its inline guard (it persists a keyed object
  of endings + reflection, not one string). Behaviour is identical; noted
  in the hook's header for future maintainers.

## Checks run
- esbuild JSX transform on all four files: pass
- `scripts/audit-design.js`: 1271 pre-existing, zero new, none in changed
  files
