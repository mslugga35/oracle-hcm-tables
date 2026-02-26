const fs = require('fs');
const path = require('path');
const { applyRateLimit, handlePreflightAndMethod } = require('../_lib/rate-limit');

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
  if (modulesCache) return modulesCache;

  const tables = loadTablesData();
  const moduleMap = new Map();

  for (const table of tables) {
    const module = table.module || 'Unknown';
    if (!moduleMap.has(module)) {
      moduleMap.set(module, { count: 0, prefix: getModulePrefix(module) });
    }
    moduleMap.get(module).count++;
  }

  modulesCache = Array.from(moduleMap.entries())
    .map(([name, data]) => ({ name, prefix: data.prefix, table_count: data.count }))
    .sort((a, b) => b.table_count - a.table_count);

  return modulesCache;
}

function getModulePrefix(moduleName) {
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

module.exports = (req, res) => {
  if (!handlePreflightAndMethod(req, res, 'public, s-maxage=3600, stale-while-revalidate=7200')) return;
  if (!applyRateLimit(req, res)) return;

  try {
    return res.status(200).json({ modules: getModulesData() });
  } catch (error) {
    console.error('Error in /api/v1/modules:', error);
    return res.status(500).json({ error: 'Internal server error', message: 'Failed to load modules data' });
  }
};
