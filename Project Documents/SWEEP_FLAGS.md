# SWEEP FLAGS · Companion-Voice Register Alignment

Executed directly (not delegated). All notes below per the corrected spec's
rules: skip and flag anything not an unambiguous, exact, single match.

---

## Section 4 table — execution notes

**Row 1 — BeaconStrip.jsx — APPLIED, with a note.**
The OLD string in the spec (`'you've shown up today'`, lowercase, no second
sentence) was not present verbatim. The line had already drifted to
`'You've shown up today. Well done!'` (capitalised, with "Well done!"
already appended) — likely from earlier work. This is unambiguously the same
message at the same location (the sole "shown up today" band message in the
file), so I applied Nik's confirmed wording — `'You showed up! Well done!'`
— to that line rather than skipping on a technicality.

**Row 2 — BeaconStrip.jsx — UNMATCHED, skipped.**
OLD string `All checked in. The beacon's brighter for it.` does not exist
anywhere in this file, and a repo-wide search for "brighter" returns zero
hits. This copy appears to have already been removed or never shipped in
this form. No edit made. Needs a decision from Nik on whether this message
still needs writing somewhere, or the row can be dropped from the spec.

**Row 3 — AdminConsole.jsx — APPLIED.**
Exact match, single occurrence, line 1727. `toast('Nothing selected')` →
`toast('Select at least one first')`.

**Row 4 — SeedTab.jsx — APPLIED.**
Exact match, single occurrence, line 202. `toast('Nothing selected')` →
`toast('Select at least one first')`. (Other "Nothing" hits in this file at
lines 6, 135, 246 are unrelated descriptive/comment text, pre-existing,
untouched — confirmed against the original zip.)

---

## Section 5 — Discovery pass results

### Pattern 1 — `nothing (here|yet|scheduled|to show|selected|found)`

| File:Line | Text | Status |
|---|---|---|
| MissionWheel.jsx:732 | comment, "nothing here to leak" | excluded (comment) |
| MyPracticeMissionPanel.jsx:385 | "...will surface here. Nothing yet." | **Candidate** |
| CurriculumGatePanel.jsx:8 | comment, "nothing here is locked" | excluded (comment) |
| MyOrgMissionPanel.jsx:916 | comment, "Nothing to show once the floor is met" | excluded (comment) |
| GetToDoMissionPanel.jsx:384 | "Nothing here yet. Checked items gather here..." | DNT (file excluded from this sweep) |
| GetToDoMissionPanel.jsx:835 | "Nothing scheduled for today." | DNT (file excluded from this sweep) |
| PodcastPlayer.jsx:291 | comment, "nothing to show — render nothing" | excluded (comment) |
| PracticeRunner.jsx:20 | comment, "Nothing here is gated" | excluded (comment); also under daily/, Horizon Suite DNT |
| AddOverlay.jsx:47 | comment | excluded (comment) |
| Training.jsx:478 | "Nothing scheduled today in {LABEL[domain]}." | DNT (file excluded from this sweep) |

### Pattern 2 — `No (entries|items|results|challenges|posts)`

| File:Line | Text | Status |
|---|---|---|
| src/components/domain-explorer/DomainPanel.jsx:149 | "No results" | **Candidate** |
| src/components/FocusSearch.jsx:150 | "No results for \"{query}\"" | **Candidate** |
| src/app/components/FocusSearch.jsx:150 | "No results for \"{query}\"" | **Candidate** (note: two FocusSearch.jsx files exist, `src/components/` and `src/app/components/` — worth confirming which is live/dead code) |
| ConstellationLedger.jsx:120 | "No challenges have gathered sparks yet." | **Candidate** |
| Search.jsx:399 | "No results. Try a different search or remove a filter." | **Candidate** |
| ChallengeBrowse.jsx:151 | "No challenges here yet." | DNT (challenge copy, excluded per spec) |
| src/tools/horizon-practice/HorizonPractice.jsx:1938 | "No entries." | DNT (Horizon Practice, excluded per spec) |

### Pattern 3 — praise phrases

| File:Line | Text | Status |
|---|---|---|
| TargetSprintMissionPanel.jsx:585 | "KEEP GOING" (button label) | **Candidate** |
| BeaconStrip.jsx:257 | "You showed up! Well done!" | DONE (Row 1) |
| BeaconStrip.jsx:332 | "All done for today. Well done!" | **Candidate** — not in the table but already reads as companion-voice compliant; flagging for confirmation it's intentional and doesn't need touching |
| VoiceRecorder.jsx:34 | comment, "/* keep going */" | excluded (comment) |
| IAmSpoken.jsx:281 | "...Landed. Carry it with you...`${reps} so far. Keep going, or move on.`" | DNT (explicitly named on do-not-touch list) |
| HorizonPractice.jsx:2500 | "Twenty-one consecutive days...Keep going." | DNT (Horizon Practice, excluded per spec) |

### Pattern 4 — `so far.` / `Landed.` / `shown up`

| File:Line | Text | Status |
|---|---|---|
| WatchButton.jsx:109, 122 | "{count} so far. The cap protects the feed..." | **Candidate** — reads as system/aggregate copy, not companion voice, but matched pattern so flagging |
| BeaconStrip.jsx:257 | (duplicate match, already DONE) | DONE |
| GetToDoMissionPanel.jsx:30 | comment, "quiet 'days shown up'" | excluded (comment); also DNT file |
| IAmSpoken.jsx:281 | (duplicate match, already listed above) | DNT |
| ArrivalReflection.jsx:58 | comment | excluded (comment) |
| Watch.jsx:191 | "{actorCount} organisation(s)...have been placed on the map so far." | **Candidate** — aggregate/platform stat, not user's own effort; likely gold, flagging only because it matched the grep |

---

## Summary

- **Applied:** Rows 1, 3, 4 (3 of 4 table rows)
- **Unmatched, skipped:** Row 2 — needs a decision, see note above
- **Candidates surfaced (not touched, no scope to act on them):** 8 distinct
  locations across MyPracticeMissionPanel, DomainPanel, FocusSearch (x2),
  ConstellationLedger, Search, TargetSprintMissionPanel, BeaconStrip:332,
  WatchButton (x2), Watch.jsx — none in the do-not-touch list, none already
  handled. If register alignment continues, these are the next candidates
  to review and spec.
- **Zero new design-audit violations** (1500 baseline, 1500 after — confirmed
  via diff against the unmodified upload).
- **esbuild transform passes clean** on all three changed files.
