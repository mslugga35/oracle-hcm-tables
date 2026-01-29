/**
 * Test script to verify HTML parsing works correctly
 */

const https = require('https');
const cheerio = require('cheerio');

async function fetchUrl(url) {
  return await new Promise((resolve, reject) => {
    https.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchUrl(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function parseTablePage(url) {
  const html = await fetchUrl(url);
  const $ = cheerio.load(html);
  
  const columns = [];
  let description = '';
  
  // Get table description from first paragraph with class 'p'
  const descP = $('p.p').first().text().trim();
  if (descP) description = descP;
  
  // Find the Columns section - it's under a section with h2 "Columns"
  let columnsTable = null;
  
  // Method 1: Find section with "Columns" header and get its table
  $('section.section').each((i, section) => {
    const sectionTitle = $(section).find('h2.title').text().trim();
    if (sectionTitle === 'Columns') {
      columnsTable = $(section).find('table').first();
      return false; // break
    }
  });
  
  // Method 2: Fallback - find table with header containing Name + Datatype
  if (!columnsTable || columnsTable.length === 0) {
    $('table').each((i, tbl) => {
      const headerRow = $(tbl).find('thead tr').first();
      const headers = headerRow.find('th').map((j, th) => $(th).text().trim().toLowerCase()).get();
      if (headers.includes('name') && headers.includes('datatype')) {
        columnsTable = $(tbl);
        return false; // break
      }
    });
  }
  
  if (!columnsTable || columnsTable.length === 0) {
    console.log('No columns table found');
    return { description, columns: [] };
  }
  
  console.log('Found columns table');
  
  // Parse rows from tbody (skip header row in thead)
  let columnOrder = 0;
  $(columnsTable).find('tbody tr.row').each((i, row) => {
    const cells = $(row).find('td.entry');
    if (cells.length < 5) return; // Need at least Name, Datatype, Length, Precision, Not-null
    
    const name = cells.eq(0).text().trim();
    const dataType = cells.eq(1).text().trim().toUpperCase();
    const length = cells.eq(2).text().trim();
    const precision = cells.eq(3).text().trim();
    const notNull = cells.eq(4).text().trim();
    const comment = cells.length >= 6 ? cells.eq(5).text().trim() : '';
    
    // Skip if no valid column name (should be uppercase with underscores)
    if (!name || !name.match(/^[A-Z][A-Z0-9_]*$/)) return;
    
    // Skip if name looks like a data type (common types)
    const dataTypes = ['NUMBER', 'VARCHAR2', 'DATE', 'TIMESTAMP', 'CLOB', 'BLOB', 'RAW', 'CHAR', 'NVARCHAR2', 'NCHAR', 'LONG'];
    if (dataTypes.includes(name)) return;
    
    columnOrder++;
    
    // Calculate data_length: use Length if present, else Precision
    let dataLength = null;
    if (length) {
      dataLength = parseInt(length) || null;
    } else if (precision) {
      dataLength = parseInt(precision) || null;
    }
    
    columns.push({
      name: name,
      data_type: dataType || null,
      data_length: dataLength,
      nullable: notNull === 'Yes' ? 'N' : 'Y',  // "Yes" in Not-null column means NOT NULL
      description: comment || '',
      column_order: columnOrder
    });
  });
  
  return { description, columns };
}

async function main() {
  const testUrl = 'https://docs.oracle.com/en/cloud/saas/human-resources/oedmh/ancabsenceagreementsf-11015.html';
  console.log(`Testing parser on: ${testUrl}\n`);
  
  const result = await parseTablePage(testUrl);
  
  console.log(`Description: ${result.description}\n`);
  console.log(`Found ${result.columns.length} columns:\n`);
  
  // Print first 10 columns
  result.columns.slice(0, 10).forEach((col, i) => {
    console.log(`${i+1}. ${col.name} - ${col.data_type}(${col.data_length || ''}) ${col.nullable === 'N' ? 'NOT NULL' : 'NULL'}`);
    if (col.description && col.description !== col.name) {
      console.log(`   Description: ${col.description.substring(0, 80)}...`);
    }
  });
  
  if (result.columns.length > 10) {
    console.log(`... and ${result.columns.length - 10} more columns`);
  }
}

main().catch(console.error);
