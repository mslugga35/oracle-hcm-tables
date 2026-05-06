# Oracle HCM SQL Gotcha of the Week — LinkedIn Template

## Format (use each week, ~300 words for LinkedIn)

---

**[WEEK N] Oracle HCM SQL Gotcha: [One-line problem statement]**

I see this break reports every week.

**The problem:**

```sql
[broken query or code]
```

[1-2 sentence explanation of WHY this is wrong and what symptom it causes]

**The fix:**

```sql
[corrected query or code]
```

[1-2 sentence explanation of why the fix works]

**Rule to remember:** [One-sentence rule that's copy-pasteable as a principle]

---
Drop a comment if you've been burned by this one. I'll send the full pattern corpus to anyone who DMs me "HCM SQL".

#OracleHCM #OracleFusion #OTBI #SQLTips #OracleConsultant

---

## Weeks 1-12 Plan (rotate categories)

| Week | Category | Gotcha Topic | Pattern ID |
|------|----------|--------------|------------|
| 1 | Effective Dates | TRUNC(SYSDATE) vs SYSDATE — why the date ends at midnight | EDP-001 |
| 2 | PRIMARY_FLAG | Headcount × 3? You forgot primary_flag = 'Y' | PFR-001 |
| 3 | OTBI | Comma join — the silent Cartesian product killer | OTB-001 |
| 4 | Effective Dates | 31-Dec-4712 — what it means and when NOT to use it | EDP-004 |
| 5 | Assignment Model | _F vs _M — Oracle 24B changed the right answer | ASN-001 |
| 6 | OTBI | GROUP BY in Logical SQL — the one rule that trips everyone | OTB-002 |
| 7 | Joins | HR_ALL_ORGANIZATION_UNITS_F is date-effective too | JN-001 |
| 8 | Payroll | action_type = 'R' — what are the other types and when do they matter? | PAY-002 |
| 9 | HDL | Worker assignment not found — the load order matters | HDL-003 |
| 10 | Absence | ANC tables vs. legacy ABS_ tables — which to query | ABS-001 |
| 11 | Fast Formula | NVL everything — NULL arithmetic silently breaks formulas | FF-001 |
| 12 | OTBI | TO_DATE() in Logical SQL — why Oracle rejects it | OTB-004 |

---

## Example (Week 1, filled in)

**[WEEK 1] Oracle HCM SQL Gotcha: SYSDATE vs TRUNC(SYSDATE) in date-effective queries**

I see this break reports every week.

**The problem:**

```sql
WHERE effective_end_date > SYSDATE
```

This misses rows that ended at exactly midnight today. SYSDATE includes hours, minutes, and seconds — so a row with `effective_end_date = 2026-04-11 00:00:00` is excluded when SYSDATE is `2026-04-11 09:32:15`.

**The fix:**

```sql
WHERE TRUNC(SYSDATE) BETWEEN effective_start_date AND effective_end_date
```

TRUNC(SYSDATE) strips the time component to midnight. The BETWEEN pattern is cleaner than separate >= and <= comparisons and handles the boundary rows correctly.

**Rule to remember:** Always `TRUNC(SYSDATE)` in HCM date-effective queries. Never raw `SYSDATE`.

---
Drop a comment if you've been burned by this one. I'll send the full pattern corpus to anyone who DMs me "HCM SQL".

#OracleHCM #OracleFusion #OTBI #SQLTips #OracleConsultant
