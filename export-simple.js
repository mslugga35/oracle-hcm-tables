/**
 * Simple export - just 2 JSON files (tables index + all columns with table info)
 */

const Database = require('better-sqlite3');
const fs = require('fs');

const db = new Database('./oracle_tables.db', { readonly: true });

console.log('📦 Exporting data...');

// Export tables
const tables = db.prepare(`
  SELECT t.id, t.name, t.type, m.name as module, c.name as category
  FROM tables_views t
  LEFT JOIN modules m ON t.module_id = m.id
  LEFT JOIN categories c ON t.category_id = c.id
  ORDER BY t.name
`).all();

fs.mkdirSync('./static/data', { recursive: true });
// Oversized build input -- kept out of static/ so it cannot block a Pages deploy.
fs.mkdirSync('./build-data', { recursive: true });
fs.writeFileSync('./static/data/tables.json', JSON.stringify(tables));
console.log(`✅ tables.json (${tables.length})`);

// Export all columns with table name
const columns = db.prepare(`
  SELECT c.*, t.name as table_name, t.type as table_type
  FROM columns c
  JOIN tables_views t ON c.table_id = t.id
  ORDER BY t.name, c.column_order
`).all();

fs.writeFileSync('./build-data/columns-full.json', JSON.stringify(columns));
console.log(`✅ columns-full.json (${columns.length})`);

// Stats
fs.writeFileSync('./static/data/stats.json', JSON.stringify({
  tables: tables.length,
  columns: columns.length,
  modules: [...new Set(tables.map(t => t.module).filter(Boolean))]
}));

console.log('✅ Done!');
db.close();
