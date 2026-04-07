# NextUs — Full Session Drop
April 2026 — Complete build including all audit fixes, domain renames, Expansion tool, Connection sub-domains, and North Star.

## Supabase — Run These First

```sql
-- Expansion setup
create table if not exists expansion_setup (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  horizon_self text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table expansion_setup enable row level security;
create policy "Users manage own setup" on expansion_setup for all using (auth.uid() = user_id);

-- Skills list
create table if not exists expansion_skills (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  type text check (type in ('skill', 'knowledge')) default 'skill',
  status text check (status in ('now', 'next', 'later', 'done', 'untriaged')) default 'untriaged',
  created_at timestamptz default now()
);
alter table expansion_skills enable row level security;
create policy "Users manage own skills" on expansion_skills for all using (auth.uid() = user_id);

-- Daily check-ins
create table if not exists expansion_checkins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  check_date date not null,
  cadence text default 'daily',
  thoughts text,
  emotions text,
  actions text,
  skill_note text,
  loop_flagged boolean default false,
  pitfall_flagged boolean default false,
  created_at timestamptz default now()
);
alter table expansion_checkins enable row level security;
create policy "Users manage own checkins" on expansion_checkins for all using (auth.uid() = user_id);

-- Thought loops
create table if not exists expansion_loops (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  loop_text text,
  function_text text,
  interruption text,
  replacement text,
  created_at timestamptz default now()
);
alter table expansion_loops enable row level security;
create policy "Users manage own loops" on expansion_loops for all using (auth.uid() = user_id);

-- North Star cross-tool memory
create table if not exists north_star_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  tool text not null,
  note text not null,
  created_at timestamptz default now()
);
alter table north_star_notes enable row level security;
create policy "Users manage own notes" on north_star_notes for all using (auth.uid() = user_id);
```

## Access Control
Add `expansion` as a product key alongside `foundation`, `map`, `purpose_piece`, `target_goals`.

## Photo
Add `nik.jpg` to `/public`. Referenced in About.jsx and WorkAndPodcast.jsx.

## Domain Renames
- Outer Game → Signal (fractal: Technology)  
- Relationships → Connection (fractal: Society)

## AI Agent
North Star is the consistent AI companion across all tools. Identity injected into every API file.

## What Changed This Session
All audit fixes + Expansion tool + Connection sub-domains + North Star + ToolCompassPanel everywhere.
