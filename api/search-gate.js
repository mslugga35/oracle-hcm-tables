/**
 * GET /api/search-gate
 *
 * Server-side search counting per IP. Returns whether the user can search.
 * Paid users pass their unlock token for unlimited access.
 *
 * Query: ?token=<unlock_token> (optional)
 * Response: { allowed, remaining, limit, unlocked }
 *
 * Note: counts are in-memory and reset on Vercel cold starts.
 * This is a soft gate — the real protection is token verification.
 */

const { verifyToken } = require('./_lib/token');
const { getClientIP } = require('./_lib/rate-limit');

const FREE_SEARCHES = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

const searchCounts = new Map();
let lastCleanup = Date.now();

/** Prune expired window entries (runs at most once per window) */
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < WINDOW_MS) return;
  const currentWindow = Math.floor(now / WINDOW_MS);
  for (const key of searchCounts.keys()) {
    if (!key.endsWith(':' + currentWindow)) searchCounts.delete(key);
  }
  lastCleanup = now;
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Paid users: verify token → unlimited
  if (req.query.token && verifyToken(req.query.token)) {
    return res.status(200).json({ allowed: true, remaining: -1, limit: FREE_SEARCHES, unlocked: true });
  }

  // Free users: count per IP
  cleanup();
  const ip = getClientIP(req);
  const windowKey = `${ip}:${Math.floor(Date.now() / WINDOW_MS)}`;
  const current = searchCounts.get(windowKey) || 0;
  const remaining = Math.max(0, FREE_SEARCHES - current);

  if (remaining <= 0) {
    return res.status(200).json({ allowed: false, remaining: 0, limit: FREE_SEARCHES, unlocked: false });
  }

  searchCounts.set(windowKey, current + 1);
  return res.status(200).json({ allowed: true, remaining: remaining - 1, limit: FREE_SEARCHES, unlocked: false });
};
