# B-3 Brief — Seeding the Six Remaining Civilisational Domains

**Status:** planning document, not implementation
**Prereq:** Drops B-1 + B-2 deployed (live World View panel; per-domain rollup math)
**Scope:** extending the indicator catalog to all seven civilisational domains, with at least one fetcher per domain, so the State of the World gauge produces a real number on every spoke

---

## What's already done (Module 11 + B-1 + B-2)

- Schema deployed: `nextus_domain_indicators` (catalog), `nextus_domain_indicator_values` (history), `nextus_contributor_signals` (Tier 3), `nextus_indicator_fetch_log` (audit). All seven civ domains are valid `domain_id` values.
- Cron deployed and running daily at 03:00 UTC.
- Catalog seeded for **Nature only** (34 indicators, 5 marked headline).
- Live fetchers implemented for **3 source providers** (NOAA atmospheric, USGS earthquakes, OpenAQ air quality), covering 4 of Nature's indicators.
- Rollup columns (`target_value`, `floor_value`, `rollup_weight`) added in B-2. Set for the 4 Nature indicators with live data.

What's missing: catalog rows for the other six domains, plus the source handlers that fetch their values.

---

## Principles for the seed

These are the non-negotiables. Any indicator that doesn't satisfy all four should not be in the catalog.

1. **Has an authoritative source.** Government, intergovernmental, peer-reviewed scientific body, or major NGO with public methodology. Not a think tank's opinion piece, not a press release.

2. **Has a stable API or scrape path.** If it requires login, paid access, or a fragile screen scrape against a redesign-every-quarter site, it is not catalog-grade. Catalog rows that don't have a working fetcher route to `handleNotImplemented` and stay empty — better to leave them out than fill the catalog with shelf-ware.

3. **Has defensible target and floor values.** A target_value that scores 10 and a floor_value that scores 0 must each be backed by something — an IPCC threshold, a WHO guideline, a UN SDG target, a pre-industrial baseline, or a peer-reviewed study. If we cannot defend the score breakpoints, we cannot defend the rollup.

4. **Maps to a Horizon Goal.** Each headline indicator must clearly answer: "if this number moves toward target, are we measurably closer to the domain's Horizon Goal?" If not, it's a context indicator (not a rollup contributor), and probably belongs as a sub-domain indicator instead of headline.

---

## Per-domain seed plan

For each domain below: proposed source providers, candidate headline indicators (typically 5-7), and an honest read on data availability. Indicators marked **Tier 1** have known APIs and are buildable now. **Tier 2** require a scraper. **Tier 3** are contributor-supplied and don't need a fetcher.

### Human Being

**Horizon Goal frame:** every human meets their basic needs and has the capacity to flourish.

**Candidate headline indicators (Tier 1 unless noted):**
- Global life expectancy at birth — World Bank API (`SP.DYN.LE00.IN`)
- Under-5 mortality rate per 1,000 live births — WHO GHO API
- Prevalence of moderate or severe food insecurity — FAO SOFI report (annual; CSV download, lightweight scrape)
- Global mental health: Years Lived with Disability for mental disorders — IHME GBD API
- Access to safe drinking water (% of global population) — WHO/UNICEF JMP API

**Source effort:** World Bank and WHO are well-documented JSON APIs. FAO and JMP need light handlers. Subtotal: 5 indicators, 4 fetchers (WHO covers 2). About 2-3 days of work.

---

### Society

**Horizon Goal frame:** societies are equitable, peaceful, and self-determining.

**Candidate headline indicators:**
- Battle-related deaths (annual count, 5-year rolling avg) — Uppsala Conflict Data Program API
- Gini coefficient (global mean of national Ginis) — World Bank API
- Press freedom index score — Reporters Without Borders annual CSV (scrape)
- Democracy Index score — V-Dem API or annual CSV
- Forced displacement count (refugees + IDPs) — UNHCR Refugee Statistics API

**Source effort:** UCDP and UNHCR are real APIs. Press freedom and Democracy Index are annual data drops. Subtotal: 5 indicators, 5 fetchers. About 3-4 days.

**Note on "context" framing:** Society contains some genuinely value-loaded measurements (what counts as democracy, what's press freedom). The platform's stance is to use the most rigorous published index and name it explicitly in the provenance line — V-Dem is more methodologically defensible than Freedom House for this purpose.

---

### Technology

**Horizon Goal frame:** technology serves human and planetary flourishing; its substrates and consequences are healthy.

**Candidate headline indicators:**
- Global internet penetration (% population with access) — ITU API
- AI safety incidents catalogued — AI Incident Database (API or CSV; smallish dataset)
- Critical minerals supply concentration (Herfindahl index for rare earths, lithium, cobalt) — USGS Mineral Commodity Summaries (annual scrape)
- Global e-waste generation (kg per capita) — UN Global E-waste Monitor (annual report scrape)
- Energy consumption of data centres (TWh per year) — IEA Electricity Information annual report

**Source effort:** ITU is a real API. AI Incident Database is a small public dataset. The other three are annual reports requiring lightweight scrapers. Subtotal: 5 indicators, 5 fetchers. About 4-5 days because of the report-scraping component.

**Honest flag:** Technology is the hardest civ domain to score because so many of its measurable outputs (capability, scale, throughput) are "up is up, but not always good." Every Technology headline indicator should have its `direction_preferred` carefully defended. Two of the five proposed are explicitly "down" framed (incidents, e-waste).

---

### Finance & Economy

**Horizon Goal frame:** capital flows toward life; wealth circulates; people have enough.

**Candidate headline indicators:**
- Global poverty headcount at $2.15/day (2017 PPP) — World Bank API (`SI.POV.DDAY`)
- Share of wealth held by top 1% (global) — World Inequality Database API
- Global debt-to-GDP ratio — IMF or BIS API
- Climate finance flows (USD bn from developed to developing economies) — OECD Climate Finance database
- Living wage gap (% of working population earning below local living wage) — WageIndicator Foundation, annual

**Source effort:** World Bank, WID, and IMF are real APIs. OECD climate finance is a CSV download. WageIndicator is a CSV/scrape. Subtotal: 5 indicators, 5 fetchers. About 3-4 days.

---

### Legacy

**Horizon Goal frame:** what is irreplaceable from before us is preserved; what we send forward is worthy of the people who come after.

**Candidate headline indicators:**
- Number of languages assessed as "endangered" or worse — UNESCO Atlas of Languages in Danger (annual, scrape)
- Indigenous land tenure recognised (Mha globally) — Land Mark map data, annual update
- Inscription rate of cultural heritage sites at risk — UNESCO World Heritage in Danger list (RSS/scrape)
- Per-capita museum/archive funding (global avg) — UIS UNESCO Institute for Statistics
- Plastic in the ocean (megatons accumulated) — Ocean Cleanup / Ourworldindata aggregate, annual

**Source effort:** This is the hardest domain to source rigorously. Heritage and language data is real but updates infrequently (annual). Ocean plastic is heavily modelled, not measured directly. Subtotal: 5 indicators, 4-5 fetchers. About 5-6 days because of the patchier data.

**Honest flag:** Legacy is the domain where contributor signals (Tier 3) matter most. Mainstream data sources poorly measure indigenous knowledge transmission, intergenerational continuity, or wabi-sabi/ma sensibilities — those need community attestation. The catalog should be supplemented with a richer Tier 3 protocol than the other domains.

---

### Vision

**Horizon Goal frame:** humanity orients toward a future worth wanting; collective imagination is alive.

**Candidate headline indicators:**
- Long-term thinking signal: % of national budgets with explicit 20+ year horizons — proxy: count of ratified UN long-term commitments (SDG progress reports)
- Existential risk attention: Doomsday Clock setting — Bulletin of the Atomic Scientists annual update
- Collective imagination signal: Global Risks Report — World Economic Forum annual top-10 risks framing
- Future-oriented R&D as % of GDP (global mean) — UNESCO UIS API
- Generational thinking: count of national policies citing future generations — proxy: Wellbeing of Future Generations Act trackers

**Source effort:** Vision is the most conceptually difficult domain. The proposed indicators are proxies; none directly measures "collective imagination." Most are Tier 2 (annual scrape). Subtotal: 5 indicators, 5 fetchers, but with significant proxy-design work. About 5-7 days plus methodology-note writing.

**Honest flag:** Vision should probably ship with fewer Tier 1 indicators and a heavy contributor-signal layer. The platform's distinctive value here is exactly the kind of Tier 3 input that mainstream data sources don't capture.

---

## Total scope

If all six domains ship with 5 headline indicators each, that's **30 new catalog rows** plus existing **34 Nature rows** = **64 total** at the headline level. Adding sub-domain (non-headline) indicators at the same density brings the catalog to roughly **180-220 rows total**.

Source handlers: I count **23 new fetchers** across the six domains. Most are simple JSON-API GETs (1-2 hours each). Three or four are annual-report scrapers (full day each). Realistic build estimate: **2-3 weeks of focused work** to bring all six domains to first-light.

This does not include:
- Per-Focus value resolution (currently planetary-only)
- Tier 3 contributor flow UI (separate build)
- Methodology-note writing for each indicator (drafted alongside the seed)

---

## Sequencing recommendation

Build in this order based on data availability and signal value:

1. **Human Being** — cleanest APIs (World Bank, WHO), fastest to first light, highest emotional weight. Ship first to validate the rollup pattern works at a second domain.
2. **Finance & Economy** — second-cleanest APIs, completes the "material conditions" axis with Human Being.
3. **Society** — adds the political/equity dimension.
4. **Technology** — requires more careful direction_preferred design but APIs are real.
5. **Legacy** — slower data, more contributor-signal work needed alongside.
6. **Vision** — most conceptually difficult; ship last so the platform's voice on it has time to develop.

Each domain ships as one zip with: catalog seed SQL + source handlers in `api/indicator-worker.js` + matching `target_value`/`floor_value` updates. The World View panel and rollup function need no further changes — they're already domain-agnostic.

---

## Open architectural questions

- **Per-Focus indicators.** Some indicators (PM2.5 city-level, water quality basin-level) carry per-Focus values via the `focus_id` column. The current rollup is planetary-only. When does per-Focus rollup matter for the wheel? My instinct: never for the top-level civ wheel; only when a user drills into a specific domain Focus. That's a B-4 conversation.

- **Coverage floor of 50%.** The B-2 rollup returns null if fewer than half the headline indicators are scoring. With 5 headlines per domain that means at least 3 must be fresh-and-current. With smaller seeds (e.g., during the first weeks of a new domain's catalog) this might mean the spoke shows "—" for a while. Should we:
  - (a) Lower the coverage floor temporarily? — risks shipping misleading numbers
  - (b) Accept the "—" until coverage is real? — recommended
  - (c) Flag the spoke as "preliminary" in the wheel UI? — adds visual complexity

  My recommendation: (b) — honest empty state until real coverage, and the World View panel already shows the "X of N scored" detail line so users understand why.

- **Decay vs static target/floor.** Some metrics (atmospheric CO₂) have target/floor values that should slide over decades. Pre-industrial CO₂ as the "target" is aspirational on geological timescales, not policy timescales. Eventually we may want target_value and floor_value to be functions of time, not constants. Not a B-3 problem, but worth noting in the catalog comments.

- **The contributor signal layer's relationship to the rollup.** Tier 3 signals are currently visible in the World View panel but do not contribute to the per-domain score. This is correct — contributor observations aren't the same evidentiary class as a NOAA atmospheric measurement. But it means a domain with a vibrant contributor community and weak Tier 1 data could read as "—" on the wheel even though there's clearly something happening. A future B-N might add a "qualitative readiness" indicator computed from signal volume, sentiment, and breadth — but not now.

---

## What this isn't

This brief is the indicator catalog plan. It is not:

- The personal-side equivalent (deferred — separate architectural conversation)
- The founder data console for editing catalog rows (next drop)
- The contributor signal contribution UI (later)
- A geospatial map of indicator readings (later, depends on per-Focus rollout)

Anything here that crosses into those domains is flagged inline.
