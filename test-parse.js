const https = require('https');
const cheerio = require('cheerio');

const testUrl = 'https://docs.oracle.com/en/cloud/saas/human-resources/oedmh/ancperabsenceinfo-12433.html';

https.get(testUrl, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const $ = cheerio.load(data);
    
    // Find "Columns" section and its table
    console.log('=== Looking for tables ===\n');
    
    $('table').each((i, tbl) => {
      const headers = [];
      $(tbl).find('thead tr th, thead tr td, tr:first-child th, tr:first-child td').each((j, cell) => {
        headers.push($(cell).text().trim());
      });
      console.log(`Table ${i} headers:`, headers.join(' | '));
      
      // Get first few data rows
      const rows = [];
      $(tbl).find('tbody tr, tr').slice(1, 4).each((j, row) => {
        const cells = [];
        $(row).find('td, th').each((k, cell) => {
          cells.push($(cell).text().trim().substring(0, 30));
        });
        if (cells.length > 0) rows.push(cells);
      });
      
      console.log('Sample rows:');
      rows.forEach(r => console.log('  ', r.join(' | ')));
      console.log('\n');
    });
  });
}).on('error', console.error);
