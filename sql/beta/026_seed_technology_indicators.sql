-- ─────────────────────────────────────────────────────────────────────────────
-- Module 11.5 — Technology civilisational domain indicator catalog
--
-- Source: NextUs Domain Structure v2 (Section 4: Technology) and Platform
-- Architecture v1 (Section 2.4: Technology — Tools of Civilization).
-- Sub-domains: access-infrastructure, ai-safety, materials-substrate,
-- pollution-waste, energy-impact, digital-rights.
--
-- Headlines: 5 indicators carry is_headline=true. Picked because each
-- one reads directly against the Technology Horizon Goal — "technology
-- amplifies human and planetary flourishing without undermining
-- agency, equity, or ecological stability."
--
-- Honest framing for this domain: Technology is the hardest civ
-- domain to score because its measurable outputs are mostly
-- quantitative growth signals — capability, scale, throughput —
-- which are "up is up but not always good." Two of five headlines
-- are therefore explicitly inverted (incidents and e-waste, both
-- "down" framed). One is "context" framed (R&D intensity), so it
-- does not contribute to the rollup. The remaining two are access
-- metrics where universality is genuinely the horizon.
--
-- Tiering: 7 Tier 1 (live World Bank), 7 Tier 2 (catalog row +
-- source named, fetcher pending), 1 Tier 3 (contributor signal).
--
-- Idempotent on (domain_id, name, source_name).
--
-- Tagged principles introduced in this seed where existing slugs
-- don't carry:
--   • technology-substrate-health — the materials, energy, and
--                                    waste substrate beneath all
--                                    technological systems is healthy
--   • dual-use-attention          — the indicator measures both
--                                    capability AND its consequences,
--                                    not capability alone
-- Existing slugs reused: dignity-floor (universal access),
-- capacity-cultivation (digital literacy), substrate-health (where
-- tech consumes ecological substrate), legacy-temporal-dimension
-- (intergenerational handoff of digital + materials systems).
-- ─────────────────────────────────────────────────────────────────────────────

begin;

insert into nextus_domain_indicators (
  domain_id, subdomain_slug, lens_slugs, name, unit, tier,
  source_name, source_url, endpoint_url,
  native_resolution, refresh_cadence, direction_preferred,
  methodology_note, status, structure_version, tagged_principles,
  is_headline, headline_order
) values

-- ─── Access & Infrastructure ────────────────────────────────────────────────

(
  'technology', 'access-infrastructure',
  array['internet', 'access']::text[],
  'Internet penetration',
  '% of population',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/IT.NET.USER.ZS',
  'https://api.worldbank.org/v2/country/WLD/indicator/IT.NET.USER.ZS?format=json&per_page=20',
  'planetary',
  'annual',
  'up',
  'Share of the global population using the internet, sourced from ITU via World Bank. Floor measurement of access to the digital commons. Says nothing about quality, freedom, or surveillance posture of that access — paired with digital-rights indicators in this domain.',
  'active', 'v3',
  array['dignity-floor', 'capacity-cultivation']::text[],
  true, 1
),
(
  'technology', 'access-infrastructure',
  array['mobile', 'access']::text[],
  'Mobile cellular subscriptions',
  'per 100 people',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/IT.CEL.SETS.P2',
  'https://api.worldbank.org/v2/country/WLD/indicator/IT.CEL.SETS.P2?format=json&per_page=20',
  'planetary',
  'annual',
  'context',
  'Mobile cellular subscriptions per 100 people. Subscriptions exceed 100 globally (multi-SIM ownership common). Context indicator at world aggregate.',
  'active', 'v3',
  array['capacity-cultivation']::text[],
  false, null
),
(
  'technology', 'access-infrastructure',
  array['broadband']::text[],
  'Fixed broadband subscriptions',
  'per 100 people',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/IT.NET.BBND.P2',
  'https://api.worldbank.org/v2/country/WLD/indicator/IT.NET.BBND.P2?format=json&per_page=20',
  'planetary',
  'annual',
  'up',
  'Fixed broadband subscriptions per 100 inhabitants. Captures the higher-bandwidth substrate beneath remote work, education, and civic life — distinct from mobile subscriptions which can be limited and metered.',
  'active', 'v3',
  array['capacity-cultivation']::text[],
  false, null
),
(
  'technology', 'access-infrastructure',
  array['electricity', 'access']::text[],
  'Access to electricity',
  '% of population',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS',
  'https://api.worldbank.org/v2/country/WLD/indicator/EG.ELC.ACCS.ZS?format=json&per_page=20',
  'planetary',
  'annual',
  'up',
  'Share of the global population with access to electricity. The substrate beneath every other digital system. Sourced from the World Bank Tracking SDG7 framework. Strong claim on the dignity-floor: access to electricity is a precondition for almost everything else this domain measures.',
  'active', 'v3',
  array['dignity-floor', 'technology-substrate-health']::text[],
  true, 2
),

-- ─── AI Safety & Risk ───────────────────────────────────────────────────────

(
  'technology', 'ai-safety',
  array['ai', 'incidents', 'risk']::text[],
  'AI incidents recorded',
  'incidents / year',
  'scrape',
  'AI Incident Database',
  'https://incidentdatabase.ai/',
  null,
  'planetary',
  'monthly',
  'down',
  'Annual count of recorded AI incidents — events where AI systems caused or nearly caused harm to people, property, or the environment. Curated by the Responsible AI Collaborative. Exposed via a public GraphQL endpoint at /api/graphql; fetcher pending verification of stable query shape. Direction is "down" but with care: rising counts may also reflect better surveillance rather than worse outcomes.',
  'active', 'v3',
  array['dual-use-attention']::text[],
  true, 3
),
(
  'technology', 'ai-safety',
  array['ai', 'governance']::text[],
  'AI safety policy adoption',
  'count of jurisdictions with binding AI law',
  'scrape',
  'OECD.AI Policy Observatory',
  'https://oecd.ai/en/dashboards/policy-instruments',
  null,
  'planetary',
  'monthly',
  'up',
  'Number of jurisdictions with binding AI safety legislation in force (e.g. EU AI Act, UK AISI mandate, national equivalents). OECD.AI Policy Observatory tracks the global landscape. Fetcher pending — observatory is a database, not yet a clean API.',
  'active', 'v3',
  array['dual-use-attention', 'democratic-agency']::text[],
  false, null
),
(
  'technology', 'ai-safety',
  array['ai', 'capability']::text[],
  'Frontier AI capability signal',
  'qualitative',
  'contributor',
  'NextUs contributor signals',
  null,
  null,
  'planetary',
  'event-driven',
  'context',
  'Frontier AI capability outpaces formal benchmarks within months. Contributor signals capture practitioner observations that statistical pipelines miss — model behaviour shifts, deployment pattern changes, capability surprises. Tier 3 placeholder.',
  'active', 'v3',
  array['dual-use-attention', 'not-knowing-stance']::text[],
  false, null
),

-- ─── Materials Substrate ─────────────────────────────────────────────────────

(
  'technology', 'materials-substrate',
  array['critical-minerals', 'concentration']::text[],
  'Critical minerals supply concentration',
  'Herfindahl index',
  'scrape',
  'USGS Mineral Commodity Summaries',
  'https://www.usgs.gov/centers/national-minerals-information-center/mineral-commodity-summaries',
  null,
  'planetary',
  'annual',
  'down',
  'Herfindahl-Hirschman concentration index across the top mining-country shares for rare earths, lithium, cobalt, and other technology-critical minerals. USGS publishes Mineral Commodity Summaries annually as PDF/CSV. Fetcher pending. Lower is better — supply diversity reduces strategic vulnerability and gives bargaining power to host communities.',
  'active', 'v3',
  array['technology-substrate-health', 'substrate-health', 'legacy-temporal-dimension']::text[],
  false, null
),
(
  'technology', 'materials-substrate',
  array['rare-earths']::text[],
  'Rare earth element production',
  'tonnes',
  'scrape',
  'USGS Mineral Commodity Summaries',
  'https://www.usgs.gov/centers/national-minerals-information-center/mineral-commodity-summaries',
  null,
  'planetary',
  'annual',
  'context',
  'Total annual production of rare earth oxides globally. Context indicator: rising production reflects clean-energy and digital infrastructure demand but also extraction pressure. Direction is "context" so it does not contribute to the rollup.',
  'active', 'v3',
  array['substrate-health']::text[],
  false, null
),

-- ─── Pollution & Waste ──────────────────────────────────────────────────────

(
  'technology', 'pollution-waste',
  array['e-waste']::text[],
  'Global e-waste generation per capita',
  'kg / person / year',
  'scrape',
  'Global E-waste Monitor (UNITAR / ITU)',
  'https://globalewaste.org/',
  null,
  'planetary',
  'annual',
  'down',
  'Per capita generation of electronic and electrical equipment waste, from the Global E-waste Monitor (UNITAR + ITU + Fondation Carmignac). Most recent data point: 7.8 kg/capita in 2022, projected to rise to ~10 kg/capita by 2030 if trajectory holds. Fetcher pending — biennial PDF report, no live API. The Global E-waste Statistics Partnership maintains an open database at globalewaste.org.',
  'active', 'v3',
  array['technology-substrate-health', 'substrate-health', 'legacy-temporal-dimension']::text[],
  true, 4
),
(
  'technology', 'pollution-waste',
  array['e-waste', 'recycling']::text[],
  'E-waste formally recycled',
  '% of generated',
  'scrape',
  'Global E-waste Monitor (UNITAR / ITU)',
  'https://globalewaste.org/',
  null,
  'planetary',
  'annual',
  'up',
  'Share of generated e-waste documented as formally collected and recycled in environmentally sound systems. 22.3% in 2022, projected to fall to 20% by 2030 in business-as-usual. Fetcher pending alongside generation series.',
  'active', 'v3',
  array['technology-substrate-health', 'circulation']::text[],
  false, null
),

-- ─── Energy Impact ──────────────────────────────────────────────────────────

(
  'technology', 'energy-impact',
  array['data-centres', 'compute']::text[],
  'Data centre electricity consumption',
  'TWh / year',
  'scrape',
  'IEA Electricity Information',
  'https://www.iea.org/reports/electricity-2024',
  null,
  'planetary',
  'annual',
  'context',
  'Annual electricity consumption attributable to data centres globally. IEA estimated ~415 TWh in 2024, projected to roughly double by 2030 driven by AI training and inference. Direction is "context" because rising demand also reflects beneficial digitalisation. The emissions footprint of that electricity is the substrate-health concern, not the kWh itself. Fetcher pending — IEA annual report.',
  'active', 'v3',
  array['technology-substrate-health', 'dual-use-attention']::text[],
  false, null
),
(
  'technology', 'energy-impact',
  array['renewable-energy']::text[],
  'Renewable share of electricity generation',
  '% of total',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/EG.ELC.RNEW.ZS',
  'https://api.worldbank.org/v2/country/WLD/indicator/EG.ELC.RNEW.ZS?format=json&per_page=20',
  'planetary',
  'annual',
  'up',
  'Share of global electricity generated from renewable sources (excluding hydroelectric in some series; this indicator includes all renewables). World Bank pass-through of IEA / IRENA data. Direction is "up" — the cleaner the substrate beneath all digital systems, the better. This indicator overlaps Nature''s climate frame but lives in Technology because it measures the energy substrate of technological systems.',
  'active', 'v3',
  array['technology-substrate-health', 'substrate-health']::text[],
  true, 5
),

-- ─── Digital Rights ─────────────────────────────────────────────────────────

(
  'technology', 'digital-rights',
  array['surveillance']::text[],
  'Internet shutdowns recorded',
  'shutdowns / year',
  'scrape',
  'Access Now / KeepItOn',
  'https://www.accessnow.org/campaign/keepiton/',
  null,
  'planetary',
  'annual',
  'down',
  'Annual count of intentional internet disruptions imposed by governments or actors, documented by Access Now''s #KeepItOn coalition. Annual report releases. Fetcher pending. Direction "down" — internet access withdrawn from a population is a clear democratic-agency violation regardless of stated rationale.',
  'active', 'v3',
  array['democratic-agency', 'dignity-floor']::text[],
  false, null
),
(
  'technology', 'digital-rights',
  array['privacy', 'data-protection']::text[],
  'Countries with comprehensive data protection law',
  'count',
  'scrape',
  'UNCTAD Data Protection Tracker',
  'https://unctad.org/page/data-protection-and-privacy-legislation-worldwide',
  null,
  'planetary',
  'annual',
  'up',
  'Number of countries with comprehensive data protection / privacy legislation in force. UNCTAD tracks ~140 jurisdictions. Fetcher pending.',
  'active', 'v3',
  array['democratic-agency']::text[],
  false, null
),

-- ─── R&D ────────────────────────────────────────────────────────────────────

(
  'technology', 'research-investment',
  array['r-and-d']::text[],
  'R&D expenditure',
  '% of GDP',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/GB.XPD.RSDV.GD.ZS',
  'https://api.worldbank.org/v2/country/WLD/indicator/GB.XPD.RSDV.GD.ZS?format=json&per_page=20',
  'planetary',
  'annual',
  'context',
  'Gross domestic expenditure on research and development as a share of GDP. UNESCO Institute for Statistics, World Bank pass-through. Context indicator: more R&D is generally good but its destination matters more than the headline figure (whether it flows to weapons, surveillance, or to medicine and clean energy). Direction "context" so it does not contribute to the rollup.',
  'active', 'v3',
  array['capacity-cultivation']::text[],
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
-- Five headline indicators. Three have working Tier 1 fetchers (Internet
-- penetration, Access to electricity, Renewable share). Two are Tier 2
-- (AI incidents, e-waste). Target/floor seeded for all five.
--
-- Defensible breakpoints:
--
-- Internet penetration (% population, up):
--   target=100  — universal access is the SDG 9.c horizon.
--   floor=50    — under half the global population would be a deep
--     access crisis; we are already well above this (~67% in 2024).
--
-- Access to electricity (% population, up):
--   target=100  — SDG 7.1, universal access is the horizon.
--   floor=70    — sustained values below 70% indicate widespread
--     energy poverty. Current value ~91%.
--
-- AI incidents recorded (count/year, down):
--   target=100   — pre-LLM-era AIID baseline (2018–2020 logged ~50–150
--     incidents annually). Returning to that level would mean either
--     genuine decline in harm or massive deployment with rare
--     incidents. Either is a defensible horizon.
--   floor=2000   — incidents at 2000+/year would indicate that AI
--     deployment is causing harm at a rate the safety stack cannot
--     keep up with. 2024 totals were already in the 200+ range and
--     climbing fast; this floor is intentionally high to give the
--     scale room before bottoming out.
--
-- E-waste per capita (kg/person/year, down):
--   target=3   — kg/capita levels sustained today by Africa and parts
--     of South Asia, where consumption is structurally lower. Hitting
--     this globally would require dramatic circular-economy progress.
--     Aspirational but not impossible.
--   floor=15   — kg/capita above 15 (Europe at 17.6 in 2022, projected
--     to keep rising) indicates business-as-usual extraction pressure.
--
-- Renewable share of electricity generation (% of total, up):
--   target=80   — IEA / IRENA scenarios consistent with 1.5°C-aligned
--     trajectories require ~70–90% renewable electricity by 2050.
--     Current global value is around 30%.
--   floor=15    — sustained share below 15% would indicate stalled or
--     reversed energy transition.

update nextus_domain_indicators
  set target_value = 100, floor_value = 50
  where domain_id = 'technology'
    and name = 'Internet penetration'
    and source_name = 'World Bank WDI';

update nextus_domain_indicators
  set target_value = 100, floor_value = 70
  where domain_id = 'technology'
    and name = 'Access to electricity'
    and source_name = 'World Bank WDI';

update nextus_domain_indicators
  set target_value = 100, floor_value = 2000
  where domain_id = 'technology'
    and name = 'AI incidents recorded'
    and source_name = 'AI Incident Database';

update nextus_domain_indicators
  set target_value = 3, floor_value = 15
  where domain_id = 'technology'
    and name = 'Global e-waste generation per capita'
    and source_name = 'Global E-waste Monitor (UNITAR / ITU)';

update nextus_domain_indicators
  set target_value = 80, floor_value = 15
  where domain_id = 'technology'
    and name = 'Renewable share of electricity generation'
    and source_name = 'World Bank WDI';

commit;

-- ─── Rollback (reference only)
-- delete from nextus_domain_indicators where domain_id = 'technology';
