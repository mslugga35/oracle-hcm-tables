# Oracle HCM Tables
> Last verified: 2026-04-24

## Project
- **Repo:** `github.com/mslugga35/oracle-hcm-tables` (branch: `master`)
- **Live:** https://hcm-tables.com
- **Stack:** Vanilla HTML/CSS/JS SPA + Vercel static + serverless API
- **Data:** 14,950 tables, 1.2M columns, 9.5MB compact column index

## SPA Features (static/index.html)
- **Module browser:** 28 Oracle HCM module prefixes with table counts, filterable
- **Suffix badges:** _F, _TL, _VL, _M, _V, _ALL, _EO labels on table detail view
- **Related tables:** auto-detect FK relationships from column names (FK_MAP: 16 columns)
- **Join path finder:** generate SQL joins between any two tables with date-effective filters
- **JS data:** MODULE_PREFIXES (28), FK_MAP (16 FK columns), SUFFIX_INFO (7 suffixes)

## Blog Pages (31 total in static/blog/)
| # | File | Topic |
|---|------|-------|
| 1 | oracle-hcm-table-suffixes-explained.html | _F, _TL, _VL suffix guide |
| 2 | per-all-people-f-complete-guide.html | PER_ALL_PEOPLE_F deep dive |
| 3 | top-50-oracle-fusion-hcm-tables.html | Top 50 tables reference |
| 4 | otbi-subject-area-guide.html | 40+ OTBI subject areas + decision tree |
| 5 | fast-formula-examples.html | 10+ working Fast Formula examples |
| 6 | hdl-data-loader-guide.html | HDL .dat templates + troubleshooting |
| 7 | lookup-codes-reference.html | 16+ lookup types with all values |
| 8 | sql-query-library.html | 7 production SQL queries |
| 9 | oracle-absence-management-tables-configuration-guide.html | Absence management tables + SQL |
| 10 | oracle-hcm-rest-api-integration-guide.html | REST API auth, endpoints, examples |
| 11 | oracle-recruiting-cloud-tables-data-model.html | ORC tables + data model |
| 12 | oracle-workforce-compensation-tables-guide.html | Compensation tables + SQL |
| 13 | person-assignment-work-relationship-data-model-explained.html | Core data model explained |
| 14 | obiee-assertion-failure-fix.html | OBIEE/OTBI nQSError fixes |
| 15 | oracle-fusion-payroll-tables-guide.html | PAY_ schema + 8 SQL queries |
| 16 | oracle-hcm-vs-workday-2026.html | Oracle HCM vs Workday enterprise comparison |
| 17 | oracle-hcm-vs-bamboohr.html | Oracle HCM vs BambooHR mid-market comparison |
| 18 | oracle-hcm-alternatives.html | 7 best Oracle HCM alternatives |
| 19 | best-oracle-hcm-training-courses.html | Ranked training courses (Udemy, Pluralsight, Oracle U) |
| 20 | per-all-assignments-f-oracle-24b-migration-guide.html | 24B migration from _F → _M |
| 21 | oracle-hcm-ai-tools-2026.html | AI tools for Oracle HCM in 2026 |
| 22 | hdl-integration-error-debugger.html | HDL 3-table debug chain |
| 23 | oracle-hcm-compliance-audit-sql-queries.html | 8 compliance audit SQL queries |
| 24 | otbi-comma-join-explained.html | OTBI comma join root cause + fix |
| 25 | chatgpt-prompts-oracle-hcm.html | ChatGPT prompts for Oracle HCM |
| 26 | per-all-assignments-m-duplicate-rows-fix.html | PER_ALL_ASSIGNMENTS_M duplicate rows fix |
| 27 | obiee-nqserror-27042-fix.html | nQSError 27042 "At Most One Row" fix |
| 28 | obiee-subquery-joins-otbi.html | OBIEE subquery joins in OTBI |
| 29 | obiee-federation-subject-area-conflicts.html | OBIEE federation subject area conflicts |
| 30 | oracle-hcm-benefits-tables-guide.html | BEN_ schema + enrollment flows + 8 SQL queries |
| 31 | otbi-calculated-fields-guide.html | Calculated fields + 15 real-world expressions |

## Product Pages
- `static/oracle-hcm-consultants.html` — Consultant directory / lead gen (submit project → get quotes)
- `static/otbi-template-pack.html` — OTBI Template Pack ($97 one-time, 15 templates, mailto checkout)
- `static/data-quality-scanner.html` — Data Quality Scanner waitlist ($49/mo planned, 7 SQL checks, email capture via mailto)
- `static/hr-help-desk.html` — HR Help Desk waitlist ($29/mo planned, AI Q&A for Oracle HCM, email capture via mailto)

## Static Legal Pages
- `static/privacy.html` — Privacy Policy (GA4 G-NSN2JWG98H, Plausible, AdSense ca-pub-4971966903803570, Stripe, Vercel)
- `static/terms.html` — Terms of Service

## SEO & Indexing
- **GSC:** Domain property `sc-domain:hcm-tables.com`, sitemap submitted
- **IndexNow key:** `a2gd1hq32vq5pdih55ofmzswg4zmaicd` (static/*.txt)
- **Scripts:** `setup-gsc.py --check` for stats, `submit-indexnow.py` for Bing/Yandex
- **Sitemap:** 55K+ URLs (tables + blog), canonical URLs use clean paths (no .html)

## Gotchas
- vercel.json rewrite must exclude `.txt` for IndexNow key verification
- GSC uses `sc-domain:` format, not `https://` URL prefix
- Sitemap URLs must NOT have .html (canonicals are clean URLs, Vercel serves .html automatically)
- PowerShell `$_` gets eaten by bash — avoid ForEach-Object in bash-invoked PS commands
- Prefix ordering: sort by length DESC to avoid false matches
