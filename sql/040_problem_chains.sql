-- 040_problem_chains.sql
--
-- Controlled vocabulary for problem-chain tagging on actors.
--
-- Context (Foundation: away-from / toward grammar):
--   People arrive at NextUs in away-from language: "tear down the
--   patriarchy," "stop the extinction," "end poverty." Orgs and
--   practitioners describe themselves in toward language: what they
--   build, what they're for. The platform's job is to translate
--   between them — invisibly.
--
--   The `problem_chains` column already exists on nextus_actors. This
--   migration:
--     1. Creates a small reference table holding the curated vocabulary.
--     2. Seeds it with ~40 initial chains drawn from the SDGs and the
--        away-from sentences people actually type.
--     3. Wires problem_chains into the actor search_vector so a full-text
--        search of someone's away-from concern can match against the
--        tags on an actor.
--
--   Orgs are NOT asked to populate this themselves. The platform
--   auto-tags them based on their existing forward-facing text
--   (mission_statement, working_on_now, description, domains).
--   A separate endpoint (api/nextsteps-tag-actor.js) does the tagging.
--
-- Idempotent. Safe to re-run.

-- ── 1. The reference table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.nextus_problem_chains (
  -- The slug is the value stored in nextus_actors.problem_chains[].
  -- Lowercase, hyphen-separated, stable. Treat as immutable once published.
  slug          text PRIMARY KEY,

  -- Human-readable label, shown in admin UI. Kept in plain away-from
  -- grammar — that is the column's job: to mirror how people speak the
  -- problem. ("biodiversity loss," not "biodiversity preservation.")
  label         text NOT NULL,

  -- One-line description of what this chain covers, for admin disambiguation.
  description   text,

  -- Civilisational domains this chain primarily relates to. Multi-valued
  -- because some chains span domains (e.g. 'wealth concentration' touches
  -- finance and society).
  domains       text[] NOT NULL DEFAULT '{}',

  -- Alternate phrasings people use for the same chain. Used by the
  -- auto-tagger and the away-from-to-chain matcher to catch the same
  -- concept expressed differently.
  --   e.g. for 'biodiversity-loss':
  --     ['extinction', 'species loss', 'losing species',
  --      'mass extinction', 'wildlife disappearing']
  aliases       text[] NOT NULL DEFAULT '{}',

  -- Optional pointer to the SDG most closely related (1-17), for the
  -- inbound bridge when a person arrives via SDG framing. Multi-valued
  -- because some chains map to multiple SDGs.
  related_sdgs  int[] NOT NULL DEFAULT '{}',

  -- Lifecycle. 'active' chains are matchable; 'retired' chains stay in
  -- the table for historical actor tags but are not surfaced to new ones.
  status        text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'retired')),

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_problem_chains_status
  ON public.nextus_problem_chains (status);

CREATE INDEX IF NOT EXISTS idx_problem_chains_domains
  ON public.nextus_problem_chains USING gin (domains);

CREATE INDEX IF NOT EXISTS idx_problem_chains_aliases
  ON public.nextus_problem_chains USING gin (aliases);


-- ── 2. Auto-update trigger ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.nextus_problem_chains_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS nextus_problem_chains_updated_at ON public.nextus_problem_chains;
CREATE TRIGGER nextus_problem_chains_updated_at
  BEFORE UPDATE ON public.nextus_problem_chains
  FOR EACH ROW EXECUTE FUNCTION public.nextus_problem_chains_set_updated_at();


-- ── 3. Add problem_chains to the actor search_vector ──────────────────────
--
-- The search_vector trigger already pulls from name, tagline, description,
-- mission_statement, working_on_now. Adding problem_chains as a 'B'-weight
-- term so an away-from concern can match.
--
-- We rewrite the function rather than ALTER, to keep all weighting visible
-- in one place. The original definition is in sql/037_atlas_search.sql;
-- this supersedes it.

CREATE OR REPLACE FUNCTION public.nextus_actors_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name,             '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.tagline,          '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.location_name,    '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description,      '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.mission_statement,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.problem_chains, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.working_on_now,   '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-run the trigger across existing rows so problem_chains are indexed.
-- Safe — UPDATE with no change still fires the BEFORE trigger.
UPDATE public.nextus_actors SET updated_at = updated_at;


-- ── 4. Seed the initial vocabulary ────────────────────────────────────────
--
-- ~40 chains drawn from: SDGs, the obvious away-from sentences people
-- use, and the four canonical NextSteps fixtures. Editorial pass, not
-- exhaustive. The auto-tagger picks from these; new ones are added as
-- NextSteps sees novel concerns.
--
-- Labels are in plain away-from grammar by design — this column mirrors
-- how people speak the problem.

INSERT INTO public.nextus_problem_chains (slug, label, description, domains, aliases, related_sdgs)
VALUES
  -- Nature
  ('biodiversity-loss',     'Biodiversity loss',     'Species disappearing; ecosystems collapsing.', ARRAY['nature']::text[],            ARRAY['extinction','mass extinction','species loss','losing species','wildlife disappearing','sixth extinction']::text[], ARRAY[15]::int[]),
  ('deforestation',         'Deforestation',         'Forests being cut down or burned.',            ARRAY['nature']::text[],            ARRAY['logging','rainforest destruction','forest loss','clearcutting','amazon burning']::text[],                       ARRAY[15]::int[]),
  ('ocean-degradation',     'Ocean degradation',     'Marine systems collapsing.',                   ARRAY['nature']::text[],            ARRAY['ocean pollution','plastic in oceans','coral bleaching','overfishing','marine debris','dead zones']::text[],     ARRAY[14]::int[]),
  ('climate-inaction',      'Climate inaction',      'Failure to act on climate change.',            ARRAY['nature','vision']::text[],   ARRAY['climate change','global warming','climate denial','climate delay','fossil fuels still burning']::text[],         ARRAY[13]::int[]),
  ('soil-degradation',      'Soil degradation',      'Soil being depleted, desertification.',        ARRAY['nature','finance']::text[],  ARRAY['desertification','soil loss','land degradation','dead soil','industrial agriculture damage']::text[],          ARRAY[15,2]::int[]),
  ('water-scarcity',        'Water scarcity',        'Clean water unavailable.',                     ARRAY['nature','society']::text[],  ARRAY['drought','water pollution','no clean water','contaminated water']::text[],                                       ARRAY[6]::int[]),

  -- Society
  ('gendered-violence',     'Gendered violence',     'Violence and harm directed at women, girls, queer people.', ARRAY['society','human']::text[], ARRAY['patriarchy','misogyny','violence against women','sexism','toxic masculinity','rape culture']::text[],              ARRAY[5]::int[]),
  ('racial-injustice',      'Racial injustice',      'Discrimination, violence, exclusion by race.', ARRAY['society','human']::text[],   ARRAY['racism','white supremacy','police brutality','racial inequality','colonial legacy']::text[],                     ARRAY[10,16]::int[]),
  ('indigenous-erasure',    'Indigenous erasure',    'Indigenous peoples marginalised, displaced, killed.', ARRAY['society','legacy','nature']::text[], ARRAY['indigenous rights','colonisation','land theft','first nations marginalisation','cultural genocide']::text[], ARRAY[10,16]::int[]),
  ('authoritarianism',      'Authoritarianism',      'Concentration of political power, erosion of democracy.', ARRAY['society','vision']::text[],  ARRAY['fascism','dictatorship','democratic backsliding','political repression','autocracy']::text[],                  ARRAY[16]::int[]),
  ('mass-incarceration',    'Mass incarceration',    'Punitive justice systems harming people.',     ARRAY['society','human']::text[],   ARRAY['prison industrial complex','over-policing','war on drugs','carceral state']::text[],                            ARRAY[16]::int[]),
  ('housing-precarity',     'Housing precarity',     'People without secure shelter; housing as commodity.', ARRAY['society','finance']::text[], ARRAY['homelessness','rent crisis','housing crisis','evictions','housing unaffordable']::text[],                        ARRAY[11,1]::int[]),
  ('loneliness',            'Loneliness',            'Isolation, disconnection, loss of community.', ARRAY['society','human']::text[],   ARRAY['isolation','disconnection','no community','atomisation','no third place','social fabric fraying']::text[],     ARRAY[3]::int[]),
  ('refugees-and-migration',  'Refugees and migration',     'People displaced; borders harming.',           ARRAY['society','human']::text[],   ARRAY['border violence','refugee crisis','migrant deaths','displacement','asylum denial']::text[],                      ARRAY[10,16]::int[]),

  -- Human Being
  ('mental-health-crisis',  'Mental health crisis',  'Depression, anxiety, suicide rates, no care.', ARRAY['human','society']::text[],   ARRAY['depression epidemic','anxiety','suicide rates','mental illness ignored','therapy unaffordable']::text[],         ARRAY[3]::int[]),
  ('chronic-disease',       'Chronic disease',       'Preventable illness, broken healthcare.',      ARRAY['human','finance']::text[],   ARRAY['diabetes epidemic','heart disease','obesity crisis','healthcare broken','medical bankruptcy']::text[],           ARRAY[3]::int[]),
  ('addiction',             'Addiction',             'Substance abuse, behavioural addiction, despair.',ARRAY['human','society']::text[], ARRAY['opioid crisis','alcoholism','drug epidemic','screen addiction','dopamine crisis']::text[],                     ARRAY[3]::int[]),
  ('disordered-relationship-to-food', 'Disordered relationship to food', 'Eating disorders, food shame, food deserts.', ARRAY['human','nature']::text[], ARRAY['eating disorders','food shame','food deserts','diet culture','obesity industrial complex']::text[],        ARRAY[2,3]::int[]),
  ('lost-meaning',          'Lost meaning',          'Purposelessness; "earning a living is a scam."',ARRAY['human','vision']::text[],   ARRAY['no purpose','meaninglessness','drudgery','soul-crushing work','existential despair','bullshit jobs']::text[],   ARRAY[8]::int[]),

  -- Finance & Economy
  ('wealth-concentration',  'Wealth concentration',  'Extreme inequality, billionaires, hoarded capital.', ARRAY['finance','society']::text[], ARRAY['billionaires','inequality','eat the rich','wealth gap','plutocracy','oligarchy']::text[],                       ARRAY[10,1]::int[]),
  ('poverty',               'Poverty',               'People without resources to live.',            ARRAY['finance','human']::text[],   ARRAY['extreme poverty','no money','working poor','child poverty']::text[],                                              ARRAY[1]::int[]),
  ('exploitative-labour',   'Exploitative labour',   'Workers underpaid, unsafe, dehumanised.',      ARRAY['finance','human']::text[],   ARRAY['sweatshops','wage theft','union busting','gig economy abuse','modern slavery','child labour']::text[],          ARRAY[8]::int[]),
  ('extractive-capitalism', 'Extractive capitalism', 'Economic systems that drain life from people and planet.', ARRAY['finance','nature']::text[], ARRAY['capitalism','neoliberalism','growth at all costs','corporate greed','shareholder primacy']::text[],            ARRAY[8,12]::int[]),
  ('financial-exclusion',   'Financial exclusion',   'People locked out of banking, credit, capital.', ARRAY['finance','society']::text[], ARRAY['unbanked','no credit access','financial deserts','predatory lending']::text[],                                 ARRAY[1,10]::int[]),

  -- Technology
  ('surveillance-capitalism', 'Surveillance capitalism', 'Tech extracting data, manipulating behaviour.', ARRAY['tech','society']::text[],   ARRAY['big tech surveillance','data extraction','algorithmic manipulation','privacy violation','tracking']::text[],     ARRAY[16]::int[]),
  ('ai-misuse',             'AI misuse',             'AI deployed harmfully, without consent or care.', ARRAY['tech','society']::text[],  ARRAY['ai harm','algorithmic bias','deepfakes','ai job loss','agi risk','unaligned ai']::text[],                       ARRAY[16,9]::int[]),
  ('misinformation',        'Misinformation',        'Lies, propaganda, broken information ecosystems.', ARRAY['tech','society','vision']::text[], ARRAY['fake news','propaganda','conspiracy theories','information warfare','post-truth']::text[],                    ARRAY[16]::int[]),
  ('digital-addiction',     'Digital addiction',     'Phones, social media, attention extraction.',  ARRAY['tech','human']::text[],      ARRAY['phone addiction','social media harm','attention economy','doomscrolling','tiktok brain']::text[],               ARRAY[3]::int[]),

  -- Legacy / Vision
  ('intergenerational-debt','Intergenerational debt','Older generations leaving harder world to younger.', ARRAY['legacy','vision']::text[], ARRAY['boomer harm','younger generations betrayed','no future for kids','generational theft']::text[],                  ARRAY[10]::int[]),
  ('cultural-amnesia',      'Cultural amnesia',      'Wisdom and lineage being forgotten.',          ARRAY['legacy','human']::text[],    ARRAY['lost wisdom','rootlessness','cultural erasure','no elders','forgotten ways']::text[],                            ARRAY[4,11]::int[]),
  ('lack-of-imagination',   'Lack of imagination',   'Cannot picture a better future; capitalist realism.', ARRAY['vision']::text[],     ARRAY['no alternative','tina','capitalist realism','no vision','dystopia inevitable']::text[],                          ARRAY[]::int[]),

  -- Cross-cutting
  ('food-system-broken',    'Food system broken',    'Industrial food, hunger amid waste, broken agriculture.', ARRAY['nature','finance','human']::text[], ARRAY['food waste','hunger','factory farming','industrial agriculture','food insecurity']::text[],                  ARRAY[2,12]::int[]),
  ('education-broken',      'Education broken',      'Schools failing, knowledge gatekept.',         ARRAY['society','human','legacy']::text[], ARRAY['schools failing','student debt','education inequality','rote learning','curiosity crushed']::text[],            ARRAY[4]::int[]),
  ('infrastructure-decay',  'Infrastructure decay',  'Public systems falling apart.',                ARRAY['society','finance','tech']::text[], ARRAY['crumbling bridges','transit broken','public services gutted']::text[],                                          ARRAY[9,11]::int[]),
  ('energy-injustice',      'Energy injustice',      'Energy access unequal; fossil dependence.',    ARRAY['nature','finance','society']::text[], ARRAY['fossil fuels','energy poverty','no clean energy access']::text[],                                              ARRAY[7,13]::int[])
ON CONFLICT (slug) DO UPDATE
  SET label        = EXCLUDED.label,
      description  = EXCLUDED.description,
      domains      = EXCLUDED.domains,
      aliases      = EXCLUDED.aliases,
      related_sdgs = EXCLUDED.related_sdgs,
      updated_at   = now();


-- ── 5. RLS — public read, admin write ─────────────────────────────────────
-- The vocabulary is public reference data. Anyone can read it. Only
-- service-role writes (via the tagger endpoint or admin tools).

ALTER TABLE public.nextus_problem_chains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nextus_problem_chains_public_read ON public.nextus_problem_chains;
CREATE POLICY nextus_problem_chains_public_read
  ON public.nextus_problem_chains
  FOR SELECT
  USING (true);

-- (No INSERT/UPDATE/DELETE policy = service role only.)


-- ── 6. Helper view: chain coverage on actors ──────────────────────────────
-- For admin visibility into auto-tagger results.

CREATE OR REPLACE VIEW public.nextus_actor_chain_coverage AS
SELECT
  a.id,
  a.slug,
  a.name,
  a.type,
  a.status,
  a.domains,
  a.problem_chains,
  COALESCE(array_length(a.problem_chains, 1), 0) AS chain_count
FROM public.nextus_actors a;


-- ── Done ──────────────────────────────────────────────────────────────────
-- Verify with:
--   SELECT count(*) FROM nextus_problem_chains WHERE status = 'active';
--   SELECT slug, label FROM nextus_problem_chains ORDER BY slug LIMIT 5;
--   SELECT chain_count, count(*) FROM nextus_actor_chain_coverage
--    WHERE status = 'live' GROUP BY chain_count ORDER BY chain_count;
