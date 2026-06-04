-- ── Migration 002: Ledger entries, reward buckets, audit log ──────────────────
-- Run in Supabase SQL Editor after schema.sql (migration 001).
-- Safe to re-run (uses IF NOT EXISTS and IF EXISTS throughout).

-- ─── reward_bucket_config ─────────────────────────────────────────────────────
-- Stores each kid's spend/save/give split. Defaults: 70/20/10.
CREATE TABLE IF NOT EXISTS public.reward_bucket_config (
  id         uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  family_id  uuid        REFERENCES public.families(id)  ON DELETE CASCADE NOT NULL,
  kid_id     text        REFERENCES public.profiles(id)  ON DELETE CASCADE NOT NULL,
  spend_pct  integer     NOT NULL DEFAULT 70 CHECK (spend_pct >= 0 AND spend_pct <= 100),
  save_pct   integer     NOT NULL DEFAULT 20 CHECK (save_pct  >= 0 AND save_pct  <= 100),
  give_pct   integer     NOT NULL DEFAULT 10 CHECK (give_pct  >= 0 AND give_pct  <= 100),
  CONSTRAINT bucket_pcts_sum_to_100 CHECK (spend_pct + save_pct + give_pct = 100),
  UNIQUE (family_id, kid_id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ─── ledger_entries ───────────────────────────────────────────────────────────
-- Immutable append-only record of every cent earned or paid out.
-- Credits: reward earned per bucket. Debits: payout per bucket.
-- idempotency_key prevents duplicate inserts (e.g. double-tap approve).
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id               uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  family_id        uuid        REFERENCES public.families(id)  ON DELETE CASCADE NOT NULL,
  kid_id           text        REFERENCES public.profiles(id)  ON DELETE CASCADE NOT NULL,
  task_id          text        REFERENCES public.tasks(id)     ON DELETE SET NULL,
  bucket           text        NOT NULL CHECK (bucket    IN ('spend', 'save', 'give')),
  amount_cents     integer     NOT NULL CHECK (amount_cents > 0),
  entry_type       text        NOT NULL CHECK (entry_type IN ('credit', 'debit')),
  idempotency_key  text        UNIQUE,
  note             text,
  created_at       timestamptz DEFAULT now()
);

-- ─── audit_log ────────────────────────────────────────────────────────────────
-- Append-only log of sensitive parent actions for auditability.
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  family_id   uuid        REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  actor_role  text        NOT NULL CHECK (actor_role IN ('parent', 'system')),
  action      text        NOT NULL,
  target_type text,
  target_id   text,
  metadata    jsonb       DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS ledger_entries_family_kid_idx  ON public.ledger_entries(family_id, kid_id);
CREATE INDEX IF NOT EXISTS ledger_entries_task_idx        ON public.ledger_entries(task_id)  WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ledger_entries_created_idx     ON public.ledger_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS tasks_family_status_idx        ON public.tasks(family_id, status);
CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx          ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS tasks_approved_at_idx          ON public.tasks(approved_at DESC) WHERE approved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS transactions_family_kid_idx    ON public.transactions(family_id, kid_id);
CREATE INDEX IF NOT EXISTS audit_log_family_created_idx   ON public.audit_log(family_id, created_at DESC);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.reward_bucket_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log            ENABLE ROW LEVEL SECURITY;

-- reward_bucket_config
DROP POLICY IF EXISTS "bucket_config_select" ON public.reward_bucket_config;
DROP POLICY IF EXISTS "bucket_config_insert" ON public.reward_bucket_config;
DROP POLICY IF EXISTS "bucket_config_update" ON public.reward_bucket_config;
CREATE POLICY "bucket_config_select" ON public.reward_bucket_config
  FOR SELECT USING (family_id = public.my_family_id());
CREATE POLICY "bucket_config_insert" ON public.reward_bucket_config
  FOR INSERT WITH CHECK (family_id = public.my_family_id());
CREATE POLICY "bucket_config_update" ON public.reward_bucket_config
  FOR UPDATE USING  (family_id = public.my_family_id())
             WITH CHECK (family_id = public.my_family_id());

-- ledger_entries — insert and read only (never update/delete from client)
DROP POLICY IF EXISTS "ledger_entries_select" ON public.ledger_entries;
DROP POLICY IF EXISTS "ledger_entries_insert" ON public.ledger_entries;
CREATE POLICY "ledger_entries_select" ON public.ledger_entries
  FOR SELECT USING (family_id = public.my_family_id());
CREATE POLICY "ledger_entries_insert" ON public.ledger_entries
  FOR INSERT WITH CHECK (family_id = public.my_family_id());

-- audit_log — insert and read only
DROP POLICY IF EXISTS "audit_log_select" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_insert" ON public.audit_log;
CREATE POLICY "audit_log_select" ON public.audit_log
  FOR SELECT USING (family_id = public.my_family_id());
CREATE POLICY "audit_log_insert" ON public.audit_log
  FOR INSERT WITH CHECK (family_id = public.my_family_id());

-- ─── Schema additions ─────────────────────────────────────────────────────────
-- Invite code expiry/revocation on families
ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS invite_expires_at  timestamptz,
  ADD COLUMN IF NOT EXISTS invite_revoked_at  timestamptz;

-- Per-kid reward split stored on the profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reward_split jsonb;
-- Example value: {"spend": 70, "save": 20, "give": 10}

-- photo_proof_path: storage path for private bucket (replaces public photo_proof_uri)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS photo_proof_path text;
-- photo_proof_uri remains for backward compat (existing rows keep their value)

-- Idempotency key on transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS transactions_idempotency_idx
  ON public.transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ─── Make task-photos bucket PRIVATE ─────────────────────────────────────────
-- Photos are now accessed via signed URLs only.
UPDATE storage.buckets SET public = false WHERE id = 'task-photos';

-- Remove the old open select policy
DROP POLICY IF EXISTS "task_photos_select" ON storage.objects;

-- Keep insert/delete policies as-is (family_id folder scoping).
-- Signed URL generation is handled server-side by createSignedUrl() which
-- verifies the caller's Supabase auth session before issuing the URL.

-- ─── Realtime for new tables ─────────────────────────────────────────────────
-- Note: only add if supabase_realtime publication exists and tables are new.
-- Comment these out if you get "relation already in publication" errors.
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.ledger_entries;
