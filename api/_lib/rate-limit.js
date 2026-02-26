/**
 * Shared rate limiting for API endpoints.
 *
 * - Uses Vercel's trusted headers for IP detection (SEC-5 fix)
 * - Prunes stale entries to prevent unbounded memory growth (SEC-9 fix)
 * - Single source of truth — no more copy-paste across endpoints (DEAD-2 fix)
 */

const RATE_LIMIT_FREE = 50;
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours
const rateLimits = new Map();
let lastCleanup = Date.now();

/** Prune expired entries (runs at most once per window) */
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < RATE_LIMIT_WINDOW) return;
  const currentWindow = Math.floor(now / RATE_LIMIT_WINDOW);
  for (const key of rateLimits.keys()) {
    if (!key.endsWith(':' + currentWindow)) rateLimits.delete(key);
  }
  lastCleanup = now;
}

/** Get the real client IP from Vercel's trusted headers */
function getClientIP(req) {
  // x-vercel-forwarded-for is set by Vercel edge — cannot be spoofed by clients
  // Falls back through progressively less trusted sources
  const vercelIP = req.headers['x-vercel-forwarded-for'];
  if (vercelIP) return vercelIP.split(',')[0].trim();

  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();

  return req.headers['x-real-ip'] ||
         (req.connection && req.connection.remoteAddress) ||
         (req.socket && req.socket.remoteAddress) ||
         '127.0.0.1';
}

/** Check rate limit for an IP. Returns { allowed, remaining, limit } */
function checkRateLimit(ip) {
  cleanup();
  const now = Date.now();
  const key = `${ip}:${Math.floor(now / RATE_LIMIT_WINDOW)}`;

  const current = rateLimits.get(key) || 0;
  if (current >= RATE_LIMIT_FREE) {
    return { allowed: false, remaining: 0, limit: RATE_LIMIT_FREE };
  }

  rateLimits.set(key, current + 1);
  return { allowed: true, remaining: RATE_LIMIT_FREE - current - 1, limit: RATE_LIMIT_FREE };
}

/**
 * Apply rate limiting to a request. Sets headers and returns 429 if exceeded.
 * Returns true if the request should proceed, false if it was rate-limited.
 */
function applyRateLimit(req, res) {
  const clientIP = getClientIP(req);
  const rateCheck = checkRateLimit(clientIP);

  res.setHeader('X-RateLimit-Limit', rateCheck.limit);
  res.setHeader('X-RateLimit-Remaining', rateCheck.remaining);

  if (!rateCheck.allowed) {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Free tier allows 50 requests per day.'
    });
    return false;
  }
  return true;
}

/** Standard CORS + method check boilerplate. Returns false if request was handled (OPTIONS/405). */
function handlePreflightAndMethod(req, res, cacheControl) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  res.setHeader('Cache-Control', cacheControl || 'public, s-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return false;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return false;
  }
  return true;
}

module.exports = { getClientIP, checkRateLimit, applyRateLimit, handlePreflightAndMethod };
