const fs = require('fs');
const path = require('path');
const { applyRateLimit, handlePreflightAndMethod } = require('../_lib/rate-limit');

let statsData = null;
let lastUpdated = null;

function loadStatsData() {
  if (!statsData) {
    const statsPath = path.join(__dirname, '..', '..', 'static', 'data', 'stats.json');
    statsData = JSON.parse(fs.readFileSync(statsPath, 'utf8'));

    const tablesPath = path.join(__dirname, '..', '..', 'static', 'data', 'tables.json');
    lastUpdated = fs.statSync(tablesPath).mtime.toISOString().split('T')[0];
  }
  return statsData;
}

module.exports = (req, res) => {
  if (!handlePreflightAndMethod(req, res, 'public, s-maxage=3600, stale-while-revalidate=7200')) return;
  if (!applyRateLimit(req, res)) return;

  try {
    const stats = loadStatsData();

    return res.status(200).json({
      total_tables: stats.tables + (stats.views || 0),
      total_columns: stats.columns,
      modules: stats.modules,
      last_updated: lastUpdated,
      api_version: "1.0.0",
      data_source: "Oracle Cloud Applications Database Tables and Views"
    });
  } catch (error) {
    console.error('Error in /api/v1/stats:', error);
    return res.status(500).json({ error: 'Internal server error', message: 'Failed to load stats data' });
  }
};
