/**
 * Supabase client for Kindo
 *
 * ─── SETUP STEPS ──────────────────────────────────────────────────────────────
 * 1. Create a free project at https://supabase.com
 * 2. Copy your Project URL and anon/public key from Project Settings → API
 * 3. Paste them below (replace the placeholder strings)
 * 4. In the Supabase SQL Editor, run the schema in /supabase/schema.sql
 * 5. Run: npx expo install @supabase/supabase-js expo-secure-store
 *
 * ─── ENVIRONMENT ──────────────────────────────────────────────────────────────
 * For production, move these to environment variables using app.json "extra" field.
 */

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// ⬇️  Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON in your .env file
// Copy .env.example to .env and fill in your Supabase project credentials.
export const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL  || 'https://YOUR_PROJECT_ID.supabase.co';
export const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON || 'YOUR_SUPABASE_ANON_KEY';

// Secure token storage adapter for React Native
const SecureStoreAdapter = {
  getItem:    (key)        => SecureStore.getItemAsync(key),
  setItem:    (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key)        => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage:        SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession:   true,
    detectSessionInUrl: false,
  },
});
