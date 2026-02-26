const fs = require('fs');
const path = require('path');
const { applyRateLimit, handlePreflightAndMethod } = require('../../_lib/rate-limit');

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

module.exports = (req, res) => {
  if (!handlePreflightAndMethod(req, res, 'public, s-maxage=3600, stale-while-revalidate=7200')) return;
  if (!applyRateLimit(req, res)) return;

  try {
    loadData();

    const tableName = req.query.name?.toUpperCase() || '';
    if (!tableName) {
      return res.status(400).json({ error: 'Bad request', message: 'Table name is required' });
    }

    const table = tablesData.find(t => t.name === tableName);
    if (!table) {
      return res.status(404).json({ error: 'Table not found', message: `No table found with name: ${tableName}` });
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
    return res.status(500).json({ error: 'Internal server error', message: 'Failed to load table details' });
  }
};
