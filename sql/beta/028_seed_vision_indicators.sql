-- ─────────────────────────────────────────────────────────────────────────────
-- Module 11.7 — Vision civilisational domain indicator catalog
--
-- Source: NextUs Domain Structure v2 (Section 7: Vision) and Platform
-- Architecture v1.
-- Sub-domains: long-horizon-thinking, existential-risk-attention,
-- collective-imagination, future-orientation, futures-equity.
--
-- Headlines: 5 indicators carry is_headline=true. Picked because each
-- one reads against the Vision Horizon Goal — "humanity orients toward
-- a future worth wanting; collective imagination is alive; the long
-- arc is held by those who shape the present."
--
-- Honest framing for this domain (per the brief): Vision is the most
-- conceptually difficult domain to instrument. None of the proposed
-- indicators directly measures "collective imagination." Most are
-- proxies — surveys of long-term concern, formal commitments to
-- future generations, attention to existential risk. The platform's
-- distinctive value here is exactly the kind of Tier 3 input that
-- mainstream data sources don't capture: whether vision is alive
-- locally, whether communities are dreaming forward.
--
-- Tiering: 1 Tier 1 (live World Bank), 7 Tier 2 (catalog row + source
-- named, fetcher pending), 4 Tier 3 (contributor signals).
--
-- Idempotent on (domain_id, name, source_name).
--
-- Tagged principles introduced in this seed where existing slugs
-- don't carry:
--   • long-horizon-thinking — the indicator measures whether time
--                              horizons in collective decision-making
--                              extend beyond the immediate
--   • collective-imagination — the indicator measures the vitality of
--                              shared dreaming, world-building, and
--                              constructive possibility
-- Existing slugs reused: legacy-temporal-dimension (long arc), not-
-- knowing-stance (sitting with uncertainty), indigenous-relational
-- (community-based knowing of futures), capacity-cultivation
-- (developing the muscles of forward-thinking).
-- ─────────────────────────────────────────────────────────────────────────────

begin;

insert into nextus_domain_indicators (
  domain_id, subdomain_slug, lens_slugs, name, unit, tier,
  source_name, source_url, endpoint_url,
  native_resolution, refresh_cadence, direction_preferred,
  methodology_note, status, structure_version, tagged_principles,
  is_headline, headline_order
) values

-- ─── Existential Risk Attention ─────────────────────────────────────────────

(
  'vision', 'existential-risk-attention',
  array['existential-risk', 'global-catastrophe']::text[],
  'Doomsday Clock — seconds to midnight',
  'seconds',
  'scrape',
  'Bulletin of the Atomic Scientists',
  'https://thebulletin.org/doomsday-clock/',
  null,
  'planetary',
  'annual',
  'up',
  'The Doomsday Clock represents the Bulletin of the Atomic Scientists Science and Security Board''s assessment of how close humanity stands to human-made global catastrophe. Set annually each January, with midnight representing catastrophe. Set at 85 seconds to midnight as of January 27, 2026 — the closest the Clock has been to midnight in its 79-year history. Direction is "up" — more seconds = more time = a less imperilled assessment. Fetcher pending — annual statement is real and stable but not exposed via API.',
  'active', 'v3',
  array['long-horizon-thinking', 'not-knowing-stance']::text[],
  true, 1
),
(
  'vision', 'existential-risk-attention',
  array['global-risks']::text[],
  'Long-term global risks identified',
  'count of severe long-term risks',
  'scrape',
  'World Economic Forum Global Risks Report',
  'https://www.weforum.org/publications/global-risks-report/',
  null,
  'planetary',
  'annual',
  'down',
  'Number of risks classified as "severe" in the WEF Global Risks Report''s 10-year horizon. The report surveys ~1,000 risk experts, business leaders, and policymakers annually. Methodology critique: the report reflects elite consensus, not popular imagination of risk. Useful as one signal of where institutional attention is pointing. Fetcher pending — annual PDF report.',
  'active', 'v3',
  array['long-horizon-thinking']::text[],
  false, null
),
(
  'vision', 'existential-risk-attention',
  array['nuclear-arsenal']::text[],
  'Global nuclear warhead inventory',
  'warheads',
  'scrape',
  'Federation of American Scientists',
  'https://fas.org/initiative/status-of-world-nuclear-forces/',
  null,
  'planetary',
  'annual',
  'down',
  'Total nuclear warheads in global inventories — strategic, non-strategic, retired/awaiting dismantlement. FAS Nuclear Information Project maintains the most carefully sourced public estimate. Roughly 12,000 warheads globally as of recent estimates. Fetcher pending.',
  'active', 'v3',
  array['long-horizon-thinking', 'legacy-temporal-dimension']::text[],
  false, null
),

-- ─── Long-Horizon Thinking & Governance ─────────────────────────────────────

(
  'vision', 'long-horizon-thinking',
  array['future-generations', 'governance']::text[],
  'Jurisdictions with future-generations institutions',
  'count',
  'scrape',
  'School of International Futures / Future Generations Commissioner network',
  'https://soif.org.uk/',
  null,
  'planetary',
  'annual',
  'up',
  'Count of jurisdictions with formal future-generations institutions — Wales''s Wellbeing of Future Generations Commissioner, the UK''s proposed equivalent, Finland''s Committee for the Future, Hungary''s Ombudsman for Future Generations, etc. School of International Futures and the Future Generations Commissioner network maintain the catalog. Fetcher pending.',
  'active', 'v3',
  array['long-horizon-thinking', 'legacy-temporal-dimension']::text[],
  true, 2
),
(
  'vision', 'long-horizon-thinking',
  array['sdg-progress']::text[],
  'SDG Index global score',
  'score 0–100',
  'scrape',
  'Sustainable Development Report (Sachs et al.)',
  'https://dashboards.sdgindex.org/',
  null,
  'planetary',
  'annual',
  'up',
  'Composite score across the 17 UN Sustainable Development Goals, world aggregate. The SDGs themselves represent the most widely-ratified articulation of a shared 2030 future. Whether we are tracking toward them is one signal — flawed but defensible — of long-horizon delivery. Fetcher pending — annual report from the SDSN, available as PDF and dashboard.',
  'active', 'v3',
  array['long-horizon-thinking']::text[],
  true, 3
),
(
  'vision', 'long-horizon-thinking',
  array['constitutional', 'environmental-rights']::text[],
  'Constitutions recognising future generations',
  'count',
  'scrape',
  'Comparative Constitutions Project',
  'https://comparativeconstitutionsproject.org/',
  null,
  'planetary',
  'event-driven',
  'up',
  'Count of national constitutions that explicitly invoke obligations to future generations. Roughly 80 constitutions globally include such clauses (with varying enforcement). Comparative Constitutions Project maintains the dataset. Fetcher pending.',
  'active', 'v3',
  array['legacy-temporal-dimension', 'long-horizon-thinking']::text[],
  false, null
),

-- ─── Future Orientation & Capacity ──────────────────────────────────────────

(
  'vision', 'future-orientation',
  array['research-investment']::text[],
  'R&D expenditure',
  '% of GDP',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/GB.XPD.RSDV.GD.ZS',
  'https://api.worldbank.org/v2/country/WLD/indicator/GB.XPD.RSDV.GD.ZS?format=json&per_page=20',
  'planetary',
  'annual',
  'up',
  'Gross domestic expenditure on research and development as a share of GDP. UNESCO Institute for Statistics, World Bank pass-through. Vision reads R&D differently from Technology: here the question is whether collective resources are being put toward the future at all. The destination of that R&D matters, but the headline level is a baseline signal of future-orientation. Same indicator code as in Technology; intentional cross-domain reuse.',
  'active', 'v3',
  array['long-horizon-thinking', 'capacity-cultivation']::text[],
  true, 4
),
(
  'vision', 'future-orientation',
  array['climate-finance', 'long-term-investment']::text[],
  'Long-duration sovereign wealth funds',
  'count',
  'scrape',
  'Sovereign Wealth Fund Institute',
  'https://www.swfinstitute.org/',
  null,
  'planetary',
  'annual',
  'up',
  'Count of sovereign wealth funds with explicit intergenerational mandates (Norway''s Government Pension Fund, Alaska Permanent Fund, etc.). Fetcher pending. The presence of intergenerational financial vehicles is a structural signal of future-thinking, distinct from the political-attention indicators.',
  'active', 'v3',
  array['legacy-temporal-dimension', 'long-horizon-thinking']::text[],
  false, null
),

-- ─── Collective Imagination ─────────────────────────────────────────────────

(
  'vision', 'collective-imagination',
  array['imagination', 'world-building']::text[],
  'Vitality of collective imagination',
  'qualitative',
  'contributor',
  'NextUs contributor signals',
  null,
  null,
  'planetary',
  'event-driven',
  'context',
  'Whether communities are dreaming forward together — futures workshops, world-building, citizen visioning, scenario play, science-fiction reading groups, design fiction practice — is invisible to mainstream data. Tier 3 contributor-signal placeholder. The platform''s distinctive claim is that this kind of evidence belongs in the picture of civilisational health alongside the Doomsday Clock and SDG dashboards.',
  'active', 'v3',
  array['collective-imagination', 'indigenous-relational', 'capacity-cultivation']::text[],
  true, 5
),
(
  'vision', 'collective-imagination',
  array['art', 'speculative-culture']::text[],
  'Vitality of speculative culture',
  'qualitative',
  'contributor',
  'NextUs contributor signals',
  null,
  null,
  'planetary',
  'event-driven',
  'context',
  'Whether speculative literature, film, art, music, and design are alive in a community — the cultural muscles of imagining otherwise. Tier 3 placeholder. Distinct from cultural-vitality in Human Being: the question is specifically about future-facing imagination, not cultural employment in general.',
  'active', 'v3',
  array['collective-imagination']::text[],
  false, null
),
(
  'vision', 'collective-imagination',
  array['hope', 'forward-stance']::text[],
  'Reported hopefulness about the future',
  '% adults expressing hope',
  'scrape',
  'Edelman Trust Barometer / IPSOS What Worries the World',
  'https://www.edelman.com/trust/trust-barometer',
  null,
  'planetary',
  'annual',
  'up',
  'Share of adults expressing hopefulness about the future of their country and world. Drawn from cross-national survey research (Edelman Trust Barometer; IPSOS What Worries the World) which routinely asks variants of "do you think the next generation will be better off?" Fetcher pending. Caveat: a low score is not necessarily failure of vision — it may be honest reckoning with the present. Read alongside contributor signals.',
  'active', 'v3',
  array['collective-imagination']::text[],
  false, null
),

-- ─── Futures Equity ─────────────────────────────────────────────────────────

(
  'vision', 'futures-equity',
  array['youth-voice', 'agency']::text[],
  'Youth participation in policy decisions',
  'qualitative',
  'contributor',
  'NextUs contributor signals',
  null,
  null,
  'planetary',
  'event-driven',
  'context',
  'Whether young people — those who will live longest with present decisions — have meaningful voice in shaping those decisions. Mainstream cross-national data covers voting age and parliamentary representation by age but not the texture of youth agency in civic life. Tier 3 placeholder.',
  'active', 'v3',
  array['collective-imagination', 'democratic-agency']::text[],
  false, null
),
(
  'vision', 'futures-equity',
  array['indigenous-futures']::text[],
  'Indigenous futures voice',
  'qualitative',
  'contributor',
  'NextUs contributor signals',
  null,
  null,
  'planetary',
  'event-driven',
  'context',
  'Whether indigenous communities are present at the tables where collective futures are being shaped — climate negotiations, planning processes, governance design. Tier 3 placeholder. The Legacy domain tracks land-tenure recognition; this Vision-domain indicator asks the forward-facing complement: is indigenous knowledge shaping where we go, not only honoured for where we''ve been?',
  'active', 'v3',
  array['collective-imagination', 'indigenous-relational', 'democratic-agency']::text[],
  false, null
)

on conflict (domain_id, name, source_name) do update
set
  subdomain_slug      = excluded.subdomain_slug,
  lens_slugs          = excluded.lens_slugs,
  unit                = excluded.unit,
  tier                = excluded.tier,
  source_url          = excluded.source_url,
  endpoint_url        = excluded.endpoint_url,
  native_resolution   = excluded.native_resolution,
  refresh_cadence     = excluded.refresh_cadence,
  direction_preferred = excluded.direction_preferred,
  methodology_note    = excluded.methodology_note,
  status              = excluded.status,
  structure_version   = excluded.structure_version,
  tagged_principles   = excluded.tagged_principles,
  is_headline         = excluded.is_headline,
  headline_order      = excluded.headline_order,
  updated_at          = now();

-- ─── Headline rollup target/floor seeding ────────────────────────────────────
--
-- Five headline indicators. One is Tier 1 (R&D expenditure via World
-- Bank). Three are Tier 2 — Doomsday Clock, future-generations
-- institutions, SDG Index. One is Tier 3 contributor (vitality of
-- collective imagination), direction "context", does not contribute
-- to rollup.
--
-- Same pattern as Legacy: a Tier 3 placeholder gets headline status
-- because it deserves visibility, even though it cannot be numerically
-- scored. Headline = importance, not scoreability.
--
-- The Vision spoke will draw a real number once at least 2 of the 4
-- scoreable headlines have data (50% of 4 = 2). R&D expenditure is
-- live on day one through the World Bank handler, so the spoke needs
-- one more Tier 2 fetcher to come online before it leaves "—".
--
-- Defensible breakpoints:
--
-- Doomsday Clock — seconds to midnight (up):
--   target=900   — 15 minutes to midnight, the post-Cold-War lows
--     achieved in the early 1990s after major arms-reduction treaties.
--     Returning to that level would represent a meaningful step back
--     from existential brink.
--   floor=30    — under 30 seconds to midnight has never been seen and
--     would represent an actively imminent assessment. The Clock is
--     currently at 85 seconds (the closest in its 79-year history).
--
-- Jurisdictions with future-generations institutions (count, up):
--   target=50   — fifty jurisdictions with formal future-generations
--     bodies would represent a meaningful shift in the architecture
--     of governance. Aspirational but anchored in the existing trend
--     (Wales, Finland, Hungary, UAE, EU proposals all in motion).
--   floor=5    — sustained presence below 5 jurisdictions would
--     indicate the experiment has stalled. Currently around 10–15
--     depending on definition stringency.
--
-- SDG Index global score (0–100, up):
--   target=85   — the score sustained by the highest-performing
--     countries today (Finland, Sweden, Denmark). Globally hitting
--     this would represent the SDGs being broadly delivered.
--   floor=50    — global mean has been in the high 60s for several
--     years. Falling toward 50 would represent meaningful regression
--     in the shared 2030 horizon.
--
-- R&D expenditure (% of GDP, up):
--   target=4    — the share sustained by R&D-intensive economies
--     today (Israel, South Korea). Globally this would represent a
--     significant collective bet on the future.
--   floor=1    — sustained world average below 1% would represent
--     under-investment in collective forward-looking capacity.
--     Current global value is around 2.6%.
--
-- Vitality of collective imagination (qualitative, context):
--   No target/floor — direction "context", does not contribute. Headline
--   status reflects importance.

update nextus_domain_indicators
  set target_value = 900, floor_value = 30
  where domain_id = 'vision'
    and name = 'Doomsday Clock — seconds to midnight'
    and source_name = 'Bulletin of the Atomic Scientists';

update nextus_domain_indicators
  set target_value = 50, floor_value = 5
  where domain_id = 'vision'
    and name = 'Jurisdictions with future-generations institutions'
    and source_name = 'School of International Futures / Future Generations Commissioner network';

update nextus_domain_indicators
  set target_value = 85, floor_value = 50
  where domain_id = 'vision'
    and name = 'SDG Index global score'
    and source_name = 'Sustainable Development Report (Sachs et al.)';

update nextus_domain_indicators
  set target_value = 4, floor_value = 1
  where domain_id = 'vision'
    and name = 'R&D expenditure'
    and source_name = 'World Bank WDI';

commit;

-- ─── Rollback (reference only)
-- delete from nextus_domain_indicators where domain_id = 'vision';
