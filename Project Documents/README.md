# Floor build — raise the floor for seeded actor profiles

After this lands, the extractor produces entries that are *alive enough to serve the seeding purpose* — accurate image, real story, exhaustive media links, business contact — instead of thin catalog stubs.

## What ships

- **`docs/NextUs_Actor_Profile_Floor.md`** — the new living architecture doc. Section 1 lists the seven floor requirements. Canonical copy also lives in project knowledge.
- **`api/org-extract.js`** — extractor rewritten with TED-tight register, new `story` field, exhaustive link extraction, required business contact, owner-only fields explicitly excluded. Returns a `floor_check` advisory object per record.
- **`src/app/pages/Add.jsx`** — `story` field plumbed through `buildPayload`. Also fixes a silent duplicate `description` key.

## How to deploy

Drop the two code files into your repo at the same paths. Commit + push. Vercel auto-deploys.

## What's not in this build

- No UI for `floor_check` warnings yet — the data is returned by the extractor, the Add page doesn't yet surface "this entry is missing X". Separate piece.
- No alignment-scoring cleanup — extractor still asks the model to score alignment. Separate piece.
- No schema migration on `story` — remains optional at the database level. Floor enforced at extractor + (eventually) Add UI.

## How to test

Pick a known practitioner or org site. Paste the URL into `/add`. Verify the returned entry includes a real story, all the visible channels as link rows, at least one business contact, an image, and a substantive tagline. Report what reads wrong — the prompt is the lever to tune.
