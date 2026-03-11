/**
 * Kindo — Stripe Charge (Supabase Edge Function)
 *
 * Charges a parent's saved payment method for a task reward,
 * then credits the kid's in-app balance in Supabase.
 *
 * ─── SETUP ───────────────────────────────────────────────────────────────────
 * Same secrets as stripe-setup. Deploy:
 *   npx supabase functions deploy stripe-charge --no-verify-jwt
 *
 * In .env:
 *   EXPO_PUBLIC_SUPABASE_STRIPE_CHARGE = https://<project>.supabase.co/functions/v1/stripe-charge
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
    const { parentProfileId, kidId, taskId, amountCents, familyId } = await req.json();

    if (!parentProfileId || !kidId || !amountCents || !familyId) {
      return json({ error: 'Missing required fields' }, 400);
    }
    if (amountCents < 50 || amountCents > 100_000) {
      return json({ error: 'Amount must be between $0.50 and $1,000' }, 400);
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return json({ error: 'Stripe not configured on server' }, 500);

    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Load parent's Stripe details
    const { data: parent } = await db
      .from('profiles')
      .select('stripe_customer_id, stripe_payment_method_id')
      .eq('id', parentProfileId)
      .single();

    if (!parent?.stripe_customer_id || !parent?.stripe_payment_method_id) {
      return json({ error: 'No payment method on file. Add a card in the Payments screen.' }, 400);
    }

    // Create and confirm the PaymentIntent
    const piRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount:               String(amountCents),
        currency:             'usd',
        customer:             parent.stripe_customer_id,
        payment_method:       parent.stripe_payment_method_id,
        confirm:              'true',
        off_session:          'true',
        description:          `Kindo quest reward for task ${taskId || 'manual'}`,
        'metadata[family_id]': familyId,
        'metadata[kid_id]':   kidId,
        ...(taskId ? { 'metadata[task_id]': taskId } : {}),
      }),
    });

    const pi = await piRes.json();
    if (!piRes.ok || (pi.status !== 'succeeded' && pi.status !== 'requires_capture')) {
      return json({ error: pi?.error?.message || `Payment failed: ${pi.status}` }, 400);
    }

    // Credit the kid's balance
    const { data: kidProfile } = await db
      .from('profiles')
      .select('balance_cents')
      .eq('id', kidId)
      .single();

    const newBalance = (kidProfile?.balance_cents || 0) + amountCents;
    await db.from('profiles').update({ balance_cents: newBalance }).eq('id', kidId);

    // Write transaction record
    await db.from('transactions').insert({
      family_id:                familyId,
      kid_id:                   kidId,
      task_id:                  taskId || null,
      amount_cents:             amountCents,
      type:                     'payment',
      stripe_payment_intent_id: pi.id,
    });

    return json({ success: true, paymentIntentId: pi.id, newBalance });
  } catch (err: any) {
    return json({ error: err.message || 'Internal server error' }, 500);
  }
});
