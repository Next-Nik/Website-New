-- ─────────────────────────────────────────────────────────────────────────────
-- Module 11.3 — Finance & Economy civilisational domain indicator catalog
--
-- Source: NextUs Domain Structure v2 (Section 5: Finance & Economy).
-- Sub-domains modelled on the working document and Platform Architecture:
--   poverty-distribution, livelihood-work, capital-flows, public-finance,
--   regenerative-circular, alternative-systems
--
-- Headlines: 5 indicators carry is_headline=true. Picked because each one
-- reads directly against the Finance & Economy Horizon Goal — "capital
-- flows toward life; wealth circulates; people have enough."
--
-- Tiering (same pattern as Human Being seed):
--   • Tier 1 (api): live World Bank fetcher already implemented
--   • Tier 2 (scrape): catalog row + source named, fetcher pending
--   • Tier 3 (contributor): catalog row, no fetcher needed (contributor
--                            signals fill the row)
--
-- Idempotent on (domain_id, name, source_name).
--
-- Tagged principles: continues the slug system established for Human
-- Being. Two new Finance-relevant slugs introduced where the existing
-- ones don't carry:
--   • flow-quality       — indicators measuring whether capital flows
--                            toward life-supporting activity (vs.
--                            extractive/concentrating activity)
--   • circulation        — indicators measuring whether value
--                            circulates (vs. accumulating in stagnant
--                            pools)
-- dignity-floor is retained for indicators measuring whether basic
-- material conditions are met. legacy-temporal-dimension is retained
-- where the indicator carries an intergenerational claim (debt,
-- climate finance, sovereign wealth funds).
-- ─────────────────────────────────────────────────────────────────────────────

begin;

insert into nextus_domain_indicators (
  domain_id, subdomain_slug, lens_slugs, name, unit, tier,
  source_name, source_url, endpoint_url,
  native_resolution, refresh_cadence, direction_preferred,
  methodology_note, status, structure_version, tagged_principles,
  is_headline, headline_order
) values

-- ─── Poverty & Distribution ─────────────────────────────────────────────────

(
  'finance-economy', 'poverty-distribution',
  array['poverty', 'dignity']::text[],
  'Extreme poverty headcount',
  '% population at $2.15/day',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/SI.POV.DDAY',
  'https://api.worldbank.org/v2/country/WLD/indicator/SI.POV.DDAY?format=json&per_page=20',
  'planetary',
  'annual',
  'down',
  'Share of the global population living below $2.15 per day in 2017 PPP — the World Bank''s international extreme poverty line. Sourced from the Poverty and Inequality Platform; aggregated from national household surveys. Lower is better.',
  'active', 'v3',
  array['dignity-floor']::text[],
  true, 1
),
(
  'finance-economy', 'poverty-distribution',
  array['poverty', 'dignity']::text[],
  'Poverty headcount at $3.65/day',
  '% population',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/SI.POV.LMIC',
  'https://api.worldbank.org/v2/country/WLD/indicator/SI.POV.LMIC?format=json&per_page=20',
  'planetary',
  'annual',
  'down',
  'Share of population below the lower-middle-income poverty line of $3.65 per day in 2017 PPP. A more inclusive floor than $2.15, capturing those who have escaped extreme poverty but remain materially constrained.',
  'active', 'v3',
  array['dignity-floor']::text[],
  false, null
),
(
  'finance-economy', 'poverty-distribution',
  array['inequality']::text[],
  'Gini index (population-weighted mean)',
  'index 0–100',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/SI.POV.GINI',
  'https://api.worldbank.org/v2/country/WLD/indicator/SI.POV.GINI?format=json&per_page=20',
  'planetary',
  'annual',
  'down',
  'Gini coefficient measuring income or consumption distribution within an economy. World aggregate from World Bank PIP. 0 = perfect equality, 100 = perfect inequality. The WLD aggregate is a population-weighted mean of national Ginis — it understates true global inequality (which is closer to 60s when computed across all individuals globally regardless of country) but is the most comparable longitudinal series.',
  'active', 'v3',
  array['flow-quality', 'circulation']::text[],
  true, 2
),
(
  'finance-economy', 'poverty-distribution',
  array['inequality', 'wealth']::text[],
  'Top 1% wealth share',
  '% of total wealth',
  'scrape',
  'World Inequality Database',
  'https://wid.world/',
  null,
  'planetary',
  'annual',
  'down',
  'Share of personal wealth held by the top 1% of adults globally. WID.world provides the methodologically defensible long-run series, drawing on tax records, household surveys, and national wealth accounts. Fetcher pending — WID has an API but its endpoint structure changes; awaiting verification.',
  'active', 'v3',
  array['flow-quality', 'circulation']::text[],
  false, null
),

-- ─── Livelihood & Work ──────────────────────────────────────────────────────

(
  'finance-economy', 'livelihood-work',
  array['employment', 'dignity']::text[],
  'Unemployment rate (modeled ILO)',
  '% labor force',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/SL.UEM.TOTL.ZS',
  'https://api.worldbank.org/v2/country/WLD/indicator/SL.UEM.TOTL.ZS?format=json&per_page=20',
  'planetary',
  'annual',
  'down',
  'Share of the labor force without work but available for and seeking employment. ILO modelled estimates, World Bank pass-through. A coarse but comparable global signal; does not capture underemployment, informal work, or labour market withdrawal.',
  'active', 'v3',
  array['dignity-floor']::text[],
  true, 3
),
(
  'finance-economy', 'livelihood-work',
  array['employment', 'youth']::text[],
  'Youth unemployment rate',
  '% labor force aged 15–24',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/SL.UEM.1524.ZS',
  'https://api.worldbank.org/v2/country/WLD/indicator/SL.UEM.1524.ZS?format=json&per_page=20',
  'planetary',
  'annual',
  'down',
  'Share of labor force aged 15–24 without work but seeking it. Youth unemployment runs persistently higher than headline unemployment globally and is a leading indicator of long-run economic and social strain.',
  'active', 'v3',
  array['dignity-floor', 'capacity-cultivation']::text[],
  false, null
),
(
  'finance-economy', 'livelihood-work',
  array['informal-work', 'dignity']::text[],
  'Informal employment (non-agricultural)',
  '% non-ag employment',
  'scrape',
  'ILOSTAT',
  'https://ilostat.ilo.org/topics/informality/',
  null,
  'planetary',
  'annual',
  'context',
  'Share of non-agricultural employment in informal jobs — work without social protection, contracts, or labour rights coverage. ILOSTAT compiles this from national surveys at varying cadence. Direction preferred is "context" not "down" because the share itself is a regional structural fact more than an aspirational target. Fetcher pending — ILOSTAT API exists but indicator series identifiers change frequently.',
  'active', 'v3',
  array['dignity-floor', 'flow-quality']::text[],
  false, null
),
(
  'finance-economy', 'livelihood-work',
  array['wages', 'dignity']::text[],
  'Living wage gap',
  '% workers below local living wage',
  'scrape',
  'WageIndicator Foundation',
  'https://wageindicator.org/salary/living-wage',
  null,
  'planetary',
  'annual',
  'down',
  'Share of working population earning below a defensible local living wage benchmark. WageIndicator publishes country-level living wage estimates and survey-based wage distributions. Fetcher pending — data is real but lives behind a CSV download rather than a live JSON API.',
  'active', 'v3',
  array['dignity-floor', 'flow-quality']::text[],
  false, null
),

-- ─── Capital Flows & Investment ─────────────────────────────────────────────

(
  'finance-economy', 'capital-flows',
  array['investment', 'flows']::text[],
  'Foreign direct investment inflows',
  '% of global GDP',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/BX.KLT.DINV.WD.GD.ZS',
  'https://api.worldbank.org/v2/country/WLD/indicator/BX.KLT.DINV.WD.GD.ZS?format=json&per_page=20',
  'planetary',
  'annual',
  'context',
  'Net inflow of foreign direct investment as a share of GDP at the world aggregate. Context indicator: rising FDI signals investor confidence and cross-border capital flow but does not by itself indicate capital flowing toward life vs extraction. Useful alongside the climate-finance indicator.',
  'active', 'v3',
  array['flow-quality']::text[],
  false, null
),
(
  'finance-economy', 'capital-flows',
  array['climate-finance', 'flows']::text[],
  'Climate finance to developing economies',
  'USD billions / year',
  'scrape',
  'OECD Climate Finance',
  'https://www.oecd.org/en/topics/climate-finance-and-the-usd-100-billion-goal.html',
  null,
  'planetary',
  'annual',
  'up',
  'Total climate finance flowing from developed to developing economies, including bilateral, multilateral, export credit, and mobilised private finance. OECD compiles this against the UNFCCC $100bn pledge. Fetcher pending — annual report PDF + Excel, no live API.',
  'active', 'v3',
  array['flow-quality', 'legacy-temporal-dimension']::text[],
  true, 4
),
(
  'finance-economy', 'capital-flows',
  array['flows']::text[],
  'Remittance flows to LMICs',
  'USD billions',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/BX.TRF.PWKR.CD.DT',
  'https://api.worldbank.org/v2/country/WLD/indicator/BX.TRF.PWKR.CD.DT?format=json&per_page=20',
  'planetary',
  'annual',
  'up',
  'Personal remittances received globally (USD). Exceeds total foreign aid in most years; one of the largest direct people-to-people capital flows in the world economy. Strong signal of distributed circulation rather than concentration.',
  'active', 'v3',
  array['circulation', 'flow-quality']::text[],
  false, null
),

-- ─── Public Finance & Debt ──────────────────────────────────────────────────

(
  'finance-economy', 'public-finance',
  array['debt', 'fiscal-space']::text[],
  'Central government debt',
  '% of GDP',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/GC.DOD.TOTL.GD.ZS',
  'https://api.worldbank.org/v2/country/WLD/indicator/GC.DOD.TOTL.GD.ZS?format=json&per_page=20',
  'planetary',
  'annual',
  'context',
  'Total central government debt as a share of GDP. Context indicator: high debt is not categorically bad — it reflects what governments have invested in. But persistently rising debt-to-GDP at the global level signals constrained future fiscal space, particularly for climate adaptation and care economies.',
  'active', 'v3',
  array['legacy-temporal-dimension']::text[],
  false, null
),
(
  'finance-economy', 'public-finance',
  array['inflation']::text[],
  'Global inflation rate',
  '% annual',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG',
  'https://api.worldbank.org/v2/country/WLD/indicator/FP.CPI.TOTL.ZG?format=json&per_page=20',
  'planetary',
  'annual',
  'context',
  'Annual percentage change in consumer prices, world aggregate. Context indicator: stable moderate inflation (~2%) is generally healthy; very high or very low values signal monetary stress. Direction is "context" so it does not contribute to the rollup.',
  'active', 'v3',
  array['flow-quality']::text[],
  false, null
),
(
  'finance-economy', 'public-finance',
  array['fiscal-space', 'tax']::text[],
  'Tax revenue (% of GDP)',
  '% of GDP',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/GC.TAX.TOTL.GD.ZS',
  'https://api.worldbank.org/v2/country/WLD/indicator/GC.TAX.TOTL.GD.ZS?format=json&per_page=20',
  'planetary',
  'annual',
  'context',
  'Tax revenues collected by central government as a share of GDP. Context indicator: relevant to fiscal capacity for public goods, but the ideal level varies by economic structure. Useful as Finance-domain context, not as a directional metric.',
  'active', 'v3',
  array['flow-quality']::text[],
  false, null
),

-- ─── Regenerative & Circular Economy ────────────────────────────────────────

(
  'finance-economy', 'regenerative-circular',
  array['circular-economy']::text[],
  'Global circularity rate',
  '% materials cycled',
  'scrape',
  'Circle Economy — Circularity Gap Report',
  'https://www.circularity-gap.world/',
  null,
  'planetary',
  'annual',
  'up',
  'Share of materials consumed globally that are cycled back into the economy versus extracted virgin. Annual Circularity Gap Report. Fetcher pending — annual PDF release, no live API. Circle Economy publishes the underlying dataset on request.',
  'active', 'v3',
  array['circulation', 'substrate-health']::text[],
  true, 5
),
(
  'finance-economy', 'regenerative-circular',
  array['esg', 'investment']::text[],
  'Sustainable investment AUM',
  'USD trillions',
  'scrape',
  'Global Sustainable Investment Alliance',
  'https://www.gsi-alliance.org/',
  null,
  'planetary',
  'annual',
  'up',
  'Total assets under management invested under sustainable / ESG mandates globally. Biennial report from GSIA. Methodology contested (definitions of "sustainable" have tightened post-2022) — series should be read cautiously. Fetcher pending.',
  'active', 'v3',
  array['flow-quality']::text[],
  false, null
),

-- ─── Alternative Value Systems ──────────────────────────────────────────────

(
  'finance-economy', 'alternative-systems',
  array['cooperative', 'commons']::text[],
  'Cooperative economy share',
  '% of global economy',
  'scrape',
  'World Cooperative Monitor (Euricse / ICA)',
  'https://www.ica.coop/en/cooperatives/facts-and-figures',
  null,
  'planetary',
  'annual',
  'up',
  'Share of global economic activity organised through cooperative ownership structures. International Cooperative Alliance and Euricse compile the World Cooperative Monitor annually. Fetcher pending.',
  'active', 'v3',
  array['circulation', 'flow-quality']::text[],
  false, null
),
(
  'finance-economy', 'alternative-systems',
  array['commons', 'community']::text[],
  'Vitality of local economic alternatives',
  'qualitative',
  'contributor',
  'NextUs contributor signals',
  null,
  null,
  'planetary',
  'event-driven',
  'context',
  'Mainstream finance statistics measure capital aggregates but not lived economic alternatives — local currencies, time banks, mutual aid networks, gift economies, community land trusts. Tier 3 contributor-signal placeholder. Communities surface what statistical pipelines miss.',
  'active', 'v3',
  array['circulation', 'indigenous-relational']::text[],
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
-- Five headline indicators. Three have working Tier 1 fetchers and get
-- target/floor here so they contribute to the Finance & Economy rollup
-- on day one. Two are Tier 2 (climate finance, circularity rate) and
-- get target/floor seeded anyway, so the moment a fetcher writes a
-- value the rollup picks it up without a second migration.
--
-- Defensible breakpoints:
--
-- Extreme poverty headcount (% pop at $2.15/day, down):
--   target=0   — the SDG 1 target, eradication. Anything else
--     concedes preventable suffering.
--   floor=40   — 1990 baseline was ~36%. Above 40 globally would be a
--     known crisis floor. Current ~9%.
--
-- Gini index (0–100, down):
--   target=25  — the level Nordic countries (Norway, Denmark, Slovenia)
--     sustain at the country level. Population-weighted world Gini is
--     not directly comparable to country Gini, but using a defensibly
--     low country-level horizon as the target is the most honest
--     anchor available given the data we have.
--   floor=70   — at country level, 70+ has historically been Apartheid-
--     era South Africa, post-Soviet Russia in the 90s. The world
--     between-country Gini was around there in the 1980s.
--     Current ~63 (varies by methodology).
--
-- Unemployment rate (% labor force, down):
--   target=3   — the natural-rate floor sustained by countries with
--     functional labour markets in expansion phases.
--   floor=15   — sustained unemployment above 15% indicates structural
--     economic crisis. Global mean is around 5%.
--
-- Climate finance to developing economies (USD bn/yr, up):
--   target=300 — UN COP29 negotiated a $300bn/yr "core" climate
--     finance goal for 2035 (the New Collective Quantified Goal),
--     superseding the $100bn pledge. This is the current
--     internationally-agreed horizon.
--   floor=50  — climate finance below $50bn/yr globally would be a
--     return to pre-Paris-Agreement levels.
--
-- Global circularity rate (% materials cycled, up):
--   target=20 — the threshold above which Circle Economy considers an
--     economy meaningfully circular. Currently we are below half that.
--   floor=5   — the most recent published value sits around 7%.
--     Below 5% would mean meaningful regression.

update nextus_domain_indicators
  set target_value = 0, floor_value = 40
  where domain_id = 'finance-economy'
    and name = 'Extreme poverty headcount'
    and source_name = 'World Bank WDI';

update nextus_domain_indicators
  set target_value = 25, floor_value = 70
  where domain_id = 'finance-economy'
    and name = 'Gini index (population-weighted mean)'
    and source_name = 'World Bank WDI';

update nextus_domain_indicators
  set target_value = 3, floor_value = 15
  where domain_id = 'finance-economy'
    and name = 'Unemployment rate (modeled ILO)'
    and source_name = 'World Bank WDI';

update nextus_domain_indicators
  set target_value = 300, floor_value = 50
  where domain_id = 'finance-economy'
    and name = 'Climate finance to developing economies'
    and source_name = 'OECD Climate Finance';

update nextus_domain_indicators
  set target_value = 20, floor_value = 5
  where domain_id = 'finance-economy'
    and name = 'Global circularity rate'
    and source_name = 'Circle Economy — Circularity Gap Report';

commit;

-- ─── Rollback (reference only)
-- delete from nextus_domain_indicators where domain_id = 'finance-economy';
