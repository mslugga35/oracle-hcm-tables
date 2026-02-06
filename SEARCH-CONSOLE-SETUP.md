# Search Console Setup — hcm-tables.com

## Google Search Console

1. Go to https://search.google.com/search-console
2. Click **Add property** → **URL prefix** → enter `https://hcm-tables.com`
3. Verify ownership via one of:
   - **DNS TXT record** (recommended) — add TXT record from Google to your domain DNS
   - **HTML file** — download verification file, add to `static/` folder, deploy
   - **HTML meta tag** — add `<meta name="google-site-verification" content="...">` to index.html `<head>`
4. After verification, go to **Sitemaps** → submit: `https://hcm-tables.com/sitemap.xml`
5. Check **Coverage** report after 24-48 hours for indexing status

### What to Monitor
- **Performance** → Check impressions, clicks, and average position
- **Coverage** → Ensure all 14,952 URLs are indexed (or at least discovered)
- **Core Web Vitals** → Check LCP, FID, CLS scores
- **URL Inspection** → Test individual `/table/TABLE_NAME` URLs

## Bing Webmaster Tools

1. Go to https://www.bing.com/webmasters
2. Sign in with Microsoft account
3. **Import from Google Search Console** (fastest) or add site manually
4. If manual: verify via DNS TXT record or meta tag
5. Submit sitemap: `https://hcm-tables.com/sitemap.xml`

### Bing-Specific Features
- **URL Submission API** — can submit new URLs programmatically (up to 10K/day)
- **Site Scan** — built-in SEO audit tool
- **Adaptive URL Submission** — Bing can auto-discover new content faster

## Sitemap Details

- **Location:** `static/sitemap.xml`
- **URLs:** 14,952 (all `/table/TABLE_NAME` routes + homepage)
- **Rebuild:** `node generate-sitemap.js` (if tables change)

## Quick Checklist

- [ ] Google Search Console: property added
- [ ] Google Search Console: ownership verified
- [ ] Google Search Console: sitemap submitted
- [ ] Bing Webmaster Tools: site added
- [ ] Bing Webmaster Tools: sitemap submitted
- [ ] Wait 48-72 hours, check coverage reports
- [ ] Monitor weekly for crawl errors
