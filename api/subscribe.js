const { getClientIP } = require('./_lib/rate-limit');

const SUBSCRIBE_LIMIT = 10;
const SUBSCRIBE_WINDOW = 24 * 60 * 60 * 1000;
const subscribeLimits = new Map();
let lastCleanup = Date.now();

function cleanupSubscribe() {
  const now = Date.now();
  if (now - lastCleanup < SUBSCRIBE_WINDOW) return;
  const currentWindow = Math.floor(now / SUBSCRIBE_WINDOW);
  for (const key of subscribeLimits.keys()) {
    if (!key.endsWith(':' + currentWindow)) subscribeLimits.delete(key);
  }
  lastCleanup = now;
}

function checkSubscribeLimit(ip) {
  cleanupSubscribe();
  const now = Date.now();
  const key = `${ip}:${Math.floor(now / SUBSCRIBE_WINDOW)}`;
  const current = subscribeLimits.get(key) || 0;
  if (current >= SUBSCRIBE_LIMIT) return false;
  subscribeLimits.set(key, current + 1);
  return true;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, source, type } = req.body || {};

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  if (email.length > 254) {
    return res.status(400).json({ error: 'Email too long' });
  }

  const clientIP = getClientIP(req);
  if (!checkSubscribeLimit(clientIP)) {
    return res.status(429).json({ error: 'Too many submissions. Try again tomorrow.' });
  }

  const webhookUrl = process.env.LEADS_WEBHOOK_URL;

  if (webhookUrl) {
    try {
      const payload = {
        content: null,
        embeds: [{
          title: type === 'purchase' ? '💰 Purchase Interest' : '📧 New Lead',
          color: type === 'purchase' ? 0xe05a2b : 0x60a5fa,
          fields: [
            { name: 'Email', value: email, inline: true },
            { name: 'Source', value: source || 'unknown', inline: true },
            { name: 'Type', value: type || 'lead', inline: true },
          ],
          timestamp: new Date().toISOString(),
        }],
      };
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (_) {
      // webhook delivery is best-effort
    }
  }

  console.log(`[subscribe] email=${email} source=${source} type=${type}`);

  return res.status(200).json({ ok: true });
};
