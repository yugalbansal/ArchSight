-- ============================================================
-- ArchSight Supabase Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================

-- 1. Users table (synced from Clerk via webhook)
create table if not exists public.users (
  id uuid default gen_random_uuid() primary key,
  clerk_id text unique not null,
  email text,
  name text,
  avatar_url text,
  provider text default 'email',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.users enable row level security;

-- RLS Policies for users table
-- Users can only read their own profile
create policy "Users can view own profile"
  on public.users
  for select
  to authenticated
  using ((select auth.jwt()->>'sub') = clerk_id);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.users
  for update
  to authenticated
  using ((select auth.jwt()->>'sub') = clerk_id);

-- Allow the service_role (backend webhook) to insert/update any user
-- This is needed because webhooks use service_role key, not user JWTs
create policy "Service role can manage all users"
  on public.users
  for all
  to service_role
  using (true)
  with check (true);


-- 2. Repositories table (user's connected repos)
create table if not exists public.repositories (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  name text not null,
  url text,
  provider text default 'github',
  language text,
  last_scanned_at timestamptz,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.repositories enable row level security;

-- Users can only CRUD their own repositories
create policy "Users can view own repos"
  on public.repositories for select to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

create policy "Users can insert own repos"
  on public.repositories for insert to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);

create policy "Users can update own repos"
  on public.repositories for update to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

create policy "Users can delete own repos"
  on public.repositories for delete to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

create policy "Service role can manage all repos"
  on public.repositories for all to service_role
  using (true) with check (true);


-- 3. Scans table (architecture scan history)
create table if not exists public.scans (
  id uuid default gen_random_uuid() primary key,
  repository_id uuid references public.repositories(id) on delete cascade,
  user_id text not null,
  status text default 'pending',
  findings_count int default 0,
  duration_ms int,
  created_at timestamptz default now()
);

alter table public.scans enable row level security;

create policy "Users can view own scans"
  on public.scans for select to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

create policy "Users can insert own scans"
  on public.scans for insert to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);

create policy "Service role can manage all scans"
  on public.scans for all to service_role
  using (true) with check (true);


-- 4. Insights table (AI-generated insights per repo)
create table if not exists public.insights (
  id uuid default gen_random_uuid() primary key,
  repository_id uuid references public.repositories(id) on delete cascade,
  user_id text not null,
  title text not null,
  description text,
  severity text default 'info',
  category text,
  created_at timestamptz default now()
);

alter table public.insights enable row level security;

create policy "Users can view own insights"
  on public.insights for select to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

create policy "Service role can manage all insights"
  on public.insights for all to service_role
  using (true) with check (true);


-- 5. Create indexes for performance
create index if not exists idx_users_clerk_id on public.users(clerk_id);
create index if not exists idx_repositories_user_id on public.repositories(user_id);
create index if not exists idx_scans_user_id on public.scans(user_id);
create index if not exists idx_scans_repository_id on public.scans(repository_id);
create index if not exists idx_insights_user_id on public.insights(user_id);
create index if not exists idx_insights_repository_id on public.insights(repository_id);
