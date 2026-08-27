#!/usr/bin/env node
/**
 * sync-harbor-blog-index.mjs
 * Scans static/blog/*.html, extracts metadata, generates
 * a unified index.html listing ALL blog posts (Harbor + manual).
 * Runs automatically before build.
 *
 * 🚨 ALWAYS run `generate-blog-schema.mjs` AFTER this script.
 * This one rewrites static/blog/index.html wholesale, which strips the JSON-LD
 * BlogPosting schema the other script injects. Vercel's buildCommand ran this
 * alone until 2026-08-27 and served 0 BlogPosting entries vs 52 on the live
 * Cloudflare Pages site — invisible, because the domain does not point at
 * Vercel. vercel.json now chains both; keep them chained.
 *
 * NOTE: vercel.json rejects unknown top-level keys, so that explanation lives
 * here rather than as a comment beside the buildCommand.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { join, basename } from 'path'

const BLOG_DIR = join(import.meta.dirname, '..', 'static', 'blog')
const OUTPUT = join(BLOG_DIR, 'index.html')
const IGNORE = new Set(['index.html', 'rss.xml'])

function extractMeta(filePath) {
  const html = readFileSync(filePath, 'utf-8')
  const slug = basename(filePath, '.html')

  const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
  let title = titleMatch ? titleMatch[1].replace(/\s*[—|]\s*Oracle HCM Tables\s*$/, '').trim() : slug

  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)
  const description = descMatch ? descMatch[1].slice(0, 200) : ''

  const dateMatch = html.match(/article:published_time"\s+content="([^"]+)"/i)
    || html.match(/<time[^>]+datetime="([^"]+)"/i)
  const dateRaw = dateMatch ? dateMatch[1] : ''
  const date = dateRaw ? dateRaw.split('T')[0] : ''

  const bodyMatch = html.match(/class="blog-article-body"[^>]*>([\s\S]*?)<\/div>/i)
  const bodyText = bodyMatch ? bodyMatch[1].replace(/<[^>]+>/g, '') : html.replace(/<[^>]+>/g, '')
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length

  return { slug, title, description, date, wordCount }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function generateIndex(posts) {
  const cards = posts.map(p => `
      <article class="blog-card">
        <a href="/blog/${p.slug}">
          <div class="blog-card-content">
            <h2>${p.title}</h2>
            <p class="blog-card-meta">${formatDate(p.date)}${p.wordCount ? ` · ${p.wordCount} words` : ''}</p>
            <p class="blog-card-desc">${p.description}</p>
          </div>
        </a>
      </article>`).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog — Oracle HCM Tables</title>
  <meta name="description" content="Oracle HCM guides, SQL queries, OTBI tips, and Fusion Cloud troubleshooting articles from HCM Tables.">
  <meta name="robots" content="index, follow">
  <meta name="theme-color" content="#ff4d3d">
  <link rel="canonical" href="https://hcm-tables.com/blog/">
  <link rel="alternate" type="application/rss+xml" title="Oracle HCM Tables RSS" href="/blog/rss.xml">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://hcm-tables.com/blog/">
  <meta property="og:title" content="Blog — Oracle HCM Tables">
  <meta property="og:description" content="Oracle HCM guides, SQL queries, OTBI tips, and Fusion Cloud troubleshooting articles.">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root{--blog-primary:#ff4d3d;--blog-text:#fcfcfc;--blog-bg:#111317;--blog-header-bg:#1a1d24;--blog-border:#2a2d35;--blog-font:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif}
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:var(--blog-font);line-height:1.7;color:var(--blog-text);background:var(--blog-bg)}
    .blog-container{max-width:720px;margin:0 auto;padding:0 1.5rem}
    .blog-header{background:var(--blog-header-bg);border-bottom:1px solid var(--blog-border);padding:1rem 0;position:sticky;top:0;z-index:10}
    .blog-header .blog-container{display:flex;align-items:center;justify-content:space-between}
    .blog-logo{display:flex;align-items:center;gap:.5rem;text-decoration:none;color:var(--blog-text);font-weight:700;font-size:1.1rem}
    .blog-header nav a{color:#aaa;text-decoration:none;font-size:.9rem;font-weight:500}
    .blog-header nav a:hover{color:var(--blog-text)}
    main{padding:2rem 0 4rem}
    main>h1{font-size:2rem;margin-bottom:.5rem}
    .blog-count{color:#888;margin-bottom:2rem;font-size:.9rem}
    .blog-grid{display:flex;flex-direction:column;gap:1.5rem}
    .blog-card{background:var(--blog-header-bg);border:1px solid var(--blog-border);border-radius:12px;overflow:hidden;transition:box-shadow .2s,border-color .2s}
    .blog-card:hover{box-shadow:0 4px 16px rgba(255,77,61,.15);border-color:var(--blog-primary)}
    .blog-card a{display:block;text-decoration:none;color:inherit}
    .blog-card-content{padding:1.5rem}
    .blog-card h2{font-size:1.15rem;margin-bottom:.5rem;color:var(--blog-text)}
    .blog-card-meta{font-size:.85rem;color:#888;margin-bottom:.5rem}
    .blog-card-desc{font-size:.9rem;color:#aaa;line-height:1.6}
    .blog-footer{border-top:1px solid var(--blog-border);padding:2rem 0;text-align:center;color:#666;font-size:.85rem}
    @media(max-width:640px){.blog-container{padding:0 1rem}main>h1{font-size:1.5rem}}
  </style>
  <script data-harbor-site="nd73gmc88mp5bne64v5dtknkt183736w" src="https://outgoing-oyster-428.convex.site/api/harbor-seo.js?siteId=nd73gmc88mp5bne64v5dtknkt183736w" async></script>
</head>
<body>
  <header class="blog-header">
    <div class="blog-container">
      <a href="/" class="blog-logo">Oracle HCM Tables</a>
      <nav><a href="/">Tables</a></nav>
    </div>
  </header>
  <main class="blog-container">
    <h1>Blog</h1>
    <p class="blog-count">${posts.length} articles</p>
    <div class="blog-grid">
${cards}
    </div>
  </main>
  <footer class="blog-footer">
    <div class="blog-container">
      <p>&copy; ${new Date().getFullYear()} Oracle HCM Tables</p>
    </div>
  </footer>
</body>
</html>
`
}

/**
 * The blog index has always advertised
 *   <link rel="alternate" type="application/rss+xml" href="/blog/rss.xml">
 * but nothing ever generated that file. Cloudflare Pages serves index.html as
 * an SPA fallback, so /blog/rss.xml returned HTTP 200 with the HOMEPAGE body —
 * a feed reader got HTML claiming to be RSS, and no uptime check could see it.
 * Generated here, from the same post list as the index, so the two cannot drift.
 */
const SITE = 'https://hcm-tables.com'

const xmlEscape = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;')

function generateRss(posts) {
  const dated = posts.filter(p => p.date)
  const latest = dated.length ? new Date(dated[0].date + 'T00:00:00Z') : new Date(0)
  const items = posts.map(p => `    <item>
      <title>${xmlEscape(p.title)}</title>
      <link>${SITE}/blog/${xmlEscape(p.slug)}</link>
      <guid isPermaLink="true">${SITE}/blog/${xmlEscape(p.slug)}</guid>
      <description>${xmlEscape(p.description)}</description>${
        p.date ? `\n      <pubDate>${new Date(p.date + 'T00:00:00Z').toUTCString()}</pubDate>` : ''
      }
    </item>`).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Oracle HCM Tables</title>
    <link>${SITE}/blog</link>
    <description>Oracle Fusion Cloud HCM table reference, SQL, OTBI and HDL guides.</description>
    <language>en-us</language>
    <lastBuildDate>${latest.toUTCString()}</lastBuildDate>
    <atom:link href="${SITE}/blog/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`
}

function main() {
  if (!existsSync(BLOG_DIR)) { console.log('No static/blog/'); return }
  const files = readdirSync(BLOG_DIR).filter(f => f.endsWith('.html') && !IGNORE.has(f))
  const posts = []
  for (const file of files) {
    const meta = extractMeta(join(BLOG_DIR, file))
    posts.push(meta)
    console.log(`✅ ${meta.slug} (${meta.date || 'no date'})`)
  }
  posts.sort((a, b) => {
    if (!a.date && !b.date) return a.title.localeCompare(b.title)
    if (!a.date) return 1
    if (!b.date) return -1
    return b.date.localeCompare(a.date)
  })
  writeFileSync(OUTPUT, generateIndex(posts))
  console.log(`\n📝 Generated index.html with ${posts.length} posts`)
  writeFileSync(join(BLOG_DIR, 'rss.xml'), generateRss(posts))
  console.log(`📡 Generated rss.xml with ${posts.length} posts`)
}

main()
