/**
 * Export Oracle Tables data from SQLite to JSON files for static site
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('./oracle_tables.db', { readonly: true });

// Ensure output directories exist
const dataDir = './static/data';
// Oversized intermediates live OUTSIDE static/: Cloudflare Pages rejects any file
// over 25 MiB, and wrangler ignores .gitignore, so anything left in static/ blocks
// every deploy. These two are build inputs, never site assets.
const buildDataDir = './build-data';
const tablesDir = './static/data/tables';

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(tablesDir)) fs.mkdirSync(tablesDir, { recursive: true });
if (!fs.existsSync(buildDataDir)) fs.mkdirSync(buildDataDir, { recursive: true });

console.log('📦 Exporting database to JSON files...\n');

// 1. Export all tables metadata
console.log('1. Exporting tables list...');
const tables = db.prepare(`
  SELECT 
    tv.id,
    tv.name,
    tv.type,
    tv.description,
    tv.source_url,
    m.name as module,
    c.name as category,
    (SELECT COUNT(*) FROM columns WHERE table_id = tv.id) as column_count
  FROM tables_views tv
  LEFT JOIN modules m ON tv.module_id = m.id
  LEFT JOIN categories c ON tv.category_id = c.id
  ORDER BY tv.name
`).all();

fs.writeFileSync(
  path.join(dataDir, 'tables.json'),
  JSON.stringify(tables, null, 2)
);
console.log(`   ✅ Exported ${tables.length} tables`);

// 2. Export columns index (for search)
console.log('2. Exporting columns index...');
const columns = db.prepare(`
  SELECT 
    c.name,
    c.data_type,
    c.data_length,
    c.nullable,
    tv.name as table_name,
    tv.id as table_id
  FROM columns c
  JOIN tables_views tv ON c.table_id = tv.id
  ORDER BY c.name, tv.name
`).all();

fs.writeFileSync(
  path.join(dataDir, 'columns.json'),
  JSON.stringify(columns, null, 2)
);
console.log(`   ✅ Exported ${columns.length} columns`);

// 3. Export full columns with descriptions (for detailed search)
console.log('3. Exporting full columns data...');
const columnsFull = db.prepare(`
  SELECT 
    c.name,
    c.data_type,
    c.data_length,
    c.nullable,
    c.description,
    c.column_order,
    tv.name as table_name,
    tv.id as table_id
  FROM columns c
  JOIN tables_views tv ON c.table_id = tv.id
  ORDER BY c.name, tv.name
`).all();

fs.writeFileSync(
  path.join(buildDataDir, 'columns-full.json'),
  JSON.stringify(columnsFull, null, 2)
);
console.log(`   ✅ Exported ${columnsFull.length} full column records`);

// 4. Export individual table files
console.log('4. Exporting individual table files...');
let exportedTables = 0;

const tableStmt = db.prepare(`
  SELECT 
    tv.id,
    tv.name,
    tv.type,
    tv.description,
    tv.source_url,
    m.name as module,
    c.name as category
  FROM tables_views tv
  LEFT JOIN modules m ON tv.module_id = m.id
  LEFT JOIN categories c ON tv.category_id = c.id
  WHERE tv.id = ?
`);

const columnsStmt = db.prepare(`
  SELECT 
    name,
    data_type,
    data_length,
    nullable,
    description,
    column_order
  FROM columns
  WHERE table_id = ?
  ORDER BY column_order
`);

for (const table of tables) {
  const tableData = tableStmt.get(table.id);
  const tableColumns = columnsStmt.all(table.id);
  
  const fullTable = {
    ...tableData,
    columns: tableColumns
  };
  
  fs.writeFileSync(
    path.join(tablesDir, `${table.name}.json`),
    JSON.stringify(fullTable, null, 2)
  );
  
  exportedTables++;
  if (exportedTables % 1000 === 0) {
    console.log(`   Progress: ${exportedTables}/${tables.length}`);
  }
}
console.log(`   ✅ Exported ${exportedTables} individual table files`);

// 5. Export stats
console.log('5. Exporting stats...');
const stats = db.prepare(`
  SELECT 
    (SELECT COUNT(*) FROM tables_views WHERE type='TABLE') as tables,
    (SELECT COUNT(*) FROM tables_views WHERE type='VIEW') as views,
    (SELECT COUNT(*) FROM columns) as columns,
    (SELECT COUNT(DISTINCT module_id) FROM tables_views) as modules
`).get();

fs.writeFileSync(
  path.join(dataDir, 'stats.json'),
  JSON.stringify(stats, null, 2)
);
console.log(`   ✅ Stats: ${stats.tables} tables, ${stats.views} views, ${stats.columns} columns`);

// 6. Create column name index (group by column name for search)
console.log('6. Creating column search index...');
const columnIndex = {};
for (const col of columns) {
  if (!columnIndex[col.name]) {
    columnIndex[col.name] = [];
  }
  columnIndex[col.name].push({
    table: col.table_name,
    type: col.data_type,
    length: col.data_length
  });
}

fs.writeFileSync(
  path.join(buildDataDir, 'column-index.json'),
  JSON.stringify(columnIndex, null, 2)
);
console.log(`   ✅ Indexed ${Object.keys(columnIndex).length} unique column names`);

db.close();
console.log('\n✅ Export complete!');
