# Oracle HCM Tables Search

Fast, searchable database of **35,000+ Oracle Fusion Cloud tables** and **1.2M+ columns**.

**Live:** [hcm-tables.com](https://hcm-tables.com)

## Architecture

```
oracle-hcm-tables/
├── static/                    # DEPLOYED — Vercel serves this folder
│   ├── index.html             # Single-page app (vanilla HTML/CSS/JS)
│   ├── sitemap.xml            # 14,952 URLs for SEO
│   ├── robots.txt             # Crawler directives
│   ├── og-image.svg           # Social sharing image
│   └── data/
│       ├── stats.json         # {tables, views, columns, modules} counts
│       ├── tables.json        # Table search index (~14MB) — [{name, type, module}]
│       ├── columns.json       # Column search index (~9.5MB) — compact format (see below)
│       ├── columns-full.json  # RAW column data (~331MB) — NOT deployed, gitignored
│       └── tables/            # 14,950 individual table detail JSONs
│           ├── PER_ALL_PEOPLE_F.json
│           └── ...
├── web/                       # UNUSED Next.js version (not deployed)
├── scraper.js                 # Scrapes docs.oracle.com → populates oracle_tables.db
├── create-column-index.js     # Rebuilds columns.json from columns-full.json
├── export-json.js             # Exports oracle_tables.db → static/data/ JSON files
├── generate-sitemap.js        # Rebuilds sitemap.xml
├── vercel.json                # Deployment config (SPA rewrite rules, caching headers)
└── oracle_tables.db           # SQLite database (~195MB) — gitignored
```

## Data Pipeline

```
Oracle Docs → scraper.js → oracle_tables.db → export-json.js → static/data/
                                              └→ create-column-index.js → columns.json
```

1. `node scraper.js` — Scrapes Oracle Cloud documentation into SQLite
2. `node export-json.js` — Exports DB to tables.json + individual table JSONs
3. `node create-column-index.js` — Builds compact column search index (331MB → 9.5MB)
4. `node generate-sitemap.js` — Regenerates sitemap.xml

## Column Index Format

The column search index (`columns.json`) uses a compact grouped format to keep browser memory reasonable:

```json
[
  {
    "n": "PERSON_ID",           // column name
    "d": "NUMBER",              // data type (from first occurrence)
    "c": 847,                   // total count across all tables
    "t": ["PER_ALL_PEOPLE_F", "PER_ALL_ASSIGNMENTS_F", ...]  // top 5 tables (sample)
  }
]
```

This reduces 1.2M rows (331MB) to 77K unique names (9.5MB) by grouping and keeping only top 5 tables per column.

## Monetization

- **3 free searches** (tracked via localStorage)
- **Pay-what-you-want** via Stripe ($1.50 minimum)
- After payment, Stripe redirects with `?unlocked=CODE` to auto-unlock
- Unlock codes validated via hash (not stored in plaintext)

## SEO

| Feature | Status |
|---------|--------|
| Sitemap (14,952 URLs) | Done |
| robots.txt | Done |
| Schema.org (WebApplication + FAQPage) | Done |
| Open Graph / Twitter cards | Done |
| Deep links (/table/NAME) | Done |
| Plausible analytics | Done |
| Google Search Console | TODO — submit sitemap |

## Security

- All user-facing data escaped via `escapeHtml()`/`escapeAttr()` before innerHTML injection
- Fetch URLs use `encodeURIComponent()` for table names
- Unlock codes not stored in plaintext (hash-validated client-side)
- Vercel headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection

## Deployment

Static files served from `static/` folder via Vercel. No build step needed.

```bash
# Deploy: just push to main — Vercel auto-deploys
git push origin master
```

## Tech Stack

- Vanilla HTML/CSS/JS (no framework)
- Static JSON data files
- Vercel hosting
- Stripe for payments
- Plausible for analytics

## Future Plans

- [ ] User accounts
- [ ] API access
- [ ] SQL examples for common queries
- [ ] CSV/JSON export from table detail view
