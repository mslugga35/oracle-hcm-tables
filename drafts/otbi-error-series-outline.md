# OTBI Error Series — 5-Post Outline
**SEO Target:** Long-tail OTBI error searches (zero competition, high consulting intent)
**Format:** Problem → Root cause → Fix → Prevention
**Revenue angle:** Consultants Google these exact strings when billing $200/hr — they'll pay for a tool that pre-validates

---

## Why This Series Works

Oracle's OTBI error messages are notoriously cryptic. Nobody else owns this content space in depth.
A search for `nQSError 27042` returns Oracle doc fragments and 10-year-old forum posts.
These posts will rank for the exact error strings consultants copy-paste into Google.

---

## Post 1 — nQSError 27042: Subquery Join Error (OTBI)
**Target keyword:** `nQSError 27042`, `OTBI subquery join error`
**File:** `static/blog/obiee-nqserror-27042-subquery-join.html`
**Estimated traffic:** 400–800/mo (3K monthly searches, low competition)

### Outline
- **What it looks like:** `[nQSError: 27042] Subquery in a FROM clause cannot contain join conditions`
- **Root cause:** OTBI's logical SQL layer rejects subqueries that include JOIN inside the subquery
  - OTBI uses a restricted SQL dialect — not the full Oracle SQL parser
  - The error triggers when: (a) you nest a SELECT with a JOIN inside another FROM, or (b) you import SQL from SQL Workshop directly into OTBI without stripping the JOIN syntax
- **Exact fix:** Three patterns — (1) flatten subquery to a WHERE EXISTS, (2) move JOIN to top-level, (3) use OBIEE presentation variable instead of inline subquery
- **Code examples:** Show the broken query and fixed version side by side
- **Prevention:** OTBI SQL syntax rules cheat sheet (comma joins vs. explicit JOINs)
- **Related errors:** nQSError 27002, nQSError 10058
- **CTA:** Link to hcm-tables.com/hr-help-desk

---

## Post 2 — Fast Formula Debugging: FORMULA_ERROR_DEFINITION_NOT_FOUND
**Target keyword:** `Fast Formula FORMULA_ERROR_DEFINITION_NOT_FOUND`, `Oracle payroll formula compilation error`
**File:** `static/blog/fast-formula-debug-definition-not-found.html`
**Estimated traffic:** 300–600/mo

### Outline
- **What it looks like:** Formula compiles but payroll run fails with `FORMULA_ERROR_DEFINITION_NOT_FOUND` + formula name
- **Root cause:** Three common causes:
  1. INPUTS ARE declaration missing a variable that's used in the formula body
  2. Database item name typo — items are case-sensitive in Fast Formula
  3. Formula type mismatch — calling a "Payroll" formula type in an "Absence" context
- **Exact fix:** Step-by-step debugging walkthrough using the Formula Compilation report
- **Database items:** How to find the exact database item name for any HCM table column (via BI Publisher + Schema Explorer)
- **Code examples:** Working formula skeleton with INPUTS/OUTPUTS/DEFAULTS pattern
- **CTA:** Link to hcm-tables.com/hr-help-desk fast formula section

---

## Post 3 — HDL Import: "Worker Assignment Not Found" After Successful Load
**Target keyword:** `HDL Worker Assignment Not Found`, `Oracle HCM HDL import assignment error`
**File:** Already exists (`static/blog/hdl-error-worker-assignment-not-found.html`) — check if this exact angle is covered; if not, create as separate post
**Note:** May be duplicate — verify before creating

### Outline (if new post needed)
- Covers the edge case: HDL reports SUCCESS but downstream processes fail with this error
- Root cause: Race condition between Person create and Assignment create in same HDL batch
- Fix: Split into two HDL files — Person load first, then Assignment in separate run
- Prevention: Sequence validation script to check batch ordering

---

## Post 4 — OTBI: Why Your Report Shows Wrong Date-Effective Data
**Target keyword:** `OTBI date effective wrong results`, `Oracle HCM OTBI point in time report`
**File:** `static/blog/otbi-date-effective-wrong-results.html`
**Estimated traffic:** 500–1000/mo (high — affects everyone)

### Outline
- **The symptom:** Report shows correct headcount for today but wrong numbers when you change the as-of date
- **Root cause:** OTBI date-effective filtering is controlled by prompt variables, not WHERE clause dates
  - When: no date prompt is added, OTBI defaults to SYSDATE silently
  - When: date prompt added but wrong data type used (String vs. Date prompt)
  - When: subject area doesn't support point-in-time (Workforce Management - Current vs. Workforce Management)
- **Fix:** Step-by-step for each cause — adding the date prompt, correct subject area selection, and testing pattern
- **Key insight:** "Workforce Management - Real Time" vs. "Workforce Management" subject area behavior difference
- **Prevention:** Report validation checklist — run at SYSDATE, run at past date, compare counts

---

## Post 5 — nQSError 10058: Column Not Found in Subject Area
**Target keyword:** `nQSError 10058`, `OTBI column not found`
**File:** `static/blog/obiee-nqserror-10058-column-not-found.html`
**Note:** Check if this already exists — memory says PR #5 added two OBIEE nQSError posts
**Action:** Verify, then either update or skip if already covered well

### Outline (if new/needs expansion)
- **What it looks like:** `[nQSError: 10058] A column in the SELECT clause is not present in any FROM table`
- **Root cause:** Four causes:
  1. Column removed or renamed in a newer Oracle release (24B migration broke several)
  2. Subject area version mismatch — report saved against old SA that was updated
  3. Physical column mapped to wrong logical column in RPD (admin issue)
  4. Copying SQL from one subject area to another without verifying column paths
- **Fix per cause:** How to find the current column path for any OTBI column
- **24B migration note:** Specific columns that moved between subject areas in 24A → 24B

---

## Production Order
| # | Post | Est. Traffic | Priority |
|---|------|-------------|----------|
| 1 | nQSError 27042 (subquery) | 400–800/mo | Build first |
| 4 | OTBI date-effective wrong results | 500–1000/mo | Build second |
| 2 | Fast Formula FORMULA_ERROR | 300–600/mo | Build third |
| 5 | nQSError 10058 | 200–400/mo | Verify existing first |
| 3 | HDL Worker Assignment Not Found | 200–500/mo | Verify existing first |

## Notes for Matt
- Posts 3 and 5 may already exist — check `static/blog/` before creating
- Each post should end with a CTA to the Help Desk or Data Quality Scanner
- Target 1,200–2,000 words per post for SEO depth
- Add structured data (`HowTo` schema for the fix steps) to capture featured snippets
