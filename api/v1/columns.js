const fs = require('fs');
const path = require('path');

// Cache data at module level
let columnsData = null;

function loadColumnsData() {
  if (!columnsData) {
    const columnsPath = path.join(__dirname, '..', '..', 'static', 'data', 'columns.json');
    columnsData = JSON.parse(fs.readFileSync(columnsPath, 'utf8'));
  }
  return columnsData;
}

// Rate limiting - Note: This endpoint would be API key only in full implementation
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
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if this is a free tier request (no API key)
  const hasApiKey = req.headers['x-api-key'];
  
  if (!hasApiKey) {
    return res.status(403).json({
      error: 'API key required',
      message: 'Column search requires an API key. Available in our $10/month tier.',
      upgrade_url: 'mailto:support@hcm-tables.com?subject=API%20Key%20Request'
    });
  }

  // Rate limiting
  const clientIP = getClientIP(req);
  const rateCheck = checkRateLimit(clientIP);
  
  res.setHeader('X-RateLimit-Limit', rateCheck.limit);
  res.setHeader('X-RateLimit-Remaining', rateCheck.remaining);
  
  if (!rateCheck.allowed) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded', 
      message: 'Rate limit exceeded for API key tier.' 
    });
  }

  try {
    const columns = loadColumnsData();
    
    // Parse query parameters
    const query = (req.query.q || '').trim().toUpperCase();
    const table = req.query.table ? req.query.table.toUpperCase() : null;
    const type = req.query.type ? req.query.type.toUpperCase() : null;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // API key tier max 100
    const offset = parseInt(req.query.offset) || 0;

    let results = [];

    // Search columns
    for (const col of columns) {
      let matches = true;

      // Filter by column name
      if (query.length >= 1) {
        const queryAlt = query.replace(/\s+/g, '_');
        matches = matches && (
          col.n.includes(query) || 
          col.n.includes(queryAlt)
        );
      }

      // Filter by data type
      if (type && matches) {
        matches = matches && (col.d && col.d.includes(type));
      }

      if (matches) {
        // Add each table occurrence as a separate result
        for (const tableName of col.t) {
          // Filter by table if specified
          if (table && !tableName.includes(table)) {
            continue;
          }

          results.push({
            column_name: col.n,
            table_name: tableName,
            data_type: col.d || 'UNKNOWN',
            nullable: true // We don't have this data in current format
          });
        }
      }

      // Stop early if we have enough results for pagination
      if (results.length >= (offset + limit) * 2) {
        break;
      }
    }

    // Get total before pagination
    const total = results.length;

    // Apply pagination
    const paginatedResults = results.slice(offset, offset + limit);

    return res.status(200).json({
      columns: paginatedResults,
      total,
      limit,
      offset
    });

  } catch (error) {
    console.error('Error in /api/v1/columns:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to load column data'
    });
  }
};