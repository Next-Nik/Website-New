-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 051 — Domain → Subdomain → Field taxonomy (civ side) + user focus
--
-- Seeds the fractal Domain → Subdomain → Field structure from canon
-- (NextUs_Domain_Structure_v2.md). All seven civilisational domains get
-- their subdomains and fields. Personal-side rows can be added later under
-- domain_kind = 'self' without schema changes.
--
-- Also:
--   - Cleans up duplicate Earth row (canon: slug='earth', type='planet')
--   - Adds subdomain_ids[] and field_ids[] columns to nextus_actors for tagging
--   - Creates nextus_user_focus for the Active Focus prompt (Layer D)
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ─── 1. Clean up duplicate Earth row ───────────────────────────────────────
do $$
declare
  canon_earth_id uuid;
begin
  select id into canon_earth_id
  from public.nextus_focuses
  where slug = 'earth' and type = 'planet'
  limit 1;

  if canon_earth_id is null then
    raise notice 'No canon Earth row found; skipping dedup.';
    return;
  end if;

  -- Re-parent children of any duplicate planet rows to canon Earth
  update public.nextus_focuses
  set parent_id = canon_earth_id
  where parent_id in (
    select id from public.nextus_focuses
    where type = 'planet' and id <> canon_earth_id
  );

  -- Remove duplicate planet rows
  delete from public.nextus_focuses
  where type = 'planet' and id <> canon_earth_id;

  raise notice 'Earth dedup complete. Canon Earth id: %', canon_earth_id;
end $$;


-- ─── 2. Domains table ──────────────────────────────────────────────────────
create table if not exists public.nextus_domains (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  domain_kind   text not null check (domain_kind in ('civ','self')),
  position      integer not null,
  color         text not null,
  short_description text,
  horizon_goal  text,
  created_at    timestamptz not null default now()
);

create index if not exists nextus_domains_kind_position_idx
  on public.nextus_domains (domain_kind, position);

-- Seed the seven civ domains. Colours match the existing wheel rendering.
insert into public.nextus_domains (slug, name, domain_kind, position, color, short_description, horizon_goal) values
  ('human-being',     'Human Being',     'civ', 0, '#2A6B9E',
   'Everything pertaining to the individual. Personal rights and needs. Development. Expression.',
   'Every person has access to the conditions that allow them to know themselves, develop fully, and contribute meaningfully to life on earth.'),
  ('society',         'Society',         'civ', 1, '#6B2A9E',
   'Everything pertaining to the collective. Governance, structure, frameworks.',
   'Human communities are organised in ways that generate trust, belonging, and genuine collective agency.'),
  ('nature',          'Nature',          'civ', 2, '#2A6B3A',
   'Ecosystem Earth. Earth, air, water, flora, fauna, and everything else pertaining to life on Earth.',
   'The living systems of the planet are regenerating, and humanity is a net contributor to that regeneration.'),
  ('technology',      'Technology',      'civ', 3, '#8A6B2A',
   'The tools we build for humanity and Earth. Tools to aid and amplify humanity and life on Earth.',
   'Our tools extend human wisdom and deepen connection, developing in relationship with our capacity to use them well.'),
  ('finance-economy', 'Economy',         'civ', 4, '#6B3A2A',
   'Systems of exchange. The management and exchange of resources.',
   'Resources flow toward what sustains and generates life — rewarding care, contribution, and long-term thinking.'),
  ('legacy',          'Legacy',          'civ', 5, '#4A6B2A',
   'The footprint of mankind. What we leave behind. Each generation''s responsibility to the next seven.',
   'Each generation leaves the conditions for the next to flourish more fully than they did.'),
  ('vision',          'Vision',          'civ', 6, '#2A4A6B',
   'Where we are going. A shared picture of where we are going — and the infrastructure to move toward it together.',
   'Humanity has a shared and evolving picture of where it is going, and the coordination infrastructure to move toward it together.')
on conflict (slug) do nothing;


-- ─── 3. Subdomains table ────────────────────────────────────────────────────
create table if not exists public.nextus_subdomains (
  id            uuid primary key default gen_random_uuid(),
  domain_id     uuid not null references public.nextus_domains(id) on delete cascade,
  slug          text not null,
  name          text not null,
  position      integer not null,
  description   text,
  created_at    timestamptz not null default now(),
  unique (domain_id, slug)
);

create index if not exists nextus_subdomains_domain_idx
  on public.nextus_subdomains (domain_id, position);


-- ─── 4. Fields table ────────────────────────────────────────────────────────
create table if not exists public.nextus_fields (
  id            uuid primary key default gen_random_uuid(),
  subdomain_id  uuid not null references public.nextus_subdomains(id) on delete cascade,
  slug          text not null,
  name          text not null,
  position      integer not null,
  topics        text[],
  description   text,
  created_at    timestamptz not null default now(),
  unique (subdomain_id, slug)
);

create index if not exists nextus_fields_subdomain_idx
  on public.nextus_fields (subdomain_id, position);


-- ─── 5. World-readable taxonomy ────────────────────────────────────────────
alter table public.nextus_domains    enable row level security;
alter table public.nextus_subdomains enable row level security;
alter table public.nextus_fields     enable row level security;

drop policy if exists "anyone reads domains" on public.nextus_domains;
create policy "anyone reads domains" on public.nextus_domains
  for select using (true);

drop policy if exists "anyone reads subdomains" on public.nextus_subdomains;
create policy "anyone reads subdomains" on public.nextus_subdomains
  for select using (true);

drop policy if exists "anyone reads fields" on public.nextus_fields;
create policy "anyone reads fields" on public.nextus_fields
  for select using (true);


-- ─── 6. Tagging columns on nextus_actors ───────────────────────────────────
-- Multi-domain residency: arrays of uuid. App maintains referential integrity.
alter table public.nextus_actors
  add column if not exists subdomain_ids uuid[] default array[]::uuid[];
alter table public.nextus_actors
  add column if not exists field_ids     uuid[] default array[]::uuid[];

create index if not exists nextus_actors_subdomain_ids_idx
  on public.nextus_actors using gin (subdomain_ids);
create index if not exists nextus_actors_field_ids_idx
  on public.nextus_actors using gin (field_ids);


-- ─── 7. Seed Subdomains ────────────────────────────────────────────────────
-- Human Being (5 subdomains — the richer domain)
with d as (select id from public.nextus_domains where slug = 'human-being')
insert into public.nextus_subdomains (domain_id, slug, name, position, description)
select d.id, v.slug, v.name, v.position, v.description from d, (values
  ('health-wellbeing',           'Health & Wellbeing',          1, 'The physical, psychological, and social conditions that allow human beings to function and flourish.'),
  ('education-development',      'Education & Development',     2, 'How human capacity is cultivated, transmitted, and grown across the lifespan.'),
  ('consciousness-inner-life',   'Consciousness & Inner Life',  3, 'The interior dimension of human experience — the territory that most systems treat as private but which shapes everything collective.'),
  ('rights-dignity-justice',     'Rights, Dignity & Justice',   4, 'The structural conditions that protect and enable human flourishing.'),
  ('culture-arts-expression',    'Culture, Arts & Expression',  5, 'How human beings make meaning, process experience, and transmit values through creative expression.')
) as v(slug, name, position, description)
on conflict (domain_id, slug) do nothing;

-- Society
with d as (select id from public.nextus_domains where slug = 'society')
insert into public.nextus_subdomains (domain_id, slug, name, position, description)
select d.id, v.slug, v.name, v.position, v.description from d, (values
  ('governance-political-systems', 'Governance & Political Systems', 1, null),
  ('global-cooperation-peace',     'Global Cooperation & Peace',     2, null),
  ('social-fabric-cohesion',       'Social Fabric & Cohesion',       3, null)
) as v(slug, name, position, description)
on conflict (domain_id, slug) do nothing;

-- Nature
with d as (select id from public.nextus_domains where slug = 'nature')
insert into public.nextus_subdomains (domain_id, slug, name, position, description)
select d.id, v.slug, v.name, v.position, v.description from d, (values
  ('climate-atmosphere',     'Climate & Atmosphere',     1, null),
  ('ecosystems-biodiversity', 'Ecosystems & Biodiversity', 2, null),
  ('food-agriculture-land',  'Food, Agriculture & Land', 3, null)
) as v(slug, name, position, description)
on conflict (domain_id, slug) do nothing;

-- Technology
with d as (select id from public.nextus_domains where slug = 'technology')
insert into public.nextus_subdomains (domain_id, slug, name, position, description)
select d.id, v.slug, v.name, v.position, v.description from d, (values
  ('ai-digital-systems',           'Artificial Intelligence & Digital Systems', 1, null),
  ('biotechnology-life-sciences',  'Biotechnology & Life Sciences',             2, null),
  ('energy-physical-infrastructure','Energy & Physical Infrastructure',         3, null)
) as v(slug, name, position, description)
on conflict (domain_id, slug) do nothing;

-- Finance & Economy
with d as (select id from public.nextus_domains where slug = 'finance-economy')
insert into public.nextus_subdomains (domain_id, slug, name, position, description)
select d.id, v.slug, v.name, v.position, v.description from d, (values
  ('economic-systems-design',     'Economic Systems & Design',     1, null),
  ('capital-finance-investment',  'Capital, Finance & Investment', 2, null),
  ('distribution-equity-labour',  'Distribution, Equity & Labour', 3, null)
) as v(slug, name, position, description)
on conflict (domain_id, slug) do nothing;

-- Legacy
with d as (select id from public.nextus_domains where slug = 'legacy')
insert into public.nextus_subdomains (domain_id, slug, name, position, description)
select d.id, v.slug, v.name, v.position, v.description from d, (values
  ('intergenerational-wisdom',        'Intergenerational Wisdom & Transmission', 1, null),
  ('long-term-thinking-stewardship',  'Long-Term Thinking & Stewardship',        2, null),
  ('life-transmission-continuity',    'Life Transmission & Continuity',          3, null)
) as v(slug, name, position, description)
on conflict (domain_id, slug) do nothing;

-- Vision
with d as (select id from public.nextus_domains where slug = 'vision')
insert into public.nextus_subdomains (domain_id, slug, name, position, description)
select d.id, v.slug, v.name, v.position, v.description from d, (values
  ('futures-foresight',                'Futures & Foresight',                 1, null),
  ('philosophy-worldview-meaning',     'Philosophy, Worldview & Meaning',     2, null),
  ('leadership-conscious-civilisation','Leadership & Conscious Civilisation', 3, null)
) as v(slug, name, position, description)
on conflict (domain_id, slug) do nothing;


-- ─── 8. Helper for Field seeding ────────────────────────────────────────────
create or replace function _seed_field(
  p_domain_slug text, p_subdomain_slug text,
  p_slug text, p_name text, p_position integer,
  p_topics text[]
) returns void language plpgsql as $$
declare v_sid uuid;
begin
  select s.id into v_sid
  from public.nextus_subdomains s
  join public.nextus_domains d on s.domain_id = d.id
  where d.slug = p_domain_slug and s.slug = p_subdomain_slug;
  if v_sid is null then return; end if;
  insert into public.nextus_fields (subdomain_id, slug, name, position, topics)
  values (v_sid, p_slug, p_name, p_position, p_topics)
  on conflict (subdomain_id, slug) do nothing;
end $$;

-- ── Human Being fields (5 subdomains × 3 fields = 15) ──────────────────────
select _seed_field('human-being','health-wellbeing','physical-health','Physical Health',1,
  array['Healthcare systems and access','Preventive medicine','Nutrition and food systems','Movement and embodied practice','Environmental health']);
select _seed_field('human-being','health-wellbeing','mental-psychological-health','Mental & Psychological Health',2,
  array['Mental health infrastructure','Trauma-informed systems','Nervous system regulation','Emotional development','Crisis intervention and support']);
select _seed_field('human-being','health-wellbeing','social-relational-health','Social & Relational Health',3,
  array['Belonging and community design','Loneliness and disconnection','Relational skills and education','Intergenerational connection','Care systems']);

select _seed_field('human-being','education-development','formal-education-systems','Formal Education Systems',1,
  array['Curriculum design','Pedagogical models','Access and equity','Teacher development','Early childhood education']);
select _seed_field('human-being','education-development','lifelong-self-directed-learning','Lifelong & Self-Directed Learning',2,
  array['Adult learning systems','Informal and experiential education','Learning technology','Knowledge commons','Literacy (cognitive, emotional, systems)']);
select _seed_field('human-being','education-development','personal-development','Personal Development',3,
  array['Inner work and self-knowledge','Coaching and facilitation models','Developmental frameworks','Purpose and meaning-making','Capacity building']);

select _seed_field('human-being','consciousness-inner-life','contemplative-spiritual-practice','Contemplative & Spiritual Practice',1,
  array['Meditation and mindfulness traditions','Contemplative science','Psychedelic and non-ordinary states','Transpersonal psychology','Sacred and secular meaning-making']);
select _seed_field('human-being','consciousness-inner-life','identity-narrative','Identity & Narrative',2,
  array['Archetypal and mythological frameworks','Values formation','Purpose and calling','Shadow work','Biographical narrative']);
select _seed_field('human-being','consciousness-inner-life','states-capacities','States & Capacities',3,
  array['Attention and presence training','Flow and peak states','Resilience and adaptability','Emotional intelligence','Trauma integration']);

select _seed_field('human-being','rights-dignity-justice','human-rights-architecture','Human Rights Architecture',1,
  array['Rights frameworks and enforcement','Legal protection systems','Children''s rights','Elder rights','Rights of future generations']);
select _seed_field('human-being','rights-dignity-justice','equity-inclusion','Equity & Inclusion',2,
  array['Systemic discrimination','Representation and access','Intersectionality','Anti-oppression frameworks','Reparative justice']);
select _seed_field('human-being','rights-dignity-justice','safety-protection','Safety & Protection',3,
  array['Gender-based violence','Child protection','Conflict and displacement','Statelessness and refugee systems','Restorative justice']);

select _seed_field('human-being','culture-arts-expression','arts-creative-practice','Arts & Creative Practice',1,
  array['Visual and performing arts','Music, storytelling, literature','Cultural production','Arts education','Community arts']);
select _seed_field('human-being','culture-arts-expression','cultural-transmission','Cultural Transmission',2,
  array['Heritage and memory','Language preservation','Ritual and ceremony','Cultural exchange','Living traditions']);
select _seed_field('human-being','culture-arts-expression','play-sport-recreation','Play, Sport & Recreation',3,
  array['Play as developmental infrastructure','Sport and physical culture','Recreation and leisure','Games and competition','Body culture']);

-- ── Society fields (3 × 3 = 9) ─────────────────────────────────────────────
select _seed_field('society','governance-political-systems','democratic-design','Democratic Design',1,
  array['Electoral systems','Participatory democracy models','Citizen assemblies','Digital democracy','Constitutional design']);
select _seed_field('society','governance-political-systems','institutional-reform','Institutional Reform',2,
  array['Public sector innovation','Accountability systems','Transparency and anti-corruption','Bureaucratic redesign','Regulatory architecture']);
select _seed_field('society','governance-political-systems','local-municipal-governance','Local & Municipal Governance',3,
  array['City governance','Neighbourhood systems','Community self-determination','Urban policy','Place-based development']);

select _seed_field('society','global-cooperation-peace','international-architecture','International Architecture',1,
  array['Supranational institutions','Treaty systems and enforcement','Global commons governance','Multilateral coordination','Conflict mediation']);
select _seed_field('society','global-cooperation-peace','peace-conflict-resolution','Peace & Conflict Resolution',2,
  array['Peace architecture','Post-conflict reconstruction','Transitional justice','Conflict prevention','Non-violent movements']);
select _seed_field('society','global-cooperation-peace','civilisational-coordination','Civilisational Coordination',3,
  array['Planetary mission design','Cross-border infrastructure','Global crisis response','Long-term planning bodies','Shared futures frameworks']);

select _seed_field('society','social-fabric-cohesion','community-belonging','Community & Belonging',1,
  array['Social capital and trust','Community design','Bridging and bonding','Social movements','Civic participation']);
select _seed_field('society','social-fabric-cohesion','media-narrative-information','Media, Narrative & Information',2,
  array['Media systems and journalism','Information integrity','Narrative change','Cultural representation','Digital public sphere']);
select _seed_field('society','social-fabric-cohesion','intergroup-relations','Intergroup Relations',3,
  array['Intercultural dialogue','Religious and worldview pluralism','Intergroup psychology','Reconciliation processes','Social integration']);

-- ── Nature fields (3 × 3 = 9) ──────────────────────────────────────────────
select _seed_field('nature','climate-atmosphere','mitigation','Mitigation',1,
  array['Carbon reduction and removal','Energy transition','Industrial transformation','Transportation systems','Methane and non-CO2 gases']);
select _seed_field('nature','climate-atmosphere','adaptation','Adaptation',2,
  array['Climate-resilient infrastructure','Water security','Food system resilience','Disaster preparedness','Climate migration']);
select _seed_field('nature','climate-atmosphere','climate-science-monitoring','Climate Science & Monitoring',3,
  array['Atmospheric science','Climate modelling','Early warning systems','Carbon accounting','Earth observation']);

select _seed_field('nature','ecosystems-biodiversity','terrestrial-ecosystems','Terrestrial Ecosystems',1,
  array['Forest systems','Soil health and regeneration','Grasslands and wetlands','Rewilding','Land use transformation']);
select _seed_field('nature','ecosystems-biodiversity','ocean-water-systems','Ocean & Water Systems',2,
  array['Ocean health and restoration','Marine biodiversity','Freshwater systems','Watershed management','Coastal ecosystems']);
select _seed_field('nature','ecosystems-biodiversity','biodiversity-species','Biodiversity & Species',3,
  array['Species protection','Habitat connectivity','Extinction prevention','Genetic diversity','Ecosystem monitoring']);

select _seed_field('nature','food-agriculture-land','food-systems','Food Systems',1,
  array['Regenerative agriculture','Food security and access','Urban food systems','Traditional food knowledge','Food waste reduction']);
select _seed_field('nature','food-agriculture-land','land-stewardship','Land Stewardship',2,
  array['Land rights and tenure','Indigenous land relationships','Agricultural transition','Agroforestry','Soil as commons']);
select _seed_field('nature','food-agriculture-land','built-environment-nature','Built Environment & Nature',3,
  array['Green and blue infrastructure','Biophilic design','Urban ecology','Nature-based solutions','Wildlife corridors']);

-- ── Technology fields (3 × 3 = 9) ──────────────────────────────────────────
select _seed_field('technology','ai-digital-systems','ai-governance-safety','AI Governance & Safety',1,
  array['Alignment research','Safety protocols','Transparency and explainability','Human oversight models','International AI governance']);
select _seed_field('technology','ai-digital-systems','digital-infrastructure','Digital Infrastructure',2,
  array['Internet architecture','Data systems','Digital public goods','Connectivity and access','Platform accountability']);
select _seed_field('technology','ai-digital-systems','information-knowledge-systems','Information & Knowledge Systems',3,
  array['Open knowledge','Digital literacy','Misinformation and integrity','Collective intelligence platforms','Archive and memory']);

select _seed_field('technology','biotechnology-life-sciences','genetic-biological-technologies','Genetic & Biological Technologies',1,
  array['Genetic engineering','Synthetic biology','CRISPR and gene editing','Bioethics frameworks','Biosecurity']);
select _seed_field('technology','biotechnology-life-sciences','health-technology','Health Technology',2,
  array['Medical innovation','Diagnostic systems','Drug development','Global health technology','Assistive technology']);
select _seed_field('technology','biotechnology-life-sciences','human-enhancement','Human Enhancement',3,
  array['Neurotech and brain interfaces','Cognitive enhancement','Life extension research','Enhancement ethics','Human-machine integration']);

select _seed_field('technology','energy-physical-infrastructure','energy-systems','Energy Systems',1,
  array['Renewable energy','Energy storage','Grid architecture','Energy access and equity','Nuclear and emerging energy']);
select _seed_field('technology','energy-physical-infrastructure','built-infrastructure','Built Infrastructure',2,
  array['Transportation systems','Urban infrastructure','Housing systems','Water and sanitation','Circular materials']);
select _seed_field('technology','energy-physical-infrastructure','space-frontier-technology','Space & Frontier Technology',3,
  array['Space systems and governance','Planetary defence','Satellite infrastructure','Deep tech research','Frontier exploration']);

-- ── Finance & Economy fields (3 × 3 = 9) ───────────────────────────────────
select _seed_field('finance-economy','economic-systems-design','alternative-economic-models','Alternative Economic Models',1,
  array['Post-growth economics','Doughnut economics','Wellbeing economies','Commons economics','Circular economy']);
select _seed_field('finance-economy','economic-systems-design','ownership-enterprise','Ownership & Enterprise',2,
  array['Cooperative models','Stakeholder capitalism','Employee ownership','Public enterprise','Community wealth']);
select _seed_field('finance-economy','economic-systems-design','economic-measurement','Economic Measurement',3,
  array['Beyond-GDP metrics','Wellbeing indicators','Natural capital accounting','Social return measurement','Progress frameworks']);

select _seed_field('finance-economy','capital-finance-investment','impact-mission-finance','Impact & Mission Finance',1,
  array['Impact investing','ESG and responsible investment','Development finance','Blended finance','Patient capital']);
select _seed_field('finance-economy','capital-finance-investment','public-community-finance','Public & Community Finance',2,
  array['Public banking','Credit unions and cooperatives','Community development finance','Microfinance','Financial inclusion']);
select _seed_field('finance-economy','capital-finance-investment','climate-regenerative-finance','Climate & Regenerative Finance',3,
  array['Green bonds and climate finance','Carbon markets','Nature-based finance','Just transition funding','Biodiversity credits']);

select _seed_field('finance-economy','distribution-equity-labour','wealth-income-distribution','Wealth & Income Distribution',1,
  array['Tax justice and reform','Wealth redistribution','Universal basic income','Social safety nets','Inheritance reform']);
select _seed_field('finance-economy','distribution-equity-labour','labour-work','Labour & Work',2,
  array['Future of work','Labour rights','Automation and displacement','Care economy','Informal economy']);
select _seed_field('finance-economy','distribution-equity-labour','trade-global-economy','Trade & Global Economy',3,
  array['Fair trade systems','Supply chain justice','Global economic governance','Trade policy reform','Economic sovereignty']);

-- ── Legacy fields (3 × 3 = 9) ──────────────────────────────────────────────
select _seed_field('legacy','intergenerational-wisdom','knowledge-continuity','Knowledge Continuity',1,
  array['Oral traditions and storytelling','Cultural archives and memory','Intellectual heritage','Educational lineage','Wisdom traditions']);
select _seed_field('legacy','intergenerational-wisdom','elder-youth-relations','Elder & Youth Relations',2,
  array['Elderhood roles and systems','Mentorship and apprenticeship','Rite-of-passage structures','Intergenerational dialogue','Youth leadership']);
select _seed_field('legacy','intergenerational-wisdom','family-community-systems','Family & Community Systems',3,
  array['Family structure evolution','Parenting frameworks','Community care systems','Chosen family and kinship','Child development environments']);

select _seed_field('legacy','long-term-thinking-stewardship','existential-risk-futures','Existential Risk & Futures',1,
  array['Long-term governance','Existential risk frameworks','Deep time thinking','Intergenerational contracts','Civilisational resilience']);
select _seed_field('legacy','long-term-thinking-stewardship','heritage-preservation','Heritage & Preservation',2,
  array['Cultural heritage','Natural heritage','Language preservation','Sacred sites','Historical memory']);
select _seed_field('legacy','long-term-thinking-stewardship','future-generations','Future Generations',3,
  array['Rights of future generations','Long-term institutions','Futures literacy','Scenario planning','Civilisational design']);

select _seed_field('legacy','life-transmission-continuity','sacred-ceremonial-life','Sacred & Ceremonial Life',1,
  array['Ritual and ceremony','Rites of passage','Grief and death practices','Celebration and gratitude','Seasonal and cyclical practices']);
select _seed_field('legacy','life-transmission-continuity','mythology-narrative','Mythology & Narrative',2,
  array['Living mythologies','Civilisational stories','New and renewed narratives','Meaning transmission','Cultural identity']);
select _seed_field('legacy','life-transmission-continuity','space-civilisation-deep-future','Space Civilisation & Deep Future',3,
  array['Multi-planetary ethics','Deep future planning','Space civilisation design','Civilisational continuity','Long-arc stewardship']);

-- ── Vision fields (3 × 3 = 9) ──────────────────────────────────────────────
select _seed_field('vision','futures-foresight','futures-thinking','Futures Thinking',1,
  array['Scenario planning','Futures literacy','Anticipatory governance','Civilisational visioning','Long-horizon thinking']);
select _seed_field('vision','futures-foresight','innovation-emergence','Innovation & Emergence',2,
  array['Social innovation','Systems change','Paradigm shifts','Breakthrough thinking','Civilisational R&D']);
select _seed_field('vision','futures-foresight','collective-intelligence-coordination','Collective Intelligence & Coordination',3,
  array['Collective sense-making','Coordination platforms','Distributed governance','Wisdom aggregation','Civilisational navigation']);

select _seed_field('vision','philosophy-worldview-meaning','philosophical-foundations','Philosophical Foundations',1,
  array['Ethics and moral philosophy','Ontology and epistemology','Political philosophy','Philosophy of mind','Civilisational philosophy']);
select _seed_field('vision','philosophy-worldview-meaning','worldview-diversity-integration','Worldview Diversity & Integration',2,
  array['Pluriversal futures','Cross-cultural philosophy','Secular and sacred integration','Science and meaning','Contemplative philosophy']);
select _seed_field('vision','philosophy-worldview-meaning','indigenous-relational-worldviews','Indigenous & Relational Worldviews',3,
  array['Land-based epistemologies','Kinship and reciprocity models','Non-extractive knowledge systems','Sacred ecology','Matriarchal and relational leadership models','Science-indigenous synthesis']);

select _seed_field('vision','leadership-conscious-civilisation','conscious-leadership','Conscious Leadership',1,
  array['Integral and developmental leadership','Purpose-driven leadership','Servant and steward leadership','Feminine and relational leadership models','Leadership development at scale']);
select _seed_field('vision','leadership-conscious-civilisation','social-movements-change','Social Movements & Change',2,
  array['Movement building','Nonviolent change','Social change theory','Coalition and alliance building','Cultural change leadership']);
select _seed_field('vision','leadership-conscious-civilisation','civilisational-purpose','Civilisational Purpose',3,
  array['Meaning at collective scale','Shared values and ethics','Civilisational identity','Global citizenship','The long game']);

-- Cleanup helper
drop function if exists _seed_field(text,text,text,text,integer,text[]);


-- ─── 9. User Active Focus table (drives Mission Control home routing) ──────
create table if not exists public.nextus_user_focus (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  focus_place_ids     uuid[] not null default array[]::uuid[],
  focus_domain_slugs  text[] not null default array[]::text[],
  focus_subdomain_ids uuid[] not null default array[]::uuid[],
  focus_field_ids     uuid[] not null default array[]::uuid[],
  focus_actor_ids     uuid[] not null default array[]::uuid[],
  participation       text[] not null default array[]::text[],
  updated_at          timestamptz not null default now()
);

alter table public.nextus_user_focus enable row level security;

drop policy if exists "users read own focus" on public.nextus_user_focus;
create policy "users read own focus" on public.nextus_user_focus
  for select using (auth.uid() = user_id);

drop policy if exists "users insert own focus" on public.nextus_user_focus;
create policy "users insert own focus" on public.nextus_user_focus
  for insert with check (auth.uid() = user_id);

drop policy if exists "users update own focus" on public.nextus_user_focus;
create policy "users update own focus" on public.nextus_user_focus
  for update using (auth.uid() = user_id);

drop policy if exists "users delete own focus" on public.nextus_user_focus;
create policy "users delete own focus" on public.nextus_user_focus
  for delete using (auth.uid() = user_id);


commit;

-- ─── Verification (run manually) ────────────────────────────────────────────
-- select count(*) from public.nextus_domains;     -- expect 7
-- select count(*) from public.nextus_subdomains;  -- expect 23 (HB=5, others×6=18)
-- select count(*) from public.nextus_fields;      -- expect 69 (3 per subdomain)
-- select count(*) from public.nextus_focuses where type='planet';  -- expect 1
