-- ─────────────────────────────────────────────────────────────────────────────
-- Module 11.2 — Human Being civilisational domain indicator catalog seed
--
-- Source: NextUs Domain Structure v2 (Section 1: Human Being). Sub-domains
-- modelled on the working document: Health & Wellbeing, Education &
-- Development, Consciousness & Inner Life, Rights & Justice, Culture & Arts.
--
-- Headlines: 6 indicators carry is_headline=true. Picked because each one
-- reads directly against the Human Being Horizon Goal — "every person has
-- access to the conditions that allow them to know themselves, develop
-- fully, and contribute meaningfully to life on earth."
--
-- Tiering follows the principle agreed for B-3:
--   • The catalog represents what we believe matters, regardless of
--     whether a fetcher is built today.
--   • Tier 1 (api): live fetcher implemented in this drop. Six indicators
--     drawing from the World Bank WDI v2 endpoint.
--   • Tier 2 (scrape): catalog row present, source named, fetcher pending.
--     Falls through to handleNotImplemented and is logged in
--     nextus_indicator_fetch_log with status='not-implemented' on every
--     cron run, so the gap is visible.
--   • Tier 3 (contributor): catalog row present, no fetcher needed —
--     these are filled via nextus_contributor_signals.
--
-- Idempotent on (domain_id, name, source_name).
--
-- Tagged principles: Module 1.5 has four cross-domain principles
-- (indigenous-relational, substrate-health, not-knowing-stance,
-- legacy-temporal-dimension). Two new Human-Being-relevant slugs are
-- introduced here for cases where the existing four don't carry:
--   • dignity-floor       — indicators measuring whether basic dignity
--                            conditions are met (life, health, water,
--                            shelter, freedom from violence)
--   • capacity-cultivation — indicators measuring whether developmental
--                            capacity is being cultivated (literacy,
--                            education, skills, mental wellbeing)
-- substrate-health is retained where the substrate is the human body
-- itself (physical health metrics).
-- ─────────────────────────────────────────────────────────────────────────────

begin;

insert into nextus_domain_indicators (
  domain_id, subdomain_slug, lens_slugs, name, unit, tier,
  source_name, source_url, endpoint_url,
  native_resolution, refresh_cadence, direction_preferred,
  methodology_note, status, structure_version, tagged_principles,
  is_headline, headline_order
) values

-- ─── Health & Wellbeing ──────────────────────────────────────────────────────

(
  'human-being', 'health-wellbeing',
  array['physical-health', 'dignity']::text[],
  'Life expectancy at birth',
  'years',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/SP.DYN.LE00.IN',
  'https://api.worldbank.org/v2/country/WLD/indicator/SP.DYN.LE00.IN?format=json&per_page=10',
  'planetary',
  'annual',
  'up',
  'Number of years a newborn would live if mortality patterns at the time of birth held throughout its life. World aggregate (WLD) from the WDI series, sourced upstream from UN Population Division and national statistics offices.',
  'active', 'v3',
  array['dignity-floor', 'substrate-health']::text[],
  true, 1
),
(
  'human-being', 'health-wellbeing',
  array['physical-health', 'dignity']::text[],
  'Under-5 mortality rate',
  'per 1,000 live births',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/SH.DYN.MORT',
  'https://api.worldbank.org/v2/country/WLD/indicator/SH.DYN.MORT?format=json&per_page=10',
  'planetary',
  'annual',
  'down',
  'Probability per 1,000 live births that a newborn dies before age five, given prevailing age-specific mortality rates. UN Inter-agency Group for Child Mortality Estimation. Lower is better.',
  'active', 'v3',
  array['dignity-floor', 'substrate-health']::text[],
  true, 2
),
(
  'human-being', 'health-wellbeing',
  array['physical-health', 'dignity']::text[],
  'Access to basic drinking water',
  '% of population',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/SH.H2O.BASW.ZS',
  'https://api.worldbank.org/v2/country/WLD/indicator/SH.H2O.BASW.ZS?format=json&per_page=10',
  'planetary',
  'annual',
  'up',
  'Share of the global population using at least basic drinking water services — improved source within 30 minutes round-trip. WHO/UNICEF Joint Monitoring Programme.',
  'active', 'v3',
  array['dignity-floor', 'substrate-health']::text[],
  true, 3
),
(
  'human-being', 'health-wellbeing',
  array['physical-health', 'dignity']::text[],
  'Access to basic sanitation',
  '% of population',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/SH.STA.BASS.ZS',
  'https://api.worldbank.org/v2/country/WLD/indicator/SH.STA.BASS.ZS?format=json&per_page=10',
  'planetary',
  'annual',
  'up',
  'Share of the global population using at least basic sanitation services — improved facilities not shared with other households. WHO/UNICEF Joint Monitoring Programme.',
  'active', 'v3',
  array['dignity-floor', 'substrate-health']::text[],
  false, null
),
(
  'human-being', 'health-wellbeing',
  array['mental-health']::text[],
  'Suicide mortality rate',
  'per 100,000',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/SH.STA.SUIC.P5',
  'https://api.worldbank.org/v2/country/WLD/indicator/SH.STA.SUIC.P5?format=json&per_page=10',
  'planetary',
  'annual',
  'down',
  'Age-standardised suicide mortality rate per 100,000 population. World Bank WDI series sourced from WHO Global Health Estimates. A partial proxy for population-level mental wellbeing.',
  'active', 'v3',
  array['dignity-floor']::text[],
  false, null
),
(
  'human-being', 'health-wellbeing',
  array['mental-health']::text[],
  'Years lived with disability — mental disorders',
  'YLDs (millions)',
  'scrape',
  'IHME Global Burden of Disease',
  'https://www.healthdata.org/research-analysis/gbd',
  null,
  'planetary',
  'annual',
  'down',
  'Total Years Lived with Disability attributed to mental disorders, from the IHME Global Burden of Disease study. Fetcher pending — source is reliable but not exposed via simple JSON API; awaiting handler. Community input welcomed on alternative endpoints.',
  'active', 'v3',
  array['dignity-floor']::text[],
  false, null
),
(
  'human-being', 'health-wellbeing',
  array['nutrition', 'dignity']::text[],
  'Prevalence of undernourishment',
  '% of population',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/SN.ITK.DEFC.ZS',
  'https://api.worldbank.org/v2/country/WLD/indicator/SN.ITK.DEFC.ZS?format=json&per_page=10',
  'planetary',
  'annual',
  'down',
  'Share of population whose habitual food consumption is insufficient to provide dietary energy levels for a normal active healthy life. FAO definition, World Bank pass-through.',
  'active', 'v3',
  array['dignity-floor', 'substrate-health']::text[],
  false, null
),

-- ─── Education & Development ─────────────────────────────────────────────────

(
  'human-being', 'education-development',
  array['literacy', 'capacity']::text[],
  'Adult literacy rate',
  '% ages 15+',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/SE.ADT.LITR.ZS',
  'https://api.worldbank.org/v2/country/WLD/indicator/SE.ADT.LITR.ZS?format=json&per_page=10',
  'planetary',
  'annual',
  'up',
  'Share of people aged 15 and over who can read and write a short simple statement about their everyday life. UNESCO Institute for Statistics, World Bank pass-through. Sparse for some country-years.',
  'active', 'v3',
  array['capacity-cultivation', 'dignity-floor']::text[],
  true, 4
),
(
  'human-being', 'education-development',
  array['schooling', 'capacity']::text[],
  'Out-of-school children, primary',
  'children',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/SE.PRM.UNER',
  'https://api.worldbank.org/v2/country/WLD/indicator/SE.PRM.UNER?format=json&per_page=10',
  'planetary',
  'annual',
  'down',
  'Number of primary-school-age children not enrolled in primary or secondary school. UNESCO Institute for Statistics. A floor measurement of access to formal education.',
  'active', 'v3',
  array['capacity-cultivation', 'dignity-floor']::text[],
  false, null
),
(
  'human-being', 'education-development',
  array['schooling', 'capacity']::text[],
  'Mean years of schooling',
  'years',
  'scrape',
  'UNDP Human Development Report',
  'https://hdr.undp.org/data-center/human-development-index',
  null,
  'planetary',
  'annual',
  'up',
  'Average years of schooling received by the adult population (25+). UNDP Human Development Index input. Fetcher pending — annual HDI data drop, not a JSON API. Community input welcomed.',
  'active', 'v3',
  array['capacity-cultivation']::text[],
  false, null
),

-- ─── Consciousness & Inner Life ──────────────────────────────────────────────

(
  'human-being', 'consciousness-inner-life',
  array['wellbeing', 'meaning']::text[],
  'Cantril life satisfaction ladder',
  'score 0–10',
  'scrape',
  'World Happiness Report (Gallup World Poll)',
  'https://worldhappiness.report/',
  null,
  'planetary',
  'annual',
  'up',
  'Mean Cantril ladder score across surveyed countries — respondents place themselves on a 0–10 ladder where 10 is the best possible life. Annual report, not a live API. Fetcher pending.',
  'active', 'v3',
  array['capacity-cultivation']::text[],
  true, 5
),
(
  'human-being', 'consciousness-inner-life',
  array['wellbeing', 'meaning']::text[],
  'Sense of meaning and purpose',
  'qualitative',
  'contributor',
  'NextUs contributor signals',
  null,
  null,
  'planetary',
  'event-driven',
  'context',
  'There is no mainstream dataset that meaningfully measures lived sense of meaning and purpose at scale. This indicator exists in the catalog as a Tier 3 contributor-signal placeholder so observations from communities can be surfaced where statistical data falls silent.',
  'active', 'v3',
  array['capacity-cultivation', 'indigenous-relational']::text[],
  false, null
),
(
  'human-being', 'consciousness-inner-life',
  array['nervous-system']::text[],
  'Population reporting chronic stress',
  '% of adults',
  'scrape',
  'Gallup Global Emotions Report',
  'https://www.gallup.com/analytics/349280/gallup-global-emotions-report.aspx',
  null,
  'planetary',
  'annual',
  'down',
  'Share of adults globally reporting they experienced significant stress on the previous day. Gallup annual report. Fetcher pending — no public JSON API; PDF release.',
  'active', 'v3',
  array['capacity-cultivation']::text[],
  false, null
),

-- ─── Rights, Dignity & Justice ───────────────────────────────────────────────

(
  'human-being', 'rights-justice',
  array['violence', 'dignity']::text[],
  'Intentional homicide rate',
  'per 100,000',
  'api',
  'World Bank WDI',
  'https://data.worldbank.org/indicator/VC.IHR.PSRC.P5',
  'https://api.worldbank.org/v2/country/WLD/indicator/VC.IHR.PSRC.P5?format=json&per_page=10',
  'planetary',
  'annual',
  'down',
  'Intentional homicides per 100,000 population. UN Office on Drugs and Crime, World Bank pass-through. A floor measurement of physical safety.',
  'active', 'v3',
  array['dignity-floor']::text[],
  true, 6
),
(
  'human-being', 'rights-justice',
  array['violence', 'dignity']::text[],
  'Forced displacement (refugees + IDPs)',
  'people',
  'scrape',
  'UNHCR Refugee Statistics',
  'https://www.unhcr.org/refugee-statistics/',
  null,
  'planetary',
  'annual',
  'down',
  'Total people forcibly displaced by conflict, violence, persecution, or rights violations — refugees, asylum-seekers, and internally displaced persons. UNHCR mid-year and end-year reporting. Fetcher pending — UNHCR has had API instability; awaiting verification of current endpoint.',
  'active', 'v3',
  array['dignity-floor']::text[],
  false, null
),
(
  'human-being', 'rights-justice',
  array['gender', 'equity']::text[],
  'Lifetime physical or sexual intimate-partner violence prevalence',
  '% of women 15+',
  'scrape',
  'WHO Violence Against Women estimates',
  'https://www.who.int/news-room/fact-sheets/detail/violence-against-women',
  null,
  'planetary',
  'event-driven',
  'down',
  'Share of women aged 15+ who have ever experienced physical or sexual violence by an intimate partner. WHO estimates released periodically (every 2–5 years). Fetcher pending.',
  'active', 'v3',
  array['dignity-floor']::text[],
  false, null
),
(
  'human-being', 'rights-justice',
  array['equity', 'gender']::text[],
  'Gender Inequality Index',
  'index 0–1',
  'scrape',
  'UNDP Human Development Report',
  'https://hdr.undp.org/data-center/thematic-composite-indices/gender-inequality-index',
  null,
  'planetary',
  'annual',
  'down',
  'UNDP composite measure of gender-based disadvantage in reproductive health, empowerment, and labour market participation. Lower is better. Fetcher pending — annual HDI release.',
  'active', 'v3',
  array['dignity-floor', 'capacity-cultivation']::text[],
  false, null
),

-- ─── Culture, Arts & Expression ──────────────────────────────────────────────

(
  'human-being', 'culture-arts',
  array['cultural-vitality']::text[],
  'Cultural employment',
  '% of total employment',
  'scrape',
  'UNESCO Institute for Statistics',
  'https://uis.unesco.org/en/topic/culture',
  null,
  'planetary',
  'annual',
  'up',
  'Share of the workforce employed in cultural occupations and industries (artists, musicians, writers, heritage workers, designers, performers). UNESCO UIS. Fetcher pending — UIS data is real but lives behind their bulk download service rather than a live JSON API. Community input welcomed on alternative live sources.',
  'active', 'v3',
  array['capacity-cultivation', 'legacy-temporal-dimension']::text[],
  false, null
),
(
  'human-being', 'culture-arts',
  array['cultural-vitality', 'expression']::text[],
  'Vitality of creative practice',
  'qualitative',
  'contributor',
  'NextUs contributor signals',
  null,
  null,
  'planetary',
  'event-driven',
  'context',
  'Mainstream statistics measure cultural employment but not lived cultural vitality — whether play, ritual, expression, and creative practice are alive in a community. Tier 3 contributor-signal placeholder.',
  'active', 'v3',
  array['capacity-cultivation', 'indigenous-relational']::text[],
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
-- Six headline indicators. Five have working Tier 1 fetchers and get
-- target/floor here so they contribute to the Human Being rollup score
-- on day one. The sixth (Cantril life satisfaction) is Tier 2 (annual
-- scrape, fetcher pending) — its target/floor is set anyway, so the
-- moment a fetcher writes a value, the rollup picks it up without a
-- second migration.
--
-- Defensible breakpoints:
--
-- Life expectancy at birth (years, up):
--   target=85 — life expectancies in the 80s are achieved today by Japan,
--   Switzerland, Spain, Australia. Reaching this globally is the horizon.
--   floor=50 — life expectancy below 50 is a known crisis floor; it was
--   the global average in 1960 before the post-war health transition.
--
-- Under-5 mortality (per 1,000, down):
--   target=2.5 — the floor achieved by Iceland, Finland, Singapore today.
--   floor=80 — historical pre-transition levels still seen in the worst-
--   affected conflict zones. SDG 3.2 target is 25; this rollup uses a
--   harder horizon.
--
-- Basic drinking water (%, up):
--   target=100 — universal access is the SDG 6.1 target; nothing less is
--   defensible as the horizon.
--   floor=50 — half the global population without basic drinking water
--   would be a deep crisis floor; current global value is around 90%.
--
-- Adult literacy rate (%, up):
--   target=100 — universal literacy is the horizon; SDG 4.6 target.
--   floor=50 — half the world unable to read would be a known crisis
--   floor; current value is in the high 80s.
--
-- Intentional homicide rate (per 100,000, down):
--   target=1 — the rate achieved by Iceland, Japan, Singapore, much of
--   Western Europe.
--   floor=20 — sustained rates above 20 are characteristic of countries
--   in security crisis; the global mean is around 6.
--
-- Cantril life satisfaction (score 0–10, up):
--   target=8 — the score sustained by Finland, Denmark, Iceland, Israel
--   in recent World Happiness Reports.
--   floor=3 — sustained scores below 3 indicate population-wide hardship
--   (Afghanistan, Lebanon at recent lows). Global mean is around 5.5.

update nextus_domain_indicators
  set target_value = 85, floor_value = 50
  where domain_id = 'human-being'
    and name = 'Life expectancy at birth'
    and source_name = 'World Bank WDI';

update nextus_domain_indicators
  set target_value = 2.5, floor_value = 80
  where domain_id = 'human-being'
    and name = 'Under-5 mortality rate'
    and source_name = 'World Bank WDI';

update nextus_domain_indicators
  set target_value = 100, floor_value = 50
  where domain_id = 'human-being'
    and name = 'Access to basic drinking water'
    and source_name = 'World Bank WDI';

update nextus_domain_indicators
  set target_value = 100, floor_value = 50
  where domain_id = 'human-being'
    and name = 'Adult literacy rate'
    and source_name = 'World Bank WDI';

update nextus_domain_indicators
  set target_value = 1, floor_value = 20
  where domain_id = 'human-being'
    and name = 'Intentional homicide rate'
    and source_name = 'World Bank WDI';

update nextus_domain_indicators
  set target_value = 8, floor_value = 3
  where domain_id = 'human-being'
    and name = 'Cantril life satisfaction ladder'
    and source_name = 'World Happiness Report (Gallup World Poll)';

commit;

-- ─── Rollback (reference only)
-- delete from nextus_domain_indicators where domain_id = 'human-being';
