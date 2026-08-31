#!/usr/bin/env node
/**
 * sync-harbor-to-static.mjs
 *
 * WHY THIS EXISTS: Harbor's GitHub connector publishes into `public/blog/`,
 * but this site deploys from `static/` (Cloudflare Pages project
 * `oracle-tables`, ad-hoc wrangler uploads). `public/` is never deployed, so
 * every Harbor article landed in git and stayed invisible. One article sat
 * there unpublished from 2026-04-01 until it was found on 2026-08-27.
 *
 * Harbor's connector has no branch/path editor in its UI, and repointing it at
 * `static/blog` is worse: Harbor overwrites <path>/index.html with a
 * Harbor-only index, which would replace the 51-post blog index with a 2-post
 * one. So Harbor keeps writing to public/blog and this script moves the
 * ARTICLES ONLY across, then rebuilds the real index and its JSON-LD.
 *
 * Harbor's own index.html / rss.xml in public/blog are deliberately ignored.
 *
 * Usage:
 *   node scripts/sync-harbor-to-static.mjs           # move + reindex
 *   node scripts/sync-harbor-to-static.mjs --check   # exit 1 if out of sync
 */
import { existsSync, mkdirSync, readdirSync, renameSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHECK = process.argv.includes('--check');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'public', 'blog');
const DST = join(root, 'static', 'blog');
// Harbor generates these for its own path; the deployed site builds its own.
const IGNORE = new Set(['index.html', 'rss.xml']);

if (!existsSync(SRC)) {
  console.log('No public/blog/ — nothing for Harbor to hand over.');
  process.exit(0);
}
if (!existsSync(DST)) mkdirSync(DST, { recursive: true });

const pending = readdirSync(SRC).filter(
  (f) => f.endsWith('.html') && !IGNORE.has(f) && !f.endsWith('.bak')
);

if (CHECK) {
  if (pending.length) {
    console.error(`OUT OF SYNC: ${pending.length} Harbor article(s) still in public/blog:`);
    pending.forEach((f) => console.error(`  ${f}`));
    process.exit(1);
  }
  console.log('static/blog is already in sync with Harbor.');
  process.exit(0);
}

if (pending.length === 0) {
  console.log('static/blog is already in sync with Harbor.');
}

for (const f of pending) {
  const dest = join(DST, f);
  if (existsSync(dest)) {
    // Already deployed. The public/blog copy is a stale duplicate — drop it,
    // otherwise --check reports "out of sync" forever.
    unlinkSync(join(SRC, f));
    console.log(`dropped stale duplicate: ${f}`);
    continue;
  }
  renameSync(join(SRC, f), dest);
  console.log(`moved: ${f}`);
}

// Order matters: sync rebuilds the post cards and STRIPS the generated schema
// block; generate-blog-schema then rebuilds that block from the new cards.
// Running sync alone silently drops ~700 lines of JSON-LD.
const run = (script) => {
  console.log(`\n==> ${script}`);
  execFileSync(process.execPath, [join(root, 'scripts', script)], { stdio: 'inherit' });
};
// Reindex UNCONDITIONALLY. This used to sit behind an early `process.exit(0)`
// taken whenever nothing needed moving - and publish.py writes STRAIGHT to
// static/blog, so nothing ever needs moving and the index was never rebuilt.
// Two Harbor articles were found on 2026-08-31 live but unlinked from /blog/,
// reachable only by direct URL.
run('sync-harbor-blog-index.mjs');
run('generate-blog-schema.mjs');

console.log(`\n${pending.length} Harbor article(s) moved; blog index rebuilt.`);
console.log('Deploy with: npx wrangler pages deploy static --project-name=oracle-tables --branch=main');
