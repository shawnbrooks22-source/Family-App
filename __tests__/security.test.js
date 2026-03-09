/**
 * Tests for PIN hashing, verification, brute-force lockout, and session management.
 */

import {
  hashPin,
  checkPin,
  recordPinFailure,
  clearPinFailures,
  getPinLockoutStatus,
  startParentSession,
  isParentSessionValid,
  endParentSession,
  touchParentSession,
  sanitize,
  isValidPin,
  isValidName,
} from '../src/lib/security';

// ─── PIN Hashing ──────────────────────────────────────────────────────────────

describe('hashPin / checkPin', () => {
  test('same pin + familyId produces same hash', async () => {
    const h1 = await hashPin('1234', 'fam-1');
    const h2 = await hashPin('1234', 'fam-1');
    expect(h1).toBe(h2);
  });

  test('different familyId produces different hash', async () => {
    const h1 = await hashPin('1234', 'fam-1');
    const h2 = await hashPin('1234', 'fam-2');
    expect(h1).not.toBe(h2);
  });

  test('different PIN produces different hash', async () => {
    const h1 = await hashPin('1234', 'fam-1');
    const h2 = await hashPin('5678', 'fam-1');
    expect(h1).not.toBe(h2);
  });

  test('hash is 64 hex characters', async () => {
    const h = await hashPin('0000', 'fam-x');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  test('checkPin returns true for correct PIN', async () => {
    const hash = await hashPin('9876', 'fam-1');
    const ok   = await checkPin('9876', hash, 'fam-1');
    expect(ok).toBe(true);
  });

  test('checkPin returns false for wrong PIN', async () => {
    const hash = await hashPin('9876', 'fam-1');
    const ok   = await checkPin('0000', hash, 'fam-1');
    expect(ok).toBe(false);
  });
});

// ─── Brute-Force Lockout ──────────────────────────────────────────────────────

describe('brute-force lockout', () => {
  test('no lockout after 2 failures', async () => {
    await recordPinFailure();
    await recordPinFailure();
    const status = await getPinLockoutStatus();
    expect(status.locked).toBe(false);
    expect(status.attempts).toBe(2);
  });

  test('locked after 3 failures', async () => {
    await recordPinFailure();
    await recordPinFailure();
    const status = await recordPinFailure();
    expect(status.locked).toBe(true);
    expect(status.secondsLeft).toBeGreaterThan(0);
  });

  test('clearPinFailures resets lockout', async () => {
    await recordPinFailure();
    await recordPinFailure();
    await recordPinFailure();
    await clearPinFailures();
    const status = await getPinLockoutStatus();
    expect(status.locked).toBe(false);
    expect(status.attempts).toBe(0);
  });

  test('lockout escalates at 5 failures (5-min lockout)', async () => {
    for (let i = 0; i < 5; i++) await recordPinFailure();
    const status = await getPinLockoutStatus();
    expect(status.locked).toBe(true);
    // 5-min lockout = 300s, allow a few seconds of test runtime
    expect(status.secondsLeft).toBeGreaterThan(295);
  });
});

// ─── Parent Session ───────────────────────────────────────────────────────────

describe('parent session', () => {
  test('session is invalid before start', async () => {
    const valid = await isParentSessionValid();
    expect(valid).toBe(false);
  });

  test('session is valid after start', async () => {
    await startParentSession();
    const valid = await isParentSessionValid();
    expect(valid).toBe(true);
  });

  test('session is invalid after end', async () => {
    await startParentSession();
    await endParentSession();
    const valid = await isParentSessionValid();
    expect(valid).toBe(false);
  });

  test('touchParentSession keeps session alive', async () => {
    await startParentSession();
    await touchParentSession();
    const valid = await isParentSessionValid();
    expect(valid).toBe(true);
  });
});

// ─── Input Sanitization ───────────────────────────────────────────────────────

describe('sanitize', () => {
  test('strips control characters', () => {
    expect(sanitize('Hello\u0000World')).toBe('HelloWorld');
  });

  test('enforces max length', () => {
    expect(sanitize('abcdef', 3)).toBe('abc');
  });

  test('trims whitespace', () => {
    expect(sanitize('  hello  ')).toBe('hello');
  });

  test('returns empty string for non-string input', () => {
    expect(sanitize(null)).toBe('');
    expect(sanitize(123)).toBe('');
  });
});

describe('isValidPin', () => {
  test('accepts 4-digit string', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('0000')).toBe(true);
  });

  test('rejects non-4-digit', () => {
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('12345')).toBe(false);
    expect(isValidPin('abcd')).toBe(false);
    expect(isValidPin('')).toBe(false);
  });
});

describe('isValidName', () => {
  test('accepts normal names', () => {
    expect(isValidName('Alice')).toBe(true);
    expect(isValidName("O'Brien-Smith")).toBe(true);
  });

  test('rejects empty string', () => {
    expect(isValidName('')).toBe(false);
    expect(isValidName('   ')).toBe(false);
  });
});
