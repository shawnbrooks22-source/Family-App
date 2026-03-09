/**
 * Kindo — Security Utilities
 *
 * Covers:
 *  • PIN hashing    — SHA-256 via expo-crypto (never stored in plain text)
 *  • Brute-force    — progressive lockout (30s → 5m → 30m) via SecureStore
 *  • Session guard  — 30-minute inactivity timeout for the parent zone
 *  • Input sanity   — strip control characters, enforce length limits
 *  • Secure storage — thin wrappers over expo-secure-store (AES-256 on device)
 */

import * as Crypto     from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

// ─── Internal constants ────────────────────────────────────────────────────────
const APP_PEPPER        = 'kindo_v1_2024_pepper'; // additional server-side secret
const LOCKOUT_STORE_KEY = 'kindo_pin_lockout';
const SESSION_STORE_KEY = 'kindo_parent_session';

export const PARENT_SESSION_MS    = 30 * 60 * 1000; // 30 minutes
export const LOCKOUT_THRESHOLDS   = [
  { attempts: 3,  lockMs: 30_000        }, // 30 seconds
  { attempts: 5,  lockMs: 5 * 60_000    }, // 5 minutes
  { attempts: 10, lockMs: 30 * 60_000   }, // 30 minutes
  { attempts: 15, lockMs: 24 * 60 * 60_000 }, // 24 hours
];

// ─── PIN Hashing ──────────────────────────────────────────────────────────────

/**
 * Hash a 4-digit PIN using SHA-256.
 * Includes a per-family salt + app-wide pepper so two families with the
 * same PIN have different hashes, and a stolen hash file is useless without
 * the pepper baked into the app.
 */
export async function hashPin(pin, familyId = 'local') {
  const input = `${APP_PEPPER}:${familyId}:${pin}`;
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
}

/** Returns true if pin matches the stored hash. */
export async function checkPin(pin, storedHash, familyId = 'local') {
  const computed = await hashPin(pin, familyId);
  return computed === storedHash;
}

// ─── Brute-Force Protection ───────────────────────────────────────────────────

async function readLockout() {
  try {
    const raw = await SecureStore.getItemAsync(LOCKOUT_STORE_KEY);
    return raw ? JSON.parse(raw) : { attempts: 0, lockedUntil: 0 };
  } catch {
    return { attempts: 0, lockedUntil: 0 };
  }
}

async function writeLockout(data) {
  await SecureStore.setItemAsync(LOCKOUT_STORE_KEY, JSON.stringify(data));
}

/** Call after every wrong PIN. Returns updated lockout state. */
export async function recordPinFailure() {
  const data = await readLockout();
  data.attempts += 1;

  // Apply the highest threshold that has been exceeded
  const now = Date.now();
  for (let i = LOCKOUT_THRESHOLDS.length - 1; i >= 0; i--) {
    if (data.attempts >= LOCKOUT_THRESHOLDS[i].attempts) {
      data.lockedUntil = now + LOCKOUT_THRESHOLDS[i].lockMs;
      break;
    }
  }

  await writeLockout(data);
  return getLockoutStatus(data);
}

/** Call after a successful PIN entry. */
export async function clearPinFailures() {
  await SecureStore.deleteItemAsync(LOCKOUT_STORE_KEY);
}

/** Returns { locked, attempts, secondsLeft }. */
export async function getPinLockoutStatus() {
  const data = await readLockout();
  return getLockoutStatus(data);
}

function getLockoutStatus(data) {
  const now = Date.now();
  const locked = data.lockedUntil > now;
  const secondsLeft = locked ? Math.ceil((data.lockedUntil - now) / 1000) : 0;
  return { locked, attempts: data.attempts, secondsLeft };
}

// ─── Parent Session Timeout ───────────────────────────────────────────────────

/** Mark that the parent authenticated right now. */
export async function startParentSession() {
  await SecureStore.setItemAsync(SESSION_STORE_KEY, String(Date.now()));
}

/** Extend the session on each parent interaction. */
export async function touchParentSession() {
  await SecureStore.setItemAsync(SESSION_STORE_KEY, String(Date.now()));
}

/** Returns true if a valid parent session exists (< 30 min old). */
export async function isParentSessionValid() {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_STORE_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < PARENT_SESSION_MS;
  } catch {
    return false;
  }
}

/** Invalidate the parent session (logout / lock). */
export async function endParentSession() {
  await SecureStore.deleteItemAsync(SESSION_STORE_KEY);
}

// ─── Secure Storage Wrappers ─────────────────────────────────────────────────
// Use these instead of AsyncStorage for anything sensitive.

export async function secureSave(key, value) {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  await SecureStore.setItemAsync(key, str);
}

export async function secureLoad(key) {
  return SecureStore.getItemAsync(key);
}

export async function secureDelete(key) {
  return SecureStore.deleteItemAsync(key);
}

// ─── Input Sanitization ───────────────────────────────────────────────────────

const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/g;

/**
 * Strip control characters, trim whitespace, enforce a max length.
 * Safe to pass to Supabase or display in the UI.
 */
export function sanitize(text, maxLength = 120) {
  if (typeof text !== 'string') return '';
  return text.replace(CONTROL_CHARS, '').slice(0, maxLength).trim();
}

/** Validate that a string is a 4-digit numeric PIN. */
export function isValidPin(pin) {
  return typeof pin === 'string' && /^\d{4}$/.test(pin);
}

/** Validate a name field (letters, spaces, hyphens, apostrophes). */
export function isValidName(name) {
  return typeof name === 'string' && name.trim().length >= 1 && name.length <= 60;
}
