# Property Detail — Cashflow & Steuer Tabs (Plan 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `web/app/(app)/properties/[id]/cashflow/page.tsx` and `.../steuer/page.tsx` placeholders (currently `<p>Cashflow-Tab kommt in Plan 5.</p>` / `<p>Steuer-Tab kommt in Plan 5.</p>`) with the full tabs described in `docs/specs/spec-cashflow-tab.md` and `docs/specs/spec-steuer-tab.md`: a "Prognose / Monat" card + a 12-month year table for Cashflow, and a "Laufendes Jahr" (Ist) + "Prognose" section pair for Steuer.

**Architecture:** Extend the Plan-1 pure calculation layer (`lib/calculations/cashflowCalculator.ts`, `lib/calculations/taxCalculator.ts`) with itemized ("line item") variants of the existing total-only functions — the tabs need every cost line (Hausgeld-Anteile, Grundsteuer, Versicherung, …) broken out, not just the final cashflow/taxable-income number. `taxCalculator.annualTaxableIncome` is refactored to delegate to a new `annualTaxableIncomeBreakdown` so the existing (already-shipped, Plan-4-consumed) function keeps its exact signature and numeric behavior — verified by re-running its existing test suite unchanged. Two new `lib/data/` composition files (`propertyTax.ts`, `propertyCashflow.ts`, alongside the existing `propertyOverview.ts`/`propertySummary.ts`) wire the calculation layer to real `properties`/`status_entries`/`extraordinary_costs` rows; `propertyCashflow.ts` depends on `propertyTax.ts` so both tabs share one "current year tax effect" computation (the spec requires them to always agree). Both tabs are interactive (scenario toggle, year picker) with no persistence requirement, so — unlike the Übersicht tab's server-computed props — `CashflowTab`/`SteuerTab` are `'use client'` components that call the (pure, I/O-free) data-layer functions directly on every render, matching how wizard step components already import `lib/calculations/*` client-side.

**Tech Stack:** Next.js App Router (RSC + Client Components), Supabase, Tailwind, Vitest.

**Ground truth note:** Neither `annualTaxableIncome` (existing) nor `computePropertySummary`/`computeOverviewMetrics` (Plan 4, already shipped) currently subtract deductible `extraordinary_costs` from taxable income, even though `spec-steuer-tab.md` requires it — a pre-existing gap in the Übersicht tab's `taxEffectYearly`/`cashOnCash` KPIs. This plan adds a new *optional* field (`extraordinaryCostsDeductibleYearly`) to the breakdown function it introduces, but deliberately does **not** change `AnnualTaxableIncomeInput`'s existing exported shape or touch Plan 4's call sites (`propertySummary.ts`, `propertyOverview.ts`) — fixing that gap would mean modifying already-shipped, already-tested Übersicht-tab code, which is out of this plan's scope (Cashflow + Steuer tabs only). The Steuer tab's own current-year computation (`propertyTax.ts`, Task 7) correctly includes it, since the spec explicitly requires it there.

---

### Task 1: `dominantStatusForMonth` (Cashflow year table's per-column status badge)

**Files:**
- Modify: `web/lib/calculations/statusPeriodCalculator.ts`
- Test: `web/tests/calculations/statusPeriodCalculator.test.ts`

The Cashflow year table shows a status badge under each month header (e.g. "Feb / Mietgarantie"). `segments()` (already in this file, module-private) breaks a month into day-fraction-weighted status segments — this task adds an exported wrapper that picks the segment covering the most days.

- [ ] **Step 1: Write the failing test**

Add to `web/tests/calculations/statusPeriodCalculator.test.ts`'s import block:

```typescript
import { dominantStatusForMonth } from '@/lib/calculations/statusPeriodCalculator';
```

Add this `describe` block at the end of the file:

```typescript
describe('dominantStatusForMonth', () => {
  const today = makeDate(2026, 12, 31);

  it('returns the status covering the most days in the month', () => {
    // Jun 1-9 leerstand (9 days), Jun 10-30 vermietet (21 days) -> vermietet wins.
    const history = [entry('leerstand', 2026, 1, 1), entry('vermietet', 2026, 6, 10)];
    const result = dominantStatusForMonth(makeDate(2026, 6, 1), history, today);
    expect(result).toBe('vermietet');
  });

  it('a fully vermietet month returns vermietet', () => {
    const history = [entry('vermietet', 2026, 2, 1)];
    const result = dominantStatusForMonth(makeDate(2026, 6, 1), history, today);
    expect(result).toBe('vermietet');
  });

  it('no status history at all defaults to leerstand (single full-month segment)', () => {
    const result = dominantStatusForMonth(makeDate(2026, 6, 1), [], today);
    expect(result).toBe('leerstand');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/calculations/statusPeriodCalculator.test.ts`
Expected: FAIL — `dominantStatusForMonth is not a function`.

- [ ] **Step 3: Implement**

Add to the end of `web/lib/calculations/statusPeriodCalculator.ts`:

```typescript
/**
 * The status covering the most days of `month` — feeds the Cashflow year
 * table's per-column status badge. Ties keep whichever segment `reduce`
 * encounters first (the chronologically earliest transition day within the
 * month), since no explicit tiebreaker is specified.
 */
export function dominantStatusForMonth(month: Date, statusHistory: StatusEntry[], today: Date): PropertyStatus {
  const monthSegments = segments(month, statusHistory, today);
  return monthSegments.reduce((best, seg) => (seg.dayFraction > best.dayFraction ? seg : best)).status;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/calculations/statusPeriodCalculator.test.ts`
Expected: PASS (all tests in the file, old and new).

- [ ] **Step 5: Commit**

```bash
git add web/lib/calculations/statusPeriodCalculator.ts web/tests/calculations/statusPeriodCalculator.test.ts
git commit -m "feat(calculations): add dominantStatusForMonth"
```

---

### Task 2: `ownerBorneRecoverableWEBreakdown` (split the combined Umlagef./Grundsteuer WE value)

**Files:**
- Modify: `web/lib/calculations/cashflowCalculator.ts`
- Test: `web/tests/calculations/cashflowCalculator.test.ts`

The existing `ownerBorneRecoverableWEForMonth` returns one combined number (`hoaFeeRecoverableMonthly + propertyTaxAnnual/12`, day-fraction-weighted). Both Cashflow tab cards show "Umlagef. Kosten WE" and "Grundsteuer WE" as **separate** rows — this task splits the calculation into a breakdown, then re-expresses the existing function in terms of it (zero behavior change, verified against the existing function's own output).

- [ ] **Step 1: Write the failing test**

Add to `web/tests/calculations/cashflowCalculator.test.ts`'s import block:

```typescript
import { ownerBorneRecoverableWEBreakdown } from '@/lib/calculations/cashflowCalculator';
```

Add inside the top-level `describe('cashflowCalculator', ...)` block, after the existing `ownerBorneRecoverableWEForMonth` tests:

```typescript
  it('ownerBorneRecoverableWEBreakdown: splits into hoaRecoverable + propertyTax, summing to the combined function', () => {
    const history: StatusEntry[] = [{ date: makeDate(2026, 2, 1), status: 'leerstand', incomeActualMonthly: null }];
    const breakdown = ownerBorneRecoverableWEBreakdown(
      makeDate(2026, 6, 1),
      history,
      today,
      f.hoaFeeRecoverableMonthly,
      f.propertyTaxAnnual
    );
    const combined = ownerBorneRecoverableWEForMonth(
      makeDate(2026, 6, 1),
      history,
      today,
      f.hoaFeeRecoverableMonthly,
      f.propertyTaxAnnual
    );
    expect(breakdown.hoaRecoverable + breakdown.propertyTax).toBeCloseTo(combined, 6);
    expect(breakdown.hoaRecoverable).toBeCloseTo(f.hoaFeeRecoverableMonthly, 2);
    expect(breakdown.propertyTax).toBeCloseTo(f.propertyTaxAnnual / 12, 4);
  });

  it('ownerBorneRecoverableWEBreakdown: vermietet all month is zero for both fields', () => {
    const history: StatusEntry[] = [{ date: makeDate(2026, 2, 1), status: 'vermietet', incomeActualMonthly: null }];
    const breakdown = ownerBorneRecoverableWEBreakdown(
      makeDate(2026, 6, 1),
      history,
      today,
      f.hoaFeeRecoverableMonthly,
      f.propertyTaxAnnual
    );
    expect(breakdown.hoaRecoverable).toBeCloseTo(0, 4);
    expect(breakdown.propertyTax).toBeCloseTo(0, 4);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/calculations/cashflowCalculator.test.ts`
Expected: FAIL — `ownerBorneRecoverableWEBreakdown is not a function`.

- [ ] **Step 3: Implement**

In `web/lib/calculations/cashflowCalculator.ts`, replace the existing `ownerBorneRecoverableWEForMonth` function with:

```typescript
export interface OwnerBorneRecoverableWEBreakdown {
  hoaRecoverable: number;
  propertyTax: number;
}

/**
 * Splits ownerBorneRecoverableWEForMonth's combined value into its two line
 * items — the Cashflow tab shows "Umlagef. Kosten WE" and "Grundsteuer WE" as
 * separate rows, both day-fraction-weighted the same way.
 */
export function ownerBorneRecoverableWEBreakdown(
  month: Date,
  statusHistory: StatusEntry[],
  today: Date,
  hoaFeeRecoverableMonthly: number,
  propertyTaxAnnual: number
): OwnerBorneRecoverableWEBreakdown {
  const fraction = leerstandDayFraction(month, statusHistory, today);
  return {
    hoaRecoverable: hoaFeeRecoverableMonthly * fraction,
    propertyTax: (propertyTaxAnnual / 12) * fraction,
  };
}

/**
 * Recoverable Wohnung (unit) costs the owner bears for a given month, day-prorated:
 * 0 on days the property is vermietet (tenant pays via Nebenkostenabrechnung),
 * full hoaFeeRecoverable + propertyTax/12 on days it is leerstand/mietgarantie.
 *
 * NOTE: takes propertyTaxAnnual here (divided internally by 12). In contrast,
 * taxCalculator.ts's equivalent field (propertyTaxUnitMonthly) expects the value
 * pre-divided to monthly instead — don't mix these up when wiring a single
 * properties row into both calculators.
 */
export function ownerBorneRecoverableWEForMonth(
  month: Date,
  statusHistory: StatusEntry[],
  today: Date,
  hoaFeeRecoverableMonthly: number,
  propertyTaxAnnual: number
): number {
  const { hoaRecoverable, propertyTax } = ownerBorneRecoverableWEBreakdown(
    month,
    statusHistory,
    today,
    hoaFeeRecoverableMonthly,
    propertyTaxAnnual
  );
  return hoaRecoverable + propertyTax;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/calculations/cashflowCalculator.test.ts`
Expected: PASS (all tests in the file, including the pre-existing `ownerBorneRecoverableWEForMonth` tests — confirming the refactor didn't change its behavior).

- [ ] **Step 5: Commit**

```bash
git add web/lib/calculations/cashflowCalculator.ts web/tests/calculations/cashflowCalculator.test.ts
git commit -m "feat(calculations): split ownerBorneRecoverableWEForMonth into a breakdown"
```

---

### Task 3: `CashflowLineItems` + `cashflowLineItemsForScenario` (Card 1 basis)

**Files:**
- Modify: `web/lib/calculations/cashflowCalculator.ts`
- Test: `web/tests/calculations/cashflowCalculator.test.ts`

Card 1 ("Prognose / Monat") is a settings-only, full-month projection for a chosen scenario (Vollvermietung / Leerstand) — no status history involved. This task adds the itemized line-item type and the scenario-based function that produces it.

- [ ] **Step 1: Write the failing test**

Add to `web/tests/calculations/cashflowCalculator.test.ts`'s import block:

```typescript
import { cashflowLineItemsForScenario, type CashflowScenarioInput } from '@/lib/calculations/cashflowCalculator';
```

Add this `describe` block at the end of the file:

```typescript
describe('cashflowLineItemsForScenario', () => {
  const baseInput: CashflowScenarioInput = {
    scenario: 'vollvermietung',
    coldRentMonthly: f.coldRentMonthly,
    parkingRentMonthly: f.parkingRentMonthly,
    otherIncomeMonthly: 0,
    monthlyMortgage: f.monthlyMortgage,
    hoaFeeNonRecoverableMonthly: f.hoaFeeNonRecoverableMonthly,
    hoaFeeMaintenanceReserveMonthly: f.maintenanceReserveMonthly,
    hoaFeeRecoverableMonthly: f.hoaFeeRecoverableMonthly,
    propertyTaxAnnual: f.propertyTaxAnnual,
    propertyInsuranceAnnual: 0,
    propertyManagementAnnual: f.propertyManagementAnnual,
    otherCostsMonthly: 0,
    hoaFeeParkingNonRecoverableMonthly: 0,
    hoaFeeParkingMaintenanceReserveMonthly: 0,
    hoaFeeParkingRecoverableMonthly: 0,
    propertyTaxParkingAnnual: 0,
    extraordinaryCostsThisMonth: 0,
  };

  it('vollvermietung: full income, no owner-borne recoverable WE costs', () => {
    const result = cashflowLineItemsForScenario(baseInput);
    expect(result.income).toBeCloseTo(998, 2); // coldRent 950 + parkingRent 48
    expect(result.hoaRecoverableWE).toBe(0);
    expect(result.propertyTaxWE).toBe(0);
    expect(result.cashflowBeforeTax).toBeCloseTo(-437.61, 1);
  });

  it('leerstand: zero income, full owner-borne recoverable WE costs', () => {
    const result = cashflowLineItemsForScenario({ ...baseInput, scenario: 'leerstand' });
    expect(result.income).toBe(0);
    expect(result.hoaRecoverableWE).toBeCloseTo(f.hoaFeeRecoverableMonthly, 2);
    expect(result.propertyTaxWE).toBeCloseTo(f.propertyTaxMonthly, 4);
    expect(result.cashflowBeforeTax).toBeCloseTo(-1744.69, 1);
  });

  it('parking (TE) costs are always owner-borne regardless of scenario', () => {
    const withParking: CashflowScenarioInput = {
      ...baseInput,
      hoaFeeParkingNonRecoverableMonthly: 20,
      hoaFeeParkingMaintenanceReserveMonthly: 5,
      hoaFeeParkingRecoverableMonthly: 10,
      propertyTaxParkingAnnual: 36, // /12 = 3
    };
    const vollvermietung = cashflowLineItemsForScenario(withParking);
    const leerstand = cashflowLineItemsForScenario({ ...withParking, scenario: 'leerstand' });
    expect(vollvermietung.hoaNonRecoverableTE).toBe(20);
    expect(vollvermietung.hoaRecoverableTE).toBe(10);
    expect(vollvermietung.propertyTaxTE).toBeCloseTo(3, 2);
    expect(leerstand.hoaNonRecoverableTE).toBe(20);
    expect(leerstand.hoaRecoverableTE).toBe(10);
    expect(leerstand.propertyTaxTE).toBeCloseTo(3, 2);
  });

  it('an extraordinary cost reduces cashflowBeforeTax by exactly its amount', () => {
    const without = cashflowLineItemsForScenario(baseInput);
    const withCost = cashflowLineItemsForScenario({ ...baseInput, extraordinaryCostsThisMonth: 500 });
    expect(without.cashflowBeforeTax - withCost.cashflowBeforeTax).toBeCloseTo(500, 2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/calculations/cashflowCalculator.test.ts`
Expected: FAIL — `cashflowLineItemsForScenario is not a function`.

- [ ] **Step 3: Implement**

Add to the end of `web/lib/calculations/cashflowCalculator.ts`:

```typescript
export interface CashflowLineItems {
  income: number;
  mortgage: number;
  hoaNonRecoverableWE: number;
  maintenanceReserveWE: number;
  insuranceWE: number;
  managementWE: number;
  otherCostsWE: number;
  hoaRecoverableWE: number;
  propertyTaxWE: number;
  hoaNonRecoverableTE: number;
  maintenanceReserveTE: number;
  hoaRecoverableTE: number;
  propertyTaxTE: number;
  extraordinaryCosts: number;
  cashflowBeforeTax: number;
}

function cashflowBeforeTaxFromLineItems(items: Omit<CashflowLineItems, 'cashflowBeforeTax'>): number {
  return (
    items.income -
    items.mortgage -
    items.hoaNonRecoverableWE -
    items.maintenanceReserveWE -
    items.insuranceWE -
    items.managementWE -
    items.otherCostsWE -
    items.hoaRecoverableWE -
    items.propertyTaxWE -
    items.hoaNonRecoverableTE -
    items.maintenanceReserveTE -
    items.hoaRecoverableTE -
    items.propertyTaxTE -
    items.extraordinaryCosts
  );
}

export interface CashflowScenarioInput {
  scenario: 'vollvermietung' | 'leerstand';
  coldRentMonthly: number;
  parkingRentMonthly: number;
  otherIncomeMonthly: number;
  monthlyMortgage: number;
  hoaFeeNonRecoverableMonthly: number;
  hoaFeeMaintenanceReserveMonthly: number;
  hoaFeeRecoverableMonthly: number;
  propertyTaxAnnual: number;
  propertyInsuranceAnnual: number;
  propertyManagementAnnual: number;
  otherCostsMonthly: number;
  hoaFeeParkingNonRecoverableMonthly: number;
  hoaFeeParkingMaintenanceReserveMonthly: number;
  hoaFeeParkingRecoverableMonthly: number;
  propertyTaxParkingAnnual: number;
  extraordinaryCostsThisMonth: number;
}

/**
 * Card 1 ("Prognose / Monat") basis — a full settings-only month for a chosen
 * scenario, no status history. Vollvermietung: full income, tenant pays
 * recoverable WE costs (0 owner-borne). Leerstand: zero income, owner bears
 * the full recoverable WE costs. Parking (TE) costs are always owner-borne
 * in both scenarios, per spec-cashflow-tab.md.
 */
export function cashflowLineItemsForScenario(input: CashflowScenarioInput): CashflowLineItems {
  const income =
    input.scenario === 'vollvermietung' ? input.coldRentMonthly + input.parkingRentMonthly + input.otherIncomeMonthly : 0;
  const hoaRecoverableWE = input.scenario === 'leerstand' ? input.hoaFeeRecoverableMonthly : 0;
  const propertyTaxWE = input.scenario === 'leerstand' ? input.propertyTaxAnnual / 12 : 0;

  const items: Omit<CashflowLineItems, 'cashflowBeforeTax'> = {
    income,
    mortgage: input.monthlyMortgage,
    hoaNonRecoverableWE: input.hoaFeeNonRecoverableMonthly,
    maintenanceReserveWE: input.hoaFeeMaintenanceReserveMonthly,
    insuranceWE: input.propertyInsuranceAnnual / 12,
    managementWE: input.propertyManagementAnnual / 12,
    otherCostsWE: input.otherCostsMonthly,
    hoaRecoverableWE,
    propertyTaxWE,
    hoaNonRecoverableTE: input.hoaFeeParkingNonRecoverableMonthly,
    maintenanceReserveTE: input.hoaFeeParkingMaintenanceReserveMonthly,
    hoaRecoverableTE: input.hoaFeeParkingRecoverableMonthly,
    propertyTaxTE: input.propertyTaxParkingAnnual / 12,
    extraordinaryCosts: input.extraordinaryCostsThisMonth,
  };

  return { ...items, cashflowBeforeTax: cashflowBeforeTaxFromLineItems(items) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/calculations/cashflowCalculator.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/calculations/cashflowCalculator.ts web/tests/calculations/cashflowCalculator.test.ts
git commit -m "feat(calculations): add cashflowLineItemsForScenario"
```

---

### Task 4: `cashflowLineItemsForActualMonth` (Card 2 basis — day-fraction-aware, uses status history)

**Files:**
- Modify: `web/lib/calculations/cashflowCalculator.ts`
- Test: `web/tests/calculations/cashflowCalculator.test.ts`

Card 2 (year table)'s monthly columns use the real status history for actual/projected income and owner-borne recoverable costs, reusing `incomeForMonth` and the Task 2 breakdown.

- [ ] **Step 1: Write the failing test**

Add to `web/tests/calculations/cashflowCalculator.test.ts`'s import block:

```typescript
import { cashflowLineItemsForActualMonth, type CashflowActualMonthInput } from '@/lib/calculations/cashflowCalculator';
```

Add this `describe` block at the end of the file:

```typescript
describe('cashflowLineItemsForActualMonth', () => {
  const baseInput: Omit<CashflowActualMonthInput, 'month' | 'statusHistory' | 'today'> = {
    coldRentMonthly: f.coldRentMonthly,
    parkingRentMonthly: f.parkingRentMonthly,
    monthlyMortgage: f.monthlyMortgage,
    hoaFeeNonRecoverableMonthly: f.hoaFeeNonRecoverableMonthly,
    hoaFeeMaintenanceReserveMonthly: f.maintenanceReserveMonthly,
    hoaFeeRecoverableMonthly: f.hoaFeeRecoverableMonthly,
    propertyTaxAnnual: f.propertyTaxAnnual,
    propertyInsuranceAnnual: 0,
    propertyManagementAnnual: f.propertyManagementAnnual,
    otherCostsMonthly: 0,
    hoaFeeParkingNonRecoverableMonthly: 0,
    hoaFeeParkingMaintenanceReserveMonthly: 0,
    hoaFeeParkingRecoverableMonthly: 0,
    propertyTaxParkingAnnual: 0,
    extraordinaryCostsThisMonth: 0,
  };
  const today = makeDate(2026, 12, 31);

  it('fully vermietet since before this month matches the vollvermietung scenario result', () => {
    const history: StatusEntry[] = [{ date: makeDate(2026, 2, 1), status: 'vermietet', incomeActualMonthly: null }];
    const result = cashflowLineItemsForActualMonth({ ...baseInput, month: makeDate(2026, 6, 1), statusHistory: history, today });
    expect(result.income).toBeCloseTo(998, 2);
    expect(result.hoaRecoverableWE).toBe(0);
    expect(result.cashflowBeforeTax).toBeCloseTo(-437.61, 1);
  });

  it('fully leerstand since before this month matches the leerstand scenario result', () => {
    const history: StatusEntry[] = [{ date: makeDate(2026, 2, 1), status: 'leerstand', incomeActualMonthly: null }];
    const result = cashflowLineItemsForActualMonth({ ...baseInput, month: makeDate(2026, 6, 1), statusHistory: history, today });
    expect(result.income).toBe(0);
    expect(result.hoaRecoverableWE).toBeCloseTo(f.hoaFeeRecoverableMonthly, 2);
    expect(result.cashflowBeforeTax).toBeCloseTo(-1744.69, 1);
  });

  it('mid-month transition day-fraction-weights both income and recoverable WE costs', () => {
    // 30-day June: leerstand days 1-15, vermietet days 16-30 (15/30 each).
    const history: StatusEntry[] = [
      { date: makeDate(2026, 2, 1), status: 'leerstand', incomeActualMonthly: null },
      { date: makeDate(2026, 6, 16), status: 'vermietet', incomeActualMonthly: null },
    ];
    const result = cashflowLineItemsForActualMonth({ ...baseInput, month: makeDate(2026, 6, 1), statusHistory: history, today });
    expect(result.income).toBeCloseTo(998 * 0.5, 2);
    expect(result.hoaRecoverableWE).toBeCloseTo(f.hoaFeeRecoverableMonthly * 0.5, 2);
    expect(result.propertyTaxWE).toBeCloseTo(f.propertyTaxMonthly * 0.5, 2);
  });

  it('passes extraordinaryCostsThisMonth through to the line item and the total', () => {
    const history: StatusEntry[] = [{ date: makeDate(2026, 2, 1), status: 'vermietet', incomeActualMonthly: null }];
    const result = cashflowLineItemsForActualMonth({
      ...baseInput,
      month: makeDate(2026, 6, 1),
      statusHistory: history,
      today,
      extraordinaryCostsThisMonth: 500,
    });
    expect(result.extraordinaryCosts).toBe(500);
    expect(result.cashflowBeforeTax).toBeCloseTo(-437.61 - 500, 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/calculations/cashflowCalculator.test.ts`
Expected: FAIL — `cashflowLineItemsForActualMonth is not a function`.

- [ ] **Step 3: Implement**

Add to the end of `web/lib/calculations/cashflowCalculator.ts`:

```typescript
export interface CashflowActualMonthInput {
  month: Date;
  statusHistory: StatusEntry[];
  today: Date;
  coldRentMonthly: number;
  parkingRentMonthly: number;
  monthlyMortgage: number;
  hoaFeeNonRecoverableMonthly: number;
  hoaFeeMaintenanceReserveMonthly: number;
  hoaFeeRecoverableMonthly: number;
  propertyTaxAnnual: number;
  propertyInsuranceAnnual: number;
  propertyManagementAnnual: number;
  otherCostsMonthly: number;
  hoaFeeParkingNonRecoverableMonthly: number;
  hoaFeeParkingMaintenanceReserveMonthly: number;
  hoaFeeParkingRecoverableMonthly: number;
  propertyTaxParkingAnnual: number;
  extraordinaryCostsThisMonth: number;
}

/**
 * Card 2 (year table) basis — a real calendar month, day-fraction-weighted
 * by the actual status history (via incomeForMonth / ownerBorneRecoverableWEBreakdown).
 * Past months are Ist, the in-progress month is Ist-to-date + projection,
 * future months project the last known status — all handled by those two
 * functions already.
 */
export function cashflowLineItemsForActualMonth(input: CashflowActualMonthInput): CashflowLineItems {
  const income = incomeForMonth(input.month, input.statusHistory, input.today, input.coldRentMonthly, input.parkingRentMonthly);
  const { hoaRecoverable: hoaRecoverableWE, propertyTax: propertyTaxWE } = ownerBorneRecoverableWEBreakdown(
    input.month,
    input.statusHistory,
    input.today,
    input.hoaFeeRecoverableMonthly,
    input.propertyTaxAnnual
  );

  const items: Omit<CashflowLineItems, 'cashflowBeforeTax'> = {
    income,
    mortgage: input.monthlyMortgage,
    hoaNonRecoverableWE: input.hoaFeeNonRecoverableMonthly,
    maintenanceReserveWE: input.hoaFeeMaintenanceReserveMonthly,
    insuranceWE: input.propertyInsuranceAnnual / 12,
    managementWE: input.propertyManagementAnnual / 12,
    otherCostsWE: input.otherCostsMonthly,
    hoaRecoverableWE,
    propertyTaxWE,
    hoaNonRecoverableTE: input.hoaFeeParkingNonRecoverableMonthly,
    maintenanceReserveTE: input.hoaFeeParkingMaintenanceReserveMonthly,
    hoaRecoverableTE: input.hoaFeeParkingRecoverableMonthly,
    propertyTaxTE: input.propertyTaxParkingAnnual / 12,
    extraordinaryCosts: input.extraordinaryCostsThisMonth,
  };

  return { ...items, cashflowBeforeTax: cashflowBeforeTaxFromLineItems(items) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/calculations/cashflowCalculator.test.ts`
Expected: PASS (full file).

- [ ] **Step 5: Commit**

```bash
git add web/lib/calculations/cashflowCalculator.ts web/tests/calculations/cashflowCalculator.test.ts
git commit -m "feat(calculations): add cashflowLineItemsForActualMonth"
```

---

### Task 5: `TaxLineItems` + `annualTaxableIncomeBreakdown` (refactor `annualTaxableIncome` to delegate)

**Files:**
- Modify: `web/lib/calculations/taxCalculator.ts`
- Test: `web/tests/calculations/taxCalculator.test.ts`

The Steuer tab needs every deduction as its own row. This task adds `annualTaxableIncomeBreakdown` (the itemized version, with one new input field for deductible extraordinary costs) and re-expresses the existing `annualTaxableIncome` as a thin wrapper around it (`extraordinaryCostsDeductibleYearly: 0`) — **`AnnualTaxableIncomeInput`'s existing fields and `annualTaxableIncome`'s exported signature are untouched**, so this is a behavior-preserving refactor, confirmed by re-running the pre-existing tests unchanged in Step 4.

- [ ] **Step 1: Write the failing test**

Add to `web/tests/calculations/taxCalculator.test.ts`'s import block:

```typescript
import { annualTaxableIncomeBreakdown } from '@/lib/calculations/taxCalculator';
```

Add this `describe` block at the end of the file:

```typescript
describe('taxCalculator.annualTaxableIncomeBreakdown', () => {
  it('taxableIncome matches annualTaxableIncome for the same input when extraordinaryCostsDeductibleYearly is 0', () => {
    const history: StatusEntry[] = [{ date: f.economicTransferDate, status: 'vermietet', incomeActualMonthly: null }];
    const breakdown = annualTaxableIncomeBreakdown({
      ...baseInput,
      year: 2026,
      statusHistory: history,
      today: makeDate(2026, 12, 31),
      extraordinaryCostsDeductibleYearly: 0,
    });
    expect(breakdown.taxableIncome).toBeCloseTo(-9100.44, 0);
  });

  it('a deductible extraordinary cost reduces taxableIncome by exactly its amount', () => {
    const history: StatusEntry[] = [{ date: f.economicTransferDate, status: 'vermietet', incomeActualMonthly: null }];
    const without = annualTaxableIncomeBreakdown({
      ...baseInput,
      year: 2026,
      statusHistory: history,
      today: makeDate(2026, 12, 31),
      extraordinaryCostsDeductibleYearly: 0,
    });
    const withCost = annualTaxableIncomeBreakdown({
      ...baseInput,
      year: 2026,
      statusHistory: history,
      today: makeDate(2026, 12, 31),
      extraordinaryCostsDeductibleYearly: 800,
    });
    expect(without.taxableIncome - withCost.taxableIncome).toBeCloseTo(800, 2);
    expect(withCost.extraordinaryCostsDeductible).toBe(800);
  });

  it('line items sum to taxableIncome (mixed leerstand/vermietet year)', () => {
    const history: StatusEntry[] = [
      { date: f.economicTransferDate, status: 'leerstand', incomeActualMonthly: null },
      { date: makeDate(2026, 3, 1), status: 'vermietet', incomeActualMonthly: null },
    ];
    const breakdown = annualTaxableIncomeBreakdown({
      ...baseInput,
      year: 2026,
      statusHistory: history,
      today: makeDate(2026, 12, 31),
      extraordinaryCostsDeductibleYearly: 0,
    });
    const recomputed =
      breakdown.income -
      breakdown.interest -
      breakdown.depreciation -
      breakdown.hoaNonRecoverableWE -
      breakdown.insuranceWE -
      breakdown.managementWE -
      breakdown.otherCostsWE -
      breakdown.hoaRecoverableWE -
      breakdown.propertyTaxWE -
      breakdown.hoaNonRecoverableTE -
      breakdown.hoaRecoverableTE -
      breakdown.propertyTaxTE -
      breakdown.extraordinaryCostsDeductible;
    expect(recomputed).toBeCloseTo(breakdown.taxableIncome, 6);
    expect(breakdown.taxableIncome).toBeCloseTo(-10407.52, 0);
  });

  it('a year entirely before ownership returns all-zero line items', () => {
    const breakdown = annualTaxableIncomeBreakdown({
      ...baseInput,
      year: 2024,
      statusHistory: [],
      today: makeDate(2024, 12, 31),
      extraordinaryCostsDeductibleYearly: 500,
    });
    expect(breakdown.taxableIncome).toBe(0);
    expect(breakdown.income).toBe(0);
    expect(breakdown.extraordinaryCostsDeductible).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/calculations/taxCalculator.test.ts`
Expected: FAIL — `annualTaxableIncomeBreakdown is not a function`.

- [ ] **Step 3: Implement**

In `web/lib/calculations/taxCalculator.ts`, replace the existing `annualTaxableIncome` function (keep everything above it — the imports and `AnnualTaxableIncomeInput` interface — unchanged) with:

```typescript
export interface TaxLineItems {
  income: number;
  interest: number;
  depreciation: number;
  hoaNonRecoverableWE: number;
  insuranceWE: number;
  managementWE: number;
  otherCostsWE: number;
  hoaRecoverableWE: number;
  propertyTaxWE: number;
  hoaNonRecoverableTE: number;
  hoaRecoverableTE: number;
  propertyTaxTE: number;
  extraordinaryCostsDeductible: number;
  taxableIncome: number;
}

export interface AnnualTaxableIncomeBreakdownInput extends AnnualTaxableIncomeInput {
  /** Sum of extraordinary_costs.amount for the year where is_deductible = true. */
  extraordinaryCostsDeductibleYearly: number;
}

const ZERO_TAX_LINE_ITEMS: TaxLineItems = {
  income: 0,
  interest: 0,
  depreciation: 0,
  hoaNonRecoverableWE: 0,
  insuranceWE: 0,
  managementWE: 0,
  otherCostsWE: 0,
  hoaRecoverableWE: 0,
  propertyTaxWE: 0,
  hoaNonRecoverableTE: 0,
  hoaRecoverableTE: 0,
  propertyTaxTE: 0,
  extraordinaryCostsDeductible: 0,
  taxableIncome: 0,
};

/**
 * Itemized version of annualTaxableIncome (§21 EStG) — same acquisition-year
 * proration and day-level status/ownership splits, but returns every
 * deduction as its own field instead of just the final total. `annualTaxableIncome`
 * (below) is a thin wrapper around this with extraordinaryCostsDeductibleYearly
 * hardcoded to 0, so its behavior is unchanged by this refactor.
 */
export function annualTaxableIncomeBreakdown(input: AnnualTaxableIncomeBreakdownInput): TaxLineItems {
  const isAcquisitionYear = input.year === input.economicTransferDate.getUTCFullYear();

  const ownershipMonths: Date[] = [];
  for (let month = 1; month <= 12; month++) {
    const d = makeDate(input.year, month, 1);
    if (ownershipDayFraction(d, input.economicTransferDate) > 0) {
      ownershipMonths.push(d);
    }
  }
  if (ownershipMonths.length === 0) return ZERO_TAX_LINE_ITEMS;

  const interestYear = interestForCalendarYear(
    input.year,
    input.loanStartDate,
    input.loanAmount,
    input.interestRate,
    input.monthlyMortgage
  );

  const afaYear = isAcquisitionYear
    ? (input.afaBasis * input.depreciationRate / 12) * ownershipMonths.length
    : input.afaBasis * input.depreciationRate;

  let totalIncome = 0;
  let ownershipMonthEquivalent = 0;
  let leerstandEquivalentMonths = 0;

  for (const month of ownershipMonths) {
    const ownerFraction = ownershipDayFraction(month, input.economicTransferDate);
    ownershipMonthEquivalent += ownerFraction;

    const leerstandFraction = leerstandDayFraction(month, input.statusHistory, input.today);
    leerstandEquivalentMonths += ownerFraction * leerstandFraction;

    totalIncome +=
      incomeForMonth(month, input.statusHistory, input.today, input.coldRentMonthly, input.parkingRentMonthly) *
      ownerFraction;
  }

  const hoaNonRecoverableWE = input.hoaUnitNonRecoverableMonthly * ownershipMonthEquivalent;
  const insuranceWE = input.propertyInsuranceMonthly * ownershipMonthEquivalent;
  const managementWE = input.propertyManagementMonthly * ownershipMonthEquivalent;
  const otherCostsWE = input.otherCostsMonthly * ownershipMonthEquivalent;
  const hoaNonRecoverableTE = input.hoaParkingNonRecoverableMonthly * ownershipMonthEquivalent;
  const hoaRecoverableTE = input.hoaParkingRecoverableMonthly * ownershipMonthEquivalent;
  const propertyTaxTE = input.propertyTaxParkingMonthly * ownershipMonthEquivalent;

  const hoaRecoverableWE = input.hoaUnitRecoverableMonthly * leerstandEquivalentMonths;
  const propertyTaxWE = input.propertyTaxUnitMonthly * leerstandEquivalentMonths;

  const extraordinaryCostsDeductible = input.extraordinaryCostsDeductibleYearly;

  const taxableIncome =
    totalIncome -
    interestYear -
    afaYear -
    hoaNonRecoverableWE -
    insuranceWE -
    managementWE -
    otherCostsWE -
    hoaNonRecoverableTE -
    hoaRecoverableTE -
    propertyTaxTE -
    hoaRecoverableWE -
    propertyTaxWE -
    extraordinaryCostsDeductible;

  return {
    income: totalIncome,
    interest: interestYear,
    depreciation: afaYear,
    hoaNonRecoverableWE,
    insuranceWE,
    managementWE,
    otherCostsWE,
    hoaRecoverableWE,
    propertyTaxWE,
    hoaNonRecoverableTE,
    hoaRecoverableTE,
    propertyTaxTE,
    extraordinaryCostsDeductible,
    taxableIncome,
  };
}

/**
 * Full annual taxable income for V+V (§21 EStG). Handles acquisition-year
 * proration, exact amortizing interest, and day-level status/ownership splits.
 */
export function annualTaxableIncome(input: AnnualTaxableIncomeInput): number {
  return annualTaxableIncomeBreakdown({ ...input, extraordinaryCostsDeductibleYearly: 0 }).taxableIncome;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/calculations/taxCalculator.test.ts`
Expected: PASS — including every pre-existing `annualTaxableIncome` test (e.g. `-9100.44`, `-23478.36`, `-10407.52`, the 2027 no-proration case) with **no changes to their assertions**. If any of these regress, the refactor introduced a numeric difference — stop and fix before continuing.

Also run the full suite to catch any other consumer (`propertySummary.ts` uses `annualTaxableIncome`, unchanged signature):

Run: `cd web && npm test`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/calculations/taxCalculator.ts web/tests/calculations/taxCalculator.test.ts
git commit -m "feat(calculations): add annualTaxableIncomeBreakdown, refactor annualTaxableIncome to delegate"
```

---

### Task 6: `taxLineItemsForScenario` (Steuer tab Prognose section basis)

**Files:**
- Modify: `web/lib/calculations/taxCalculator.ts`
- Test: `web/tests/calculations/taxCalculator.test.ts`

Section 2 ("Prognose") is a full calendar year with no acquisition-year proration and no status history — a scenario toggle (Vollvermietung / Leerstand) instead.

- [ ] **Step 1: Write the failing test**

Add to `web/tests/calculations/taxCalculator.test.ts`'s import block:

```typescript
import { taxLineItemsForScenario, type TaxScenarioInput } from '@/lib/calculations/taxCalculator';
```

Add this `describe` block at the end of the file:

```typescript
describe('taxCalculator.taxLineItemsForScenario', () => {
  const scenarioBaseInput: Omit<TaxScenarioInput, 'scenario' | 'year'> = {
    coldRentMonthly: f.coldRentMonthly,
    parkingRentMonthly: f.parkingRentMonthly,
    loanStartDate: f.loanStartDate,
    loanAmount: f.loanAmount,
    interestRate: f.interestRate,
    monthlyMortgage: f.monthlyMortgage,
    afaBasis: f.afaBasis,
    depreciationRate: f.depreciationRate,
    hoaUnitNonRecoverableMonthly: 125.0,
    hoaUnitRecoverableMonthly: f.hoaFeeRecoverableMonthly,
    hoaParkingNonRecoverableMonthly: 0,
    hoaParkingRecoverableMonthly: 0,
    propertyTaxUnitMonthly: f.propertyTaxMonthly,
    propertyTaxParkingMonthly: 0,
    propertyManagementMonthly: f.propertyManagementMonthly,
    propertyInsuranceMonthly: 0,
    otherCostsMonthly: 0,
  };

  it('vollvermietung scenario for 2027 matches the full-year annualTaxableIncomeBreakdown (all vermietet)', () => {
    const scenarioResult = taxLineItemsForScenario({ ...scenarioBaseInput, scenario: 'vollvermietung', year: 2027 });
    const breakdownResult = annualTaxableIncomeBreakdown({
      ...baseInput,
      year: 2027,
      statusHistory: [{ date: makeDate(2027, 1, 1), status: 'vermietet', incomeActualMonthly: null }],
      today: makeDate(2027, 12, 31),
      extraordinaryCostsDeductibleYearly: 0,
    });
    expect(scenarioResult.taxableIncome).toBeCloseTo(breakdownResult.taxableIncome, 0);
    expect(scenarioResult.hoaRecoverableWE).toBe(0);
    expect(scenarioResult.propertyTaxWE).toBe(0);
  });

  it('leerstand scenario: zero income, full owner-borne recoverable WE costs for all 12 months', () => {
    const result = taxLineItemsForScenario({ ...scenarioBaseInput, scenario: 'leerstand', year: 2027 });
    expect(result.income).toBe(0);
    expect(result.hoaRecoverableWE).toBeCloseTo(f.hoaFeeRecoverableMonthly * 12, 2);
    expect(result.propertyTaxWE).toBeCloseTo(f.propertyTaxMonthly * 12, 2);
  });

  it('AfA is never prorated (no acquisition-year discount in a scenario forecast)', () => {
    const result = taxLineItemsForScenario({ ...scenarioBaseInput, scenario: 'vollvermietung', year: 2030 });
    expect(result.depreciation).toBeCloseTo(f.afaBasis * f.depreciationRate, 2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/calculations/taxCalculator.test.ts`
Expected: FAIL — `taxLineItemsForScenario is not a function`.

- [ ] **Step 3: Implement**

At the top of `web/lib/calculations/taxCalculator.ts`, add `depreciationYearly` to the imports:

```typescript
import { depreciationYearly } from './depreciationCalculator';
```

Add to the end of the file:

```typescript
export interface TaxScenarioInput {
  scenario: 'vollvermietung' | 'leerstand';
  year: number;
  coldRentMonthly: number;
  parkingRentMonthly: number;
  loanStartDate: Date;
  loanAmount: number;
  interestRate: number;
  monthlyMortgage: number;
  afaBasis: number;
  depreciationRate: number;
  hoaUnitNonRecoverableMonthly: number;
  hoaUnitRecoverableMonthly: number;
  hoaParkingNonRecoverableMonthly: number;
  hoaParkingRecoverableMonthly: number;
  propertyTaxUnitMonthly: number;
  propertyTaxParkingMonthly: number;
  propertyManagementMonthly: number;
  propertyInsuranceMonthly: number;
  otherCostsMonthly: number;
}

/**
 * Steuer tab Section 2 ("Prognose") basis — a full calendar year, no
 * acquisition-year proration (this isn't necessarily the acquisition year),
 * no status history (a scenario toggle stands in for it).
 */
export function taxLineItemsForScenario(input: TaxScenarioInput): TaxLineItems {
  const income = input.scenario === 'vollvermietung' ? (input.coldRentMonthly + input.parkingRentMonthly) * 12 : 0;
  const interest = interestForCalendarYear(input.year, input.loanStartDate, input.loanAmount, input.interestRate, input.monthlyMortgage);
  const depreciation = depreciationYearly(input.afaBasis, input.depreciationRate);

  const hoaRecoverableWE = input.scenario === 'leerstand' ? input.hoaUnitRecoverableMonthly * 12 : 0;
  const propertyTaxWE = input.scenario === 'leerstand' ? input.propertyTaxUnitMonthly * 12 : 0;

  const hoaNonRecoverableWE = input.hoaUnitNonRecoverableMonthly * 12;
  const insuranceWE = input.propertyInsuranceMonthly * 12;
  const managementWE = input.propertyManagementMonthly * 12;
  const otherCostsWE = input.otherCostsMonthly * 12;
  const hoaNonRecoverableTE = input.hoaParkingNonRecoverableMonthly * 12;
  const hoaRecoverableTE = input.hoaParkingRecoverableMonthly * 12;
  const propertyTaxTE = input.propertyTaxParkingMonthly * 12;

  const taxableIncome =
    income -
    interest -
    depreciation -
    hoaNonRecoverableWE -
    insuranceWE -
    managementWE -
    otherCostsWE -
    hoaNonRecoverableTE -
    hoaRecoverableTE -
    propertyTaxTE -
    hoaRecoverableWE -
    propertyTaxWE;

  return {
    income,
    interest,
    depreciation,
    hoaNonRecoverableWE,
    insuranceWE,
    managementWE,
    otherCostsWE,
    hoaRecoverableWE,
    propertyTaxWE,
    hoaNonRecoverableTE,
    hoaRecoverableTE,
    propertyTaxTE,
    extraordinaryCostsDeductible: 0,
    taxableIncome,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/calculations/taxCalculator.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/calculations/taxCalculator.ts web/tests/calculations/taxCalculator.test.ts
git commit -m "feat(calculations): add taxLineItemsForScenario"
```

---

### Task 7: `lib/data/propertyTax.ts` — `computeTaxCurrentYear`

**Files:**
- Create: `web/lib/data/propertyTax.ts`
- Test: `web/tests/data/propertyTax.test.ts`

Composes `annualTaxableIncomeBreakdown` against a real `properties` row for the **current** calendar year — Section 1 of the Steuer tab, and also the source of truth both tabs use for "current year tax effect" (Task 9/10 import this).

- [ ] **Step 1: Write the failing test**

Create `web/tests/data/propertyTax.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { fixtures as f } from '../calculations/fixtures';
import { makeDate } from '@/lib/calculations/dateHelpers';
import type { Database } from '@/lib/supabase/types';
import { computeTaxCurrentYear } from '@/lib/data/propertyTax';

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

function makeExtraordinaryCost(overrides: Partial<ExtraordinaryCostRow> = {}): ExtraordinaryCostRow {
  return {
    id: 'cost-1',
    property_id: 'prop-1',
    cost_month: '2026-06-01',
    amount: 500,
    category: 'sonstiges',
    description_text: 'Reparatur',
    is_deductible: true,
    ...overrides,
  };
}

describe('computeTaxCurrentYear', () => {
  const property = makeProperty();
  const statusEntries = [makeStatusEntry()];
  const today = makeDate(2026, 6, 15);

  it('year is the current calendar year', () => {
    const result = computeTaxCurrentYear(property, statusEntries, [], today);
    expect(result.year).toBe(2026);
  });

  it('taxEffectYearly is positive (refund) for a loss-making acquisition year', () => {
    const result = computeTaxCurrentYear(property, statusEntries, [], today);
    expect(result.lineItems.taxableIncome).toBeLessThan(0);
    expect(result.taxEffectYearly).toBeGreaterThan(0);
  });

  it('only deductible extraordinary costs in the current year reduce taxableIncome', () => {
    const withoutCosts = computeTaxCurrentYear(property, statusEntries, [], today);
    const deductibleCost = makeExtraordinaryCost({ id: 'c1', cost_month: '2026-03-01', amount: 500, is_deductible: true });
    const nonDeductibleCost = makeExtraordinaryCost({ id: 'c2', cost_month: '2026-03-01', amount: 300, is_deductible: false });
    const lastYearCost = makeExtraordinaryCost({ id: 'c3', cost_month: '2025-12-01', amount: 999, is_deductible: true });
    const withCosts = computeTaxCurrentYear(property, statusEntries, [deductibleCost, nonDeductibleCost, lastYearCost], today);
    expect(withoutCosts.lineItems.taxableIncome - withCosts.lineItems.taxableIncome).toBeCloseTo(500, 2);
    expect(withCosts.lineItems.extraordinaryCostsDeductible).toBe(500);
  });

  it('hoaUnitSplitWarning is true when is_hoa_unit_split is false', () => {
    const notSplit = makeProperty({ is_hoa_unit_split: false });
    const result = computeTaxCurrentYear(notSplit, statusEntries, [], today);
    expect(result.hoaUnitSplitWarning).toBe(true);
  });

  it('hoaParkingSplitWarning is false when there is no parking', () => {
    const result = computeTaxCurrentYear(property, statusEntries, [], today);
    expect(result.hoaParkingSplitWarning).toBe(false);
  });

  it('hoaParkingSplitWarning is true when parking exists but is not split', () => {
    const withParking = makeProperty({ parking_type: 'tiefgarage', is_hoa_parking_split: false });
    const result = computeTaxCurrentYear(withParking, statusEntries, [], today);
    expect(result.hoaParkingSplitWarning).toBe(true);
  });

  it('transferInFuture is true when economic_transfer_date is after today', () => {
    const futureTransfer = makeProperty({ economic_transfer_date: '2027-01-01' });
    const result = computeTaxCurrentYear(futureTransfer, [], [], today);
    expect(result.transferInFuture).toBe(true);
    expect(result.lineItems.taxableIncome).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/data/propertyTax.test.ts`
Expected: FAIL — cannot find module `@/lib/data/propertyTax`.

- [ ] **Step 3: Implement**

Create `web/lib/data/propertyTax.ts`:

```typescript
import type { Database } from '@/lib/supabase/types';
import { toStatusHistory } from '@/lib/data/propertySummary';
import { makeDate } from '@/lib/calculations/dateHelpers';
import { ownershipDayFraction } from '@/lib/calculations/statusPeriodCalculator';
import {
  annualTaxableIncomeBreakdown,
  taxLineItemsForScenario,
  taxEffectYearly,
  taxEffectMonthly as computeTaxEffectMonthly,
  type TaxLineItems,
} from '@/lib/calculations/taxCalculator';
import { afaBasis as computeAfaBasis } from '@/lib/calculations/depreciationCalculator';
import { closingCostsTotal as computeClosingCostsTotal } from '@/lib/calculations/kpiCalculator';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];
type ExtraordinaryCostRow = Database['public']['Tables']['extraordinary_costs']['Row'];

export type TaxScenarioChoice = 'vollvermietung' | 'leerstand';

function deductibleExtraordinaryCostsForYear(extraordinaryCostRows: ExtraordinaryCostRow[], year: number): number {
  return extraordinaryCostRows
    .filter((row) => row.is_deductible && row.cost_month.slice(0, 4) === String(year))
    .reduce((sum, row) => sum + row.amount, 0);
}

export interface TaxCurrentYearResult {
  year: number;
  lineItems: TaxLineItems;
  taxEffectYearly: number;
  taxEffectMonthly: number;
  transferInFuture: boolean;
  hoaUnitSplitWarning: boolean;
  hoaParkingSplitWarning: boolean;
}

/**
 * Steuer tab Section 1 ("Laufendes Jahr") — Ist + Projektion for the current
 * calendar year. Also the shared source of truth for "current year tax
 * effect": the Cashflow tab's Card 1 and Card 2 must show this exact value
 * (spec-cashflow-tab.md requires them to agree), so propertyCashflow.ts
 * (Task 9/10) calls this function rather than recomputing it.
 */
export function computeTaxCurrentYear(
  property: PropertyRow,
  statusEntryRows: StatusEntryRow[],
  extraordinaryCostRows: ExtraordinaryCostRow[],
  today: Date = new Date()
): TaxCurrentYearResult {
  const statusHistory = toStatusHistory(statusEntryRows);
  const economicTransferDate = new Date(property.economic_transfer_date + 'T00:00:00Z');
  const loanStartDate = new Date(property.loan_start_date + 'T00:00:00Z');
  const year = today.getUTCFullYear();

  const hoaFeeNonRecoverableMonthly =
    property.hoa_fee_total_monthly - property.hoa_fee_recoverable_monthly - property.hoa_fee_maintenance_reserve_monthly;
  const hoaFeeParkingNonRecoverableMonthly =
    property.hoa_fee_parking_total_monthly -
    property.hoa_fee_parking_recoverable_monthly -
    property.hoa_fee_parking_maintenance_reserve_monthly;

  const totalPurchasePrice = property.purchase_price_unit + property.purchase_price_parking;
  const closingCosts = computeClosingCostsTotal(
    property.land_transfer_tax,
    property.notary_costs,
    property.land_registry_costs,
    property.agent_fee,
    property.appraisal_costs
  );
  const basis = computeAfaBasis(property.building_value, closingCosts, totalPurchasePrice, property.renovation_afa_eligible);

  const lineItems = annualTaxableIncomeBreakdown({
    year,
    statusHistory,
    economicTransferDate,
    loanStartDate,
    loanAmount: property.loan_amount,
    interestRate: property.interest_rate,
    monthlyMortgage: property.monthly_mortgage,
    afaBasis: basis,
    depreciationRate: property.depreciation_rate,
    hoaUnitNonRecoverableMonthly: hoaFeeNonRecoverableMonthly,
    hoaUnitRecoverableMonthly: property.hoa_fee_recoverable_monthly,
    hoaParkingNonRecoverableMonthly: hoaFeeParkingNonRecoverableMonthly,
    hoaParkingRecoverableMonthly: property.hoa_fee_parking_recoverable_monthly,
    propertyTaxUnitMonthly: property.property_tax_annual / 12,
    propertyTaxParkingMonthly: property.property_tax_parking_annual / 12,
    propertyManagementMonthly: property.property_management_annual / 12,
    propertyInsuranceMonthly: property.property_insurance_annual / 12,
    otherCostsMonthly: property.other_costs_monthly,
    coldRentMonthly: property.cold_rent_monthly,
    parkingRentMonthly: property.parking_rent_monthly,
    today,
    extraordinaryCostsDeductibleYearly: deductibleExtraordinaryCostsForYear(extraordinaryCostRows, year),
  });

  let ownershipMonthsThisYear = 0;
  for (let month = 1; month <= 12; month++) {
    ownershipMonthsThisYear += ownershipDayFraction(makeDate(year, month, 1), economicTransferDate);
  }

  const taxEffectYear = taxEffectYearly(lineItems.taxableIncome, property.marginal_tax_rate);
  const taxEffectMonth = computeTaxEffectMonthly(taxEffectYear, ownershipMonthsThisYear || 12);

  return {
    year,
    lineItems,
    taxEffectYearly: taxEffectYear,
    taxEffectMonthly: taxEffectMonth,
    transferInFuture: economicTransferDate.getTime() > today.getTime(),
    hoaUnitSplitWarning: !property.is_hoa_unit_split,
    hoaParkingSplitWarning: property.parking_type !== 'nicht_vorhanden' && !property.is_hoa_parking_split,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/data/propertyTax.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/data/propertyTax.ts web/tests/data/propertyTax.test.ts
git commit -m "feat(steuer): add computeTaxCurrentYear"
```

---

### Task 8: `lib/data/propertyTax.ts` — `computeTaxForecastYear`

**Files:**
- Modify: `web/lib/data/propertyTax.ts`
- Test: `web/tests/data/propertyTax.test.ts`

Section 2 ("Prognose") — a chosen year + scenario, no status history.

- [ ] **Step 1: Write the failing test**

Add to `web/tests/data/propertyTax.test.ts`'s import block:

```typescript
import { computeTaxForecastYear } from '@/lib/data/propertyTax';
```

Add this `describe` block at the end of the file:

```typescript
describe('computeTaxForecastYear', () => {
  const property = makeProperty();

  it('vollvermietung: full annual income, no owner-borne recoverable WE costs', () => {
    const result = computeTaxForecastYear(property, 2028, 'vollvermietung');
    expect(result.year).toBe(2028);
    expect(result.lineItems.income).toBeCloseTo(f.coldRentYearly + f.parkingRentYearly, 2);
    expect(result.lineItems.hoaRecoverableWE).toBe(0);
  });

  it('leerstand: zero income, full owner-borne recoverable WE costs', () => {
    const result = computeTaxForecastYear(property, 2028, 'leerstand');
    expect(result.lineItems.income).toBe(0);
    expect(result.lineItems.hoaRecoverableWE).toBeCloseTo(f.hoaFeeRecoverableMonthly * 12, 2);
  });

  it('depreciation is never acquisition-year-prorated', () => {
    const result = computeTaxForecastYear(property, 2035, 'vollvermietung');
    const basis = f.buildingValue + f.closingCostsTotal * (f.buildingValue / f.purchasePrice) + f.renovationAfaEligible;
    expect(result.lineItems.depreciation).toBeCloseTo(basis * f.depreciationRate, 0);
  });

  it('taxEffectMonthly divides the yearly effect by 12 (always a full year)', () => {
    const result = computeTaxForecastYear(property, 2028, 'vollvermietung');
    expect(result.taxEffectMonthly).toBeCloseTo(result.taxEffectYearly / 12, 4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/data/propertyTax.test.ts`
Expected: FAIL — `computeTaxForecastYear` not exported.

- [ ] **Step 3: Implement**

Add to the end of `web/lib/data/propertyTax.ts`:

```typescript
export interface TaxForecastYearResult {
  year: number;
  scenario: TaxScenarioChoice;
  lineItems: TaxLineItems;
  taxEffectYearly: number;
  taxEffectMonthly: number;
}

/** Steuer tab Section 2 ("Prognose") — an arbitrary (typically future) calendar year, no status history. */
export function computeTaxForecastYear(property: PropertyRow, year: number, scenario: TaxScenarioChoice): TaxForecastYearResult {
  const loanStartDate = new Date(property.loan_start_date + 'T00:00:00Z');

  const hoaFeeNonRecoverableMonthly =
    property.hoa_fee_total_monthly - property.hoa_fee_recoverable_monthly - property.hoa_fee_maintenance_reserve_monthly;
  const hoaFeeParkingNonRecoverableMonthly =
    property.hoa_fee_parking_total_monthly -
    property.hoa_fee_parking_recoverable_monthly -
    property.hoa_fee_parking_maintenance_reserve_monthly;

  const totalPurchasePrice = property.purchase_price_unit + property.purchase_price_parking;
  const closingCosts = computeClosingCostsTotal(
    property.land_transfer_tax,
    property.notary_costs,
    property.land_registry_costs,
    property.agent_fee,
    property.appraisal_costs
  );
  const basis = computeAfaBasis(property.building_value, closingCosts, totalPurchasePrice, property.renovation_afa_eligible);

  const lineItems = taxLineItemsForScenario({
    scenario,
    year,
    coldRentMonthly: property.cold_rent_monthly,
    parkingRentMonthly: property.parking_rent_monthly,
    loanStartDate,
    loanAmount: property.loan_amount,
    interestRate: property.interest_rate,
    monthlyMortgage: property.monthly_mortgage,
    afaBasis: basis,
    depreciationRate: property.depreciation_rate,
    hoaUnitNonRecoverableMonthly: hoaFeeNonRecoverableMonthly,
    hoaUnitRecoverableMonthly: property.hoa_fee_recoverable_monthly,
    hoaParkingNonRecoverableMonthly: hoaFeeParkingNonRecoverableMonthly,
    hoaParkingRecoverableMonthly: property.hoa_fee_parking_recoverable_monthly,
    propertyTaxUnitMonthly: property.property_tax_annual / 12,
    propertyTaxParkingMonthly: property.property_tax_parking_annual / 12,
    propertyManagementMonthly: property.property_management_annual / 12,
    propertyInsuranceMonthly: property.property_insurance_annual / 12,
    otherCostsMonthly: property.other_costs_monthly,
  });

  const taxEffectYear = taxEffectYearly(lineItems.taxableIncome, property.marginal_tax_rate);
  const taxEffectMonth = computeTaxEffectMonthly(taxEffectYear, 12);

  return { year, scenario, lineItems, taxEffectYearly: taxEffectYear, taxEffectMonthly: taxEffectMonth };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/data/propertyTax.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/data/propertyTax.ts web/tests/data/propertyTax.test.ts
git commit -m "feat(steuer): add computeTaxForecastYear"
```

---

### Task 9: `lib/data/propertyCashflow.ts` — `computeCashflowForecastMonth`

**Files:**
- Create: `web/lib/data/propertyCashflow.ts`
- Test: `web/tests/data/propertyCashflow.test.ts`

Cashflow tab Card 1 — composes `cashflowLineItemsForScenario` against a real property row, and imports `computeTaxCurrentYear` (Task 7) for the "Steuereffekt" row.

- [ ] **Step 1: Write the failing test**

Create `web/tests/data/propertyCashflow.test.ts`. Copy the exact `makeProperty`, `makeStatusEntry`, `makeExtraordinaryCost` helpers from `web/tests/data/propertyTax.test.ts` (Task 7, Step 1) verbatim into this new file — each `tests/data/*.test.ts` file defines its own copy, matching the existing convention in `propertyOverview.test.ts`. Then add:

```typescript
import { describe, it, expect } from 'vitest';
import { fixtures as f } from '../calculations/fixtures';
import { makeDate } from '@/lib/calculations/dateHelpers';
import { computeCashflowForecastMonth } from '@/lib/data/propertyCashflow';
import { computeTaxCurrentYear } from '@/lib/data/propertyTax';

// ... makeProperty / makeStatusEntry / makeExtraordinaryCost helpers here (copied from propertyTax.test.ts) ...

describe('computeCashflowForecastMonth', () => {
  const property = makeProperty();
  const statusEntries = [makeStatusEntry()];
  const today = makeDate(2026, 6, 15);

  it('vollvermietung: full income, no owner-borne recoverable WE costs', () => {
    const result = computeCashflowForecastMonth(property, statusEntries, [], 'vollvermietung', today);
    expect(result.lineItems.income).toBeCloseTo(f.coldRentMonthly + f.parkingRentMonthly, 2);
    expect(result.lineItems.hoaRecoverableWE).toBe(0);
  });

  it('leerstand: zero income, full owner-borne recoverable WE costs', () => {
    const result = computeCashflowForecastMonth(property, statusEntries, [], 'leerstand', today);
    expect(result.lineItems.income).toBe(0);
    expect(result.lineItems.hoaRecoverableWE).toBeCloseTo(f.hoaFeeRecoverableMonthly, 2);
  });

  it('taxEffectMonthly matches computeTaxCurrentYear exactly (spec requires the two tabs to agree)', () => {
    const result = computeCashflowForecastMonth(property, statusEntries, [], 'vollvermietung', today);
    const taxResult = computeTaxCurrentYear(property, statusEntries, [], today);
    expect(result.taxEffectMonthly).toBe(taxResult.taxEffectMonthly);
  });

  it('cashflowAfterTax = cashflowBeforeTax + taxEffectMonthly', () => {
    const result = computeCashflowForecastMonth(property, statusEntries, [], 'leerstand', today);
    expect(result.cashflowAfterTax).toBeCloseTo(result.lineItems.cashflowBeforeTax + result.taxEffectMonthly, 6);
  });

  it('Card 1 never includes an actual extraordinary cost (it is a hypothetical typical month)', () => {
    const cost = makeExtraordinaryCost({ cost_month: today.toISOString().slice(0, 10) });
    const result = computeCashflowForecastMonth(property, statusEntries, [cost], 'vollvermietung', today);
    expect(result.lineItems.extraordinaryCosts).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/data/propertyCashflow.test.ts`
Expected: FAIL — cannot find module `@/lib/data/propertyCashflow`.

- [ ] **Step 3: Implement**

Create `web/lib/data/propertyCashflow.ts`:

```typescript
import type { Database } from '@/lib/supabase/types';
import { cashflowLineItemsForScenario, type CashflowLineItems } from '@/lib/calculations/cashflowCalculator';
import { computeTaxCurrentYear } from '@/lib/data/propertyTax';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];
type ExtraordinaryCostRow = Database['public']['Tables']['extraordinary_costs']['Row'];

export type CashflowScenario = 'vollvermietung' | 'leerstand';

export interface CashflowForecastMonthResult {
  scenario: CashflowScenario;
  lineItems: CashflowLineItems;
  taxEffectMonthly: number;
  cashflowAfterTax: number;
}

/**
 * Cashflow tab Card 1 ("Prognose / Monat") — a settings-only typical month
 * for the chosen scenario. taxEffectMonthly comes from computeTaxCurrentYear
 * (propertyTax.ts) so it's guaranteed to match the Steuer tab and Card 2's
 * "Steuererstattung Ø/Mon" row exactly, per spec-cashflow-tab.md.
 */
export function computeCashflowForecastMonth(
  property: PropertyRow,
  statusEntryRows: StatusEntryRow[],
  extraordinaryCostRows: ExtraordinaryCostRow[],
  scenario: CashflowScenario,
  today: Date = new Date()
): CashflowForecastMonthResult {
  const hoaFeeNonRecoverableMonthly =
    property.hoa_fee_total_monthly - property.hoa_fee_recoverable_monthly - property.hoa_fee_maintenance_reserve_monthly;
  const hoaFeeParkingNonRecoverableMonthly =
    property.hoa_fee_parking_total_monthly -
    property.hoa_fee_parking_recoverable_monthly -
    property.hoa_fee_parking_maintenance_reserve_monthly;

  const lineItems = cashflowLineItemsForScenario({
    scenario,
    coldRentMonthly: property.cold_rent_monthly,
    parkingRentMonthly: property.parking_rent_monthly,
    otherIncomeMonthly: property.other_income_monthly,
    monthlyMortgage: property.monthly_mortgage,
    hoaFeeNonRecoverableMonthly,
    hoaFeeMaintenanceReserveMonthly: property.hoa_fee_maintenance_reserve_monthly,
    hoaFeeRecoverableMonthly: property.hoa_fee_recoverable_monthly,
    propertyTaxAnnual: property.property_tax_annual,
    propertyInsuranceAnnual: property.property_insurance_annual,
    propertyManagementAnnual: property.property_management_annual,
    otherCostsMonthly: property.other_costs_monthly,
    hoaFeeParkingNonRecoverableMonthly,
    hoaFeeParkingMaintenanceReserveMonthly: property.hoa_fee_parking_maintenance_reserve_monthly,
    hoaFeeParkingRecoverableMonthly: property.hoa_fee_parking_recoverable_monthly,
    propertyTaxParkingAnnual: property.property_tax_parking_annual,
    extraordinaryCostsThisMonth: 0,
  });

  const { taxEffectMonthly } = computeTaxCurrentYear(property, statusEntryRows, extraordinaryCostRows, today);

  return { scenario, lineItems, taxEffectMonthly, cashflowAfterTax: lineItems.cashflowBeforeTax + taxEffectMonthly };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/data/propertyCashflow.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/data/propertyCashflow.ts web/tests/data/propertyCashflow.test.ts
git commit -m "feat(cashflow): add computeCashflowForecastMonth"
```

---

### Task 10: `lib/data/propertyCashflow.ts` — `computeCashflowYearTable`

**Files:**
- Modify: `web/lib/data/propertyCashflow.ts`
- Test: `web/tests/data/propertyCashflow.test.ts`

Cashflow tab Card 2 — the 12-month year table with Ø/Total columns, the "kein StatusEntry" all-vollvermietung fallback, and the future-year tax-effect blanking rule.

- [ ] **Step 1: Write the failing test**

Add to `web/tests/data/propertyCashflow.test.ts`'s import block:

```typescript
import { computeCashflowYearTable } from '@/lib/data/propertyCashflow';
```

Add this `describe` block at the end of the file:

```typescript
describe('computeCashflowYearTable', () => {
  const property = makeProperty();
  const statusEntries = [makeStatusEntry()]; // vermietet from 2026-02-01
  const today = makeDate(2026, 6, 15);

  it('returns 12 month columns', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today);
    expect(result.months).toHaveLength(12);
  });

  it('months before economic_transfer_date are unowned (isOwned false, zeroed line items)', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today);
    const january = result.months.find((m) => m.month === 1)!;
    expect(january.isOwned).toBe(false);
    expect(january.lineItems.income).toBe(0);
    expect(january.statusLabel).toBeNull();
  });

  it('owned months carry a status label and correct income', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today);
    const june = result.months.find((m) => m.month === 6)!;
    expect(june.isOwned).toBe(true);
    expect(june.statusLabel).toBe('vermietet');
    expect(june.lineItems.income).toBeCloseTo(f.coldRentMonthly + f.parkingRentMonthly, 2);
  });

  it('ownershipMonthCount sums to 11 for a Feb 1 acquisition (Feb-Dec)', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today);
    expect(result.ownershipMonthCount).toBeCloseTo(11, 4);
  });

  it('totalColumn sums cashflowBeforeTax across owned months; avgColumn divides by ownershipMonthCount', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today);
    expect(result.totalColumn).not.toBeNull();
    expect(result.avgColumn).not.toBeNull();
    expect(result.avgColumn!.cashflowBeforeTax).toBeCloseTo(result.totalColumn!.cashflowBeforeTax / result.ownershipMonthCount, 4);
  });

  it('an extraordinary cost appears in its month, contributes to the year total, and is excluded from Ø when there is only 1 entry', () => {
    const cost = makeExtraordinaryCost({ id: 'c1', cost_month: '2026-06-01', amount: 500 });
    const result = computeCashflowYearTable(property, statusEntries, [cost], 2026, today);
    const june = result.months.find((m) => m.month === 6)!;
    expect(june.extraordinaryCostRows).toHaveLength(1);
    expect(june.lineItems.extraordinaryCosts).toBe(500);
    expect(result.extraordinaryCostsTotalForYear).toBe(500);
    expect(result.extraordinaryCostsEntryCountForYear).toBe(1);
    expect(result.extraordinaryCostsAvgForYear).toBeNull(); // spec: only shown when >= 2 entries
  });

  it('extraordinaryCostsAvgForYear is populated once there are >= 2 entries in the year', () => {
    const cost1 = makeExtraordinaryCost({ id: 'c1', cost_month: '2026-03-01', amount: 300 });
    const cost2 = makeExtraordinaryCost({ id: 'c2', cost_month: '2026-06-01', amount: 700 });
    const result = computeCashflowYearTable(property, statusEntries, [cost1, cost2], 2026, today);
    expect(result.extraordinaryCostsTotalForYear).toBe(1000);
    expect(result.extraordinaryCostsAvgForYear).toBeCloseTo(500, 2);
  });

  it('no StatusEntry at all falls back to the vollvermietung scenario for every owned month, all marked as projection', () => {
    const result = computeCashflowYearTable(property, [], [], 2026, today);
    const june = result.months.find((m) => m.month === 6)!;
    expect(june.isOwned).toBe(true);
    expect(june.statusLabel).toBeNull();
    expect(june.isProjection).toBe(true);
    expect(june.lineItems.income).toBeCloseTo(f.coldRentMonthly + f.parkingRentMonthly, 2);
    expect(june.lineItems.hoaRecoverableWE).toBe(0);
  });

  it('a future year (beyond the current year) blanks taxEffectMonthly and every month\'s cashflowAfterTax', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2027, today);
    expect(result.isFutureYear).toBe(true);
    expect(result.taxEffectMonthly).toBeNull();
    const june = result.months.find((m) => m.month === 6)!;
    expect(june.cashflowAfterTax).toBeNull();
  });

  it('the current year does not blank taxEffectMonthly, and it matches computeTaxCurrentYear', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today);
    expect(result.isFutureYear).toBe(false);
    const taxResult = computeTaxCurrentYear(property, statusEntries, [], today);
    expect(result.taxEffectMonthly).toBe(taxResult.taxEffectMonthly);
  });

  it('hoaUnitSplitWarning mirrors is_hoa_unit_split', () => {
    const notSplit = makeProperty({ is_hoa_unit_split: false });
    const result = computeCashflowYearTable(notSplit, statusEntries, [], 2026, today);
    expect(result.hoaUnitSplitWarning).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/data/propertyCashflow.test.ts`
Expected: FAIL — `computeCashflowYearTable` not exported.

- [ ] **Step 3: Implement**

At the top of `web/lib/data/propertyCashflow.ts`, replace the import block with:

```typescript
import type { Database } from '@/lib/supabase/types';
import { toStatusHistory } from '@/lib/data/propertySummary';
import { makeDate, firstDayOfMonth } from '@/lib/calculations/dateHelpers';
import { dominantStatusForMonth, ownershipDayFraction } from '@/lib/calculations/statusPeriodCalculator';
import type { StatusEntry, PropertyStatus } from '@/lib/calculations/statusPeriodCalculator';
import {
  cashflowLineItemsForScenario,
  cashflowLineItemsForActualMonth,
  type CashflowLineItems,
} from '@/lib/calculations/cashflowCalculator';
import { computeTaxCurrentYear } from '@/lib/data/propertyTax';
```

Add to the end of `web/lib/data/propertyCashflow.ts`:

```typescript
const ZERO_LINE_ITEMS: CashflowLineItems = {
  income: 0,
  mortgage: 0,
  hoaNonRecoverableWE: 0,
  maintenanceReserveWE: 0,
  insuranceWE: 0,
  managementWE: 0,
  otherCostsWE: 0,
  hoaRecoverableWE: 0,
  propertyTaxWE: 0,
  hoaNonRecoverableTE: 0,
  maintenanceReserveTE: 0,
  hoaRecoverableTE: 0,
  propertyTaxTE: 0,
  extraordinaryCosts: 0,
  cashflowBeforeTax: 0,
};

function addLineItems(a: CashflowLineItems, b: CashflowLineItems): CashflowLineItems {
  return {
    income: a.income + b.income,
    mortgage: a.mortgage + b.mortgage,
    hoaNonRecoverableWE: a.hoaNonRecoverableWE + b.hoaNonRecoverableWE,
    maintenanceReserveWE: a.maintenanceReserveWE + b.maintenanceReserveWE,
    insuranceWE: a.insuranceWE + b.insuranceWE,
    managementWE: a.managementWE + b.managementWE,
    otherCostsWE: a.otherCostsWE + b.otherCostsWE,
    hoaRecoverableWE: a.hoaRecoverableWE + b.hoaRecoverableWE,
    propertyTaxWE: a.propertyTaxWE + b.propertyTaxWE,
    hoaNonRecoverableTE: a.hoaNonRecoverableTE + b.hoaNonRecoverableTE,
    maintenanceReserveTE: a.maintenanceReserveTE + b.maintenanceReserveTE,
    hoaRecoverableTE: a.hoaRecoverableTE + b.hoaRecoverableTE,
    propertyTaxTE: a.propertyTaxTE + b.propertyTaxTE,
    extraordinaryCosts: a.extraordinaryCosts + b.extraordinaryCosts,
    cashflowBeforeTax: a.cashflowBeforeTax + b.cashflowBeforeTax,
  };
}

function divideLineItems(a: CashflowLineItems, n: number): CashflowLineItems {
  return {
    income: a.income / n,
    mortgage: a.mortgage / n,
    hoaNonRecoverableWE: a.hoaNonRecoverableWE / n,
    maintenanceReserveWE: a.maintenanceReserveWE / n,
    insuranceWE: a.insuranceWE / n,
    managementWE: a.managementWE / n,
    otherCostsWE: a.otherCostsWE / n,
    hoaRecoverableWE: a.hoaRecoverableWE / n,
    propertyTaxWE: a.propertyTaxWE / n,
    hoaNonRecoverableTE: a.hoaNonRecoverableTE / n,
    maintenanceReserveTE: a.maintenanceReserveTE / n,
    hoaRecoverableTE: a.hoaRecoverableTE / n,
    propertyTaxTE: a.propertyTaxTE / n,
    extraordinaryCosts: a.extraordinaryCosts / n,
    cashflowBeforeTax: a.cashflowBeforeTax / n,
  };
}

/**
 * A single month's line items — falls back to the vollvermietung scenario
 * (ignoring statusHistory entirely) when there is no status history at all,
 * per spec-cashflow-tab.md ("Kein StatusEntry vorhanden"): "no data yet"
 * must not be read as "vacant" (which cashflowLineItemsForActualMonth would
 * otherwise do, since an empty history defaults every day to leerstand).
 */
function lineItemsForMonth(
  property: PropertyRow,
  statusHistory: StatusEntry[],
  monthDate: Date,
  today: Date,
  extraordinaryCostsThisMonth: number,
  hoaFeeNonRecoverableMonthly: number,
  hoaFeeParkingNonRecoverableMonthly: number
): CashflowLineItems {
  if (statusHistory.length === 0) {
    return cashflowLineItemsForScenario({
      scenario: 'vollvermietung',
      coldRentMonthly: property.cold_rent_monthly,
      parkingRentMonthly: property.parking_rent_monthly,
      otherIncomeMonthly: property.other_income_monthly,
      monthlyMortgage: property.monthly_mortgage,
      hoaFeeNonRecoverableMonthly,
      hoaFeeMaintenanceReserveMonthly: property.hoa_fee_maintenance_reserve_monthly,
      hoaFeeRecoverableMonthly: property.hoa_fee_recoverable_monthly,
      propertyTaxAnnual: property.property_tax_annual,
      propertyInsuranceAnnual: property.property_insurance_annual,
      propertyManagementAnnual: property.property_management_annual,
      otherCostsMonthly: property.other_costs_monthly,
      hoaFeeParkingNonRecoverableMonthly,
      hoaFeeParkingMaintenanceReserveMonthly: property.hoa_fee_parking_maintenance_reserve_monthly,
      hoaFeeParkingRecoverableMonthly: property.hoa_fee_parking_recoverable_monthly,
      propertyTaxParkingAnnual: property.property_tax_parking_annual,
      extraordinaryCostsThisMonth,
    });
  }
  return cashflowLineItemsForActualMonth({
    month: monthDate,
    statusHistory,
    today,
    coldRentMonthly: property.cold_rent_monthly,
    parkingRentMonthly: property.parking_rent_monthly,
    monthlyMortgage: property.monthly_mortgage,
    hoaFeeNonRecoverableMonthly,
    hoaFeeMaintenanceReserveMonthly: property.hoa_fee_maintenance_reserve_monthly,
    hoaFeeRecoverableMonthly: property.hoa_fee_recoverable_monthly,
    propertyTaxAnnual: property.property_tax_annual,
    propertyInsuranceAnnual: property.property_insurance_annual,
    propertyManagementAnnual: property.property_management_annual,
    otherCostsMonthly: property.other_costs_monthly,
    hoaFeeParkingNonRecoverableMonthly,
    hoaFeeParkingMaintenanceReserveMonthly: property.hoa_fee_parking_maintenance_reserve_monthly,
    hoaFeeParkingRecoverableMonthly: property.hoa_fee_parking_recoverable_monthly,
    propertyTaxParkingAnnual: property.property_tax_parking_annual,
    extraordinaryCostsThisMonth,
  });
}

export interface CashflowMonthColumn {
  month: number;
  isProjection: boolean;
  isOwned: boolean;
  statusLabel: PropertyStatus | null;
  lineItems: CashflowLineItems;
  extraordinaryCostRows: ExtraordinaryCostRow[];
  cashflowAfterTax: number | null;
}

export interface CashflowYearTableResult {
  year: number;
  isFutureYear: boolean;
  months: CashflowMonthColumn[];
  ownershipMonthCount: number;
  avgColumn: CashflowLineItems | null;
  totalColumn: CashflowLineItems | null;
  extraordinaryCostsTotalForYear: number;
  extraordinaryCostsAvgForYear: number | null;
  extraordinaryCostsEntryCountForYear: number;
  taxEffectMonthly: number | null;
  hoaUnitSplitWarning: boolean;
  hoaParkingSplitWarning: boolean;
}

/** Cashflow tab Card 2 — the 12-month year table. */
export function computeCashflowYearTable(
  property: PropertyRow,
  statusEntryRows: StatusEntryRow[],
  extraordinaryCostRows: ExtraordinaryCostRow[],
  year: number,
  today: Date = new Date()
): CashflowYearTableResult {
  const statusHistory = toStatusHistory(statusEntryRows);
  const economicTransferDate = new Date(property.economic_transfer_date + 'T00:00:00Z');
  const currentYear = today.getUTCFullYear();
  const isFutureYear = year > currentYear;

  const hoaFeeNonRecoverableMonthly =
    property.hoa_fee_total_monthly - property.hoa_fee_recoverable_monthly - property.hoa_fee_maintenance_reserve_monthly;
  const hoaFeeParkingNonRecoverableMonthly =
    property.hoa_fee_parking_total_monthly -
    property.hoa_fee_parking_recoverable_monthly -
    property.hoa_fee_parking_maintenance_reserve_monthly;

  const extraordinaryCostsByMonth = new Map<string, ExtraordinaryCostRow[]>();
  for (const row of extraordinaryCostRows) {
    const key = row.cost_month.slice(0, 7);
    const existing = extraordinaryCostsByMonth.get(key) ?? [];
    existing.push(row);
    extraordinaryCostsByMonth.set(key, existing);
  }

  const { taxEffectMonthly: currentYearTaxEffectMonthly } = computeTaxCurrentYear(
    property,
    statusEntryRows,
    extraordinaryCostRows,
    today
  );

  const months: CashflowMonthColumn[] = [];
  let ownershipMonthCount = 0;
  let sumLineItems = ZERO_LINE_ITEMS;

  for (let m = 1; m <= 12; m++) {
    const monthDate = makeDate(year, m, 1);
    const ownerFraction = ownershipDayFraction(monthDate, economicTransferDate);
    const key = `${year}-${String(m).padStart(2, '0')}`;
    const monthCostRows = extraordinaryCostsByMonth.get(key) ?? [];
    const extraordinaryCostsThisMonth = monthCostRows.reduce((sum, row) => sum + row.amount, 0);

    if (ownerFraction <= 0) {
      months.push({
        month: m,
        isProjection: monthDate.getTime() > firstDayOfMonth(today).getTime(),
        isOwned: false,
        statusLabel: null,
        lineItems: ZERO_LINE_ITEMS,
        extraordinaryCostRows: monthCostRows,
        cashflowAfterTax: null,
      });
      continue;
    }

    const lineItems = lineItemsForMonth(
      property,
      statusHistory,
      monthDate,
      today,
      extraordinaryCostsThisMonth,
      hoaFeeNonRecoverableMonthly,
      hoaFeeParkingNonRecoverableMonthly
    );

    ownershipMonthCount += ownerFraction;
    sumLineItems = addLineItems(sumLineItems, lineItems);

    months.push({
      month: m,
      isProjection: statusHistory.length === 0 || monthDate.getTime() > firstDayOfMonth(today).getTime(),
      isOwned: true,
      statusLabel: statusHistory.length === 0 ? null : dominantStatusForMonth(monthDate, statusHistory, today),
      lineItems,
      extraordinaryCostRows: monthCostRows,
      cashflowAfterTax: isFutureYear ? null : lineItems.cashflowBeforeTax + currentYearTaxEffectMonthly,
    });
  }

  const yearCostRows = extraordinaryCostRows.filter((row) => row.cost_month.slice(0, 4) === String(year));
  const extraordinaryCostsTotalForYear = yearCostRows.reduce((sum, row) => sum + row.amount, 0);
  const extraordinaryCostsEntryCountForYear = yearCostRows.length;

  return {
    year,
    isFutureYear,
    months,
    ownershipMonthCount,
    avgColumn: ownershipMonthCount > 0 ? divideLineItems(sumLineItems, ownershipMonthCount) : null,
    totalColumn: ownershipMonthCount > 0 ? sumLineItems : null,
    extraordinaryCostsTotalForYear,
    extraordinaryCostsAvgForYear:
      extraordinaryCostsEntryCountForYear >= 2 ? extraordinaryCostsTotalForYear / extraordinaryCostsEntryCountForYear : null,
    extraordinaryCostsEntryCountForYear,
    taxEffectMonthly: isFutureYear ? null : currentYearTaxEffectMonthly,
    hoaUnitSplitWarning: !property.is_hoa_unit_split,
    hoaParkingSplitWarning: property.parking_type !== 'nicht_vorhanden' && !property.is_hoa_parking_split,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/data/propertyCashflow.test.ts`
Expected: PASS.

Also run the full suite once more before moving to UI work:

Run: `cd web && npm test`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/data/propertyCashflow.ts web/tests/data/propertyCashflow.test.ts
git commit -m "feat(cashflow): add computeCashflowYearTable"
```

---

### Task 11: `SegmentedControl` UI primitive

**Files:**
- Create: `web/components/ui/SegmentedControl.tsx`

Shared by Cashflow Card 1 and Steuer Section 2's Vollvermietung/Leerstand toggle.

- [ ] **Step 1: Implement**

Create `web/components/ui/SegmentedControl.tsx`:

```typescript
'use client';

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="inline-flex rounded-md border border-black/10 bg-white/90 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded px-3 py-1 text-sm font-semibold ${
            value === option.value ? 'bg-accent text-white' : 'text-text-secondary'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/ui/SegmentedControl.tsx
git commit -m "feat(ui): add SegmentedControl primitive"
```

---

### Task 12: `YearPicker` UI primitive

**Files:**
- Create: `web/components/ui/YearPicker.tsx`

Shared by Cashflow Card 2 and Steuer Section 2's year picker.

- [ ] **Step 1: Implement**

Create `web/components/ui/YearPicker.tsx`:

```typescript
'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export function YearPicker({
  year,
  onChange,
  minYear,
  maxYear,
}: {
  year: number;
  onChange: (year: number) => void;
  minYear: number;
  maxYear?: number;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(year - 1)}
        disabled={year <= minYear}
        aria-label="Vorheriges Jahr"
        className="text-text-dim hover:text-accent disabled:opacity-30"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="w-12 text-center text-sm font-semibold text-text-primary">{year}</span>
      <button
        type="button"
        onClick={() => onChange(year + 1)}
        disabled={maxYear !== undefined && year >= maxYear}
        aria-label="Nächstes Jahr"
        className="text-text-dim hover:text-accent disabled:opacity-30"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/ui/YearPicker.tsx
git commit -m "feat(ui): add YearPicker primitive"
```

---

### Task 13: `ForecastMonthCard` (Cashflow Card 1)

**Files:**
- Create: `web/components/property/cashflow/ForecastMonthCard.tsx`

- [ ] **Step 1: Implement**

Create `web/components/property/cashflow/ForecastMonthCard.tsx`:

```typescript
import { formatCurrency } from '@/lib/formatters';
import type { CashflowForecastMonthResult } from '@/lib/data/propertyCashflow';

export function ForecastMonthCard({ result, hasParking }: { result: CashflowForecastMonthResult; hasParking: boolean }) {
  const { lineItems } = result;
  const cfColor = result.cashflowAfterTax >= 0 ? 'text-positive' : 'text-negative';

  return (
    <div className="space-y-1 text-sm">
      <Row label="Einnahmen" value={lineItems.income} positive />
      <Row label="Kreditrate" value={-lineItems.mortgage} />
      <SectionDivider label="Kosten Wohnung" />
      <Row label="Nicht umlagef. HG" value={-lineItems.hoaNonRecoverableWE} />
      <Row label="Instandhaltungsrücklage WE" value={-lineItems.maintenanceReserveWE} />
      {lineItems.insuranceWE > 0 && <Row label="Gebäudeversicherung" value={-lineItems.insuranceWE} />}
      <Row label="Verwaltung" value={-lineItems.managementWE} />
      {lineItems.otherCostsWE > 0 && <Row label="Sonstige Kosten" value={-lineItems.otherCostsWE} />}
      {lineItems.hoaRecoverableWE > 0 && <Row label="Umlagef. Kosten WE" value={-lineItems.hoaRecoverableWE} />}
      {lineItems.propertyTaxWE > 0 && <Row label="Grundsteuer WE" value={-lineItems.propertyTaxWE} />}
      {hasParking && (
        <>
          <SectionDivider label="Kosten Stellplatz" />
          <Row label="Nicht umlagef. HG TE" value={-lineItems.hoaNonRecoverableTE} />
          <Row label="Instandhaltungsrücklage TE" value={-lineItems.maintenanceReserveTE} />
          <Row label="Umlagef. Kosten TE" value={-lineItems.hoaRecoverableTE} />
          <Row label="Grundsteuer TE" value={-lineItems.propertyTaxTE} />
        </>
      )}
      <SectionDivider label="Zusammenfassung" />
      <div className="flex justify-between font-bold text-text-primary">
        <span>CF vor Steuern</span>
        <span className="font-mono">{formatCurrency(lineItems.cashflowBeforeTax)}</span>
      </div>
      <div className="flex justify-between text-accent">
        <span>Steuereffekt</span>
        <span className="font-mono">{formatCurrency(result.taxEffectMonthly)}</span>
      </div>
      <div className={`flex justify-between text-[22px] font-extrabold ${cfColor}`}>
        <span>CF nach Steuern</span>
        <span className="font-mono">{formatCurrency(result.cashflowAfterTax)}</span>
      </div>
    </div>
  );
}

function Row({ label, value, positive = false }: { label: string; value: number; positive?: boolean }) {
  return (
    <div className={`flex justify-between ${positive ? 'text-positive' : 'text-negative'}`}>
      <span className="text-text-secondary">{label}</span>
      <span className="font-mono">{formatCurrency(value)}</span>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return <p className="pt-2 text-[10px] font-bold uppercase tracking-wide text-text-dim">{label}</p>;
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/property/cashflow/ForecastMonthCard.tsx
git commit -m "feat(cashflow): add ForecastMonthCard (Card 1)"
```

---

### Task 14: `CashflowYearTable` (Cashflow Card 2)

**Files:**
- Create: `web/components/property/cashflow/CashflowYearTable.tsx`

- [ ] **Step 1: Implement**

Create `web/components/property/cashflow/CashflowYearTable.tsx`:

```typescript
import { formatCurrency, formatDate } from '@/lib/formatters';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { CashflowYearTableResult } from '@/lib/data/propertyCashflow';
import type { CashflowLineItems } from '@/lib/calculations/cashflowCalculator';

const MONTH_LABELS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

interface RowDef {
  label: string;
  select: (items: CashflowLineItems) => number;
  sign: -1 | 1;
}

function buildRows(hasParking: boolean, hasInsurance: boolean, hasOtherCosts: boolean, hasLeerstandCosts: boolean): RowDef[] {
  const rows: RowDef[] = [
    { label: 'Einnahmen', select: (i) => i.income, sign: 1 },
    { label: 'Kreditrate', select: (i) => i.mortgage, sign: -1 },
    { label: 'Nicht umlagef. Kosten WE', select: (i) => i.hoaNonRecoverableWE, sign: -1 },
    { label: 'Instandhaltungsrücklage WE', select: (i) => i.maintenanceReserveWE, sign: -1 },
  ];
  if (hasInsurance) rows.push({ label: 'Gebäudeversicherung', select: (i) => i.insuranceWE, sign: -1 });
  rows.push({ label: 'Verwaltung', select: (i) => i.managementWE, sign: -1 });
  if (hasOtherCosts) rows.push({ label: 'Sonstige Kosten', select: (i) => i.otherCostsWE, sign: -1 });
  if (hasLeerstandCosts) {
    rows.push({ label: 'Umlagef. Kosten WE', select: (i) => i.hoaRecoverableWE, sign: -1 });
    rows.push({ label: 'Grundsteuer WE', select: (i) => i.propertyTaxWE, sign: -1 });
  }
  if (hasParking) {
    rows.push({ label: 'Nicht umlagef. Kosten TE', select: (i) => i.hoaNonRecoverableTE, sign: -1 });
    rows.push({ label: 'Instandhaltungsrücklage TE', select: (i) => i.maintenanceReserveTE, sign: -1 });
    rows.push({ label: 'Umlagef. Kosten TE', select: (i) => i.hoaRecoverableTE, sign: -1 });
    rows.push({ label: 'Grundsteuer TE', select: (i) => i.propertyTaxTE, sign: -1 });
  }
  return rows;
}

export function CashflowYearTable({ result, hasParking }: { result: CashflowYearTableResult; hasParking: boolean }) {
  const anyMonthHasInsurance = result.months.some((m) => m.lineItems.insuranceWE > 0);
  const anyMonthHasOtherCosts = result.months.some((m) => m.lineItems.otherCostsWE > 0);
  const anyMonthHasLeerstandCosts = result.months.some((m) => m.lineItems.hoaRecoverableWE > 0 || m.lineItems.propertyTaxWE > 0);
  const rows = buildRows(hasParking, anyMonthHasInsurance, anyMonthHasOtherCosts, anyMonthHasLeerstandCosts);
  const columnCount = 15; // label + 12 months + Ø + Total

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] table-fixed border-collapse text-[11px]">
        <thead>
          <tr>
            <th className="w-32 text-left text-text-secondary">Position</th>
            {result.months.map((col) => (
              <th key={col.month} className="px-1 text-right font-normal">
                <div className={col.isProjection ? 'italic text-text-dim' : 'text-text-primary'}>{MONTH_LABELS[col.month - 1]}</div>
                {col.statusLabel && (
                  <div className="mt-0.5 flex justify-end">
                    <StatusBadge status={col.statusLabel} />
                  </div>
                )}
              </th>
            ))}
            <th className="bg-blue-50/50 px-1 text-right font-normal text-text-secondary">Ø Mon</th>
            <th className="bg-blue-50/50 px-1 text-right font-normal text-text-secondary">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-black/[0.04]">
              <td className="py-1 text-text-secondary">{row.label}</td>
              {result.months.map((col) => (
                <td key={col.month} className={`px-1 text-right font-mono ${row.sign === 1 ? 'text-positive' : 'text-negative'}`}>
                  {col.isOwned ? formatCurrency(row.sign * row.select(col.lineItems)) : '–'}
                </td>
              ))}
              <td className={`bg-blue-50/50 px-1 text-right font-mono ${row.sign === 1 ? 'text-positive' : 'text-negative'}`}>
                {result.avgColumn ? formatCurrency(row.sign * row.select(result.avgColumn)) : '–'}
              </td>
              <td className={`bg-blue-50/50 px-1 text-right font-mono ${row.sign === 1 ? 'text-positive' : 'text-negative'}`}>
                {result.totalColumn ? formatCurrency(row.sign * row.select(result.totalColumn)) : '–'}
              </td>
            </tr>
          ))}

          {result.extraordinaryCostsEntryCountForYear > 0 && (
            <>
              <tr className="border-t border-blue-200">
                <td colSpan={columnCount} className="pt-2 text-[10px] font-bold uppercase tracking-wide text-text-dim">
                  Außergewöhnliche Kosten
                </td>
              </tr>
              {result.months.flatMap((col) =>
                col.extraordinaryCostRows.map((costRow) => (
                  <tr key={costRow.id} className="border-t border-black/[0.04]">
                    <td className="py-1 text-text-secondary">
                      {costRow.description_text || formatDate(new Date(costRow.cost_month + 'T00:00:00Z'))}
                    </td>
                    {result.months.map((c) => (
                      <td key={c.month} className="px-1 text-right font-mono text-negative">
                        {c.month === col.month ? formatCurrency(-costRow.amount) : ''}
                      </td>
                    ))}
                    <td className="bg-blue-50/50 px-1" />
                    <td className="bg-blue-50/50 px-1" />
                  </tr>
                ))
              )}
              <tr className="border-t border-black/[0.04] font-semibold">
                <td className="py-1 text-text-secondary">Total</td>
                <td colSpan={12} />
                <td className="bg-blue-50/50 px-1 text-right font-mono text-negative">
                  {result.extraordinaryCostsAvgForYear !== null ? formatCurrency(-result.extraordinaryCostsAvgForYear) : ''}
                </td>
                <td className="bg-blue-50/50 px-1 text-right font-mono text-negative">
                  {formatCurrency(-result.extraordinaryCostsTotalForYear)}
                </td>
              </tr>
            </>
          )}

          <tr className="border-t-2 border-blue-200 font-bold">
            <td className="py-1 text-text-primary">Cashflow vor Steuern</td>
            {result.months.map((col) => (
              <td key={col.month} className="px-1 text-right font-mono">
                {col.isOwned ? formatCurrency(col.lineItems.cashflowBeforeTax) : '–'}
              </td>
            ))}
            <td className="bg-blue-50/50 px-1 text-right font-mono">
              {result.avgColumn ? formatCurrency(result.avgColumn.cashflowBeforeTax) : '–'}
            </td>
            <td className="bg-blue-50/50 px-1 text-right font-mono">
              {result.totalColumn ? formatCurrency(result.totalColumn.cashflowBeforeTax) : '–'}
            </td>
          </tr>

          {result.isFutureYear ? (
            <tr>
              <td colSpan={columnCount} className="pt-2 text-xs text-warning">
                ⚠ Steuereffekt für Zukunftsjahre: Muss noch genauer nachgedacht werden wie wir das machen.
              </td>
            </tr>
          ) : (
            <>
              <tr className="text-accent">
                <td className="py-1">Steuererstattung Ø / Mon</td>
                {result.months.map((col) => (
                  <td key={col.month} className="px-1 text-right font-mono">
                    {col.isOwned && result.taxEffectMonthly !== null ? formatCurrency(result.taxEffectMonthly) : '–'}
                  </td>
                ))}
                <td className="bg-blue-50/50 px-1" />
                <td className="bg-blue-50/50 px-1" />
              </tr>
              <tr className="font-bold">
                <td className="py-1">Cashflow nach Steuern</td>
                {result.months.map((col) => (
                  <td
                    key={col.month}
                    className={`px-1 text-right font-mono ${(col.cashflowAfterTax ?? 0) >= 0 ? 'text-positive' : 'text-negative'}`}
                  >
                    {col.cashflowAfterTax !== null ? formatCurrency(col.cashflowAfterTax) : '–'}
                  </td>
                ))}
                <td className="bg-blue-50/50 px-1" />
                <td className="bg-blue-50/50 px-1" />
              </tr>
            </>
          )}
        </tbody>
      </table>

      {(result.hoaUnitSplitWarning || result.hoaParkingSplitWarning) && (
        <div className="mt-3 space-y-1 text-xs text-warning">
          {result.hoaUnitSplitWarning && (
            <p>
              ⚠ Steuerliche Berechnung ungenau — Hausgeld wird vollständig als Werbungskosten angesetzt. Für genaue Berechnung
              Hausgeld aufteilen (→ Einstellungen)
            </p>
          )}
          {result.hoaParkingSplitWarning && (
            <p>
              ⚠ Steuerliche Berechnung ungenau — Hausgeld Stellplatz wird vollständig als Werbungskosten angesetzt. Für genaue
              Berechnung aufteilen (→ Einstellungen)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/property/cashflow/CashflowYearTable.tsx
git commit -m "feat(cashflow): add CashflowYearTable (Card 2)"
```

---

### Task 15: `CashflowTab` client wrapper

**Files:**
- Create: `web/components/property/cashflow/CashflowTab.tsx`

Owns the (non-persisted, in-memory) scenario toggle and year-picker state, and calls the Task 9/10 data-layer functions directly on every render — no server round-trip, matching how wizard steps already import `lib/calculations/*` client-side.

- [ ] **Step 1: Implement**

Create `web/components/property/cashflow/CashflowTab.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { YearPicker } from '@/components/ui/YearPicker';
import { computeCashflowForecastMonth, computeCashflowYearTable, type CashflowScenario } from '@/lib/data/propertyCashflow';
import { ForecastMonthCard } from './ForecastMonthCard';
import { CashflowYearTable } from './CashflowYearTable';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];
type ExtraordinaryCostRow = Database['public']['Tables']['extraordinary_costs']['Row'];

export function CashflowTab({
  property,
  statusEntries,
  extraordinaryCosts,
  today,
}: {
  property: PropertyRow;
  statusEntries: StatusEntryRow[];
  extraordinaryCosts: ExtraordinaryCostRow[];
  today: Date;
}) {
  const [scenario, setScenario] = useState<CashflowScenario>('vollvermietung');
  const currentYear = today.getUTCFullYear();
  const [year, setYear] = useState(currentYear);

  const forecast = computeCashflowForecastMonth(property, statusEntries, extraordinaryCosts, scenario, today);
  const economicTransferDate = new Date(property.economic_transfer_date + 'T00:00:00Z');
  const minYear = economicTransferDate.getUTCFullYear();
  const yearTable = computeCashflowYearTable(property, statusEntries, extraordinaryCosts, year, today);
  const hasParking = property.parking_type !== 'nicht_vorhanden';

  return (
    <div className="space-y-4">
      <GlassCard>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase text-text-secondary">Prognose / Monat</h2>
          <SegmentedControl
            value={scenario}
            onChange={setScenario}
            options={[
              { value: 'vollvermietung', label: 'Vollvermietung' },
              { value: 'leerstand', label: 'Leerstand' },
            ]}
          />
        </div>
        <ForecastMonthCard result={forecast} hasParking={hasParking} />
      </GlassCard>

      <GlassCard>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase text-text-secondary">Jahresübersicht</h2>
          <YearPicker year={year} onChange={setYear} minYear={minYear} maxYear={currentYear + 1} />
        </div>
        <CashflowYearTable result={yearTable} hasParking={hasParking} />
      </GlassCard>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/property/cashflow/CashflowTab.tsx
git commit -m "feat(cashflow): add CashflowTab client wrapper"
```

---

### Task 16: Wire the Cashflow page

**Files:**
- Modify: `web/app/(app)/properties/[id]/cashflow/page.tsx`

- [ ] **Step 1: Implement**

Replace the full contents of `web/app/(app)/properties/[id]/cashflow/page.tsx` with:

```typescript
import { notFound } from 'next/navigation';
import { getPropertyDetail } from '@/lib/data/propertyDetail';
import { CashflowTab } from '@/components/property/cashflow/CashflowTab';

export default async function CashflowTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPropertyDetail(id);
  if (!detail) notFound();

  return (
    <CashflowTab
      property={detail.property}
      statusEntries={detail.statusEntries}
      extraordinaryCosts={detail.extraordinaryCosts}
      today={new Date()}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "web/app/(app)/properties/[id]/cashflow/page.tsx"
git commit -m "feat(property-detail): wire up the Cashflow tab"
```

---

### Task 17: `CurrentYearSection` (Steuer Section 1)

**Files:**
- Create: `web/components/property/steuer/CurrentYearSection.tsx`

- [ ] **Step 1: Implement**

Create `web/components/property/steuer/CurrentYearSection.tsx`:

```typescript
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { TaxCurrentYearResult } from '@/lib/data/propertyTax';

export function CurrentYearSection({
  result,
  hasParking,
  economicTransferDate,
}: {
  result: TaxCurrentYearResult;
  hasParking: boolean;
  economicTransferDate: Date;
}) {
  const { lineItems } = result;
  const effectColor = result.taxEffectMonthly >= 0 ? 'text-positive' : 'text-negative';

  return (
    <div className="space-y-1 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase text-text-secondary">Laufendes Jahr {result.year}</h2>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">Ist</span>
      </div>

      {result.transferInFuture && (
        <p className="mb-2 text-xs text-text-dim">Besitzübergang am {formatDate(economicTransferDate)} — Werte ab diesem Datum.</p>
      )}

      <Row label="Einnahmen" value={lineItems.income} positive />
      <Row label="Zinsen" value={-lineItems.interest} />
      <Row label="AfA" value={-lineItems.depreciation} />
      <Row label="Nicht umlagef. Kosten Wohnung" value={-lineItems.hoaNonRecoverableWE} />
      {lineItems.insuranceWE > 0 && <Row label="Gebäudeversicherung" value={-lineItems.insuranceWE} />}
      <Row label="Hausverwaltung" value={-lineItems.managementWE} />
      {lineItems.otherCostsWE > 0 && <Row label="Sonstige Kosten" value={-lineItems.otherCostsWE} />}
      {lineItems.hoaRecoverableWE > 0 && <Row label="Umlagef. Kosten Wohnung" value={-lineItems.hoaRecoverableWE} />}
      {lineItems.propertyTaxWE > 0 && <Row label="Grundsteuer Wohnung" value={-lineItems.propertyTaxWE} />}
      {hasParking && (
        <>
          <Row label="Nicht umlagef. Kosten Stellplatz" value={-lineItems.hoaNonRecoverableTE} />
          <Row label="Umlagef. Kosten Stellplatz" value={-lineItems.hoaRecoverableTE} />
          <Row label="Grundsteuer Stellplatz" value={-lineItems.propertyTaxTE} />
        </>
      )}
      {lineItems.extraordinaryCostsDeductible > 0 && (
        <Row label="Außergewöhnliche Kosten" value={-lineItems.extraordinaryCostsDeductible} />
      )}

      <div className="mt-2 border-t border-blue-200 pt-2" />
      <div className="flex justify-between font-bold text-text-primary">
        <span>Steuerliches Ergebnis</span>
        <span className="font-mono">{formatCurrency(lineItems.taxableIncome)}</span>
      </div>
      <div className={`flex justify-between text-[22px] font-extrabold ${effectColor}`}>
        <span>Steuereffekt / Mon</span>
        <span className="font-mono">{formatCurrency(result.taxEffectMonthly)}</span>
      </div>

      {result.hoaUnitSplitWarning && (
        <p className="mt-2 text-xs text-warning">⚠ Für genaue Berechnung Hausgeld Wohnung aufteilen (→ Einstellungen)</p>
      )}
      {result.hoaParkingSplitWarning && (
        <p className="text-xs text-warning">⚠ Für genaue Berechnung Hausgeld Stellplatz aufteilen (→ Einstellungen)</p>
      )}
    </div>
  );
}

function Row({ label, value, positive = false }: { label: string; value: number; positive?: boolean }) {
  return (
    <div className={`flex justify-between ${positive ? 'text-positive' : 'text-negative'}`}>
      <span className="text-text-secondary">{label}</span>
      <span className="font-mono">{formatCurrency(value)}</span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/property/steuer/CurrentYearSection.tsx
git commit -m "feat(steuer): add CurrentYearSection (Section 1)"
```

---

### Task 18: `ForecastSection` (Steuer Section 2)

**Files:**
- Create: `web/components/property/steuer/ForecastSection.tsx`

- [ ] **Step 1: Implement**

Create `web/components/property/steuer/ForecastSection.tsx`:

```typescript
import { formatCurrency } from '@/lib/formatters';
import type { TaxForecastYearResult } from '@/lib/data/propertyTax';

export function ForecastSection({ result, hasParking }: { result: TaxForecastYearResult; hasParking: boolean }) {
  const { lineItems } = result;
  const effectColor = result.taxEffectMonthly >= 0 ? 'text-positive' : 'text-negative';

  return (
    <div className="space-y-1 text-sm">
      <Row label="Einnahmen" value={lineItems.income} positive />
      <Row label="Zinsen" value={-lineItems.interest} />
      <Row label="AfA" value={-lineItems.depreciation} />
      <Row label="Nicht umlagef. Kosten Wohnung" value={-lineItems.hoaNonRecoverableWE} />
      {lineItems.insuranceWE > 0 && <Row label="Gebäudeversicherung" value={-lineItems.insuranceWE} />}
      <Row label="Hausverwaltung" value={-lineItems.managementWE} />
      {lineItems.otherCostsWE > 0 && <Row label="Sonstige Kosten" value={-lineItems.otherCostsWE} />}
      {lineItems.hoaRecoverableWE > 0 && <Row label="Umlagef. Kosten Wohnung" value={-lineItems.hoaRecoverableWE} />}
      {lineItems.propertyTaxWE > 0 && <Row label="Grundsteuer Wohnung" value={-lineItems.propertyTaxWE} />}
      {hasParking && (
        <>
          <Row label="Nicht umlagef. Kosten Stellplatz" value={-lineItems.hoaNonRecoverableTE} />
          <Row label="Umlagef. Kosten Stellplatz" value={-lineItems.hoaRecoverableTE} />
          <Row label="Grundsteuer Stellplatz" value={-lineItems.propertyTaxTE} />
        </>
      )}

      <div className="mt-2 border-t border-blue-200 pt-2" />
      <div className="flex justify-between font-bold text-text-primary">
        <span>Steuerliches Ergebnis (Prog.)</span>
        <span className="font-mono">{formatCurrency(lineItems.taxableIncome)}</span>
      </div>
      <div className={`flex justify-between text-[22px] font-extrabold ${effectColor}`}>
        <span>Steuereffekt / Mon</span>
        <span className="font-mono">{formatCurrency(result.taxEffectMonthly)}</span>
      </div>
    </div>
  );
}

function Row({ label, value, positive = false }: { label: string; value: number; positive?: boolean }) {
  return (
    <div className={`flex justify-between ${positive ? 'text-positive' : 'text-negative'}`}>
      <span className="text-text-secondary">{label}</span>
      <span className="font-mono">{formatCurrency(value)}</span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/property/steuer/ForecastSection.tsx
git commit -m "feat(steuer): add ForecastSection (Section 2)"
```

---

### Task 19: `SteuerTab` client wrapper

**Files:**
- Create: `web/components/property/steuer/SteuerTab.tsx`

- [ ] **Step 1: Implement**

Create `web/components/property/steuer/SteuerTab.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { YearPicker } from '@/components/ui/YearPicker';
import { computeTaxCurrentYear, computeTaxForecastYear, type TaxScenarioChoice } from '@/lib/data/propertyTax';
import { CurrentYearSection } from './CurrentYearSection';
import { ForecastSection } from './ForecastSection';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];
type ExtraordinaryCostRow = Database['public']['Tables']['extraordinary_costs']['Row'];

export function SteuerTab({
  property,
  statusEntries,
  extraordinaryCosts,
  today,
}: {
  property: PropertyRow;
  statusEntries: StatusEntryRow[];
  extraordinaryCosts: ExtraordinaryCostRow[];
  today: Date;
}) {
  const currentYear = today.getUTCFullYear();
  const [scenario, setScenario] = useState<TaxScenarioChoice>('vollvermietung');
  const [year, setYear] = useState(currentYear + 1);

  const currentYearResult = computeTaxCurrentYear(property, statusEntries, extraordinaryCosts, today);
  const forecastResult = computeTaxForecastYear(property, year, scenario);
  const economicTransferDate = new Date(property.economic_transfer_date + 'T00:00:00Z');
  const hasParking = property.parking_type !== 'nicht_vorhanden';

  return (
    <GlassCard>
      <CurrentYearSection result={currentYearResult} hasParking={hasParking} economicTransferDate={economicTransferDate} />

      <div className="my-4 h-[1.5px] bg-gradient-to-r from-blue-500/35 to-transparent" />

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase text-text-secondary">Prognose</h2>
        <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Prognose</span>
      </div>
      <div className="mb-3 flex items-center justify-between">
        <YearPicker year={year} onChange={setYear} minYear={currentYear + 1} />
        <SegmentedControl
          value={scenario}
          onChange={setScenario}
          options={[
            { value: 'vollvermietung', label: 'Vollvermietung' },
            { value: 'leerstand', label: 'Leerstand' },
          ]}
        />
      </div>
      <ForecastSection result={forecastResult} hasParking={hasParking} />
    </GlassCard>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/property/steuer/SteuerTab.tsx
git commit -m "feat(steuer): add SteuerTab client wrapper"
```

---

### Task 20: Wire the Steuer page

**Files:**
- Modify: `web/app/(app)/properties/[id]/steuer/page.tsx`

- [ ] **Step 1: Implement**

Replace the full contents of `web/app/(app)/properties/[id]/steuer/page.tsx` with:

```typescript
import { notFound } from 'next/navigation';
import { getPropertyDetail } from '@/lib/data/propertyDetail';
import { SteuerTab } from '@/components/property/steuer/SteuerTab';

export default async function SteuerTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPropertyDetail(id);
  if (!detail) notFound();

  return (
    <SteuerTab
      property={detail.property}
      statusEntries={detail.statusEntries}
      extraordinaryCosts={detail.extraordinaryCosts}
      today={new Date()}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "web/app/(app)/properties/[id]/steuer/page.tsx"
git commit -m "feat(property-detail): wire up the Steuer tab"
```

---

### Task 21: Full-suite verification and manual QA

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated test suite**

Run: `cd web && npm test`
Expected: All test files PASS, no regressions (pay particular attention to `taxCalculator.test.ts` and `propertySummary.test.ts`/`propertyOverview.test.ts`, since Task 5 refactored a function they depend on).

- [ ] **Step 2: Run the linter**

Run: `cd web && npm run lint`
Expected: No errors.

- [ ] **Step 3: Manual walkthrough**

Run: `cd web && npm run dev`

Walk through, on an existing property with at least one status entry and one extraordinary cost (create one via the Verlauf tab if needed):

1. `/properties/[id]/cashflow`:
   - Card 1: toggle Vollvermietung ↔ Leerstand — income and "Umlagef./Grundsteuer WE" rows should flip between full and zero as expected; "CF nach Steuern" updates and its color (red/green) matches its sign.
   - Card 2: year picker moves within `[economicTransferDate.year, currentYear + 1]` and clamps at both ends; month columns before the acquisition month show "–"; the current month's column reflects Ist-to-date; an extraordinary cost appears as its own row in its month and in the "Total" row; "Steuererstattung Ø/Mon" matches the value shown on the Steuer tab's Section 1 exactly.
   - Navigate the year picker to `currentYear + 1`: the future-year warning message appears, "Steuererstattung Ø/Mon" and "Cashflow nach Steuern" rows show "–".
   - If `is_hoa_unit_split` is false on the test property, the Hausgeld warning appears below the table.
2. `/properties/[id]/steuer`:
   - Section 1 shows the current year, an "Ist" badge, and (if `economic_transfer_date` is in the future) the "Besitzübergang am …" hint.
   - Section 2 defaults to next calendar year, Vollvermietung; toggling to Leerstand zeroes income and fills in the recoverable-WE rows for the full year; the year picker cannot go below `currentYear + 1`.
   - The blue gradient divider renders between the two sections.
   - Hausgeld warnings appear/disappear consistent with `is_hoa_unit_split`/`is_hoa_parking_split`.
3. Confirm both tabs' KPI-bar-independent numbers (e.g. Steuer Section 1's "Steuereffekt / Mon") are consistent with the Übersicht tab's own `summary.taxEffectMonthly` figure being in the same ballpark (they may differ slightly since Übersicht's pre-existing calculation doesn't yet include deductible extraordinary costs — see this plan's Ground Truth note — but should not be wildly different).
4. Stop the dev server (`Ctrl+C`).

- [ ] **Step 4: Report results**

If anything in Step 3 doesn't match, fix it (with a matching test update where the mismatch is in a pure-calculation or data-layer file) before considering this plan done. Once everything checks out, this plan is complete — Plan 6 (Finanzierung, Immobiliendaten, edit-flow) picks up from here.
