# Daily Practices Fixes · Manifest

Three fixes, three files. Drag-and-drop the `src/` contents into the repo.

## Changed files
- `src/lib/designTokens.js` — restores the legacy `gold*` token names as
  Field Notes moss/ink aliases (goldChrome → fn.moss, gold/goldDk → fn.ink,
  goldRule → fn.mossEdge, goldFaint/goldTint/goldStrong/goldGlow → moss alphas).
  Root cause of the invisible buttons: the retheme removed these keys while
  ~173 references across 27 files (whole daily suite, Journal, Training,
  IAmSpoken, challenge surfaces) still used them — every solid button was
  rendering white text on `background: undefined`. This one file repairs all
  of them. No heritage-gold values; audit-clean (zero new violations,
  baseline 1271 unchanged).
- `src/app/constants/sentenceCompletion.js` — the programme is now eighteen
  weeks. Every theme (Foundation, seven domains, Integration) runs as two
  short weeks (three stems, then two), each carrying the plain theme title — no numerals. All stems verbatim; nothing rewritten, only re-chunked.
  nine-week set; nothing rewritten, only re-chunked. Rule 4 copy adjusted
  ("A few minutes, not a project.").
- `src/app/pages/SentenceCompletion.jsx` — draft persistence. Endings and
  the reflection now write to localStorage (debounced 500ms, keyed per
  user + mode + week), hydrate on mount/block change, flush immediately on
  `pagehide`/`visibilitychange` (the iPad backgrounding case that ate the
  work), and clear once saved to Supabase. Header + end-of-arc copy updated
  for the longer run.

## Judgment calls
- Existing journal entries keep their old week numbers — they're reads, not
  gating. Your progress pointer (week 1, Foundation) maps to the same place
  under the new numbering, so no migration is needed. Any hypothetical user
  deeper in the old arc would land earlier in the content; acceptable at
  current user count.
- Map mode enters a domain at its first half; Free mode reaches both halves.
- Draft persistence is scoped to Sentence Completion (where the loss
  happened). Win the Day commits to Supabase on save and holds only
  single-line inputs in state; left as is.
- `resetInputs`-on-navigation is replaced by the hydration effect: changing
  week/mode now restores that block's draft instead of wiping the fields.

## Checks run
- esbuild JSX transform + `node --check` on all three files: pass
- `scripts/audit-design.js`: 1271 pre-existing violations, zero new, none
  in changed files
