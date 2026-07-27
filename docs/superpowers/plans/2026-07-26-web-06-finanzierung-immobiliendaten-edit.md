# Property Detail — Finanzierung, Immobiliendaten & Edit Flow (Plan 6) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `web/app/(app)/properties/[id]/finanzierung/page.tsx` and `.../immobiliendaten/page.tsx` placeholders with the full tabs described in `docs/specs/spec-finanzierung-tab.md` and `docs/specs/spec-immobiliendaten-tab.md`: a Finanzierungsübersicht + yearly Tilgungsplan table, and a full property-edit form with left section navigation, auto-save, an "Annahmen" section, and a "Gefahrenzone" delete section.

**Architecture:** Finanzierung extends the Plan-1 `lib/calculations/amortizationCalculator.ts` with a year-grouping helper (built directly on the existing `amortizationSchedule`) and composes it in a new `lib/data/propertyFinancing.ts`, following the `propertyOverview.ts`/`propertyTax.ts` pattern — no interactive state, so it's a plain server-computed page like Übersicht, not a client component like Cashflow/Steuer. Immobiliendaten reuses the **exact same** `Step*` components the Plan-3 `PropertyWizard` already built (`StepStammdaten`, `StepObjektdaten`, `StepKauf`, `StepEinnahmen`, `StepKosten`, `StepFinanzierung`, `StepAfaSteuer`) inside a new `FormProvider` — they're already written against `useFormContext<WizardFormValues>()` with plain field names, so as long as the actual form values object has every `WizardFormValues` field (a new `PropertyEditFormValues` type extends it), they work unmodified. Two new sections the wizard doesn't have — "Annahmen" (`vacancyRateAssumption`/`marketRentPerSqm`/`currentMarketValue`, confirmed absent from `WizardFormValues` by `spec-property-setup.md`: "sind keine Property-Setup-Eingaben") and "Gefahrenzone" — are new components. Auto-save uses a debounced `watch()` subscription calling a new `updateProperty` server action, replacing the wizard's `Weiter`/`Fertigstellen` button flow entirely (no submit button anywhere in this tab).

**Tech Stack:** Next.js App Router (RSC + Client Components), Supabase, react-hook-form, Tailwind, Vitest.

**Ground truth note:** `spec-immobiliendaten-tab.md` names the route `web/app/(app)/properties/[id]/settings/page.tsx` — the real route (already scaffolded in Plan 4, `PropertyTabNav`) is `web/app/(app)/properties/[id]/immobiliendaten/page.tsx`. This plan uses the real route throughout. The spec's Objektdaten section also describes a "Fotos" photo grid; `property_photos` exists as a Plan-1 table but has **zero** application code anywhere yet (no upload action, no gallery component, not even in the wizard's own `StepObjektdaten`) — building Supabase Storage upload/gallery UI from scratch is a substantial, separable feature. This plan deliberately does not add it (Task 10's `StepObjektdaten` reuse is exactly the wizard's existing component, which itself has no Fotos section), consistent with the existing wizard rather than a new gap this plan introduces.

---

### Task 1: `groupAmortizationScheduleByYear`

**Files:**
- Modify: `web/lib/calculations/amortizationCalculator.ts`
- Test: `web/tests/calculations/amortizationCalculator.test.ts`

The Finanzierung tab's Tilgungsplan table is yearly (Jahr | Restschuld Anfang | Zinsen | Tilgung | Rate | Restschuld Ende) — this groups the existing monthly `AnnuityRow[]` schedule by calendar year.

- [ ] **Step 1: Write the failing test**

Add to `web/tests/calculations/amortizationCalculator.test.ts`'s import block:

```typescript
import { groupAmortizationScheduleByYear } from '@/lib/calculations/amortizationCalculator';
```

Add this `describe` block at the end of the file:

```typescript
describe('groupAmortizationScheduleByYear', () => {
  it('groups rows by calendar year, tracking remaining debt start/end per year', () => {
    // loanStartDate = Oct 2025 -> 24 months covers Oct 2025 - Sep 2027 (3 partial/full years).
    const schedule = amortizationSchedule(f.loanAmount, f.interestRate, f.monthlyMortgage, f.loanStartDate, 24);
    const rows = groupAmortizationScheduleByYear(schedule, f.loanAmount);

    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.year)).toEqual([2025, 2026, 2027]);
    expect(rows[0].remainingDebtStart).toBeCloseTo(f.loanAmount, 1);
    expect(rows[1].remainingDebtStart).toBeCloseTo(rows[0].remainingDebtEnd, 6);
    expect(rows[2].remainingDebtStart).toBeCloseTo(rows[1].remainingDebtEnd, 6);
  });

  it('interest + principal = payment for every yearly row', () => {
    const schedule = amortizationSchedule(f.loanAmount, f.interestRate, f.monthlyMortgage, f.loanStartDate, 24);
    const rows = groupAmortizationScheduleByYear(schedule, f.loanAmount);
    for (const row of rows) {
      expect(row.interest + row.principal).toBeCloseTo(row.payment, 1);
    }
  });

  it('a full calendar year matches interestForCalendarYear exactly', () => {
    const schedule = amortizationSchedule(f.loanAmount, f.interestRate, f.monthlyMortgage, f.loanStartDate, 15); // Oct 2025 - Dec 2026
    const rows = groupAmortizationScheduleByYear(schedule, f.loanAmount);
    const year2026 = rows.find((r) => r.year === 2026)!;
    const expected = interestForCalendarYear(2026, f.loanStartDate, f.loanAmount, f.interestRate, f.monthlyMortgage);
    expect(year2026.interest).toBeCloseTo(expected, 0);
  });

  it('an empty schedule returns an empty array', () => {
    expect(groupAmortizationScheduleByYear([], f.loanAmount)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/calculations/amortizationCalculator.test.ts`
Expected: FAIL — `groupAmortizationScheduleByYear is not a function`.

- [ ] **Step 3: Implement**

Add to the end of `web/lib/calculations/amortizationCalculator.ts`:

```typescript
export interface YearlyAmortizationRow {
  year: number;
  remainingDebtStart: number;
  interest: number;
  principal: number;
  payment: number;
  remainingDebtEnd: number;
}

/** Groups a monthly AnnuityRow[] schedule into per-calendar-year totals for the Finanzierung tab's Tilgungsplan table. */
export function groupAmortizationScheduleByYear(schedule: AnnuityRow[], loanAmount: number): YearlyAmortizationRow[] {
  const byYear = new Map<number, AnnuityRow[]>();
  for (const row of schedule) {
    const y = yearOf(row.date);
    const existing = byYear.get(y) ?? [];
    existing.push(row);
    byYear.set(y, existing);
  }

  const years = [...byYear.keys()].sort((a, b) => a - b);
  const result: YearlyAmortizationRow[] = [];
  let previousYearEndDebt = loanAmount;

  for (const year of years) {
    const rows = byYear.get(year)!;
    const interest = rows.reduce((sum, r) => sum + r.interest, 0);
    const principal = rows.reduce((sum, r) => sum + r.principal, 0);
    const payment = rows.reduce((sum, r) => sum + r.payment, 0);
    const remainingDebtEnd = rows[rows.length - 1].remainingDebt;

    result.push({ year, remainingDebtStart: previousYearEndDebt, interest, principal, payment, remainingDebtEnd });
    previousYearEndDebt = remainingDebtEnd;
  }

  return result;
}
```

Add `yearOf` to the top-of-file import from `./dateHelpers` (currently `import { addMonths, yearOf, monthsBetween, makeDate } from './dateHelpers';` — `yearOf` is already imported, no change needed there).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/calculations/amortizationCalculator.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/calculations/amortizationCalculator.ts web/tests/calculations/amortizationCalculator.test.ts
git commit -m "feat(calculations): add groupAmortizationScheduleByYear"
```

---

### Task 2: `trimAmortizationScheduleToPayoff`

**Files:**
- Modify: `web/lib/calculations/amortizationCalculator.ts`
- Test: `web/tests/calculations/amortizationCalculator.test.ts`

The Tilgungsplan table shouldn't run for a fixed 40-year horizon of mostly zeroed rows once a loan pays off — this trims a schedule to its last real payment row.

- [ ] **Step 1: Write the failing test**

Add to `web/tests/calculations/amortizationCalculator.test.ts`'s import block:

```typescript
import { trimAmortizationScheduleToPayoff } from '@/lib/calculations/amortizationCalculator';
```

Add this `describe` block at the end of the file:

```typescript
describe('trimAmortizationScheduleToPayoff', () => {
  it('cuts off trailing zeroed rows after payoff', () => {
    // Same synthetic loan as the "payoff handling" describe above: pays off at month 2.
    const schedule = amortizationSchedule(1_000, 0.12, 600, makeDate(2025, 1, 1), 5);
    const trimmed = trimAmortizationScheduleToPayoff(schedule);
    expect(trimmed).toHaveLength(2);
    expect(trimmed[trimmed.length - 1].remainingDebt).toBeCloseTo(0, 5);
  });

  it('a schedule that never pays off within its window is returned unchanged', () => {
    const schedule = amortizationSchedule(f.loanAmount, f.interestRate, f.monthlyMortgage, f.loanStartDate, 12);
    const trimmed = trimAmortizationScheduleToPayoff(schedule);
    expect(trimmed).toHaveLength(12);
  });

  it('an empty schedule returns an empty array', () => {
    expect(trimAmortizationScheduleToPayoff([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/calculations/amortizationCalculator.test.ts`
Expected: FAIL — `trimAmortizationScheduleToPayoff is not a function`.

- [ ] **Step 3: Implement**

Add to the end of `web/lib/calculations/amortizationCalculator.ts`:

```typescript
/** Slices off the trailing all-zero rows amortizationSchedule appends after a loan is fully paid off. */
export function trimAmortizationScheduleToPayoff(schedule: AnnuityRow[]): AnnuityRow[] {
  const lastPaymentIndex = schedule.reduce((lastIdx, row, idx) => (row.payment > 0 ? idx : lastIdx), -1);
  if (lastPaymentIndex === -1) return schedule;
  return schedule.slice(0, lastPaymentIndex + 1);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/calculations/amortizationCalculator.test.ts`
Expected: PASS (full file).

- [ ] **Step 5: Commit**

```bash
git add web/lib/calculations/amortizationCalculator.ts web/tests/calculations/amortizationCalculator.test.ts
git commit -m "feat(calculations): add trimAmortizationScheduleToPayoff"
```

---

### Task 3: `lib/data/propertyFinancing.ts` — `computeFinancingOverview`

**Files:**
- Create: `web/lib/data/propertyFinancing.ts`
- Test: `web/tests/data/propertyFinancing.test.ts`

- [ ] **Step 1: Write the failing test**

Create `web/tests/data/propertyFinancing.test.ts`. Copy the exact `makeProperty` helper from `web/tests/data/propertyTax.test.ts` (Plan 5, Task 7) verbatim into this new file — the `makeStatusEntry`/`makeExtraordinaryCost` helpers aren't needed here since financing has no status/cost dependency. Then add:

```typescript
import { describe, it, expect } from 'vitest';
import { fixtures as f } from '../calculations/fixtures';
import { makeDate } from '@/lib/calculations/dateHelpers';
import { monthsBetween } from '@/lib/calculations/dateHelpers';
import { remainingDebt } from '@/lib/calculations/amortizationCalculator';
import type { Database } from '@/lib/supabase/types';
import { computeFinancingOverview } from '@/lib/data/propertyFinancing';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

// ... makeProperty helper here (copied from propertyTax.test.ts) ...

describe('computeFinancingOverview', () => {
  const property = makeProperty(); // loan_start_date: '2025-10-01', fixed_interest_period_years: 10
  const today = makeDate(2026, 6, 15);

  it('hasFinancing is false when loan_amount is 0', () => {
    const result = computeFinancingOverview(makeProperty({ loan_amount: 0 }), today);
    expect(result.hasFinancing).toBe(false);
  });

  it('hasFinancing is true and loanAmount matches the property', () => {
    const result = computeFinancingOverview(property, today);
    expect(result.hasFinancing).toBe(true);
    if (result.hasFinancing) expect(result.loanAmount).toBe(f.loanAmount);
  });

  it('remainingDebtNow matches amortizationCalculator.remainingDebt directly', () => {
    const result = computeFinancingOverview(property, today);
    const monthsSinceLoanStart = monthsBetween(f.loanStartDate, today) - 1;
    const expected = remainingDebt(f.loanAmount, f.interestRate, f.monthlyMortgage, monthsSinceLoanStart);
    if (result.hasFinancing) expect(result.remainingDebtNow).toBeCloseTo(expected, 1);
  });

  it('fixedRateEndDate is loanStartDate + fixedInterestPeriodYears years', () => {
    const result = computeFinancingOverview(property, today);
    if (result.hasFinancing) {
      expect(result.fixedRateEndDate.getUTCFullYear()).toBe(2035);
      expect(result.fixedRateEndDate.getUTCMonth()).toBe(9); // October, 0-indexed
    }
  });

  it('yearsRemainingUntilFixedRateEnd shrinks over time and never goes negative', () => {
    const earlier = computeFinancingOverview(property, makeDate(2026, 1, 1));
    const later = computeFinancingOverview(property, makeDate(2030, 1, 1));
    const afterFixedRateEnd = computeFinancingOverview(property, makeDate(2036, 1, 1));
    if (earlier.hasFinancing && later.hasFinancing && afterFixedRateEnd.hasFinancing) {
      expect(later.yearsRemainingUntilFixedRateEnd).toBeLessThan(earlier.yearsRemainingUntilFixedRateEnd);
      expect(afterFixedRateEnd.yearsRemainingUntilFixedRateEnd).toBe(0);
    }
  });

  it('remainingDebtAtFixedRateEnd matches remainingDebt at that month count', () => {
    const result = computeFinancingOverview(property, today);
    const monthsToFixedRateEnd = monthsBetween(f.loanStartDate, makeDate(2035, 10, 1)) - 1;
    const expected = remainingDebt(f.loanAmount, f.interestRate, f.monthlyMortgage, monthsToFixedRateEnd);
    if (result.hasFinancing) expect(result.remainingDebtAtFixedRateEnd).toBeCloseTo(expected, 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/data/propertyFinancing.test.ts`
Expected: FAIL — cannot find module `@/lib/data/propertyFinancing`.

- [ ] **Step 3: Implement**

Create `web/lib/data/propertyFinancing.ts`:

```typescript
import type { Database } from '@/lib/supabase/types';
import { addMonths, monthsBetween } from '@/lib/calculations/dateHelpers';
import { remainingDebt } from '@/lib/calculations/amortizationCalculator';

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

/** Finanzierung tab Section 1 (Finanzierungsübersicht). */
export function computeFinancingOverview(property: PropertyRow, today: Date = new Date()): FinancingOverviewResult {
  if (property.loan_amount <= 0) return { hasFinancing: false };

  const loanStartDate = new Date(property.loan_start_date + 'T00:00:00Z');
  const monthsSinceLoanStart = monthsBetween(loanStartDate, today) - 1;
  const remainingDebtNow = remainingDebt(property.loan_amount, property.interest_rate, property.monthly_mortgage, Math.max(0, monthsSinceLoanStart));

  const fixedRateEndDate = addMonths(loanStartDate, property.fixed_interest_period_years * 12);
  const monthsUntilFixedRateEnd = monthsBetween(today, fixedRateEndDate) - 1;
  const monthsFromStartToFixedRateEnd = monthsBetween(loanStartDate, fixedRateEndDate) - 1;
  const remainingDebtAtFixedRateEnd = remainingDebt(
    property.loan_amount,
    property.interest_rate,
    property.monthly_mortgage,
    Math.max(0, monthsFromStartToFixedRateEnd)
  );

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/data/propertyFinancing.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/data/propertyFinancing.ts web/tests/data/propertyFinancing.test.ts
git commit -m "feat(finanzierung): add computeFinancingOverview"
```

---

### Task 4: `lib/data/propertyFinancing.ts` — `computeAmortizationYearTable`

**Files:**
- Modify: `web/lib/data/propertyFinancing.ts`
- Test: `web/tests/data/propertyFinancing.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `web/tests/data/propertyFinancing.test.ts`'s import block:

```typescript
import { computeAmortizationYearTable } from '@/lib/data/propertyFinancing';
```

Add this `describe` block at the end of the file:

```typescript
describe('computeAmortizationYearTable', () => {
  const property = makeProperty();
  const today = makeDate(2026, 6, 15);

  it('hasFinancing is false and rows is empty when loan_amount is 0', () => {
    const result = computeAmortizationYearTable(makeProperty({ loan_amount: 0 }), today);
    expect(result.hasFinancing).toBe(false);
    expect(result.rows).toHaveLength(0);
  });

  it('rows start at the loan start year and chain remainingDebtStart/End across years', () => {
    const result = computeAmortizationYearTable(property, today);
    expect(result.rows[0].year).toBe(2025);
    for (let i = 1; i < result.rows.length; i++) {
      expect(result.rows[i].remainingDebtStart).toBeCloseTo(result.rows[i - 1].remainingDebtEnd, 4);
    }
  });

  it('exactly one row is flagged as the fixed-rate-end year (2035)', () => {
    const result = computeAmortizationYearTable(property, today);
    const flagged = result.rows.filter((r) => r.isFixedRateEndYear);
    expect(flagged).toHaveLength(1);
    expect(flagged[0].year).toBe(2035);
  });

  it('years after the fixed-rate-end year are flagged isPostFixedRatePeriod; the end year itself is not', () => {
    const result = computeAmortizationYearTable(property, today);
    const at2035 = result.rows.find((r) => r.year === 2035)!;
    expect(at2035.isPostFixedRatePeriod).toBe(false);
    const after = result.rows.filter((r) => r.year > 2035);
    expect(after.length).toBeGreaterThan(0);
    for (const row of after) expect(row.isPostFixedRatePeriod).toBe(true);
  });

  it('exactly one row is flagged as the current year', () => {
    const result = computeAmortizationYearTable(property, today);
    const flagged = result.rows.filter((r) => r.isCurrentYear);
    expect(flagged).toHaveLength(1);
    expect(flagged[0].year).toBe(2026);
  });

  it('the schedule is trimmed at payoff (last row reaches ~0), not padded to the full 40-year horizon', () => {
    const result = computeAmortizationYearTable(property, today);
    const lastRow = result.rows[result.rows.length - 1];
    expect(lastRow.remainingDebtEnd).toBeCloseTo(0, 1);
    // Fixture loan (230000 @ 4.3%, ~1% Tilgung) pays off ~2051 -> well under a 40-year window.
    expect(result.rows.length).toBeLessThan(40);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/data/propertyFinancing.test.ts`
Expected: FAIL — `computeAmortizationYearTable` not exported.

- [ ] **Step 3: Implement**

At the top of `web/lib/data/propertyFinancing.ts`, replace the import block with:

```typescript
import type { Database } from '@/lib/supabase/types';
import { addMonths, monthsBetween, yearOf } from '@/lib/calculations/dateHelpers';
import {
  remainingDebt,
  amortizationSchedule,
  groupAmortizationScheduleByYear,
  trimAmortizationScheduleToPayoff,
  type YearlyAmortizationRow,
} from '@/lib/calculations/amortizationCalculator';
```

Add to the end of `web/lib/data/propertyFinancing.ts`:

```typescript
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
 * full schedule from loanStartDate to payoff, capped at
 * MAX_AMORTIZATION_HORIZON_YEARS so a degenerate (near-interest-only) loan
 * can't produce an effectively unbounded table.
 */
export function computeAmortizationYearTable(property: PropertyRow, today: Date = new Date()): AmortizationYearTableResult {
  if (property.loan_amount <= 0) return { hasFinancing: false, rows: [], fixedRateEndYear: null };

  const loanStartDate = new Date(property.loan_start_date + 'T00:00:00Z');
  const fullSchedule = amortizationSchedule(
    property.loan_amount,
    property.interest_rate,
    property.monthly_mortgage,
    loanStartDate,
    MAX_AMORTIZATION_HORIZON_YEARS * 12
  );
  const trimmedSchedule = trimAmortizationScheduleToPayoff(fullSchedule);
  const yearRows = groupAmortizationScheduleByYear(trimmedSchedule, property.loan_amount);

  const fixedRateEndDate = addMonths(loanStartDate, property.fixed_interest_period_years * 12);
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

Note: `PropertyRow` is already imported/typed above `computeFinancingOverview` in this file from Task 3 — no need to redeclare it.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/data/propertyFinancing.test.ts`
Expected: PASS.

Also run the full suite:

Run: `cd web && npm test`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/data/propertyFinancing.ts web/tests/data/propertyFinancing.test.ts
git commit -m "feat(finanzierung): add computeAmortizationYearTable"
```

---

### Task 5: `FinanzierungTab` component

**Files:**
- Create: `web/components/property/finanzierung/FinanzierungTab.tsx`

No interactive state in this tab (no toggle, no year picker per spec), so — unlike Cashflow/Steuer — this stays a plain server-renderable component, computed once in the page (Task 6), matching the Übersicht tab's pattern.

- [ ] **Step 1: Implement**

Create `web/components/property/finanzierung/FinanzierungTab.tsx`:

```typescript
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionLabel } from '@/components/ui/SectionLabel';
import type { FinancingOverviewResult, AmortizationYearTableResult } from '@/lib/data/propertyFinancing';

function monthYearLabel(date: Date): string {
  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
}

export function FinanzierungTab({
  overview,
  yearTable,
}: {
  overview: FinancingOverviewResult;
  yearTable: AmortizationYearTableResult;
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
      <GlassCard>
        <SectionLabel>Finanzierung</SectionLabel>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-text-secondary">Darlehensbetrag</span>
          <span className="text-right text-text-primary">{formatCurrency(overview.loanAmount)}</span>

          <span className="text-text-secondary">Restschuld (heute)</span>
          <span className="text-right text-text-primary">{formatCurrency(overview.remainingDebtNow)}</span>

          <span className="text-text-secondary">Monatliche Rate</span>
          <span className="text-right text-text-primary">{formatCurrency(overview.monthlyMortgage)}</span>

          <span className="text-text-secondary">Zinssatz</span>
          <span className="text-right text-text-primary">{formatPercent(overview.interestRate)}</span>

          <span className="text-text-secondary">Tilgungssatz</span>
          <span className="text-right text-text-primary">{formatPercent(overview.amortizationRate)}</span>

          <span className="text-text-secondary">Zinsbindung bis</span>
          <span className="text-right text-text-primary">
            {monthYearLabel(overview.fixedRateEndDate)} (noch {overview.yearsRemainingUntilFixedRateEnd}{' '}
            {overview.yearsRemainingUntilFixedRateEnd === 1 ? 'Jahr' : 'Jahre'})
          </span>

          <span className="text-text-secondary">Restschuld Zinsbindungsende</span>
          <span className="text-right text-text-primary">{formatCurrency(overview.remainingDebtAtFixedRateEnd)}</span>
        </div>
      </GlassCard>

      <GlassCard>
        <SectionLabel>Tilgungsplan</SectionLabel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-text-secondary">
                <th className="py-1.5">Jahr</th>
                <th className="py-1.5 text-right">Restschuld Anfang</th>
                <th className="py-1.5 text-right">Zinsen</th>
                <th className="py-1.5 text-right">Tilgung</th>
                <th className="py-1.5 text-right">Rate</th>
                <th className="py-1.5 text-right">Restschuld Ende</th>
              </tr>
            </thead>
            <tbody>
              {yearTable.rows.map((row) => (
                <tr
                  key={row.year}
                  className={`border-b border-black/[0.04] ${row.isFixedRateEndYear ? 'bg-blue-50/60' : ''} ${
                    row.isCurrentYear ? 'font-semibold' : ''
                  }`}
                >
                  <td className="py-1.5 text-text-primary">
                    {row.year}
                    {row.isFixedRateEndYear && (
                      <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                        Zinsbindungsende
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 text-right font-mono">{formatCurrency(row.remainingDebtStart)}</td>
                  <td className="py-1.5 text-right font-mono text-negative">{formatCurrency(row.interest)}</td>
                  <td className="py-1.5 text-right font-mono text-negative">{formatCurrency(row.principal)}</td>
                  <td className="py-1.5 text-right font-mono">{formatCurrency(row.payment)}</td>
                  <td className="py-1.5 text-right font-mono">{formatCurrency(row.remainingDebtEnd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {yearTable.rows.some((row) => row.isPostFixedRatePeriod) && (
          <p className="mt-3 text-xs text-warning">
            ⚠ Ab {monthYearLabel(overview.fixedRateEndDate)}: Anschlussfinanzierung noch offen — Konditionen können sich ändern.
          </p>
        )}
      </GlassCard>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/property/finanzierung/FinanzierungTab.tsx
git commit -m "feat(finanzierung): add FinanzierungTab component"
```

---

### Task 6: Wire the Finanzierung page

**Files:**
- Modify: `web/app/(app)/properties/[id]/finanzierung/page.tsx`

- [ ] **Step 1: Implement**

Replace the full contents of `web/app/(app)/properties/[id]/finanzierung/page.tsx` with:

```typescript
import { notFound } from 'next/navigation';
import { getPropertyDetail } from '@/lib/data/propertyDetail';
import { computeFinancingOverview, computeAmortizationYearTable } from '@/lib/data/propertyFinancing';
import { FinanzierungTab } from '@/components/property/finanzierung/FinanzierungTab';

export default async function FinanzierungTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPropertyDetail(id);
  if (!detail) notFound();

  const today = new Date();
  const overview = computeFinancingOverview(detail.property, today);
  const yearTable = computeAmortizationYearTable(detail.property, today);

  return <FinanzierungTab overview={overview} yearTable={yearTable} />;
}
```

- [ ] **Step 2: Commit**

```bash
git add "web/app/(app)/properties/[id]/finanzierung/page.tsx"
git commit -m "feat(property-detail): wire up the Finanzierung tab"
```

---

### Task 7: `updateProperty` server action

**Files:**
- Modify: `web/lib/data/propertyActions.ts`
- Test: none (thin Supabase wrapper — same as the existing untested `deleteProperty`/`createProperty` in this file; covered by Task 12's manual QA instead)

Editing any field in Immobiliendaten can affect any of the other five tabs (Übersicht, Verlauf, Cashflow, Steuer, Finanzierung all read from the same `properties` row), so this revalidates the whole `/properties/[id]` **layout** subtree in one call — the first use of `revalidatePath`'s `'layout'` mode in this codebase (the existing Verlauf actions list each affected path individually because they only ever touch two of the six tabs; a property-wide edit touching all of them makes the layout-level call the more direct match for what actually changed).

- [ ] **Step 1: Implement**

In `web/lib/data/propertyActions.ts`, change the type import line to also bring in `TablesUpdate`:

```typescript
import type { TablesInsert, TablesUpdate } from '@/lib/supabase/types';
```

Add to the end of the file:

```typescript
/** Applies a partial update to a property — used by the Immobiliendaten tab's auto-save. */
export async function updateProperty(propertyId: string, patch: TablesUpdate<'properties'>): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('properties').update(patch).eq('id', propertyId);
  if (error) throw error;
  revalidatePath('/');
  revalidatePath(`/properties/${propertyId}`, 'layout');
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/data/propertyActions.ts
git commit -m "feat(property-actions): add updateProperty"
```

---

### Task 8: Export `n`/`nOrNull` from `wizardLogic.ts`

**Files:**
- Modify: `web/lib/wizard/wizardLogic.ts`

`mapEditFormValuesToPropertyUpdate` (Task 9) needs the exact same NaN/null guards `mapToPropertyInsert` already uses, for the 3 new Annahmen fields. Exporting these two small existing helpers avoids re-implementing (and risking drift from) logic that's already written and tested.

- [ ] **Step 1: Implement**

In `web/lib/wizard/wizardLogic.ts`, change:

```typescript
function n(value: number): number {
  return Number.isNaN(value) ? 0 : value;
}

function nOrNull(value: number | null): number | null {
  return value === null || Number.isNaN(value) ? null : value;
}
```

to:

```typescript
export function n(value: number): number {
  return Number.isNaN(value) ? 0 : value;
}

export function nOrNull(value: number | null): number | null {
  return value === null || Number.isNaN(value) ? null : value;
}
```

- [ ] **Step 2: Run the existing wizard test suite to confirm nothing broke**

Run: `cd web && npx vitest run tests/wizard/wizardLogic.test.ts`
Expected: PASS (unchanged — this is a visibility change only, not a behavior change).

- [ ] **Step 3: Commit**

```bash
git add web/lib/wizard/wizardLogic.ts
git commit -m "refactor(wizard): export n/nOrNull for reuse in propertyEditLogic"
```

---

### Task 9: `lib/wizard/propertyEditLogic.ts`

**Files:**
- Create: `web/lib/wizard/propertyEditLogic.ts`
- Test: `web/tests/wizard/propertyEditLogic.test.ts`

`PropertyEditFormValues` extends `WizardFormValues` with the three Annahmen-only fields. `mapPropertyToEditFormValues` is the reverse of `mapToPropertyInsert` (DB row → form values, needed because — unlike the wizard, which always starts blank — this form is pre-filled from an existing property). `mapEditFormValuesToPropertyUpdate` reuses `mapToPropertyInsert` directly (an Insert-shaped object is assignable to `TablesUpdate`) and adds the 3 new fields.

- [ ] **Step 1: Write the failing test**

Create `web/tests/wizard/propertyEditLogic.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { fixtures as f } from '../calculations/fixtures';
import type { Database } from '@/lib/supabase/types';
import { mapPropertyToEditFormValues, mapEditFormValuesToPropertyUpdate, type PropertyEditFormValues } from '@/lib/wizard/propertyEditLogic';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

function makeProperty(overrides: Partial<PropertyRow> = {}): PropertyRow {
  return {
    id: 'prop-1',
    user_id: 'user-1',
    name: 'ETW Dresden Neustadt',
    address: 'Dresdner Str. 12',
    city: 'Dresden',
    state: 'Sachsen',
    postal_code: '01099',
    property_type: 'apartment',
    acquisition_type: 'kauf',
    year_built: 1998,
    notes: 'Ruhige Lage',
    living_area_sqm: 68,
    usable_area_sqm: null,
    land_area_sqm: null,
    rooms: 3,
    bedrooms: null,
    bathrooms: null,
    floor_level: null,
    has_balcony: true,
    has_terrace: false,
    has_garden: false,
    has_basement: false,
    basement_size_sqm: null,
    has_fitted_kitchen: true,
    parking_type: 'tiefgarage',
    parking_count: 1,
    heating_type: 'gas',
    energy_efficiency_class: 'c',
    condition: 'gepflegt',
    last_renovation_year: 2015,
    purchase_date: '2025-10-01',
    economic_transfer_date: '2026-02-01',
    purchase_price_unit: f.purchasePriceUnit,
    purchase_price_parking: f.purchasePriceParking,
    land_transfer_tax: f.landTransferTax,
    notary_costs: f.notaryCosts,
    land_registry_costs: f.landRegistryCosts,
    agent_fee: f.agentFee,
    appraisal_costs: f.appraisalCosts,
    renovation_modernization_costs: f.renovationModernizationCosts,
    renovation_afa_eligible: f.renovationAfaEligible,
    cold_rent_monthly: f.coldRentMonthly,
    warmmiete_monthly: 1100,
    parking_rent_monthly: f.parkingRentMonthly,
    other_income_monthly: 0,
    vacancy_rate_assumption: 0.05,
    market_rent_per_sqm: 15.5,
    current_market_value: 320_000,
    hoa_fee_total_monthly: f.hoaFeeTotalMonthly,
    is_hoa_unit_split: true,
    hoa_fee_recoverable_monthly: f.hoaFeeRecoverableMonthly,
    hoa_fee_maintenance_reserve_monthly: f.maintenanceReserveMonthly,
    property_tax_annual: f.propertyTaxAnnual,
    property_management_annual: f.propertyManagementAnnual,
    property_insurance_annual: 0,
    other_costs_monthly: 0,
    hoa_fee_parking_total_monthly: 30,
    is_hoa_parking_split: false,
    hoa_fee_parking_recoverable_monthly: 0,
    hoa_fee_parking_maintenance_reserve_monthly: 0,
    property_tax_parking_annual: 0,
    loan_amount: f.loanAmount,
    interest_rate: f.interestRate,
    amortization_rate: f.amortizationRate,
    fixed_interest_period_years: 10,
    loan_start_date: '2025-10-01',
    monthly_mortgage: f.monthlyMortgage,
    equity_contributed: 68_000,
    broker_commission_agreement: 0,
    land_value: f.landValue,
    building_value: f.buildingValue,
    depreciation_rate: f.depreciationRate,
    marginal_tax_rate: f.marginalTaxRate,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('mapPropertyToEditFormValues', () => {
  it('maps every snake_case DB column to its camelCase form field', () => {
    const property = makeProperty();
    const values = mapPropertyToEditFormValues(property);
    expect(values.name).toBe('ETW Dresden Neustadt');
    expect(values.purchasePriceUnit).toBe(f.purchasePriceUnit);
    expect(values.parkingType).toBe('tiefgarage');
    expect(values.vacancyRateAssumption).toBe(0.05);
    expect(values.marketRentPerSqm).toBe(15.5);
    expect(values.currentMarketValue).toBe(320_000);
  });

  it('a round trip through mapEditFormValuesToPropertyUpdate reproduces the original core fields', () => {
    const property = makeProperty();
    const values = mapPropertyToEditFormValues(property);
    const update = mapEditFormValuesToPropertyUpdate(values);
    expect(update.name).toBe(property.name);
    expect(update.purchase_price_unit).toBe(property.purchase_price_unit);
    expect(update.loan_amount).toBe(property.loan_amount);
    expect(update.vacancy_rate_assumption).toBe(property.vacancy_rate_assumption);
    expect(update.market_rent_per_sqm).toBe(property.market_rent_per_sqm);
    expect(update.current_market_value).toBe(property.current_market_value);
  });
});

describe('mapEditFormValuesToPropertyUpdate', () => {
  it('converts NaN/null optional Annahmen fields to null, guards non-nullable numerics against NaN', () => {
    const property = makeProperty();
    const values: PropertyEditFormValues = {
      ...mapPropertyToEditFormValues(property),
      marketRentPerSqm: NaN,
      currentMarketValue: null,
      vacancyRateAssumption: NaN,
    };
    const update = mapEditFormValuesToPropertyUpdate(values);
    expect(update.market_rent_per_sqm).toBeNull();
    expect(update.current_market_value).toBeNull();
    expect(update.vacancy_rate_assumption).toBe(0);
  });

  it('zeroes out parking fields when parkingType is nicht_vorhanden (reuses mapToPropertyInsert behavior)', () => {
    const property = makeProperty();
    const values: PropertyEditFormValues = {
      ...mapPropertyToEditFormValues(property),
      parkingType: 'nicht_vorhanden',
    };
    const update = mapEditFormValuesToPropertyUpdate(values);
    expect(update.purchase_price_parking).toBe(0);
    expect(update.parking_rent_monthly).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/wizard/propertyEditLogic.test.ts`
Expected: FAIL — cannot find module `@/lib/wizard/propertyEditLogic`.

- [ ] **Step 3: Implement**

Create `web/lib/wizard/propertyEditLogic.ts`:

```typescript
import { mapToPropertyInsert, n, nOrNull, type WizardFormValues } from './wizardLogic';
import type { Database, TablesUpdate } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

export interface PropertyEditFormValues extends WizardFormValues {
  vacancyRateAssumption: number;
  marketRentPerSqm: number | null;
  currentMarketValue: number | null;
}

/**
 * Reverse of mapToPropertyInsert — a real properties row -> form values. The
 * wizard never needs this (it always starts from makeWizardDefaultValues);
 * the Immobiliendaten edit form always starts from an existing property.
 * firstStatus* fields are Status-Onboarding-only (wizard step 8) and aren't
 * edited here (status is managed in the Verlauf tab) — filled with inert
 * defaults purely so this object satisfies WizardFormValues's shape.
 */
export function mapPropertyToEditFormValues(property: PropertyRow): PropertyEditFormValues {
  return {
    name: property.name,
    address: property.address,
    city: property.city,
    postalCode: property.postal_code,
    state: property.state,
    propertyType: property.property_type,
    acquisitionType: property.acquisition_type,
    yearBuilt: property.year_built,
    notes: property.notes,

    livingAreaSqm: property.living_area_sqm,
    usableAreaSqm: property.usable_area_sqm,
    rooms: property.rooms,
    hasBalcony: property.has_balcony,
    hasTerrace: property.has_terrace,
    hasGarden: property.has_garden,
    hasBasement: property.has_basement,
    hasFittedKitchen: property.has_fitted_kitchen,
    parkingType: property.parking_type,
    heatingType: property.heating_type,
    energyEfficiencyClass: property.energy_efficiency_class,
    condition: property.condition,
    lastRenovationYear: property.last_renovation_year,

    purchaseDate: property.purchase_date,
    economicTransferDate: property.economic_transfer_date,
    purchasePriceUnit: property.purchase_price_unit,
    purchasePriceParking: property.purchase_price_parking,
    landTransferTax: property.land_transfer_tax,
    notaryCosts: property.notary_costs,
    landRegistryCosts: property.land_registry_costs,
    agentFee: property.agent_fee,
    appraisalCosts: property.appraisal_costs,
    renovationModernizationCosts: property.renovation_modernization_costs,
    renovationAfaEligible: property.renovation_afa_eligible,

    coldRentMonthly: property.cold_rent_monthly,
    warmmieteMonthly: property.warmmiete_monthly,
    parkingRentMonthly: property.parking_rent_monthly,
    otherIncomeMonthly: property.other_income_monthly,

    hoaFeeTotalMonthly: property.hoa_fee_total_monthly,
    isHoaUnitSplit: property.is_hoa_unit_split,
    hoaFeeRecoverableMonthly: property.hoa_fee_recoverable_monthly,
    hoaFeeMaintenanceReserveMonthly: property.hoa_fee_maintenance_reserve_monthly,
    propertyTaxAnnual: property.property_tax_annual,
    propertyManagementAnnual: property.property_management_annual,
    propertyInsuranceAnnual: property.property_insurance_annual,
    otherCostsMonthly: property.other_costs_monthly,
    hoaFeeParkingTotalMonthly: property.hoa_fee_parking_total_monthly,
    isHoaParkingSplit: property.is_hoa_parking_split,
    hoaFeeParkingRecoverableMonthly: property.hoa_fee_parking_recoverable_monthly,
    hoaFeeParkingMaintenanceReserveMonthly: property.hoa_fee_parking_maintenance_reserve_monthly,
    propertyTaxParkingAnnual: property.property_tax_parking_annual,

    loanAmount: property.loan_amount,
    interestRate: property.interest_rate,
    amortizationRate: property.amortization_rate,
    fixedInterestPeriodYears: property.fixed_interest_period_years,
    loanStartDate: property.loan_start_date,
    monthlyMortgage: property.monthly_mortgage,
    equityContributed: property.equity_contributed,
    brokerCommissionAgreement: property.broker_commission_agreement,

    buildingValue: property.building_value,
    landValue: property.land_value,
    depreciationRate: property.depreciation_rate,
    marginalTaxRate: property.marginal_tax_rate,

    firstStatusDate: property.economic_transfer_date,
    firstStatus: 'vermietet',
    firstStatusIncome: null,
    firstStatusNotes: '',

    vacancyRateAssumption: property.vacancy_rate_assumption,
    marketRentPerSqm: property.market_rent_per_sqm,
    currentMarketValue: property.current_market_value,
  };
}

/** mapToPropertyInsert's Omit<TablesInsert<'properties'>, 'user_id'> return is assignable to TablesUpdate<'properties'>. */
export function mapEditFormValuesToPropertyUpdate(values: PropertyEditFormValues): TablesUpdate<'properties'> {
  return {
    ...mapToPropertyInsert(values),
    vacancy_rate_assumption: n(values.vacancyRateAssumption),
    market_rent_per_sqm: nOrNull(values.marketRentPerSqm),
    current_market_value: nOrNull(values.currentMarketValue),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/wizard/propertyEditLogic.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/wizard/propertyEditLogic.ts web/tests/wizard/propertyEditLogic.test.ts
git commit -m "feat(immobiliendaten): add propertyEditLogic (form <-> properties row mapping)"
```

---

### Task 10: `StepAnnahmen` section

**Files:**
- Create: `web/components/property/immobiliendaten/StepAnnahmen.tsx`

The one form section with no wizard equivalent to reuse — `vacancyRateAssumption`/`marketRentPerSqm`/`currentMarketValue` per `spec-immobiliendaten-tab.md`'s Annahmen section, including the /m² ↔ Gesamt market-value switcher (in-memory only, per spec).

- [ ] **Step 1: Implement**

Create `web/components/property/immobiliendaten/StepAnnahmen.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useFormContext, useWatch, type Control } from 'react-hook-form';
import { PercentField } from '@/components/ui/PercentField';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { PropertyEditFormValues } from '@/lib/wizard/propertyEditLogic';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

function safeNum(value: number | null | undefined): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
}

export function StepAnnahmen({ property, control }: { property: PropertyRow; control: Control<PropertyEditFormValues> }) {
  const { register, setValue } = useFormContext<PropertyEditFormValues>();
  const values = useWatch({ control });
  const [marketValueMode, setMarketValueMode] = useState<'perSqm' | 'total'>('total');

  const livingAreaSqm = safeNum(property.living_area_sqm);
  const coldRentMonthly = safeNum(property.cold_rent_monthly);
  const marketRentPerSqm = safeNum(values.marketRentPerSqm);
  const rentDeviation =
    marketRentPerSqm > 0 && livingAreaSqm > 0 ? (coldRentMonthly / livingAreaSqm - marketRentPerSqm) / marketRentPerSqm : null;

  const currentMarketValue = values.currentMarketValue ?? null;
  const totalPurchasePrice = safeNum(property.purchase_price_unit) + safeNum(property.purchase_price_parking);
  const valueGain = currentMarketValue !== null ? currentMarketValue - totalPurchasePrice : null;
  const valueGainPercent = valueGain !== null && totalPurchasePrice > 0 ? valueGain / totalPurchasePrice : null;
  const marketValuePerSqmDisplay = currentMarketValue !== null && livingAreaSqm > 0 ? currentMarketValue / livingAreaSqm : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Werte, die keine Kaufdaten sind, aber KPI-Berechnungen und Vergleiche beeinflussen.
      </p>

      <PercentField label="Leerstandsquote" name="vacancyRateAssumption" control={control} hint="z.B. 3% — für NOI, Nettorendite" />

      <CurrencyField
        label="Marktmiete/m²"
        name="marketRentPerSqm"
        register={register}
        hint="informativ — Vergleich mit eigener Kaltmiete"
      />
      {rentDeviation !== null && (
        <p className="text-xs text-text-dim">
          Deine Miete liegt {formatPercent(Math.abs(rentDeviation))} {rentDeviation >= 0 ? 'über' : 'unter'} Markt
        </p>
      )}

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[13px] font-medium text-text-secondary">Aktueller Marktwert</span>
          <div className="inline-flex rounded-md border border-black/10 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMarketValueMode('perSqm')}
              className={`rounded px-2 py-0.5 ${marketValueMode === 'perSqm' ? 'bg-accent text-white' : 'text-text-secondary'}`}
            >
              /m²
            </button>
            <button
              type="button"
              onClick={() => setMarketValueMode('total')}
              className={`rounded px-2 py-0.5 ${marketValueMode === 'total' ? 'bg-accent text-white' : 'text-text-secondary'}`}
            >
              Gesamt
            </button>
          </div>
        </div>
        {marketValueMode === 'total' ? (
          <CurrencyField label="Gesamt" name="currentMarketValue" register={register} />
        ) : (
          <label className="block">
            <span className="sr-only">Marktwert pro m²</span>
            <div className="mt-1 flex items-center rounded-md border border-black/10 bg-white/90 px-3">
              <input
                type="number"
                step="0.01"
                value={marketValuePerSqmDisplay ?? ''}
                onChange={(e) => {
                  const perSqm = e.target.value === '' ? null : Number(e.target.value);
                  setValue('currentMarketValue', perSqm === null ? null : perSqm * livingAreaSqm, { shouldDirty: true });
                }}
                className="w-full bg-transparent py-2 text-sm text-text-primary outline-none"
              />
              <span className="text-sm text-text-dim">€/m²</span>
            </div>
          </label>
        )}
        {valueGain !== null && valueGainPercent !== null && (
          <p className="mt-1 text-xs text-text-dim">
            Wertsteigerung: {formatCurrency(valueGain)} ({formatPercent(valueGainPercent)}) seit Kauf
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/property/immobiliendaten/StepAnnahmen.tsx
git commit -m "feat(immobiliendaten): add StepAnnahmen section"
```

---

### Task 11: `GefahrenzoneSection`

**Files:**
- Create: `web/components/property/immobiliendaten/GefahrenzoneSection.tsx`

Reuses the existing `deleteProperty` action (already used by the portfolio grid's `DeletePropertyButton`); the difference here is redirecting to `/` afterward, since we're deleting the very property whose page we're on.

- [ ] **Step 1: Implement**

Create `web/components/property/immobiliendaten/GefahrenzoneSection.tsx`:

```typescript
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteProperty } from '@/lib/data/propertyActions';

export function GefahrenzoneSection({ propertyId, propertyName }: { propertyId: string; propertyName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    const confirmed = window.confirm(
      `${propertyName} löschen?\n\nDiese Immobilie und alle zugehörigen Daten (Statusverlauf, außergewöhnliche Kosten) werden unwiderruflich gelöscht.`
    );
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteProperty(propertyId);
        router.push('/');
      } catch {
        setError('Löschen fehlgeschlagen — bitte erneut versuchen.');
      }
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-secondary">
        Diese Immobilie und alle zugehörigen Daten (Statusverlauf, außergewöhnliche Kosten) werden unwiderruflich gelöscht.
      </p>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="rounded-md border border-negative px-4 py-2 text-sm font-semibold text-negative disabled:opacity-50"
      >
        Immobilie löschen
      </button>
      {error && (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/property/immobiliendaten/GefahrenzoneSection.tsx
git commit -m "feat(immobiliendaten): add GefahrenzoneSection"
```

---

### Task 12: `PropertyEditForm` — the tab shell with left nav and auto-save

**Files:**
- Create: `web/components/property/immobiliendaten/PropertyEditForm.tsx`

Wires the reused `Step*` wizard components, the two new sections (Tasks 10/11), a free-jump left section nav (no Weiter/Zurück gating, unlike the wizard), and a 600ms-debounced auto-save on any field change.

- [ ] **Step 1: Implement**

Create `web/components/property/immobiliendaten/PropertyEditForm.tsx`:

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import {
  mapPropertyToEditFormValues,
  mapEditFormValuesToPropertyUpdate,
  type PropertyEditFormValues,
} from '@/lib/wizard/propertyEditLogic';
import { updateProperty } from '@/lib/data/propertyActions';
import { StepStammdaten } from '@/components/wizard/steps/StepStammdaten';
import { StepObjektdaten } from '@/components/wizard/steps/StepObjektdaten';
import { StepKauf } from '@/components/wizard/steps/StepKauf';
import { StepEinnahmen } from '@/components/wizard/steps/StepEinnahmen';
import { StepKosten } from '@/components/wizard/steps/StepKosten';
import { StepFinanzierung } from '@/components/wizard/steps/StepFinanzierung';
import { StepAfaSteuer } from '@/components/wizard/steps/StepAfaSteuer';
import { StepAnnahmen } from './StepAnnahmen';
import { GefahrenzoneSection } from './GefahrenzoneSection';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

const SECTIONS = [
  { key: 'stammdaten', label: 'Stammdaten' },
  { key: 'objektdaten', label: 'Objektdaten' },
  { key: 'kauf', label: 'Kauf' },
  { key: 'einnahmen', label: 'Einnahmen' },
  { key: 'annahmen', label: 'Annahmen' },
  { key: 'kosten', label: 'Kosten' },
  { key: 'finanzierung', label: 'Finanzierung' },
  { key: 'afaSteuer', label: 'AfA & Steuer' },
  { key: 'gefahrenzone', label: 'Gefahrenzone' },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const AUTOSAVE_DEBOUNCE_MS = 600;

export function PropertyEditForm({ propertyId, property }: { propertyId: string; property: PropertyRow }) {
  const [activeSection, setActiveSection] = useState<SectionKey>('stammdaten');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<PropertyEditFormValues>({ defaultValues: mapPropertyToEditFormValues(property) });
  const { watch, control } = form;

  useEffect(() => {
    const subscription = watch((values) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSaveState('saving');
        updateProperty(propertyId, mapEditFormValuesToPropertyUpdate(values as PropertyEditFormValues))
          .then(() => setSaveState('saved'))
          .catch(() => setSaveState('error'));
      }, AUTOSAVE_DEBOUNCE_MS);
    });
    return () => {
      subscription.unsubscribe();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [watch, propertyId]);

  const activeLabel = SECTIONS.find((s) => s.key === activeSection)!.label;

  return (
    <FormProvider {...form}>
      <div className="flex gap-6">
        <nav className="w-48 shrink-0 space-y-1">
          {SECTIONS.map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSection(section.key)}
              className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
                section.key === activeSection ? 'bg-accent font-semibold text-white' : 'text-text-secondary hover:bg-black/[0.04]'
              }`}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <div className="glass-card flex-1 p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold text-text-secondary">{activeLabel}</p>
            <SaveStatus state={saveState} />
          </div>

          {activeSection === 'stammdaten' && <StepStammdaten />}
          {activeSection === 'objektdaten' && <StepObjektdaten />}
          {activeSection === 'kauf' && <StepKauf />}
          {activeSection === 'einnahmen' && <StepEinnahmen />}
          {activeSection === 'annahmen' && <StepAnnahmen property={property} control={control} />}
          {activeSection === 'kosten' && <StepKosten />}
          {activeSection === 'finanzierung' && <StepFinanzierung />}
          {activeSection === 'afaSteuer' && <StepAfaSteuer />}
          {activeSection === 'gefahrenzone' && <GefahrenzoneSection propertyId={propertyId} propertyName={property.name} />}
        </div>
      </div>
    </FormProvider>
  );
}

function SaveStatus({ state }: { state: SaveState }) {
  if (state === 'idle') return null;
  if (state === 'saving') return <span className="text-xs text-text-dim">Speichert…</span>;
  if (state === 'error') return <span className="text-xs text-negative">Speichern fehlgeschlagen</span>;
  return <span className="text-xs text-positive">Gespeichert</span>;
}
```

Note: `StepStammdaten`/`StepObjektdaten`/`StepKauf`/`StepEinnahmen`/`StepKosten`/`StepFinanzierung`/`StepAfaSteuer` internally call `useFormContext<WizardFormValues>()` — this is a pure TypeScript-level cast over React Context (react-hook-form does no runtime type checking), so it works correctly against the actual `PropertyEditFormValues`-typed `FormProvider` above it, since `PropertyEditFormValues extends WizardFormValues` (a strict superset — every field the Step components read is present).

- [ ] **Step 2: Commit**

```bash
git add web/components/property/immobiliendaten/PropertyEditForm.tsx
git commit -m "feat(immobiliendaten): add PropertyEditForm with section nav and auto-save"
```

---

### Task 13: Wire the Immobiliendaten page

**Files:**
- Modify: `web/app/(app)/properties/[id]/immobiliendaten/page.tsx`

- [ ] **Step 1: Implement**

Replace the full contents of `web/app/(app)/properties/[id]/immobiliendaten/page.tsx` with:

```typescript
import { notFound } from 'next/navigation';
import { getPropertyDetail } from '@/lib/data/propertyDetail';
import { PropertyEditForm } from '@/components/property/immobiliendaten/PropertyEditForm';

export default async function ImmobiliendatenTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPropertyDetail(id);
  if (!detail) notFound();

  return <PropertyEditForm propertyId={id} property={detail.property} />;
}
```

- [ ] **Step 2: Commit**

```bash
git add "web/app/(app)/properties/[id]/immobiliendaten/page.tsx"
git commit -m "feat(property-detail): wire up the Immobiliendaten tab"
```

---

### Task 14: Full-suite verification and manual QA

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated test suite**

Run: `cd web && npm test`
Expected: All test files PASS, no regressions.

- [ ] **Step 2: Run the linter**

Run: `cd web && npm run lint`
Expected: No errors.

- [ ] **Step 3: Manual walkthrough**

Run: `cd web && npm run dev`

Walk through, on an existing property with a loan (`loan_amount > 0`):

1. `/properties/[id]/finanzierung`:
   - Section 1 shows all 6 fields with sensible values; "Zinsbindung bis" shows a MM/YYYY + "noch X Jahre".
   - Section 2's table starts at the loan start year, ends near payoff (not 40 rows of near-zero garbage); the fixed-rate-end year is visually highlighted and badged; every year after it shows the Anschlussfinanzierung warning below the table; no warning appears if today is still within the fixed-rate period.
   - On a property with `loan_amount = 0`: tab shows "Keine Finanzierung erfasst." and the Immobiliendaten pointer, no table.
2. `/properties/[id]/immobiliendaten`:
   - All 9 sections are clickable via the left nav, in any order, with no blocking.
   - Stammdaten/Objektdaten/Kauf/Einnahmen/Kosten/Finanzierung/AfA & Steuer show the property's real current values pre-filled (not wizard defaults).
   - Edit a field (e.g. Notizen) → after ~600ms "Speichert…" then "Gespeichert" appears; reload the page → the edit persisted.
   - Annahmen: set a Marktmiete/m², confirm the "Deine Miete liegt X% über/unter Markt" line appears with the correct direction; toggle the Marktwert /m² ↔ Gesamt switcher and confirm the displayed number converts correctly and the underlying saved value (check via reload) is consistent between modes; set a Marktwert above the purchase price and confirm "Wertsteigerung: +…" appears.
   - Editing a Finanzierung field here (e.g. Zinssatz) and then checking the Finanzierung tab and Übersicht tab reflects the change (confirms the layout-wide `revalidatePath`).
   - Gefahrenzone: click "Immobilie löschen", cancel the confirm dialog → nothing happens; on a disposable test property, confirm the dialog → redirected to `/` and the property is gone from the portfolio grid.
3. Stop the dev server (`Ctrl+C`).

- [ ] **Step 4: Report results**

If anything in Step 3 doesn't match, fix it (with a matching test update where the mismatch is in a pure-calculation or data-layer file) before considering this plan done. Once everything checks out, Plans 4, 5, and 6 together complete the full Property Detail page — all six tabs (Übersicht, Verlauf, Cashflow, Steuer, Finanzierung, Immobiliendaten) are real.
