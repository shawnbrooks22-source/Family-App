/**
 * Kindo — Delete Account (Supabase Edge Function)
 *
 * Permanently deletes a parent's Supabase Auth user AND all family data.
 * Uses the service-role key so it can delete auth.users rows.
 *
 * ─── SETUP ───────────────────────────────────────────────────────────────────
 * Deploy:
 *   npx supabase functions deploy delete-account --no-verify-jwt
 *
 * Add to .env:
 *   EXPO_PUBLIC_SUPABASE_DELETE_ACCOUNT = https://<project>.supabase.co/functions/v1/delete-account
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const { familyId, authUserId } = await req.json();
    if (!familyId || !authUserId) {
      return json({ error: 'Missing familyId or authUserId' }, 400);
    }

    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Delete all family data (cascade deletes profiles, tasks, transactions)
    const { error: famErr } = await db
      .from('families')
      .delete()
      .eq('id', familyId)
      .eq('parent_auth_id', authUserId); // safety check — only delete own family

    if (famErr) return json({ error: famErr.message }, 500);

    // 2. Delete task photos from Supabase Storage
    const { data: files } = await db.storage
      .from('task-photos')
      .list(familyId);
    if (files && files.length > 0) {
      const paths = files.map(f => `${familyId}/${f.name}`);
      await db.storage.from('task-photos').remove(paths).catch(() => {});
    }

    // 3. Delete the Supabase Auth user (requires service-role key)
    const { error: authErr } = await db.auth.admin.deleteUser(authUserId);
    if (authErr) return json({ error: authErr.message }, 500);

    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message || 'Internal error' }, 500);
  }
});
