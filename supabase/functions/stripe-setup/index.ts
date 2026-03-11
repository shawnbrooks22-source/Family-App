/**
 * Kindo — Stripe Payment Setup (Supabase Edge Function)
 *
 * Attaches a Stripe PaymentMethod to a parent's Stripe Customer.
 * Creates the Customer if it doesn't exist yet.
 *
 * ─── SETUP ───────────────────────────────────────────────────────────────────
 * 1. In Supabase Dashboard → Project Settings → Edge Functions → Secrets add:
 *      STRIPE_SECRET_KEY = sk_live_your_key_here  (or sk_test_... for testing)
 *      SUPABASE_URL      = https://your-project.supabase.co
 *      SUPABASE_SERVICE_ROLE_KEY = your_service_role_key
 *
 * 2. Deploy:
 *      npx supabase functions deploy stripe-setup --no-verify-jwt
 *
 * 3. In .env:
 *      EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_... (or pk_test_...)
 *      EXPO_PUBLIC_SUPABASE_URL           = https://your-project.supabase.co
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
    const { parentProfileId, paymentMethodId, last4, brand } = await req.json();

    if (!parentProfileId || !paymentMethodId) {
      return json({ error: 'Missing parentProfileId or paymentMethodId' }, 400);
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return json({ error: 'Stripe not configured on server' }, 500);

    const supabaseUrl  = Deno.env.get('SUPABASE_URL');
    const supabaseKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const db = createClient(supabaseUrl!, supabaseKey!);

    // Look up existing Stripe customer for this parent
    const { data: profile } = await db
      .from('profiles')
      .select('stripe_customer_id, name, phone')
      .eq('id', parentProfileId)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      // Create a new Stripe customer
      const res = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          description: `Kindo parent: ${profile?.name || parentProfileId}`,
          ...(profile?.phone ? { phone: profile.phone } : {}),
          metadata: JSON.stringify({ kindo_profile_id: parentProfileId }),
        }),
      });
      const customer = await res.json();
      if (!res.ok) return json({ error: customer?.error?.message || 'Failed to create customer' }, 500);
      customerId = customer.id;
    }

    // Attach the PaymentMethod to the customer
    const attachRes = await fetch(`https://api.stripe.com/v1/payment_methods/${paymentMethodId}/attach`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ customer: customerId }),
    });
    const attached = await attachRes.json();
    if (!attachRes.ok && attached?.error?.code !== 'payment_method_already_attached') {
      return json({ error: attached?.error?.message || 'Failed to attach payment method' }, 500);
    }

    // Set as the default payment method for the customer
    await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'invoice_settings[default_payment_method]': paymentMethodId,
      }),
    });

    // Save everything back to the parent's profile in Supabase
    await db.from('profiles').update({
      stripe_customer_id:       customerId,
      stripe_payment_method_id: paymentMethodId,
      stripe_card_last4:        last4,
      stripe_card_brand:        brand,
    }).eq('id', parentProfileId);

    return json({ success: true, customerId, last4, brand });
  } catch (err: any) {
    return json({ error: err.message || 'Internal server error' }, 500);
  }
});
