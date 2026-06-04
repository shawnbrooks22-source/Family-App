/**
 * Tests for ledgerService — pure accounting functions.
 * No I/O, no mocks needed (except to satisfy the module loader).
 */

import {
  DEFAULT_SPLIT,
  computeBucketSplit,
  buildRewardEntries,
  buildPayoutEntry,
  computeBucketBalances,
  totalBalance,
  getKidSplit,
} from '../src/services/ledgerService';

// ─── computeBucketSplit ────────────────────────────────────────────────────────

describe('computeBucketSplit', () => {
  test('100 cents with default split → spend=70, save=20, give=10', () => {
    const result = computeBucketSplit(100);
    expect(result).toEqual({ spendCents: 70, saveCents: 20, giveCents: 10 });
  });

  test('100 cents with custom split {spend:60,save:30,give:10} → spend=60, save=30, give=10', () => {
    const result = computeBucketSplit(100, { spend: 60, save: 30, give: 10 });
    // saveCents = floor(100*30/100) = 30, giveCents = floor(100*10/100) = 10, spendCents = 100-30-10 = 60
    expect(result).toEqual({ spendCents: 60, saveCents: 30, giveCents: 10 });
  });

  test('101 cents with default split → spend=71, save=20, give=10', () => {
    // saveCents = floor(101*20/100) = floor(20.2) = 20
    // giveCents = floor(101*10/100) = floor(10.1) = 10
    // spendCents = 101 - 20 - 10 = 71
    const result = computeBucketSplit(101);
    expect(result).toEqual({ spendCents: 71, saveCents: 20, giveCents: 10 });
  });

  test('0 cents → all zeros', () => {
    const result = computeBucketSplit(0);
    expect(result).toEqual({ spendCents: 0, saveCents: 0, giveCents: 0 });
  });

  test('1 cent with default split → spend=1, save=0, give=0', () => {
    // saveCents = floor(1*20/100) = 0, giveCents = floor(1*10/100) = 0, spendCents = 1-0-0 = 1
    const result = computeBucketSplit(1);
    expect(result).toEqual({ spendCents: 1, saveCents: 0, giveCents: 0 });
  });

  test('500 cents ($5.00) with default split → spend=350, save=100, give=50', () => {
    const result = computeBucketSplit(500);
    expect(result).toEqual({ spendCents: 350, saveCents: 100, giveCents: 50 });
  });

  test('rounding remainder always goes to spend', () => {
    // 101 cents at 33/33/34 — verify spend absorbs any remainder
    const result = computeBucketSplit(101, { spend: 34, save: 33, give: 33 });
    const { spendCents, saveCents, giveCents } = result;
    expect(spendCents + saveCents + giveCents).toBe(101);
  });

  test('negative grossCents → all zeros', () => {
    const result = computeBucketSplit(-50);
    expect(result).toEqual({ spendCents: 0, saveCents: 0, giveCents: 0 });
  });
});

// ─── buildRewardEntries ────────────────────────────────────────────────────────

describe('buildRewardEntries', () => {
  const base = {
    familyId:       'fam-1',
    kidId:          'kid-1',
    taskId:         'task-1',
    grossCents:     100,
    split:          DEFAULT_SPLIT,
    idempotencyKey: 'reward_task-1',
  };

  test('returns exactly 3 entries', () => {
    const entries = buildRewardEntries(base);
    expect(entries).toHaveLength(3);
  });

  test('each entry has entry_type = "credit"', () => {
    const entries = buildRewardEntries(base);
    entries.forEach(e => expect(e.entry_type).toBe('credit'));
  });

  test('buckets are spend, save, give', () => {
    const entries = buildRewardEntries(base);
    const buckets = entries.map(e => e.bucket);
    expect(buckets).toEqual(['spend', 'save', 'give']);
  });

  test('amount_cents matches computed split', () => {
    const entries = buildRewardEntries(base);
    expect(entries[0].amount_cents).toBe(70); // spend
    expect(entries[1].amount_cents).toBe(20); // save
    expect(entries[2].amount_cents).toBe(10); // give
  });

  test('idempotency_key is suffixed correctly', () => {
    const entries = buildRewardEntries(base);
    expect(entries[0].idempotency_key).toBe('reward_task-1_spend');
    expect(entries[1].idempotency_key).toBe('reward_task-1_save');
    expect(entries[2].idempotency_key).toBe('reward_task-1_give');
  });

  test('task_id is set on all entries', () => {
    const entries = buildRewardEntries(base);
    entries.forEach(e => expect(e.task_id).toBe('task-1'));
  });

  test('task_id is null when taskId is falsy', () => {
    const entries = buildRewardEntries({ ...base, taskId: null });
    entries.forEach(e => expect(e.task_id).toBeNull());
  });

  test('family_id and kid_id are set on all entries', () => {
    const entries = buildRewardEntries(base);
    entries.forEach(e => {
      expect(e.family_id).toBe('fam-1');
      expect(e.kid_id).toBe('kid-1');
    });
  });

  test('entries have a created_at ISO string', () => {
    const entries = buildRewardEntries(base);
    entries.forEach(e => expect(e.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/));
  });
});

// ─── buildPayoutEntry ──────────────────────────────────────────────────────────

describe('buildPayoutEntry', () => {
  const base = {
    familyId:       'fam-1',
    kidId:          'kid-1',
    amountCents:    250,
    idempotencyKey: 'payout_abc',
  };

  test('entry_type is "debit"', () => {
    const entry = buildPayoutEntry(base);
    expect(entry.entry_type).toBe('debit');
  });

  test('bucket defaults to "spend"', () => {
    const entry = buildPayoutEntry(base);
    expect(entry.bucket).toBe('spend');
  });

  test('custom bucket is preserved', () => {
    const entry = buildPayoutEntry({ ...base, bucket: 'save' });
    expect(entry.bucket).toBe('save');
  });

  test('amount_cents matches input', () => {
    const entry = buildPayoutEntry(base);
    expect(entry.amount_cents).toBe(250);
  });

  test('idempotency_key is set', () => {
    const entry = buildPayoutEntry(base);
    expect(entry.idempotency_key).toBe('payout_abc');
  });

  test('idempotency_key is null when not provided', () => {
    const entry = buildPayoutEntry({ familyId: 'f', kidId: 'k', amountCents: 100 });
    expect(entry.idempotency_key).toBeNull();
  });

  test('note defaults to "Parent payout"', () => {
    const entry = buildPayoutEntry(base);
    expect(entry.note).toBe('Parent payout');
  });

  test('custom note is preserved', () => {
    const entry = buildPayoutEntry({ ...base, note: 'Ice cream money' });
    expect(entry.note).toBe('Ice cream money');
  });

  test('task_id is always null for payouts', () => {
    const entry = buildPayoutEntry(base);
    expect(entry.task_id).toBeNull();
  });
});

// ─── computeBucketBalances ─────────────────────────────────────────────────────

describe('computeBucketBalances', () => {
  test('empty array → {spend:0, save:0, give:0}', () => {
    expect(computeBucketBalances([])).toEqual({ spend: 0, save: 0, give: 0 });
  });

  test('no argument → {spend:0, save:0, give:0}', () => {
    expect(computeBucketBalances()).toEqual({ spend: 0, save: 0, give: 0 });
  });

  test('two credits sum correctly', () => {
    const entries = [
      { bucket: 'spend', amount_cents: 70,  entry_type: 'credit' },
      { bucket: 'spend', amount_cents: 30,  entry_type: 'credit' },
    ];
    expect(computeBucketBalances(entries).spend).toBe(100);
  });

  test('credit then debit → correct net balance', () => {
    const entries = [
      { bucket: 'spend', amount_cents: 100, entry_type: 'credit' },
      { bucket: 'spend', amount_cents: 40,  entry_type: 'debit'  },
    ];
    expect(computeBucketBalances(entries).spend).toBe(60);
  });

  test('multiple buckets computed independently', () => {
    const entries = [
      { bucket: 'spend', amount_cents: 70,  entry_type: 'credit' },
      { bucket: 'save',  amount_cents: 20,  entry_type: 'credit' },
      { bucket: 'give',  amount_cents: 10,  entry_type: 'credit' },
    ];
    expect(computeBucketBalances(entries)).toEqual({ spend: 70, save: 20, give: 10 });
  });

  test('never returns negative (floors at 0)', () => {
    const entries = [
      { bucket: 'spend', amount_cents: 50, entry_type: 'credit' },
      { bucket: 'spend', amount_cents: 99, entry_type: 'debit'  },
    ];
    expect(computeBucketBalances(entries).spend).toBe(0);
  });

  test('ignores unknown bucket names', () => {
    const entries = [
      { bucket: 'mystery', amount_cents: 999, entry_type: 'credit' },
      { bucket: 'spend',   amount_cents: 50,  entry_type: 'credit' },
    ];
    const result = computeBucketBalances(entries);
    expect(result.spend).toBe(50);
    expect(result).not.toHaveProperty('mystery');
  });
});

// ─── totalBalance ──────────────────────────────────────────────────────────────

describe('totalBalance', () => {
  test('sums all three buckets', () => {
    expect(totalBalance({ spend: 70, save: 20, give: 10 })).toBe(100);
  });

  test('zero balances → 0', () => {
    expect(totalBalance({ spend: 0, save: 0, give: 0 })).toBe(0);
  });

  test('treats missing buckets as 0', () => {
    expect(totalBalance({ spend: 50 })).toBe(50);
  });

  test('handles large amounts', () => {
    expect(totalBalance({ spend: 50000, save: 30000, give: 10000 })).toBe(90000);
  });
});

// ─── getKidSplit ───────────────────────────────────────────────────────────────

describe('getKidSplit', () => {
  test('null kid → DEFAULT_SPLIT', () => {
    expect(getKidSplit(null)).toEqual(DEFAULT_SPLIT);
  });

  test('undefined kid → DEFAULT_SPLIT', () => {
    expect(getKidSplit(undefined)).toEqual(DEFAULT_SPLIT);
  });

  test('kid with no rewardSplit → DEFAULT_SPLIT', () => {
    expect(getKidSplit({ name: 'Alice' })).toEqual(DEFAULT_SPLIT);
  });

  test('valid split summing to 100 → returns it', () => {
    const split = { spend: 50, save: 30, give: 20 };
    expect(getKidSplit({ rewardSplit: split })).toEqual(split);
  });

  test('invalid split not summing to 100 → DEFAULT_SPLIT', () => {
    expect(getKidSplit({ rewardSplit: { spend: 50, save: 30, give: 30 } })).toEqual(DEFAULT_SPLIT);
  });

  test('split summing to 0 → DEFAULT_SPLIT', () => {
    expect(getKidSplit({ rewardSplit: { spend: 0, save: 0, give: 0 } })).toEqual(DEFAULT_SPLIT);
  });

  test('split summing to exactly 100 with non-default values → preserved', () => {
    const split = { spend: 80, save: 10, give: 10 };
    expect(getKidSplit({ rewardSplit: split })).toEqual(split);
  });
});
