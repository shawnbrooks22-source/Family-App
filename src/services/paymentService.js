/**
 * paymentService — Idempotent reward charging and payout recording.
 *
 * MANUAL MODE: if Stripe env vars are not set, all rewards are recorded
 * as parent-managed IOUs in the ledger. No automatic money movement.
 *
 * STRIPE MODE: charges parent's saved card, then writes ledger entries.
 * Idempotency key prevents double-charges if parent taps approve twice.
 */

import { buildRewardEntries, buildPayoutEntry, getKidSplit } from './ledgerService';

const CHARGE_URL = process.env.EXPO_PUBLIC_SUPABASE_STRIPE_CHARGE;
const STRIPE_READY = !!(CHARGE_URL && CHARGE_URL.startsWith('https://'));

/** Stable idempotency key for a task's reward charge. */
export function rewardIdempotencyKey(taskId) {
  return `reward_${taskId}`;
}

/**
 * Charge (or manually record) a task cash reward and write ledger entries.
 *
 * @param {object} opts
 * @param {object} opts.supabase        — Supabase client (may be null in local mode)
 * @param {string} opts.familyId
 * @param {string} opts.kidId
 * @param {string} opts.taskId
 * @param {number} opts.grossCents      — reward amount in cents
 * @param {string} opts.parentProfileId — needed for Stripe charge
 * @param {object} opts.kid             — kid profile object (for split config)
 *
 * @returns {Promise<{ ledgerEntries: Array, stripeCharged: boolean, alreadyProcessed: boolean }>}
 * @throws if payment fails (caller should surface alert, but still approve task)
 */
export async function chargeTaskReward({ supabase, familyId, kidId, taskId, grossCents, parentProfileId, kid }) {
  if (!grossCents || grossCents < 1) return { ledgerEntries: [], stripeCharged: false, alreadyProcessed: false };

  const idempotencyKey = rewardIdempotencyKey(taskId);

  // Idempotency check — if ledger entries already exist for this task, skip
  if (supabase) {
    const { data: existing } = await supabase
      .from('ledger_entries')
      .select('id')
      .eq('idempotency_key', `${idempotencyKey}_spend`)
      .limit(1);
    if (existing && existing.length > 0) {
      return { ledgerEntries: [], stripeCharged: false, alreadyProcessed: true };
    }
  }

  const split = getKidSplit(kid);
  let stripeCharged = false;

  // Stripe charge (Stripe mode only)
  if (STRIPE_READY && parentProfileId) {
    const res = await fetchWithTimeout(CHARGE_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ parentProfileId, kidId, taskId, amountCents: grossCents, familyId, idempotencyKey }),
    }, 15000);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Stripe charge failed (${res.status})`);
    }
    stripeCharged = true;
  }

  // Write ledger entries (both manual and Stripe modes)
  const entries = buildRewardEntries({ familyId, kidId, taskId, grossCents, split, idempotencyKey });
  if (supabase) {
    const { error } = await supabase.from('ledger_entries').insert(entries);
    if (error) throw new Error('Failed to record reward in ledger: ' + error.message);
  }

  return { ledgerEntries: entries, stripeCharged, alreadyProcessed: false };
}

/**
 * Record a manual payout from the spend bucket.
 * Supabase mode: inserts ledger debit + transaction record.
 * Local mode: returns the entry for caller to persist locally.
 */
export async function recordManualPayout({ supabase, familyId, kidId, amountCents, bucket = 'spend', note }) {
  if (!amountCents || amountCents < 1) throw new Error('Amount must be at least 1 cent');

  const idempotencyKey = `payout_${kidId}_${Date.now()}`;
  const entry = buildPayoutEntry({ familyId, kidId, amountCents, bucket, note, idempotencyKey });

  if (supabase) {
    const { error: le } = await supabase.from('ledger_entries').insert(entry);
    if (le) throw new Error('Failed to record payout in ledger: ' + le.message);

    await supabase.from('transactions').insert({
      family_id:       familyId,
      kid_id:          kidId,
      task_id:         null,
      amount_cents:    amountCents,
      type:            'payout',
      note:            note || 'Manual parent payout',
      idempotency_key: idempotencyKey,
    }).catch(e => { if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[paymentService] tx insert:', e.message); });
  }

  return entry;
}

/**
 * Load per-bucket balances for a kid from the ledger.
 */
export async function loadKidBucketBalances(supabase, familyId, kidId) {
  if (!supabase || !familyId || !kidId) return { spend: 0, save: 0, give: 0 };
  const { data, error } = await supabase
    .from('ledger_entries')
    .select('bucket, amount_cents, entry_type')
    .eq('family_id', familyId)
    .eq('kid_id', kidId);
  if (error || !data) return { spend: 0, save: 0, give: 0 };
  const { computeBucketBalances } = require('./ledgerService');
  return computeBucketBalances(data);
}

async function fetchWithTimeout(url, options, ms) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}
