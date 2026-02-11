const fs = require('fs');
const path = require('path');

// Cache data at module level
let tablesData = null;
let modulesCache = null;

function loadTablesData() {
  if (!tablesData) {
    const tablesPath = path.join(__dirname, '..', '..', 'static', 'data', 'tables.json');
    tablesData = JSON.parse(fs.readFileSync(tablesPath, 'utf8'));
  }
  return tablesData;
}

function getModulesData() {
  if (modulesCache) {
    return modulesCache;
  }

  const tables = loadTablesData();
  const moduleMap = new Map();

  // Count tables by module
  for (const table of tables) {
    const module = table.module || 'Unknown';
    if (!moduleMap.has(module)) {
      moduleMap.set(module, { count: 0, prefix: getModulePrefix(module) });
    }
    moduleMap.get(module).count++;
  }

  // Convert to array and sort by count (descending)
  modulesCache = Array.from(moduleMap.entries())
    .map(([name, data]) => ({
      name,
      prefix: data.prefix,
      table_count: data.count
    }))
    .sort((a, b) => b.table_count - a.table_count);

  return modulesCache;
}

function getModulePrefix(moduleName) {
  // Extract common prefixes from module names
  const prefixMap = {
    'Human Capital Management': 'HCM',
    'HCM': 'HCM',
    'Financials': 'FIN',
    'Supply Chain Management': 'SCM',
    'CX Sales & Service': 'CX',
    'Procurement': 'PRC',
    'Risk Management': 'RISK',
    'Projects': 'PJT',
    'Unknown': 'UNK'
  };

  return prefixMap[moduleName] || moduleName.substring(0, 3).toUpperCase();
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
    const modules = getModulesData();

    return res.status(200).json({
      modules
    });

  } catch (error) {
    console.error('Error in /api/v1/modules:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to load modules data'
    });
  }
};