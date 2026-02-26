const fs = require('fs');
const path = require('path');
const { applyRateLimit, handlePreflightAndMethod } = require('../_lib/rate-limit');

let columnsData = null;

function loadColumnsData() {
  if (!columnsData) {
    const columnsPath = path.join(__dirname, '..', '..', 'static', 'data', 'columns.json');
    columnsData = JSON.parse(fs.readFileSync(columnsPath, 'utf8'));
  }
  return columnsData;
}

/** Validate API key against VALID_API_KEYS env var (comma-separated) */
function isValidApiKey(key) {
  const validKeys = process.env.VALID_API_KEYS;
  if (!validKeys) return true; // No keys configured = accept any key (backwards compat)
  return validKeys.split(',').map(k => k.trim()).includes(key);
}

module.exports = (req, res) => {
  if (!handlePreflightAndMethod(req, res, 'public, s-maxage=300, stale-while-revalidate=600')) return;

  // API key required for column search
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(403).json({
      error: 'API key required',
      message: 'Column search requires an API key. Available in our $10/month tier.',
      upgrade_url: 'mailto:support@hcm-tables.com?subject=API%20Key%20Request'
    });
  }
  if (!isValidApiKey(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  if (!applyRateLimit(req, res)) return;

  try {
    const columns = loadColumnsData();

    const query = (req.query.q || '').trim().toUpperCase();
    const table = req.query.table ? req.query.table.toUpperCase() : null;
    const type = req.query.type ? req.query.type.toUpperCase() : null;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    let results = [];
    let totalMatches = 0;

    // Full scan to get accurate total, but only collect what we need for pagination
    for (const col of columns) {
      let matches = true;

      if (query.length >= 1) {
        const queryAlt = query.replace(/\s+/g, '_');
        matches = col.n.includes(query) || col.n.includes(queryAlt);
      }

      if (type && matches) {
        matches = col.d && col.d.includes(type);
      }

      if (matches) {
        for (const tableName of col.t) {
          if (table && !tableName.includes(table)) continue;

          if (totalMatches >= offset && results.length < limit) {
            results.push({
              column_name: col.n,
              table_name: tableName,
              data_type: col.d || 'UNKNOWN',
              nullable: true
            });
          }
          totalMatches++;
        }
      }
    }

    return res.status(200).json({ columns: results, total: totalMatches, limit, offset });
  } catch (error) {
    console.error('Error in /api/v1/columns:', error);
    return res.status(500).json({ error: 'Internal server error', message: 'Failed to load column data' });
  }
};
