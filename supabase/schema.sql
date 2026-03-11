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
  -- Payment fields (parent profile only)
  stripe_customer_id        text,
  stripe_payment_method_id  text,
  stripe_card_last4         text,
  stripe_card_brand         text,
  -- Kid balance (kid profiles only) — in cents, e.g. 500 = $5.00
  balance_cents   integer default 0,
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
  amount_cents   integer,  -- optional real-money reward in cents (e.g. 500 = $5.00)
  created_at     bigint,   -- epoch ms from client
  completed_at   bigint,
  approved_at    bigint
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TRANSACTIONS
-- Immutable record of every real-money payment from parent to kid.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.transactions (
  id                        uuid    default uuid_generate_v4() primary key,
  family_id                 uuid    references public.families(id) on delete cascade not null,
  kid_id                    text    references public.profiles(id),
  task_id                   text    references public.tasks(id),
  amount_cents              integer not null,
  type                      text    default 'payment',  -- 'payment' | 'payout'
  stripe_payment_intent_id  text,
  note                      text,
  created_at                timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
--
-- Current model: anon key + unguessable UUID family_ids for data segregation.
-- Kids do not have Supabase Auth accounts, so auth.uid()-based policies are
-- not yet possible.
--
-- TODO (before public launch): Add Supabase Auth for parents and replace the
-- policies below with:
--   using (family_id = (auth.jwt() -> 'family_id')::uuid)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.families     enable row level security;
alter table public.profiles     enable row level security;
alter table public.tasks        enable row level security;
alter table public.transactions enable row level security;

-- Drop old wide-open policies if upgrading from a previous schema
drop policy if exists "families_open" on public.families;
drop policy if exists "profiles_open" on public.profiles;
drop policy if exists "tasks_open"    on public.tasks;

-- FAMILIES ────────────────────────────────────────────────────────────────────
-- SELECT needed: invite-code lookup + loading family name on join
-- INSERT needed: initial family creation during onboarding
-- UPDATE needed: rename family
-- DELETE intentionally blocked from the anon client
create policy "families_select" on public.families
  for select using (true);
create policy "families_insert" on public.families
  for insert with check (true);
create policy "families_update" on public.families
  for update using (true) with check (true);

-- PROFILES ────────────────────────────────────────────────────────────────────
-- Full CRUD except hard-delete (kids are archived, not deleted, to preserve
-- task history). family_id NOT NULL enforced so orphan rows can't be inserted.
create policy "profiles_select" on public.profiles
  for select using (true);
create policy "profiles_insert" on public.profiles
  for insert with check (family_id is not null);
create policy "profiles_update" on public.profiles
  for update using (true) with check (family_id is not null);

-- TASKS ───────────────────────────────────────────────────────────────────────
-- Full CRUD needed: kids complete tasks, parents approve, recurring tasks
-- auto-respawn, and tasks can be deleted by parents.
-- family_id NOT NULL enforced on writes.
create policy "tasks_select" on public.tasks
  for select using (true);
create policy "tasks_insert" on public.tasks
  for insert with check (family_id is not null);
create policy "tasks_update" on public.tasks
  for update using (true) with check (family_id is not null);
create policy "tasks_delete" on public.tasks
  for delete using (true);

-- TRANSACTIONS ─────────────────────────────────────────────────────────────────
drop policy if exists "transactions_select" on public.transactions;
drop policy if exists "transactions_insert" on public.transactions;
create policy "transactions_select" on public.transactions
  for select using (true);
create policy "transactions_insert" on public.transactions
  for insert with check (family_id is not null);

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

-- v1.2: Add payments support
-- alter table public.tasks    add column if not exists amount_cents integer;
-- alter table public.profiles add column if not exists stripe_customer_id       text;
-- alter table public.profiles add column if not exists stripe_payment_method_id text;
-- alter table public.profiles add column if not exists stripe_card_last4        text;
-- alter table public.profiles add column if not exists stripe_card_brand        text;
-- alter table public.profiles add column if not exists balance_cents            integer default 0;
-- create table if not exists public.transactions ( ... );  -- see full definition above
