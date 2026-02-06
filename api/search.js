const fs = require('fs');
const path = require('path');

// Cache data at module level — persists between warm invocations
let tablesData = null;
let columnsData = null;

function loadData() {
  if (!tablesData) {
    const tablesPath = path.join(__dirname, '..', 'static', 'data', 'tables.json');
    tablesData = JSON.parse(fs.readFileSync(tablesPath, 'utf8'));
  }
  if (!columnsData) {
    const columnsPath = path.join(__dirname, '..', 'static', 'data', 'columns.json');
    columnsData = JSON.parse(fs.readFileSync(columnsPath, 'utf8'));
  }
}

module.exports = (req, res) => {
  // CORS headers (same-origin friendly)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawQuery = (req.query.q || '').trim();

  if (rawQuery.length < 2) {
    return res.status(200).json({ tables: [], columns: [], total: 0 });
  }

  try {
    loadData();
  } catch (e) {
    console.error('Failed to load data:', e);
    return res.status(500).json({ error: 'Failed to load search data' });
  }

  // Normalize: uppercase, spaces to underscores (matches frontend logic)
  const query = rawQuery.toUpperCase();
  const queryAlt = query.replace(/\s+/g, '_');

  // Search tables by name (includes match), limit 20
  const matchedTables = [];
  for (const t of tablesData) {
    if (t.name.includes(query) || t.name.includes(queryAlt)) {
      matchedTables.push({ name: t.name, type: t.type, module: t.module || 'HCM' });
      if (matchedTables.length >= 20) break;
    }
  }

  // Search columns using compact format {n, d, c, t}, limit 30 groups
  // Then flatten: each table entry becomes a separate result (same as frontend)
  const matchedColumnsRaw = [];
  for (const c of columnsData) {
    if (c.n.includes(query) || c.n.includes(queryAlt)) {
      matchedColumnsRaw.push(c);
      if (matchedColumnsRaw.length >= 30) break;
    }
  }

  const matchedColumns = [];
  for (const col of matchedColumnsRaw) {
    for (const tbl of col.t) {
      matchedColumns.push({
        name: col.n,
        table_name: tbl,
        data_type: col.d || '',
        extra: col.c > col.t.length ? col.c - col.t.length : 0
      });
    }
  }

  const total = matchedTables.length + matchedColumns.length;

  return res.status(200).json({
    tables: matchedTables,
    columns: matchedColumns,
    total
  });
};
