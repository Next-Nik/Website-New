-- ─────────────────────────────────────────────────────────────────────────────
-- Module 11.4 — Society civilisational domain indicator catalog
--
-- Source: NextUs Domain Structure v2 (Section 2: Society) and Platform
-- Architecture v1 (Section 2.2: Society — Collective Human Systems).
-- Sub-domains: governance, peace-conflict, information-integrity,
-- equity-inclusion, civic-trust, belonging-community.
--
-- Headlines: 5 indicators carry is_headline=true, picked because each
-- one reads directly against the Society Horizon Goal — "human
-- societies are just, inclusive, stable, and capable of collective
-- problem-solving."
--
-- Tiering: Tier 1 (live World Bank), Tier 2 (annual scrape, fetcher
-- pending), Tier 3 (contributor signal). The Society domain is
-- harder to source than Human Being or Finance — democracy and press
-- freedom are real but value-loaded, and several core sources release
-- annual data drops rather than expose live APIs. Where we have to
-- stay Tier 2, the methodology note says so explicitly.
--
-- Idempotent on (domain_id, name, source_name).
--
-- Tagged principles introduced in this seed where the existing slugs
-- don't carry:
--   • democratic-agency  — indicators measuring whether people have
--                           voice and accountability over their
--                           collective life
--   • peace-foundation   — indicators measuring whether basic absence
--                           of organised violence holds
--   • information-quality — indicators measuring the integrity of the
--                           information environment in which collective
--                           decisions are made
-- Existing slugs reused: dignity-floor (basic safety), capacity-
-- cultivation (civic capacity), legacy-temporal-dimension (long-arc
-- structures), indigenous-relational (community-based knowing).
-- ─────────────────────────────────────────────────────────────────────────────

begin;

insert into nextus_domain_indicators (
  domain_id, subdomain_slug, lens_slugs, name, unit, tier,
  source_name, source_url, endpoint_url,
  native_resolution, refresh_cadence, direction_preferred,
  methodology_note, status, structure_version, tagged_principles,
  is_headline, headline_order
) values

-- ─── Governance ──────────────────────────────────────────────────────────────

(
  'society', 'governance',
  array['democracy', 'agency']::text[],
  'Liberal democracy index',
  'index 0–1',
  'scrape',
  'V-Dem Institute',
  'https://www.v-dem.net/data/the-v-dem-dataset/',
  null,
  'planetary',
  'annual',
  'up',
  'V-Dem''s liberal democracy index combines electoral democracy with constitutional protection of civil liberties, judicial independence, and effective checks and balances. Scale 0 (autocracy) to 1 (full liberal democracy). Annual ZIP/CSV release in March, no live JSON API. The platform uses V-Dem because it is more methodologically defensible than Freedom House for cross-national comparison. Fetcher pending.',
  'active', 'v3',
  array['democratic-agency', 'capacity-cultivation']::text[],
  true, 1
),
(
  'society', 'governance',
  array['voice', 'agency']::text[],
  'Voice and Accountability (WGI)',
  'estimate -2.5 to +2.5',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/VA.EST',
  'https://api.worldbank.org/v2/country/WLD/indicator/VA.EST?format=json&per_page=20',
  'planetary',
  'annual',
  'context',
  'World Bank Worldwide Governance Indicators voice and accountability dimension. Captures perceptions of citizens'' ability to participate in selecting government, freedom of expression and association, and free media. Direction is "context" because the world aggregate (population-weighted) is constructed to centre near zero and trends are difficult to read at the planetary level — the indicator is more meaningful at country level once per-Focus rollup is built (B-4).',
  'active', 'v3',
  array['democratic-agency']::text[],
  false, null
),
(
  'society', 'governance',
  array['rule-of-law']::text[],
  'Rule of Law (WGI)',
  'estimate -2.5 to +2.5',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/RL.EST',
  'https://api.worldbank.org/v2/country/WLD/indicator/RL.EST?format=json&per_page=20',
  'planetary',
  'annual',
  'context',
  'World Bank WGI rule-of-law dimension — perceptions of contract enforcement, property rights, police quality, courts. Same caveat as Voice and Accountability: world aggregate centres near zero by construction and is more useful per-Focus.',
  'active', 'v3',
  array['democratic-agency']::text[],
  false, null
),
(
  'society', 'governance',
  array['corruption']::text[],
  'Control of Corruption (WGI)',
  'estimate -2.5 to +2.5',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/CC.EST',
  'https://api.worldbank.org/v2/country/WLD/indicator/CC.EST?format=json&per_page=20',
  'planetary',
  'annual',
  'context',
  'World Bank WGI control-of-corruption dimension. Captures perceptions of how public power is exercised for private gain. Same context caveat as the other WGI indicators at world aggregate.',
  'active', 'v3',
  array['democratic-agency']::text[],
  false, null
),

-- ─── Peace & Conflict ────────────────────────────────────────────────────────

(
  'society', 'peace-conflict',
  array['violence', 'displacement']::text[],
  'Refugees by country of origin',
  'people',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/SM.POP.REFG.OR',
  'https://api.worldbank.org/v2/country/WLD/indicator/SM.POP.REFG.OR?format=json&per_page=20',
  'planetary',
  'annual',
  'down',
  'Total refugees globally by country of origin. World Bank pass-through of UNHCR data, complemented by UNRWA Palestinian refugee statistics. A floor measurement of conflict-driven displacement. Does not include internally displaced persons or asylum seekers awaiting decisions.',
  'active', 'v3',
  array['peace-foundation', 'dignity-floor']::text[],
  true, 2
),
(
  'society', 'peace-conflict',
  array['violence', 'asylum']::text[],
  'Refugees hosted (by country of asylum)',
  'people',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/SM.POP.REFG',
  'https://api.worldbank.org/v2/country/WLD/indicator/SM.POP.REFG?format=json&per_page=20',
  'planetary',
  'annual',
  'context',
  'Refugees by country or territory of asylum. World aggregate matches refugees-by-origin in totals but the country-level distribution shows where the burden of hosting is borne. Direction is "context" at planetary scale.',
  'active', 'v3',
  array['peace-foundation']::text[],
  false, null
),
(
  'society', 'peace-conflict',
  array['armed-conflict']::text[],
  'Battle-related deaths',
  'deaths / year',
  'scrape',
  'Uppsala Conflict Data Program',
  'https://ucdp.uu.se/',
  null,
  'planetary',
  'annual',
  'down',
  'Annual count of battle-related deaths in armed conflicts globally. UCDP is the most rigorously sourced dataset on organised violence. Provides country-year and dyad-year files. Fetcher pending — UCDP exposes a JSON API but it varies by version; awaiting verification of stable endpoint for the cron.',
  'active', 'v3',
  array['peace-foundation', 'dignity-floor']::text[],
  true, 3
),
(
  'society', 'peace-conflict',
  array['military-spending']::text[],
  'Military expenditure',
  '% of global GDP',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/MS.MIL.XPND.GD.ZS',
  'https://api.worldbank.org/v2/country/WLD/indicator/MS.MIL.XPND.GD.ZS?format=json&per_page=20',
  'planetary',
  'annual',
  'context',
  'Military expenditure as a share of GDP, world aggregate. Sourced from SIPRI by World Bank. Context indicator: rising military spending signals geopolitical strain but is not a direct welfare metric.',
  'active', 'v3',
  array['peace-foundation']::text[],
  false, null
),

-- ─── Information & Media Integrity ──────────────────────────────────────────

(
  'society', 'information-integrity',
  array['press-freedom']::text[],
  'World Press Freedom Index',
  'score 0–100',
  'scrape',
  'Reporters Without Borders',
  'https://rsf.org/en/index',
  null,
  'planetary',
  'annual',
  'up',
  'Reporters Without Borders annual index, scored 0 (worst) to 100 (best) on five dimensions: political, economic, legislative, social, and security context for journalism. Annual release in May. Fetcher pending — annual report and CSV download, no live API.',
  'active', 'v3',
  array['information-quality', 'democratic-agency']::text[],
  true, 4
),
(
  'society', 'information-integrity',
  array['internet-access']::text[],
  'Internet penetration',
  '% of population',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/IT.NET.USER.ZS',
  'https://api.worldbank.org/v2/country/WLD/indicator/IT.NET.USER.ZS?format=json&per_page=20',
  'planetary',
  'annual',
  'up',
  'Share of the population using the internet. ITU pass-through via World Bank. A baseline measurement of access to the information commons; says nothing about quality, freedom, or surveillance posture of that access.',
  'active', 'v3',
  array['information-quality', 'capacity-cultivation']::text[],
  false, null
),
(
  'society', 'information-integrity',
  array['mobile-access']::text[],
  'Mobile cellular subscriptions',
  'per 100 people',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/IT.CEL.SETS.P2',
  'https://api.worldbank.org/v2/country/WLD/indicator/IT.CEL.SETS.P2?format=json&per_page=20',
  'planetary',
  'annual',
  'context',
  'Mobile cellular subscriptions per 100 inhabitants. ITU pass-through via World Bank. Subscriptions exceed 100/100 in much of the world (multiple SIMs per person). Context indicator at world aggregate.',
  'active', 'v3',
  array['information-quality']::text[],
  false, null
),
(
  'society', 'information-integrity',
  array['disinformation', 'media-trust']::text[],
  'Trust in news media',
  '% of adults',
  'scrape',
  'Reuters Institute Digital News Report',
  'https://reutersinstitute.politics.ox.ac.uk/digital-news-report',
  null,
  'planetary',
  'annual',
  'up',
  'Share of adults expressing trust in news overall. Reuters Institute / University of Oxford annual survey across ~46 markets. The most carefully-fielded longitudinal cross-national survey on media trust. Fetcher pending — annual PDF report and underlying data accessible but not exposed as a live API.',
  'active', 'v3',
  array['information-quality', 'democratic-agency']::text[],
  false, null
),

-- ─── Equity & Inclusion ──────────────────────────────────────────────────────

(
  'society', 'equity-inclusion',
  array['gender', 'parliament']::text[],
  'Women in national parliaments',
  '% of seats',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/SG.GEN.PARL.ZS',
  'https://api.worldbank.org/v2/country/WLD/indicator/SG.GEN.PARL.ZS?format=json&per_page=20',
  'planetary',
  'annual',
  'up',
  'Share of seats held by women in national parliaments (single or lower chamber). Inter-Parliamentary Union pass-through via World Bank. A coarse but comparable signal of formal political representation.',
  'active', 'v3',
  array['democratic-agency']::text[],
  false, null
),
(
  'society', 'equity-inclusion',
  array['gender', 'workforce']::text[],
  'Female labour force participation',
  '% women 15+',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/SL.TLF.CACT.FE.ZS',
  'https://api.worldbank.org/v2/country/WLD/indicator/SL.TLF.CACT.FE.ZS?format=json&per_page=20',
  'planetary',
  'annual',
  'up',
  'Share of women aged 15+ economically active (employed or seeking work). ILO modelled estimate, World Bank pass-through. Direction is "up" but reading must be paired with informal-work and care-economy context — formal participation alone does not capture material conditions or unpaid labour.',
  'active', 'v3',
  array['democratic-agency', 'dignity-floor']::text[],
  false, null
),
(
  'society', 'equity-inclusion',
  array['minority-rights']::text[],
  'Civil society participation',
  'index 0–1',
  'scrape',
  'V-Dem Institute',
  'https://www.v-dem.net/data/the-v-dem-dataset/',
  null,
  'planetary',
  'annual',
  'up',
  'V-Dem civil society participation index — captures whether civil society organisations are routinely consulted by policymakers, whether women have meaningful participation, and whether the environment for organising is free. Annual release. Fetcher pending alongside the other V-Dem series.',
  'active', 'v3',
  array['democratic-agency', 'capacity-cultivation']::text[],
  false, null
),

-- ─── Civic Trust ─────────────────────────────────────────────────────────────

(
  'society', 'civic-trust',
  array['interpersonal-trust']::text[],
  'Generalised social trust',
  '% saying "most people can be trusted"',
  'scrape',
  'World Values Survey / Integrated Values Surveys',
  'https://www.worldvaluessurvey.org/',
  null,
  'planetary',
  'event-driven',
  'up',
  'Share of adults agreeing that "most people can be trusted" rather than "you can''t be too careful." World Values Survey runs in waves every 5–7 years, pooled with European Values Study to form the Integrated Values Surveys. The closest thing to a global longitudinal series on interpersonal trust. Fetcher pending — wave-based release, not a live feed.',
  'active', 'v3',
  array['democratic-agency', 'capacity-cultivation']::text[],
  true, 5
),
(
  'society', 'civic-trust',
  array['institutional-trust']::text[],
  'Trust in government',
  '% of adults',
  'scrape',
  'OECD Trust Survey',
  'https://www.oecd.org/en/topics/sub-issues/trust-in-government.html',
  null,
  'planetary',
  'annual',
  'up',
  'Share of adults expressing trust in their national government. OECD Trust Survey + Gallup World Poll combine to give the most comparable cross-national series. Fetcher pending.',
  'active', 'v3',
  array['democratic-agency']::text[],
  false, null
),

-- ─── Belonging & Community ──────────────────────────────────────────────────

(
  'society', 'belonging-community',
  array['loneliness', 'connection']::text[],
  'Population reporting frequent loneliness',
  '% of adults',
  'scrape',
  'WHO / Meta-Gallup State of Social Connections',
  'https://www.who.int/groups/commission-on-social-connection',
  null,
  'planetary',
  'event-driven',
  'down',
  'Share of adults reporting they feel lonely "very often" or "fairly often." WHO Commission on Social Connection draws on Meta-Gallup State of Social Connections survey. Fetcher pending — periodic report, not a live feed.',
  'active', 'v3',
  array['dignity-floor', 'capacity-cultivation']::text[],
  false, null
),
(
  'society', 'belonging-community',
  array['community', 'mutual-aid']::text[],
  'Vitality of community life',
  'qualitative',
  'contributor',
  'NextUs contributor signals',
  null,
  null,
  'planetary',
  'event-driven',
  'context',
  'There is no mainstream cross-national dataset that meaningfully captures whether community life is alive — neighbourhood density, intergenerational gathering, ritual, mutual aid networks, the texture of belonging. Tier 3 contributor-signal placeholder.',
  'active', 'v3',
  array['indigenous-relational', 'democratic-agency']::text[],
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
-- Five headline indicators. One has a working Tier 1 fetcher (refugees
-- by origin via World Bank). Four are Tier 2 — V-Dem democracy index,
-- UCDP battle deaths, RSF press freedom, World Values Survey trust.
-- Target/floor seeded for all five so rollup activates the moment each
-- fetcher lands.
--
-- Defensible breakpoints:
--
-- Liberal democracy index (V-Dem, scale 0–1, up):
--   target=0.7  — the score sustained by countries V-Dem classifies as
--     "liberal democracies" — Norway, Denmark, Sweden, Switzerland.
--   floor=0.2   — at country level, sustained scores ≤0.2 indicate
--     closed autocracy. World population-weighted mean has hovered
--     around 0.3–0.4 in recent years.
--
-- Refugees by origin (count, down):
--   target=10000000  — 10 million globally would be a return to early-
--     2010s levels, before the Syrian war + multiple compounding
--     conflicts. Still a deeply imperfect baseline; no truly
--     "good" refugee count exists short of zero, but 10M is a
--     defensible aspirational floor below recent values.
--   floor=50000000   — 50 million globally indicates compounded
--     displacement crises. Recent values are around 35M and rising.
--
-- Battle-related deaths (count/year, down):
--   target=20000   — the post-Cold-War 2000s baseline — annual battle
--     deaths globally were in the 20–30k range from 2003 to 2010.
--   floor=200000   — 200k+ deaths/year is characteristic of major
--     systemic war eras (Vietnam-era 1960s–70s peaks, Syria peak).
--     Recent UCDP estimates show values in the 100–150k range.
--
-- Press Freedom Index (RSF, score 0–100, up):
--   target=85    — the score sustained by Norway, Estonia, Netherlands.
--   floor=30     — sustained scores under 30 indicate severe press
--     repression. Global mean is in the 50s.
--
-- Generalised social trust (% saying most people can be trusted, up):
--   target=70   — the level sustained by Nordic countries (Denmark,
--     Norway, Finland, Netherlands).
--   floor=10    — sustained levels ≤10 indicate near-total breakdown of
--     interpersonal trust. World mean (where measured) is around 25%.

update nextus_domain_indicators
  set target_value = 0.7, floor_value = 0.2
  where domain_id = 'society'
    and name = 'Liberal democracy index'
    and source_name = 'V-Dem Institute';

update nextus_domain_indicators
  set target_value = 10000000, floor_value = 50000000
  where domain_id = 'society'
    and name = 'Refugees by country of origin'
    and source_name = 'World Bank WDI';

update nextus_domain_indicators
  set target_value = 20000, floor_value = 200000
  where domain_id = 'society'
    and name = 'Battle-related deaths'
    and source_name = 'Uppsala Conflict Data Program';

update nextus_domain_indicators
  set target_value = 85, floor_value = 30
  where domain_id = 'society'
    and name = 'World Press Freedom Index'
    and source_name = 'Reporters Without Borders';

update nextus_domain_indicators
  set target_value = 70, floor_value = 10
  where domain_id = 'society'
    and name = 'Generalised social trust'
    and source_name = 'World Values Survey / Integrated Values Surveys';

commit;

-- ─── Rollback (reference only)
-- delete from nextus_domain_indicators where domain_id = 'society';
