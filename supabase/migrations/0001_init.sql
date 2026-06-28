-- ===========================================================================
-- BK/AO Dashboard — initial schema
-- Four tables, Realtime enabled on all of them, RLS granting full read/write
-- to the anon role (the app gates the UI with a client-side 6-digit code and
-- talks to the database with the public anon key). Low-confidentiality.
-- ===========================================================================

-- gen_random_uuid()
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.pipeline_companies (
  id          uuid primary key default gen_random_uuid(),
  pipeline    text not null check (pipeline in ('long', 'short')),
  name        text not null default '',
  status      text not null default '',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.work_plan_items (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.pipeline_companies (id) on delete cascade,
  text        text not null default '',
  done        boolean not null default false,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.idea_rows (
  id          uuid primary key default gen_random_uuid(),
  list        text not null check (list in ('on_deck', 'quick_cut', 'whacky')),
  company     text not null default '',
  side        text not null default 'L' check (side in ('L', 'S')),
  thesis      text not null default '',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.friday_topics (
  id          uuid primary key default gen_random_uuid(),
  text        text not null default '',
  done        boolean not null default false,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes (the app always reads filtered + ordered by these columns)
-- ---------------------------------------------------------------------------

create index if not exists idx_pipeline_companies_pipeline
  on public.pipeline_companies (pipeline, sort_order, created_at);

create index if not exists idx_work_plan_items_company
  on public.work_plan_items (company_id, sort_order, created_at);

create index if not exists idx_idea_rows_list
  on public.idea_rows (list, sort_order, created_at);

create index if not exists idx_friday_topics_order
  on public.friday_topics (sort_order, created_at);

-- ---------------------------------------------------------------------------
-- Row Level Security — the app uses a client-side 6-digit gate and talks to
-- the database with the public anon key, so policies grant full read/write to
-- the anon (and authenticated) roles. This is intentional, low-confidentiality
-- access control (security by URL/key obscurity). See the README.
-- ---------------------------------------------------------------------------

alter table public.pipeline_companies enable row level security;
alter table public.work_plan_items   enable row level security;
alter table public.idea_rows          enable row level security;
alter table public.friday_topics      enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'pipeline_companies', 'work_plan_items', 'idea_rows', 'friday_topics'
  ]
  loop
    execute format(
      'drop policy if exists "shared full access" on public.%I;', t
    );
    execute format(
      'create policy "shared full access" on public.%I
         for all to anon, authenticated using (true) with check (true);', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Realtime — add every table to the supabase_realtime publication
-- (idempotent: skip if already a member).
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'pipeline_companies', 'work_plan_items', 'idea_rows', 'friday_topics'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', t);
    end if;
  end loop;
end $$;
