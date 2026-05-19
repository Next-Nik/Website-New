# NextUs: Imagine a World — Architecture & Build Spec

**Status:** Architecture, ready to refine
**Type:** New feature, not yet built
**Relates to:** Mission Control, the Horizon Suite (Target Stretch / Horizon Practice), the matching layer
**Audience:** General public, students, teachers, anyone who lands on the platform without a structured entry point

---

## 0. The thing

A single open prompt at the centre of a screen:

> **Imagine a world where...**

The user fills it in. Whatever they want. Whatever rises.

The platform responds.

---

## 1. What this is, exactly

Imagine a World is a **free-form world-building surface** — the lightest possible entry point into the platform's seven-domain civilisational frame. It is not the front door (Orienteering is); it sits *alongside* Orienteering as an alternative on-ramp.

Where Orienteering is structured ("which of these resonates?"), Imagine a World is unstructured ("what comes up for you?"). Where The Map asks the user to navigate the seven domains methodically, Imagine a World lets the user start with the world they want and surfaces the relevant domain entry afterward.

### 1.1 The deep purpose

People often know what they want for the world before they know what to do about it. The current platform asks: "Where are you on the wheel? Which domain calls you?" That is the right question for someone already in the work. For someone arriving cold — especially the general public, students, teachers — the question lands too abstractly.

Imagine a World flips the order. It starts with the user's vision (free-form, in their own words) and translates that vision into a Horizon goal they can act on, with a NextUs domain attached and (later) the option to find others imagining adjacent worlds.

### 1.2 The fractal posture

The feature embodies the **fractal-works-both-ways** principle. A user's imagined world is a personal-scale vision *and* a civilisational-scale signal. The platform receives it as both. The user gets a personal Horizon; the platform receives a data point about what people are actually longing for. (The latter is private aggregate; never traced back to the user.)

---

## 2. User flows

### 2.1 The minimal happy path

1. User lands on `/imagine` (or arrives via a Mission Control tile)
2. Sees the prompt: **Imagine a world where...**
3. Types or speaks their response
4. Submits
5. **AI reframes if needed** (§3) into a positive, generative form
6. Platform shows: *"That's the world you're imagining. Here's what that looks like as a Horizon goal."*
7. Returns a Horizon goal in the canonical Horizon Suite format, with a NextUs domain attached
8. Offers: *Save to my Horizons · Start a Target Stretch toward this · Find others imagining nearby*

### 2.2 The reframe path (negative input)

If the user types *"a world where Trump isn't president"* or *"a world without climate change"* or any other negation, the platform doesn't reject — it offers a reframe.

1. Detects the negative formation
2. Responds in the Wonka register: *"That's a real thing to be uncertain about. If you'd like, I can help turn this into a world you're imagining, rather than one you're refusing. What's the world on the other side of this?"*
3. Offers two affordances: **Help me reframe** (AI-assisted) and **Keep it as is** (respect the user's choice)
4. If reframe: AI proposes 2–3 positive formulations; user picks or edits
5. Continues to step 7 of the happy path

### 2.3 The empty-prompt path

If the user submits an empty or near-empty prompt:

1. Platform offers prompts: *"Stuck? Try one of these to start..."*
2. Three seeded prompts rotate (per session, not personalized):
   - *Imagine a world where every child has access to mentorship.*
   - *Imagine a world where rivers are governed as living entities.*
   - *Imagine a world where elders are integral to community decisions.*
3. User picks one or modifies, then submits

### 2.4 The optional matching path

After completion, the user can choose: *"Show me others imagining something similar."*

1. Their imagined world is matched against other users' (consent-gated; users must opt in to be discoverable through Imagine matching)
2. If matches exist: a quiet list of "5 others have imagined a nearby world" with one-tap to view their public imagining (only if they made it public)
3. **No follow, no chat, no DM.** The match surface is a window, not a relationship-formation tool. (That's what NextMarket and NextMen and the broader connection layer is for.)

### 2.5 The non-saving path

User can imagine a world, see the reframe, and walk away without saving anything. Nothing is stored beyond the AI prompt/response (which is logged at the platform level for safety and quality but never tied to the user account unless they save).

---

## 3. The reframe layer — where voice matters most

### 3.1 Why reframe exists

The platform commits to the **generative orientation** — Roddenberry frame, Wonka register, civilisational outside voice. Negative framings (*"a world without X"*) are valid emotional starting points but not generative — they don't tell you what you're moving toward.

The reframe layer respects the user's input *and* invites the more generative form. The voice has to be: warm, never lecturing; specific, never abstract; helpful, never corrective.

### 3.2 The reframe detector — what counts as "negative"

A negative formation, for reframe purposes, includes:

- *without X* / *no X* / *not X* / *X-less*
- *against X* / *X-free* / *opposed to X*
- *no more X* / *eliminating X*
- *fighting X* / *ending X* / *destroying X*

The detector is intentionally generous — when in doubt, it offers the reframe. The user can decline. Over-detecting is friendlier than under-detecting; missing a reframe opportunity is the larger failure mode.

### 3.3 The reframe model

A small Claude call with a tightly-scoped prompt. Inputs: the user's original imagining. Outputs: 2–3 positive reframes that preserve the user's intent while pointing toward what they're imagining toward.

Example prompt scaffolding (for the API call, not user-visible):

> *The user wrote: "{original}"*
>
> *Without judging the original, generate 2-3 alternative phrasings that:*
> *- Preserve the user's core concern*
> *- Express what they're moving **toward** rather than away from*
> *- Are concrete enough to be a Horizon goal someone could move into*
> *- Are written in the user's voice, not yours — short, specific, in plain language*

Returns JSON with 2–3 candidates plus a one-line **dialogue line** the platform shows the user — short, Wonka-register, warm.

### 3.4 Voice examples (for calibration)

**User input:** *"a world where Trump isn't president"*

**Platform response (text):**

> *That points at something real. If you'd like, I can help turn this into a world you're imagining toward, rather than one you're refusing. The way the world works changes when we know what we're walking into.*

**Reframe candidates:**

1. *Imagine a world where leaders are held to truth by an informed and engaged public.*
2. *Imagine a world where civic institutions are stronger than any single personality.*
3. *Imagine a world where political power flows from the well-being of communities, not the cult of figures.*

**User picks #1.** Platform continues with the picked frame.

---

**User input:** *"a world without war"*

**Platform response (text):**

> *That's old longing — and ancient work. Let me offer some shapes that might fit.*

**Reframe candidates:**

1. *Imagine a world where disputes are settled by structures designed for repair.*
2. *Imagine a world where the cost of violence is borne by those who wield it.*
3. *Imagine a world where every nation has the means to choose otherwise.*

---

**User input:** *"a world where elders are integral to community decisions"*

**No reframe needed.** Platform continues directly:

> *That's a world worth building. Here's what that looks like as a Horizon goal you can work toward...*

### 3.5 The voice discipline

The reframe layer is the riskiest voice surface on the platform. Every word matters. Calibration is iterative — the team reviews live reframes weekly during early rollout and tunes the prompt.

Failure modes to watch:

- **Patronising** — *"I think what you really mean is..."* (Bad. The user means what they say. The platform offers, doesn't correct.)
- **Apolitical-by-default** — neutering politically-charged inputs into corporate-friendly mush (also bad; the user's input matters and the reframe should be faithful)
- **Lecturing** — adding context the user didn't ask for, explaining why the original was negative
- **Saccharine** — over-warm, performatively gentle (the platform should be warm but not sentimental)

The right register is **specific, warm, brief, generative.**

---

## 4. The translation to Horizon goal

### 4.1 What the user gets

After the (possibly-reframed) imagining is locked in, the platform renders:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   Your imagined world:                                      │
│   "A world where every child has access to mentorship."     │
│                                                             │
│   ─────────────────────────────────────────                 │
│                                                             │
│   As a Horizon goal:                                        │
│                                                             │
│   "Every young person on the planet has a meaningful        │
│    relationship with at least one trusted adult outside     │
│    their family."                                           │
│                                                             │
│   DOMAIN: Society                                           │
│   SCALE:  Civilisational                                    │
│                                                             │
│   ─────────────────────────────────────────                 │
│                                                             │
│   [ Save to my Horizons ]                                   │
│   [ Start a Target Stretch toward this ]                    │
│   [ Find others imagining a similar world ]                 │
│   [ Imagine another ]                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 The translation model

A second AI call (same Claude Sonnet model, different prompt):

> *The user has imagined: "{imagining}"*
>
> *Translate this into a Horizon goal in the canonical Horizon Suite format. A Horizon goal:*
> *- Is a clear future state, not a process*
> *- Is plural and structural (about a class of conditions or beings), not personal*
> *- Names what's true on the other side*
> *- Maps cleanly to one of the seven NextUs domains: Human Being, Society, Nature, Technology, Economy, Legacy, Vision*
>
> *Return JSON with:*
> *- horizon (the goal text)*
> *- domain (one of the seven slugs)*
> *- domain_reasoning (one sentence explaining the domain fit)*
> *- scale (always 'civilisational' for Imagine a World outputs)*

### 4.3 Domain selection

Critical to get right. A Horizon should always go to exactly one primary domain. The model is constrained to pick one. Multi-domain placements happen at a different layer (cross-domain actors); a single Horizon belongs at the level of one civilisational facet.

When ambiguous, the model defaults to the domain where the goal's **action** lives, not where its consequence lives. Mentorship for kids is Society (community structure) more than Human Being (the kids themselves). Watershed governance is Nature (the watershed) more than Society (the governance structure).

These calibration calls are subjective. The model returns one answer with reasoning; the user can change it by tapping the DOMAIN field and picking from a dropdown of the seven options. The platform records the override (anonymised, aggregated) for future tuning.

---

## 5. What's stored

### 5.1 If the user saves

```sql
create table public.nextus_imaginings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  original_text   text not null,             -- what the user typed
  reframed_text   text,                       -- the reframe they chose, if any
  final_text      text not null,              -- the version locked in (original or reframed)
  horizon_text    text not null,              -- the translated Horizon goal
  domain          text not null check (domain in (
    'human-being','society','nature','technology',
    'finance-economy','legacy','vision'
  )),
  domain_override boolean default false,      -- did the user change the domain?
  scale           text not null default 'civilisational',
  visibility      text not null default 'private'
                   check (visibility in ('public','matches','private')),
  saved_at        timestamptz not null default now()
);
```

### 5.2 If the user doesn't save

Nothing is stored against the user. The AI call logs (platform-level, ungrouped) exist for safety and quality monitoring, with no user_id attached after the session ends.

### 5.3 Connection to existing Horizon Suite

A saved imagining can be *promoted* to a full Horizon in `horizon_profile` via the "Start a Target Stretch toward this" CTA. The promotion copies `horizon_text` into the user's `horizon_profile[domain].horizon` field and creates a Target Stretch shell for them to develop.

This is the bridge from imagining to action. The user types one sentence about a world they want; the platform offers them the path from that sentence to a real piece of work.

---

## 6. The matching path (consent-gated)

### 6.1 What matches

Two imaginings match if:

- Same domain
- High semantic similarity on Horizon text (cosine similarity > threshold, embedding-based)
- Both users have **opted in** to be discoverable through Imagine matching

### 6.2 What surfaces

The matching surface shows:

- The other user's display name (and avatar, if any)
- Their imagined world (the `final_text`)
- A "open profile" link

It does **not** show:

- Match score
- Number of total matches
- Engagement metrics of any kind

### 6.3 The opt-in

A user must explicitly opt in via the imagining's `visibility` field. Setting it to `matches` makes them discoverable. The default is `private`.

This is consistent with the platform's visibility ladder (private / matches / public) across affiliations, statements, and now imaginings.

### 6.4 Direction of consent

Both users must have opted in. If only one has, no match surfaces. This is *mutual* discoverability, not unilateral.

---

## 7. UI surfaces

### 7.1 The standalone page — `/imagine`

A single, centred prompt. Quiet. No nav chrome dominating. The page is the prompt.

```
                                                                  [ Nav ]




                    IMAGINE A WORLD


                    Imagine a world where
                    ┌────────────────────────────────────────┐
                    │                                        │
                    │                                        │
                    │                                        │
                    └────────────────────────────────────────┘

                    [ Continue ]   or   [ Need a starter? ]



                                                              [ Footer ]
```

The composition is intentional: nothing else competes. The Cormorant Garamond display font for the prompt. The input is generous (5 lines high). The submit button is gold.

### 7.2 In Mission Control

A tile in the dock labelled **Imagine** with a small Cormorant icon. Tapping opens a panel-mode of the page — same single prompt, in-context.

### 7.3 On the public-facing site

The home page or a dedicated landing — `/imagine` — links from existing CTAs as an alternative on-ramp. This is the surface for general public, students, teachers — anyone arriving without a structured entry point.

### 7.4 As an embed for educators

(Possible future affordance.) Teachers can embed Imagine a World on their own pages or classroom dashboards. The embed is a single-iframe widget that submits to the user's session (if logged in) or to an anonymous session (if not).

This is **not in scope for v1** but is named as a likely direction.

---

## 8. Audiences

### 8.1 General public

The default audience. They arrive without orientation. The single prompt is friendly without being childish. The reframe layer respects their starting point. The Horizon translation gives them something to take away. The matching path offers them something to come back for.

### 8.2 Students

Imagine a World maps naturally to school curricula on civics, futures studies, climate, ethics. The output (a Horizon goal in seven-domain framing) is a viable starting point for a longer essay or project. Teachers can ask their class to each submit an imagining and discuss the resulting Horizons.

### 8.3 Teachers

In addition to using it themselves, teachers can curate exemplary student imaginings (with permission) into a class corpus. This is operational, not architectural — built later if demand emerges.

### 8.4 Existing platform users

For someone already in The Map, Purpose Piece, or Mission Control, Imagine a World is a parallel surface — sometimes you want to think structurally (the wheel) and sometimes you want to start with a vision (imagine). Both surfaces lead to the same Horizon-and-domain shape; they're just different entry points.

---

## 9. The aggregation layer (private)

### 9.1 What's aggregated

Across all imaginings (saved, with `visibility != 'private'`), the platform can compute:

- Distribution of domains chosen (which civilisational facets are people imagining most?)
- Common Horizon themes (semantic clusters)
- Reframe rates (how often does an imagining need reframing, per domain?)
- Domain-override rates (how often does the user change the AI's domain pick?)

### 9.2 What surfaces from aggregation

A future dashboard surface ("The collective imagining") could show:

- A live heatmap of which domains people are imagining into
- A handful of representative Horizon themes per domain
- The shape of what humans are longing for

This is **not v1.** It is a future surface that the data layer prepares for.

### 9.3 What is NEVER surfaced

- Individual imaginings tied to identifying info
- Re-identification of users from text fingerprinting
- Comparative metrics ("you imagined more boldly than 80% of users") — engagement metric, refused

---

## 10. Build sequence

### 10.1 V1 — single-user happy path

| Step | What |
|---|---|
| 1 | `sql/053_nextus_imaginings.sql` — table, RLS, indexes |
| 2 | `api/imagine-reframe.js` — serverless function for the reframe AI call |
| 3 | `api/imagine-translate.js` — serverless function for the Horizon translation |
| 4 | `src/app/pages/Imagine.jsx` — the page surface |
| 5 | `src/app/components/imagine/*` — input, reframe modal, Horizon card, domain override |
| 6 | Route `/imagine` in `App.jsx` |
| 7 | Mission Control tile |
| 8 | "Save to my Horizons" wiring — copies into `horizon_profile` |
| 9 | "Start a Target Stretch" wiring — creates a Target Stretch shell |

### 10.2 V2 — matching path

| Step | What |
|---|---|
| 10 | Embedding generation on save (pgvector or Anthropic embeddings) |
| 11 | `api/imagine-match.js` — returns matched imaginings for the current user |
| 12 | Match surface UI |

### 10.3 V3 — aggregation surface

Speculative; designed after V1 has live data.

---

## 11. Risks and mitigations

### 11.1 The reframe layer over-reaches

**Risk:** The AI reframes too eagerly, neutering politically-charged inputs the user meant exactly as written.

**Mitigation:** Generous detection but always-optional offer. User can always "Keep it as is." Weekly review of live reframes during rollout.

### 11.2 The Horizon translation produces generic outputs

**Risk:** Every imagining gets translated to a soft, vague Horizon that doesn't actually point at action.

**Mitigation:** Prompt scaffolding requires concreteness. User can edit the Horizon text directly before saving. Domain reasoning is shown so the user can sanity-check.

### 11.3 Surveillance via aggregation

**Risk:** Aggregating imaginings — even with privacy — creates a public-opinion-monitoring surface that's the opposite of the platform's intent.

**Mitigation:** Aggregation surface deferred until V3, with explicit Roddenberry-frame audit before it ships. Aggregation never reaches journalistic or political-strategy use cases. The platform refuses to be a "sentiment analysis" instrument.

### 11.4 Adversarial input

**Risk:** Users submit harmful or harassing imaginings ("a world where X group disappears").

**Mitigation:** The reframe layer detects extremity and refuses to translate; offers a less-harmful reframe. If the user keeps the harmful version, it is flagged and never saved as a Horizon. The platform does not host content advocating harm to identifiable groups.

The detector for "extreme" inputs is conservative — false-positives ("you can't imagine that") are worse than rare false-negatives. But the *translation* layer absolutely refuses to render harmful imaginings as Horizons. The Horizon Suite is a generative surface; it does not bless destruction.

### 11.5 Scale of AI calls

**Risk:** Every imagining = 2 AI calls (reframe + translate). At scale this becomes costly.

**Mitigation:** Reframe call is skipped when no negative pattern detected. Translate call uses Sonnet 4 with low max_tokens (under 500). At early scale, costs are bounded.

---

## 12. Voice register reference

For the build team and prompt authors, a register reference:

**Wonka register (warm, inside voice):**
- *"That's a real thing to be uncertain about."*
- *"Let me offer some shapes that might fit."*
- *"That's a world worth building."*

**Roddenberry frame (civilisational outside voice):**
- *"On the other side of this is..."*
- *"What would be true in that world?"*
- *"The shape of the future you're naming..."*

**Avoid (this is not the platform's voice):**
- *"What a great question!"* (sycophantic)
- *"I understand how you feel."* (therapy register)
- *"Let me help you reframe that."* (helpdesk register)
- *"That's a complicated topic."* (deflection)

---

## 13. After V1

Once live, the feature opens onto:

- **A new on-ramp for the platform** that doesn't require knowing the seven domains in advance
- **A bridge to Target Stretch** — the user types one sentence and ends up with a piece of work
- **A surface for educators** to use NextUs in pedagogical contexts
- **A research data surface** (aggregated, ethically constrained) on what humans imagine when invited

The feature is small to build. The voice work is the heavy lift. The data layer is straightforward.

---

## Version history

- **V1 spec** (May 2026): First architecture pass. Written ahead of build, in the Affiliation UI thread, while v2.5 deployment was pending. Ready to refine and implement.
