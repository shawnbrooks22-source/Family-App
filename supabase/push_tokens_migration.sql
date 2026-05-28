-- ── Push token support for cross-device notifications ─────────────────────────
--
-- Run this once in your Supabase project:
--   Dashboard → SQL Editor → New query → paste → Run
--
-- What it does:
--   • Adds parent_device_token TEXT to families (parent's Expo push token)
--   • Adds kid_device_tokens TEXT[] to families (all joined kid devices)
--   • Creates an RPC function so kid devices (no auth) can register themselves

ALTER TABLE families ADD COLUMN IF NOT EXISTS parent_device_token TEXT;
ALTER TABLE families ADD COLUMN IF NOT EXISTS kid_device_tokens    TEXT[] DEFAULT '{}';

-- RPC: any device that knows the family_id (proven by possessing the invite code)
-- can append its push token. SECURITY DEFINER bypasses RLS so unauthenticated
-- kid devices can call this without an auth session.
CREATE OR REPLACE FUNCTION add_kid_device_token(p_family_id UUID, p_token TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE families
  SET kid_device_tokens = array_append(
    array_remove(COALESCE(kid_device_tokens, '{}'), p_token),  -- deduplicate
    p_token
  )
  WHERE id = p_family_id;
END;
$$;
