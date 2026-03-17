/**
 * GET /api/search-gate
 *
 * Server-side search counting. Returns remaining free searches for this IP.
 * If a valid unlock token is provided, returns unlimited.
 *
 * Query params:
 *   token (optional) — unlock token from payment
 *
 * Response: { allowed: bool, remaining: number, limit: number, unlocked: bool }
 */

const crypto = require('crypto');
const { getClientIP } = require('./_lib/rate-limit');

const FREE_SEARCHES = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const SIGNING_SECRET = process.env.UNLOCK_SECRET || '';

// In-memory search counts (per IP per window)
// Note: resets on cold start, but that's acceptable — it's a soft gate, not a security boundary
const searchCounts = new Map();
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < WINDOW_MS) return;
  const currentWindow = Math.floor(now / WINDOW_MS);
  for (const key of searchCounts.keys()) {
    if (!key.endsWith(':' + currentWindow)) searchCounts.delete(key);
  }
  lastCleanup = now;
}

function verifyToken(token) {
  if (!SIGNING_SECRET || !token || !token.includes('.')) return false;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SIGNING_SECRET).update(payload).digest('hex').slice(0, 16);
  return sig === expected;
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Check if user has a valid unlock token
  const token = req.query.token;
  if (token && verifyToken(token)) {
    return res.status(200).json({ allowed: true, remaining: -1, limit: FREE_SEARCHES, unlocked: true });
  }

  // Count searches per IP
  cleanup();
  const ip = getClientIP(req);
  const now = Date.now();
  const windowKey = `${ip}:${Math.floor(now / WINDOW_MS)}`;

  const current = searchCounts.get(windowKey) || 0;
  const remaining = Math.max(0, FREE_SEARCHES - current);

  if (remaining <= 0) {
    return res.status(200).json({ allowed: false, remaining: 0, limit: FREE_SEARCHES, unlocked: false });
  }

  // Increment count
  searchCounts.set(windowKey, current + 1);
  return res.status(200).json({ allowed: true, remaining: remaining - 1, limit: FREE_SEARCHES, unlocked: false });
};
