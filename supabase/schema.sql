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
  id              uuid    default uuid_generate_v4() primary key,
  name            text    not null default 'My Family',
  invite_code     text    unique not null,
  parent_auth_id  uuid    references auth.users(id),  -- Supabase Auth user who owns this family
  created_at      timestamptz default now()
);
create index if not exists families_parent_auth_id_idx on public.families(parent_auth_id);

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
  -- Star milestones set by parent: [{ id, stars_required, reward, achieved, achieved_at, redeemed, redeemed_at }]
  milestones      jsonb default '[]'::jsonb,
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
  celebrated      boolean default false,
  due_date        text,     -- ISO date string 'YYYY-MM-DD', optional deadline
  amount_cents    integer,  -- optional real-money reward in cents (e.g. 500 = $5.00)
  photo_proof_uri text,     -- Supabase Storage public URL (uploaded on task completion)
  payment_status  text,     -- null | 'failed' — set by stripe-webhook when charge fails
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
-- Auth model: parents sign up with email/password via Supabase Auth.
-- Kids do NOT have auth accounts — they access through the parent's session.
-- Every operation is scoped to the authenticated parent's family via the
-- helper function below.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.families     enable row level security;
alter table public.profiles     enable row level security;
alter table public.tasks        enable row level security;
alter table public.transactions enable row level security;

-- Drop all old policies so this script is safe to re-run
drop policy if exists "families_open"   on public.families;
drop policy if exists "families_select" on public.families;
drop policy if exists "families_insert" on public.families;
drop policy if exists "families_update" on public.families;
drop policy if exists "profiles_open"   on public.profiles;
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "tasks_open"      on public.tasks;
drop policy if exists "tasks_select"    on public.tasks;
drop policy if exists "tasks_insert"    on public.tasks;
drop policy if exists "tasks_update"    on public.tasks;
drop policy if exists "tasks_delete"    on public.tasks;
drop policy if exists "transactions_select" on public.transactions;
drop policy if exists "transactions_insert" on public.transactions;

-- Helper: returns the family_id owned by the currently authenticated parent.
-- Returns NULL if not authenticated (safely blocks all access).
create or replace function public.my_family_id()
returns uuid language sql stable security definer as $$
  select id from public.families where parent_auth_id = auth.uid() limit 1;
$$;

-- FAMILIES ────────────────────────────────────────────────────────────────────
-- SELECT: authenticated parents see only their own family.
--         Unauthenticated reads are allowed ONLY for invite-code lookups
--         (family name is not sensitive; Stripe data lives in profiles).
-- INSERT: only authenticated users; parent_auth_id must match their uid.
-- UPDATE: only the owning parent.
-- DELETE: blocked (use clearAllData which calls the service-role Edge Function).
create policy "families_select" on public.families
  for select using (
    parent_auth_id = auth.uid()          -- authenticated parent sees their family
    or auth.uid() is null                -- unauthenticated can look up by invite_code
  );
create policy "families_insert" on public.families
  for insert with check (parent_auth_id = auth.uid());
create policy "families_update" on public.families
  for update using (parent_auth_id = auth.uid())
              with check (parent_auth_id = auth.uid());

-- PROFILES ────────────────────────────────────────────────────────────────────
-- All profile access (including Stripe card data) scoped to the authenticated
-- parent's family only.
create policy "profiles_select" on public.profiles
  for select using (family_id = public.my_family_id());
create policy "profiles_insert" on public.profiles
  for insert with check (family_id = public.my_family_id());
create policy "profiles_update" on public.profiles
  for update using (family_id = public.my_family_id())
              with check (family_id = public.my_family_id());

-- TASKS ───────────────────────────────────────────────────────────────────────
create policy "tasks_select" on public.tasks
  for select using (family_id = public.my_family_id());
create policy "tasks_insert" on public.tasks
  for insert with check (family_id = public.my_family_id());
create policy "tasks_update" on public.tasks
  for update using (family_id = public.my_family_id())
              with check (family_id = public.my_family_id());
create policy "tasks_delete" on public.tasks
  for delete using (family_id = public.my_family_id());

-- TRANSACTIONS ─────────────────────────────────────────────────────────────────
create policy "transactions_select" on public.transactions
  for select using (family_id = public.my_family_id());
create policy "transactions_insert" on public.transactions
  for insert with check (family_id = public.my_family_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- STORAGE
-- Bucket for task photo proofs. Run this once in Supabase Dashboard → Storage,
-- or via the SQL editor.
-- ─────────────────────────────────────────────────────────────────────────────
-- Create bucket (public so thumbnail URLs work without signing)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-photos',
  'task-photos',
  true,                          -- public bucket — URLs work without tokens
  5242880,                       -- 5 MB max per photo
  array['image/jpeg','image/jpg','image/png','image/webp','image/heic']
)
on conflict (id) do nothing;

-- Storage RLS: parents in a family can upload/read their own family's photos.
-- Path format: {family_id}/{task_id}.{ext}
create policy "task_photos_insert" on storage.objects
  for insert with check (
    bucket_id = 'task-photos'
    and (storage.foldername(name))[1] = public.my_family_id()::text
  );
create policy "task_photos_select" on storage.objects
  for select using (bucket_id = 'task-photos');  -- public read (URLs are unguessable UUIDs)
create policy "task_photos_delete" on storage.objects
  for delete using (
    bucket_id = 'task-photos'
    and (storage.foldername(name))[1] = public.my_family_id()::text
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- REALTIME
-- Enable real-time subscriptions so kid and parent devices stay in sync
-- ─────────────────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.profiles;

-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATIONS (run only if upgrading an existing installation)
-- ─────────────────────────────────────────────────────────────────────────────

-- v1.4: Add star milestones to kid profiles
-- alter table public.profiles add column if not exists milestones jsonb default '[]'::jsonb;

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

-- v1.3: Add Supabase Auth for parents (run this if upgrading from v1.2)
-- alter table public.families add column if not exists parent_auth_id uuid references auth.users(id);
-- create index if not exists families_parent_auth_id_idx on public.families(parent_auth_id);
-- (then re-run the RLS section above to replace the old wide-open policies)
