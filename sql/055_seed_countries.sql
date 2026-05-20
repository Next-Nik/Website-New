-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 055 — Country seed (no junk cleanup)
--
-- Context: nextus_focuses has ~760k rows from an earlier broad GeoNames
-- ingest (rivers, creeks, ridges, populated places) that lacks the
-- canonical countries layer. Of 760k rows, only 67 had type='country',
-- and most major countries (Mexico, Germany, Japan, the US) were missing.
-- Search returned "Mexico Creek" but not Mexico.
--
-- An earlier version of this migration also deleted the 760k junk rows
-- inside the same transaction. That timed out against Supabase Studio's
-- statement timeout. The deletion has been removed; the junk stays for
-- now, and a follow-up migration (or a direct DB connection) can clean
-- it up later.
--
-- Why this still works: the search RPC (migration 053) ranks prefix
-- matches first. "Mexico" the country gets a +1.0 prefix bump and beats
-- "Mexico Creek" (substring similarity ~0.5) every time. The junk rows
-- are invisible to users unless they specifically search for "creek" or
-- "ridge".
--
-- This migration:
--   1. Ensures the Earth row exists.
--   2. Upserts the canonical ~250 GeoNames countries using common short
--      names ("Mexico", not "Estados Unidos Mexicanos"). Conflict key is
--      geonames_id (partial unique index from migration 042). Canada
--      (already in the table) gets refreshed in place — its uuid is
--      preserved so any user focuses pointing at Canada keep working.
--   3. Reports counts via raise notice.
--
-- All steps in a single transaction. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ─── 1. Ensure Earth exists ──────────────────────────────────────────────
-- Required as the parent of every country.

insert into public.nextus_focuses (name, slug, type)
select 'Earth', 'earth', 'planet'
where not exists (
  select 1 from public.nextus_focuses where slug = 'earth'
);

-- ─── 2. Free up country slugs on existing junk rows ──────────────────────
-- The existing 760k rows may include some non-country rows that happen to
-- have slugs matching a canonical country slug (e.g. some place called
-- "Chile" with slug='chile'). If nextus_focuses.slug is unique, the
-- country upsert below would fail with a slug collision.
--
-- This step appends a uuid-suffix to free up the country slugs. Touches
-- only the offending rows (probably very few), runs in milliseconds.
-- Non-country, non-Earth scope keeps it safe.

update public.nextus_focuses f
set slug = f.slug || '-' || substr(f.id::text, 1, 8)
where f.slug in (
  select cd.slug from (values
    ('andorra'),('united-arab-emirates'),('afghanistan'),('antigua-and-barbuda'),
    ('anguilla'),('albania'),('armenia'),('angola'),('antarctica'),('argentina'),
    ('american-samoa'),('austria'),('australia'),('aruba'),('aland-islands'),
    ('azerbaijan'),('bosnia-and-herzegovina'),('barbados'),('bangladesh'),('belgium'),
    ('burkina-faso'),('bulgaria'),('bahrain'),('burundi'),('benin'),('saint-barthelemy'),
    ('bermuda'),('brunei'),('bolivia'),('bonaire-saint-eustatius-and-saba'),('brazil'),
    ('bahamas'),('bhutan'),('bouvet-island'),('botswana'),('belarus'),('belize'),('canada'),
    ('cocos-islands'),('democratic-republic-of-the-congo'),('central-african-republic'),
    ('republic-of-the-congo'),('switzerland'),('ivory-coast'),('cook-islands'),('chile'),
    ('cameroon'),('china'),('colombia'),('costa-rica'),('cuba'),('cabo-verde'),('curacao'),
    ('christmas-island'),('cyprus'),('czechia'),('germany'),('djibouti'),('denmark'),
    ('dominica'),('dominican-republic'),('algeria'),('ecuador'),('estonia'),('egypt'),
    ('western-sahara'),('eritrea'),('spain'),('ethiopia'),('finland'),('fiji'),
    ('falkland-islands'),('micronesia'),('faroe-islands'),('france'),('gabon'),
    ('united-kingdom'),('grenada'),('georgia'),('french-guiana'),('guernsey'),('ghana'),
    ('gibraltar'),('greenland'),('gambia'),('guinea'),('guadeloupe'),('equatorial-guinea'),
    ('greece'),('south-georgia-and-the-south-sandwich-islands'),('guatemala'),('guam'),
    ('guinea-bissau'),('guyana'),('hong-kong'),('heard-island-and-mcdonald-islands'),
    ('honduras'),('croatia'),('haiti'),('hungary'),('indonesia'),('ireland'),('israel'),
    ('isle-of-man'),('india'),('british-indian-ocean-territory'),('iraq'),('iran'),
    ('iceland'),('italy'),('jersey'),('jamaica'),('jordan'),('japan'),('kenya'),('kyrgyzstan'),
    ('cambodia'),('kiribati'),('comoros'),('saint-kitts-and-nevis'),('north-korea'),
    ('south-korea'),('kosovo'),('kuwait'),('cayman-islands'),('kazakhstan'),('laos'),
    ('lebanon'),('saint-lucia'),('liechtenstein'),('sri-lanka'),('liberia'),('lesotho'),
    ('lithuania'),('luxembourg'),('latvia'),('libya'),('morocco'),('monaco'),('moldova'),
    ('montenegro'),('saint-martin'),('madagascar'),('marshall-islands'),('north-macedonia'),
    ('mali'),('myanmar'),('mongolia'),('macao'),('northern-mariana-islands'),('martinique'),
    ('mauritania'),('montserrat'),('malta'),('mauritius'),('maldives'),('malawi'),('mexico'),
    ('malaysia'),('mozambique'),('namibia'),('new-caledonia'),('niger'),('norfolk-island'),
    ('nigeria'),('nicaragua'),('the-netherlands'),('norway'),('nepal'),('nauru'),('niue'),
    ('new-zealand'),('oman'),('panama'),('peru'),('french-polynesia'),('papua-new-guinea'),
    ('philippines'),('pakistan'),('poland'),('saint-pierre-and-miquelon'),('pitcairn'),
    ('puerto-rico'),('palestinian-territory'),('portugal'),('palau'),('paraguay'),('qatar'),
    ('reunion'),('romania'),('serbia'),('russia'),('rwanda'),('saudi-arabia'),('solomon-islands'),
    ('seychelles'),('sudan'),('south-sudan'),('sweden'),('singapore'),('saint-helena'),
    ('slovenia'),('svalbard-and-jan-mayen'),('slovakia'),('sierra-leone'),('san-marino'),
    ('senegal'),('somalia'),('suriname'),('sao-tome-and-principe'),('el-salvador'),
    ('sint-maarten'),('syria'),('eswatini'),('turks-and-caicos-islands'),('chad'),
    ('french-southern-territories'),('togo'),('thailand'),('tajikistan'),('tokelau'),
    ('timor-leste'),('turkmenistan'),('tunisia'),('tonga'),('turkey'),('trinidad-and-tobago'),
    ('tuvalu'),('taiwan'),('tanzania'),('ukraine'),('uganda'),('united-states-minor-outlying-islands'),
    ('united-states'),('uruguay'),('uzbekistan'),('vatican'),('saint-vincent-and-the-grenadines'),
    ('venezuela'),('british-virgin-islands'),('us-virgin-islands'),('vietnam'),('vanuatu'),
    ('wallis-and-futuna'),('samoa'),('yemen'),('mayotte'),('south-africa'),('zambia'),
    ('zimbabwe')
  ) as cd(slug)
)
and (f.type is null or f.type != 'country')
and f.slug != 'earth';

-- ─── 3. Upsert the 250 countries ─────────────────────────────────────────
-- Conflict on geonames_id (partial unique index from migration 042).

with earth as (
  select id from public.nextus_focuses where slug = 'earth' limit 1
),
country_data (name, slug, geonames_id, iso) as (
  values
  ('Andorra', 'andorra', 3041565, 'AD'),
  ('United Arab Emirates', 'united-arab-emirates', 290557, 'AE'),
  ('Afghanistan', 'afghanistan', 1149361, 'AF'),
  ('Antigua and Barbuda', 'antigua-and-barbuda', 3576396, 'AG'),
  ('Anguilla', 'anguilla', 3573511, 'AI'),
  ('Albania', 'albania', 783754, 'AL'),
  ('Armenia', 'armenia', 174982, 'AM'),
  ('Angola', 'angola', 3351879, 'AO'),
  ('Antarctica', 'antarctica', 6697173, 'AQ'),
  ('Argentina', 'argentina', 3865483, 'AR'),
  ('American Samoa', 'american-samoa', 5880801, 'AS'),
  ('Austria', 'austria', 2782113, 'AT'),
  ('Australia', 'australia', 2077456, 'AU'),
  ('Aruba', 'aruba', 3577279, 'AW'),
  ('Aland Islands', 'aland-islands', 661882, 'AX'),
  ('Azerbaijan', 'azerbaijan', 587116, 'AZ'),
  ('Bosnia and Herzegovina', 'bosnia-and-herzegovina', 3277605, 'BA'),
  ('Barbados', 'barbados', 3374084, 'BB'),
  ('Bangladesh', 'bangladesh', 1210997, 'BD'),
  ('Belgium', 'belgium', 2802361, 'BE'),
  ('Burkina Faso', 'burkina-faso', 2361809, 'BF'),
  ('Bulgaria', 'bulgaria', 732800, 'BG'),
  ('Bahrain', 'bahrain', 290291, 'BH'),
  ('Burundi', 'burundi', 433561, 'BI'),
  ('Benin', 'benin', 2395170, 'BJ'),
  ('Saint Barthelemy', 'saint-barthelemy', 3578476, 'BL'),
  ('Bermuda', 'bermuda', 3573345, 'BM'),
  ('Brunei', 'brunei', 1820814, 'BN'),
  ('Bolivia', 'bolivia', 3923057, 'BO'),
  ('Bonaire, Saint Eustatius and Saba', 'bonaire-saint-eustatius-and-saba', 7626844, 'BQ'),
  ('Brazil', 'brazil', 3469034, 'BR'),
  ('Bahamas', 'bahamas', 3572887, 'BS'),
  ('Bhutan', 'bhutan', 1252634, 'BT'),
  ('Bouvet Island', 'bouvet-island', 3371123, 'BV'),
  ('Botswana', 'botswana', 933860, 'BW'),
  ('Belarus', 'belarus', 630336, 'BY'),
  ('Belize', 'belize', 3582678, 'BZ'),
  ('Canada', 'canada', 6251999, 'CA'),
  ('Cocos Islands', 'cocos-islands', 1547376, 'CC'),
  ('Democratic Republic of the Congo', 'democratic-republic-of-the-congo', 203312, 'CD'),
  ('Central African Republic', 'central-african-republic', 239880, 'CF'),
  ('Republic of the Congo', 'republic-of-the-congo', 2260494, 'CG'),
  ('Switzerland', 'switzerland', 2658434, 'CH'),
  ('Ivory Coast', 'ivory-coast', 2287781, 'CI'),
  ('Cook Islands', 'cook-islands', 1899402, 'CK'),
  ('Chile', 'chile', 3895114, 'CL'),
  ('Cameroon', 'cameroon', 2233387, 'CM'),
  ('China', 'china', 1814991, 'CN'),
  ('Colombia', 'colombia', 3686110, 'CO'),
  ('Costa Rica', 'costa-rica', 3624060, 'CR'),
  ('Cuba', 'cuba', 3562981, 'CU'),
  ('Cabo Verde', 'cabo-verde', 3374766, 'CV'),
  ('Curacao', 'curacao', 7626836, 'CW'),
  ('Christmas Island', 'christmas-island', 2078138, 'CX'),
  ('Cyprus', 'cyprus', 146669, 'CY'),
  ('Czechia', 'czechia', 3077311, 'CZ'),
  ('Germany', 'germany', 2921044, 'DE'),
  ('Djibouti', 'djibouti', 223816, 'DJ'),
  ('Denmark', 'denmark', 2623032, 'DK'),
  ('Dominica', 'dominica', 3575830, 'DM'),
  ('Dominican Republic', 'dominican-republic', 3508796, 'DO'),
  ('Algeria', 'algeria', 2589581, 'DZ'),
  ('Ecuador', 'ecuador', 3658394, 'EC'),
  ('Estonia', 'estonia', 453733, 'EE'),
  ('Egypt', 'egypt', 357994, 'EG'),
  ('Western Sahara', 'western-sahara', 2461445, 'EH'),
  ('Eritrea', 'eritrea', 338010, 'ER'),
  ('Spain', 'spain', 2510769, 'ES'),
  ('Ethiopia', 'ethiopia', 337996, 'ET'),
  ('Finland', 'finland', 660013, 'FI'),
  ('Fiji', 'fiji', 2205218, 'FJ'),
  ('Falkland Islands', 'falkland-islands', 3474414, 'FK'),
  ('Micronesia', 'micronesia', 2081918, 'FM'),
  ('Faroe Islands', 'faroe-islands', 2622320, 'FO'),
  ('France', 'france', 3017382, 'FR'),
  ('Gabon', 'gabon', 2400553, 'GA'),
  ('United Kingdom', 'united-kingdom', 2635167, 'GB'),
  ('Grenada', 'grenada', 3580239, 'GD'),
  ('Georgia', 'georgia', 614540, 'GE'),
  ('French Guiana', 'french-guiana', 3381670, 'GF'),
  ('Guernsey', 'guernsey', 3042362, 'GG'),
  ('Ghana', 'ghana', 2300660, 'GH'),
  ('Gibraltar', 'gibraltar', 2411586, 'GI'),
  ('Greenland', 'greenland', 3425505, 'GL'),
  ('Gambia', 'gambia', 2413451, 'GM'),
  ('Guinea', 'guinea', 2420477, 'GN'),
  ('Guadeloupe', 'guadeloupe', 3579143, 'GP'),
  ('Equatorial Guinea', 'equatorial-guinea', 2309096, 'GQ'),
  ('Greece', 'greece', 390903, 'GR'),
  ('South Georgia and the South Sandwich Islands', 'south-georgia-and-the-south-sandwich-islands', 3474415, 'GS'),
  ('Guatemala', 'guatemala', 3595528, 'GT'),
  ('Guam', 'guam', 4043988, 'GU'),
  ('Guinea-Bissau', 'guinea-bissau', 2372248, 'GW'),
  ('Guyana', 'guyana', 3378535, 'GY'),
  ('Hong Kong', 'hong-kong', 1819730, 'HK'),
  ('Heard Island and McDonald Islands', 'heard-island-and-mcdonald-islands', 1547314, 'HM'),
  ('Honduras', 'honduras', 3608932, 'HN'),
  ('Croatia', 'croatia', 3202326, 'HR'),
  ('Haiti', 'haiti', 3723988, 'HT'),
  ('Hungary', 'hungary', 719819, 'HU'),
  ('Indonesia', 'indonesia', 1643084, 'ID'),
  ('Ireland', 'ireland', 2963597, 'IE'),
  ('Israel', 'israel', 294640, 'IL'),
  ('Isle of Man', 'isle-of-man', 3042225, 'IM'),
  ('India', 'india', 1269750, 'IN'),
  ('British Indian Ocean Territory', 'british-indian-ocean-territory', 1282588, 'IO'),
  ('Iraq', 'iraq', 99237, 'IQ'),
  ('Iran', 'iran', 130758, 'IR'),
  ('Iceland', 'iceland', 2629691, 'IS'),
  ('Italy', 'italy', 3175395, 'IT'),
  ('Jersey', 'jersey', 3042142, 'JE'),
  ('Jamaica', 'jamaica', 3489940, 'JM'),
  ('Jordan', 'jordan', 248816, 'JO'),
  ('Japan', 'japan', 1861060, 'JP'),
  ('Kenya', 'kenya', 192950, 'KE'),
  ('Kyrgyzstan', 'kyrgyzstan', 1527747, 'KG'),
  ('Cambodia', 'cambodia', 1831722, 'KH'),
  ('Kiribati', 'kiribati', 4030945, 'KI'),
  ('Comoros', 'comoros', 921929, 'KM'),
  ('Saint Kitts and Nevis', 'saint-kitts-and-nevis', 3575174, 'KN'),
  ('North Korea', 'north-korea', 1873107, 'KP'),
  ('South Korea', 'south-korea', 1835841, 'KR'),
  ('Kosovo', 'kosovo', 831053, 'XK'),
  ('Kuwait', 'kuwait', 285570, 'KW'),
  ('Cayman Islands', 'cayman-islands', 3580718, 'KY'),
  ('Kazakhstan', 'kazakhstan', 1522867, 'KZ'),
  ('Laos', 'laos', 1655842, 'LA'),
  ('Lebanon', 'lebanon', 272103, 'LB'),
  ('Saint Lucia', 'saint-lucia', 3576468, 'LC'),
  ('Liechtenstein', 'liechtenstein', 3042058, 'LI'),
  ('Sri Lanka', 'sri-lanka', 1227603, 'LK'),
  ('Liberia', 'liberia', 2275384, 'LR'),
  ('Lesotho', 'lesotho', 932692, 'LS'),
  ('Lithuania', 'lithuania', 597427, 'LT'),
  ('Luxembourg', 'luxembourg', 2960313, 'LU'),
  ('Latvia', 'latvia', 458258, 'LV'),
  ('Libya', 'libya', 2215636, 'LY'),
  ('Morocco', 'morocco', 2542007, 'MA'),
  ('Monaco', 'monaco', 2993457, 'MC'),
  ('Moldova', 'moldova', 617790, 'MD'),
  ('Montenegro', 'montenegro', 3194884, 'ME'),
  ('Saint Martin', 'saint-martin', 3578421, 'MF'),
  ('Madagascar', 'madagascar', 1062947, 'MG'),
  ('Marshall Islands', 'marshall-islands', 2080185, 'MH'),
  ('North Macedonia', 'north-macedonia', 718075, 'MK'),
  ('Mali', 'mali', 2453866, 'ML'),
  ('Myanmar', 'myanmar', 1327865, 'MM'),
  ('Mongolia', 'mongolia', 2029969, 'MN'),
  ('Macao', 'macao', 1821275, 'MO'),
  ('Northern Mariana Islands', 'northern-mariana-islands', 4041468, 'MP'),
  ('Martinique', 'martinique', 3570311, 'MQ'),
  ('Mauritania', 'mauritania', 2378080, 'MR'),
  ('Montserrat', 'montserrat', 3578097, 'MS'),
  ('Malta', 'malta', 2562770, 'MT'),
  ('Mauritius', 'mauritius', 934292, 'MU'),
  ('Maldives', 'maldives', 1282028, 'MV'),
  ('Malawi', 'malawi', 927384, 'MW'),
  ('Mexico', 'mexico', 3996063, 'MX'),
  ('Malaysia', 'malaysia', 1733045, 'MY'),
  ('Mozambique', 'mozambique', 1036973, 'MZ'),
  ('Namibia', 'namibia', 3355338, 'NA'),
  ('New Caledonia', 'new-caledonia', 2139685, 'NC'),
  ('Niger', 'niger', 2440476, 'NE'),
  ('Norfolk Island', 'norfolk-island', 2155115, 'NF'),
  ('Nigeria', 'nigeria', 2328926, 'NG'),
  ('Nicaragua', 'nicaragua', 3617476, 'NI'),
  ('The Netherlands', 'the-netherlands', 2750405, 'NL'),
  ('Norway', 'norway', 3144096, 'NO'),
  ('Nepal', 'nepal', 1282988, 'NP'),
  ('Nauru', 'nauru', 2110425, 'NR'),
  ('Niue', 'niue', 4036232, 'NU'),
  ('New Zealand', 'new-zealand', 2186224, 'NZ'),
  ('Oman', 'oman', 286963, 'OM'),
  ('Panama', 'panama', 3703430, 'PA'),
  ('Peru', 'peru', 3932488, 'PE'),
  ('French Polynesia', 'french-polynesia', 4030656, 'PF'),
  ('Papua New Guinea', 'papua-new-guinea', 2088628, 'PG'),
  ('Philippines', 'philippines', 1694008, 'PH'),
  ('Pakistan', 'pakistan', 1168579, 'PK'),
  ('Poland', 'poland', 798544, 'PL'),
  ('Saint Pierre and Miquelon', 'saint-pierre-and-miquelon', 3424932, 'PM'),
  ('Pitcairn', 'pitcairn', 4030699, 'PN'),
  ('Puerto Rico', 'puerto-rico', 4566966, 'PR'),
  ('Palestinian Territory', 'palestinian-territory', 6254930, 'PS'),
  ('Portugal', 'portugal', 2264397, 'PT'),
  ('Palau', 'palau', 1559582, 'PW'),
  ('Paraguay', 'paraguay', 3437598, 'PY'),
  ('Qatar', 'qatar', 289688, 'QA'),
  ('Reunion', 'reunion', 935317, 'RE'),
  ('Romania', 'romania', 798549, 'RO'),
  ('Serbia', 'serbia', 6290252, 'RS'),
  ('Russia', 'russia', 2017370, 'RU'),
  ('Rwanda', 'rwanda', 49518, 'RW'),
  ('Saudi Arabia', 'saudi-arabia', 102358, 'SA'),
  ('Solomon Islands', 'solomon-islands', 2103350, 'SB'),
  ('Seychelles', 'seychelles', 241170, 'SC'),
  ('Sudan', 'sudan', 366755, 'SD'),
  ('South Sudan', 'south-sudan', 7909807, 'SS'),
  ('Sweden', 'sweden', 2661886, 'SE'),
  ('Singapore', 'singapore', 1880251, 'SG'),
  ('Saint Helena', 'saint-helena', 3370751, 'SH'),
  ('Slovenia', 'slovenia', 3190538, 'SI'),
  ('Svalbard and Jan Mayen', 'svalbard-and-jan-mayen', 607072, 'SJ'),
  ('Slovakia', 'slovakia', 3057568, 'SK'),
  ('Sierra Leone', 'sierra-leone', 2403846, 'SL'),
  ('San Marino', 'san-marino', 3168068, 'SM'),
  ('Senegal', 'senegal', 2245662, 'SN'),
  ('Somalia', 'somalia', 51537, 'SO'),
  ('Suriname', 'suriname', 3382998, 'SR'),
  ('Sao Tome and Principe', 'sao-tome-and-principe', 2410758, 'ST'),
  ('El Salvador', 'el-salvador', 3585968, 'SV'),
  ('Sint Maarten', 'sint-maarten', 7609695, 'SX'),
  ('Syria', 'syria', 163843, 'SY'),
  ('Eswatini', 'eswatini', 934841, 'SZ'),
  ('Turks and Caicos Islands', 'turks-and-caicos-islands', 3576916, 'TC'),
  ('Chad', 'chad', 2434508, 'TD'),
  ('French Southern Territories', 'french-southern-territories', 1546748, 'TF'),
  ('Togo', 'togo', 2363686, 'TG'),
  ('Thailand', 'thailand', 1605651, 'TH'),
  ('Tajikistan', 'tajikistan', 1220409, 'TJ'),
  ('Tokelau', 'tokelau', 4031074, 'TK'),
  ('Timor Leste', 'timor-leste', 1966436, 'TL'),
  ('Turkmenistan', 'turkmenistan', 1218197, 'TM'),
  ('Tunisia', 'tunisia', 2464461, 'TN'),
  ('Tonga', 'tonga', 4032283, 'TO'),
  ('Turkey', 'turkey', 298795, 'TR'),
  ('Trinidad and Tobago', 'trinidad-and-tobago', 3573591, 'TT'),
  ('Tuvalu', 'tuvalu', 2110297, 'TV'),
  ('Taiwan', 'taiwan', 1668284, 'TW'),
  ('Tanzania', 'tanzania', 149590, 'TZ'),
  ('Ukraine', 'ukraine', 690791, 'UA'),
  ('Uganda', 'uganda', 226074, 'UG'),
  ('United States Minor Outlying Islands', 'united-states-minor-outlying-islands', 5854968, 'UM'),
  ('United States', 'united-states', 6252001, 'US'),
  ('Uruguay', 'uruguay', 3439705, 'UY'),
  ('Uzbekistan', 'uzbekistan', 1512440, 'UZ'),
  ('Vatican', 'vatican', 3164670, 'VA'),
  ('Saint Vincent and the Grenadines', 'saint-vincent-and-the-grenadines', 3577815, 'VC'),
  ('Venezuela', 'venezuela', 3625428, 'VE'),
  ('British Virgin Islands', 'british-virgin-islands', 3577718, 'VG'),
  ('U.S. Virgin Islands', 'us-virgin-islands', 4796775, 'VI'),
  ('Vietnam', 'vietnam', 1562822, 'VN'),
  ('Vanuatu', 'vanuatu', 2134431, 'VU'),
  ('Wallis and Futuna', 'wallis-and-futuna', 4034749, 'WF'),
  ('Samoa', 'samoa', 4034894, 'WS'),
  ('Yemen', 'yemen', 69543, 'YE'),
  ('Mayotte', 'mayotte', 1024031, 'YT'),
  ('South Africa', 'south-africa', 953987, 'ZA'),
  ('Zambia', 'zambia', 895949, 'ZM'),
  ('Zimbabwe', 'zimbabwe', 878675, 'ZW')

)
insert into public.nextus_focuses (name, slug, type, geonames_id, parent_id)
select
  cd.name,
  cd.slug,
  'country',
  cd.geonames_id,
  (select id from earth)
from country_data cd
on conflict (geonames_id) where geonames_id is not null
do update set
  name      = excluded.name,
  slug      = excluded.slug,
  type      = excluded.type,
  parent_id = excluded.parent_id;

-- ─── 4. Verification ─────────────────────────────────────────────────────

do $$
declare
  v_countries int;
  v_earth     int;
  v_other     int;
  v_total     int;
begin
  select count(*) into v_countries from public.nextus_focuses where type = 'country';
  select count(*) into v_earth     from public.nextus_focuses where slug = 'earth';
  select count(*) into v_other     from public.nextus_focuses where (type != 'country' or type is null) and slug != 'earth';
  select count(*) into v_total     from public.nextus_focuses;
  raise notice '--- Migration 055 complete ---';
  raise notice 'Countries: %', v_countries;
  raise notice 'Earth rows: %', v_earth;
  raise notice 'Other (user-referenced kept alive): %', v_other;
  raise notice 'Total rows: %', v_total;
end $$;

commit;

-- After commit, refresh PostgREST's schema cache so the canonical
-- country names become immediately searchable.
notify pgrst, 'reload schema';
