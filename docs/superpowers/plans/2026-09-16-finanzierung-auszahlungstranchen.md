# Finanzierung: Auszahlungstranchen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "one loan, one disbursement date" assumption in the Finanzierung and Steuer tabs with a list of disbursement tranches per property, each with its own date, amount, and tax-deductibility flag — so a staged payout (e.g. a small non-deductible insurance premium tranche followed later by the deductible purchase-price tranche) produces an accurate Restschuld and correctly excludes non-deductible interest from Werbungskosten.

**Architecture:** A new `loan_disbursements` child table (one row per tranche, mirroring the existing `status_entries`/`extraordinary_costs` pattern) feeds a new tranche-aware amortization engine (`stagedAmortizationSchedule`) in `amortizationCalculator.ts`. Every consumer (`propertyFinancing.ts`, `taxCalculator.ts` via `propertyTax.ts`, and — to keep the three tabs' tax-effect numbers consistent — `propertyCashflow.ts`) gets the new data as an **optional, additive parameter**: omitted or empty, behavior is byte-identical to today; provided, it switches to the tranche-aware calculation. This is the same technique already used for `leerstandQuoteOverride` elsewhere in this codebase, and it means none of the ~14 existing tests in `propertyFinancing.test.ts` (or any other existing test) need to change.

**Tech Stack:** Next.js App Router (server components + server actions), Supabase/Postgres, Vitest, react-hook-form.

**Context:** This property's real numbers (used as test fixtures throughout): a Hyposchutz insurance tranche of 2.734,45 € on 2025-10-01 (not tax-deductible), followed by the main purchase-price tranche of 278.665,55 € on 2026-01-20 (deductible), same 4,3 % Zinssatz / 1.242,85 € Rate as today. Validated in a prototype against the real bank statement: the staged model landed within 159,58 € of the real Restschuld (276.275,50 €), vs. 2.741,32 € off for today's single-disbursement model.

---

## File Structure

| File | Responsibility |
|---|---|
| `web/supabase/migrations/20260916120000_loan_disbursements.sql` | New table + RLS + backfill from existing `loan_amount`/`loan_start_date` |
| `web/lib/supabase/types.ts` | Add `loan_disbursements` table types |
| `web/lib/calculations/amortizationCalculator.ts` | New tranche-aware schedule engine (pure functions, no I/O) |
| `web/lib/data/loanDisbursements.ts` | New — maps DB rows to calculation-layer `LoanDisbursement[]` |
| `web/lib/data/propertyFinancing.ts` | Finanzierungstab: Restschuld/Tilgungsplan use the staged engine when tranches exist |
| `web/lib/calculations/taxCalculator.ts` | `annualTaxableIncomeBreakdown` excludes non-deductible-tranche interest |
| `web/lib/data/propertyTax.ts` | Threads tranches into `computeTaxCurrentYear` |
| `web/lib/data/propertyCashflow.ts` | Threads tranches into the two `computeTaxCurrentYear` call sites (keeps Cashflow/Steuer tax-effect numbers consistent, per the existing invariant documented in that file) |
| `web/lib/data/propertyDetail.ts` | Fetches `loan_disbursements` alongside `status_entries`/`extraordinary_costs` |
| `web/lib/data/loanDisbursementActions.ts` | New — create/update/delete server actions |
| `web/components/property/finanzierung/DisbursementModal.tsx` | New — add/edit form (mirrors `StatusEntryModal.tsx`) |
| `web/components/property/finanzierung/DisbursementList.tsx` | New — list + add/edit/delete UI (mirrors `VerlaufFeed.tsx`) |
| `web/components/property/finanzierung/FinanzierungTab.tsx` | Renders `DisbursementList` below the existing overview cards |
| `web/app/(app)/properties/[id]/finanzierung/page.tsx`, `.../cashflow/page.tsx`, `.../steuer/page.tsx` | Pass `detail.loanDisbursements` down |
| `web/components/property/cashflow/CashflowTab.tsx`, `web/components/property/steuer/SteuerTab.tsx` | Accept and forward the new `loanDisbursements` prop |

Out of scope (confirmed not to change): `computeTaxForecastYear`/`taxLineItemsForScenario` (a hypothetical future year — tranche timing from years ago is irrelevant by then), the Cashflow tab's flat `mortgage` cost line, `kpiCalculator.equityUsed`, and the Investitionsrechner.

---

### Task 1: Database migration — `loan_disbursements` table

**Files:**
- Create: `web/supabase/migrations/20260916120000_loan_disbursements.sql`

- [ ] **Step 1: Write the migration**

```sql
create table loan_disbursements (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  date date not null default now(),
  amount double precision not null default 0,
  is_deductible boolean not null default true,
  label text not null default '',
  created_at timestamptz not null default now()
);

alter table loan_disbursements enable row level security;
create policy "loan_disbursements_owner" on loan_disbursements for all using (
  property_id in (select id from properties where user_id = (select auth.uid()))
);

-- Backfill: every property with an existing single-disbursement loan gets one
-- tranche row so computeFinancingOverview/computeTaxCurrentYear see the same
-- data as before — this migration changes no visible numbers by itself.
insert into loan_disbursements (property_id, date, amount, is_deductible, label)
select id, loan_start_date, loan_amount, true, 'Hauptauszahlung'
from properties
where loan_amount > 0;
```

- [ ] **Step 2: Apply the migration locally and verify the backfill**

Run: `cd web && npx supabase db reset` (or `npx supabase migration up` if you don't want to reset local data)

Then check the backfill landed:
```bash
npx supabase db execute --local "select property_id, date, amount, is_deductible, label from loan_disbursements;"
```
Expected: one row per property that has `loan_amount > 0`, `label = 'Hauptauszahlung'`, `is_deductible = true`.

- [ ] **Step 3: Commit**

```bash
git add web/supabase/migrations/20260916120000_loan_disbursements.sql
git commit -m "feat(db): add loan_disbursements table for staged loan payouts"
```

---

### Task 2: Supabase TypeScript types

**Files:**
- Modify: `web/lib/supabase/types.ts`

- [ ] **Step 1: Add the `loan_disbursements` table type**

Find the `status_entries: { ... }` block inside `Database['public']['Tables']` and add this new block immediately after it (alphabetically it sits between `investment_calculations` and `properties`, but adding it next to `status_entries` is fine — the type map doesn't care about key order):

```ts
      loan_disbursements: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          is_deductible: boolean
          label: string
          property_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          is_deductible?: boolean
          label?: string
          property_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          is_deductible?: boolean
          label?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_disbursements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
```

- [ ] **Step 2: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add web/lib/supabase/types.ts
git commit -m "chore(types): add loan_disbursements table types"
```

---

### Task 3: `amortizationCalculator.ts` — staged schedule engine

**Files:**
- Modify: `web/lib/calculations/amortizationCalculator.ts`
- Test: `web/tests/calculations/amortizationCalculator.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to the bottom of `web/tests/calculations/amortizationCalculator.test.ts` (the existing `import { fixtures as f } from './fixtures'` and `import { makeDate } from '@/lib/calculations/dateHelpers'` at the top already cover what's needed — add `stagedAmortizationSchedule`, `stagedInterestForCalendarYear`, `toAnnuityRows` to the existing named import from `@/lib/calculations/amortizationCalculator`):

```ts
describe('amortizationCalculator.stagedAmortizationSchedule', () => {
  const disbursements = [
    { date: makeDate(2025, 10, 1), amount: 2_734.45, deductible: false },
    { date: makeDate(2026, 1, 20), amount: 278_665.55, deductible: true },
  ];
  const rate = 0.043;
  const payment = 1_242.85;

  it('first month reflects only the tranche that has landed, not the combined total', () => {
    const schedule = stagedAmortizationSchedule(disbursements, rate, payment, 1);
    expect(schedule).toHaveLength(1);
    // interest: 2734.45 * 0.043/12 = 9.80, principal: 1242.85 - 9.80 = 1233.05
    expect(schedule[0].interestTotal).toBeCloseTo(9.80, 1);
    expect(schedule[0].remainingDebtTotal).toBeCloseTo(1_501.40, 1);
    expect(schedule[0].remainingDebtDeductible).toBe(0);
  });

  it('balance jumps up when the second tranche lands', () => {
    // months: Oct25, Nov25, Dec25, Jan26 -> the small tranche is fully repaid
    // by Dec25, then the main tranche lands in month 4 (Jan26)
    const schedule = stagedAmortizationSchedule(disbursements, rate, payment, 4);
    expect(schedule[2].remainingDebtTotal).toBeCloseTo(0, 1);
    expect(schedule[3].remainingDebtDeductible).toBeGreaterThan(278_000);
  });

  it('non-deductible balance never goes negative and stays at 0 once repaid', () => {
    const schedule = stagedAmortizationSchedule(disbursements, rate, payment, 24);
    for (const row of schedule.slice(3)) {
      expect(row.remainingDebtNonDeductible).toBe(0);
      expect(row.interestNonDeductible).toBe(0);
    }
  });

  it('empty disbursements produce an empty schedule', () => {
    expect(stagedAmortizationSchedule([], rate, payment, 12)).toEqual([]);
  });
});

describe('amortizationCalculator.stagedInterestForCalendarYear', () => {
  const disbursements = [
    { date: makeDate(2025, 10, 1), amount: 2_734.45, deductible: false },
    { date: makeDate(2026, 1, 20), amount: 278_665.55, deductible: true },
  ];
  const rate = 0.043;
  const payment = 1_242.85;

  it('2026: the non-deductible tranche is already fully repaid, so nonDeductible is 0', () => {
    const result = stagedInterestForCalendarYear(2026, disbursements, rate, payment);
    expect(result.nonDeductible).toBe(0);
    expect(result.deductible).toBeGreaterThan(11_000);
    expect(result.deductible).toBeLessThan(12_500);
    expect(result.total).toBeCloseTo(result.deductible + result.nonDeductible, 5);
  });

  it('2025: interest is entirely non-deductible (only the small tranche has landed)', () => {
    const result = stagedInterestForCalendarYear(2025, disbursements, rate, payment);
    expect(result.deductible).toBe(0);
    expect(result.nonDeductible).toBeGreaterThan(0);
  });
});

describe('amortizationCalculator.toAnnuityRows', () => {
  it('maps a StagedAnnuityRow[] down to plain AnnuityRow[]', () => {
    const staged = stagedAmortizationSchedule(
      [{ date: makeDate(2026, 1, 1), amount: 100_000, deductible: true }],
      0.04,
      500,
      2
    );
    const rows = toAnnuityRows(staged);
    expect(rows[0].interest).toBe(staged[0].interestTotal);
    expect(rows[0].principal).toBe(staged[0].principalTotal);
    expect(rows[0].payment).toBeCloseTo(staged[0].interestTotal + staged[0].principalTotal, 5);
    expect(rows[0].remainingDebt).toBe(staged[0].remainingDebtTotal);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `cd web && npx vitest run tests/calculations/amortizationCalculator.test.ts`
Expected: FAIL — `stagedAmortizationSchedule is not defined` (or similar import error).

- [ ] **Step 3: Implement**

Add to `web/lib/calculations/amortizationCalculator.ts` (it already imports `addMonths, yearOf, monthsBetween, makeDate` from `./dateHelpers` — add `monthOf` to that import list):

```ts
import { addMonths, yearOf, monthOf, monthsBetween, makeDate } from './dateHelpers';
```

Then append these new exports to the end of the file:

```ts
export interface LoanDisbursement {
  date: Date;
  amount: number;
  deductible: boolean;
}

export interface StagedAnnuityRow {
  month: number;
  date: Date;
  interestTotal: number;
  interestDeductible: number;
  interestNonDeductible: number;
  principalTotal: number;
  remainingDebtTotal: number;
  remainingDebtDeductible: number;
  remainingDebtNonDeductible: number;
}

/**
 * Like amortizationSchedule, but the balance builds up from a list of
 * disbursements instead of being fully outstanding from day one — for a loan
 * paid out in stages (e.g. a small insurance-premium tranche before the main
 * purchase-price tranche). Interest is computed per tranche against its own
 * outstanding balance (so a non-deductible tranche's interest stays isolated);
 * the fixed monthlyPayment's principal portion is then split across tranches
 * in proportion to their current balance share — the same split the
 * "Auszahlungstranchen" prototype validated against the real bank statement.
 * Disbursements are bucketed by calendar month (not day-exact), matching the
 * rest of this app's month-granularity financing model.
 */
export function stagedAmortizationSchedule(
  disbursements: LoanDisbursement[],
  interestRate: number,
  monthlyPayment: number,
  months: number
): StagedAnnuityRow[] {
  if (disbursements.length === 0 || months <= 0) return [];

  const sorted = [...disbursements].sort((a, b) => a.date.getTime() - b.date.getTime());
  const start = sorted[0].date;
  const r = interestRate / 12;
  let outDeductible = 0;
  let outNonDeductible = 0;
  const rows: StagedAnnuityRow[] = [];

  for (let t = 0; t < months; t++) {
    const date = addMonths(start, t);
    for (const d of sorted) {
      if (yearOf(d.date) === yearOf(date) && monthOf(d.date) === monthOf(date)) {
        if (d.deductible) outDeductible += d.amount;
        else outNonDeductible += d.amount;
      }
    }

    const total = outDeductible + outNonDeductible;
    if (total <= 0.005) {
      rows.push({
        month: t + 1,
        date,
        interestTotal: 0,
        interestDeductible: 0,
        interestNonDeductible: 0,
        principalTotal: 0,
        remainingDebtTotal: Math.max(0, total),
        remainingDebtDeductible: outDeductible,
        remainingDebtNonDeductible: outNonDeductible,
      });
      continue;
    }

    const interestDeductible = outDeductible * r;
    const interestNonDeductible = outNonDeductible * r;
    const interestTotal = interestDeductible + interestNonDeductible;
    const principalTotal = Math.max(0, Math.min(monthlyPayment - interestTotal, total));
    const deductibleShare = outDeductible / total;
    const principalDeductible = principalTotal * deductibleShare;
    const principalNonDeductible = principalTotal - principalDeductible;

    outDeductible = Math.max(0, outDeductible - principalDeductible);
    outNonDeductible = Math.max(0, outNonDeductible - principalNonDeductible);

    rows.push({
      month: t + 1,
      date,
      interestTotal,
      interestDeductible,
      interestNonDeductible,
      principalTotal,
      remainingDebtTotal: outDeductible + outNonDeductible,
      remainingDebtDeductible: outDeductible,
      remainingDebtNonDeductible: outNonDeductible,
    });
  }

  return rows;
}

export interface StagedInterestForYear {
  total: number;
  deductible: number;
  nonDeductible: number;
}

/** Mirrors interestForCalendarYear, but split by deductibility — feeds taxCalculator's Werbungskosten line. */
export function stagedInterestForCalendarYear(
  year: number,
  disbursements: LoanDisbursement[],
  interestRate: number,
  monthlyPayment: number
): StagedInterestForYear {
  const ZERO = { total: 0, deductible: 0, nonDeductible: 0 };
  if (disbursements.length === 0 || interestRate <= 0 || monthlyPayment <= 0) return ZERO;

  const sorted = [...disbursements].sort((a, b) => a.date.getTime() - b.date.getTime());
  const start = sorted[0].date;
  if (yearOf(start) > year) return ZERO;

  const yearEnd = makeDate(year, 12, 31);
  const totalMonths = monthsBetween(start, yearEnd);
  if (totalMonths <= 0) return ZERO;

  const schedule = stagedAmortizationSchedule(sorted, interestRate, monthlyPayment, totalMonths);
  return schedule
    .filter((row) => yearOf(row.date) === year)
    .reduce(
      (acc, row) => ({
        total: acc.total + row.interestTotal,
        deductible: acc.deductible + row.interestDeductible,
        nonDeductible: acc.nonDeductible + row.interestNonDeductible,
      }),
      ZERO
    );
}

/** Downcasts a StagedAnnuityRow[] to plain AnnuityRow[] so groupAmortizationScheduleByYear/trimAmortizationScheduleToPayoff (which only know the simple shape) can be reused unchanged. */
export function toAnnuityRows(rows: StagedAnnuityRow[]): AnnuityRow[] {
  return rows.map((r) => ({
    month: r.month,
    date: r.date,
    interest: r.interestTotal,
    principal: r.principalTotal,
    payment: r.interestTotal + r.principalTotal,
    remainingDebt: r.remainingDebtTotal,
  }));
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `cd web && npx vitest run tests/calculations/amortizationCalculator.test.ts`
Expected: PASS (all tests, including the pre-existing ones above your new `describe` blocks).

- [ ] **Step 5: Commit**

```bash
git add web/lib/calculations/amortizationCalculator.ts web/tests/calculations/amortizationCalculator.test.ts
git commit -m "feat(calculations): add tranche-aware staged amortization schedule"
```

---

### Task 4: `loanDisbursements.ts` — DB row mapper

**Files:**
- Create: `web/lib/data/loanDisbursements.ts`
- Test: `web/tests/data/loanDisbursements.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { toLoanDisbursements } from '@/lib/data/loanDisbursements';
import type { Database } from '@/lib/supabase/types';

type LoanDisbursementRow = Database['public']['Tables']['loan_disbursements']['Row'];

function makeRow(overrides: Partial<LoanDisbursementRow> = {}): LoanDisbursementRow {
  return {
    id: 'disb-1',
    property_id: 'prop-1',
    date: '2026-01-20',
    amount: 278_665.55,
    is_deductible: true,
    label: 'Hauptauszahlung',
    created_at: '2026-01-20T00:00:00Z',
    ...overrides,
  };
}

describe('toLoanDisbursements', () => {
  it('maps date/amount/is_deductible to the calculation-layer shape', () => {
    const [result] = toLoanDisbursements([makeRow()]);
    expect(result.date.toISOString().slice(0, 10)).toBe('2026-01-20');
    expect(result.amount).toBe(278_665.55);
    expect(result.deductible).toBe(true);
  });

  it('maps is_deductible: false to deductible: false', () => {
    const [result] = toLoanDisbursements([makeRow({ is_deductible: false })]);
    expect(result.deductible).toBe(false);
  });

  it('empty input maps to empty output', () => {
    expect(toLoanDisbursements([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `cd web && npx vitest run tests/data/loanDisbursements.test.ts`
Expected: FAIL — module `@/lib/data/loanDisbursements` not found.

- [ ] **Step 3: Implement**

```ts
import type { Database } from '@/lib/supabase/types';
import type { LoanDisbursement } from '@/lib/calculations/amortizationCalculator';

export type LoanDisbursementRow = Database['public']['Tables']['loan_disbursements']['Row'];

/** Maps DB rows (string date, is_deductible) to the calculation layer's LoanDisbursement[] (Date, deductible). */
export function toLoanDisbursements(rows: LoanDisbursementRow[]): LoanDisbursement[] {
  return rows.map((row) => ({
    date: new Date(row.date + 'T00:00:00Z'),
    amount: row.amount,
    deductible: row.is_deductible,
  }));
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `cd web && npx vitest run tests/data/loanDisbursements.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/data/loanDisbursements.ts web/tests/data/loanDisbursements.test.ts
git commit -m "feat(data): add loan_disbursements row-to-calculation mapper"
```

---

### Task 5: `propertyFinancing.ts` — Finanzierungstab uses the staged engine

**Files:**
- Modify: `web/lib/data/propertyFinancing.ts`
- Test: `web/tests/data/propertyFinancing.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `web/tests/data/propertyFinancing.test.ts` (it already has a `makeProperty` helper and imports `fixtures as f`, `makeDate`; add this new `describe` block at the end, and add `import type { Database } from '@/lib/supabase/types';` if not already present under a `LoanDisbursementRow` alias — the file already imports `Database`, so just add the type alias inline):

```ts
describe('computeFinancingOverview with staged disbursements', () => {
  type LoanDisbursementRow = Database['public']['Tables']['loan_disbursements']['Row'];
  function makeDisbursement(overrides: Partial<LoanDisbursementRow> = {}): LoanDisbursementRow {
    return {
      id: 'd1',
      property_id: 'prop-1',
      date: '2025-10-01',
      amount: 2_734.45,
      is_deductible: false,
      label: 'Hyposchutz',
      created_at: '2025-10-01T00:00:00Z',
      ...overrides,
    };
  }

  it('empty disbursementRows falls back to today\'s single-loan behavior (byte-identical)', () => {
    const property = makeProperty({ loan_amount: f.loanAmount, loan_start_date: '2025-12-01' });
    const withoutRows = computeFinancingOverview(property, makeDate(2026, 6, 1));
    const withEmptyRows = computeFinancingOverview(property, makeDate(2026, 6, 1), []);
    expect(withEmptyRows).toEqual(withoutRows);
  });

  it('with tranches, remainingDebtNow reflects the staged payout instead of a single day-one disbursement', () => {
    const property = makeProperty({
      loan_amount: 281_400,
      loan_start_date: '2025-12-01',
      interest_rate: 0.043,
      amortization_rate: 0.01,
      monthly_mortgage: 1_242.85,
    });
    const disbursements = [
      makeDisbursement(),
      makeDisbursement({ id: 'd2', date: '2026-01-20', amount: 278_665.55, is_deductible: true, label: 'Hauptauszahlung' }),
    ];
    const staged = computeFinancingOverview(property, makeDate(2026, 9, 16), disbursements);
    const naive = computeFinancingOverview(property, makeDate(2026, 9, 16));
    if (!staged.hasFinancing || !naive.hasFinancing) throw new Error('expected hasFinancing: true');
    // the staged model must show a LOWER remaining debt than the naive one —
    // it credits the extra early paydown that happened while only the small
    // tranche was outstanding (validated against the real bank statement:
    // staged landed within ~160 EUR of the real 276,275.50 EUR balance).
    expect(staged.remainingDebtNow).toBeLessThan(naive.remainingDebtNow);
    expect(staged.remainingDebtNow).toBeCloseTo(276_435, -2);
  });
});

describe('computeAmortizationYearTable with staged disbursements', () => {
  type LoanDisbursementRow = Database['public']['Tables']['loan_disbursements']['Row'];
  function makeDisbursement(overrides: Partial<LoanDisbursementRow> = {}): LoanDisbursementRow {
    return {
      id: 'd1',
      property_id: 'prop-1',
      date: '2025-10-01',
      amount: 2_734.45,
      is_deductible: false,
      label: 'Hyposchutz',
      created_at: '2025-10-01T00:00:00Z',
      ...overrides,
    };
  }

  it('empty disbursementRows falls back to the existing behavior', () => {
    const property = makeProperty({ loan_amount: f.loanAmount, loan_start_date: '2025-12-01' });
    const withoutRows = computeAmortizationYearTable(property, makeDate(2026, 6, 1));
    const withEmptyRows = computeAmortizationYearTable(property, makeDate(2026, 6, 1), []);
    expect(withEmptyRows).toEqual(withoutRows);
  });

  it('with tranches, the year table starts at the earliest tranche date, not loan_start_date', () => {
    const property = makeProperty({
      loan_amount: 281_400,
      loan_start_date: '2025-12-01',
      interest_rate: 0.043,
      amortization_rate: 0.01,
      monthly_mortgage: 1_242.85,
    });
    const disbursements = [
      makeDisbursement(),
      makeDisbursement({ id: 'd2', date: '2026-01-20', amount: 278_665.55, is_deductible: true, label: 'Hauptauszahlung' }),
    ];
    const result = computeAmortizationYearTable(property, makeDate(2026, 9, 16), disbursements);
    expect(result.hasFinancing).toBe(true);
    expect(result.rows[0].year).toBe(2025);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `cd web && npx vitest run tests/data/propertyFinancing.test.ts`
Expected: FAIL — `computeFinancingOverview` called with 3 arguments doesn't match its current 2-argument signature (TS error) / or a wrong-value assertion failure once it compiles loosely.

- [ ] **Step 3: Implement**

Replace the full contents of `web/lib/data/propertyFinancing.ts` with:

```ts
import type { Database } from '@/lib/supabase/types';
import { addMonths, monthsBetween, yearOf } from '@/lib/calculations/dateHelpers';
import {
  remainingDebt,
  amortizationSchedule,
  groupAmortizationScheduleByYear,
  trimAmortizationScheduleToPayoff,
  stagedAmortizationSchedule,
  toAnnuityRows,
  type YearlyAmortizationRow,
} from '@/lib/calculations/amortizationCalculator';
import { toLoanDisbursements, type LoanDisbursementRow } from '@/lib/data/loanDisbursements';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

export type FinancingOverviewResult =
  | { hasFinancing: false }
  | {
      hasFinancing: true;
      loanAmount: number;
      remainingDebtNow: number;
      monthlyMortgage: number;
      interestRate: number;
      amortizationRate: number;
      fixedRateEndDate: Date;
      yearsRemainingUntilFixedRateEnd: number;
      remainingDebtAtFixedRateEnd: number;
    };

/**
 * Finanzierung tab Section 1 (Finanzierungsübersicht).
 *
 * `disbursementRows` is optional and additive: omitted or empty, this is
 * byte-identical to the original single-disbursement calculation (remainingDebt
 * off loan_start_date/loan_amount). When tranches are present, remaining debt
 * is read off stagedAmortizationSchedule instead, which credits the balance
 * building up in steps rather than being fully outstanding from day one.
 */
export function computeFinancingOverview(
  property: PropertyRow,
  today: Date = new Date(),
  disbursementRows: LoanDisbursementRow[] = []
): FinancingOverviewResult {
  if (property.loan_amount <= 0) return { hasFinancing: false };

  const loanStartDate = new Date(property.loan_start_date + 'T00:00:00Z');
  const fixedRateEndDate = addMonths(loanStartDate, property.fixed_interest_period_years * 12);
  const monthsUntilFixedRateEnd = monthsBetween(today, fixedRateEndDate) - 1;

  let remainingDebtNow: number;
  let remainingDebtAtFixedRateEnd: number;

  if (disbursementRows.length > 0) {
    const disbursements = toLoanDisbursements(disbursementRows);
    const sortedStart = [...disbursements].sort((a, b) => a.date.getTime() - b.date.getTime())[0].date;
    // Matches remainingDebt's own t-convention (t=0 -> no payment applied yet):
    // one full calendar month must have elapsed since the first tranche before
    // a payment has landed, hence the same "-1". Clamped to at least 1 so the
    // very first month (before month-end) still shows a sensible value instead
    // of an empty schedule.
    const monthsToToday = Math.max(1, monthsBetween(sortedStart, today) - 1);
    const monthsToFixedRateEnd = Math.max(1, monthsBetween(sortedStart, fixedRateEndDate) - 1);
    const schedule = stagedAmortizationSchedule(
      disbursements,
      property.interest_rate,
      property.monthly_mortgage,
      Math.max(monthsToToday, monthsToFixedRateEnd)
    );
    remainingDebtNow = schedule[monthsToToday - 1]?.remainingDebtTotal ?? 0;
    remainingDebtAtFixedRateEnd = schedule[monthsToFixedRateEnd - 1]?.remainingDebtTotal ?? 0;
  } else {
    const monthsSinceLoanStart = monthsBetween(loanStartDate, today) - 1;
    remainingDebtNow = remainingDebt(property.loan_amount, property.interest_rate, property.monthly_mortgage, Math.max(0, monthsSinceLoanStart));
    const monthsFromStartToFixedRateEnd = monthsBetween(loanStartDate, fixedRateEndDate) - 1;
    remainingDebtAtFixedRateEnd = remainingDebt(
      property.loan_amount,
      property.interest_rate,
      property.monthly_mortgage,
      Math.max(0, monthsFromStartToFixedRateEnd)
    );
  }

  return {
    hasFinancing: true,
    loanAmount: property.loan_amount,
    remainingDebtNow,
    monthlyMortgage: property.monthly_mortgage,
    interestRate: property.interest_rate,
    amortizationRate: property.amortization_rate,
    fixedRateEndDate,
    yearsRemainingUntilFixedRateEnd: Math.max(0, Math.floor(monthsUntilFixedRateEnd / 12)),
    remainingDebtAtFixedRateEnd,
  };
}

const MAX_AMORTIZATION_HORIZON_YEARS = 40;

export type AmortizationYearRow = YearlyAmortizationRow & {
  isCurrentYear: boolean;
  isFixedRateEndYear: boolean;
  isPostFixedRatePeriod: boolean;
};

export type AmortizationYearTableResult =
  | { hasFinancing: false; rows: AmortizationYearRow[]; fixedRateEndYear: null }
  | { hasFinancing: true; rows: AmortizationYearRow[]; fixedRateEndYear: number };

/**
 * Finanzierung tab Section 2 (Tilgungsplan) — a yearly table spanning the
 * full schedule from loanStartDate (or, with tranches, the earliest
 * disbursement) to payoff, capped at MAX_AMORTIZATION_HORIZON_YEARS.
 *
 * `disbursementRows` is optional and additive, same contract as
 * computeFinancingOverview above.
 */
export function computeAmortizationYearTable(
  property: PropertyRow,
  today: Date = new Date(),
  disbursementRows: LoanDisbursementRow[] = []
): AmortizationYearTableResult {
  if (property.loan_amount <= 0) return { hasFinancing: false, rows: [], fixedRateEndYear: null };

  const loanStartDate = new Date(property.loan_start_date + 'T00:00:00Z');
  const fixedRateEndDate = addMonths(loanStartDate, property.fixed_interest_period_years * 12);

  let trimmedSchedule;
  let scheduleLoanAmount = property.loan_amount;

  if (disbursementRows.length > 0) {
    const disbursements = toLoanDisbursements(disbursementRows);
    const stagedFull = stagedAmortizationSchedule(
      disbursements,
      property.interest_rate,
      property.monthly_mortgage,
      MAX_AMORTIZATION_HORIZON_YEARS * 12
    );
    trimmedSchedule = trimAmortizationScheduleToPayoff(toAnnuityRows(stagedFull));
    scheduleLoanAmount = disbursements.reduce((sum, d) => sum + d.amount, 0);
  } else {
    const fullSchedule = amortizationSchedule(
      property.loan_amount,
      property.interest_rate,
      property.monthly_mortgage,
      loanStartDate,
      MAX_AMORTIZATION_HORIZON_YEARS * 12
    );
    trimmedSchedule = trimAmortizationScheduleToPayoff(fullSchedule);
  }

  const yearRows = groupAmortizationScheduleByYear(trimmedSchedule, scheduleLoanAmount);

  const fixedRateEndYear = yearOf(fixedRateEndDate);
  const currentYear = today.getUTCFullYear();

  const rows: AmortizationYearRow[] = yearRows.map((row) => ({
    ...row,
    isCurrentYear: row.year === currentYear,
    isFixedRateEndYear: row.year === fixedRateEndYear,
    isPostFixedRatePeriod: row.year > fixedRateEndYear,
  }));

  return { hasFinancing: true, rows, fixedRateEndYear };
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `cd web && npx vitest run tests/data/propertyFinancing.test.ts`
Expected: PASS (all 14 pre-existing tests plus the new ones — the `remainingDebtNow).toBeCloseTo(276_435, -2)` assertion checks to the nearest hundred, matching the prototype's validated figure).

- [ ] **Step 5: Commit**

```bash
git add web/lib/data/propertyFinancing.ts web/tests/data/propertyFinancing.test.ts
git commit -m "feat(finanzierung): use staged disbursement schedule when tranches exist"
```

---

### Task 6: `taxCalculator.ts` — exclude non-deductible tranche interest

**Files:**
- Modify: `web/lib/calculations/taxCalculator.ts`
- Test: `web/tests/calculations/taxCalculator.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `web/tests/calculations/taxCalculator.test.ts`, inside (or right after) the existing `describe('taxCalculator.annualTaxableIncomeBreakdown', ...)` block — it already has a `baseInput` object built from `f.loanStartDate`/`f.loanAmount` at the top of the file (per the existing lines 12-13); this test builds its own input instead of reusing `baseInput`, so nothing existing needs touching:

```ts
it('disbursements: excludes non-deductible-tranche interest from taxableIncome', () => {
  const disbursements = [
    { date: makeDate(2025, 10, 1), amount: 2_734.45, deductible: false },
    { date: makeDate(2026, 1, 20), amount: 278_665.55, deductible: true },
  ];
  const withoutDisbursements = annualTaxableIncomeBreakdown({
    year: 2026,
    statusHistory: [{ date: makeDate(2026, 1, 1), status: 'vermietet', incomeActualMonthly: null }],
    stellplatzStatusHistory: [],
    economicTransferDate: makeDate(2026, 1, 1),
    loanStartDate: makeDate(2025, 12, 1),
    loanAmount: 281_400,
    interestRate: 0.043,
    monthlyMortgage: 1_242.85,
    afaBasis: 0,
    depreciationRate: 0.02,
    hoaUnitNonRecoverableMonthly: 0,
    hoaUnitRecoverableMonthly: 0,
    hoaParkingNonRecoverableMonthly: 0,
    hoaParkingRecoverableMonthly: 0,
    propertyTaxUnitMonthly: 0,
    propertyTaxParkingMonthly: 0,
    propertyManagementMonthly: 0,
    propertyInsuranceMonthly: 0,
    otherCostsMonthly: 0,
    coldRentMonthly: 999,
    parkingRentMonthly: 0,
    otherIncomeMonthly: 0,
    today: makeDate(2026, 9, 16),
    extraordinaryCostsDeductibleYearly: 0,
  });
  const withDisbursements = annualTaxableIncomeBreakdown({
    year: 2026,
    statusHistory: [{ date: makeDate(2026, 1, 1), status: 'vermietet', incomeActualMonthly: null }],
    stellplatzStatusHistory: [],
    economicTransferDate: makeDate(2026, 1, 1),
    loanStartDate: makeDate(2025, 12, 1),
    loanAmount: 281_400,
    interestRate: 0.043,
    monthlyMortgage: 1_242.85,
    afaBasis: 0,
    depreciationRate: 0.02,
    hoaUnitNonRecoverableMonthly: 0,
    hoaUnitRecoverableMonthly: 0,
    hoaParkingNonRecoverableMonthly: 0,
    hoaParkingRecoverableMonthly: 0,
    propertyTaxUnitMonthly: 0,
    propertyTaxParkingMonthly: 0,
    propertyManagementMonthly: 0,
    propertyInsuranceMonthly: 0,
    otherCostsMonthly: 0,
    coldRentMonthly: 999,
    parkingRentMonthly: 0,
    otherIncomeMonthly: 0,
    today: makeDate(2026, 9, 16),
    extraordinaryCostsDeductibleYearly: 0,
    disbursements,
  });
  // less interest deducted -> HIGHER taxableIncome (less of a loss)
  expect(withDisbursements.taxableIncome).toBeGreaterThan(withoutDisbursements.taxableIncome);
  expect(withDisbursements.interest).toBeLessThan(withoutDisbursements.interest);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `cd web && npx vitest run tests/calculations/taxCalculator.test.ts`
Expected: FAIL — TS error, `disbursements` does not exist on type `AnnualTaxableIncomeBreakdownInput`.

- [ ] **Step 3: Implement**

In `web/lib/calculations/taxCalculator.ts`:

1. Update the import at the top:
```ts
import { interestForCalendarYear, stagedInterestForCalendarYear } from './amortizationCalculator';
import type { LoanDisbursement } from './amortizationCalculator';
```
(replacing the existing `import { interestForCalendarYear } from './amortizationCalculator';`)

2. Add an optional field to `AnnualTaxableIncomeInput` (right after `loanStartDate: Date;`):
```ts
export interface AnnualTaxableIncomeInput {
  year: number;
  statusHistory: StatusEntry[];
  economicTransferDate: Date;
  loanStartDate: Date;
  /** Optional and additive: when provided (non-empty), interest is computed per-tranche via stagedInterestForCalendarYear and only the deductible portion is deducted — loanStartDate/loanAmount are ignored for the interest line in that case, but stay required for the (unchanged) non-tranche fallback. */
  disbursements?: LoanDisbursement[];
  loanAmount: number;
  // ...rest unchanged
```

3. In `annualTaxableIncomeBreakdown`, replace:
```ts
  const interestYear = interestForCalendarYear(
    input.year,
    input.loanStartDate,
    input.loanAmount,
    input.interestRate,
    input.monthlyMortgage
  );
```
with:
```ts
  const interestYear =
    input.disbursements && input.disbursements.length > 0
      ? stagedInterestForCalendarYear(input.year, input.disbursements, input.interestRate, input.monthlyMortgage).deductible
      : interestForCalendarYear(input.year, input.loanStartDate, input.loanAmount, input.interestRate, input.monthlyMortgage);
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `cd web && npx vitest run tests/calculations/taxCalculator.test.ts`
Expected: PASS (all pre-existing tests unaffected, since none of them set `disbursements`).

- [ ] **Step 5: Commit**

```bash
git add web/lib/calculations/taxCalculator.ts web/tests/calculations/taxCalculator.test.ts
git commit -m "feat(steuer): exclude non-deductible loan tranches from Werbungskosten-Zinsen"
```

---

### Task 7: `propertyTax.ts` — thread disbursements into `computeTaxCurrentYear`

**Files:**
- Modify: `web/lib/data/propertyTax.ts`
- Test: `web/tests/data/propertyTax.test.ts`

- [ ] **Step 1: Write the failing test**

Check `web/tests/data/propertyTax.test.ts` for its existing `makeProperty`/fixture helpers (mirror `propertyFinancing.test.ts`'s pattern read in Task 5) and add:

```ts
describe('computeTaxCurrentYear with disbursementRows', () => {
  type LoanDisbursementRow = Database['public']['Tables']['loan_disbursements']['Row'];
  function makeDisbursement(overrides: Partial<LoanDisbursementRow> = {}): LoanDisbursementRow {
    return {
      id: 'd1',
      property_id: 'prop-1',
      date: '2025-10-01',
      amount: 2_734.45,
      is_deductible: false,
      label: 'Hyposchutz',
      created_at: '2025-10-01T00:00:00Z',
      ...overrides,
    };
  }

  it('empty disbursementRows falls back to the existing behavior', () => {
    const property = makeProperty();
    const withoutRows = computeTaxCurrentYear(property, [], [], makeDate(2026, 9, 16));
    const withEmptyRows = computeTaxCurrentYear(property, [], [], makeDate(2026, 9, 16), undefined, []);
    expect(withEmptyRows).toEqual(withoutRows);
  });

  it('with tranches, less interest is deducted -> a smaller (less negative) tax effect', () => {
    const property = makeProperty({
      loan_amount: 281_400,
      loan_start_date: '2025-12-01',
      interest_rate: 0.043,
      amortization_rate: 0.01,
      monthly_mortgage: 1_242.85,
      marginal_tax_rate: 0.42,
    });
    const disbursements = [
      makeDisbursement(),
      makeDisbursement({ id: 'd2', date: '2026-01-20', amount: 278_665.55, is_deductible: true, label: 'Hauptauszahlung' }),
    ];
    const naive = computeTaxCurrentYear(property, [], [], makeDate(2026, 9, 16));
    const staged = computeTaxCurrentYear(property, [], [], makeDate(2026, 9, 16), undefined, disbursements);
    expect(staged.lineItems.interest).toBeLessThanOrEqual(naive.lineItems.interest);
  });
});
```

(Use whatever `makeProperty` helper `propertyTax.test.ts` already defines — if it takes different override keys, adjust the two `makeProperty({...})` calls above to match its actual shape, keeping the same `loan_amount`/`loan_start_date`/`interest_rate`/`amortization_rate`/`monthly_mortgage`/`marginal_tax_rate` values.)

- [ ] **Step 2: Run the test and verify it fails**

Run: `cd web && npx vitest run tests/data/propertyTax.test.ts`
Expected: FAIL — `computeTaxCurrentYear` doesn't accept a 6th argument yet (TS error).

- [ ] **Step 3: Implement**

In `web/lib/data/propertyTax.ts`:

1. Add the import:
```ts
import { toLoanDisbursements, type LoanDisbursementRow } from '@/lib/data/loanDisbursements';
```

2. Change the `computeTaxCurrentYear` signature and its call into `annualTaxableIncomeBreakdown`:
```ts
export function computeTaxCurrentYear(
  property: PropertyRow,
  statusEntryRows: StatusEntryRow[],
  extraordinaryCostRows: ExtraordinaryCostRow[],
  today: Date = new Date(),
  leerstandQuoteOverride?: number,
  disbursementRows: LoanDisbursementRow[] = []
): TaxCurrentYearResult {
  const { wohnung: statusHistory, stellplatz: stellplatzStatusHistory } = toUnitStatusHistories(statusEntryRows);
  const economicTransferDate = new Date(property.economic_transfer_date + 'T00:00:00Z');
  const loanStartDate = new Date(property.loan_start_date + 'T00:00:00Z');
  const year = today.getUTCFullYear();
```
(everything else in the function body stays the same down to the `annualTaxableIncomeBreakdown({...})` call), then inside that call's argument object, add one field right after `loanAmount: property.loan_amount,`:
```ts
    loanAmount: property.loan_amount,
    disbursements: disbursementRows.length > 0 ? toLoanDisbursements(disbursementRows) : undefined,
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `cd web && npx vitest run tests/data/propertyTax.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/data/propertyTax.ts web/tests/data/propertyTax.test.ts
git commit -m "feat(steuer): thread loan disbursements into computeTaxCurrentYear"
```

---

### Task 8: `propertyCashflow.ts` — keep the Cashflow tab's tax-effect number consistent

**Files:**
- Modify: `web/lib/data/propertyCashflow.ts`
- Test: `web/tests/data/propertyCashflow.test.ts` (create the `describe` block if the file doesn't already have one matching this shape — check first)

**Why this task exists:** `propertyCashflow.ts`'s own comments state an explicit invariant — Card 1 and Card 2 of the Cashflow tab, and the Steuer tab's "Laufendes Jahr" card, must show the *exact same* current-year tax effect. Task 7 changed what `computeTaxCurrentYear` returns once tranches are passed in; if the two call sites inside `propertyCashflow.ts` don't also receive the tranches, the Cashflow tab would silently show a different (stale, naive-model) number than the Steuer tab — a real regression, not just a missed enhancement.

- [ ] **Step 1: Write the failing test**

Add to `web/tests/data/propertyCashflow.test.ts`:

```ts
describe('computeCashflowForecastMonth / computeCashflowYearTable with disbursementRows', () => {
  type LoanDisbursementRow = Database['public']['Tables']['loan_disbursements']['Row'];
  function makeDisbursement(overrides: Partial<LoanDisbursementRow> = {}): LoanDisbursementRow {
    return {
      id: 'd1',
      property_id: 'prop-1',
      date: '2025-10-01',
      amount: 2_734.45,
      is_deductible: false,
      label: 'Hyposchutz',
      created_at: '2025-10-01T00:00:00Z',
      ...overrides,
    };
  }

  it('computeCashflowForecastMonth: empty disbursementRows is byte-identical to today', () => {
    const property = makeProperty();
    const today = makeDate(2026, 9, 16);
    const withoutRows = computeCashflowForecastMonth(property, [], [], 0, 0, today);
    const withEmptyRows = computeCashflowForecastMonth(property, [], [], 0, 0, today, []);
    expect(withEmptyRows).toEqual(withoutRows);
  });

  it('computeCashflowForecastMonth: with tranches, taxEffectMonthly matches computeTaxCurrentYear called with the same tranches', () => {
    const property = makeProperty({
      loan_amount: 281_400,
      loan_start_date: '2025-12-01',
      interest_rate: 0.043,
      amortization_rate: 0.01,
      monthly_mortgage: 1_242.85,
      marginal_tax_rate: 0.42,
    });
    const disbursements = [
      makeDisbursement(),
      makeDisbursement({ id: 'd2', date: '2026-01-20', amount: 278_665.55, is_deductible: true, label: 'Hauptauszahlung' }),
    ];
    const today = makeDate(2026, 9, 16);
    const forecast = computeCashflowForecastMonth(property, [], [], 0, 0, today, disbursements);
    const { taxEffectMonthly } = computeTaxCurrentYear(property, [], [], today, undefined, disbursements);
    expect(forecast.taxEffectMonthly).toBe(taxEffectMonthly);
  });

  it('computeCashflowYearTable: empty disbursementRows is byte-identical to today', () => {
    const property = makeProperty();
    const today = makeDate(2026, 9, 16);
    const withoutRows = computeCashflowYearTable(property, [], [], 2026, today);
    const withEmptyRows = computeCashflowYearTable(property, [], [], 2026, today, []);
    expect(withEmptyRows).toEqual(withoutRows);
  });
});
```

(Import `computeTaxCurrentYear` from `@/lib/data/propertyTax` at the top of this test file if not already imported, and reuse whichever `makeProperty`/`makeDate` helpers the file already has.)

- [ ] **Step 2: Run the test and verify it fails**

Run: `cd web && npx vitest run tests/data/propertyCashflow.test.ts`
Expected: FAIL — TS error, extra argument not accepted yet.

- [ ] **Step 3: Implement**

In `web/lib/data/propertyCashflow.ts`, add the import:
```ts
import type { LoanDisbursementRow } from '@/lib/data/loanDisbursements';
```

Change `computeCashflowForecastMonth`'s signature and its two `computeTaxCurrentYear` calls:
```ts
export function computeCashflowForecastMonth(
  property: PropertyRow,
  statusEntryRows: StatusEntryRow[],
  extraordinaryCostRows: ExtraordinaryCostRow[],
  leerstandQuote: number,
  defaultLeerstandQuote: number,
  today: Date = new Date(),
  disbursementRows: LoanDisbursementRow[] = []
): CashflowForecastMonthResult {
  // ...unchanged body down to:
  const { taxEffectMonthly } =
    leerstandQuote === defaultLeerstandQuote
      ? computeTaxCurrentYear(property, statusEntryRows, extraordinaryCostRows, today, undefined, disbursementRows)
      : computeTaxCurrentYear(property, statusEntryRows, extraordinaryCostRows, today, leerstandQuote, disbursementRows);
```

Change `computeCashflowYearTable`'s signature and its `computeTaxCurrentYear` call:
```ts
export function computeCashflowYearTable(
  property: PropertyRow,
  statusEntryRows: StatusEntryRow[],
  extraordinaryCostRows: ExtraordinaryCostRow[],
  year: number,
  today: Date = new Date(),
  disbursementRows: LoanDisbursementRow[] = []
): CashflowYearTableResult {
  // ...unchanged body down to:
  const { taxEffectMonthly: currentYearTaxEffectMonthly } = computeTaxCurrentYear(
    property,
    statusEntryRows,
    extraordinaryCostRows,
    today,
    undefined,
    disbursementRows
  );
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `cd web && npx vitest run tests/data/propertyCashflow.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/data/propertyCashflow.ts web/tests/data/propertyCashflow.test.ts
git commit -m "feat(cashflow): thread loan disbursements through so tax-effect stays in sync with Steuer tab"
```

---

### Task 9: `propertyDetail.ts` — fetch `loan_disbursements`

**Files:**
- Modify: `web/lib/data/propertyDetail.ts`
- Test: check `web/tests/data/propertyDetail.test.ts` if it exists; if not, this task has no test (the function does a live Supabase fetch, already untested at this layer per the existing file — verify with a grep before assuming, and skip step 1/2 if there's genuinely no existing test file for it).

- [ ] **Step 1: Check for an existing test file**

Run: `find web/tests -iname "*propertyDetail*"`
If a file is found, open it and add an analogous case asserting `detail.loanDisbursements` is populated from a mocked `loan_disbursements` query, following that file's existing mocking pattern. If no file exists, skip to Step 2 (this mirrors how `statusEntries`/`extraordinaryCosts` were added to this same function without a dedicated unit test, since it's a thin Supabase-fetch wrapper).

- [ ] **Step 2: Implement**

Replace the full contents of `web/lib/data/propertyDetail.ts` with:

```ts
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getPropertyPhotosWithUrls, type PropertyPhotoWithUrl } from '@/lib/data/propertyPhotos';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];
type ExtraordinaryCostRow = Database['public']['Tables']['extraordinary_costs']['Row'];
type LoanDisbursementRow = Database['public']['Tables']['loan_disbursements']['Row'];

export interface PropertyDetailData {
  property: PropertyRow;
  statusEntries: StatusEntryRow[];
  extraordinaryCosts: ExtraordinaryCostRow[];
  loanDisbursements: LoanDisbursementRow[];
  photos: PropertyPhotoWithUrl[];
}

/**
 * Fetches a single property (RLS-scoped) plus its full status/cost/loan
 * disbursement history. Returns null if not found (caller should render
 * notFound()). Wrapped in React's cache() so the layout and its active tab
 * page — both server components rendering the same request — share one
 * fetch instead of two.
 */
export const getPropertyDetail = cache(async (propertyId: string): Promise<PropertyDetailData | null> => {
  const supabase = await createClient();

  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .maybeSingle();

  if (propertyError) throw propertyError;
  if (!property) return null;

  const [
    { data: statusEntries, error: statusError },
    { data: extraordinaryCosts, error: costsError },
    { data: loanDisbursements, error: disbursementsError },
    photos,
  ] = await Promise.all([
    supabase.from('status_entries').select('*').eq('property_id', propertyId).order('date', { ascending: true }),
    supabase.from('extraordinary_costs').select('*').eq('property_id', propertyId).order('cost_month', { ascending: true }),
    supabase.from('loan_disbursements').select('*').eq('property_id', propertyId).order('date', { ascending: true }),
    getPropertyPhotosWithUrls(propertyId),
  ]);

  if (statusError) throw statusError;
  if (costsError) throw costsError;
  if (disbursementsError) throw disbursementsError;

  return {
    property,
    statusEntries: statusEntries ?? [],
    extraordinaryCosts: extraordinaryCosts ?? [],
    loanDisbursements: loanDisbursements ?? [],
    photos,
  };
});
```

- [ ] **Step 3: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: no new errors (any caller destructuring `detail` without `loanDisbursements` still compiles — it's an added field, not a removed one).

- [ ] **Step 4: Commit**

```bash
git add web/lib/data/propertyDetail.ts
git commit -m "feat(data): fetch loan_disbursements in getPropertyDetail"
```

---

### Task 10: `loanDisbursementActions.ts` — CRUD server actions

**Files:**
- Create: `web/lib/data/loanDisbursementActions.ts`

- [ ] **Step 1: Implement**

(No unit test — this file is a thin Supabase-mutation wrapper with `revalidatePath` side effects, following the exact same untested-at-this-layer pattern as `statusEntryActions.ts`/`extraordinaryCostActions.ts` in this codebase. It's exercised end-to-end in Task 12's manual browser check instead.)

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { TablesInsert, TablesUpdate } from '@/lib/supabase/types';

export async function createLoanDisbursement(
  propertyId: string,
  input: Omit<TablesInsert<'loan_disbursements'>, 'property_id'>
): Promise<void> {
  const supabase = await createClient();
  if (!input.date) throw new Error('Datum ist erforderlich.');
  if (input.amount === undefined || input.amount <= 0) throw new Error('Betrag muss größer als 0 sein.');

  const { error } = await supabase.from('loan_disbursements').insert({ ...input, property_id: propertyId });
  if (error) throw error;
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath(`/properties/${propertyId}/finanzierung`);
  revalidatePath(`/properties/${propertyId}/cashflow`);
  revalidatePath(`/properties/${propertyId}/steuer`);
}

export async function updateLoanDisbursement(
  id: string,
  propertyId: string,
  patch: Omit<TablesUpdate<'loan_disbursements'>, 'property_id' | 'id'>
): Promise<void> {
  const supabase = await createClient();
  if (patch.amount !== undefined && patch.amount <= 0) throw new Error('Betrag muss größer als 0 sein.');

  const { error } = await supabase.from('loan_disbursements').update(patch).eq('id', id);
  if (error) throw error;
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath(`/properties/${propertyId}/finanzierung`);
  revalidatePath(`/properties/${propertyId}/cashflow`);
  revalidatePath(`/properties/${propertyId}/steuer`);
}

export async function deleteLoanDisbursement(id: string, propertyId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('loan_disbursements').delete().eq('id', id);
  if (error) throw error;
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath(`/properties/${propertyId}/finanzierung`);
  revalidatePath(`/properties/${propertyId}/cashflow`);
  revalidatePath(`/properties/${propertyId}/steuer`);
}
```

- [ ] **Step 2: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add web/lib/data/loanDisbursementActions.ts
git commit -m "feat(finanzierung): add loan disbursement create/update/delete server actions"
```

---

### Task 11: `DisbursementModal.tsx` — add/edit form

**Files:**
- Create: `web/components/property/finanzierung/DisbursementModal.tsx`

- [ ] **Step 1: Implement**

Mirrors `web/components/property/verlauf/StatusEntryModal.tsx`'s structure exactly (same `Modal`/`TextField`/`CurrencyField` components, same react-hook-form + `useTransition` pattern):

```tsx
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/TextField';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { createLoanDisbursement, updateLoanDisbursement } from '@/lib/data/loanDisbursementActions';
import type { Database } from '@/lib/supabase/types';

type LoanDisbursementRow = Database['public']['Tables']['loan_disbursements']['Row'];

interface FormValues {
  date: string;
  amount: number;
  isDeductible: boolean;
  label: string;
}

export function DisbursementModal({
  open,
  onClose,
  propertyId,
  entry,
}: {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  entry: LoanDisbursementRow | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setSubmitError(null);
  }, [open]);

  const { register, handleSubmit } = useForm<FormValues>({
    values: {
      date: entry?.date ?? new Date().toISOString().slice(0, 10),
      amount: entry?.amount ?? 0,
      isDeductible: entry?.is_deductible ?? true,
      label: entry?.label ?? '',
    },
  });

  function onSubmit(values: FormValues) {
    setSubmitError(null);
    startTransition(async () => {
      try {
        const payload = {
          date: values.date,
          amount: values.amount,
          is_deductible: values.isDeductible,
          label: values.label,
        };
        if (entry) {
          await updateLoanDisbursement(entry.id, propertyId, payload);
        } else {
          await createLoanDisbursement(propertyId, payload);
        }
        onClose();
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={entry ? 'Auszahlung bearbeiten' : 'Auszahlung hinzufügen'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <TextField label="Bezeichnung" name="label" register={register} placeholder="z.B. Hauptauszahlung" />
        <TextField label="Datum" name="date" register={register} type="date" required />
        <CurrencyField label="Betrag" name="amount" register={register} />
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" {...register('isDeductible')} />
          Steuerlich abzugsfähig
        </label>
        {submitError && (
          <p role="alert" className="text-sm text-negative">
            {submitError}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-text-secondary hover:bg-black/5">
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Speichern
          </button>
        </div>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 2: Check `TextField` supports a `placeholder` prop**

Run: `grep -n "placeholder" web/components/ui/TextField.tsx`
If it doesn't forward `placeholder`, drop that prop from the `label="Bezeichnung"` field above rather than adding a new prop to a shared component (out of scope for this plan).

- [ ] **Step 3: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add web/components/property/finanzierung/DisbursementModal.tsx
git commit -m "feat(finanzierung): add DisbursementModal for adding/editing loan tranches"
```

---

### Task 12: `DisbursementList.tsx` — wire the list into `FinanzierungTab.tsx`

**Files:**
- Create: `web/components/property/finanzierung/DisbursementList.tsx`
- Modify: `web/components/property/finanzierung/FinanzierungTab.tsx`

- [ ] **Step 1: Implement `DisbursementList.tsx`**

Mirrors `VerlaufFeed.tsx`'s list/modal/delete pattern, scoped to just this one row type (no merged-feed sorting needed):

```tsx
'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { DisbursementModal } from './DisbursementModal';
import { deleteLoanDisbursement } from '@/lib/data/loanDisbursementActions';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { Database } from '@/lib/supabase/types';

type LoanDisbursementRow = Database['public']['Tables']['loan_disbursements']['Row'];

export function DisbursementList({ propertyId, disbursements }: { propertyId: string; disbursements: LoanDisbursementRow[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LoanDisbursementRow | null>(null);
  const [, startTransition] = useTransition();

  const sorted = [...disbursements].sort((a, b) => a.date.localeCompare(b.date));
  const total = sorted.reduce((sum, d) => sum + d.amount, 0);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(row: LoanDisbursementRow) {
    setEditing(row);
    setModalOpen(true);
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteLoanDisbursement(id, propertyId);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase text-text-secondary">Auszahlungen</h2>
        <button onClick={openCreate} className="flex items-center gap-1 text-sm text-accent hover:underline">
          <Plus size={14} /> Hinzufügen
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-text-secondary">Keine Auszahlungstranchen erfasst — es wird mit einer einzelnen Auszahlung gerechnet.</p>
      ) : (
        <ul className="space-y-1.5">
          {sorted.map((row) => (
            <li key={row.id} className="flex items-center justify-between rounded-md bg-black/[0.02] px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-text-primary">{row.label || 'Auszahlung'}</span>
                <span className="text-text-secondary">{formatDate(row.date)}</span>
                {!row.is_deductible && (
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-text-secondary">nicht abzugsfähig</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-text-primary">{formatCurrency(row.amount)}</span>
                <button onClick={() => openEdit(row)} aria-label="Bearbeiten" className="text-text-secondary hover:text-text-primary">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(row.id)} aria-label="Löschen" className="text-text-secondary hover:text-negative">
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {sorted.length > 0 && (
        <div className="flex justify-between border-t border-black/10 pt-2 text-sm font-semibold">
          <span>Summe</span>
          <span>{formatCurrency(total)}</span>
        </div>
      )}

      <DisbursementModal open={modalOpen} onClose={() => setModalOpen(false)} propertyId={propertyId} entry={editing} />
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `FinanzierungTab.tsx`**

Modify `web/components/property/finanzierung/FinanzierungTab.tsx`: add the import, a new prop, and render it as a third card below the existing two:

```tsx
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionLabel } from '@/components/ui/SectionLabel';
import type { FinancingOverviewResult, AmortizationYearTableResult } from '@/lib/data/propertyFinancing';
import { DisbursementList } from './DisbursementList';
import type { Database } from '@/lib/supabase/types';

type LoanDisbursementRow = Database['public']['Tables']['loan_disbursements']['Row'];

function monthYearLabel(date: Date): string {
  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
}

export function FinanzierungTab({
  overview,
  yearTable,
  propertyId,
  disbursements,
}: {
  overview: FinancingOverviewResult;
  yearTable: AmortizationYearTableResult;
  propertyId: string;
  disbursements: LoanDisbursementRow[];
}) {
  if (!overview.hasFinancing) {
    return (
      <GlassCard>
        <SectionLabel>Finanzierung</SectionLabel>
        <p className="text-sm text-text-secondary">Keine Finanzierung erfasst.</p>
        <p className="text-sm text-text-secondary">Finanzierungsdaten können im Immobiliendaten-Tab ergänzt werden.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* ...existing GlassCard with Darlehensbetrag/Restschuld/etc. stays exactly as-is... */}

      <GlassCard>
        <DisbursementList propertyId={propertyId} disbursements={disbursements} />
      </GlassCard>

      {/* ...rest of the file (Tilgungsplan table) stays exactly as-is... */}
    </div>
  );
}
```

(Only the function signature, the two new imports/types at the top, and the one new `<GlassCard>` block change — the rest of the existing JSX is untouched.)

- [ ] **Step 3: Update `finanzierung/page.tsx` to pass the new props**

Replace the full contents of `web/app/(app)/properties/[id]/finanzierung/page.tsx` with:

```tsx
import { notFound } from 'next/navigation';
import { getPropertyDetail } from '@/lib/data/propertyDetail';
import { computeFinancingOverview, computeAmortizationYearTable } from '@/lib/data/propertyFinancing';
import { FinanzierungTab } from '@/components/property/finanzierung/FinanzierungTab';

export default async function FinanzierungTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPropertyDetail(id);
  if (!detail) notFound();

  const today = new Date();
  const overview = computeFinancingOverview(detail.property, today, detail.loanDisbursements);
  const yearTable = computeAmortizationYearTable(detail.property, today, detail.loanDisbursements);

  return (
    <FinanzierungTab
      overview={overview}
      yearTable={yearTable}
      propertyId={id}
      disbursements={detail.loanDisbursements}
    />
  );
}
```

- [ ] **Step 4: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Manual browser check**

Run: `cd web && npm run dev`, open a property's Finanzierung tab.
Expected: existing Darlehensbetrag/Restschuld/Tilgungsplan cards unchanged, plus a new "Auszahlungen" card. Click "Hinzufügen", add a tranche, confirm it appears in the list and Restschuld updates after the page revalidates.

- [ ] **Step 6: Commit**

```bash
git add web/components/property/finanzierung/DisbursementList.tsx web/components/property/finanzierung/FinanzierungTab.tsx "web/app/(app)/properties/[id]/finanzierung/page.tsx"
git commit -m "feat(finanzierung): add Auszahlungen list UI to the Finanzierung tab"
```

---

### Task 13: Wire `cashflow/page.tsx` and `steuer/page.tsx`

**Files:**
- Modify: `web/app/(app)/properties/[id]/cashflow/page.tsx`
- Modify: `web/app/(app)/properties/[id]/steuer/page.tsx`
- Modify: `web/components/property/cashflow/CashflowTab.tsx`
- Modify: `web/components/property/steuer/SteuerTab.tsx`

- [ ] **Step 1: Update `cashflow/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { getPropertyDetail } from '@/lib/data/propertyDetail';
import { computePropertySummary } from '@/lib/data/propertySummary';
import { computeOverviewMetrics } from '@/lib/data/propertyOverview';
import { CashflowTab } from '@/components/property/cashflow/CashflowTab';

export default async function CashflowTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPropertyDetail(id);
  if (!detail) notFound();

  const today = new Date();
  const summary = computePropertySummary(detail.property, detail.statusEntries, today);
  const overview = computeOverviewMetrics(detail.property, detail.statusEntries, detail.extraordinaryCosts, summary, today);

  return (
    <CashflowTab
      property={detail.property}
      statusEntries={detail.statusEntries}
      extraordinaryCosts={detail.extraordinaryCosts}
      loanDisbursements={detail.loanDisbursements}
      overview={overview}
      today={today}
    />
  );
}
```

- [ ] **Step 2: Update `CashflowTab.tsx`**

Add `loanDisbursements` to its prop type and pass it to both compute calls:

```tsx
type LoanDisbursementRow = Database['public']['Tables']['loan_disbursements']['Row'];

export function CashflowTab({
  property,
  statusEntries,
  extraordinaryCosts,
  loanDisbursements,
  overview,
  today,
}: {
  property: PropertyRow;
  statusEntries: StatusEntryRow[];
  extraordinaryCosts: ExtraordinaryCostRow[];
  loanDisbursements: LoanDisbursementRow[];
  overview: OverviewMetrics;
  today: Date;
}) {
```

(add the `LoanDisbursementRow` type alias next to the file's existing `PropertyRow`/`StatusEntryRow`/`ExtraordinaryCostRow` aliases), and update the two compute calls further down:

```tsx
  const forecast = computeCashflowForecastMonth(
    property,
    statusEntries,
    extraordinaryCosts,
    quote / 100,
    defaultQuote / 100,
    today,
    loanDisbursements
  );
  // ...
  const yearTable = computeCashflowYearTable(property, statusEntries, extraordinaryCosts, year, today, loanDisbursements);
```

- [ ] **Step 3: Update `steuer/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { getPropertyDetail } from '@/lib/data/propertyDetail';
import { computePropertySummary } from '@/lib/data/propertySummary';
import { computeOverviewMetrics } from '@/lib/data/propertyOverview';
import { SteuerTab } from '@/components/property/steuer/SteuerTab';

export default async function SteuerTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPropertyDetail(id);
  if (!detail) notFound();

  const today = new Date();
  const summary = computePropertySummary(detail.property, detail.statusEntries, today);
  const overview = computeOverviewMetrics(detail.property, detail.statusEntries, detail.extraordinaryCosts, summary, today);

  return (
    <SteuerTab
      property={detail.property}
      statusEntries={detail.statusEntries}
      extraordinaryCosts={detail.extraordinaryCosts}
      loanDisbursements={detail.loanDisbursements}
      overview={overview}
      today={today}
    />
  );
}
```

- [ ] **Step 4: Update `SteuerTab.tsx`**

Add `loanDisbursements` to its prop type (same alias pattern as `CashflowTab.tsx`), and pass it as the 6th argument to both `computeTaxCurrentYear` calls (the two you saw around line 120-121 — `undefined` stays as the `leerstandQuoteOverride` argument on the second call, `loanDisbursements` becomes the argument after it):

```tsx
        ? computeTaxCurrentYear(property, statusEntries, extraordinaryCosts, today, liveCurrentYearQuote / 100, loanDisbursements)
        : computeTaxCurrentYear(property, statusEntries, extraordinaryCosts, today, undefined, loanDisbursements),
```

Do **not** change any `computeTaxForecastYear` call in this file — that function is intentionally untouched (see the "Out of scope" note in the plan header).

- [ ] **Step 5: Type-check and run the full test suite**

Run: `cd web && npx tsc --noEmit && npx vitest run`
Expected: no TS errors, all tests pass.

- [ ] **Step 6: Manual browser check**

Open a property with tranches entered (from Task 12) on both the Cashflow and Steuer tabs. Expected: the "Steuererstattung Ø / Mon" figure on the Cashflow tab's Card 1/Card 2 matches the Steuer tab's "Laufendes Jahr" card exactly (same invariant as before this plan, now also holding with tranches present).

- [ ] **Step 7: Commit**

```bash
git add "web/app/(app)/properties/[id]/cashflow/page.tsx" "web/app/(app)/properties/[id]/steuer/page.tsx" web/components/property/cashflow/CashflowTab.tsx web/components/property/steuer/SteuerTab.tsx
git commit -m "feat(cashflow,steuer): pass loan disbursements through to the tax-effect calculation"
```

---

### Task 14: Enter the real tranches for the Dresden property (manual, no code)

Once Task 13 is merged and deployed (or running locally against the real Supabase project):

- [ ] Open the Eigentumswohnung Dresden property's Finanzierung tab.
- [ ] Edit the auto-backfilled "Hauptauszahlung" row (created by Task 1's migration) from `281.400 €` / `01.12.2025` to `278.665,55 €` / `20.01.2026`, `abzugsfähig` checked.
- [ ] Add a second tranche: `Hyposchutz` / `2.734,45 €` / `01.10.2025`, `abzugsfähig` unchecked.
- [ ] Confirm the Finanzierung tab's "Restschuld (heute)" now reads close to `276.435 €` (vs. the real bank balance of `276.275,50 €` — a ~160 € gap, matching the validated prototype).
- [ ] Confirm the Steuer tab's Zinsen line for 2026 dropped slightly (excluding the Hyposchutz tranche's interest, which by then is 0 anyway since that tranche is fully repaid by December 2025).

---

## Self-Review

**Spec coverage:** Migration + types (Task 1-2) → calculation engine (Task 3) → mapper (Task 4) → Finanzierungstab accuracy (Task 5, the original ask) → tax deductibility split (Task 6-7) → cross-tab consistency invariant (Task 8) → data fetch (Task 9) → CRUD (Task 10) → UI (Task 11-12) → full wiring (Task 13) → real data entry (Task 14). Every numbered item from the "was werden wir genau ändern" discussion is covered; the two explicitly out-of-scope items (Cashflow's flat mortgage line, `computeTaxForecastYear`) are called out in the File Structure table so nobody "fixes" them by mistake.

**Placeholder scan:** No TBD/TODO/"add error handling" text anywhere above; every step has complete, runnable code.

**Type consistency:** `LoanDisbursement` (calculation layer, `Date`+`deductible`) vs. `LoanDisbursementRow` (DB layer, `string`+`is_deductible`) are named distinctly and only ever converted via `toLoanDisbursements()` — checked that every task that needs the DB shape imports `LoanDisbursementRow` from `loanDisbursements.ts`, and every task that needs the calculation shape imports `LoanDisbursement` from `amortizationCalculator.ts`, never the other way round.
