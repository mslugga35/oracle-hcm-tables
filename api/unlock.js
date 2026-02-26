/**
 * POST /api/unlock
 *
 * Validates an unlock code server-side and returns a signed token.
 * Replaces client-side hash validation (SEC-1 fix).
 *
 * Body: { "code": "UNLOCK_CODE" }
 * Success: { "token": "<signed_token>", "valid": true }
 * Failure: { "valid": false }
 */

const crypto = require('crypto');

// Codes are validated against UNLOCK_CODES env var (comma-separated hashes)
// Fallback to hardcoded hashes for backwards compat until env var is set
const VALID_HASHES = (process.env.UNLOCK_CODES || '61688882,5f77fb97').split(',').map(h => h.trim());
const SIGNING_SECRET = process.env.UNLOCK_SECRET || 'hcm-tables-default-secret-change-me';

function hashCode(str) {
  return Array.from(str).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0).toString(16).slice(-8);
}

function createToken() {
  const payload = Date.now().toString();
  const hmac = crypto.createHmac('sha256', SIGNING_SECRET).update(payload).digest('hex').slice(0, 16);
  return `${payload}.${hmac}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return false;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SIGNING_SECRET).update(payload).digest('hex').slice(0, 16);
  return sig === expected;
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET with token param = verify existing token
  if (req.method === 'GET') {
    const token = req.query.token;
    return res.status(200).json({ valid: verifyToken(token) });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const code = (req.body?.code || '').trim().toUpperCase();
  if (!code) {
    return res.status(400).json({ valid: false, error: 'Code is required' });
  }

  const hash = hashCode(code);
  if (VALID_HASHES.includes(hash)) {
    return res.status(200).json({ valid: true, token: createToken() });
  }

  return res.status(200).json({ valid: false });
};
