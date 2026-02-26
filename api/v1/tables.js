const fs = require('fs');
const path = require('path');
const { applyRateLimit, handlePreflightAndMethod } = require('../_lib/rate-limit');

let tablesData = null;

function loadTablesData() {
  if (!tablesData) {
    const tablesPath = path.join(__dirname, '..', '..', 'static', 'data', 'tables.json');
    tablesData = JSON.parse(fs.readFileSync(tablesPath, 'utf8'));
  }
  return tablesData;
}

module.exports = (req, res) => {
  if (!handlePreflightAndMethod(req, res, 'public, s-maxage=300, stale-while-revalidate=600')) return;
  if (!applyRateLimit(req, res)) return;

  try {
    const tables = loadTablesData();

    const query = (req.query.q || '').trim().toUpperCase();
    const module = req.query.module ? req.query.module.toUpperCase() : null;
    const limit = Math.min(parseInt(req.query.limit) || 10, 10);
    const offset = parseInt(req.query.offset) || 0;

    let results = tables;

    if (query.length >= 1) {
      const queryAlt = query.replace(/\s+/g, '_');
      results = results.filter(t =>
        t.name.includes(query) ||
        t.name.includes(queryAlt) ||
        (t.description && t.description.toUpperCase().includes(query))
      );
    }

    if (module) {
      results = results.filter(t =>
        t.module && t.module.toUpperCase().includes(module)
      );
    }

    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limit);

    const formattedTables = paginatedResults.map(t => ({
      name: t.name,
      module: t.module || 'Unknown',
      description: t.description || '',
      column_count: t.column_count || 0
    }));

    return res.status(200).json({ tables: formattedTables, total, limit, offset });
  } catch (error) {
    console.error('Error in /api/v1/tables:', error);
    return res.status(500).json({ error: 'Internal server error', message: 'Failed to load table data' });
  }
};
