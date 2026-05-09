-- ─────────────────────────────────────────────────────────────────────────────
-- Module 11.6 — Legacy civilisational domain indicator catalog
--
-- Source: NextUs Domain Structure v2 (Section 6: Legacy) and Platform
-- Architecture v1.
-- Sub-domains: cultural-heritage, language-knowledge, indigenous-stewardship,
-- intergenerational-handoff, planetary-bequest, archive-memory.
--
-- Headlines: 5 indicators carry is_headline=true. Picked because each
-- one reads against the Legacy Horizon Goal — "what is irreplaceable
-- from before us is preserved; what we send forward is worthy of the
-- people who come after."
--
-- Honest framing for this domain (per the brief): Legacy is the
-- hardest civ domain to source rigorously. Mainstream statistical
-- pipelines do not measure indigenous knowledge transmission,
-- intergenerational continuity, ritual, the living relationship
-- between people and what came before. The Tier 1 share is therefore
-- low, the Tier 3 contributor share is intentionally larger than in
-- other domains. The Tier 3 placeholders are not gap-fillers — they
-- are the centre of how this domain becomes legible.
--
-- Tiering: 2 Tier 1 (live World Bank), 8 Tier 2 (catalog row + source
-- named, fetcher pending), 4 Tier 3 (contributor signals).
--
-- Idempotent on (domain_id, name, source_name).
--
-- Tagged principles introduced in this seed where existing slugs
-- don't carry:
--   • intergenerational-continuity — what gets transmitted forward
--                                     across generations
--   • irreplaceability             — the indicator measures something
--                                     that, once lost, cannot be
--                                     reconstructed
-- Existing slugs reused: indigenous-relational (heavy use here),
-- legacy-temporal-dimension (the long arc), substrate-health (the
-- planetary substrate as bequest), capacity-cultivation (transmission
-- of skill and knowledge).
-- ─────────────────────────────────────────────────────────────────────────────

begin;

insert into nextus_domain_indicators (
  domain_id, subdomain_slug, lens_slugs, name, unit, tier,
  source_name, source_url, endpoint_url,
  native_resolution, refresh_cadence, direction_preferred,
  methodology_note, status, structure_version, tagged_principles,
  is_headline, headline_order
) values

-- ─── Cultural Heritage ──────────────────────────────────────────────────────

(
  'legacy', 'cultural-heritage',
  array['heritage', 'sites']::text[],
  'World Heritage Sites in Danger',
  'count',
  'scrape',
  'UNESCO World Heritage Centre',
  'https://whc.unesco.org/en/danger/',
  null,
  'planetary',
  'event-driven',
  'down',
  'Number of UNESCO World Heritage sites currently inscribed on the List of World Heritage in Danger. Updated annually following each World Heritage Committee session (typically June/July). Currently around 55 sites globally, including the Historic Centre of Odesa added under emergency procedure in 2023. Fetcher pending — data is real and stable but lives on an HTML list page, not behind an API.',
  'active', 'v3',
  array['irreplaceability', 'legacy-temporal-dimension']::text[],
  true, 1
),
(
  'legacy', 'cultural-heritage',
  array['heritage', 'sites']::text[],
  'World Heritage Sites total inscribed',
  'count',
  'scrape',
  'UNESCO World Heritage Centre',
  'https://whc.unesco.org/en/list/',
  null,
  'planetary',
  'annual',
  'context',
  'Total number of World Heritage Sites globally — currently around 1,200 across 167 countries. Context indicator: more inscriptions reflect growing recognition but also growing maintenance and protection responsibility.',
  'active', 'v3',
  array['legacy-temporal-dimension']::text[],
  false, null
),
(
  'legacy', 'cultural-heritage',
  array['intangible-heritage', 'living-traditions']::text[],
  'Intangible heritage elements requiring urgent safeguarding',
  'count',
  'scrape',
  'UNESCO Intangible Cultural Heritage',
  'https://ich.unesco.org/en/lists',
  null,
  'planetary',
  'annual',
  'down',
  'Count of practices, expressions, knowledge, and skills inscribed on the UNESCO List of Intangible Cultural Heritage in Need of Urgent Safeguarding. Living traditions identified as at imminent risk of disappearance — distinct from physical sites. Fetcher pending.',
  'active', 'v3',
  array['irreplaceability', 'indigenous-relational', 'intergenerational-continuity']::text[],
  false, null
),

-- ─── Language & Knowledge ───────────────────────────────────────────────────

(
  'legacy', 'language-knowledge',
  array['endangered-languages']::text[],
  'Endangered languages',
  'count',
  'scrape',
  'UNESCO World Atlas of Languages',
  'https://en.wal.unesco.org/',
  null,
  'planetary',
  'annual',
  'down',
  'Count of languages classified as vulnerable, definitely endangered, severely endangered, or critically endangered. The legacy UNESCO Atlas of the World''s Languages in Danger listed roughly 2,500 endangered languages. The successor World Atlas of Languages (WAL) was offline as of January 2026 pending data update; once back online it expands beyond endangerment to all living languages. Approximately 40% of the world''s ~7,000 languages are estimated endangered. Fetcher pending alongside source restoration.',
  'active', 'v3',
  array['irreplaceability', 'indigenous-relational', 'intergenerational-continuity']::text[],
  true, 2
),
(
  'legacy', 'language-knowledge',
  array['endangered-languages']::text[],
  'Languages extinct since 1950',
  'count',
  'scrape',
  'UNESCO / Ethnologue',
  'https://www.ethnologue.com/',
  null,
  'planetary',
  'annual',
  'down',
  'Cumulative count of languages assessed as having lost all known speakers since 1950. The Atlas presumes extinction if there have been no known speakers since the 1950s. Roughly 230 languages catalogued as extinct in this period. Fetcher pending.',
  'active', 'v3',
  array['irreplaceability', 'indigenous-relational']::text[],
  false, null
),
(
  'legacy', 'language-knowledge',
  array['indigenous-knowledge', 'transmission']::text[],
  'Indigenous knowledge transmission',
  'qualitative',
  'contributor',
  'NextUs contributor signals',
  null,
  null,
  'planetary',
  'event-driven',
  'context',
  'No mainstream cross-national dataset measures whether indigenous knowledge — land relationships, ceremony, plant medicine, oral histories, sky-reading, storytelling traditions — is being transmitted to younger generations. This is exactly the terrain Tier 3 contributor signals exist for. Communities surface the texture of transmission that statistical pipelines structurally cannot see.',
  'active', 'v3',
  array['indigenous-relational', 'intergenerational-continuity', 'capacity-cultivation']::text[],
  false, null
),

-- ─── Indigenous Stewardship ─────────────────────────────────────────────────

(
  'legacy', 'indigenous-stewardship',
  array['land-tenure', 'stewardship']::text[],
  'Indigenous and community land recognised',
  'Mha',
  'scrape',
  'LandMark Global Platform',
  'https://www.landmarkmap.org/',
  null,
  'planetary',
  'annual',
  'up',
  'Total area (millions of hectares) of land formally recognised as indigenous- or community-held globally. LandMark partnership of indigenous, environmental, and research organisations. Fetcher pending. This indicator is also catalogued in Nature (Earth sub-domain) — Legacy reads it through the intergenerational-stewardship lens: who holds the long-arc relationship with the land.',
  'active', 'v3',
  array['indigenous-relational', 'legacy-temporal-dimension', 'substrate-health']::text[],
  true, 3
),
(
  'legacy', 'indigenous-stewardship',
  array['indigenous-rights']::text[],
  'Countries ratifying ILO 169',
  'count',
  'scrape',
  'International Labour Organization',
  'https://www.ilo.org/dyn/normlex/en/f?p=NORMLEXPUB:11300:0::NO::P11300_INSTRUMENT_ID:312314',
  null,
  'planetary',
  'event-driven',
  'up',
  'Number of states having ratified ILO Convention 169 — the only binding international instrument on indigenous and tribal peoples'' rights. Currently around 24 ratifying states. Fetcher pending — ILO NORMLEX has structured pages but ratification updates are slow and event-driven. Direction "up" — more ratification represents stronger formal recognition, though it does not guarantee implementation.',
  'active', 'v3',
  array['indigenous-relational', 'democratic-agency']::text[],
  false, null
),
(
  'legacy', 'indigenous-stewardship',
  array['traditional-knowledge', 'commons']::text[],
  'Living relationship with land',
  'qualitative',
  'contributor',
  'NextUs contributor signals',
  null,
  null,
  'planetary',
  'event-driven',
  'context',
  'Whether human communities are in living relationship with the land they inhabit — gathering, fishing, hunting, growing, ceremony, story — is the substrate of legacy that almost no statistical pipeline sees. Land tenure measures the legal frame; this Tier 3 indicator captures the relationship inside it.',
  'active', 'v3',
  array['indigenous-relational', 'intergenerational-continuity']::text[],
  false, null
),

-- ─── Intergenerational Handoff ──────────────────────────────────────────────

(
  'legacy', 'intergenerational-handoff',
  array['demographics', 'youth']::text[],
  'Population aged under 15',
  '% of total',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/SP.POP.0014.TO.ZS',
  'https://api.worldbank.org/v2/country/WLD/indicator/SP.POP.0014.TO.ZS?format=json&per_page=20',
  'planetary',
  'annual',
  'context',
  'Share of population aged 0–14. Context indicator: not directional — both very high (overstretched care burden) and very low (rapid ageing) values carry intergenerational stress. Useful as Legacy-domain context.',
  'active', 'v3',
  array['intergenerational-continuity']::text[],
  false, null
),
(
  'legacy', 'intergenerational-handoff',
  array['demographics', 'elders']::text[],
  'Population aged 65 and over',
  '% of total',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/SP.POP.65UP.TO.ZS',
  'https://api.worldbank.org/v2/country/WLD/indicator/SP.POP.65UP.TO.ZS?format=json&per_page=20',
  'planetary',
  'annual',
  'context',
  'Share of population aged 65+. Context indicator. The Legacy reading of this number is "are elders carried forward in the social fabric or set apart?" — a question this number cannot answer. Tier 3 contributor signals carry the qualitative side.',
  'active', 'v3',
  array['intergenerational-continuity']::text[],
  false, null
),
(
  'legacy', 'intergenerational-handoff',
  array['intergenerational-presence']::text[],
  'Vitality of intergenerational presence',
  'qualitative',
  'contributor',
  'NextUs contributor signals',
  null,
  null,
  'planetary',
  'event-driven',
  'context',
  'Whether elders are present in the daily texture of community life — caring for children, telling stories, holding ceremony, shaping decisions — versus structurally separated into care institutions. No mainstream dataset measures this. Tier 3 placeholder.',
  'active', 'v3',
  array['indigenous-relational', 'intergenerational-continuity']::text[],
  false, null
),

-- ─── Planetary Bequest ──────────────────────────────────────────────────────

(
  'legacy', 'planetary-bequest',
  array['extinction', 'biodiversity']::text[],
  'Species extinctions documented',
  'species since 1500',
  'scrape',
  'IUCN Red List',
  'https://www.iucnredlist.org/',
  null,
  'planetary',
  'annual',
  'down',
  'Cumulative count of species formally documented as extinct since 1500 by the IUCN Red List. Direction "down" but the count only goes up — target/floor framed accordingly. Fetcher pending — IUCN Red List API exists but requires registration; awaiting verification of stable access.',
  'active', 'v3',
  array['irreplaceability', 'substrate-health', 'legacy-temporal-dimension']::text[],
  true, 4
),
(
  'legacy', 'planetary-bequest',
  array['ocean-pollution', 'plastic']::text[],
  'Plastic in the ocean (cumulative)',
  'megatonnes',
  'scrape',
  'Our World in Data / OECD modelled estimates',
  'https://ourworldindata.org/ocean-plastics',
  null,
  'planetary',
  'annual',
  'down',
  'Cumulative megatonnes of plastic accumulated in oceans, modelled estimate. Heavily modelled — direct measurement is impossible at this scale. Best available estimates suggest tens of megatonnes accumulated and growing. Fetcher pending. Caveat: this is an inferred quantity, not measured; treat with the appropriate epistemic humility.',
  'active', 'v3',
  array['substrate-health', 'irreplaceability', 'legacy-temporal-dimension']::text[],
  false, null
),
(
  'legacy', 'planetary-bequest',
  array['climate-debt']::text[],
  'Cumulative CO₂ emissions',
  'GtCO₂ since 1750',
  'scrape',
  'Global Carbon Project',
  'https://www.globalcarbonproject.org/',
  null,
  'planetary',
  'annual',
  'down',
  'Cumulative anthropogenic CO₂ emissions since the start of the industrial era. The atmospheric debt being handed forward. Global Carbon Budget is released annually each November. Fetcher pending — annual report data, no live API.',
  'active', 'v3',
  array['substrate-health', 'irreplaceability', 'legacy-temporal-dimension']::text[],
  false, null
),

-- ─── Archive & Memory ───────────────────────────────────────────────────────

(
  'legacy', 'archive-memory',
  array['archives', 'public-memory']::text[],
  'Archives at risk',
  'collections flagged',
  'scrape',
  'UNESCO Memory of the World',
  'https://www.unesco.org/en/memory-world',
  null,
  'planetary',
  'event-driven',
  'down',
  'Count of documentary heritage collections inscribed on UNESCO Memory of the World register flagged as at-risk (climate, conflict, neglect). Triennial inscription cycles. Fetcher pending.',
  'active', 'v3',
  array['irreplaceability', 'legacy-temporal-dimension']::text[],
  false, null
),
(
  'legacy', 'archive-memory',
  array['libraries', 'public-knowledge']::text[],
  'Public library access',
  'libraries per 100,000',
  'scrape',
  'IFLA Library Map of the World',
  'https://librarymap.ifla.org/',
  null,
  'planetary',
  'annual',
  'up',
  'Public libraries per 100,000 people. International Federation of Library Associations Library Map of the World. Patchy data; some countries report robustly, others sparsely. Fetcher pending.',
  'active', 'v3',
  array['legacy-temporal-dimension', 'capacity-cultivation']::text[],
  false, null
),
(
  'legacy', 'archive-memory',
  array['oral-tradition', 'living-memory']::text[],
  'Vitality of oral tradition',
  'qualitative',
  'contributor',
  'NextUs contributor signals',
  null,
  null,
  'planetary',
  'event-driven',
  'context',
  'Story-telling, song-carrying, history-keeping in oral form — most of human memory has lived this way and still does in many communities. Statistical pipelines cannot see whether oral tradition is alive. Tier 3 placeholder. The platform''s distinct claim is that this kind of evidence belongs in the picture of civilisational health.',
  'active', 'v3',
  array['indigenous-relational', 'intergenerational-continuity', 'irreplaceability']::text[],
  true, 5
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
-- Five headline indicators. None are Tier 1. Four are Tier 2 with
-- defensible target/floor; one is Tier 3 contributor (vitality of oral
-- tradition) which carries direction_preferred='context' and therefore
-- never contributes to the rollup. That last is intentional — Legacy's
-- most important Tier 3 placeholder is a headline because it deserves
-- to be visible at the headline level, even though it cannot be
-- numerically scored.
--
-- The practical effect: the Legacy spoke will show "—" until at least
-- two of the four scoreable headline fetchers come online (50% of 4 =
-- 2). That is the honest empty state the brief and the agreed
-- principles call for.
--
-- Defensible breakpoints:
--
-- World Heritage Sites in Danger (count, down):
--   target=10  — historical floor in the late 1990s before the war,
--     climate, and tourism pressure of the 2010s–2020s pushed the
--     count up. Sustained low single digits would represent a world
--     in much better repair.
--   floor=80   — sustained 80+ would represent a global heritage
--     emergency. The list has hovered around 50–55 in recent years
--     after a 2010s peak.
--
-- Endangered languages (count, down):
--   target=1500 — meaningfully fewer endangered languages than today,
--     achieved through revitalisation programmes (Maori, Welsh, Irish,
--     Hebrew, Quechua revitalisation are real precedents). Aspirational.
--   floor=3500  — ~half of the world''s ~7,000 languages classified as
--     endangered would represent severe linguistic-diversity collapse.
--     Currently estimated around 2,500–2,800.
--
-- Indigenous and community land recognised (Mha, up):
--   target=2000 — a 2x of currently-recognised indigenous and community
--     land globally would represent a significant land-tenure shift.
--     Roughly aligned with estimates of land already under indigenous
--     stewardship but not formally recognised.
--   floor=500   — sustained recognition below 500 Mha would indicate
--     stalled or reversed formal recognition.
--
-- Species extinctions documented (cumulative since 1500, down):
--   target=900 — the cumulative count documented as extinct around
--     2010 in IUCN Red List. Returning to that level is impossible
--     (the count only grows) — the target represents zero further
--     additions, which is the only defensible aspiration. Note: this
--     target/floor design means current values give a low score that
--     can only get lower as new extinctions are recorded; this is
--     correct for an irreversibility metric. The "score" is a tally
--     of debt, not a goal.
--   floor=2000  — cumulative documented extinctions reaching 2000 would
--     represent severe acceleration of the current crisis.
--
-- Vitality of oral tradition (qualitative, context):
--   No target/floor — direction is "context", does not contribute to
--   the rollup. Headline status reflects importance, not scoreability.

update nextus_domain_indicators
  set target_value = 10, floor_value = 80
  where domain_id = 'legacy'
    and name = 'World Heritage Sites in Danger'
    and source_name = 'UNESCO World Heritage Centre';

update nextus_domain_indicators
  set target_value = 1500, floor_value = 3500
  where domain_id = 'legacy'
    and name = 'Endangered languages'
    and source_name = 'UNESCO World Atlas of Languages';

update nextus_domain_indicators
  set target_value = 2000, floor_value = 500
  where domain_id = 'legacy'
    and name = 'Indigenous and community land recognised'
    and source_name = 'LandMark Global Platform';

update nextus_domain_indicators
  set target_value = 900, floor_value = 2000
  where domain_id = 'legacy'
    and name = 'Species extinctions documented'
    and source_name = 'IUCN Red List';

commit;

-- ─── Rollback (reference only)
-- delete from nextus_domain_indicators where domain_id = 'legacy';
