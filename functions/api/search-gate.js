/**
 * CF Pages Function: GET /api/search-gate
 * Server-side search counting per IP. Returns whether the user can search.
 * Paid users pass their unlock token for unlimited access.
 */

const FREE_SEARCHES = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000;
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

function getClientIP(request) {
  return request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1';
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const token = url.searchParams.get('token');
  const secret = context.env.UNLOCK_SECRET || '';

  if (token && secret) {
    const parts = token.split('.');
    if (parts.length === 2) {
      const [payload, sig] = parts;
      try {
        const key = await crypto.subtle.importKey(
          'raw', new TextEncoder().encode(secret),
          { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
        );
        const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
        const expected = Array.from(new Uint8Array(signed))
          .map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
        if (expected === sig) {
          return Response.json({ allowed: true, remaining: -1, limit: FREE_SEARCHES, unlocked: true });
        }
      } catch {}
    }
  }

  cleanup();
  const ip = getClientIP(context.request);
  const windowKey = `${ip}:${Math.floor(Date.now() / WINDOW_MS)}`;
  const current = searchCounts.get(windowKey) || 0;
  const remaining = Math.max(0, FREE_SEARCHES - current);

  if (remaining <= 0) {
    return Response.json({ allowed: false, remaining: 0, limit: FREE_SEARCHES, unlocked: false });
  }

  searchCounts.set(windowKey, current + 1);
  return Response.json({ allowed: true, remaining: remaining - 1, limit: FREE_SEARCHES, unlocked: false });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
