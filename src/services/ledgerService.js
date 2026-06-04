/**
 * ledgerService — Reward bucket accounting
 *
 * Cash rewards split into spend/save/give buckets.
 * All values in cents. Pure functions — no I/O, fully testable.
 */

export const DEFAULT_SPLIT = { spend: 70, save: 20, give: 10 };

/** Validate and return a kid's split config, falling back to DEFAULT_SPLIT. */
export function getKidSplit(kid) {
  const s = kid?.rewardSplit;
  if (!s) return DEFAULT_SPLIT;
  const t = (s.spend || 0) + (s.save || 0) + (s.give || 0);
  return t === 100 ? { spend: s.spend, save: s.save, give: s.give } : DEFAULT_SPLIT;
}

/**
 * Compute bucket amounts. Rounding remainder goes to spend.
 * @param {number} grossCents
 * @param {{ spend: number, save: number, give: number }} split — pct integers summing to 100
 * @returns {{ spendCents: number, saveCents: number, giveCents: number }}
 */
export function computeBucketSplit(grossCents, split = DEFAULT_SPLIT) {
  if (!grossCents || grossCents < 1) return { spendCents: 0, saveCents: 0, giveCents: 0 };
  const saveCents  = Math.floor(grossCents * split.save  / 100);
  const giveCents  = Math.floor(grossCents * split.give  / 100);
  const spendCents = grossCents - saveCents - giveCents;
  return { spendCents, saveCents, giveCents };
}

/** Format cents as dollar string. */
export function formatCents(cents) {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}

/**
 * Build ledger credit entries for a reward event.
 * idempotencyKey must be unique per reward (e.g. `reward_${taskId}`).
 */
export function buildRewardEntries({ familyId, kidId, taskId, grossCents, split, idempotencyKey }) {
  const { spendCents, saveCents, giveCents } = computeBucketSplit(grossCents, split);
  const now = new Date().toISOString();
  return [
    { family_id: familyId, kid_id: kidId, task_id: taskId || null, bucket: 'spend', amount_cents: spendCents, entry_type: 'credit', idempotency_key: `${idempotencyKey}_spend`, note: null, created_at: now },
    { family_id: familyId, kid_id: kidId, task_id: taskId || null, bucket: 'save',  amount_cents: saveCents,  entry_type: 'credit', idempotency_key: `${idempotencyKey}_save`,  note: null, created_at: now },
    { family_id: familyId, kid_id: kidId, task_id: taskId || null, bucket: 'give',  amount_cents: giveCents,  entry_type: 'credit', idempotency_key: `${idempotencyKey}_give`,  note: null, created_at: now },
  ];
}

/**
 * Build a ledger debit entry for a payout.
 */
export function buildPayoutEntry({ familyId, kidId, amountCents, bucket = 'spend', note, idempotencyKey }) {
  return {
    family_id:       familyId,
    kid_id:          kidId,
    task_id:         null,
    bucket,
    amount_cents:    amountCents,
    entry_type:      'debit',
    idempotency_key: idempotencyKey || null,
    note:            note || 'Parent payout',
    created_at:      new Date().toISOString(),
  };
}

/**
 * Compute per-bucket balances from an array of ledger entries.
 * @param {Array} entries
 * @returns {{ spend: number, save: number, give: number }}
 */
export function computeBucketBalances(entries = []) {
  const b = { spend: 0, save: 0, give: 0 };
  for (const e of entries) {
    if (!(e.bucket in b)) continue;
    b[e.bucket] += e.entry_type === 'credit' ? e.amount_cents : -e.amount_cents;
  }
  // Never go below 0 per bucket (guard against data inconsistency)
  b.spend = Math.max(0, b.spend);
  b.save  = Math.max(0, b.save);
  b.give  = Math.max(0, b.give);
  return b;
}

/** Total balance across all buckets. */
export function totalBalance(bucketBalances) {
  return (bucketBalances.spend || 0) + (bucketBalances.save || 0) + (bucketBalances.give || 0);
}
