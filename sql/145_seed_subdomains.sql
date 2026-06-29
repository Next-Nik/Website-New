-- 145_seed_subdomains.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Seed the canonical subdomains into nextus_subdomains (29 June 2026).
--
-- The table was rebuilt in the dashboard to mirror nextus_domains (text id,
-- per-row horizon_goal, gap fields) but never populated, so get_domain_tree
-- returns nothing and the UI falls back to STATIC_DOMAINS in data.js. This
-- writes that canon into the database: the elemental Nature set (Earth, Air,
-- Salt Water, Fresh Water, Flora, Fauna, Living Systems) and every other
-- domain's subdomains, so the explorer, Active Focus, and the org extractor
-- all read one source of truth.
--
-- Idempotent: ON CONFLICT DO NOTHING. Lenses live in lenses.js (a separate,
-- consistent axis) and are not touched here.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

insert into public.nextus_subdomains
  (id, domain_id, name, horizon_goal, description, level, sort_order, data_status, total_actors, indicators, sources, gap_signal)
values
  ('hb-body', 'human-being', 'Body', 'Every person lives in a body that is cared for, understood, and able to do what life asks of it.', 'The physical instrument through which everything else is expressed.', 1, 1, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('hb-mind', 'human-being', 'Mind', 'Every person has a mind that is clear, regulated, and capable of meeting complexity.', 'The cognitive and psychological capacity to understand, navigate, and act in the world.', 1, 2, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('hb-inner-life', 'human-being', 'Inner Life', 'Every person has access to their own depth — and the tools to explore it.', 'The interior dimension of human experience. The territory most systems ignore but which shapes everything collective.', 1, 3, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('hb-development', 'human-being', 'Development', 'Every person has the conditions and support to keep growing across their whole life.', 'How human capacity is cultivated, transmitted, and grown across the lifespan.', 1, 4, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('hb-dignity', 'human-being', 'Dignity & Rights', 'Every person is recognised as fully human — with rights that are protected and a life that is their own.', 'The structural conditions that protect and enable human flourishing.', 1, 5, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('hb-expression', 'human-being', 'Expression & Culture', 'Every person can make meaning, create, and contribute to the cultural life of their community.', 'How human beings process experience and transmit values through creative expression.', 1, 6, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('soc-governance', 'society', 'Governance', 'Power serves people, and people trust it to.', 'The systems through which communities make collective decisions and exercise power.', 1, 1, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('soc-culture', 'society', 'Culture', 'Every community knows who it is and carries that forward.', 'The shared meanings, practices, and identities that hold communities together across time.', 1, 2, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('soc-conflict-peace', 'society', 'Conflict & Peace', 'Disagreement doesn''t destroy. It builds.', 'The mechanisms through which human communities navigate difference, tension, and breakdown.', 1, 3, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('soc-community', 'society', 'Community', 'Every community has the capacity to shape its own future.', 'The collective structures of belonging, participation, and mutual care.', 1, 4, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('soc-communication', 'society', 'Communication & Information', 'What is true is visible. What is false doesn''t travel far.', 'How communities share knowledge, tell stories, and maintain a shared picture of reality.', 1, 5, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('soc-global', 'society', 'Global Coordination', 'The world acts together when it needs to.', 'The architecture through which humanity coordinates across national and cultural boundaries.', 1, 6, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('nat-earth', 'nature', 'Earth', 'Soil is alive, deep, and growing.', 'The living skin of the planet — the foundation of all terrestrial life.', 1, 1, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('nat-air', 'nature', 'Air', 'The atmosphere is stable and clean.', 'The atmospheric envelope that regulates climate, carries weather, and makes breath possible.', 1, 2, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('nat-salt-water', 'nature', 'Salt Water', 'Oceans and seas are full, diverse, and self-regulating.', 'The world''s oceans and seas — the largest living systems on Earth.', 1, 3, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('nat-fresh-water', 'nature', 'Fresh Water', 'Rivers, lakes, groundwater, and ice are clean, replenished, and free to move.', 'The freshwater systems that sustain all terrestrial life.', 1, 4, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('nat-flora', 'nature', 'Flora', 'Plant life is diverse, abundant, and spreading.', 'The plant kingdom — the primary producers that underpin all food webs.', 1, 5, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('nat-fauna', 'nature', 'Fauna', 'Animal life is diverse, wild, and thriving in its habitat.', 'The animal kingdom — from insects to megafauna, wild and domesticated.', 1, 6, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('nat-living-systems', 'nature', 'Living Systems', 'The invisible networks that connect everything are intact and communicating.', 'The relational infrastructure of life — the networks that connect all living things.', 1, 7, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('tech-digital', 'technology', 'Digital Systems', 'Information flows freely, honestly, and serves the people using it.', 'The digital infrastructure through which information moves and decisions are made.', 1, 1, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('tech-biological', 'technology', 'Biological Technology', 'We work with life''s own intelligence rather than overriding it.', 'Technologies that engage directly with living systems — from medicine to agriculture to engineering.', 1, 2, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('tech-infrastructure', 'technology', 'Physical Infrastructure', 'The built world supports life rather than displacing it.', 'The physical systems through which civilisation moves people, goods, and resources.', 1, 3, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('tech-energy', 'technology', 'Energy', 'Clean energy is abundant, accessible, and equitably distributed.', 'The systems through which civilisation generates and moves energy.', 1, 4, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('tech-frontier', 'technology', 'Frontier & Emerging Technology', 'What we are building next is governed by wisdom, not just capability.', 'The technologies at the edge of current knowledge — with the highest potential and the highest risk.', 1, 5, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('fe-resources', 'finance-economy', 'Resources', 'The planet''s resources are used at the rate they can be replenished.', 'The natural systems that provide the material basis for all economic activity.', 1, 1, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('fe-exchange', 'finance-economy', 'Exchange', 'Value moves freely and fairly between people and communities.', 'The systems through which people trade, share, and transfer value.', 1, 2, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('fe-capital', 'finance-economy', 'Capital', 'Money flows toward what generates life, not away from it.', 'The systems through which financial resources are accumulated, invested, and deployed.', 1, 3, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('fe-labour', 'finance-economy', 'Labour', 'Every person''s contribution is recognised and fairly returned.', 'The systems through which human effort is organised, valued, and rewarded.', 1, 4, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('fe-ownership', 'finance-economy', 'Ownership', 'What belongs to everyone is held and governed as such.', 'The systems that determine who holds what — and on what terms.', 1, 5, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('fe-distribution', 'finance-economy', 'Distribution', 'No one lacks what they need because of where or who they were born.', 'The systems through which the products of economic activity are shared across populations.', 1, 6, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('leg-wisdom', 'legacy', 'Wisdom', 'What has been learned is alive, transmittable, and growing.', 'The accumulated understanding of how to live well — across cultures, traditions, and generations.', 1, 1, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('leg-memory', 'legacy', 'Memory', 'What has happened is honestly held and passed forward.', 'The systems through which communities remember, record, and reckon with their past.', 1, 2, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('leg-ceremony', 'legacy', 'Ceremony & Ritual', 'The moments that matter are marked and shared.', 'The practices through which communities honour transitions, loss, celebration, and the sacred.', 1, 3, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('leg-intergenerational', 'legacy', 'Intergenerational Relationship', 'The old and the young are in genuine relationship with each other.', 'The living connections between generations — the channels through which wisdom, love, and responsibility travel.', 1, 4, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('leg-long-arc', 'legacy', 'The Long Arc', 'Decisions are made as if the next seven generations are in the room.', 'The systems and practices through which humanity takes responsibility for its long-term trajectory.', 1, 5, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('vis-imagination', 'vision', 'Imagination', 'Humanity can see beyond what currently exists.', 'The capacity to conceive of futures that don''t yet exist — and to make them feel real enough to move toward.', 1, 1, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('vis-philosophy', 'vision', 'Philosophy & Worldview', 'We have the frameworks to make sense of where we are and where we''re going.', 'The foundational frameworks through which humanity understands itself, its values, and its place in the cosmos.', 1, 2, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('vis-leadership', 'vision', 'Leadership', 'The people guiding humanity forward are worthy of that role.', 'The human capacity to orient, inspire, and coordinate others toward what matters.', 1, 3, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('vis-coordination', 'vision', 'Coordination', 'Actors across every domain can find each other and move together.', 'The infrastructure through which distributed actors align and act without requiring central control.', 1, 4, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false),
  ('vis-foresight', 'vision', 'Foresight', 'We are making decisions today that the future will thank us for.', 'The systematic capacity to anticipate, prepare for, and shape what''s coming.', 1, 5, 'illustrative', 0, '[]'::jsonb, '[]'::jsonb, false)
on conflict do nothing;

commit;
