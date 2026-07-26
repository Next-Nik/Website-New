# Care Protocol — build note and validation record

**Status:** v1 built, hidden inside NextUs. Founder-only.
**Migration:** `sql/180_care_protocol.sql`
**Entry point:** the `◍ Care Protocol` button in the Movie Magic topbar. The
route is unlinked from all navigation.

---

## 1. Where everything lives

| Piece | Path |
|---|---|
| Engine (portable, no app dependencies) | `src/lib/care/` |
| Card renderer | `src/components/care/CareCard.jsx` |
| One-renderer-any-instrument | `src/components/care/InstrumentRunner.jsx` |
| Hidden working page | `src/pages/CareProtocol.jsx` → `/care-protocol` |
| Public card route (dark) | `src/pages/CareCardPublic.jsx` → `/care/:token` |
| Synthesis endpoint | `api/care-synthesis.js` |
| Tables and RLS | `sql/180_care_protocol.sql` |

Nothing in `src/lib/care/` imports from the NextUs app, Supabase, or React —
design tokens are touched only by the renderer. Placement stays a question of
"where does this ship next", never a rewrite.

---

## 2. Three security layers

1. **UI gate.** `isFounder(user)`, tolerant of either metadata source, mirroring
   Movie Magic and AdminConsole. Convenience only.
2. **RLS.** Every operation on `care_profiles` and `care_shares` requires
   ownership *and* `is_founder()`, which reads `app_metadata` — server-set and
   not client-editable. This is the real boundary.
3. **Endpoint.** `api/care-synthesis.js` verifies the bearer token server-side
   and rejects anyone whose `app_metadata.role` is not `founder`.

**The public route is built but dark.** `care_public_enabled()` returns
`false`, so the anon read policy currently grants nothing. The founder still
matches the owner policy, so the exact public rendering is testable end to end
while nothing is publicly readable.

To go live, one statement:

```sql
create or replace function public.care_public_enabled()
returns boolean language sql immutable as $$ select true $$;
```

**Birth data never travels.** `care_shares` stores a rendered snapshot of the
card face, not a foreign key into `care_profiles`. A public reader is
structurally unable to reach birth time or coordinates, which together are
close to identifying. This is not a filter that could be forgotten; it is a
missing edge in the schema.

---

## 3. Computation validation

This was the de-risking step. Astrology is straightforward; the design date and
gate wheel are the research-heavy piece.

### Astrology — verified to the arcminute

Obama, 1961-08-04 19:24 Honolulu (Astro-Databank AA rated):

| | Computed | Published |
|---|---|---|
| Sun | Leo 12°32'51" | Leo 12°32' |
| Moon | Gemini 3°21'09" | Gemini 3°21' |
| Ascendant | Aquarius 18°03'26" | Aquarius 18°03' |

The Midheaven was additionally checked against an independent RAMC computation
(`atan2(tan(LST), cos(ε))`) and agrees to 0.002°.

### Human design — verified three ways

**Wheel anchor.** Gate 41 begins at 2°00' Aquarius (302.0°), 64 gates in
zodiacal order at 5.625° each. Cross-checks: 0° Aries falls in gate 25 line 2,
consistent with published wheels putting gate 25 at 28°15' Pisces to 3°52'30"
Aries; and 302.0° returns gate 41 line 1 by construction.

**Reference chart.** Obama computes **6/2 Projector, Emotional authority** —
matching the published chart on type, profile *and* authority simultaneously.

**Population distribution**, 320 random births:

| Type | Computed | Published |
|---|---|---|
| Generator | 40.0% | ~37% |
| Manifesting Generator | 28.1% | ~33% |
| Projector | 16.3% | ~20% |
| Manifestor | 8.4% | ~9% |
| Reflector | 0.9% | ~1% |

Authority: Emotional 51.6% (published ~50), Sacral 30.0% (~30).

**Structural invariants**, asserted: the wheel is 64 unique gates; centre
membership covers all 64 exactly once; there are 36 unique channels.

**Design date** is solved by Newton iteration on local solar velocity rather
than assumed at 88 days — the true offset ranged 86.6 to 92.0 days across the
sample, because the Sun's speed varies between perihelion and aphelion.
Newton converges in four or five steps against roughly sixty for bisection,
which matters at ~9ms per ephemeris evaluation. A full chart is ~180ms.

### Two library footguns, both handled in `chart.js`

- `Origin` takes a **zero-indexed month**. January is 0.
- `Origin` **rejects fractional minutes** — this silently broke about 6% of
  charts during validation until seconds were passed separately.

### One packaging bug, handled in `vite.config.js`

`circular-natal-horoscope-js` declares `"module": "src/index.js"`, but its
published tarball ships only `dist/`. Node and esbuild use `main` and are fine;
Vite prefers `module` for browser builds and fails to resolve. A `resolve.alias`
pins it to the file that actually exists. Licence is Unlicense (public domain).

---

## 4. Rights roster — one change from the brief

**OEJTS is parked, not cleared.** The brief's §5 lists it as public domain. It
is not. Its own PDF and development page state:

> "The items of the Open Extended Jungian Type Scales 1.2 are licenced under a
> Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
> License."

CC BY-NC-SA carries a non-commercial clause and a ShareAlike clause that would
force any derivative to adopt the same licence. Under the project-wide rights
rule, that is a park. The MBTI-shaped output therefore has no cleared
instrument behind it; the *construct* is not parked, only the instrument, so an
original four-letter item set remains the path back in.

**IPIP-50 is confirmed clean**, explicitly including commercial use:

> "Because the IPIP has been placed in the public domain, permission has already
> been automatically granted for any person to use IPIP items, scales, and
> inventories for any purpose, commercial or non-commercial."
> — https://ipip.ori.org/newPermission.htm

**ECR-RS is freely distributed but not public domain.** Fraley's measures page
carries no licence, no free-use grant and no copyright notice on the
instruments. Lower risk than OEJTS, but the brief's "public domain" overstates
it, and the roster now says so accurately.

### Attachment is shown as dimensions, not a category

Fraley et al. (2015), *J Pers Soc Psychol* 109(2), 354–368:

> "we no longer think it is defensible to use categorical measures in adult
> attachment research or to use continuous measures to assign people to
> categories."

So the card carries two continuous dimensions read against published means
(Study 1, N = 2,399: anxiety 4.47 ± 1.62, avoidance 3.75 ± 1.19) rather than
stamping "Anxious-Preoccupied" on anyone. This is both what the instrument's
author asks for and what the product's honesty posture requires — and it still
produces the concrete partner-facing guidance the card exists to carry.

---

## 5. Bundle

The engine is loaded by dynamic `import()`, so the ephemeris and its
moment-timezone dependency land in a separate ~812 kB chunk reachable only
through that one edge. Verified in a production build: the main bundle is
unchanged in size, and the public card route renders from the stored snapshot
without pulling any of it.

---

## 6. What is deliberately not built

- **Cycle-aware "Right now"** — postponed per the brief. The section exists and
  is dated and editable, which is the surface it will attach to.
- **Partner notifications**, printable/merch output, standalone packaging.
- **The licensing audit** to un-park tier-2 instruments.
- **A four-letter type instrument** to replace the parked OEJTS.

---

## 7. Open decisions still open

Product name · care-symbol tone calibration (currently five symbols chosen per
person from a library of twelve) · whether "Right now" is visible by default on
a shared card (currently a per-share `show_right_now` flag, defaulting on) ·
whether the licensing audit happens before or after v1 ships.
