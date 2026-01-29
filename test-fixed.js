const https = require('https');
const cheerio = require('cheerio');

const testUrl = 'https://docs.oracle.com/en/cloud/saas/human-resources/oedmh/ancperabsenceinfo-12433.html';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
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
  
  // Find the Columns table - look for table with headers: Name, Datatype, Length...
  let columnsTable = null;
  $('table').each((i, tbl) => {
    const headerText = $(tbl).find('tr').first().text().toLowerCase();
    if (headerText.includes('name') && headerText.includes('datatype')) {
      columnsTable = tbl;
      return false;
    }
  });
  
  if (!columnsTable) {
    const tables = $('table');
    if (tables.length >= 2) columnsTable = tables.eq(1);
  }
  
  if (!columnsTable) return [];
  
  let columnOrder = 0;
  $(columnsTable).find('tr').slice(1).each((i, row) => {
    const cells = $(row).find('td');
    if (cells.length < 2) return;
    
    columnOrder++;
    const name = cells.eq(0).text().trim();
    const dataType = cells.eq(1).text().trim().toUpperCase();
    const length = cells.eq(2).text().trim();
    const precision = cells.eq(3).text().trim();
    const notNull = cells.eq(4).text().trim();
    const comment = cells.eq(5).text().trim();
    
    if (!name || !name.match(/^[A-Z][A-Z0-9_]+$/)) return;
    
    columns.push({
      name,
      data_type: dataType || null,
      data_length: length ? parseInt(length) : (precision ? parseInt(precision) : null),
      nullable: notNull === 'Yes' ? 'N' : 'Y',
      description: comment.substring(0, 80) || ''
    });
  });
  
  return columns;
}

parseTablePage(testUrl).then(cols => {
  console.log('=== PARSED COLUMNS ===\n');
  cols.forEach(c => {
    console.log(`${c.name.padEnd(25)} | ${(c.data_type || '').padEnd(10)} | ${String(c.data_length || '').padEnd(4)} | ${c.nullable} | ${c.description.substring(0,40)}`);
  });
  console.log(`\nTotal: ${cols.length} columns`);
}).catch(console.error);
