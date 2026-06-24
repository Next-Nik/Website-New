-- 148_founder_edit_unclaimed.sql
--
-- Lets a NextUs founder edit an actor profile that nobody has claimed yet, as a
-- steward, until the org takes charge of its own account. The OrgManage UI gate
-- already allows a founder into the editor for unclaimed actors; these policies
-- let the writes that editor makes actually land under row-level security.
--
-- Scope is deliberately narrow: founder may write ONLY where profile_owner IS
-- NULL. The moment an org claims its profile (profile_owner set), the founder
-- loses write access and the owner's existing policies take over. Permissive
-- policies are additive, so nothing here weakens the owner's own access.
--
-- SECURITY MODEL:
-- Enforcement lives here, at the database. is_founder() trusts ONLY app_metadata,
-- which is server-set and cannot be changed by a user from the client. The admin
-- UI gates stay tolerant of either metadata source so the founder can't be locked
-- out, but those are cosmetic — a user who self-assigned user_metadata.role would
-- see console UI yet have every founder write denied here. Set the founder role
-- in app_metadata (see deploy notes) for any of this to grant access.

-- ── is_founder() ──────────────────────────────────────────────
create or replace function public.is_founder()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'founder', false)
$$;

-- ── nextus_actors: the core profile (identity, voice, image, story) ──
-- ProfileTab and VoiceTab write these columns directly on the actor row.
drop policy if exists "Founder edits unclaimed actors" on public.nextus_actors;
create policy "Founder edits unclaimed actors"
  on public.nextus_actors
  for update
  using      (public.is_founder() and profile_owner is null)
  with check (public.is_founder() and profile_owner is null);

-- ── nextus_actor_offerings: offerings on an unclaimed actor ──
drop policy if exists "Founder edits unclaimed actor offerings" on public.nextus_actor_offerings;
create policy "Founder edits unclaimed actor offerings"
  on public.nextus_actor_offerings
  for all
  using (
    public.is_founder()
    and exists (
      select 1 from public.nextus_actors a
      where a.id = nextus_actor_offerings.actor_id
        and a.profile_owner is null
    )
  )
  with check (
    public.is_founder()
    and exists (
      select 1 from public.nextus_actors a
      where a.id = nextus_actor_offerings.actor_id
        and a.profile_owner is null
    )
  );

-- ── nextus_contributions: outcome/confirm writes on an unclaimed actor ──
drop policy if exists "Founder edits unclaimed actor contributions" on public.nextus_contributions;
create policy "Founder edits unclaimed actor contributions"
  on public.nextus_contributions
  for update
  using (
    public.is_founder()
    and exists (
      select 1 from public.nextus_actors a
      where a.id = nextus_contributions.actor_id
        and a.profile_owner is null
    )
  )
  with check (
    public.is_founder()
    and exists (
      select 1 from public.nextus_actors a
      where a.id = nextus_contributions.actor_id
        and a.profile_owner is null
    )
  );

-- ── Child collections on unclaimed actors ──────────────────────
-- Links/Press (Links tab), Credentials, Testimonials. Same shape as the owner
-- policies in 036, but scoped to founder + unclaimed. The Needs tab writes
-- nextus_needs, which isn't defined in these migrations, so it's intentionally
-- omitted here — add it once that table's actor key is confirmed.
do $$
declare t text;
begin
  foreach t in array array['actor_links','actor_press','actor_credentials','actor_testimonials']
  loop
    execute format('drop policy if exists %I on public.%I', 'Founder edits unclaimed ' || t, t);
    execute format($f$
      create policy %I on public.%I
        for all
        using      (public.is_founder() and actor_id in (select id from public.nextus_actors where profile_owner is null))
        with check (public.is_founder() and actor_id in (select id from public.nextus_actors where profile_owner is null))
    $f$, 'Founder edits unclaimed ' || t, t);
  end loop;
end$$;
