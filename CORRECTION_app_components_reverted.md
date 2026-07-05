# Correction — `src/app/components/` had reverted to a pre-fix state

Short answer to "is that right?": **no, not quite** — thank you for
asking rather than taking my word for it. Here's exactly what I found.

## What happened
Every single one of the 81 files with gold/legacyfont violations in
this upload live under `src/app/components/` — no exceptions, nothing
in `src/app/pages/`, `src/components/`, `src/tools/`, or `src/pages/`
was affected. That's too clean a pattern to be scattered new work — it
means the whole `src/app/components/` folder in this upload is an
**older snapshot** that predates a chunk of the fixes I'd delivered
(mostly the big 151-file sweep and the indicator/gap-signal cluster
from last round). Worth checking on your end what caused that —
whether a backup got restored, a branch got merged the wrong direction,
or something in your local workflow only picked up part of the tree.
I can't see your git history from here, so I can't tell you the cause,
only the shape of the symptom.

## What I did about it
Before touching anything, I diffed the reverted files against the
correct versions I still have from last round's delivery, file by
file, to confirm the *only* differences were colour/font/token
literals — no logic, no content, nothing else got dropped in the
process. Confirmed clean on every file (spot-checked the two biggest
diffs in full, `IndicatorTable.jsx` and `BilateralInbox.jsx` — both
purely hex/rgba/font-family swaps).

Then restored all 81 files to the correct, already-verified fixed
versions and re-ran everything:

```
── HERITAGE GOLD OUTSIDE WHITELIST — 0
── RETIRED FONT (Cormorant/Lora) — 0
```

Both back to zero. esbuild passes on all 81 restored files.

## What's in this delivery
Just the 81 files that had reverted — same fixes as before, nothing
new. If your merge process dropped these once, worth double-checking
after this merge that `src/app/components/` actually took the update
this time before we call it settled.

## Verification run
```
node scripts/audit-design.js --law=gold        # 0 hits, whole repo
node scripts/audit-design.js --law=legacyfont  # 0 hits, whole repo
npx esbuild <each of the 81 restored files> --loader:.jsx=jsx --jsx=automatic --bundle=false --format=esm --outfile=/dev/null   # all pass
```
