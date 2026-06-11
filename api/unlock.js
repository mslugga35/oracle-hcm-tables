/**
 * POST /api/unlock — Validate an unlock code and return a signed token.
 * GET  /api/unlock?token=X — Verify an existing token.
 *
 * Env vars (required, set in Vercel project settings):
 *   UNLOCK_CODES  — comma-separated djb2 hashes of valid codes
 *   UNLOCK_SECRET — HMAC signing secret for tokens
 */

const { createToken, verifyToken, SIGNING_SECRET } = require('./_lib/token');
const { getClientIP } = require('./_lib/rate-limit');

// Comma-separated djb2 hashes — no hardcoded fallback
const VALID_HASHES = process.env.UNLOCK_CODES
  ? process.env.UNLOCK_CODES.split(',').map(h => h.trim())
  : [];

/** djb2 hash → 8-char hex string */
function hashCode(str) {
  return Array.from(str)
    .reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
    .toString(16)
    .slice(-8);
}

// Brute-force protection: cap FAILED unlock attempts per IP so the (small) code
// space can't be guessed online. Only failures count, so a legit user entering a
// correct code is never throttled. Mirrors the per-endpoint limiter in subscribe.js.
const MAX_FAILED_ATTEMPTS = 15;
const ATTEMPT_WINDOW = 60 * 60 * 1000; // 1 hour
const failedAttempts = new Map();
let lastAttemptCleanup = Date.now();

function cleanupAttempts() {
  const now = Date.now();
  if (now - lastAttemptCleanup < ATTEMPT_WINDOW) return;
  const currentWindow = Math.floor(now / ATTEMPT_WINDOW);
  for (const key of failedAttempts.keys()) {
    if (!key.endsWith(':' + currentWindow)) failedAttempts.delete(key);
  }
  lastAttemptCleanup = now;
}

const attemptKey = (ip) => `${ip}:${Math.floor(Date.now() / ATTEMPT_WINDOW)}`;

/** True if this IP has exhausted its failed-attempt budget this window. */
function isLockedOut(ip) {
  cleanupAttempts();
  return (failedAttempts.get(attemptKey(ip)) || 0) >= MAX_FAILED_ATTEMPTS;
}

/** Record one failed attempt for this IP. */
function recordFailure(ip) {
  const key = attemptKey(ip);
  failedAttempts.set(key, (failedAttempts.get(key) || 0) + 1);
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: verify existing token
  if (req.method === 'GET') {
    return res.status(200).json({ valid: verifyToken(req.query.token) });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // POST: validate unlock code → issue token
  const code = (req.body?.code || '').trim().toUpperCase();
  if (!code) {
    return res.status(400).json({ valid: false, error: 'Code is required' });
  }

  if (!SIGNING_SECRET || VALID_HASHES.length === 0) {
    return res.status(503).json({ valid: false, error: 'Service not configured' });
  }

  const clientIP = getClientIP(req);
  if (isLockedOut(clientIP)) {
    return res.status(429).json({ valid: false, error: 'Too many attempts. Try again later.' });
  }

  if (VALID_HASHES.includes(hashCode(code))) {
    return res.status(200).json({ valid: true, token: createToken() });
  }

  recordFailure(clientIP);
  return res.status(200).json({ valid: false });
};
