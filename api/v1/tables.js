const fs = require('fs');
const path = require('path');

// Cache data at module level — persists between warm invocations
let tablesData = null;

function loadTablesData() {
  if (!tablesData) {
    const tablesPath = path.join(__dirname, '..', '..', 'static', 'data', 'tables.json');
    tablesData = JSON.parse(fs.readFileSync(tablesPath, 'utf8'));
  }
  return tablesData;
}

// Rate limiting - simple in-memory store (resets on cold start)
const rateLimits = new Map();
const RATE_LIMIT_FREE = 50; // requests per day
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

function checkRateLimit(ip) {
  const now = Date.now();
  const key = `${ip}:${Math.floor(now / RATE_LIMIT_WINDOW)}`;
  
  const current = rateLimits.get(key) || 0;
  if (current >= RATE_LIMIT_FREE) {
    return { allowed: false, remaining: 0, limit: RATE_LIMIT_FREE };
  }
  
  rateLimits.set(key, current + 1);
  return { allowed: true, remaining: RATE_LIMIT_FREE - current - 1, limit: RATE_LIMIT_FREE };
}

function getClientIP(req) {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         '127.0.0.1';
}

module.exports = (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIP = getClientIP(req);
  const rateCheck = checkRateLimit(clientIP);
  
  res.setHeader('X-RateLimit-Limit', rateCheck.limit);
  res.setHeader('X-RateLimit-Remaining', rateCheck.remaining);
  
  if (!rateCheck.allowed) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded', 
      message: 'Free tier allows 50 requests per day. Upgrade to API key tier for higher limits.' 
    });
  }

  try {
    const tables = loadTablesData();
    
    // Parse query parameters
    const query = (req.query.q || '').trim().toUpperCase();
    const module = req.query.module ? req.query.module.toUpperCase() : null;
    const limit = Math.min(parseInt(req.query.limit) || 10, 10); // Free tier max 10
    const offset = parseInt(req.query.offset) || 0;

    let results = tables;

    // Filter by query (table name search)
    if (query.length >= 1) {
      const queryAlt = query.replace(/\s+/g, '_');
      results = results.filter(t => 
        t.name.includes(query) || 
        t.name.includes(queryAlt) ||
        (t.description && t.description.toUpperCase().includes(query))
      );
    }

    // Filter by module
    if (module) {
      results = results.filter(t => 
        t.module && t.module.toUpperCase().includes(module)
      );
    }

    // Get total before pagination
    const total = results.length;

    // Apply pagination
    const paginatedResults = results.slice(offset, offset + limit);

    // Format response
    const formattedTables = paginatedResults.map(t => ({
      name: t.name,
      module: t.module || 'Unknown',
      description: t.description || '',
      column_count: t.column_count || 0
    }));

    return res.status(200).json({
      tables: formattedTables,
      total,
      limit,
      offset
    });

  } catch (error) {
    console.error('Error in /api/v1/tables:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to load table data'
    });
  }
};