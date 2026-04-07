# NextUs — Session Drop Notes
April 2026

Drop these files into the repo maintaining the folder structure exactly. All paths mirror the existing repo.

---

## New Supabase Tables Required

Run these in the Supabase SQL editor before deploying.

```sql
-- Expansion setup (one row per user)
create table expansion_setup (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  horizon_self text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table expansion_setup enable row level security;
create policy "Users manage own setup" on expansion_setup
  for all using (auth.uid() = user_id);

-- Skills and knowledge list
create table expansion_skills (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  type text check (type in ('skill', 'knowledge')) default 'skill',
  status text check (status in ('now', 'next', 'later', 'done', 'untriaged')) default 'untriaged',
  created_at timestamptz default now()
);
alter table expansion_skills enable row level security;
create policy "Users manage own skills" on expansion_skills
  for all using (auth.uid() = user_id);

-- Daily/weekly/monthly/quarterly check-ins
create table expansion_checkins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  check_date date not null,
  cadence text check (cadence in ('daily', 'weekly', 'monthly', 'quarterly')) default 'daily',
  thoughts text,
  emotions text,
  actions text,
  skill_note text,
  loop_flagged boolean default false,
  pitfall_flagged boolean default false,
  created_at timestamptz default now()
);
alter table expansion_checkins enable row level security;
create policy "Users manage own checkins" on expansion_checkins
  for all using (auth.uid() = user_id);

-- Thought loop records
create table expansion_loops (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  loop_text text,
  function_text text,
  interruption text,
  replacement text,
  created_at timestamptz default now()
);
alter table expansion_loops enable row level security;
create policy "Users manage own loops" on expansion_loops
  for all using (auth.uid() = user_id);
```

---

## Access Control

Add `expansion` as a product key in the access control system (wherever `foundation`, `map`, `purpose_piece`, `target_goals` are defined). Expansion requires Map completion — this is enforced in the UI, not at the access gate level.

---

## What Changed

### New files
- `src/tools/expansion/Expansion.jsx` — full tool UI
- `api/expansion-setup-chat.js` — Horizon Self deepening, skill suggestions, triage
- `api/expansion-daily-chat.js` — T.E.A. daily/weekly/monthly/quarterly + resource suggestions
- `api/expansion-loop-chat.js` — four-step thought loop interruption conversation

### Updated files
- `src/App.jsx` — Expansion route added
- `src/pages/LifeOS.jsx` — Expansion placeholder upgraded to live tool card
- `src/components/ToolDrawer.jsx` — Expansion added
- `src/components/ToolCompassPanel.jsx` — Expansion added
- `vercel.json` — Expansion API functions and rewrites added
- `src/Nav.jsx` — mobile hamburger menu
- `src/pages/Home.jsx` — hero copy, testimonials, is-this-for-you
- `src/pages/About.jsx` — photo slot, trust paragraph, purpose statement
- `src/pages/WorkAndPodcast.jsx` — two-column hero with photo slot
- `src/pages/Profile.jsx` — Signal/Connection domain renames
- `src/components/AccessGate.jsx` — dead /pricing link fixed
- `src/components/SiteFooter.jsx` — mobile bottom padding
- `src/components/CivilisationalFramePanel.jsx` — moved to right edge
- `src/components/ToolCompassPanel.jsx` — tool subtitles, Orienteering renamed
- `src/components/ToolDrawer.jsx` — tool subtitles, Orienteering renamed
- `src/components/DomainsPanel.jsx` — Signal/Connection
- `src/components/SprintPanel.jsx` — Signal/Connection
- `src/tools/map/Map.jsx` — Signal/Connection domains, fractal mapping, "Find your path."
- `src/tools/target-goals/TargetGoals.jsx` — welcome copy, Signal/Connection
- `src/tools/purpose-piece/PurposePiece.jsx` — welcome modal copy
- `api/map-chat.js` — Signal/Connection
- `api/map-avatar-chat.js` — Signal/Connection
- `api/map-scoring-chat.js` — Signal/Connection
- `api/target-goals-chat.js` — Signal/Connection
- `public/glossary.json` — Signal/Connection

### Photo — action required
Add `nik.jpg` to `/public`. Referenced in About.jsx and WorkAndPodcast.jsx with graceful fallback if missing.

---

## Domain Renames (for your records)
- Outer Game → Signal (fractal: Technology)
- Relationships → Connection (fractal: Society)
- New tool: Expansion at /tools/expansion
