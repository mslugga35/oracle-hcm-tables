#!/usr/bin/env node
/**
 * Regenerate the Blog / BlogPosting JSON-LD block in static/blog/index.html
 * from the post cards already in that file.
 *
 * WHY GENERATED, NOT HAND-WRITTEN: a hand-maintained schema block silently
 * drifts from the real post list. PR #6 (2026-07-30) was exactly that failure
 * — it claimed "45 BlogPosting entries present (matches article count)" while
 * actually containing 17, omitting 33 real posts and listing 3 URLs that have
 * never existed. Structured data pointing at non-existent URLs is worse than
 * none: those paths return the homepage via the Pages SPA fallback, so Google
 * is told about pages that resolve to duplicate content.
 *
 * The card markup is the single source of truth. Run this after adding a post.
 *
 * Usage:
 *   node scripts/generate-blog-schema.mjs           # rewrite the block
 *   node scripts/generate-blog-schema.mjs --check   # exit 1 if out of date
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHECK = process.argv.includes('--check');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = join(root, 'static/blog/index.html');
const SITE = 'https://hcm-tables.com';
const START = '  <!-- BEGIN generated blog schema (scripts/generate-blog-schema.mjs) -->';
const END = '  <!-- END generated blog schema -->';

const MONTHS = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
                 Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };

/** "Jun 13, 2026 · 14 min read" -> "2026-06-13". Null if unparseable. */
function isoDate(meta) {
  const m = /([A-Z][a-z]{2})\s+(\d{1,2}),\s*(\d{4})/.exec(meta || '');
  return m ? `${m[3]}-${MONTHS[m[1]]}-${String(m[2]).padStart(2, '0')}` : null;
}

/**
 * Read datePublished from the post's own page.
 *
 * Preferred over the index card: 49 of 50 posts carry a date in their own
 * JSON-LD or og meta, while many index cards have an empty date slot
 * (` · 2800 words`). Taking it from the post keeps the two in agreement and
 * means a card without a date does not silently produce dateless schema.
 */
function dateFromPost(slug) {
  try {
    const s = readFileSync(join(root, 'static/blog', `${slug}.html`), 'utf8');
    const m = /"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/.exec(s)
      || /article:published_time"\s+content="(\d{4}-\d{2}-\d{2})/.exec(s);
    return m ? m[1] : null;
  } catch {
    return null; // post file absent — caller warns
  }
}

const decode = (s) => s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

const html = readFileSync(INDEX, 'utf8');

const cardRe = /<article class="blog-card">\s*<a href="\/blog\/([^"]+)">[\s\S]*?<h2>([\s\S]*?)<\/h2>\s*<p class="blog-card-meta">([\s\S]*?)<\/p>\s*<p class="blog-card-desc">([\s\S]*?)<\/p>/g;

const posts = [];
for (const [, slug, title, meta, desc] of html.matchAll(cardRe)) {
  // Titles carry a " | HCM Tables" suffix for <title>; drop it for the headline.
  posts.push({
    slug,
    headline: decode(title).replace(/\s*\|\s*HCM Tables\s*$/, ''),
    date: dateFromPost(slug) || isoDate(decode(meta)),
    description: decode(desc),
  });
}

if (!posts.length) {
  console.error('[SCHEMA] no blog cards matched — refusing to write an empty schema.');
  process.exit(1);
}

const schema = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: 'Oracle HCM Tables Blog',
  description: 'Oracle HCM guides, SQL queries, OTBI tips, and Fusion Cloud troubleshooting articles from HCM Tables.',
  url: `${SITE}/blog/`,
  publisher: { '@type': 'Organization', name: 'HCM Tables', url: SITE },
  blogPost: posts.map((p) => ({
    '@type': 'BlogPosting',
    headline: p.headline,
    url: `${SITE}/blog/${p.slug}`,
    ...(p.date ? { datePublished: p.date } : {}),
    description: p.description,
    author: { '@type': 'Organization', name: 'HCM Tables' },
  })),
};

const block = `${START}\n  <script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n  </script>\n${END}`;

// Escape regex metacharacters — START contains "(" , ")" and "." which would
// otherwise be interpreted as a group and wildcards.
const rx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const existing = new RegExp(`${rx(START)}[\\s\\S]*?${rx(END)}`);

// Replace via a FUNCTION, not a string: "$&" / "$1" in a replacement string are
// substitution patterns, and post descriptions legitimately contain "$".
let out;
if (existing.test(html)) {
  out = html.replace(existing, () => block);
} else {
  out = html.replace('</head>', () => `${block}\n</head>`); // first run
}

if (CHECK) {
  // Compare the PARSED schema, not the raw text — whitespace or key-order
  // churn should not be reported as drift, and a missing block should.
  const m = existing.exec(html);
  let embedded = null;
  if (m) {
    const json = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(m[0]);
    try { embedded = JSON.parse(json[1]); } catch { embedded = null; }
  }
  const same = embedded && JSON.stringify(embedded) === JSON.stringify(schema);
  if (!same) {
    const n = embedded?.blogPost?.length ?? 0;
    console.error(`[SCHEMA] OUT OF DATE — index has ${posts.length} posts, embedded schema has ${n}.`);
    console.error('[SCHEMA] Run: node scripts/generate-blog-schema.mjs');
    process.exit(1);
  }
  console.log(`[SCHEMA] up to date (${posts.length} posts).`);
  process.exit(0);
}

writeFileSync(INDEX, out, 'utf8');
const undated = posts.filter((p) => !p.date).length;
console.log(`[SCHEMA] wrote ${posts.length} BlogPosting entries${undated ? ` (${undated} without a parseable date)` : ''}.`);
