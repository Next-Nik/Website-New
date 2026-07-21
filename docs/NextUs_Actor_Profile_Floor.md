# NextUs Actor Profile Floor
## The Living Architecture for What a Seeded Actor Profile Must Be
### v1.0 — May 2026

---

## Section 0 — Why a floor exists

The Atlas seeds entries that the actor has not yet claimed. They sit in trust until the real owner arrives, recognises themselves, and adds depth.

The risk in this model is that a seeded entry can become a thin catalog stub — a name, a 2-3 sentence summary, a domain pill, a "claim this profile" button. That kind of entry serves nobody. It is invisible in search, useless to read, and offers no path to the actor's actual work. It looks abandoned even though it is freshly seeded.

The floor exists to prevent that failure. A seeded entry must be **alive enough to serve the seeding purpose** — substantive enough that a viewer who lands on it can:

- See clearly who this actor is, what they do, and at what scale
- Find them on at least one channel they actually publish on
- Reach them through a business contact path the actor has made available
- Recognise the entry as deliberately placed, not as a database error

The floor is not aspirational. It is the **minimum** for an entry to ship as `status: 'live'`. Entries that cannot meet the floor either need more source material to extract from, or they should not be seeded yet.

---

## Section 1 — The seven things a seeded entry must have

Every seeded entry, at the moment it goes live, must include:

### 1.1 Accurate identity

- **Name** — exactly as the actor renders themselves on the source
- **Type** — `practitioner`, `organisation`, `project`, `programme`, `place`, `group`, or `resource`
- **Primary domain** — one of the seven civilisational domains, chosen by the actor's actual work, not by how they describe themselves

The type determines the visual treatment (portrait vs logo), the section ordering, and the field set the floor expects.

### 1.2 Accurate image

- **For practitioners** — a portrait. Face visible. Single image. Rendered with `objectFit: cover` and top alignment.
- **For organisations, projects, programmes, groups, resources** — a logo. Rendered with `objectFit: contain` and 14px internal padding so the logo breathes inside the frame.
- **For places** — a representative image of the space. Treated as portrait (`cover`).

The image is faithful to the source. The extractor does not generate or substitute images. If no usable image exists on the source, the entry holds at the floor below until an image is added — it does not ship without one.

### 1.3 Description

A 2-3 sentence summary in third person. Evidence-grounded. TED-tight register: no marketing breath, no origin story, no emotional setup. Reports what the actor does and at what scale.

This is what renders inside the identity strip when no full story is present.

### 1.4 Story

2-4 short paragraphs. Third-person. Drawn from explicit claims on the source.

The story is the actor's narrative — what they do, who they work with, how the work proceeds, what scale the work operates at. The extractor translates first-person claims on the source into third-person prose, never inventing.

What the story is not: a credentials list, an origin story, a manifesto, or a sales pitch. The floor's copy register applies: past tense for proof, present tense for stakes, no sentence circles, every sentence earns its place.

If the source does not contain enough material to write 2-4 paragraphs honestly, the description (1.3) is sufficient and the story field stays empty until the owner adds it.

### 1.5 Tagline

One substantive line that names who the actor helps (or what they do) and how. Not a 6-word generic. Not the slogan from their landing page if the slogan is empty.

A practitioner tagline names a population and a kind of work: *"Coach for visionaries expanding what they bring into the world."*

An organisation tagline names what the org does and at what scale: *"A Future Building platform."* / *"Bioregional regeneration network across the Pacific Northwest."*

If the source's own tagline is generic or marketing-toned, the extractor produces a tighter one from what the source actually shows.

### 1.6 Media links

Every channel the source publishes through. The extractor surfaces all of:

- Website (always, if any)
- Podcast — Spotify, Apple, RSS — whichever the source links to
- YouTube channel
- Substack / newsletter
- LinkedIn
- Instagram
- Twitter / X
- TikTok
- Medium
- GitHub (for resources, tooling, or technical actors)
- Books (linked, if the actor has published)

The link extractor catches *every* discoverable channel. An actor with seven channels visible on their site should have seven channels on their seeded profile.

### 1.7 Business contact

A path to reach the actor for engagement. At least one of:

- **Email** — surfaced from `mailto:` links or visibly listed contact addresses
- **Contact form URL** — if the source has a contact page
- **Booking link** — Calendly, SavvyCal, or similar
- **Phone** — if visibly published as a business contact

The floor requires at least one contact mechanism. An entry with no path to reach the actor is wallpaper.

Personal email addresses found on a personal blog are not business contacts. The extractor uses judgment: a contact page email is fair; an email buried in a footer of a personal essay is not.

---

## Section 2 — What the floor deliberately excludes

The following fields are **owner-only**. The extractor does not infer them, even from rich source material. They land on the entry only when the owner claims and adds them:

- **Mission statement** — claims about what the actor is working toward at horizon scale. These are commitments, not descriptions. The extractor cannot honestly attribute a commitment to someone who hasn't stated it explicitly.
- **Working on now** — current focus of the practice. Time-bound, owner-asserted, often non-public.
- **Offerings** — formal products, programmes, sessions. The extractor surfaces *visible* offers (a "book a session" link, a programme name on a sales page) as media links if present, but does not insert structured offering rows.
- **Credentials** — training, certifications, lineage. Factual claims that require verification.
- **Testimonials** — first-person quotes from other people. The extractor never invents these and does not pull review-site quotes (which may be unauthorised, out of context, or fake).
- **Accepting status, medium, actor_mode, membership_status** — owner-asserted operational signals.

This boundary is not about extractor capability. It is about provenance integrity. A seeded entry must be clearly distinguishable from a claimed entry — and the way it stays clearly distinguishable is by leaving the depth fields empty until the owner fills them.

---

## Section 3 — The copy register

All extractor-generated copy obeys the TED-tight standard:

- Third person where the actor is not the speaker
- Past tense for proof, present tense for stakes
- No origin story, no emotional setup, no marketing breath
- Heavy edit standard — if a sentence circles, cut it; if a phrase qualifies, cut it; if a paragraph sets up another paragraph, fold them
- Every sentence earns its place

When the source uses first-person ("I have been coaching for 15 years"), the extractor translates faithfully ("X has been coaching for 15 years") and continues in third person from there.

When the source uses marketing copy ("Unlock your potential with our transformational five-pillar method!"), the extractor does not propagate the marketing tone. It translates to what is actually being claimed ("X's method centres on five focuses: A, B, C, D, E.") or, if the claim cannot be made cleanly in TED register, omits the sentence entirely.

The extractor does not invent specifics the source does not provide. If the source says "decades of practice" but does not specify how many, the seeded story says "decades of practice," not "30 years."

---

## Section 4 — Visual treatment for the floor

Every seeded entry inherits the standard NextUs profile visual treatment:

- **Image frame**: 160px on desktop, 128px on mobile, double gold border (`1.5px solid rgba(200,146,42,0.70)` inner + `1px solid rgba(200,146,42,0.35)` outer outline offset 5px)
- **Background fill**: warm gold tint for portraits, `BG_CARD` (`#FDFCF8`) for logos
- **Identity strip**: H1 in Cormorant Garamond clamp(36px,6vw,56px) weight 300, tagline in Lora 20px weight 500, location and meta in Cormorant SC 13px weight 600 solid `#A8721A`
- **Story body**: Lora 18px weight 500 solid `#0F1523`
- **Section eyebrows**: Cormorant SC 13px weight 600 solid `#A8721A`
- **Mission statement (if present)**: Cormorant Garamond 22px weight 300

The seeded entry must not visually distinguish itself from a fully-populated owner-claimed entry. The reader cannot tell at a glance which entries are stubs and which are deep. The provenance line at the foot of the page tells them, quietly, when they look.

---

## Section 5 — Provenance + trust on the floor

A floor-meeting seeded entry renders, at the foot:

> **SEEDED BY NEXTUS** · Held in trust by NextUs until the owner claims and adds depth.

If the entry came through a community nomination that was approved, it renders:

> **SEEDED BY NEXTUS** · Nominated by the community · Held in trust by NextUs until the owner claims and adds depth.

The nominator's name is never publicly displayed.

The "claim this profile" banner appears on every unclaimed entry, anchored near the identity strip, with the question *"Is this you?"*

---

## Section 6 — What fails the floor

An entry **does not ship** as `status: 'live'` if:

- The image is missing or generic (placeholder, stock photo, AI-generated)
- The description is fewer than two sentences or is marketing-toned
- There are zero media links beyond the website
- There is no business contact
- The story is invented from material not present in the source
- Domain placement is unclear or arbitrary

Entries that fail the floor are held as `status: 'draft'` until the missing pieces are present. The Add page surfaces what's missing. Draft entries are invisible to the public Atlas but visible to admins for completion.

---

## Section 7 — The floor and the extractor

The extractor is responsible for producing entries that meet the floor. Its system prompt is written in the floor's register. Its output schema includes only the fields the floor allows it to populate (the seven things in Section 1, plus links and press).

The extractor does not return `mission_statement`, `working_on_now`, `offerings`, `credentials`, `testimonials`, or any owner-only field. These are not "optional" — they are absent from the schema. The model cannot invent them.

When the extractor cannot honestly meet the floor for a given source — insufficient material, no usable image, no contact path — it returns a structured incomplete-entry response that the Add page surfaces to the operator for manual completion or rejection.

---

## Section 8 — Evolution

This doc evolves as the platform's understanding of what serves seeding deepens. Changes to the floor are made deliberately, with attention to:

- **Backward compatibility** — entries already seeded under v1 do not retroactively fail v2
- **Owner experience** — raising the floor must not break the path for owners to claim and edit
- **Extractor capability** — the floor advances as the extractor's reliable output advances, not ahead of it

Sections may be added; existing sections may be deepened. The seven floor requirements in Section 1 are stable.
