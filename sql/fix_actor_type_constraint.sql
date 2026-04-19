-- ============================================================
-- Fix nextus_actors type check constraint
-- Adds 'programme' and 'resource' which the AI extraction
-- engine returns but the original constraint didn't include.
-- Safe to run on existing data.
-- ============================================================

ALTER TABLE nextus_actors
  DROP CONSTRAINT IF EXISTS nextus_actors_type_check;

ALTER TABLE nextus_actors
  ADD CONSTRAINT nextus_actors_type_check
  CHECK (type IN (
    'organisation',
    'project',
    'practitioner',
    'programme',
    'resource'
  ));

-- Verify:
-- SELECT constraint_name FROM information_schema.table_constraints
-- WHERE table_name = 'nextus_actors' AND constraint_type = 'CHECK';
