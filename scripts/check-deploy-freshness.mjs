#!/usr/bin/env node
/**
 * Is what's live actually what's in git?
 *
 * WHY THIS EXISTS: on 2026-07-30 hcm-tables.com was found serving a build from
 * 2026-05-30 — two months stale, 16 blog posts never public. Nothing alerted,
 * because nothing was broken in the usual sense:
 *
 *   - Vercel auto-deployed from git on every push and SUCCEEDED every time.
 *     It publishes to oracle-hcm-tables.vercel.app, which the domain does not
 *     point at. Green builds, zero effect.
 *   - The live site is a Cloudflare PAGES project (`oracle-tables`) whose
 *     deployments are all `ad_hoc` — manual `wrangler pages deploy`, not
 *     connected to git. Someone stopped running it and no signal existed.
 *
 * A build-status check would have stayed green the whole time. The only
 * question that catches this is "does production match the repo?", so that is
 * what this asks.
 *
 * Also flags the second failure mode found that day: a URL that returns the
 * HOMEPAGE byte-for-byte. Cloudflare Pages serves index.html as an SPA
 * fallback for unknown paths, so a missing post looks like HTTP 200 to any
 * uptime check while reading to search engines as duplicate content.
 *
 * Usage:
 *   node scripts/check-deploy-freshness.mjs
 *   node scripts/check-deploy-freshness.mjs --verbose
 *
 * Exit 0 = live matches git. Exit 1 = drift (or the site is unreachable).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = process.env.SITE_URL || 'https://hcm-tables.com';
const VERBOSE = process.argv.includes('--verbose');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const UA = { 'User-Agent': 'hcm-tables-deploy-check', 'Cache-Control': 'no-cache' };

const slugsFrom = (html) =>
  new Set([...html.matchAll(/href="\/blog\/([^"/]+)"/g)].map((m) => m[1]));

async function fetchText(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

const local = slugsFrom(readFileSync(join(root, 'static/blog/index.html'), 'utf8'));

let liveIndex;
try {
  liveIndex = await fetchText(`${SITE}/blog/`);
} catch (err) {
  console.error(`[DEPLOY] cannot reach ${SITE}/blog/ — ${err.message}`);
  process.exit(1);
}
const live = slugsFrom(liveIndex);

const missing = [...local].filter((s) => !live.has(s)).sort();
const extra = [...live].filter((s) => !local.has(s)).sort();

console.log(`[DEPLOY] blog posts — git: ${local.size}, live: ${live.size}`);

// A post whose URL returns the homepage is live-but-broken. Compare against the
// homepage body rather than trusting the status code: the SPA fallback is a 200.
const home = await fetchText(`${SITE}/`);
const fallback = [];
for (const slug of [...local].filter((s) => live.has(s))) {
  try {
    const body = await fetchText(`${SITE}/blog/${slug}`);
    if (body.length === home.length) fallback.push(slug);
  } catch {
    fallback.push(slug);
  }
}

if (missing.length) {
  console.error(`\n[DEPLOY] ${missing.length} post(s) in git but NOT live — deployment is behind:`);
  missing.forEach((s) => console.error(`   - ${s}`));
}
if (fallback.length) {
  console.error(`\n[DEPLOY] ${fallback.length} live URL(s) serving the HOMEPAGE instead of content:`);
  fallback.forEach((s) => console.error(`   - ${s}`));
}
if (extra.length && VERBOSE) {
  console.log(`\n[DEPLOY] ${extra.length} live post(s) not linked from the repo index:`);
  extra.forEach((s) => console.log(`   - ${s}`));
}

// The blog index is not the whole site. On 2026-07-31 a commit changed the SPA
// (static/index.html) and this script still reported "live matches git",
// because it only ever compared blog posts. Compare the homepage too.
//
// Compare NORMALISED content, not raw bytes: `git show` yields LF while
// `git archive` (what actually gets deployed) writes CRLF, so the same file
// measures 101,113 vs 103,654 bytes. Raw byte comparison would false-alarm on
// every deploy.
// Cloudflare's Email Obfuscation feature rewrites HTML in transit: every
// `mailto:` href becomes `/cdn-cgi/l/email-protection#<hex>` and a decoder
// script is injected. Neither exists in git, so on 2026-08-27 this check
// reported the homepage stale (+303 chars) on a deploy that was demonstrably
// live and correct. Left unfixed it fails on EVERY deploy — and a staleness
// alarm that always fires is one nobody reads, which is the exact failure this
// script exists to catch. Normalise the transform out of both sides.
const stripCfEmail = (s) => s
  .replace(/<script[^>]*\/cdn-cgi\/scripts\/[^<]*<\/script>/g, '')
  // Quote-specific: the mailto body contains a literal apostrophe ("I'd"), so a
  // combined [^"'] class stops early and silently fails to match.
  .replace(/href="\/cdn-cgi\/l\/email-protection#[^"]*"/g, 'href="__EMAIL__"')
  .replace(/href='\/cdn-cgi\/l\/email-protection#[^']*'/g, 'href="__EMAIL__"')
  .replace(/href="mailto:[^"]*"/g, 'href="__EMAIL__"')
  .replace(/href='mailto:[^']*'/g, 'href="__EMAIL__"')
  .replace(/<a[^>]*class="__cf_email__"[^>]*>.*?<\/a>/gs, '__EMAIL__')
  .replace(/\[email&#160;protected\]/g, '__EMAIL__');

const norm = (s) => stripCfEmail(s.replace(/\r/g, ''));
let homeStale = false;
try {
  const gitHome = norm(readFileSync(join(root, 'static/index.html'), 'utf8'));
  if (norm(home) !== gitHome) {
    homeStale = true;
    console.error(
      `\n[DEPLOY] homepage differs from git — static/index.html is not deployed ` +
      `(live ${norm(home).length} chars vs git ${gitHome.length}).`,
    );
  }
} catch (err) {
  console.error(`[DEPLOY] could not compare homepage: ${err.message}`);
}

if (missing.length || fallback.length || homeStale) {
  console.error(
    '\n[DEPLOY] STALE. Publish with:\n' +
    '   npx wrangler pages deploy static --project-name=oracle-tables --branch=main\n' +
    '   (clear CLOUDFLARE_API_TOKEN first — it overrides `wrangler login`)\n' +
    '   Do NOT rely on Vercel: it deploys green to a URL the domain does not use.',
  );
  process.exit(1);
}

console.log('[DEPLOY] live matches git.');
