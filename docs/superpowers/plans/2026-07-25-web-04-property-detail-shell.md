# Property Detail — Shell, Übersicht & Verlauf (Plan 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/properties/[id]` placeholder with a real tabbed Property Detail page: a shared shell (name, back-link, tab navigation) plus two fully working tabs — **Übersicht** (KPI bar + 4 cards) and **Verlauf** (status-history + außergewöhnliche-Kosten feed). The remaining four tabs (Cashflow, Steuer, Finanzierung, Immobiliendaten) get a one-line placeholder so the tab bar doesn't 404 — they're Plan 5 (Cashflow/Steuer) and Plan 6 (Finanzierung/Immobiliendaten/Edit-Flow).

**Architecture:** Extend the existing pure calculation layer (`lib/calculations/*`, built in Plan 1) with the handful of formulas Übersicht needs that don't exist yet (actual vacancy rate since acquisition, a full-year cashflow sum for accurate Cash-on-Cash). Compose those into a new `lib/data/propertyOverview.ts` that sits alongside the already-existing `lib/data/propertySummary.ts` (used by the portfolio grid since Plan 2) — same pattern, wider surface. Verlauf introduces two new CRUD resources (`status_entries`, `extraordinary_costs`, both already in the Plan-1 schema) via server actions, and a small reusable `Modal` primitive for their add/edit sheets (nothing like it exists yet — the wizard is a full-page flow, not a dialog).

**Tech Stack:** Next.js App Router (RSC + Server Actions), Supabase, react-hook-form, Tailwind, Vitest.

**Ground truth note:** `docs/specs/spec-verlauf-tab.md`'s `ExtraordinaryCost` interface (`date`, `description`, `isDeductible`, `notes`) is the *idealized* pre-implementation model. The real table (`web/supabase/migrations/20260724120000_initial_schema.sql`) — already built in Plan 1 and not something this plan revisits — uses `cost_month`, `amount`, `category` (enum), `description_text` (nullable), `is_deductible`. This plan follows the real schema throughout, not the spec's pseudocode.

---

### Task 1: `ownershipAndVacancyDaysSinceTransfer` (actual-vacancy building block)

**Files:**
- Modify: `web/lib/calculations/statusPeriodCalculator.ts`
- Test: `web/tests/calculations/statusPeriodCalculator.test.ts`

Per `docs/specs/spec-calculations.md`: `tatsächlicheLeerstandsquote = leerstandsTageGesamt / gesamtEigentumstage`, both counted from `economicTransferDate` to today. This needs a day-accurate sum across however many months have passed since acquisition — the existing `leerstandDayFraction`/`ownershipDayFraction` are single-month functions, so this task adds the summing wrapper, reusing the same ownerFraction-weighting `taxCalculator.annualTaxableIncome` already uses for its acquisition-year proration.

- [ ] **Step 1: Write the failing test**

Add to the top of `web/tests/calculations/statusPeriodCalculator.test.ts` (alongside the existing imports):

```typescript
import { ownershipAndVacancyDaysSinceTransfer } from '@/lib/calculations/statusPeriodCalculator';
```

Add this `describe` block at the end of the file (after the existing closing `});`):

```typescript
describe('ownershipAndVacancyDaysSinceTransfer', () => {
  it('sums ownership and leerstand days across multiple full months', () => {
    // Jan: vermietet (31 days). Feb: leerstand (28 days, 2026 not a leap year).
    // Mar: vermietet again. today = Mar 31 -> lastMonth = Mar 1, so Jan/Feb/Mar all included.
    const history = [
      entry('vermietet', 2026, 1, 1),
      entry('leerstand', 2026, 2, 1),
      entry('vermietet', 2026, 3, 1),
    ];
    const result = ownershipAndVacancyDaysSinceTransfer(history, makeDate(2026, 1, 1), makeDate(2026, 3, 31));
    expect(result.ownershipDays).toBe(31 + 28 + 31);
    expect(result.leerstandDays).toBe(28);
  });

  it('a mid-month acquisition only counts owned days in that first month', () => {
    // Acquisition Feb 15 (28-day month) -> 14 owned days in Feb, all leerstand.
    const history = [entry('leerstand', 2026, 2, 15)];
    const result = ownershipAndVacancyDaysSinceTransfer(history, makeDate(2026, 2, 15), makeDate(2026, 2, 28));
    expect(result.ownershipDays).toBe(14);
    expect(result.leerstandDays).toBe(14);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/calculations/statusPeriodCalculator.test.ts`
Expected: FAIL — `ownershipAndVacancyDaysSinceTransfer is not a function` (or a TS import error).

- [ ] **Step 3: Implement**

In `web/lib/calculations/statusPeriodCalculator.ts`, update the import line at the top to add `addMonths`:

```typescript
import { firstDayOfMonth, daysInMonth, dayOfMonth, yearOf, monthOf, makeDate, addMonths } from './dateHelpers';
```

Add at the end of the file:

```typescript
export interface OwnershipVacancyDays {
  ownershipDays: number;
  leerstandDays: number;
}

/**
 * Cumulative ownership days and (ownership-weighted) leerstand days from
 * economicTransferDate's month through today's month — feeds
 * kpiCalculator.actualVacancyRate. Uses the same ownerFraction-weighting as
 * taxCalculator.annualTaxableIncome so a mid-month acquisition month doesn't
 * overcount leerstand for days before the transfer.
 */
export function ownershipAndVacancyDaysSinceTransfer(
  statusHistory: StatusEntry[],
  economicTransferDate: Date,
  today: Date
): OwnershipVacancyDays {
  let ownershipDays = 0;
  let leerstandDays = 0;
  let month = firstDayOfMonth(economicTransferDate);
  const lastMonth = firstDayOfMonth(today);

  while (month.getTime() <= lastMonth.getTime()) {
    const totalDays = daysInMonth(month);
    const ownerFraction = ownershipDayFraction(month, economicTransferDate);
    const vacancyFraction = leerstandDayFraction(month, statusHistory, today);
    ownershipDays += ownerFraction * totalDays;
    leerstandDays += ownerFraction * vacancyFraction * totalDays;
    month = addMonths(month, 1);
  }

  return { ownershipDays: Math.round(ownershipDays), leerstandDays: Math.round(leerstandDays) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/calculations/statusPeriodCalculator.test.ts`
Expected: PASS (all tests in the file, old and new).

- [ ] **Step 5: Commit**

```bash
git add web/lib/calculations/statusPeriodCalculator.ts web/tests/calculations/statusPeriodCalculator.test.ts
git commit -m "feat(calculations): add ownershipAndVacancyDaysSinceTransfer"
```

---

### Task 2: `actualVacancyRate` and `benchmarkColor` (kpiCalculator.ts)

**Files:**
- Modify: `web/lib/calculations/kpiCalculator.ts`
- Test: `web/tests/calculations/kpiCalculator.test.ts`

`benchmarkColor` is the pure function behind every KPI chip in the Übersicht tab — it turns a raw value into `'green' | 'orange' | 'red'` per the 3-tier table in `docs/specs/spec-overview-tab.md`.

- [ ] **Step 1: Write the failing test**

Add to `web/tests/calculations/kpiCalculator.test.ts`'s import block:

```typescript
import { actualVacancyRate, benchmarkColor } from '@/lib/calculations/kpiCalculator';
```

Add before the final closing `});` of the `describe('kpiCalculator', ...)` block:

```typescript
  it('actualVacancyRate', () => {
    expect(actualVacancyRate(28, 90)).toBeCloseTo(28 / 90, 4);
  });

  it('actualVacancyRate: zero ownership days returns null', () => {
    expect(actualVacancyRate(0, 0)).toBeNull();
  });

  it('benchmarkColor: grossYield thresholds (higher is better)', () => {
    expect(benchmarkColor('grossYield', 0.06)).toBe('green');
    expect(benchmarkColor('grossYield', 0.04)).toBe('orange');
    expect(benchmarkColor('grossYield', 0.02)).toBe('red');
  });

  it('benchmarkColor: ltv thresholds (lower is better)', () => {
    expect(benchmarkColor('ltv', 0.65)).toBe('green');
    expect(benchmarkColor('ltv', 0.75)).toBe('orange');
    expect(benchmarkColor('ltv', 0.85)).toBe('red');
  });

  it('benchmarkColor: dscr thresholds', () => {
    expect(benchmarkColor('dscr', 1.3)).toBe('green');
    expect(benchmarkColor('dscr', 1.1)).toBe('orange');
    expect(benchmarkColor('dscr', 0.9)).toBe('red');
  });

  it('benchmarkColor: kaufpreisfaktor thresholds (lower is better)', () => {
    expect(benchmarkColor('kaufpreisfaktor', 18)).toBe('green');
    expect(benchmarkColor('kaufpreisfaktor', 22)).toBe('orange');
    expect(benchmarkColor('kaufpreisfaktor', 30)).toBe('red');
  });

  it('benchmarkColor: null value returns null (no chip)', () => {
    expect(benchmarkColor('netYield', null)).toBeNull();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/calculations/kpiCalculator.test.ts`
Expected: FAIL — `actualVacancyRate`/`benchmarkColor` not exported.

- [ ] **Step 3: Implement**

Add to the end of `web/lib/calculations/kpiCalculator.ts`:

```typescript
/** Tatsächliche Leerstandsquote = Leerstandstage / Eigentumstage seit Erwerb. */
export function actualVacancyRate(leerstandDays: number, ownershipDays: number): number | null {
  if (ownershipDays <= 0) return null;
  return leerstandDays / ownershipDays;
}

export type BenchmarkKpi = 'grossYield' | 'netYield' | 'cashOnCash' | 'kaufpreisfaktor' | 'dscr' | 'ltv' | 'actualVacancyRate';
export type BenchmarkColor = 'green' | 'orange' | 'red';

interface BenchmarkThreshold {
  direction: 'higherIsBetter' | 'lowerIsBetter';
  green: number;
  orange: number;
}

// Per spec-overview-tab.md's 3-tier chip table (grün/orange/rot) — the richer
// 4-tier "Kontext" copy in docs/superpowers/specs/2026-06-14-kpi-benchmarks.md
// feeds the KPI info sheet's text, not this coloring.
const BENCHMARK_THRESHOLDS: Record<BenchmarkKpi, BenchmarkThreshold> = {
  grossYield: { direction: 'higherIsBetter', green: 0.05, orange: 0.03 },
  netYield: { direction: 'higherIsBetter', green: 0.04, orange: 0.02 },
  cashOnCash: { direction: 'higherIsBetter', green: 0.06, orange: 0.03 },
  kaufpreisfaktor: { direction: 'lowerIsBetter', green: 20, orange: 25 },
  dscr: { direction: 'higherIsBetter', green: 1.25, orange: 1.0 },
  ltv: { direction: 'lowerIsBetter', green: 0.7, orange: 0.8 },
  actualVacancyRate: { direction: 'lowerIsBetter', green: 0.03, orange: 0.08 },
};

/** Chip color for a KPI value. null value (no data yet) -> null (no chip rendered). */
export function benchmarkColor(kpi: BenchmarkKpi, value: number | null): BenchmarkColor | null {
  if (value === null) return null;
  const t = BENCHMARK_THRESHOLDS[kpi];
  if (t.direction === 'higherIsBetter') {
    if (value >= t.green) return 'green';
    if (value >= t.orange) return 'orange';
    return 'red';
  }
  if (value <= t.green) return 'green';
  if (value <= t.orange) return 'orange';
  return 'red';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/calculations/kpiCalculator.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/calculations/kpiCalculator.ts web/tests/calculations/kpiCalculator.test.ts
git commit -m "feat(calculations): add actualVacancyRate and benchmarkColor"
```

---

### Task 3: `annualCashflowBeforeTax` (accurate Cash-on-Cash numerator)

**Files:**
- Modify: `web/lib/calculations/cashflowCalculator.ts`
- Test: `web/tests/calculations/cashflowCalculator.test.ts`

Per `docs/specs/spec-calculations.md`: `cashOnCashReturn = cashflowAfterTaxYearly / equityContributed`, where `cashflowAfterTaxYearly = Σ cashflowNachSteuerMonatlich für alle Eigentumsmonate im Jahr`. Since `cashflowAfterTax(month) = cashflowBeforeTax(month) + taxEffectMonthly(month)`, and `Σ taxEffectMonthly` over exactly the ownership months of a year equals `taxEffectYearly` by construction, the yearly after-tax figure decomposes into `Σ cashflowBeforeTax(month) + taxEffectYearly` — this task builds the `Σ cashflowBeforeTax(month)` half (the `taxEffectYearly` half already exists as `taxCalculator.taxEffectYearly`, wired up in Task 4).

- [ ] **Step 1: Write the failing test**

Update the import block at the top of `web/tests/calculations/cashflowCalculator.test.ts` to add:

```typescript
import { annualCashflowBeforeTax } from '@/lib/calculations/cashflowCalculator';
import type { StatusEntry } from '@/lib/calculations/statusPeriodCalculator';
```

`tests/calculations/fixtures.ts` has no status-history helper (it only exports the flat `fixtures` numbers object), so add this small local helper near the top of the test file, next to the other test-only helpers:

```typescript
function statusEntry(status: StatusEntry['status'], y: number, m: number, d = 1): StatusEntry {
  return { date: makeDate(y, m, d), status, incomeActualMonthly: null };
}
```

Add before the final closing `});` of the test file:

```typescript
describe('annualCashflowBeforeTax', () => {
  it('sums cashflowBeforeTax across every ownership month of the year, including a mid-year extraordinary cost', () => {
    // Owned since 2025-01-01 -> fully owned all of 2026. Vermietet the whole time, no status
    // changes. Rent 1000/month, mortgage 600/month, running costs 150/month -> 250/month
    // before extraordinary costs. A single 500 repair lands in June.
    const extraordinaryCostsByMonth = new Map<string, number>([['2026-06', 500]]);

    const result = annualCashflowBeforeTax({
      year: 2026,
      statusHistory: [statusEntry('vermietet', 2025, 1, 1)],
      economicTransferDate: makeDate(2025, 1, 1),
      today: makeDate(2026, 12, 31),
      coldRentMonthly: 1000,
      parkingRentMonthly: 0,
      monthlyMortgage: 600,
      operatingCostsNonRecoverableMonthly: 150,
      hoaFeeRecoverableMonthly: 0,
      propertyTaxAnnual: 0,
      hoaFeeParkingNonRecoverableMonthly: 0,
      hoaFeeParkingMaintenanceReserveMonthly: 0,
      hoaFeeParkingRecoverableMonthly: 0,
      propertyTaxParkingMonthly: 0,
      extraordinaryCostsByMonth,
    });

    // 11 normal months at 250 + 1 month (June) at 250 - 500 = -250 -> 2750 - 250 = 2500
    expect(result).toBeCloseTo(2500, 1);
  });

  it('a mid-year acquisition only counts months from the transfer date onward', () => {
    const result = annualCashflowBeforeTax({
      year: 2026,
      statusHistory: [statusEntry('vermietet', 2026, 7, 1)],
      economicTransferDate: makeDate(2026, 7, 1),
      today: makeDate(2026, 12, 31),
      coldRentMonthly: 1000,
      parkingRentMonthly: 0,
      monthlyMortgage: 600,
      operatingCostsNonRecoverableMonthly: 150,
      hoaFeeRecoverableMonthly: 0,
      propertyTaxAnnual: 0,
      hoaFeeParkingNonRecoverableMonthly: 0,
      hoaFeeParkingMaintenanceReserveMonthly: 0,
      hoaFeeParkingRecoverableMonthly: 0,
      propertyTaxParkingMonthly: 0,
      extraordinaryCostsByMonth: new Map(),
    });
    // Jul-Dec = 6 months at 250 = 1500. Jan-Jun contribute 0 (ownerFraction 0).
    expect(result).toBeCloseTo(1500, 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/calculations/cashflowCalculator.test.ts`
Expected: FAIL — `annualCashflowBeforeTax` not exported.

- [ ] **Step 3: Implement**

Update the import line at the top of `web/lib/calculations/cashflowCalculator.ts`:

```typescript
import { makeDate } from './dateHelpers';
import { leerstandDayFraction, incomeForMonth, ownershipDayFraction } from './statusPeriodCalculator';
import type { StatusEntry } from './statusPeriodCalculator';
```

Add at the end of the file:

```typescript
export interface AnnualCashflowBeforeTaxInput {
  year: number;
  statusHistory: StatusEntry[];
  economicTransferDate: Date;
  today: Date;
  coldRentMonthly: number;
  parkingRentMonthly: number;
  monthlyMortgage: number;
  operatingCostsNonRecoverableMonthly: number;
  hoaFeeRecoverableMonthly: number;
  propertyTaxAnnual: number;
  hoaFeeParkingNonRecoverableMonthly: number;
  hoaFeeParkingMaintenanceReserveMonthly: number;
  hoaFeeParkingRecoverableMonthly: number;
  propertyTaxParkingMonthly: number;
  /** key = 'YYYY-MM', value = Σ extraordinary_costs.amount for that month. */
  extraordinaryCostsByMonth: Map<string, number>;
}

/**
 * Sum of cashflowBeforeTax across every ownership month of `year` — the
 * numerator half of spec-calculations.md's cashOnCashReturn (the other half,
 * taxEffectYearly, is added by the caller — see propertyOverview.ts). Mirrors
 * taxCalculator.annualTaxableIncome's ownerFraction-weighting: each month's
 * whole result (income, mortgage, and costs alike) is scaled by that month's
 * ownership fraction, so an acquisition-year partial month isn't over- or
 * under-counted.
 */
export function annualCashflowBeforeTax(input: AnnualCashflowBeforeTaxInput): number {
  let total = 0;

  for (let m = 1; m <= 12; m++) {
    const month = makeDate(input.year, m, 1);
    const ownerFraction = ownershipDayFraction(month, input.economicTransferDate);
    if (ownerFraction <= 0) continue;

    const income = incomeForMonth(month, input.statusHistory, input.today, input.coldRentMonthly, input.parkingRentMonthly);
    const ownerBorneRecoverableWE = ownerBorneRecoverableWEForMonth(
      month,
      input.statusHistory,
      input.today,
      input.hoaFeeRecoverableMonthly,
      input.propertyTaxAnnual
    );
    const key = `${input.year}-${String(m).padStart(2, '0')}`;
    const extraordinaryCostsThisMonth = input.extraordinaryCostsByMonth.get(key) ?? 0;

    const monthResult = cashflowBeforeTax({
      incomeActualMonthly: income,
      monthlyMortgage: input.monthlyMortgage,
      operatingCostsNonRecoverableMonthly: input.operatingCostsNonRecoverableMonthly,
      ownerBorneRecoverableWEMonthly: ownerBorneRecoverableWE,
      hoaFeeParkingNonRecoverableMonthly: input.hoaFeeParkingNonRecoverableMonthly,
      hoaFeeParkingMaintenanceReserveMonthly: input.hoaFeeParkingMaintenanceReserveMonthly,
      hoaFeeParkingRecoverableMonthly: input.hoaFeeParkingRecoverableMonthly,
      propertyTaxParkingMonthly: input.propertyTaxParkingMonthly,
      extraordinaryCostsThisMonth,
    });

    total += monthResult * ownerFraction;
  }

  return total;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/calculations/cashflowCalculator.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/calculations/cashflowCalculator.ts web/tests/calculations/cashflowCalculator.test.ts
git commit -m "feat(calculations): add annualCashflowBeforeTax"
```

---

### Task 4: Expose month/year breakdown fields on `PropertySummary`

**Files:**
- Modify: `web/lib/data/propertySummary.ts`
- Test: `web/tests/data/propertySummary.test.ts`

`computePropertySummary` already computes `incomeThisMonth`, `cashflowBeforeTaxThisMonth`, `taxEffectThisMonth`, and `taxEffectYear` as local variables — Card 1's breakdown and `propertyOverview.ts`'s Cash-on-Cash calc both need them. This is a pure additive change (new fields on the return object); nothing existing breaks. Also export the currently-private `toStatusHistory` helper so `propertyOverview.ts` (Task 5) doesn't have to duplicate it.

- [ ] **Step 1: Write the failing test**

Add this `describe` block to the end of `web/tests/data/propertySummary.test.ts`:

```typescript
describe('computePropertySummary — Card 1 breakdown fields', () => {
  it('exposes incomeActualMonthly, cashflowBeforeTaxMonthly, taxEffectMonthly, taxEffectYearly', () => {
    // No loan, no AfA (building_value 0 -> afaBasis 0), tax rate 0 -> taxEffect is
    // deterministically 0 regardless of taxableIncome, isolating the cashflow math.
    const property = makeProperty({
      loan_amount: 0,
      monthly_mortgage: 0,
      building_value: 0,
      marginal_tax_rate: 0,
      cold_rent_monthly: 1000,
      parking_rent_monthly: 0,
      hoa_fee_total_monthly: 400,
      hoa_fee_recoverable_monthly: 0,
      hoa_fee_maintenance_reserve_monthly: 0,
      property_management_annual: 0,
      property_insurance_annual: 0,
      other_costs_monthly: 0,
    });
    const result = computePropertySummary(property, statusHistory, today);

    expect(result.incomeActualMonthly).toBeCloseTo(1000, 2);
    // operatingCostsNonRecoverableMonthly = hoaFeeNonRecoverable(400) + reserve(0) = 400
    // cashflowBeforeTax = 1000 - 0 (mortgage) - 400 - 0 (ownerBorneRecoverableWE, vermietet) = 600
    expect(result.cashflowBeforeTaxMonthly).toBeCloseTo(600, 2);
    expect(result.taxEffectMonthly).toBeCloseTo(0, 2);
    expect(result.taxEffectYearly).toBeCloseTo(0, 2);
    expect(result.cashflowAfterTaxMonthly).toBeCloseTo(600, 2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/data/propertySummary.test.ts`
Expected: FAIL — `result.incomeActualMonthly` etc. are `undefined`.

- [ ] **Step 3: Implement**

In `web/lib/data/propertySummary.ts`, change `function toStatusHistory` to `export function toStatusHistory`, extend the `PropertySummary` interface, and extend the return statement:

```typescript
export interface PropertySummary {
  totalInvestment: number;
  totalPurchasePrice: number;
  purchasePricePerSqm: number;
  remainingDebtNow: number;
  netYield: number | null;
  netOperatingIncomeYearly: number;
  currentStatus: PropertyStatus;
  cashflowAfterTaxMonthly: number;
  incomeActualMonthly: number;
  cashflowBeforeTaxMonthly: number;
  taxEffectMonthly: number;
  taxEffectYearly: number;
}
```

```typescript
  return {
    totalInvestment,
    totalPurchasePrice,
    purchasePricePerSqm,
    remainingDebtNow,
    netYield,
    netOperatingIncomeYearly,
    currentStatus,
    cashflowAfterTaxMonthly,
    incomeActualMonthly: incomeThisMonth,
    cashflowBeforeTaxMonthly: cashflowBeforeTaxThisMonth,
    taxEffectMonthly: taxEffectThisMonth,
    taxEffectYearly: taxEffectYear,
  };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/data/propertySummary.test.ts`
Expected: PASS (all tests, old and new — the existing ones are untouched by this additive change).

- [ ] **Step 5: Commit**

```bash
git add web/lib/data/propertySummary.ts web/tests/data/propertySummary.test.ts
git commit -m "feat(data): expose month/year cashflow breakdown on PropertySummary"
```

---

### Task 5: `propertyOverview.ts` — Card 2/3 KPI aggregator

**Files:**
- Create: `web/lib/data/propertyOverview.ts`
- Test: `web/tests/data/propertyOverview.test.ts`

This is the new data module that turns a `properties` row + its `status_entries`/`extraordinary_costs` rows into every KPI the Übersicht tab's fixed bar and Card 2 need, on top of what `PropertySummary` already provides.

- [ ] **Step 1: Write the failing test**

Create `web/tests/data/propertyOverview.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { fixtures as f } from '../calculations/fixtures';
import { makeDate } from '@/lib/calculations/dateHelpers';
import type { Database } from '@/lib/supabase/types';
import { computePropertySummary } from '@/lib/data/propertySummary';
import { computeOverviewMetrics } from '@/lib/data/propertyOverview';
import { grossYield, mietmultiplikator, cashOnCashReturn } from '@/lib/calculations/kpiCalculator';
import { annualCashflowBeforeTax } from '@/lib/calculations/cashflowCalculator';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];
type ExtraordinaryCostRow = Database['public']['Tables']['extraordinary_costs']['Row'];

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
    year_built: null,
    notes: '',
    living_area_sqm: 68,
    usable_area_sqm: null,
    land_area_sqm: null,
    rooms: 3,
    bedrooms: null,
    bathrooms: null,
    floor_level: null,
    has_balcony: false,
    has_terrace: false,
    has_garden: false,
    has_basement: false,
    basement_size_sqm: null,
    has_fitted_kitchen: false,
    parking_type: 'nicht_vorhanden',
    parking_count: 0,
    heating_type: null,
    energy_efficiency_class: null,
    condition: null,
    last_renovation_year: null,
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
    warmmiete_monthly: null,
    parking_rent_monthly: f.parkingRentMonthly,
    other_income_monthly: 0,
    vacancy_rate_assumption: f.vacancyRateAssumption,
    market_rent_per_sqm: null,
    current_market_value: null,
    hoa_fee_total_monthly: f.hoaFeeTotalMonthly,
    is_hoa_unit_split: true,
    hoa_fee_recoverable_monthly: f.hoaFeeRecoverableMonthly,
    hoa_fee_maintenance_reserve_monthly: f.maintenanceReserveMonthly,
    property_tax_annual: f.propertyTaxAnnual,
    property_management_annual: f.propertyManagementAnnual,
    property_insurance_annual: 0,
    other_costs_monthly: 0,
    hoa_fee_parking_total_monthly: 0,
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
    equity_contributed: 0,
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

function makeStatusEntry(overrides: Partial<StatusEntryRow> = {}): StatusEntryRow {
  return {
    id: 'status-1',
    property_id: 'prop-1',
    date: '2026-02-01',
    status: 'vermietet',
    income_actual_monthly: null,
    notes: '',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('computeOverviewMetrics', () => {
  const property = makeProperty();
  const statusEntries = [makeStatusEntry()];
  const extraordinaryCosts: ExtraordinaryCostRow[] = [];
  const today = makeDate(2026, 6, 15);
  const summary = computePropertySummary(property, statusEntries, today);
  const result = computeOverviewMetrics(property, statusEntries, extraordinaryCosts, summary, today);

  it('grossYield matches the direct formula', () => {
    const expected = grossYield(f.coldRentYearly, f.parkingRentYearly, f.purchasePrice);
    expect(result.grossYield).toBeCloseTo(expected!, 4);
  });

  it('kaufpreisfaktor matches the direct formula', () => {
    const expected = mietmultiplikator(f.purchasePrice, f.coldRentYearly, f.parkingRentYearly);
    expect(result.kaufpreisfaktor).toBeCloseTo(expected!, 4);
  });

  it('dscr = NOI / (monthlyMortgage * 12), consistent with the summary it was built from', () => {
    expect(result.dscr).toBeCloseTo(summary.netOperatingIncomeYearly / (property.monthly_mortgage * 12), 6);
  });

  it('ltv = remainingDebtNow / totalInvestment, consistent with the summary it was built from', () => {
    expect(result.ltv).toBeCloseTo(summary.remainingDebtNow / summary.totalInvestment, 6);
  });

  it('equityUsed = totalInvestment - loanAmount', () => {
    expect(result.equityUsed).toBeCloseTo(f.equityUsed, 0);
  });

  it('actualVacancyRate is 0 for a fully vermietet history since acquisition', () => {
    expect(result.actualVacancyRate).toBeCloseTo(0, 4);
  });

  it('breakEvenRentMonthly = WE running costs (no parking in the base fixture) + monthly mortgage', () => {
    // operatingCostsNonRecoverableMonthly = 90.24 (hoaFeeNonRecoverable) + 34.76 (reserve)
    //   + 33 (propertyManagement/12) + 0 (insurance) + 0 (other) = 158.0
    expect(result.breakEvenRentMonthly).toBeCloseTo(158.0 + f.monthlyMortgage, 1);
  });

  it('valueGain/valueGainPercent are null when current_market_value is unset', () => {
    expect(result.valueGain).toBeNull();
    expect(result.valueGainPercent).toBeNull();
  });

  it('valueGain/valueGainPercent are computed once current_market_value is set', () => {
    const propertyWithValue = makeProperty({ current_market_value: f.purchasePrice + 30_000 });
    const withValueSummary = computePropertySummary(propertyWithValue, statusEntries, today);
    const withValueResult = computeOverviewMetrics(propertyWithValue, statusEntries, extraordinaryCosts, withValueSummary, today);
    expect(withValueResult.valueGain).toBeCloseTo(30_000, 0);
    expect(withValueResult.valueGainPercent).toBeCloseTo(30_000 / f.purchasePrice, 4);
  });

  it('actualVacancyRate is null when there is no status history at all', () => {
    const withoutHistory = computeOverviewMetrics(property, [], extraordinaryCosts, summary, today);
    expect(withoutHistory.actualVacancyRate).toBeNull();
  });

  it('cashOnCash matches annualCashflowBeforeTax(...) + taxEffectYearly, divided by equityUsed (equityContributed is 0)', () => {
    const hoaFeeNonRecoverableMonthly =
      property.hoa_fee_total_monthly - property.hoa_fee_recoverable_monthly - property.hoa_fee_maintenance_reserve_monthly;
    const operatingCostsNonRecoverableMonthly =
      hoaFeeNonRecoverableMonthly +
      property.hoa_fee_maintenance_reserve_monthly +
      property.property_management_annual / 12 +
      property.property_insurance_annual / 12 +
      property.other_costs_monthly;

    const expectedCashflowYear = annualCashflowBeforeTax({
      year: 2026,
      statusHistory: [{ date: makeDate(2026, 2, 1), status: 'vermietet', incomeActualMonthly: null }],
      economicTransferDate: makeDate(2026, 2, 1),
      today,
      coldRentMonthly: property.cold_rent_monthly,
      parkingRentMonthly: property.parking_rent_monthly,
      monthlyMortgage: property.monthly_mortgage,
      operatingCostsNonRecoverableMonthly,
      hoaFeeRecoverableMonthly: property.hoa_fee_recoverable_monthly,
      propertyTaxAnnual: property.property_tax_annual,
      hoaFeeParkingNonRecoverableMonthly: 0,
      hoaFeeParkingMaintenanceReserveMonthly: 0,
      hoaFeeParkingRecoverableMonthly: 0,
      propertyTaxParkingMonthly: 0,
      extraordinaryCostsByMonth: new Map(),
    });
    const expected = cashOnCashReturn(expectedCashflowYear + summary.taxEffectYearly, f.equityUsed);
    expect(result.cashOnCash).toBeCloseTo(expected!, 2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/data/propertyOverview.test.ts`
Expected: FAIL — module `@/lib/data/propertyOverview` doesn't exist.

- [ ] **Step 3: Implement**

Create `web/lib/data/propertyOverview.ts`:

```typescript
import type { Database } from '@/lib/supabase/types';
import { toStatusHistory, type PropertySummary } from '@/lib/data/propertySummary';
import { ownershipAndVacancyDaysSinceTransfer } from '@/lib/calculations/statusPeriodCalculator';
import { annualCashflowBeforeTax } from '@/lib/calculations/cashflowCalculator';
import {
  grossYield,
  mietmultiplikator,
  dscrNOI,
  ltvRatio,
  equityUsed,
  breakEvenRentMonthly,
  cashOnCashReturn,
  actualVacancyRate,
} from '@/lib/calculations/kpiCalculator';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];
type ExtraordinaryCostRow = Database['public']['Tables']['extraordinary_costs']['Row'];

export interface OverviewMetrics {
  grossYield: number | null;
  cashOnCash: number | null;
  kaufpreisfaktor: number | null;
  dscr: number | null;
  ltv: number | null;
  actualVacancyRate: number | null;
  breakEvenRentMonthly: number;
  equityUsed: number;
  currentMarketValue: number | null;
  valueGain: number | null;
  valueGainPercent: number | null;
}

/**
 * Everything the Übersicht tab's fixed KPI bar and Card 2 (Rendite & Investment)
 * need on top of the already-existing PropertySummary — composed the same way
 * propertySummary.ts composes lib/calculations/* against a real properties row.
 */
export function computeOverviewMetrics(
  property: PropertyRow,
  statusEntryRows: StatusEntryRow[],
  extraordinaryCostRows: ExtraordinaryCostRow[],
  summary: PropertySummary,
  today: Date = new Date()
): OverviewMetrics {
  const statusHistory = toStatusHistory(statusEntryRows);
  const economicTransferDate = new Date(property.economic_transfer_date + 'T00:00:00Z');

  const coldRentYearly = property.cold_rent_monthly * 12;
  const parkingRentYearly = property.parking_rent_monthly * 12;

  const grossYieldValue = grossYield(coldRentYearly, parkingRentYearly, summary.totalPurchasePrice);
  const kaufpreisfaktorValue = mietmultiplikator(summary.totalPurchasePrice, coldRentYearly, parkingRentYearly);
  const debtServiceAnnual = property.monthly_mortgage * 12;
  const dscrValue = dscrNOI(summary.netOperatingIncomeYearly, debtServiceAnnual);
  const ltvValue = ltvRatio(summary.remainingDebtNow, summary.totalInvestment);
  const equityUsedValue = equityUsed(summary.totalInvestment, property.loan_amount);

  const { ownershipDays, leerstandDays } = ownershipAndVacancyDaysSinceTransfer(statusHistory, economicTransferDate, today);
  const actualVacancyRateValue = statusHistory.length === 0 ? null : actualVacancyRate(leerstandDays, ownershipDays);

  const hoaFeeNonRecoverableMonthly =
    property.hoa_fee_total_monthly - property.hoa_fee_recoverable_monthly - property.hoa_fee_maintenance_reserve_monthly;
  const hoaFeeParkingNonRecoverableMonthly =
    property.hoa_fee_parking_total_monthly -
    property.hoa_fee_parking_recoverable_monthly -
    property.hoa_fee_parking_maintenance_reserve_monthly;
  const operatingCostsNonRecoverableMonthly =
    hoaFeeNonRecoverableMonthly +
    property.hoa_fee_maintenance_reserve_monthly +
    property.property_management_annual / 12 +
    property.property_insurance_annual / 12 +
    property.other_costs_monthly;

  const breakEvenRentMonthlyValue = breakEvenRentMonthly(
    operatingCostsNonRecoverableMonthly +
      hoaFeeParkingNonRecoverableMonthly +
      property.hoa_fee_parking_recoverable_monthly +
      property.hoa_fee_parking_maintenance_reserve_monthly +
      property.property_tax_parking_annual / 12,
    property.monthly_mortgage
  );

  const extraordinaryCostsByMonth = new Map<string, number>();
  for (const row of extraordinaryCostRows) {
    const key = row.cost_month.slice(0, 7); // 'YYYY-MM'
    extraordinaryCostsByMonth.set(key, (extraordinaryCostsByMonth.get(key) ?? 0) + row.amount);
  }

  const currentYear = today.getUTCFullYear();
  const cashflowBeforeTaxYear = annualCashflowBeforeTax({
    year: currentYear,
    statusHistory,
    economicTransferDate,
    today,
    coldRentMonthly: property.cold_rent_monthly,
    parkingRentMonthly: property.parking_rent_monthly,
    monthlyMortgage: property.monthly_mortgage,
    operatingCostsNonRecoverableMonthly,
    hoaFeeRecoverableMonthly: property.hoa_fee_recoverable_monthly,
    propertyTaxAnnual: property.property_tax_annual,
    hoaFeeParkingNonRecoverableMonthly,
    hoaFeeParkingMaintenanceReserveMonthly: property.hoa_fee_parking_maintenance_reserve_monthly,
    hoaFeeParkingRecoverableMonthly: property.hoa_fee_parking_recoverable_monthly,
    propertyTaxParkingMonthly: property.property_tax_parking_annual / 12,
    extraordinaryCostsByMonth,
  });
  const cashflowAfterTaxYear = cashflowBeforeTaxYear + summary.taxEffectYearly;
  // Per spec-calculations.md: fallback to equityUsed when equityContributed is 0.
  const cashOnCashDenominator = property.equity_contributed > 0 ? property.equity_contributed : equityUsedValue;
  const cashOnCashValue = cashOnCashReturn(cashflowAfterTaxYear, cashOnCashDenominator);

  const valueGain = property.current_market_value !== null ? property.current_market_value - summary.totalPurchasePrice : null;
  const valueGainPercent =
    property.current_market_value !== null && summary.totalPurchasePrice > 0
      ? (property.current_market_value - summary.totalPurchasePrice) / summary.totalPurchasePrice
      : null;

  return {
    grossYield: grossYieldValue,
    cashOnCash: cashOnCashValue,
    kaufpreisfaktor: kaufpreisfaktorValue,
    dscr: dscrValue,
    ltv: ltvValue,
    actualVacancyRate: actualVacancyRateValue,
    breakEvenRentMonthly: breakEvenRentMonthlyValue,
    equityUsed: equityUsedValue,
    currentMarketValue: property.current_market_value,
    valueGain,
    valueGainPercent,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/data/propertyOverview.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full test suite to confirm no regressions**

Run: `cd web && npm test`
Expected: All test files PASS.

- [ ] **Step 6: Commit**

```bash
git add web/lib/data/propertyOverview.ts web/tests/data/propertyOverview.test.ts
git commit -m "feat(data): add computeOverviewMetrics for the Übersicht tab"
```

---

### Task 6: `getPropertyDetail` fetch helper

**Files:**
- Create: `web/lib/data/propertyDetail.ts`

No unit test here — like `lib/data/properties.ts` and `lib/data/propertyActions.ts`, this file only wires Supabase queries together and isn't unit-tested in this codebase (it's covered by Task 22's manual QA pass instead).

- [ ] **Step 1: Implement**

Create `web/lib/data/propertyDetail.ts`:

```typescript
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];
type ExtraordinaryCostRow = Database['public']['Tables']['extraordinary_costs']['Row'];

export interface PropertyDetailData {
  property: PropertyRow;
  statusEntries: StatusEntryRow[];
  extraordinaryCosts: ExtraordinaryCostRow[];
}

/**
 * Fetches a single property (RLS-scoped) plus its full status/cost history.
 * Returns null if not found (caller should render notFound()). Wrapped in
 * React's cache() so the layout and its active tab page — both server
 * components rendering the same request — share one fetch instead of two.
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

  const [{ data: statusEntries, error: statusError }, { data: extraordinaryCosts, error: costsError }] = await Promise.all([
    supabase.from('status_entries').select('*').eq('property_id', propertyId).order('date', { ascending: true }),
    supabase.from('extraordinary_costs').select('*').eq('property_id', propertyId).order('cost_month', { ascending: true }),
  ]);

  if (statusError) throw statusError;
  if (costsError) throw costsError;

  return { property, statusEntries: statusEntries ?? [], extraordinaryCosts: extraordinaryCosts ?? [] };
});
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/data/propertyDetail.ts
git commit -m "feat(data): add getPropertyDetail fetch helper"
```

---

### Task 7: Route shell — tab nav, layout, placeholder tabs

**Files:**
- Create: `web/components/property/PropertyTabNav.tsx`
- Modify: `web/app/(app)/properties/[id]/layout.tsx` (doesn't exist yet — create it)
- Create: `web/app/(app)/properties/[id]/cashflow/page.tsx`
- Create: `web/app/(app)/properties/[id]/steuer/page.tsx`
- Create: `web/app/(app)/properties/[id]/finanzierung/page.tsx`
- Create: `web/app/(app)/properties/[id]/immobiliendaten/page.tsx`

- [ ] **Step 1: Create the tab nav component**

Create `web/components/property/PropertyTabNav.tsx`:

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { twMerge } from 'tailwind-merge';

const TABS = [
  { href: '', label: 'Übersicht' },
  { href: '/cashflow', label: 'Cashflow' },
  { href: '/steuer', label: 'Steuer' },
  { href: '/verlauf', label: 'Verlauf' },
  { href: '/finanzierung', label: 'Finanzierung' },
  { href: '/immobiliendaten', label: 'Immobiliendaten' },
];

export function PropertyTabNav({ propertyId }: { propertyId: string }) {
  const pathname = usePathname();
  const basePath = `/properties/${propertyId}`;

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-black/10">
      {TABS.map((tab) => {
        const href = `${basePath}${tab.href}`;
        const isActive = pathname === href;
        return (
          <Link
            key={tab.href}
            href={href}
            className={twMerge(
              'whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-semibold text-text-secondary',
              isActive && 'border-accent text-accent'
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Create the shared layout**

Create `web/app/(app)/properties/[id]/layout.tsx`:

```typescript
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPropertyDetail } from '@/lib/data/propertyDetail';
import { PropertyTabNav } from '@/components/property/PropertyTabNav';

export default async function PropertyDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getPropertyDetail(id);
  if (!detail) notFound();

  return (
    <div className="space-y-4">
      <div>
        <Link href="/" className="text-xs text-text-dim hover:underline">
          ← Portfolio
        </Link>
        <h1 className="text-xl font-extrabold text-text-primary">{detail.property.name}</h1>
      </div>
      <PropertyTabNav propertyId={id} />
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Create the four placeholder tab pages**

Create `web/app/(app)/properties/[id]/cashflow/page.tsx`:

```typescript
export default function CashflowTabPage() {
  return <p className="text-text-secondary">Cashflow-Tab kommt in Plan 5.</p>;
}
```

Create `web/app/(app)/properties/[id]/steuer/page.tsx`:

```typescript
export default function SteuerTabPage() {
  return <p className="text-text-secondary">Steuer-Tab kommt in Plan 5.</p>;
}
```

Create `web/app/(app)/properties/[id]/finanzierung/page.tsx`:

```typescript
export default function FinanzierungTabPage() {
  return <p className="text-text-secondary">Finanzierung-Tab kommt in Plan 6.</p>;
}
```

Create `web/app/(app)/properties/[id]/immobiliendaten/page.tsx`:

```typescript
export default function ImmobiliendatenTabPage() {
  return <p className="text-text-secondary">Immobiliendaten-Tab kommt in Plan 6.</p>;
}
```

- [ ] **Step 4: Commit**

```bash
git add web/components/property/PropertyTabNav.tsx "web/app/(app)/properties/[id]/layout.tsx" "web/app/(app)/properties/[id]/cashflow" "web/app/(app)/properties/[id]/steuer" "web/app/(app)/properties/[id]/finanzierung" "web/app/(app)/properties/[id]/immobiliendaten"
git commit -m "feat(property-detail): add tab shell with placeholder tabs"
```

---

### Task 8: Card 4 — `ObjectCard`

**Files:**
- Create: `web/components/property/overview/ObjectCard.tsx`

Pure display component — property-row fields plus `purchasePricePerSqm` from the already-computed `PropertySummary`. No new calculation logic, so no dedicated test (consistent with `PropertyCard.tsx`/`PortfolioCard.tsx`, which also aren't unit-tested).

- [ ] **Step 1: Implement**

Create `web/components/property/overview/ObjectCard.tsx`:

```typescript
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { formatCurrency } from '@/lib/formatters';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

const PROPERTY_TYPE_LABELS: Record<PropertyRow['property_type'], string> = {
  apartment: 'Apartment',
  einfamilienhaus: 'Einfamilienhaus',
  mehrfamilienhaus: 'Mehrfamilienhaus',
  gewerbe: 'Gewerbe',
  grundstuck: 'Grundstück',
  sonstiges: 'Sonstiges',
};

const ENERGY_CLASS_LABELS: Record<NonNullable<PropertyRow['energy_efficiency_class']>, string> = {
  a_plus_plus: 'A++',
  a: 'A',
  b: 'B',
  c: 'C',
  d: 'D',
  e: 'E',
  f: 'F',
  g: 'G',
  h: 'H',
};

const CONDITION_LABELS: Record<NonNullable<PropertyRow['condition']>, string> = {
  neubau: 'Neubau',
  erstbezug: 'Erstbezug',
  gepflegt: 'Gepflegt',
  renovierungsbedurftig: 'Renovierungsbedürftig',
  sanierungsbedurftig: 'Sanierungsbedürftig',
};

const HEATING_LABELS: Record<NonNullable<PropertyRow['heating_type']>, string> = {
  fernwarme: 'Fernwärme',
  gas: 'Gas',
  ol: 'Öl',
  warmepumpe: 'Wärmepumpe',
  pellet: 'Pellet',
  elektro: 'Elektro',
  sonstiges: 'Sonstiges',
};

const PARKING_LABELS: Record<PropertyRow['parking_type'], string> = {
  nicht_vorhanden: '–',
  tiefgarage: 'Tiefgarage',
  aussenstellplatz: 'Außenstellplatz',
  garage: 'Garage',
};

export function ObjectCard({ property, purchasePricePerSqm }: { property: PropertyRow; purchasePricePerSqm: number }) {
  const coldRentPerSqm = property.living_area_sqm > 0 ? property.cold_rent_monthly / property.living_area_sqm : 0;

  return (
    <GlassCard>
      <SectionLabel>Objekt</SectionLabel>
      <p className="text-sm text-text-primary">
        {property.address}, {property.postal_code} {property.city}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
        <span className="text-text-secondary">Typ</span>
        <span className="text-right text-text-primary">{PROPERTY_TYPE_LABELS[property.property_type]}</span>

        <span className="text-text-secondary">Baujahr</span>
        <span className="text-right text-text-primary">{property.year_built ?? '–'}</span>

        <span className="text-text-secondary">Wohnfläche</span>
        <span className="text-right text-text-primary">{property.living_area_sqm.toLocaleString('de-DE')} m²</span>

        <span className="text-text-secondary">Zimmer</span>
        <span className="text-right text-text-primary">{property.rooms ?? '–'}</span>

        <span className="text-text-secondary">Kaltmiete/m²</span>
        <span className="text-right text-text-primary">{formatCurrency(coldRentPerSqm)}</span>

        <span className="text-text-secondary">Kaufpreis/m²</span>
        <span className="text-right text-text-primary">{formatCurrency(purchasePricePerSqm)}</span>

        <span className="text-text-secondary">Energieklasse</span>
        <span className="text-right text-text-primary">
          {property.energy_efficiency_class ? ENERGY_CLASS_LABELS[property.energy_efficiency_class] : '–'}
        </span>

        <span className="text-text-secondary">Zustand</span>
        <span className="text-right text-text-primary">{property.condition ? CONDITION_LABELS[property.condition] : '–'}</span>

        <span className="text-text-secondary">Heizung</span>
        <span className="text-right text-text-primary">{property.heating_type ? HEATING_LABELS[property.heating_type] : '–'}</span>

        <span className="text-text-secondary">Stellplatz</span>
        <span className="text-right text-text-primary">{PARKING_LABELS[property.parking_type]}</span>
      </div>

      {property.notes && <p className="mt-3 text-sm text-text-secondary">{property.notes}</p>}
    </GlassCard>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/property/overview/ObjectCard.tsx
git commit -m "feat(property-detail): add Übersicht Card 4 (Objekt)"
```

---

### Task 9: Card 3 — `FinancingCard`

**Files:**
- Create: `web/components/property/overview/FinancingCard.tsx`

- [ ] **Step 1: Implement**

Create `web/components/property/overview/FinancingCard.tsx`:

```typescript
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

export function FinancingCard({
  property,
  remainingDebtNow,
  today,
}: {
  property: PropertyRow;
  remainingDebtNow: number;
  today: Date;
}) {
  if (property.loan_amount <= 0) {
    return (
      <GlassCard>
        <SectionLabel>Finanzierung</SectionLabel>
        <p className="text-sm text-text-secondary">Keine Finanzierung erfasst.</p>
      </GlassCard>
    );
  }

  const loanStart = new Date(property.loan_start_date + 'T00:00:00Z');
  const fixedUntil = new Date(Date.UTC(loanStart.getUTCFullYear() + property.fixed_interest_period_years, loanStart.getUTCMonth(), 1));
  const yearsRemaining = Math.max(0, fixedUntil.getUTCFullYear() - today.getUTCFullYear());
  const fixedUntilLabel = `${String(fixedUntil.getUTCMonth() + 1).padStart(2, '0')}/${fixedUntil.getUTCFullYear()}`;

  return (
    <GlassCard>
      <SectionLabel>Finanzierung</SectionLabel>
      <div className="grid grid-cols-2 gap-y-2 text-sm">
        <span className="text-text-secondary">Darlehensbetrag</span>
        <span className="text-right text-text-primary">{formatCurrency(property.loan_amount)}</span>

        <span className="text-text-secondary">Restschuld (heute)</span>
        <span className="text-right text-text-primary">{formatCurrency(remainingDebtNow)}</span>

        <span className="text-text-secondary">Monatliche Rate</span>
        <span className="text-right text-text-primary">{formatCurrency(property.monthly_mortgage)}</span>

        <span className="text-text-secondary">Zinssatz</span>
        <span className="text-right text-text-primary">{formatPercent(property.interest_rate)}</span>

        <span className="text-text-secondary">Tilgungssatz</span>
        <span className="text-right text-text-primary">{formatPercent(property.amortization_rate)}</span>

        <span className="text-text-secondary">Zinsbindung bis</span>
        <span className="text-right text-text-primary">
          {fixedUntilLabel} (noch {yearsRemaining} {yearsRemaining === 1 ? 'Jahr' : 'Jahre'})
        </span>
      </div>
    </GlassCard>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/property/overview/FinancingCard.tsx
git commit -m "feat(property-detail): add Übersicht Card 3 (Finanzierung)"
```

---

### Task 10: `Modal` primitive

**Files:**
- Create: `web/components/ui/Modal.tsx`

The first dialog/sheet component in the app — the wizard is a full page, not a modal, so nothing reusable exists yet. Needed by the KPI info sheet (Task 11) and both Verlauf add/edit forms (Tasks 18–19).

- [ ] **Step 1: Implement**

Create `web/components/ui/Modal.tsx`:

```typescript
'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="glass-card max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-b-none p-5 sm:rounded-b-[18px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-text-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="text-text-dim hover:text-text-primary"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/ui/Modal.tsx
git commit -m "feat(ui): add Modal primitive"
```

---

### Task 11: KPI chip, benchmark info content, info button

**Files:**
- Create: `web/components/property/KpiChip.tsx`
- Create: `web/lib/kpiInfo.ts`
- Test: `web/tests/kpiInfo.test.ts`
- Create: `web/components/property/KpiInfoButton.tsx`

- [ ] **Step 1: Write the failing test for `kpiInfo.ts`**

Create `web/tests/kpiInfo.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { KPI_INFO } from '@/lib/kpiInfo';
import type { BenchmarkKpi } from '@/lib/calculations/kpiCalculator';

const ALL_KPIS: BenchmarkKpi[] = ['grossYield', 'netYield', 'cashOnCash', 'kaufpreisfaktor', 'dscr', 'ltv', 'actualVacancyRate'];

describe('KPI_INFO', () => {
  it('has an entry for every BenchmarkKpi, each with non-empty copy', () => {
    for (const kpi of ALL_KPIS) {
      const info = KPI_INFO[kpi];
      expect(info).toBeDefined();
      expect(info.name.length).toBeGreaterThan(0);
      expect(info.formula.length).toBeGreaterThan(0);
      expect(info.meaning.length).toBeGreaterThan(0);
      expect(info.benchmarks.length).toBe(3);
      expect(info.context.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/kpiInfo.test.ts`
Expected: FAIL — module `@/lib/kpiInfo` doesn't exist.

- [ ] **Step 3: Implement `kpiInfo.ts`**

Create `web/lib/kpiInfo.ts`:

```typescript
import type { BenchmarkKpi } from '@/lib/calculations/kpiCalculator';

export interface KpiInfo {
  name: string;
  formula: string;
  meaning: string;
  benchmarks: Array<{ label: string; range: string }>;
  context: string;
}

// Formula/meaning/benchmark ranges from spec-overview-tab.md's 3-tier table;
// "context" copy from docs/superpowers/specs/2026-06-14-kpi-benchmarks.md.
export const KPI_INFO: Record<BenchmarkKpi, KpiInfo> = {
  grossYield: {
    name: 'Bruttorendite',
    formula: '(Kaltmiete + Parkingmiete) × 12 / Kaufpreis',
    meaning: 'Rohertrag der Immobilie ohne laufende Kosten — guter erster Vergleichswert, aber kein Maß für die tatsächliche Rentabilität.',
    benchmarks: [
      { label: 'Grün (gut)', range: '≥ 5 %' },
      { label: 'Orange (ok)', range: '3 – 5 %' },
      { label: 'Rot (schlecht)', range: '< 3 %' },
    ],
    context:
      'Bei Finanzierungskosten von 4%+ deckt eine Bruttorendite unter 4,5% oft nicht mal die Zinsen nach Bewirtschaftungskosten. In A-Lagen sind 2,5–3,5% strukturell bedingt durch hohe Kaufpreise — kein Qualitätsmerkmal.',
  },
  netYield: {
    name: 'Nettorendite',
    formula: 'NOI (Nettobetriebsergebnis) / Gesamtinvestment',
    meaning: 'Beste Vergleichskennzahl für die tatsächliche Performance — berücksichtigt laufende Kosten und Kaufnebenkosten.',
    benchmarks: [
      { label: 'Grün (gut)', range: '≥ 4 %' },
      { label: 'Orange (ok)', range: '2 – 4 %' },
      { label: 'Rot (schlecht)', range: '< 2 %' },
    ],
    context:
      'Faustregel: Nettorendite = Bruttorendite minus 1,5 bis 2,5 Prozentpunkte. Bei 4% Zinsen ist eine Nettorendite unter 2% wirtschaftlich kritisch.',
  },
  cashOnCash: {
    name: 'Cash-on-Cash Return',
    formula: 'Cashflow nach Steuern (Jahr) / eingesetztes Eigenkapital',
    meaning: 'Wie gut arbeitet das eingesetzte Eigenkapital — wichtigster Vergleich zu anderen Anlageformen.',
    benchmarks: [
      { label: 'Grün (gut)', range: '≥ 6 %' },
      { label: 'Orange (ok)', range: '3 – 6 %' },
      { label: 'Rot (schlecht)', range: '< 3 %' },
    ],
    context:
      'Bei aktuellen Zinsen und typischen Kaufpreisfaktoren in A/B-Städten ist 0–2% realistisch — in A-Lagen oft negativ. Stark hebel-abhängig: mehr Eigenkapital senkt den prozentualen CoC trotz besserem Zins-Coverage.',
  },
  kaufpreisfaktor: {
    name: 'Kaufpreisfaktor',
    formula: 'Kaufpreis / Jahreskaltmiete',
    meaning: 'Wie viele Jahresmieten der Kaufpreis entspricht — Kehrwert der Bruttorendite × 100.',
    benchmarks: [
      { label: 'Grün (gut)', range: '≤ 20×' },
      { label: 'Orange (ok)', range: '20 – 25×' },
      { label: 'Rot (schlecht)', range: '> 25×' },
    ],
    context:
      'A-Lagen lagen 2024 bei 25–35, B-Lagen bei 18–25, C-Lagen unter 18. Ein Faktor unter 15 kann auf strukturelle Risiken hinweisen (Leerstand, schrumpfende Region).',
  },
  dscr: {
    name: 'DSCR (Debt Service Coverage Ratio)',
    formula: 'NOI / jährlicher Schuldendienst (Kreditrate × 12)',
    meaning: 'Risiko-Indikator — unter 1,0 trägt die Immobilie den Kredit nicht allein aus dem Betriebsergebnis.',
    benchmarks: [
      { label: 'Grün (gut)', range: '≥ 1,25' },
      { label: 'Orange (ok)', range: '1,0 – 1,25' },
      { label: 'Rot (schlecht)', range: '< 1,0' },
    ],
    context:
      'Banken fordern für Kreditvergabe typischerweise 1,2–1,5. Bei aktuellen Zinsen (4%+) ist ein DSCR über 1,0 in A/B-Lagen schwer zu erreichen — 0,85–1,0 ist für Privatinvestoren mit Einkommensnachweis strukturell normal.',
  },
  ltv: {
    name: 'LTV (Loan-to-Value)',
    formula: 'Restschuld / Gesamtinvestment',
    meaning: 'Verschuldungsgrad der Immobilie — je niedriger, desto weniger Zins- und Refinanzierungsrisiko.',
    benchmarks: [
      { label: 'Grün (gut)', range: '≤ 70 %' },
      { label: 'Orange (ok)', range: '70 – 80 %' },
      { label: 'Rot (schlecht)', range: '> 80 %' },
    ],
    context:
      'Banken bieten die besten Konditionen unter 60% LTV (Pfandbrief-Beleihungsgrenze). Ab 80% steigen die Zinsen deutlich — ca. +1,3 Prozentpunkte.',
  },
  actualVacancyRate: {
    name: 'Tatsächliche Leerstandsquote',
    formula: 'Leerstandstage seit Erwerb / Eigentumstage seit Erwerb',
    meaning: 'Ist-Wert im Vergleich zur angenommenen Leerstandsquote (Mietausfallwagnis) aus den Objektdaten.',
    benchmarks: [
      { label: 'Grün (gut)', range: '≤ 3 %' },
      { label: 'Orange (ok)', range: '3 – 8 %' },
      { label: 'Rot (schlecht)', range: '> 8 %' },
    ],
    context: 'Nationaler Markt-Leerstand Ende 2024 bei ~2,2%. In strukturschwachen Regionen reale Leerstandsquoten von 10–15%+.',
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/kpiInfo.test.ts`
Expected: PASS.

- [ ] **Step 5: Create `KpiChip`**

Create `web/components/property/KpiChip.tsx`:

```typescript
import type { BenchmarkColor } from '@/lib/calculations/kpiCalculator';

const COLOR_CLASSES: Record<BenchmarkColor, string> = {
  green: 'bg-emerald-500',
  orange: 'bg-amber-500',
  red: 'bg-red-500',
};

export function KpiChip({ color }: { color: BenchmarkColor | null }) {
  if (!color) return null;
  return <span className={`inline-block h-2 w-2 rounded-full ${COLOR_CLASSES[color]}`} aria-hidden />;
}
```

- [ ] **Step 6: Create `KpiInfoButton`**

Create `web/components/property/KpiInfoButton.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { KPI_INFO } from '@/lib/kpiInfo';
import type { BenchmarkKpi } from '@/lib/calculations/kpiCalculator';

export function KpiInfoButton({ kpi }: { kpi: BenchmarkKpi }) {
  const [open, setOpen] = useState(false);
  const info = KPI_INFO[kpi];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${info.name} — Info`}
        className="text-text-dim hover:text-accent"
      >
        <Info size={13} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={info.name}>
        <div className="space-y-3 text-sm">
          <p className="font-mono text-xs text-text-dim">{info.formula}</p>
          <p className="text-text-primary">{info.meaning}</p>
          <table className="w-full text-left text-xs">
            <tbody>
              {info.benchmarks.map((row) => (
                <tr key={row.label} className="border-t border-black/5">
                  <td className="py-1 text-text-secondary">{row.label}</td>
                  <td className="py-1 text-right text-text-primary">{row.range}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-text-dim">{info.context}</p>
        </div>
      </Modal>
    </>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add web/lib/kpiInfo.ts web/tests/kpiInfo.test.ts web/components/property/KpiChip.tsx web/components/property/KpiInfoButton.tsx
git commit -m "feat(property-detail): add KPI benchmark chip and info sheet"
```

---

### Task 12: Card 2 — `ReturnsCard`

**Files:**
- Create: `web/components/property/overview/ReturnsCard.tsx`

- [ ] **Step 1: Implement**

Create `web/components/property/overview/ReturnsCard.tsx`:

```typescript
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { KpiChip } from '@/components/property/KpiChip';
import { KpiInfoButton } from '@/components/property/KpiInfoButton';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { benchmarkColor, type BenchmarkKpi } from '@/lib/calculations/kpiCalculator';
import type { OverviewMetrics } from '@/lib/data/propertyOverview';
import type { PropertySummary } from '@/lib/data/propertySummary';

function KpiRow({
  kpi,
  label,
  rawValue,
  formattedValue,
}: {
  kpi: BenchmarkKpi;
  label: string;
  rawValue: number | null;
  formattedValue: string;
}) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-text-secondary">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-text-primary">{formattedValue}</span>
        <KpiChip color={benchmarkColor(kpi, rawValue)} />
        <KpiInfoButton kpi={kpi} />
      </div>
    </div>
  );
}

export function ReturnsCard({ summary, overview }: { summary: PropertySummary; overview: OverviewMetrics }) {
  return (
    <GlassCard>
      <SectionLabel>Rendite & Investment</SectionLabel>

      <KpiRow
        kpi="grossYield"
        label="Bruttorendite"
        rawValue={overview.grossYield}
        formattedValue={overview.grossYield !== null ? formatPercent(overview.grossYield) : '–'}
      />
      <KpiRow
        kpi="netYield"
        label="Nettorendite"
        rawValue={summary.netYield}
        formattedValue={summary.netYield !== null ? formatPercent(summary.netYield) : '–'}
      />
      <KpiRow
        kpi="cashOnCash"
        label="Cash-on-Cash"
        rawValue={overview.cashOnCash}
        formattedValue={overview.cashOnCash !== null ? formatPercent(overview.cashOnCash) : '–'}
      />
      <KpiRow
        kpi="kaufpreisfaktor"
        label="Kaufpreisfaktor"
        rawValue={overview.kaufpreisfaktor}
        formattedValue={overview.kaufpreisfaktor !== null ? `${overview.kaufpreisfaktor.toFixed(1)}×` : '–'}
      />
      <KpiRow
        kpi="dscr"
        label="DSCR (NOI)"
        rawValue={overview.dscr}
        formattedValue={overview.dscr !== null ? overview.dscr.toFixed(2) : '–'}
      />
      <KpiRow kpi="ltv" label="LTV" rawValue={overview.ltv} formattedValue={overview.ltv !== null ? formatPercent(overview.ltv) : '–'} />
      <KpiRow
        kpi="actualVacancyRate"
        label="Tats. Leerstandsquote"
        rawValue={overview.actualVacancyRate}
        formattedValue={overview.actualVacancyRate !== null ? formatPercent(overview.actualVacancyRate) : '–'}
      />

      <div className="my-2 h-px bg-black/[0.06]" />

      <div className="grid grid-cols-2 gap-y-2 text-sm">
        <span className="text-text-secondary">Gesamtinvestment</span>
        <span className="text-right text-text-primary">{formatCurrency(summary.totalInvestment)}</span>

        <span className="text-text-secondary">Eigenkapital</span>
        <span className="text-right text-text-primary">{formatCurrency(overview.equityUsed)}</span>

        <span className="text-text-secondary">NOI / Jahr</span>
        <span className="text-right text-text-primary">{formatCurrency(summary.netOperatingIncomeYearly)}</span>

        <span className="text-text-secondary">Break-Even-Miete</span>
        <span className="text-right text-text-primary">{formatCurrency(overview.breakEvenRentMonthly)}</span>
      </div>

      {overview.valueGain !== null && overview.valueGainPercent !== null && (
        <>
          <div className="my-2 h-px bg-black/[0.06]" />
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-text-secondary">Aktueller Marktwert</span>
            <span className="text-right text-text-primary">{formatCurrency(overview.currentMarketValue ?? 0)}</span>

            <span className="text-text-secondary">Wertsteigerung</span>
            <span className={`text-right font-semibold ${overview.valueGain >= 0 ? 'text-positive' : 'text-negative'}`}>
              {overview.valueGain >= 0 ? '+' : ''}
              {formatCurrency(overview.valueGain)} ({formatPercent(overview.valueGainPercent)})
            </span>
          </div>
        </>
      )}
    </GlassCard>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/property/overview/ReturnsCard.tsx
git commit -m "feat(property-detail): add Übersicht Card 2 (Rendite & Investment)"
```

---

### Task 13: Card 1 — `CurrentStatusCard`

**Files:**
- Create: `web/components/property/overview/CurrentStatusCard.tsx`

- [ ] **Step 1: Implement**

Create `web/components/property/overview/CurrentStatusCard.tsx`:

```typescript
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { PropertySummary } from '@/lib/data/propertySummary';

export function CurrentStatusCard({
  propertyId,
  summary,
  monthlyMortgage,
  hasStatusHistory,
  latestStatusDate,
}: {
  propertyId: string;
  summary: PropertySummary;
  monthlyMortgage: number;
  hasStatusHistory: boolean;
  latestStatusDate: Date | null;
}) {
  // cashflowBeforeTax = income - mortgage - runningCosts, so this is the exact inverse —
  // no new intermediate needs exposing on PropertySummary for it.
  const runningCostsMonthly = summary.incomeActualMonthly - monthlyMortgage - summary.cashflowBeforeTaxMonthly;
  const cashflowAfterColor = summary.cashflowAfterTaxMonthly >= 0 ? 'text-positive' : 'text-negative';

  return (
    <GlassCard>
      <SectionLabel>Aktueller Stand</SectionLabel>

      <div className="flex items-center gap-2">
        <StatusBadge status={summary.currentStatus} />
        {latestStatusDate && <span className="text-xs text-text-dim">seit {formatDate(latestStatusDate)}</span>}
      </div>

      {!hasStatusHistory ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-text-secondary">Noch kein Status vorhanden.</p>
          <Link href={`/properties/${propertyId}/verlauf`} className="text-sm font-semibold text-accent hover:underline">
            + Ersten Status hinzufügen
          </Link>
        </div>
      ) : (
        <div className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">Einnahmen</span>
            <span className="text-text-primary">{formatCurrency(summary.incomeActualMonthly)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Kreditrate</span>
            <span className="text-text-primary">{formatCurrency(-monthlyMortgage)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Laufende Kosten</span>
            <span className="text-text-primary">{formatCurrency(-runningCostsMonthly)}</span>
          </div>
          <div className="flex justify-between border-t border-black/[0.06] pt-1.5 font-bold">
            <span className="text-text-primary">Cashflow vor Steuern</span>
            <span className="text-text-primary">{formatCurrency(summary.cashflowBeforeTaxMonthly)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Steuereffekt (Ø monatl.)</span>
            <span className="text-accent">{formatCurrency(summary.taxEffectMonthly)}</span>
          </div>
          <div
            className={`flex justify-between border-t border-black/[0.06] pt-1.5 text-[18px] font-extrabold ${cashflowAfterColor}`}
          >
            <span>Cashflow nach Steuern</span>
            <span>{formatCurrency(summary.cashflowAfterTaxMonthly)}</span>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/property/overview/CurrentStatusCard.tsx
git commit -m "feat(property-detail): add Übersicht Card 1 (Aktueller Stand)"
```

---

### Task 14: Fixed KPI bar

**Files:**
- Create: `web/components/property/overview/OverviewKpiBar.tsx`

- [ ] **Step 1: Implement**

Create `web/components/property/overview/OverviewKpiBar.tsx`:

```typescript
import { KpiChip } from '@/components/property/KpiChip';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { benchmarkColor } from '@/lib/calculations/kpiCalculator';
import type { PropertySummary } from '@/lib/data/propertySummary';
import type { OverviewMetrics } from '@/lib/data/propertyOverview';

export function OverviewKpiBar({ summary, overview }: { summary: PropertySummary; overview: OverviewMetrics }) {
  const cfColor = summary.cashflowAfterTaxMonthly >= 0 ? 'text-positive' : 'text-negative';

  return (
    <div className="sticky top-0 z-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-black/[0.06] shadow-sm sm:grid-cols-4">
      <div className="bg-white px-3 py-2">
        <p className="text-[10px] font-bold uppercase text-text-secondary">CF nach Steuern</p>
        <p className={`text-[18px] font-extrabold ${cfColor}`}>{formatCurrency(summary.cashflowAfterTaxMonthly)}</p>
        <p className="text-[11px] text-text-dim">vor St.: {formatCurrency(summary.cashflowBeforeTaxMonthly)}</p>
      </div>
      <div className="bg-white px-3 py-2">
        <p className="text-[10px] font-bold uppercase text-text-secondary">Nettorendite</p>
        <p className="text-[18px] font-extrabold text-text-primary">
          {summary.netYield !== null ? formatPercent(summary.netYield) : '–'}
        </p>
        <p className="text-[11px] text-text-dim">Brutto: {overview.grossYield !== null ? formatPercent(overview.grossYield) : '–'}</p>
      </div>
      <div className="bg-white px-3 py-2">
        <p className="text-[10px] font-bold uppercase text-text-secondary">Cash-on-Cash</p>
        <p className="text-[18px] font-extrabold text-text-primary">
          {overview.cashOnCash !== null ? formatPercent(overview.cashOnCash) : '–'}
        </p>
      </div>
      <div className="bg-white px-3 py-2">
        <p className="text-[10px] font-bold uppercase text-text-secondary">DSCR</p>
        <div className="flex items-center gap-1.5">
          <p className="text-[18px] font-extrabold text-text-primary">{overview.dscr !== null ? overview.dscr.toFixed(2) : '–'}</p>
          <KpiChip color={benchmarkColor('dscr', overview.dscr)} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/property/overview/OverviewKpiBar.tsx
git commit -m "feat(property-detail): add Übersicht fixed KPI bar"
```

---

### Task 15: Wire the Übersicht page

**Files:**
- Modify: `web/app/(app)/properties/[id]/page.tsx` (currently the Plan-3 placeholder)

- [ ] **Step 1: Replace the placeholder**

Replace the full contents of `web/app/(app)/properties/[id]/page.tsx` with:

```typescript
import { notFound } from 'next/navigation';
import { getPropertyDetail } from '@/lib/data/propertyDetail';
import { computePropertySummary } from '@/lib/data/propertySummary';
import { computeOverviewMetrics } from '@/lib/data/propertyOverview';
import { OverviewKpiBar } from '@/components/property/overview/OverviewKpiBar';
import { CurrentStatusCard } from '@/components/property/overview/CurrentStatusCard';
import { ReturnsCard } from '@/components/property/overview/ReturnsCard';
import { FinancingCard } from '@/components/property/overview/FinancingCard';
import { ObjectCard } from '@/components/property/overview/ObjectCard';

export default async function PropertyOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPropertyDetail(id);
  if (!detail) notFound();

  const today = new Date();
  const summary = computePropertySummary(detail.property, detail.statusEntries, today);
  const overview = computeOverviewMetrics(detail.property, detail.statusEntries, detail.extraordinaryCosts, summary, today);

  const sortedHistory = [...detail.statusEntries].sort((a, b) => a.date.localeCompare(b.date));
  const latestEntry = sortedHistory.length > 0 ? sortedHistory[sortedHistory.length - 1] : null;

  return (
    <div className="space-y-4">
      <OverviewKpiBar summary={summary} overview={overview} />

      <div className="h-[200px] rounded-xl bg-gradient-to-br from-slate-200 to-slate-300" />

      <CurrentStatusCard
        propertyId={id}
        summary={summary}
        monthlyMortgage={detail.property.monthly_mortgage}
        hasStatusHistory={detail.statusEntries.length > 0}
        latestStatusDate={latestEntry ? new Date(latestEntry.date + 'T00:00:00Z') : null}
      />
      <ReturnsCard summary={summary} overview={overview} />
      <FinancingCard property={detail.property} remainingDebtNow={summary.remainingDebtNow} today={today} />
      <ObjectCard property={detail.property} purchasePricePerSqm={summary.purchasePricePerSqm} />
    </div>
  );
}
```

- [ ] **Step 2: Run the full test suite**

Run: `cd web && npm test`
Expected: All PASS (this page has no dedicated test — it's pure composition of already-tested pieces — but this confirms the change didn't break anything else).

- [ ] **Step 3: Manual smoke check**

Run: `cd web && npm run dev`

Open `http://localhost:3000/properties/<an-existing-property-id>` (grab an id from the portfolio grid at `/`) and confirm the KPI bar, photo placeholder, and all 4 cards render without console errors. Then stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add "web/app/(app)/properties/[id]/page.tsx"
git commit -m "feat(property-detail): wire up the Übersicht tab"
```

---

### Task 16: `status_entries` server actions

**Files:**
- Create: `web/lib/data/statusEntryActions.ts`

No unit test — like `propertyActions.ts`, these are thin Supabase wiring covered by Task 22's manual QA (this codebase has no test harness for server actions that hit a live Supabase client).

- [ ] **Step 1: Implement**

Create `web/lib/data/statusEntryActions.ts`:

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { TablesInsert, TablesUpdate } from '@/lib/supabase/types';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function assertNoDuplicateDate(
  supabase: SupabaseClient,
  propertyId: string,
  date: string,
  excludeId?: string
): Promise<void> {
  let query = supabase.from('status_entries').select('id').eq('property_id', propertyId).eq('date', date);
  if (excludeId) query = query.neq('id', excludeId);
  const { data, error } = await query;
  if (error) throw error;
  if (data && data.length > 0) throw new Error('Für dieses Datum existiert bereits ein Statuseintrag.');
}

async function assertNotBeforeTransfer(supabase: SupabaseClient, propertyId: string, date: string): Promise<void> {
  const { data: property, error } = await supabase
    .from('properties')
    .select('economic_transfer_date')
    .eq('id', propertyId)
    .single();
  if (error) throw error;
  if (date < property.economic_transfer_date) {
    throw new Error('Das Datum darf nicht vor dem wirtschaftlichen Übergang liegen.');
  }
}

export async function createStatusEntry(
  propertyId: string,
  input: Omit<TablesInsert<'status_entries'>, 'property_id'>
): Promise<void> {
  const supabase = await createClient();
  const date = input.date;
  if (!date) throw new Error('Datum ist erforderlich.');

  await assertNoDuplicateDate(supabase, propertyId, date);
  await assertNotBeforeTransfer(supabase, propertyId, date);

  const { error } = await supabase.from('status_entries').insert({ ...input, property_id: propertyId });
  if (error) throw error;
  revalidatePath(`/properties/${propertyId}`);
}

export async function updateStatusEntry(
  id: string,
  propertyId: string,
  patch: Omit<TablesUpdate<'status_entries'>, 'property_id' | 'id'>
): Promise<void> {
  const supabase = await createClient();

  if (patch.date) {
    await assertNoDuplicateDate(supabase, propertyId, patch.date, id);
    await assertNotBeforeTransfer(supabase, propertyId, patch.date);
  }

  const { error } = await supabase.from('status_entries').update(patch).eq('id', id);
  if (error) throw error;
  revalidatePath(`/properties/${propertyId}`);
}

export async function deleteStatusEntry(id: string, propertyId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('status_entries').delete().eq('id', id);
  if (error) throw error;
  revalidatePath(`/properties/${propertyId}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/data/statusEntryActions.ts
git commit -m "feat(verlauf): add status_entries server actions"
```

---

### Task 17: `extraordinary_costs` server actions

**Files:**
- Create: `web/lib/data/extraordinaryCostActions.ts`

- [ ] **Step 1: Implement**

Create `web/lib/data/extraordinaryCostActions.ts`:

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { TablesInsert, TablesUpdate } from '@/lib/supabase/types';

export async function createExtraordinaryCost(
  propertyId: string,
  input: Omit<TablesInsert<'extraordinary_costs'>, 'property_id'>
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('extraordinary_costs').insert({ ...input, property_id: propertyId });
  if (error) throw error;
  revalidatePath(`/properties/${propertyId}`);
}

export async function updateExtraordinaryCost(
  id: string,
  propertyId: string,
  patch: Omit<TablesUpdate<'extraordinary_costs'>, 'property_id' | 'id'>
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('extraordinary_costs').update(patch).eq('id', id);
  if (error) throw error;
  revalidatePath(`/properties/${propertyId}`);
}

export async function deleteExtraordinaryCost(id: string, propertyId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('extraordinary_costs').delete().eq('id', id);
  if (error) throw error;
  revalidatePath(`/properties/${propertyId}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/data/extraordinaryCostActions.ts
git commit -m "feat(verlauf): add extraordinary_costs server actions"
```

---

### Task 18: `StatusEntryModal`

**Files:**
- Create: `web/components/property/verlauf/StatusEntryModal.tsx`

- [ ] **Step 1: Implement**

Create `web/components/property/verlauf/StatusEntryModal.tsx`:

```typescript
'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/TextField';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { createStatusEntry, updateStatusEntry } from '@/lib/data/statusEntryActions';
import type { Database } from '@/lib/supabase/types';

type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];
type PropertyStatus = Database['public']['Enums']['property_status'];

interface FormValues {
  date: string;
  status: PropertyStatus;
  incomeActualMonthly: number | null;
  notes: string;
}

const STATUS_OPTIONS: Array<[PropertyStatus, string]> = [
  ['vermietet', 'Vermietet'],
  ['leerstand', 'Leerstand'],
  ['mietgarantie', 'Mietgarantie'],
];

export function StatusEntryModal({
  open,
  onClose,
  propertyId,
  entry,
}: {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  entry: StatusEntryRow | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { register, handleSubmit, watch } = useForm<FormValues>({
    values: {
      date: entry?.date ?? new Date().toISOString().slice(0, 10),
      status: entry?.status ?? 'vermietet',
      incomeActualMonthly: entry?.income_actual_monthly ?? null,
      notes: entry?.notes ?? '',
    },
  });
  const status = watch('status');

  function onSubmit(values: FormValues) {
    setSubmitError(null);
    startTransition(async () => {
      try {
        const payload = {
          date: values.date,
          status: values.status,
          income_actual_monthly: values.status === 'mietgarantie' ? values.incomeActualMonthly : null,
          notes: values.notes,
        };
        if (entry) {
          await updateStatusEntry(entry.id, propertyId, payload);
        } else {
          await createStatusEntry(propertyId, payload);
        }
        onClose();
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={entry ? 'Status bearbeiten' : 'Status hinzufügen'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <TextField label="Datum" name="date" register={register} type="date" required />
        <label className="block">
          <span className="text-[13px] font-medium text-text-secondary">Status</span>
          <select
            {...register('status')}
            className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm text-text-primary"
          >
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {status === 'mietgarantie' && <CurrencyField label="Einnahme/Monat" name="incomeActualMonthly" register={register} />}
        <TextField label="Notizen" name="notes" register={register} />
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

- [ ] **Step 2: Commit**

```bash
git add web/components/property/verlauf/StatusEntryModal.tsx
git commit -m "feat(verlauf): add StatusEntryModal"
```

---

### Task 19: `ExtraordinaryCostModal`

**Files:**
- Create: `web/components/property/verlauf/ExtraordinaryCostModal.tsx`

- [ ] **Step 1: Implement**

Create `web/components/property/verlauf/ExtraordinaryCostModal.tsx`:

```typescript
'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/TextField';
import { CurrencyField } from '@/components/ui/CurrencyField';
import { createExtraordinaryCost, updateExtraordinaryCost } from '@/lib/data/extraordinaryCostActions';
import type { Database } from '@/lib/supabase/types';

type ExtraordinaryCostRow = Database['public']['Tables']['extraordinary_costs']['Row'];
type CostCategory = Database['public']['Enums']['extraordinary_cost_category'];

interface FormValues {
  costMonth: string;
  category: CostCategory;
  amount: number;
  descriptionText: string;
  isDeductible: boolean;
}

const CATEGORY_OPTIONS: Array<[CostCategory, string]> = [
  ['sonderumlage', 'Sonderumlage'],
  ['reparatur', 'Reparatur'],
  ['gutachter', 'Gutachter'],
  ['rechtskosten', 'Rechtskosten'],
  ['sonstiges', 'Sonstiges'],
];

export function ExtraordinaryCostModal({
  open,
  onClose,
  propertyId,
  entry,
}: {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  entry: ExtraordinaryCostRow | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { register, handleSubmit } = useForm<FormValues>({
    values: {
      costMonth: entry?.cost_month ?? new Date().toISOString().slice(0, 10),
      category: entry?.category ?? 'sonstiges',
      amount: entry?.amount ?? 0,
      descriptionText: entry?.description_text ?? '',
      isDeductible: entry?.is_deductible ?? true,
    },
  });

  function onSubmit(values: FormValues) {
    setSubmitError(null);
    startTransition(async () => {
      try {
        const payload = {
          cost_month: values.costMonth,
          category: values.category,
          amount: values.amount,
          description_text: values.descriptionText || null,
          is_deductible: values.isDeductible,
        };
        if (entry) {
          await updateExtraordinaryCost(entry.id, propertyId, payload);
        } else {
          await createExtraordinaryCost(propertyId, payload);
        }
        onClose();
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={entry ? 'Kosten bearbeiten' : 'Kosten hinzufügen'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <TextField label="Datum" name="costMonth" register={register} type="date" required />
        <label className="block">
          <span className="text-[13px] font-medium text-text-secondary">Kategorie</span>
          <select
            {...register('category')}
            className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm text-text-primary"
          >
            {CATEGORY_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <CurrencyField label="Betrag" name="amount" register={register} required />
        <TextField label="Beschreibung (optional)" name="descriptionText" register={register} />
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input type="checkbox" {...register('isDeductible')} />
          Steuerlich absetzbar
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

- [ ] **Step 2: Commit**

```bash
git add web/components/property/verlauf/ExtraordinaryCostModal.tsx
git commit -m "feat(verlauf): add ExtraordinaryCostModal"
```

---

### Task 20: `VerlaufFeed`

**Files:**
- Create: `web/components/property/verlauf/VerlaufFeed.tsx`

- [ ] **Step 1: Implement**

Create `web/components/property/verlauf/VerlaufFeed.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatusEntryModal } from './StatusEntryModal';
import { ExtraordinaryCostModal } from './ExtraordinaryCostModal';
import { deleteStatusEntry } from '@/lib/data/statusEntryActions';
import { deleteExtraordinaryCost } from '@/lib/data/extraordinaryCostActions';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { Database } from '@/lib/supabase/types';

type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];
type ExtraordinaryCostRow = Database['public']['Tables']['extraordinary_costs']['Row'];

type FeedItem = { kind: 'status'; date: string; row: StatusEntryRow } | { kind: 'cost'; date: string; row: ExtraordinaryCostRow };

const CATEGORY_LABELS: Record<ExtraordinaryCostRow['category'], string> = {
  sonderumlage: 'Sonderumlage',
  reparatur: 'Reparatur',
  gutachter: 'Gutachter',
  rechtskosten: 'Rechtskosten',
  sonstiges: 'Sonstiges',
};

function sortFeed(items: FeedItem[]): FeedItem[] {
  // Same-date ties: StatusEntry has created_at (later wins, per spec-verlauf-tab.md).
  // ExtraordinaryCost has no created_at in the Plan-1 schema, so a tie involving a cost
  // keeps the array's incoming order (Array.sort is stable) — an accepted gap, not
  // something in scope for this plan to fix.
  return [...items].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    if (a.kind === 'status' && b.kind === 'status') return b.row.created_at.localeCompare(a.row.created_at);
    return 0;
  });
}

function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso + 'T00:00:00Z').getTime();
  const end = new Date(endIso + 'T00:00:00Z').getTime();
  return Math.round((end - start) / 86_400_000);
}

export function VerlaufFeed({
  propertyId,
  statusEntries,
  extraordinaryCosts,
}: {
  propertyId: string;
  statusEntries: StatusEntryRow[];
  extraordinaryCosts: ExtraordinaryCostRow[];
}) {
  const [statusModal, setStatusModal] = useState<{ open: boolean; entry: StatusEntryRow | null }>({ open: false, entry: null });
  const [costModal, setCostModal] = useState<{ open: boolean; entry: ExtraordinaryCostRow | null }>({ open: false, entry: null });

  const ascendingStatus = [...statusEntries].sort((a, b) => a.date.localeCompare(b.date));
  function endDateFor(row: StatusEntryRow): string | null {
    const idx = ascendingStatus.findIndex((e) => e.id === row.id);
    return idx >= 0 && idx + 1 < ascendingStatus.length ? ascendingStatus[idx + 1].date : null;
  }

  const items: FeedItem[] = sortFeed([
    ...statusEntries.map((row): FeedItem => ({ kind: 'status', date: row.date, row })),
    ...extraordinaryCosts.map((row): FeedItem => ({ kind: 'cost', date: row.cost_month, row })),
  ]);

  async function handleDeleteStatus(id: string) {
    if (!window.confirm('Diesen Statuseintrag löschen?')) return;
    await deleteStatusEntry(id, propertyId);
  }

  async function handleDeleteCost(id: string) {
    if (!window.confirm('Diesen Kosteneintrag löschen?')) return;
    await deleteExtraordinaryCost(id, propertyId);
  }

  return (
    <div>
      <div className="mb-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setStatusModal({ open: true, entry: null })}
          className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white"
        >
          <Plus size={14} /> Status
        </button>
        <button
          type="button"
          onClick={() => setCostModal({ open: true, entry: null })}
          className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white"
        >
          <Plus size={14} /> Kosten
        </button>
      </div>

      {items.length === 0 ? (
        <div className="glass-card p-4 text-center">
          <p className="text-sm text-text-secondary">Noch kein Statusverlauf.</p>
          <button
            type="button"
            onClick={() => setStatusModal({ open: true, entry: null })}
            className="mt-2 text-sm font-semibold text-accent hover:underline"
          >
            + Ersten Status hinzufügen
          </button>
        </div>
      ) : (
        <div className="glass-card divide-y divide-black/[0.06] p-0">
          {items.map((item) =>
            item.kind === 'status' ? (
              <div key={`status-${item.row.id}`} className="flex items-center justify-between px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={item.row.status} />
                  {(() => {
                    const end = endDateFor(item.row);
                    const start = new Date(item.row.date + 'T00:00:00Z');
                    return end ? (
                      <span className="text-sm text-text-secondary">
                        {formatDate(start)} – {formatDate(new Date(end + 'T00:00:00Z'))} ({daysBetween(item.row.date, end)} Tage)
                      </span>
                    ) : (
                      <span className="text-sm text-text-secondary">seit {formatDate(start)}</span>
                    );
                  })()}
                  {item.row.status === 'mietgarantie' && item.row.income_actual_monthly !== null && (
                    <span className="text-sm text-text-dim">{formatCurrency(item.row.income_actual_monthly)}/Monat</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStatusModal({ open: true, entry: item.row })}
                    aria-label="Bearbeiten"
                    className="text-text-dim hover:text-accent"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteStatus(item.row.id)}
                    aria-label="Löschen"
                    className="text-text-dim hover:text-negative"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div key={`cost-${item.row.id}`} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-text-primary">
                    {item.row.description_text || CATEGORY_LABELS[item.row.category]}{' '}
                    <span className="text-xs text-text-dim">({formatDate(new Date(item.row.cost_month + 'T00:00:00Z'))})</span>
                  </p>
                  <p className="text-sm text-negative">
                    {formatCurrency(-item.row.amount)}{' '}
                    <span
                      className={`ml-1 rounded px-1.5 py-0.5 text-xs ${
                        item.row.is_deductible ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.row.is_deductible ? 'absetzbar' : 'nicht absetzbar'}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCostModal({ open: true, entry: item.row })}
                    aria-label="Bearbeiten"
                    className="text-text-dim hover:text-accent"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCost(item.row.id)}
                    aria-label="Löschen"
                    className="text-text-dim hover:text-negative"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      <StatusEntryModal
        open={statusModal.open}
        onClose={() => setStatusModal({ open: false, entry: null })}
        propertyId={propertyId}
        entry={statusModal.entry}
      />
      <ExtraordinaryCostModal
        open={costModal.open}
        onClose={() => setCostModal({ open: false, entry: null })}
        propertyId={propertyId}
        entry={costModal.entry}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/property/verlauf/VerlaufFeed.tsx
git commit -m "feat(verlauf): add combined status/cost feed"
```

---

### Task 21: Wire the Verlauf page

**Files:**
- Create: `web/app/(app)/properties/[id]/verlauf/page.tsx` (doesn't exist yet — Task 7 only created the four *other* placeholder tabs; Verlauf gets its real implementation directly)

- [ ] **Step 1: Implement**

Create `web/app/(app)/properties/[id]/verlauf/page.tsx`:

```typescript
import { notFound } from 'next/navigation';
import { getPropertyDetail } from '@/lib/data/propertyDetail';
import { VerlaufFeed } from '@/components/property/verlauf/VerlaufFeed';

export default async function VerlaufTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPropertyDetail(id);
  if (!detail) notFound();

  return (
    <VerlaufFeed propertyId={id} statusEntries={detail.statusEntries} extraordinaryCosts={detail.extraordinaryCosts} />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "web/app/(app)/properties/[id]/verlauf/page.tsx"
git commit -m "feat(property-detail): wire up the Verlauf tab"
```

---

### Task 22: Full-suite verification and manual QA

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated test suite**

Run: `cd web && npm test`
Expected: All test files PASS, no regressions.

- [ ] **Step 2: Run the linter/typechecker**

Run: `cd web && npm run lint` (and `npx tsc --noEmit` if there's no separate typecheck script — check `package.json`'s `scripts` block first)
Expected: No errors.

- [ ] **Step 3: Manual walkthrough**

Run: `cd web && npm run dev`

Walk through, on an existing property (or a fresh one created via the Plan-3 wizard):
1. Portfolio grid (`/`) → click a property card → lands on `/properties/[id]` (Übersicht).
2. KPI bar shows 4 values with sensible signs/colors; DSCR chip color matches the benchmark table.
3. All 6 tabs are clickable; the 4 unbuilt ones show their "kommt in Plan X" placeholder; Übersicht and Verlauf are active/highlighted correctly per current route.
4. Card 1 (Aktueller Stand): shows the empty state + "+ Ersten Status hinzufügen" link for a property with no status history; shows the full breakdown once one exists.
5. Card 2 KPI chips: click each ⓘ icon — modal opens with formula/meaning/benchmark table/context, closes on Escape, on backdrop click, and on the × button.
6. Card 3: shows "Keine Finanzierung erfasst." when `loan_amount = 0`; shows all 6 fields otherwise.
7. Card 4: object fields render, notes only appear when non-empty.
8. Verlauf tab: "+ Status" and "+ Kosten" open their modals; submitting a status entry with a date matching an existing one shows the duplicate-date error; submitting a date before `economic_transfer_date` shows that error; a valid submission closes the modal and the feed updates (revalidated); edit and delete both work for both entry types; deleting the last entry shows the empty state again.
9. Stop the dev server (`Ctrl+C`).

- [ ] **Step 4: Report results**

If anything in Step 3 doesn't match, fix it (with a matching test update where the mismatch is in a pure-calculation file) before considering this plan done. Once everything checks out, this plan is complete — Plan 5 (Cashflow, Steuer) and Plan 6 (Finanzierung, Immobiliendaten, edit-flow) pick up from here.
