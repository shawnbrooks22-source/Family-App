/**
 * Kindo — Stripe Webhook Handler (Supabase Edge Function)
 *
 * Handles async Stripe events so the app stays in sync even when
 * charges are refunded or fail outside the app's normal flow.
 *
 * ─── SETUP ───────────────────────────────────────────────────────────────────
 * 1. In Stripe Dashboard → Developers → Webhooks → Add endpoint:
 *      URL: https://<project>.supabase.co/functions/v1/stripe-webhook
 *      Events to listen for:
 *        • payment_intent.payment_failed
 *        • charge.refunded
 *
 * 2. Copy the "Signing secret" (whsec_...) from the webhook page.
 *
 * 3. In Supabase Dashboard → Edge Functions → Manage secrets, add:
 *      STRIPE_WEBHOOK_SECRET = whsec_...
 *      STRIPE_SECRET_KEY     = sk_live_... (already set)
 *
 * 4. Deploy:
 *      npx supabase functions deploy stripe-webhook --no-verify-jwt
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** Verify Stripe webhook signature to ensure the request is genuine. */
async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  try {
    const parts = sigHeader.split(',').reduce<Record<string, string>>((acc, part) => {
      const [k, v] = part.split('=');
      acc[k.trim()] = v.trim();
      return acc;
    }, {});

    const timestamp = parts['t'];
    const signature = parts['v1'];
    if (!timestamp || !signature) return false;

    // Reject events older than 5 minutes (replay attack prevention)
    const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
    if (age > 300) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
    const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
    return computed === signature;
  } catch {
    return false;
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const stripeKey     = Deno.env.get('STRIPE_SECRET_KEY');

  if (!webhookSecret || !stripeKey) {
    return json({ error: 'Webhook secret or Stripe key not configured' }, 500);
  }

  const payload   = await req.text();
  const sigHeader = req.headers.get('stripe-signature') || '';

  // Verify signature — reject anything that doesn't come from Stripe
  const isValid = await verifyStripeSignature(payload, sigHeader, webhookSecret);
  if (!isValid) {
    return json({ error: 'Invalid webhook signature' }, 401);
  }

  const event = JSON.parse(payload);
  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    switch (event.type) {

      // ── Payment failed ──────────────────────────────────────────────────────
      // Happens when an off-session charge is declined (e.g. expired card).
      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        const taskId = pi.metadata?.task_id;
        const familyId = pi.metadata?.family_id;

        if (taskId && familyId) {
          // Mark the task's payment as failed so parent sees it in the UI
          await db
            .from('tasks')
            .update({ payment_status: 'failed' })
            .eq('id', taskId)
            .eq('family_id', familyId);
        }

        // Log the failed transaction
        if (familyId && pi.metadata?.kid_id) {
          await db.from('transactions').insert({
            family_id:                familyId,
            kid_id:                   pi.metadata.kid_id,
            task_id:                  taskId || null,
            amount_cents:             pi.amount,
            type:                     'payment_failed',
            stripe_payment_intent_id: pi.id,
            note:                     pi.last_payment_error?.message || 'Payment failed',
          }).catch(() => { /* non-critical — don't fail the webhook */ });
        }
        break;
      }

      // ── Charge refunded ────────────────────────────────────────────────────
      // Parent issued a refund via the Stripe dashboard — reverse the balance.
      case 'charge.refunded': {
        const charge = event.data.object;
        const pi = charge.payment_intent;

        // Look up the original transaction by payment intent ID
        const { data: tx } = await db
          .from('transactions')
          .select('kid_id, amount_cents, family_id')
          .eq('stripe_payment_intent_id', typeof pi === 'string' ? pi : pi?.id)
          .single();

        if (tx) {
          // Reduce the kid's balance by the refunded amount
          const refundedCents = charge.amount_refunded;
          const { data: kidProfile } = await db
            .from('profiles')
            .select('balance_cents')
            .eq('id', tx.kid_id)
            .single();

          const currentBalance = kidProfile?.balance_cents || 0;
          const newBalance = Math.max(0, currentBalance - refundedCents);

          await db
            .from('profiles')
            .update({ balance_cents: newBalance })
            .eq('id', tx.kid_id);

          // Log refund transaction
          await db.from('transactions').insert({
            family_id:                tx.family_id,
            kid_id:                   tx.kid_id,
            amount_cents:             refundedCents,
            type:                     'refund',
            stripe_payment_intent_id: typeof pi === 'string' ? pi : pi?.id,
            note:                     'Refunded via Stripe dashboard',
          }).catch(() => { /* non-critical */ });
        }
        break;
      }

      default:
        // Acknowledge but ignore other event types
        break;
    }

    return json({ received: true, type: event.type });
  } catch (err: any) {
    console.error('Webhook handler error:', err);
    return json({ error: err.message || 'Internal error' }, 500);
  }
});
