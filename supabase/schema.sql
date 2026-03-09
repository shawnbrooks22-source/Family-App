-- ─── Kindo Database Schema ────────────────────────────────────────────────────
-- Run this in your Supabase project's SQL Editor
-- Project Dashboard → SQL Editor → New Query → Paste & Run

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- FAMILIES
-- Each family has a unique invite code for joining on new devices
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.families (
  id          uuid    default uuid_generate_v4() primary key,
  name        text    not null default 'My Family',
  invite_code text    unique not null,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES
-- One row per family member (parent + kids).
-- Kids don't have auth accounts — they're stored as profiles only.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id              text    primary key,  -- timestamp-based id from client
  family_id       uuid    references public.families(id) on delete cascade not null,
  name            text    not null,
  emoji           text    default '👤',
  phone           text    default '',
  role            text    default 'kid',    -- 'parent' | 'kid'
  color           text    default '#7C3AED',
  parent_pin      text,                    -- 4-digit PIN, parent only
  parent_email    text,                    -- for future auth, parent only
  goal            jsonb,                   -- { name, stars } | null
  streak          integer default 0,       -- current daily streak (days)
  last_completed_date text,               -- ISO date string of last task completion
  notify_prefs    jsonb default '{"taskCompleted": true, "taskApproved": true}'::jsonb,
  created_at      timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TASKS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id             text    primary key,  -- timestamp-based id from client
  family_id      uuid    references public.families(id) on delete cascade not null,
  title          text    not null,
  emoji          text    default '🧹',
  reward         text    not null,
  notes          text    default '',
  assigned_to    text    references public.profiles(id),
  status         text    default 'pending',  -- 'pending' | 'completed' | 'approved'
  recurrence     text    default 'none',     -- 'none' | 'daily' | 'weekly'
  celebrated     boolean default false,
  due_date       text,     -- ISO date string 'YYYY-MM-DD', optional deadline
  created_at     bigint,   -- epoch ms from client
  completed_at   bigint,
  approved_at    bigint
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- For V1: open access gated by family_id (provided by client).
-- Upgrade to JWT-based RLS in production.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.families enable row level security;
alter table public.profiles  enable row level security;
alter table public.tasks     enable row level security;

-- Allow all operations for now (V1 — tighten in production)
create policy "families_open"  on public.families  for all using (true) with check (true);
create policy "profiles_open"  on public.profiles  for all using (true) with check (true);
create policy "tasks_open"     on public.tasks     for all using (true) with check (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- REALTIME
-- Enable real-time subscriptions so kid and parent devices stay in sync
-- ─────────────────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.profiles;

-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATIONS (run only if upgrading an existing installation)
-- ─────────────────────────────────────────────────────────────────────────────

-- v1.1: Add due_date to tasks and notification preferences to profiles
-- alter table public.tasks    add column if not exists due_date    text;
-- alter table public.profiles add column if not exists notify_prefs jsonb default '{"taskCompleted": true, "taskApproved": true}'::jsonb;
