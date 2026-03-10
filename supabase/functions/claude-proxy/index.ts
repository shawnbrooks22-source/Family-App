/**
 * Kindo — Claude AI Proxy (Supabase Edge Function)
 *
 * This function acts as a secure server-side proxy so the Anthropic API key
 * is NEVER shipped inside the mobile app binary.
 *
 * ─── SETUP ───────────────────────────────────────────────────────────────────
 * 1. In your Supabase dashboard → Project Settings → Edge Functions → Secrets
 *    add:  ANTHROPIC_API_KEY = sk-ant-your-key-here
 *
 * 2. Deploy this function:
 *    npx supabase functions deploy claude-proxy --no-verify-jwt
 *
 * 3. In your .env file set:
 *    EXPO_PUBLIC_SUPABASE_CLAUDE_PROXY=https://<project-ref>.supabase.co/functions/v1/claude-proxy
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { prompt, max_tokens = 800 } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid prompt' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Trim prompt to prevent abuse (max ~2000 chars for chore suggestions)
    const safePrompt = prompt.slice(0, 2000);

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured on server' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: Math.min(Number(max_tokens) || 800, 1000), // cap at 1000
        messages:   [{ role: 'user', content: safePrompt }],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: err?.error?.message || `Claude error ${claudeRes.status}` }), {
        status: claudeRes.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const data = await claudeRes.json();
    const text = data.content?.[0]?.text || '';

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
