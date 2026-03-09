// Mock for expo-crypto in tests
const CryptoDigestAlgorithm = { SHA256: 'SHA-256' };
const CryptoEncoding = { HEX: 'hex' };

async function digestStringAsync(algorithm, input) {
  // Simple deterministic hash for tests — NOT cryptographically secure
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  // Convert to 64-char hex string (pad to simulate SHA-256)
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return hex.repeat(8); // 64 chars
}

module.exports = { CryptoDigestAlgorithm, CryptoEncoding, digestStringAsync };
