/**
 * Shared token creation and verification for unlock tokens.
 *
 * Tokens are HMAC-signed timestamps: "<unix_ms>.<hmac_prefix>"
 * Uses timing-safe comparison to prevent side-channel attacks.
 */

const crypto = require('crypto');

const SIGNING_SECRET = process.env.UNLOCK_SECRET || '';

/**
 * Create a signed unlock token.
 * @returns {string} Token in format "<timestamp>.<hmac_prefix>"
 */
function createToken() {
  const payload = Date.now().toString();
  const hmac = crypto.createHmac('sha256', SIGNING_SECRET).update(payload).digest('hex').slice(0, 16);
  return `${payload}.${hmac}`;
}

/**
 * Verify an unlock token's HMAC signature.
 * Returns false if SIGNING_SECRET is not configured.
 * @param {string} token - Token to verify
 * @returns {boolean}
 */
function verifyToken(token) {
  if (!SIGNING_SECRET || !token || !token.includes('.')) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = crypto.createHmac('sha256', SIGNING_SECRET).update(payload).digest('hex').slice(0, 16);
  // Timing-safe comparison to prevent side-channel attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false; // Different lengths
  }
}

module.exports = { createToken, verifyToken, SIGNING_SECRET };
