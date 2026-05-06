/**
 * CF Pages Function: /api/unlock
 * POST: Validate an unlock code and return a signed token.
 * GET:  Verify an existing token.
 *
 * Env vars (set in CF Pages project settings):
 *   UNLOCK_CODES  — comma-separated djb2 hashes of valid codes
 *   UNLOCK_SECRET — HMAC signing secret for tokens
 */

function hashCode(str) {
  return Array.from(str)
    .reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
    .toString(16)
    .slice(-8);
}

async function createToken(secret) {
  const payload = Date.now().toString();
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const hmac = Array.from(new Uint8Array(signed))
    .map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  return `${payload}.${hmac}`;
}

async function verifyToken(token, secret) {
  if (!secret || !token || !token.includes('.')) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  try {
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    const expected = Array.from(new Uint8Array(signed))
      .map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
    // Constant-time comparison
    if (expected.length !== sig.length) return false;
    let result = 0;
    for (let i = 0; i < expected.length; i++) {
      result |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
    }
    return result === 0;
  } catch {
    return false;
  }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const token = url.searchParams.get('token');
  const secret = context.env.UNLOCK_SECRET || '';
  const valid = await verifyToken(token, secret);
  return Response.json({ valid }, { headers: CORS });
}

export async function onRequestPost(context) {
  const secret = context.env.UNLOCK_SECRET || '';
  const validHashes = context.env.UNLOCK_CODES
    ? context.env.UNLOCK_CODES.split(',').map(h => h.trim())
    : [];

  if (!secret || validHashes.length === 0) {
    return Response.json({ valid: false, error: 'Service not configured' }, { status: 503, headers: CORS });
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ valid: false, error: 'Invalid JSON' }, { status: 400, headers: CORS });
  }

  const code = (body?.code || '').trim().toUpperCase();
  if (!code) {
    return Response.json({ valid: false, error: 'Code is required' }, { status: 400, headers: CORS });
  }

  if (validHashes.includes(hashCode(code))) {
    const token = await createToken(secret);
    return Response.json({ valid: true, token }, { headers: CORS });
  }

  return Response.json({ valid: false }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
