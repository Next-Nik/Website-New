-- sql/beta/013_invitation_architecture.sql
-- Module 13: Invitation Architecture schema additions + canonical HyaPak seed.
-- Single transaction. Idempotent.

BEGIN;

-- ── 1. invitations_beta ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS invitations_beta (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  text NOT NULL UNIQUE,

  -- Optional human-readable title and subtitle (not always needed; the practice
  -- text is often sufficient)
  title                 text,
  subtitle              text,

  -- Section 1: Surface
  extractive_practice   text,
  extractive_actors     uuid[],         -- references nextus_actors.id

  -- Section 2: Current best available
  regenerative_practice text,
  regenerative_actors   uuid[],         -- references nextus_actors.id

  -- Section 3: The gap (stored as jsonb so each sub-block is independently optional)
  -- Expected keys: technical, economic, infrastructural, cultural
  gap_summary           jsonb,

  -- Section 4: The invitation
  invitation_text       text,

  -- Domain placement (primary first)
  domains               text[],

  -- Optional platform principles engaged by this invitation
  platform_principles   text[],

  status                text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invitations_beta_slug   ON invitations_beta (slug);
CREATE INDEX IF NOT EXISTS idx_invitations_beta_status ON invitations_beta (status);
CREATE INDEX IF NOT EXISTS idx_invitations_beta_domains ON invitations_beta USING GIN (domains);

-- GIN on actor arrays for reverse lookups (find all invitations an actor appears in)
CREATE INDEX IF NOT EXISTS idx_invitations_beta_extractive_actors   ON invitations_beta USING GIN (extractive_actors);
CREATE INDEX IF NOT EXISTS idx_invitations_beta_regenerative_actors ON invitations_beta USING GIN (regenerative_actors);

-- ── 2. Gradient columns on nextus_actors ────────────────────

ALTER TABLE nextus_actors
  ADD COLUMN IF NOT EXISTS gradient_position   numeric CHECK (gradient_position >= 0 AND gradient_position <= 100),
  ADD COLUMN IF NOT EXISTS gradient_trajectory text    CHECK (gradient_trajectory IN ('improving', 'stationary', 'declining', 'unknown'));

-- Index for queries filtering by trajectory (e.g. "all improving actors in Technology")
CREATE INDEX IF NOT EXISTS idx_actors_gradient_trajectory ON nextus_actors (gradient_trajectory)
  WHERE gradient_trajectory IS NOT NULL;

-- ── 3. Updated_at trigger for invitations_beta ───────────────

CREATE OR REPLACE FUNCTION update_invitations_beta_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invitations_beta_updated_at ON invitations_beta;
CREATE TRIGGER trg_invitations_beta_updated_at
  BEFORE UPDATE ON invitations_beta
  FOR EACH ROW EXECUTE FUNCTION update_invitations_beta_updated_at();

-- ── 4. RLS policies ──────────────────────────────────────────

ALTER TABLE invitations_beta ENABLE ROW LEVEL SECURITY;

-- Anyone signed in can read active invitations
DROP POLICY IF EXISTS "invitations_beta_read_active" ON invitations_beta;
CREATE POLICY "invitations_beta_read_active"
  ON invitations_beta FOR SELECT
  USING (status = 'active');

-- Only curator role (or service_role) can write
DROP POLICY IF EXISTS "invitations_beta_curator_write" ON invitations_beta;
CREATE POLICY "invitations_beta_curator_write"
  ON invitations_beta FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
        AND raw_app_meta_data->>'role' IN ('curator', 'admin', 'founder')
    )
  );

-- ── 5. Canonical HyaPak seed ─────────────────────────────────
--
-- HyaPak is the canonical worked example of the invitation architecture.
-- v3.8 canon reference: NextUs_Domain_Structure_COMPLETE.md, Section 4 Technology,
-- and the canonical example in the Invitation Architecture section.
--
-- extractive_actors: empty for v1 — curator decision on which actors to name.
-- regenerative_actors: references HyaPak by a known slug. If HyaPak is not yet
-- in nextus_actors, the array stays empty and is updated when the actor is seeded.
--
-- We use a DO block so this is idempotent (upsert by slug).

DO $$
DECLARE
  v_hyapak_id uuid;
BEGIN
  -- Attempt to resolve HyaPak actor id by slug
  SELECT id INTO v_hyapak_id
  FROM nextus_actors
  WHERE slug = 'hyapak'
  LIMIT 1;

  -- Upsert the canonical invitation
  INSERT INTO invitations_beta (
    slug,
    title,
    subtitle,
    extractive_practice,
    extractive_actors,
    regenerative_practice,
    regenerative_actors,
    gap_summary,
    invitation_text,
    domains,
    platform_principles,
    status
  ) VALUES (
    'hyapak-water-hyacinth-packaging',

    'Single-use plastic packaging',

    'One environmental problem used to solve another: invasive water hyacinth, converted into biodegradable packaging, replacing fossil-fuel-derived single-use plastic.',

    'Single-use plastic packaging derived from fossil fuels. Produced at industrial scale, this practice introduces persistent polymer waste into freshwater systems, marine environments, and terrestrial ecosystems. The cost is not absorbed at the point of use; it is externalised across the entire living world.',

    ARRAY[]::uuid[],  -- curator decision; names added as actors are verified

    'Biodegradable packaging made from invasive water hyacinth, simultaneously addressing aquatic ecosystem damage at the source. Water hyacinth chokes Lake Naivasha and other freshwater systems, blocking fishermen and degrading habitat. Harvesting it for industrial use removes a harm while producing a material that does not persist in the environment. The plastic replacement is the headline; the hyacinth is the means.',

    CASE
      WHEN v_hyapak_id IS NOT NULL THEN ARRAY[v_hyapak_id]
      ELSE ARRAY[]::uuid[]
    END,

    jsonb_build_object(
      'technical',
      'Scaling production to volumes where water hyacinth packaging can compete with incumbent single-use plastics requires investment in processing infrastructure and manufacturing capacity that does not yet exist at the necessary scale. The material science is proven; the industrial throughput is not.',

      'economic',
      'Unit economics currently favour the fossil-fuel incumbent. The full environmental cost of single-use plastic is not reflected in its price; water hyacinth packaging must compete against an artificially cheap incumbent. Investment in scale reduces unit cost, but the transition requires capital willing to accept below-market returns in the near term.',

      'infrastructural',
      'Distribution networks, retailer relationships, and logistics infrastructure are built for the existing packaging supply chain. Integrating a new material requires retailer commitments, cold-chain compatibility assessment, and last-mile logistics that may not exist in all target markets.',

      'cultural',
      'Consumer acceptance of unfamiliar packaging materials requires education and demonstrated equivalence on performance. The assumption that biodegradable means inferior is common and incorrect; closing the perception gap is a communication and demonstration challenge, not a technical one.'
    ),

    'What needs to happen: investment in production scale, infrastructure partnerships, retailer commitments, and policy support that reflects the true cost of fossil-fuel-derived packaging. What you can do: invest, partner, source, advocate, contribute time. The gap is real. The path is visible. The invitation is open.',

    ARRAY['nature', 'technology'],

    ARRAY['indigenous-relational', 'substrate-health']
  )
  ON CONFLICT (slug) DO UPDATE SET
    title                 = EXCLUDED.title,
    subtitle              = EXCLUDED.subtitle,
    extractive_practice   = EXCLUDED.extractive_practice,
    regenerative_practice = EXCLUDED.regenerative_practice,
    regenerative_actors   = CASE
                              WHEN array_length(EXCLUDED.regenerative_actors, 1) > 0
                              THEN EXCLUDED.regenerative_actors
                              ELSE invitations_beta.regenerative_actors
                            END,
    gap_summary           = EXCLUDED.gap_summary,
    invitation_text       = EXCLUDED.invitation_text,
    domains               = EXCLUDED.domains,
    platform_principles   = EXCLUDED.platform_principles,
    updated_at            = now();
END;
$$;

COMMIT;

-- ── Rollback script ───────────────────────────────────────────
-- To roll back this migration:
--
--   BEGIN;
--   DELETE FROM invitations_beta WHERE slug = 'hyapak-water-hyacinth-packaging';
--   ALTER TABLE nextus_actors DROP COLUMN IF EXISTS gradient_position;
--   ALTER TABLE nextus_actors DROP COLUMN IF EXISTS gradient_trajectory;
--   DROP TABLE IF EXISTS invitations_beta;
--   COMMIT;
