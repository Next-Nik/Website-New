# NextUs Geographic Scale Architecture v2.1

**Status:** Canonical
**Supersedes:** `NextUs_Geographic_Scale_Architecture_v1.docx`
**Phase coverage:** v2.1 (top-of-tree seed, deployed) · v2.2 (GeoNames ingest, in progress) · v2.5 (affiliation surface, **this build**) · v2.5b–v2.9 (sequenced)
**Document version:** v2.1 — reconstructed from source-thread record of v2.0 and extended with the bounded-attention architecture authored in the Affiliation UI thread.

---

## 0. Why this document exists

In May 2026 Nik said: *"I want to claim to be part of Canada since I was born there and am a citizen."*

That sentence triggered an architectural pass that turned out to be far larger than a feature. To honour the claim, the platform needed:

- Countries as entities on the board
- Continents above them, cities below them, neighbourhoods below those
- Oceans as peers of continents, not subordinate to land
- Rivers, mountains, forests, deserts, bioregions, biomes as real entities
- Designated areas — parks, heritage sites, sacred sites
- Disrupted zones — Earth's wounds, named honestly
- Crisis zones — places where people are being harmed *now*

And it needed an affiliation model that lets a user say *"I am a citizen of Canada"* without the platform pretending it issues citizenship; that lets *"I am of Nicaragua by ancestry through my mother"* be true and private at the same time; that lets affiliation cascade through the parent chain so a Toronto-born user appears, correctly, on Ontario's page, Canada's page, and North America's page without making five separate declarations.

This document captures the architecture for all of that.

---

## 1. The deep insight

**Every Focus has the same seven-domain wheel.**

The planetary dashboard is Earth's geographic-entity scorecard. Every other geographic entity has the same scorecard structure. Canada has a Vision score because Canada contains vision (or struggles to). Mexico City has a Human Being score because Mexico City contains people. The Pacific Ocean has a Nature score because the Pacific is the largest piece of nature on the planet.

This is the spine of v2: **the seven-domain wheel is a property of every Focus at every scale.** The planet wheel is not special. It is the special case of Focus-scoring where the Focus is Earth.

That insight is what makes the work below not "adding countries to the Atlas" but "recognising that the Atlas already has a planetary scope and geographic entities below the planet are nested dashboards inside it."

Scoring runs on the same daily-snapshot cadence the planet dashboard already uses, with one critical commitment: **scores at every scale should ultimately be sourced from observable indicators, not editorial intuition.** Indicator-driven scoring is the default. Editorial scoring is the transitional state until each domain at each scale is wired up.

---

## 2. The Focus primitive

### 2.1 The two axes — scale and kind

A Focus is described on two orthogonal axes:

- **Scale** — how big, where in the containment tree (planet → continent → country → state → region → city → neighbourhood, and parallel chains for hydrological/geological/ecological entities)
- **Kind** — what type of geographic entity (political, hydrological, geological, ecological, cultural, designated, disrupted, atmospheric, orbital)

Canada has `scale: country, kind: political`. The Amazon River has `scale: river, kind: hydrological`. Yosemite has `scale: protected_area, kind: designated`. Chernobyl Exclusion Zone has `scale: disrupted_zone, kind: disrupted`.

The two axes are independent. Scale handles nested containment; kind handles typology. A country and a city are different scales of the same kind. A country and a river are different kinds at different scales.

### 2.2 Scales — the full taxonomy

```
Top of tree:
  planet, ocean, sea, continent

Political / administrative:
  country, state_or_province, region, city, neighbourhood

Hydrological:
  river, lake, watershed

Geological:
  mountain_range, mountain, desert, island, archipelago,
  geological_feature, polar_region

Ecological:
  ecoregion, biome, realm (biogeographic), bioregion, forest

Designation-as-scale:
  protected_area, heritage_site, sacred_site

Atmospheric / orbital (named, deferred from launch):
  atmosphere_layer, orbital_zone

Disrupted:
  disrupted_zone, crisis_zone (kind-distinct, see 2.6)

Organisation:
  organisation
```

v1 names (`nation`, `province`) are preserved in the CHECK constraint for backward compatibility with any unmigrated rows. New ingest uses `country` and `state_or_province`.

### 2.3 Kinds — the typology

```
political, hydrological, geological, ecological,
cultural, designated, disrupted, atmospheric, orbital
```

`kind` may be NULL during rollout. It is populated by the GeoNames feature-class-to-kind mapping in Phase v2.2.

### 2.4 Parent / containment — the Russian doll

Every Focus has a single canonical `parent_id`. Toronto's parent is Ontario. Ontario's parent is Canada. Canada's parent is North America. North America's parent is Earth.

This is the only place containment lives. Every claim about "I belong to X" cascades through the chain mechanically. The Russian doll is not a feature; it is a consequence of the substrate being shaped correctly.

The cascade is implemented in SQL via `focus_ancestors(focus_id)` and `focus_descendants(focus_id)` (migration 047). Both are recursive CTEs walking `parent_id`.

### 2.5 Touches — non-hierarchical adjacency

Some adjacencies don't fit a containment tree. The Mediterranean Sea touches Europe, Africa, and Asia. Cascadia touches the United States and Canada. The Amazon Basin touches multiple South American countries.

The `nextus_focus_touches` table captures these. The primary tree (parent_id) stays clean for navigation and roll-up math; the secondary touches relation captures geographic reality.

### 2.6 Designations — externally-sourced status overlays

A Focus can carry zero or more **designations**. A designation is an external classification with attribution: *"Cascade-Siskiyou is a biodiversity_hotspot per Conservation International, since 2004."*

Designations subsume what v1 might have called type flags:
- `biodiversity_hotspot` (Conservation International)
- `priority_ecoregion` (WWF Global 200)
- `protected_area` (WDPA / UNEP-WCMC)
- `world_heritage_site` (UNESCO)
- `crisis_zone` (composite, multiple monitors)
- `disrupted_zone` (NextUs editorial, Wikidata-enriched)
- and reserved future overlays (KBA, AZE, Ramsar, IUCN ecosystem status, etc.)

Every designation has `source_name`, `source_ref`, validity dates, and (for `crisis_zone`) temporal status metadata.

**The platform never originates a designation. It ingests and attributes.**

### 2.7 The Russian-doll cascade — read-time math

When a user declares an affiliation to a Focus, the declaration is stored once. Read-time math cascades it through the parent chain:

- *Toronto's profile counts you among its public "born here" affiliations.*
- *Ontario's profile counts you — because Toronto is in Ontario.*
- *Canada's profile counts you — because Toronto is in Canada.*
- *North America's profile counts you — because Toronto is in North America.*
- *Earth counts you among its inhabitants.*

One declaration. Five Focus pages know about it. The cascade is implemented via `focus_descendants(focus_id)`, which is used to find every descendant whose direct affiliations should count toward an ancestor's totals.

**Citizenship is the exception.** Citizenship only makes sense at the polity scale. *"Citizen of Toronto"* is a stretch; *"citizen of North America"* is meaningless. The cascade does not apply to `citizen`. Direct claims only.

This is implemented in `focus_affiliation_counts_cascaded(focus_id)` — the function that drives the affiliated-people layer on a Focus profile.

### 2.8 Affiliation — the user → Focus link

A user can declare zero or more affiliations to any Focus. Each affiliation has:

- **`relationship_type`** — one of: `citizen`, `resident`, `former_resident`, `born_here`, `heritage`, `working_here`, `connected_to`
- **`visibility`** — one of: `public`, `visible_to_matches`, `private`
- **Optional `note`** — free text (column reserved, UI deferred)

The schema enforces uniqueness on `(user_id, focus_id, relationship_type)` — a user can hold many affiliations to the same Focus, but each relationship type only once. (You're a citizen of Canada once, not twice.)

#### Visibility is per-record. Visibility is load-bearing.

- **Public** — visible to anyone. Counted in public-facing totals.
- **Visible to matches** — hidden from public view; available to the matching layer (when it exists) in service to the user. Not counted in public totals.
- **Private** — only the user can see it. The platform may still use it to serve them — quietly, in matching and feed shaping — but it is never broadcast.

This is enforced via Supabase RLS at the database layer (migration 042). The application cannot leak through accidentally.

#### Affiliation is a declaration, not a grant.

> Place affiliations are an expression of identity, not a grant from authority. The platform isn't a state, and it shouldn't simulate one.

No verification. No proof. Self-declared, full stop. The platform records affiliation; it does not adjudicate citizenship, residence, heritage, or any other tie.

#### Affiliation cascades. Citizenship does not.

The cascade described in 2.7 applies to every relationship type except `citizen`. When you declare `born_here` to Toronto, you appear in Toronto's, Ontario's, Canada's, North America's, and Earth's "born here" totals. When you declare `citizen` of Canada, you appear only in Canada's "citizens" total.

---

## 3. Stewardship

A Focus is **stewarded**, never owned by an individual user. Three stewardship states:

- **Editorial steward** — NextUs maintains the profile. Default for every Focus at every scale.
- **Recognised steward** — a legitimate body that represents the place at that scale claims it (a tourism board, a city government, a neighbourhood association). They can edit the profile but cannot revoke anyone's affiliation. Rare and gated.
- **Community stewardship** — multiple affiliated users with high engagement can collectively edit (wiki-style). Not for v2; named as a possible future shape.

The stewardship UI ships in Phase v2.9. v2.5 displays a default "Editorial stewardship — maintained by NextUs" footer on every Focus profile.

### Revocation rules

1. **Affiliations are never revocable by the place.** Canada cannot revoke a user's claim of Canadian citizenship. Mexico City cannot revoke residency.
2. **Affiliations are revocable by the user, always, instantly.** No friction. No approval flow.
3. **Stewards can flag, not revoke.** A recognised steward seeing what they believe is abuse can flag for NextUs review. NextUs decides. Stewards never directly remove.

The deeper principle: *place affiliations are an expression of identity, not a grant from authority.*

---

## 4. Crisis zones — the wounds

`crisis_zone` is a Focus kind designed for places where people are being harmed *now*. Unlike `disrupted_zone` (Earth's slow-moving wounds — Chernobyl, the Aral Sea), `crisis_zone` is temporally volatile.

### 4.1 Severity is read from the seven-domain wheel

A crisis zone uses the same 0–10 flourishing scale as every other Focus. Gaza-as-crisis-zone has Human Being 0.8, Society 0.5, Nature 1.2 — not a separate "severity 8" overlay. The crisis is visible in the shape and depth of the score collapse. The platform speaks one numeric language at every scale.

### 4.2 Live data, never our opinion

Crisis-zone severity is derived from indicator data:
- ACLED for armed conflict
- IPC for famine
- UNHCR for displacement
- WHO for health emergencies
- V-Dem / Freedom House for civic space
- UN OCHA / HDX for humanitarian need

Every score has a source. The data layer enforces this. No source, no number.

### 4.3 Temporal metadata

A crisis_zone Focus carries additional fields:
- **status** — active, escalating, de-escalating, monitoring, resolved, recurring
- **crisis_type** — armed_conflict, famine, displacement, authoritarian, health_emergency, mass_detention, organised_violence, climate_emergency
- **onset_date**, **last_updated**

### 4.4 The response — `nextus_focus_responses`

A crisis_zone profile is incomplete if it only shows the wound. The `nextus_focus_responses` table links responder actors (NGOs, agencies, journalists, mutual-aid networks) to the crisis zone. This is the bridge from honest seeing to meaningful doing — the platform's deepest answer to "what can I do."

### 4.5 Crisis surface is opt-in

The crisis layer on the planet wheel and Atlas is **default-off** for new users. The visual register is sober, not gamified — desaturated, marked by magnitude, not by flashing red. User consent precedes confronting the wounds of the world.

---

## 5. The Gap Signal extension

The Gap Signal taxonomy is extended to recognise **In Crisis** alongside Thriving / Underway / Underloved / Unmapped. A Focus rendered as "In Crisis" carries an active crisis_zone designation and surfaces accordingly on Atlas views and Focus profiles.

---

## 6. Expressed / shielded / not-applicable — the three states

A Focus has seven domain spokes. For each spoke, a Focus relates to it in one of three ways:

- **Expressed** — the Focus has a known score for this domain (high or low; the platform speaks the score honestly).
- **Shielded** — the Focus has a score but the responsible steward has chosen not to publish it; the platform represents the spoke as deliberately withheld rather than absent.
- **Not applicable** — the domain doesn't meaningfully apply to this Focus (a single mountain has no Vision score; the domain isn't shielded, it's not a question).

v2.5 ships **two-state rendering** (expressed vs. absent). The three-state visual distinction is deferred to **Phase v2.8**. The architecture commits to all three states at the data layer now; the wheel rendering catches up.

---

## 7. Bounded attention — a first-class platform principle

> Attention is real and limited. The platform refuses the lie that attention is infinite.

This principle, named in the Affiliation UI thread, sits alongside the platform's existing commitments:

- *The North Star consent rule* — AI never speaks unbidden.
- *No engagement metrics surfaced* — users don't see "you have N followers."
- *Resonance, not engagement* — matching uses meaning, not behaviour signals.
- *No paid placement* — money doesn't move what surfaces.
- ***Bounded attention*** — the platform honours that attention is finite at every layer where the user is asked to allocate it.

Three layers of attention sit on the affiliation primitive. Each is bounded.

### 7.1 The three layers — identity, interest, influence

The classical strategic frame is *sphere of interest* vs *sphere of influence*:

- **Sphere of interest** — everything you care about, attend to, want to know. Wide. Includes things you can do nothing about.
- **Sphere of influence** — the subset where you can actually act, participate, contribute.

NextUs adds a third, more fundamental layer beneath both: **identity**. Who you are, where you're from, what holds you. This is what the affiliation primitive captures.

| Layer | What it is | What it does | Bounded by |
|---|---|---|---|
| **Identity (affiliation)** | Declared ties: citizen, resident, heritage, etc. | Renders on profile; cascades via parent chain; informs matching | What is true |
| **Interest (watch)** | Things you've tagged "I want to know about this" | Adds to the watched feed (chronological, light surfacing) | 500 entries max |
| **Influence (spoons)** | Things you've actively allocated attention to | Drives the curated feed (weighted by tier) | 100-spoon budget across 4 tiers |

The watched feed (sphere of interest) is how the platform renders what a user is *noticing* in the world. The curated feed (sphere of influence) is how the platform renders what a user is *committed to*. Two postures. Two feeds. Both honest about the bounds of attention.

### 7.2 Layer 1 — Identity (affiliation)

Built in Phase v2.5 (this build). See Section 2.8 for the full primitive.

Bounded by truth. A user can declare as many affiliations as are *true* of them. There is no numeric cap. Lying about identity is the failure mode the architecture explicitly trusts the user not to commit, because: (a) verification is impossible without exposing PII the platform refuses to handle; (b) lying about identity creates no payoff in the platform's ecosystem (no follow-back farming, no engagement reward); (c) the platform's principle is to record self-declaration, not adjudicate.

### 7.3 Layer 2 — Interest (the watch)

Built in **Phase v2.5b**.

A user can tap a "Watch" button on any Focus profile. The Focus is added to their watched list. Up to **500 entries**.

The watch button is a deliberate act — a conscious tag, like a bookmark, not a view-history side effect. Clicking on a Focus profile to read it doesn't auto-add it. The user must mean it.

The watched feed renders chronologically. No engagement-driven sorting. No prominence shifting. Items appear in the order they were published. The platform doesn't manipulate; the user watches.

#### Why 500

The number protects the user from themselves, not from bots. Bot-resistance is structurally moot on NextUs — there's no follow-back economy, no engagement reward to game. The cap is anti-noise. A watched list of 2,000 is useless because everything is in it; 500 is a generous upper bound that, when approached, prompts the user to prune.

The cap is **soft until it isn't**:
- At 80% of 500, gentle messaging.
- At 100%, the user can't add another without removing something. Not an error; a pause that returns the choice to the user.

The 500 number is configurable in the architecture, not hard-coded. If lived experience shows it's wrong, the constant changes.

### 7.4 Layer 3 — Influence (the spoons)

Built in **Phase v2.5c**.

Each user has **100 attention spoons** distributed across a roster of up to **65 curated slots**, organised in four tiers:

| Tier | Slots | Cost per slot | Max saturation cost | What it buys |
|---|---|---|---|---|
| **Deep** | 5 | 10 | 50 | Full stream of what the entity shares |
| **Sustained** | 10 | 5 | 50 | Significant updates only |
| **Regular** | 20 | 2 | 40 | Major events only |
| **Light** | 30 | 1 | 30 | Highlights only |

Full-saturation totals **170 points**. The 100-spoon budget makes that impossible: **the user must choose the shape of their attention.** This is the roster mechanic — the same constraint that shapes fantasy-team builds, where you can't have a roster of all top-tier players because the points don't add up.

A few legitimate shapes the budget allows:

- *5 deep (50) + 10 sustained (50) = 100.* Tight, focused. 15 entities deeply attended.
- *3 deep (30) + 5 sustained (25) + 10 regular (20) + 25 light (25) = 100.* Wide, mixed. 43 entities total.
- *2 deep (20) + 4 sustained (20) + 20 regular (40) + 20 light (20) = 100.* Mostly low-attention. 46 entities.

Each shape is legitimate. The roster mechanic exposes the choice rather than hiding it. The user controls their own algorithm.

#### What the tiers mean in feed terms

The curated feed is sorted by tier. A deep-tier entity's content surfaces wherever the entity produces it. A sustained-tier entity surfaces only for content above a significance threshold the entity (or the platform) classifies. Regular and light tiers progressively narrow the gate.

Important: **points beyond saturation are visibly wasted.** If a user allocates 25 spoons to a single entity (above any tier's saturation), the UI shows the excess clearly with a "wasted" indicator. The platform doesn't silently take points that buy nothing.

#### Spoons are private

Spoon allocations are not shown on a user's public profile. Visitors see declared affiliations (per visibility) but never how a user allocates attention. Spoons are *the user's own algorithm*; broadcasting them defeats the point.

#### The info button

Wherever the roster mechanic appears, an info button (`i` in circle) opens a panel explaining the game mechanics: the tiers, costs, what each tier buys, why the constraint exists. The pattern is novel; the teaching surface is part of the design.

### 7.5 The three layers compose

| Possibility | Meaning |
|---|---|
| Affiliate without watching | Identity declared; not actively followed |
| Affiliate without spending spoons | Identity declared, possibly watched, but not high-priority influence |
| Watch without affiliating | Interest without identity (a place you care about but have no personal tie to) |
| Spend spoons on something you watch | The curated feed in action |
| Spend spoons on something without watching it | Allowed; spending spoons implicitly adds to watch state |

Identity, interest, and influence are independent. Each is bounded. The platform refuses the lie that any of them is infinite.

---

## 8. The universal Focus profile primitive

Every Focus at every scale and kind renders through the **same** profile component at `/focus/:slug`. Canada, The Junction, the Pacific Ocean, the Sahara, Cascadia, HAAB — each is an instance of the universal primitive.

### 8.1 The eleven layers

| # | Layer | v2.5 | Defer |
|---|---|---|---|
| 1 | Identity header (name, scale, kind, description, breadcrumb) | ✓ | |
| 2 | Seven-domain wheel | placeholder | scoring fills via Phase v2.6+ |
| 3 | What's nested under this Focus | ✓ | |
| 4 | Touches (non-hierarchical adjacency) | ✓ | (table empty at launch) |
| 5 | Affiliated people (counts, cascaded) | ✓ | |
| 6 | Actors located here (orgs/practitioners with location in subtree) | ✓ | |
| 7 | Catch points (Gap Signal at this Focus) | | Phase v2.6 |
| 8 | Responders (linked via response_to) | | Phase v2.7 |
| 9 | Designations (overlays from external sources) | | Phases v2.3, v2.4 |
| 10 | Stewardship footer | ✓ (editorial default) | Phase v2.9 (recognised stewardship) |
| 11 | Watch + Affiliate buttons | Affiliate only | Watch in Phase v2.5b |

### 8.2 Why a universal primitive

Building "country profile" as a special case would create technical debt the moment neighbourhood pages, bioregion pages, or river pages are needed. Building "Focus profile" as the universal primitive means every future Focus type gets a coherent profile for free.

This is the fractal principle applied at the page level: build the primitive, not the special case.

### 8.3 Scale-and-kind-aware rendering

The component is parameterised by `kind` and `scale`. The "what's nested" layer renders different children for different kinds:

- A country's nested children are provinces, cities, rivers, mountains, designated areas, bioregions overlapping it
- A river's nested children are tributaries
- A mountain range's nested children are individual peaks
- A biome's nested children are the ecoregions inside it

The underlying query is uniform: `focus_descendants(focus_id)`, filtered as needed. The presentation adapts.

---

## 9. Source registry — never our opinion

The platform never originates structured data about geographic entities. It ingests with attribution. The upstream sources, in their build-sequence order:

| Phase | Source | Coverage | Status |
|---|---|---|---|
| v2.1 | Editorial top-of-tree | Earth, 7 continents, 5 oceans, 8 realms, 14 biomes | Deployed |
| v2.2 | GeoNames `allCountries.txt` | ~245 sovereign countries + states/cities/physical features | In progress |
| v2.2b | GeoNames `alternateNames.txt` + Wikidata QID crosswalk | Multilingual names + structured-data interop | Queued |
| v2.3 | WWF Terrestrial Ecoregions of the World | 825 ecoregions, 14 biomes, 8 realms | Queued |
| v2.4 | WDPA (UNEP-WCMC) | ~280,000 protected areas | Queued |
| v2.4 | UNESCO World Heritage List | ~1,200 sites | Queued |
| v2.4 | One Earth Bioregions | ~185 lived-identity bioregions | Queued |
| v2.4 | Editorial `disrupted_zone` launch list | ~30 wounds (Chernobyl, Aral Sea, Pacific Garbage Patch, etc.) | Queued |
| v2.6 | ACLED | Armed conflict | Queued |
| v2.6 | IPC | Famine and food insecurity | Queued |
| v2.6 | UNHCR | Displacement | Queued |
| v2.6 | V-Dem, Freedom House | Civic space | Queued |
| v2.6 | WHO | Health emergencies | Queued |
| v2.6 | UN OCHA / HDX | Humanitarian need | Queued |

### Licensing discipline

Every upstream is honoured according to its license. Conservation International Biodiversity Hotspots requires supplementary licensing for electronic distribution — request pending with `hotspots@conservation.org`. If declined, KBA (Key Biodiversity Areas) is the substitute already named.

### Contested territories

> We follow upstream sources with attribution. We don't adjudicate.

Wikidata and GeoNames each have structured representations of disputes (Taiwan, Palestine, Western Sahara, Kosovo). When Phase v2.2b loads alternate names and Phase v2.4 loads Wikidata enrichment, the contested-status data flows in with attribution.

### Continents convention

NextUs uses GeoNames's seven-continent convention. Captured in the v2.1 seed and the architecture doc.

---

## 10. Build sequence

| Phase | Title | Status |
|---|---|---|
| v2.1 | Schema extension + top-of-tree seed | **Deployed** (migrations 042, 043) |
| v2.2 | GeoNames bulk ingest (countries, states, cities, physical features) | **In progress** (migrations 044, 044b, 045, 046) |
| v2.2b | alternateNames + Wikidata QID backfill | Queued |
| v2.3 | WWF TEOW ecoregion ingest | Queued |
| v2.4 | WDPA + UNESCO + One Earth + disrupted_zone launch | Queued |
| **v2.5** | **Affiliation UI surface + universal Focus profile** | **This build** |
| v2.5b | Watch surface (sphere of interest) | Queued |
| v2.5c | Spoon allocator + curated feed (sphere of influence) | Queued |
| v2.6 | Crisis indicator pipeline (ACLED, IPC, UNHCR, V-Dem, WHO, OCHA) | Queued |
| v2.7 | Crisis surface UI + response_to | Queued |
| v2.8 | Expressed/shielded/not-applicable three-state wheel rendering | Queued |
| v2.9 | Stewardship build (recognised + community) | Queued |

### What v2.5 ships

- The affiliation declaration UI on the profile edit page (search → relationship → visibility, with cascade preview and citizen nudge)
- The Places section on the public profile, with cascade breadcrumbs and per-focus clickable links to `/focus/:slug`
- The universal Focus profile primitive (layers 1–6 + 10 + 11-affiliate), parameterised by scale and kind
- The `focus_ancestors` and `focus_descendants` SQL helpers (migration 047)
- The `focus_affiliation_counts_cascaded` helper for read-time cascade math
- The FocusSearch v2 vocabulary fix (TYPE_LABEL + KIND_LABEL covering full v2 taxonomy)
- The reusable `InfoButton` component for game-mechanics teaching
- The architecture written down, all three attention layers captured even though only Layer 1 ships UI

### What v2.5 does NOT ship

- Watch surface and watched feed (v2.5b)
- Spoon allocator and curated feed (v2.5c)
- Catch points, responders, designations on Focus profiles (v2.6+)
- Three-state wheel rendering (v2.8)
- Stewardship UI beyond editorial-default footer (v2.9)
- Per-affiliation note text field (column exists in schema; UI deferred until demand surfaces)

---

## 11. Working principles carried from the source thread

- **The fractal works both ways.** Every Focus has the same seven-domain wheel; every Focus is the same primitive at different magnification.
- **Classify by impact, not feedstock or means.** What an entity is solving for matters more than what it's made of.
- **Yes AND / dual residency.** Actors and concepts can hold genuine membership in multiple domains; the domain field is an array.
- **Honest calibration over comfort.** Civilisational scores are not made artificially optimistic; "extremely sobering" reads of the planet are accepted.
- **User dignity in scoring.** The user's own wheel renormalises so their chosen Horizon equals the spoke maximum; the platform ceiling is never the comparison point.
- **The platform never originates.** It ingests, with attribution, with sources visible to anyone who wants to follow the trail.
- **Place affiliations are an expression of identity, not a grant from authority.** No platform-side issuance, recognition, or revocation of citizenship, residence, or heritage.
- **Bounded attention at every layer.** Identity bounded by truth. Interest bounded at 500. Influence bounded by the 100-spoon roster mechanic. The platform refuses the lie that attention is infinite.

---

## Version history

- **v1** (May 2026, pre-thread): Initial design with five scale types (continent, nation, province, city, neighbourhood). Stewardship architecture sketched. Affiliation model partial.
- **v2.0** (May 2026, source thread): Two-axis Focus primitive (scale + kind). Full 28-scale taxonomy. Designations as first-class concept. Affiliation vocabulary with visibility flags. Crisis zones with indicator-driven scoring. Universal seven-domain wheel insight.
- **v2.1** (May 2026, Affiliation UI thread): Bounded-attention architecture made first-class. Three-layer attention model (identity / interest / influence). Sphere-of-interest vs sphere-of-influence framing. Roster mechanic (100 spoons, 5/10/20/30 tier structure). Watch cap at 500. Universal Focus profile primitive specified. Russian-doll cascade math captured via `focus_ancestors` / `focus_descendants`.
