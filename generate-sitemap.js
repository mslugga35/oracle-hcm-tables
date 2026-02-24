/**
 * Generate sitemap.xml for hcm-tables.com
 * Creates URLs for tables that have JSON data files, blog pages, and static pages
 */

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://hcm-tables.com';
const TODAY = new Date().toISOString().split('T')[0];

// Get list of actual JSON files in data/tables
const tablesDir = path.join(__dirname, 'static', 'data', 'tables');
const files = fs.readdirSync(tablesDir).filter(f => f.endsWith('.json'));
const tableNames = files.map(f => f.replace('.json', ''));

// Filter out tables with trailing underscore (duplicates/variants)
const uniqueTables = tableNames.filter(name => !name.endsWith('_'));

// Get list of blog posts (all .html files in static/blog/ except index.html)
const blogDir = path.join(__dirname, 'static', 'blog');
const blogFiles = fs.readdirSync(blogDir)
  .filter(f => f.endsWith('.html') && f !== 'index.html');
const blogSlugs = blogFiles.map(f => f.replace('.html', ''));

console.log(`Total JSON files: ${files.length}`);
console.log(`Unique tables (excluding _ suffix): ${uniqueTables.length}`);
console.log(`Blog posts: ${blogSlugs.length}`);

// Generate sitemap XML
let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <!-- Search page -->
  <url>
    <loc>${SITE_URL}/search</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <!-- Static pages -->
  <url>
    <loc>${SITE_URL}/privacy</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${SITE_URL}/terms</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <!-- Blog index -->
  <url>
    <loc>${SITE_URL}/blog/</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;

// Add each blog post
for (const slug of blogSlugs.sort()) {
  xml += `  <url>
    <loc>${SITE_URL}/blog/${slug}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
}

// Add each table page that has actual data
for (const name of uniqueTables.sort()) {
  xml += `  <url>
    <loc>${SITE_URL}/table/${encodeURIComponent(name)}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
}

xml += `</urlset>`;

// Write sitemap
const sitemapPath = path.join(__dirname, 'static', 'sitemap.xml');
fs.writeFileSync(sitemapPath, xml);

const stats = fs.statSync(sitemapPath);
const totalUrls = uniqueTables.length + blogSlugs.length + 5; // tables + blog posts + homepage + search + blog index + privacy + terms
console.log(`\nSitemap generated: ${sitemapPath}`);
console.log(`Total URLs in sitemap: ${totalUrls}`);
console.log(`File size: ${(stats.size / 1024).toFixed(1)} KB`);
