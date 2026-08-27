/**
 * create-column-index.js
 *
 * Builds a compact column search index from the full column dataset.
 *
 * Input:  build-data/columns-full.json  — raw rows (1.2M+), may have duplicate column+table combos
 * Output: static/data/columns.json       — compact index used by the SPA search
 *
 * Output format per entry:
 *   { n: column_name, d: data_type, c: unique_table_count, t: [up to 5 sample table names] }
 *
 * The SPA uses `c - t.length` to display "+N more tables", so `c` must reflect
 * the number of *unique* tables containing each column — not raw row count.
 *
 * Streaming implementation: reads 1.2M+ rows without loading entire file into memory.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const INPUT  = path.join(__dirname, 'build-data', 'columns-full.json');
const OUTPUT = path.join(__dirname, 'static', 'data', 'columns.json');

console.log('Reading columns-full.json (streaming) ...');

// Group by column name, tracking unique tables via Set
const index = {};
let rowCount = 0;

// Create readline interface for streaming
const rl = readline.createInterface({
  input: fs.createReadStream(INPUT),
  crlfDelay: Infinity
});

// Track state for JSON array parsing
let inArray = false;
let buffer = '';

rl.on('line', (line) => {
  const trimmed = line.trim();

  // Skip opening bracket and whitespace
  if (trimmed === '[' || trimmed === '') return;
  if (trimmed === ']') {
    // Final flush
    if (buffer.trim() && buffer.trim() !== ',') {
      flushBuffer();
    }
    return;
  }

  // Accumulate lines into buffer
  buffer += line + '\n';

  // Check if we have a complete object (ends with } or },)
  if (trimmed === '}' || trimmed === '},') {
    flushBuffer();

    // Log progress every 100k rows
    if (rowCount % 100000 === 0) {
      console.log(`  ${rowCount} rows processed...`);
    }
  }
});

function flushBuffer() {
  try {
    // Remove trailing comma if present
    const json = buffer.trim();
    const cleanJson = json.endsWith(',') ? json.slice(0, -1) : json;
    const obj = JSON.parse(cleanJson);
    processColumn(obj);
    rowCount++;
  } catch (e) {
    // Silently skip malformed entries
  }
  buffer = '';
}

function processColumn(col) {
  if (!index[col.name]) {
    index[col.name] = { type: col.data_type || '', tableSet: new Set() };
  }
  index[col.name].tableSet.add(col.table_name);
}

rl.on('close', () => {
  console.log(`Total rows processed: ${rowCount}`);

  const uniqueNames = Object.keys(index).length;
  console.log(`Unique column names: ${uniqueNames}`);

  // Compact array with up to 5 sample tables per column
  console.log('Building compact index ...');
  const compact = Object.entries(index).map(([name, data]) => ({
    n: name,
    d: data.type,
    c: data.tableSet.size,
    t: Array.from(data.tableSet).slice(0, 5)
  }));

  console.log('Writing columns.json ...');
  fs.writeFileSync(OUTPUT, JSON.stringify(compact));

  const sizeMB = (fs.statSync(OUTPUT).size / (1024 * 1024)).toFixed(2);
  console.log(`Done -> columns.json  ${sizeMB} MB  (${uniqueNames} unique columns, top 5 tables each)`);
});

rl.on('error', (err) => {
  console.error('Error reading file:', err);
  process.exit(1);
});
