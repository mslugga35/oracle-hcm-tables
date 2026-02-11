const fs = require('fs');
const path = require('path');

// Cache data at module level
let statsData = null;

function loadStatsData() {
  if (!statsData) {
    const statsPath = path.join(__dirname, '..', '..', 'static', 'data', 'stats.json');
    statsData = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
  }
  return statsData;
}

// Rate limiting
const rateLimits = new Map();
const RATE_LIMIT_FREE = 50;
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000;

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
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');

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
    const stats = loadStatsData();
    
    // Get file modification time as last_updated
    const tablesPath = path.join(__dirname, '..', '..', 'static', 'data', 'tables.json');
    const fileStats = fs.statSync(tablesPath);
    const lastUpdated = fileStats.mtime.toISOString().split('T')[0]; // YYYY-MM-DD format

    return res.status(200).json({
      total_tables: stats.tables + (stats.views || 0), // Include views in total
      total_columns: stats.columns,
      modules: stats.modules,
      last_updated: lastUpdated,
      api_version: "1.0.0",
      data_source: "Oracle Cloud Applications Database Tables and Views"
    });

  } catch (error) {
    console.error('Error in /api/v1/stats:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to load stats data'
    });
  }
};