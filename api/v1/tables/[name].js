const fs = require('fs');
const path = require('path');

// Cache data at module level
let tablesData = null;
let columnsData = null;

function loadData() {
  if (!tablesData) {
    const tablesPath = path.join(__dirname, '..', '..', '..', 'static', 'data', 'tables.json');
    tablesData = JSON.parse(fs.readFileSync(tablesPath, 'utf8'));
  }
  if (!columnsData) {
    const columnsPath = path.join(__dirname, '..', '..', '..', 'static', 'data', 'columns.json');
    columnsData = JSON.parse(fs.readFileSync(columnsPath, 'utf8'));
  }
}

// Rate limiting - simple in-memory store
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
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting (this is a premium endpoint in free tier, but we'll allow it)
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
    loadData();
    
    const tableName = req.query.name?.toUpperCase() || '';
    
    if (!tableName) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Table name is required'
      });
    }

    // Find the table
    const table = tablesData.find(t => t.name === tableName);
    
    if (!table) {
      return res.status(404).json({
        error: 'Table not found',
        message: `No table found with name: ${tableName}`
      });
    }

    // Single pass: collect columns and related tables simultaneously
    const tableColumns = [];
    const relatedTables = new Map();

    for (const col of columnsData) {
      if (col.t.includes(tableName)) {
        tableColumns.push({
          name: col.n,
          type: col.d || 'UNKNOWN',
          nullable: true,
          description: ''
        });
        for (const relatedTable of col.t) {
          if (relatedTable !== tableName) {
            relatedTables.set(relatedTable, (relatedTables.get(relatedTable) || 0) + 1);
          }
        }
      }
    }

    tableColumns.sort((a, b) => a.name.localeCompare(b.name));

    // Get top 5 related tables by shared column count
    const topRelated = Array.from(relatedTables.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, sharedColumns]) => ({ name, shared_columns: sharedColumns }));

    return res.status(200).json({
      name: table.name,
      module: table.module || 'Unknown',
      description: table.description || '',
      columns: tableColumns,
      related_tables: topRelated
    });

  } catch (error) {
    console.error('Error in /api/v1/tables/[name]:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to load table details'
    });
  }
};