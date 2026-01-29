const db = require('better-sqlite3')('./oracle_tables.db');

// Check a specific table
const tableName = 'ANC_PER_ABSENCE_INFO';
const table = db.prepare('SELECT * FROM tables_views WHERE name = ?').get(tableName);
console.log('TABLE:', table ? table.name : 'NOT FOUND');

if (table) {
  const cols = db.prepare('SELECT name, data_type, data_length, nullable, description FROM columns WHERE table_id = ? ORDER BY column_order').all(table.id);
  console.log('\nCOLUMNS IN DB:');
  cols.forEach(c => {
    console.log(`  ${c.name.padEnd(25)} | ${(c.data_type || '-').padEnd(10)} | ${String(c.data_length || '-').padEnd(4)} | ${c.nullable} | ${(c.description || '').substring(0, 40)}`);
  });
  console.log(`\nTotal: ${cols.length} columns`);
}

// What Oracle shows (for comparison):
console.log('\n--- ORACLE DOCS SHOWS ---');
console.log('PER_ABSENCE_INFO_ID       | NUMBER     | 18   | N | PER_ABSENCE_INFO_ID');
console.log('PER_ABSENCE_ENTRY_ID      | NUMBER     | 18   | N | PER_ABSENCE_ENTRY_ID');
console.log('PER_ABSENCE_INFO          | CLOB       | -    | Y | PER_ABSENCE_INFO');
console.log('CREATION_DATE             | TIMESTAMP  | -    | N | Who column...');
console.log('LAST_UPDATED_BY           | VARCHAR2   | 64   | N | Who column...');
console.log('LAST_UPDATE_DATE          | TIMESTAMP  | -    | N | Who column...');
console.log('LAST_UPDATE_LOGIN         | VARCHAR2   | 32   | Y | Who column...');
console.log('OBJECT_VERSION_NUMBER     | NUMBER     | 9    | N | Used to implement...');
console.log('CREATED_BY                | VARCHAR2   | 64   | N | Who column...');
console.log('Total: 9 columns');

db.close();
