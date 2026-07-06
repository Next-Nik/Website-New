# Design-law cleanup — opacity floor + italic verdict pass

Closes out the two remaining non-backlog design laws from the retheme
audit: the 0.55 ink-opacity floor and the italic "user-voice only" rule.

## Result
```
FONT SIZE BELOW 13px               1273   (unchanged — accepted backlog, Master Spec §2.5)
INK TEXT BELOW 0.55 OPACITY           0   (was 2)
ITALIC (human verdict)                0   (was 226)
style= ON <svg>                       0
100vh                                  0
HERITAGE GOLD OUTSIDE WHITELIST        0
RETIRED FONT                           0
```
Every design law that's supposed to be zero is now zero. The only
remaining count is font-size-below-13px, which the Master Spec
explicitly carries as accepted backlog, not a violation to fix.

esbuild: all 453 `.jsx`/`.js` files under `src/` compile clean.
Zero logic changes anywhere in this pass.

## Opacity (2 fixes)
Both were plain oversights sitting a bit under the 0.55 floor —
`InviteAuthor.jsx` (an actor-type label at 0.45) and `InvitePage.jsx`
("No image" placeholder at 0.4). Bumped both to 0.55.

## Italic (226 → 0)
Per `audit-design.js`: italic is legal only for user-authored words,
and every hit needs a human verdict. Went through all 226 by hand,
file by file. Two outcomes:

**Removed italic** (~150 instances) where it was sitting on system
copy — empty states ("No links yet", "No check-ins yet"), loading
text, helper/hint text, status messages, computed labels from lookup
tables (tier names, domain labels), decorative headline flourishes,
and — this was the one genuine judgment call — **testimonial quotes
and press mentions**. I read those as "someone else's words about the
platform," not the logged-in user's own voice, so I de-italicized them
consistently everywhere they appeared (`WorkAndPodcast.jsx`,
`OrgPublic.jsx`'s testimonial block, `TestimonialsTab.jsx`,
`TestimonialsPanel.jsx`, `LinksTab.jsx`'s press mentions). Worth a
second look from you if you want the traditional blockquote-italic
convention back for those specifically — easy to revert since they're
now plain, undecorated text.

**Kept italic + added to the whitelist** (~75 instances) where it
correctly wraps the user's own words — I Am statements, Horizon Self
statements, target-sprint goals, life mission/horizon-goal text, an
actor's own self-authored tagline or "why" statement, chat messages,
and the text-input fields where the user is actively typing that
content. Every whitelist entry has an inline comment saying exactly
which variable/content it's covering, so a future audit run (or you)
can spot-check the reasoning without re-deriving it.

## A bug I found and fixed along the way
`FocusProfile.jsx` had 13 instances of `color: 'at.ghost'` /
`color: 'at.meta'` — the **string** `"at.ghost"`, not the token
reference. That's mine, from the batch-4 conversion pass a few turns
back: a naive `.replace("rgba(15,21,35,0.55)", "at.ghost")` on a value
that was already inside quotes, which left the quotes wrapping the new
text instead of turning it into a bare identifier. Every one of those
colours has been rendering as invalid CSS (falls back to inherited/
default) since that batch shipped. Fixed all 13. I also swept the
whole repo for the same pattern (`'fn.moss'`, `'at.brass'`, etc., all
quoted) — this was the only file affected.

## Verification run
```
node scripts/audit-design.js --summary     # only the accepted font-size backlog remains
node ./check_all.js                        # esbuild across all 453 src files — 0 failures
node --check scripts/audit-design.js       # whitelist mechanism still fires correctly (spot-checked
                                            # with a scratch gold hex and a scratch italic — both caught)
```
