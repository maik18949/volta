# Stellplatz: unabhängiger Status — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a Stellplatz have its own independent vermietet/leerstand/mietgarantie status history, separate from the Wohnung's, so Cashflow/Steuer/Übersicht calculations reflect reality when the two are rented or vacant independently.

**Architecture:** Add a `unit` (`wohnung`/`stellplatz`) column to `status_entries` so each unit gets its own row sequence; migration backfills Stellplatz as a copy of Wohnung for existing properties with parking. The calculation core splits every "income" computation into two `incomeForUnit` calls (Wohnung: coldRent+otherIncome, Stellplatz: parkingRent) each fed its own history, while `leerstandDayFraction`/vacancy-KPI/cost calculations stay Wohnung-only exactly as before. The Verlauf tab gets a Wohnung/Stellplatz segmented control; the Cashflow-Jahrestabelle splits "Einnahmen" into two rows (one per unit) each with its own per-month status badge, replacing the old combined header badges.

**Tech Stack:** Next.js App Router, Supabase (Postgres), TypeScript, Vitest, react-hook-form.

**Branch:** This plan is executed in the git worktree `stellplatz-unabhaengiger-status` (branch `worktree-stellplatz-unabhaengiger-status`, based on `fix/mietgarantie-fixbetrag`) — already set up, work directly here.

**Out of scope:** Stellplatz-specific "Leerstandsquote" KPI (that KPI stays Wohnung-only, per the design spec); per-unit `leerstandQuoteOverride` in the Steuer tab's "Prognose" section (stays a single property-wide quote); moving an existing status entry to a different unit after creation (unit is fixed at creation).

Design spec: `docs/superpowers/specs/2026-09-15-stellplatz-unabhaengiger-status-design.md`.

---

## File Structure

| File | Change |
|---|---|
| `web/supabase/migrations/20260915120000_stellplatz_status_unit.sql` | New — `property_unit` enum, `status_entries.unit` column, backfill |
| `web/lib/supabase/types.ts` | Modify — `unit` field on `status_entries`, `property_unit` enum |
| `web/lib/calculations/statusPeriodCalculator.ts` | Modify — `incomeForMonth` → `incomeForUnit`, new `PropertyUnit` type |
| `web/lib/calculations/cashflowCalculator.ts` | Modify — `CashflowLineItems.income` → `incomeWE`/`incomeTE`, per-unit history params |
| `web/lib/calculations/taxCalculator.ts` | Modify — internal income calc splits by unit, `TaxLineItems.income` unchanged |
| `web/lib/data/propertySummary.ts` | Modify — `toStatusHistory(rows, unit)`, new `toUnitStatusHistories` |
| `web/lib/data/propertyCashflow.ts` | Modify — thread both histories through, `CashflowMonthColumn.statusLabels` → `statusLabelsWE`/`statusLabelsTE` |
| `web/lib/data/propertyOverview.ts` | Modify — vacancy KPI stays Wohnung-only, `annualCashflowBeforeTax` gets both histories |
| `web/lib/data/propertyTax.ts` | Modify — passes `stellplatzStatusHistory` through |
| `web/lib/data/statusEntryActions.ts` | Modify — unit-scoped validation |
| `web/components/property/verlauf/StatusEntryModal.tsx` | Modify — `unit` prop |
| `web/components/property/verlauf/VerlaufFeed.tsx` | Modify — Wohnung/Stellplatz segmented control |
| `web/app/(app)/properties/[id]/verlauf/page.tsx` | Modify — pass `parkingType` down |
| `web/components/property/cashflow/CashflowYearTable.tsx` | Modify — split Einnahmen rows + per-row badges |
| `web/components/property/cashflow/ForecastMonthCard.tsx` | Modify — `incomeWE + incomeTE` |
| `web/lib/wizard/wizardLogic.ts` | Modify — `mapToStatusEntryInsert` → `mapToStatusEntryInserts` |
| `web/components/wizard/PropertyWizard.tsx` | Modify — insert array instead of single row |
| `web/lib/data/propertyActions.ts` | Modify — `createProperty` inserts an array |
| `web/scripts/seed.ts` | Modify — demo property gets a Stellplatz + divergent history |
| 6 test files (see Task 2/6) | Modify — fixtures + assertions |

---

## Task 1: Database migration + Supabase types

**Files:**
- Create: `web/supabase/migrations/20260915120000_stellplatz_status_unit.sql`
- Modify: `web/lib/supabase/types.ts`

- [ ] **Step 1: Write the migration**

```sql
create type property_unit as enum ('wohnung', 'stellplatz');

alter table status_entries
  add column unit property_unit not null default 'wohnung';

insert into status_entries (property_id, date, status, income_actual_monthly,
  income_is_fixed_amount, income_period_end_date, notes, unit)
select property_id, date, status, income_actual_monthly,
  income_is_fixed_amount, income_period_end_date, notes, 'stellplatz'
from status_entries se
where se.unit = 'wohnung'
  and exists (
    select 1 from properties p
    where p.id = se.property_id and p.parking_type <> 'nicht_vorhanden'
  );
```

Save this to `web/supabase/migrations/20260915120000_stellplatz_status_unit.sql`.

- [ ] **Step 2: Update `web/lib/supabase/types.ts` — add `unit` to `status_entries`**

In the `status_entries` table block (`Row`/`Insert`/`Update`), add `unit` after `status`:

```ts
      status_entries: {
        Row: {
          created_at: string
          date: string
          id: string
          income_actual_monthly: number | null
          income_is_fixed_amount: boolean
          income_period_end_date: string | null
          notes: string
          property_id: string
          status: Database["public"]["Enums"]["property_status"]
          unit: Database["public"]["Enums"]["property_unit"]
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          income_actual_monthly?: number | null
          income_is_fixed_amount?: boolean
          income_period_end_date?: string | null
          notes?: string
          property_id: string
          status?: Database["public"]["Enums"]["property_status"]
          unit?: Database["public"]["Enums"]["property_unit"]
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          income_actual_monthly?: number | null
          income_is_fixed_amount?: boolean
          income_period_end_date?: string | null
          notes?: string
          property_id?: string
          status?: Database["public"]["Enums"]["property_status"]
          unit?: Database["public"]["Enums"]["property_unit"]
        }
```

- [ ] **Step 3: Add the `property_unit` enum to `Database["public"]["Enums"]`**

In the `Enums` block, insert alphabetically after `property_type` is wrong — insert after `property_status` and before `property_type` (matches alphabetical order already used):

```ts
      property_status: "vermietet" | "leerstand" | "mietgarantie"
      property_type:
```

becomes:

```ts
      property_status: "vermietet" | "leerstand" | "mietgarantie"
      property_unit: "wohnung" | "stellplatz"
      property_type:
```

- [ ] **Step 4: Add `property_unit` to `Constants.public.Enums`**

```ts
      property_status: ["vermietet", "leerstand", "mietgarantie"],
      property_type: [
```

becomes:

```ts
      property_status: ["vermietet", "leerstand", "mietgarantie"],
      property_unit: ["wohnung", "stellplatz"],
      property_type: [
```

- [ ] **Step 5: Verify the project still typechecks**

Run: `cd web && npx tsc --noEmit`
Expected: same errors as before this task (none related to `status_entries`/`property_unit`) — this task only adds fields, nothing yet reads `unit` so no new errors should appear.

- [ ] **Step 6: Commit**

```bash
git add web/supabase/migrations/20260915120000_stellplatz_status_unit.sql web/lib/supabase/types.ts
git commit -m "$(cat <<'EOF'
feat(db): add unit column to status_entries for independent Stellplatz status

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Calculation core — split income by unit

This task touches `statusPeriodCalculator.ts`, `cashflowCalculator.ts`, `taxCalculator.ts`, `propertySummary.ts`, `propertyCashflow.ts`, `propertyOverview.ts`, `propertyTax.ts` and their tests together. Individual steps will leave the full suite red (other not-yet-updated files still call the old `incomeForMonth`) — that's expected; run each file's own test in isolation to check progress, and only expect the **full** suite green at the end of this task (Step 20).

**Files:**
- Modify: `web/lib/calculations/statusPeriodCalculator.ts`
- Modify: `web/tests/calculations/statusPeriodCalculator.test.ts`
- Modify: `web/lib/calculations/cashflowCalculator.ts`
- Modify: `web/tests/calculations/cashflowCalculator.test.ts`
- Modify: `web/lib/calculations/taxCalculator.ts`
- Modify: `web/lib/data/propertySummary.ts`
- Modify: `web/lib/data/propertyCashflow.ts`
- Modify: `web/tests/data/propertyCashflow.test.ts`
- Modify: `web/lib/data/propertyOverview.ts`
- Modify: `web/lib/data/propertyTax.ts`
- Modify: `web/tests/data/propertySummary.test.ts`, `web/tests/data/propertyOverview.test.ts`, `web/tests/data/propertyTax.test.ts`, `web/tests/kpiCalculationText.test.ts` (fixture-only)

### Step 1: Rewrite `incomeForMonth` tests as `incomeForUnit` tests (red)

In `web/tests/calculations/statusPeriodCalculator.test.ts`, replace the import and the 11 tests from `it('incomeForMonth: fully vermietet', ...)` through `it('incomeForMonth: Satz pro Monat ...)` (lines 38–111) with:

```ts
import {
  incomeForUnit,
  leerstandDayFraction,
  genuineVacancyDayFraction,
  ownershipDayFraction,
  ownershipAndVacancyDaysSinceTransfer,
  statusesForMonth,
} from '@/lib/calculations/statusPeriodCalculator';
```

```ts
  it('incomeForUnit: fully vermietet', () => {
    const history = [entry('vermietet', 2026, 2)];
    const result = incomeForUnit(makeDate(2026, 6, 1), history, today, 998);
    expect(result).toBeCloseTo(998.0, 2);
  });

  it('incomeForUnit: fully leerstand is zero', () => {
    const history = [entry('leerstand', 2026, 2)];
    const result = incomeForUnit(makeDate(2026, 6, 1), history, today, 998);
    expect(result).toBeCloseTo(0, 2);
  });

  it('incomeForUnit: mietgarantie uses the entry income, not the monthly amount', () => {
    const history = [entry('mietgarantie', 2026, 2, 1, 999)];
    const result = incomeForUnit(makeDate(2026, 6, 1), history, today, 998);
    expect(result).toBeCloseTo(999.0, 2);
  });

  it('incomeForUnit: mid-month transition leerstand -> vermietet (30-day month)', () => {
    const history = [entry('leerstand', 2026, 2), entry('vermietet', 2026, 6, 16)];
    const result = incomeForUnit(makeDate(2026, 6, 1), history, today, 998);
    // vermietet 15/30 days: 998 * 15/30 = 499.00
    expect(result).toBeCloseTo(998.0 * (15 / 30), 2);
  });

  it('incomeForUnit: future month projects the last known status', () => {
    const history = [entry('vermietet', 2026, 2)];
    const result = incomeForUnit(makeDate(2026, 12, 1), history, makeDate(2026, 6, 1), 998);
    expect(result).toBeCloseTo(998.0, 2);
  });

  it('incomeForUnit: Fixbetrag entirely within one month is not re-prorated (regression for the double-shrink bug)', () => {
    const history = [fixedEntry(2026, 6, 16, 511.2, 2026, 6, 30)];
    const result = incomeForUnit(makeDate(2026, 6, 1), history, today, 998);
    expect(result).toBeCloseTo(511.2, 2);
  });

  it('incomeForUnit: Fixbetrag spanning two months is split proportionally by days in the period', () => {
    const history = [fixedEntry(2026, 5, 20, 600, 2026, 6, 10)];
    const may = incomeForUnit(makeDate(2026, 5, 1), history, today, 998);
    const june = incomeForUnit(makeDate(2026, 6, 1), history, today, 998);
    expect(may).toBeCloseTo(600 * (12 / 22), 2);
    expect(june).toBeCloseTo(600 * (10 / 22), 2);
    expect(may + june).toBeCloseTo(600, 2);
  });

  it('incomeForUnit: days after the Fixbetrag end date count as 0 EUR until a new entry is added', () => {
    const history = [fixedEntry(2026, 6, 16, 300, 2026, 6, 20)];
    const june = incomeForUnit(makeDate(2026, 6, 1), history, today, 998);
    const july = incomeForUnit(makeDate(2026, 7, 1), history, today, 998);
    expect(june).toBeCloseTo(300, 2); // full Fixbetrag, days 21-30 contribute 0
    expect(july).toBeCloseTo(0, 2); // fully past the fixed period, no next entry yet
  });

  it('incomeForUnit: Satz pro Monat (isFixedAmount undefined) keeps the existing day-fraction behavior', () => {
    const history = [entry('mietgarantie', 2026, 6, 16, 950)];
    const result = incomeForUnit(makeDate(2026, 6, 1), history, today, 998);
    expect(result).toBeCloseTo(950 * (15 / 30), 2);
  });
```

(The two dropped tests — "includes otherIncomeMonthly while vermietet" and "otherIncomeMonthly is zero during leerstand" — tested behavior that now lives one level up, in the caller that combines `coldRentMonthly + otherIncomeMonthly` before calling `incomeForUnit`; that composition is covered by the `cashflowLineItemsForActualMonth` test in Step 6.)

### Step 2: Verify the new tests fail

Run: `cd web && npx vitest run tests/calculations/statusPeriodCalculator.test.ts`
Expected: FAIL — `incomeForUnit is not a function` (it isn't exported yet).

### Step 3: Implement `incomeForUnit` in `statusPeriodCalculator.ts`

Replace the `incomeForMonth` export (and its doc comment) with:

```ts
export type PropertyUnit = 'wohnung' | 'stellplatz';

/**
 * Monthly income for a single unit (Wohnung or Stellplatz), day-accurate. `monthlyAmount`
 * is whatever that unit contributes while vermietet — the caller combines coldRentMonthly +
 * otherIncomeMonthly for Wohnung, or passes parkingRentMonthly alone for Stellplatz. Each
 * unit carries its own independent status history (see docs/superpowers/specs/2026-09-15-
 * stellplatz-unabhaengiger-status-design.md) — Wohnung and Stellplatz vermietet/leerstand/
 * mietgarantie no longer have to move together.
 */
export function incomeForUnit(month: Date, statusHistory: StatusEntry[], today: Date, monthlyAmount: number): number {
  return segments(month, statusHistory, today).reduce((sum, seg) => {
    if (seg.status === 'vermietet') return sum + monthlyAmount * seg.dayFraction;
    if (seg.status === 'mietgarantie') return sum + seg.mietgarantieIncomeEur;
    return sum; // leerstand
  }, 0);
}
```

### Step 4: Verify statusPeriodCalculator tests pass

Run: `cd web && npx vitest run tests/calculations/statusPeriodCalculator.test.ts`
Expected: PASS (all tests in this file). Other test files will now fail (`incomeForMonth` no longer exists) — expected until later steps.

### Step 5: Update `cashflowCalculator.test.ts` for the `.income` → `.incomeWE`/`.incomeTE` rename

In `web/tests/calculations/cashflowCalculator.test.ts`:

Line 223, replace:
```ts
    expect(result.income).toBeCloseTo(998, 2); // coldRent 950 + parkingRent 48
```
with:
```ts
    expect(result.incomeWE).toBeCloseTo(950, 2);
    expect(result.incomeTE).toBeCloseTo(48, 2);
```

Line 237, replace:
```ts
    expect(result.income).toBe(0);
```
with:
```ts
    expect(result.incomeWE).toBe(0);
    expect(result.incomeTE).toBe(0);
```

Line 292, replace:
```ts
    expect(result.income).toBeCloseTo(998, 2);
```
with:
```ts
    expect(result.incomeWE).toBeCloseTo(950, 2);
    expect(result.incomeTE).toBeCloseTo(48, 2);
```

Line 302, replace:
```ts
    expect(after.income).toBeCloseTo(before.income + 75, 2);
```
with:
```ts
    expect(after.incomeWE).toBeCloseTo(before.incomeWE + 75, 2);
```

Line 308, replace:
```ts
    expect(result.income).toBe(0);
```
with:
```ts
    expect(result.incomeWE).toBe(0);
    expect(result.incomeTE).toBe(0);
```

Line 320, replace:
```ts
    expect(result.income).toBeCloseTo(998 * 0.5, 2);
```
with:
```ts
    expect(result.incomeWE).toBeCloseTo(950 * 0.5, 2);
    expect(result.incomeTE).toBeCloseTo(48 * 0.5, 2);
```

Line 398, replace:
```ts
    expect(blended.income).toBeCloseTo(voll.income * 0.95, 6);
```
with:
```ts
    expect(blended.incomeWE).toBeCloseTo(voll.incomeWE * 0.95, 6);
    expect(blended.incomeTE).toBe(0); // scenarioBaseInput has parkingRentMonthly: 0
```

Lines 401–402, replace:
```ts
    const expectedCashflow =
      blended.income -
      blended.mortgage -
```
with:
```ts
    const expectedCashflow =
      blended.incomeWE -
      blended.incomeTE -
      blended.mortgage -
```

### Step 6: Add a new test proving Wohnung/Stellplatz independence (red)

In `web/tests/calculations/cashflowCalculator.test.ts`, inside the `describe('cashflowLineItemsForActualMonth', ...)` block, add after the last `it(...)`:

```ts
  it('Wohnung and Stellplatz can be in different statuses at the same time', () => {
    const wohnungHistory: StatusEntry[] = [{ date: makeDate(2026, 2, 1), status: 'vermietet', incomeActualMonthly: null }];
    const stellplatzHistory: StatusEntry[] = [{ date: makeDate(2026, 2, 1), status: 'leerstand', incomeActualMonthly: null }];
    const result = cashflowLineItemsForActualMonth({
      ...baseInput,
      month: makeDate(2026, 6, 1),
      statusHistory: wohnungHistory,
      stellplatzStatusHistory: stellplatzHistory,
      today,
    });
    expect(result.incomeWE).toBeCloseTo(f.coldRentMonthly, 2);
    expect(result.incomeTE).toBe(0); // Stellplatz is leerstand — its rent doesn't flow even though the Wohnung is vermietet
  });

  it('omitting stellplatzStatusHistory defaults it to mirror the Wohnung history', () => {
    const history: StatusEntry[] = [{ date: makeDate(2026, 2, 1), status: 'leerstand', incomeActualMonthly: null }];
    const result = cashflowLineItemsForActualMonth({ ...baseInput, month: makeDate(2026, 6, 1), statusHistory: history, today });
    expect(result.incomeWE).toBe(0);
    expect(result.incomeTE).toBe(0); // mirrors the leerstand Wohnung history, not the vollvermietung default
  });
```

Run: `cd web && npx vitest run tests/calculations/cashflowCalculator.test.ts`
Expected: FAIL — `CashflowActualMonthInput` has no `stellplatzStatusHistory` field yet, and `result.incomeWE`/`incomeTE` don't exist (still `.income`).

### Step 7: Implement the split in `cashflowCalculator.ts`

Update the import:
```ts
import { leerstandDayFraction, incomeForUnit, ownershipDayFraction } from './statusPeriodCalculator';
```

In `AnnualCashflowBeforeTaxInput`, add after `statusHistory: StatusEntry[];`:
```ts
  /** Defaults to `statusHistory` (mirrors Wohnung) when omitted — see incomeForUnit. */
  stellplatzStatusHistory?: StatusEntry[];
```

In `annualCashflowBeforeTax`, right after `let total = 0;` add:
```ts
  const stellplatzHistory = input.stellplatzStatusHistory ?? input.statusHistory;
```
and replace the `const income = incomeForMonth(...)` call with:
```ts
    const income =
      incomeForUnit(month, input.statusHistory, input.today, input.coldRentMonthly + input.otherIncomeMonthly) +
      incomeForUnit(month, stellplatzHistory, input.today, input.parkingRentMonthly);
```

In `CashflowLineItems`, replace `income: number;` with:
```ts
  incomeWE: number;
  incomeTE: number;
```

In `cashflowBeforeTaxFromLineItems`, replace `items.income -` with:
```ts
    items.incomeWE -
    items.incomeTE -
```

In `cashflowLineItemsForScenario`, replace:
```ts
  const income =
    input.scenario === 'vollvermietung' ? input.coldRentMonthly + input.parkingRentMonthly + input.otherIncomeMonthly : 0;
```
with:
```ts
  const incomeWE = input.scenario === 'vollvermietung' ? input.coldRentMonthly + input.otherIncomeMonthly : 0;
  const incomeTE = input.scenario === 'vollvermietung' ? input.parkingRentMonthly : 0;
```
and in the `items` object literal, replace `income,` with `incomeWE,\n    incomeTE,`.

In `blendCashflowLineItems`, replace:
```ts
    income: vollvermietung.income * (1 - p) + leerstand.income * p,
```
with:
```ts
    incomeWE: vollvermietung.incomeWE * (1 - p) + leerstand.incomeWE * p,
    incomeTE: vollvermietung.incomeTE * (1 - p) + leerstand.incomeTE * p,
```

In `CashflowActualMonthInput`, add after `statusHistory: StatusEntry[];`:
```ts
  /** Defaults to `statusHistory` (mirrors Wohnung) when omitted — see incomeForUnit. */
  stellplatzStatusHistory?: StatusEntry[];
```

In `cashflowLineItemsForActualMonth`, replace:
```ts
  const income = incomeForMonth(
    input.month,
    input.statusHistory,
    input.today,
    input.coldRentMonthly,
    input.parkingRentMonthly,
    input.otherIncomeMonthly
  );
```
with:
```ts
  const stellplatzHistory = input.stellplatzStatusHistory ?? input.statusHistory;
  const incomeWE = incomeForUnit(input.month, input.statusHistory, input.today, input.coldRentMonthly + input.otherIncomeMonthly);
  const incomeTE = incomeForUnit(input.month, stellplatzHistory, input.today, input.parkingRentMonthly);
```
and in the `items` object literal, replace `income,` with `incomeWE,\n    incomeTE,`.

### Step 8: Verify cashflowCalculator tests pass

Run: `cd web && npx vitest run tests/calculations/cashflowCalculator.test.ts`
Expected: PASS (all tests).

### Step 9: Update `taxCalculator.ts`

`TaxLineItems.income` stays as-is (single combined field — the Steuer tab doesn't split by unit, only the Cashflow tab does).

Update the import:
```ts
import { ownershipDayFraction, leerstandDayFraction, incomeForUnit } from './statusPeriodCalculator';
```

In `AnnualTaxableIncomeInput`, add after `statusHistory: StatusEntry[];`:
```ts
  /** Defaults to `statusHistory` (mirrors Wohnung) when omitted — see incomeForUnit. */
  stellplatzStatusHistory?: StatusEntry[];
```

In `annualTaxableIncomeBreakdown`, right after `if (ownershipMonths.length === 0) return ZERO_TAX_LINE_ITEMS;` add:
```ts
  const stellplatzHistory = input.stellplatzStatusHistory ?? input.statusHistory;
```

Replace:
```ts
    const monthIncome = useOverride
      ? (input.coldRentMonthly + input.parkingRentMonthly + input.otherIncomeMonthly) * (1 - overrideQuote!)
      : incomeForMonth(
          month,
          input.statusHistory,
          input.today,
          input.coldRentMonthly,
          input.parkingRentMonthly,
          input.otherIncomeMonthly
        );
```
with:
```ts
    const monthIncome = useOverride
      ? (input.coldRentMonthly + input.parkingRentMonthly + input.otherIncomeMonthly) * (1 - overrideQuote!)
      : incomeForUnit(month, input.statusHistory, input.today, input.coldRentMonthly + input.otherIncomeMonthly) +
        incomeForUnit(month, stellplatzHistory, input.today, input.parkingRentMonthly);
```

(The `leerstandQuoteOverride` "what-if" branch stays a single combined quote for the whole property — splitting that is out of scope.)

### Step 10: Verify taxCalculator tests still pass unchanged

Run: `cd web && npx vitest run tests/calculations/taxCalculator.test.ts`
Expected: PASS with **no test file edits** — every existing call passes `parkingRentMonthly` alongside a single `statusHistory`, and `stellplatzStatusHistory` defaults to mirror it, so results are numerically identical to before.

### Step 11: Update `propertySummary.ts`

Update imports:
```ts
import type { StatusEntry, PropertyStatus, PropertyUnit } from '@/lib/calculations/statusPeriodCalculator';
import { incomeForUnit, ownershipDayFraction } from '@/lib/calculations/statusPeriodCalculator';
```

Replace `toStatusHistory` and add `toUnitStatusHistories`:
```ts
export function toStatusHistory(rows: StatusEntryRow[], unit: PropertyUnit): StatusEntry[] {
  return rows
    .filter((row) => row.unit === unit)
    .map((row) => ({
      date: new Date(row.date + 'T00:00:00Z'),
      status: row.status as PropertyStatus,
      incomeActualMonthly: row.income_actual_monthly,
      isFixedAmount: row.income_is_fixed_amount,
      periodEndDate: row.income_period_end_date ? new Date(row.income_period_end_date + 'T00:00:00Z') : null,
    }));
}

/**
 * Wohnung and Stellplatz status histories from one property's raw rows. Falls back to
 * mirroring the Wohnung history for Stellplatz when no unit='stellplatz' row exists yet
 * (a property whose Stellplatz was added after its status history was first recorded, or a
 * pre-migration property that hasn't been backfilled) — matches the migration's own backfill
 * semantics instead of silently treating an un-backfilled Stellplatz as permanently vacant.
 */
export function toUnitStatusHistories(rows: StatusEntryRow[]): { wohnung: StatusEntry[]; stellplatz: StatusEntry[] } {
  const wohnung = toStatusHistory(rows, 'wohnung');
  const hasStellplatzRows = rows.some((row) => row.unit === 'stellplatz');
  return { wohnung, stellplatz: hasStellplatzRows ? toStatusHistory(rows, 'stellplatz') : wohnung };
}
```

In `computePropertySummary`, replace:
```ts
  const statusHistory = toStatusHistory(statusEntryRows);
```
with:
```ts
  const { wohnung: statusHistory, stellplatz: stellplatzStatusHistory } = toUnitStatusHistories(statusEntryRows);
```

Replace:
```ts
  const incomeThisMonth = incomeForMonth(
    currentMonth,
    statusHistory,
    today,
    property.cold_rent_monthly,
    property.parking_rent_monthly,
    property.other_income_monthly
  );
```
with:
```ts
  const incomeThisMonth =
    incomeForUnit(currentMonth, statusHistory, today, property.cold_rent_monthly + property.other_income_monthly) +
    incomeForUnit(currentMonth, stellplatzStatusHistory, today, property.parking_rent_monthly);
```

In the `annualTaxableIncome({...})` call, add `stellplatzStatusHistory,` right after `statusHistory,`.

(`ownerBorneRecoverableWEForMonth`, `sortedStatusHistory`, `currentStatus` all keep referencing `statusHistory` unchanged — they were already Wohnung-scoped in spirit, and now literally are.)

### Step 12: Update `propertySummary.test.ts`'s `makeStatusEntry` for the new required `unit` field

In `web/tests/data/propertySummary.test.ts`, in `function makeStatusEntry`, add `unit: 'wohnung',` after `created_at: '2026-01-01T00:00:00Z',`:

```ts
function makeStatusEntry(overrides: Partial<StatusEntryRow> = {}): StatusEntryRow {
  return {
    id: 'status-1',
    property_id: 'prop-1',
    date: '2026-02-01',
    status: 'vermietet',
    income_actual_monthly: null,
    income_is_fixed_amount: false,
    income_period_end_date: null,
    notes: '',
    created_at: '2026-01-01T00:00:00Z',
    unit: 'wohnung',
    ...overrides,
  };
}
```

### Step 13: Verify propertySummary tests pass unchanged

Run: `cd web && npx vitest run tests/data/propertySummary.test.ts`
Expected: PASS with no assertion changes — every existing fixture has only Wohnung-tagged rows, so `stellplatz` mirrors `wohnung` via the fallback and `incomeActualMonthly`/`currentStatus` come out numerically identical to before.

### Step 14: Update `propertyCashflow.ts`

Update the import:
```ts
import { toUnitStatusHistories } from '@/lib/data/propertySummary';
```
(replacing `import { toStatusHistory } from '@/lib/data/propertySummary';`)

Update `ZERO_LINE_ITEMS`, `addLineItems`, `divideLineItems`, `scaleLineItems` — replace every `income: 0,` / `a.income + b.income,` / `a.income / n,` / `a.income * factor,` line with two lines (`incomeWE`/`incomeTE`), e.g. in `ZERO_LINE_ITEMS`:
```ts
const ZERO_LINE_ITEMS: CashflowLineItems = {
  incomeWE: 0,
  incomeTE: 0,
  mortgage: 0,
  ...
```
in `addLineItems`:
```ts
    incomeWE: a.incomeWE + b.incomeWE,
    incomeTE: a.incomeTE + b.incomeTE,
    mortgage: a.mortgage + b.mortgage,
```
in `divideLineItems`:
```ts
    incomeWE: a.incomeWE / n,
    incomeTE: a.incomeTE / n,
    mortgage: a.mortgage / n,
```
in `scaleLineItems`:
```ts
    incomeWE: a.incomeWE * factor,
    incomeTE: a.incomeTE * factor,
    mortgage: a.mortgage * factor,
```

Update `lineItemsForMonth` to accept and thread through the Stellplatz history — add a parameter and pass it to the actual-month call:
```ts
function lineItemsForMonth(
  property: PropertyRow,
  statusHistory: StatusEntry[],
  stellplatzStatusHistory: StatusEntry[],
  monthDate: Date,
  today: Date,
  extraordinaryCostsThisMonth: number,
  hoaFeeNonRecoverableMonthly: number,
  hoaFeeParkingNonRecoverableMonthly: number
): CashflowLineItems {
```
(the vollvermietung/no-history branch is unchanged — it doesn't take a history at all), and in the `cashflowLineItemsForActualMonth({...})` call at the end of that function, add `stellplatzStatusHistory,` right after `statusHistory,`.

Update `CashflowMonthColumn`, replace `statusLabels: PropertyStatus[];` with:
```ts
  statusLabelsWE: PropertyStatus[];
  statusLabelsTE: PropertyStatus[];
```

In `computeCashflowYearTable`, replace:
```ts
  const statusHistory = toStatusHistory(statusEntryRows);
```
with:
```ts
  const { wohnung: statusHistory, stellplatz: stellplatzStatusHistory } = toUnitStatusHistories(statusEntryRows);
```

In the `ownerFraction <= 0` early-return branch, replace `statusLabels: [],` with:
```ts
        statusLabelsWE: [],
        statusLabelsTE: [],
```

Replace the `lineItemsForMonth(...)` call with:
```ts
    const rawLineItems = lineItemsForMonth(
      property,
      statusHistory,
      stellplatzStatusHistory,
      monthDate,
      today,
      extraordinaryCostsThisMonth,
      hoaFeeNonRecoverableMonthly,
      hoaFeeParkingNonRecoverableMonthly
    );
```

Replace:
```ts
      statusLabels: statusHistory.length === 0 ? [] : statusesForMonth(monthDate, statusHistory, today),
```
with:
```ts
      statusLabelsWE: statusHistory.length === 0 ? [] : statusesForMonth(monthDate, statusHistory, today),
      statusLabelsTE: stellplatzStatusHistory.length === 0 ? [] : statusesForMonth(monthDate, stellplatzStatusHistory, today),
```

### Step 15: Update `propertyCashflow.test.ts`

In `web/tests/data/propertyCashflow.test.ts`:

Line 129, replace:
```ts
    expect(result.lineItems.income).toBeCloseTo(f.coldRentMonthly + f.parkingRentMonthly, 2);
```
with:
```ts
    expect(result.lineItems.incomeWE).toBeCloseTo(f.coldRentMonthly, 2);
    expect(result.lineItems.incomeTE).toBeCloseTo(f.parkingRentMonthly, 2);
```

Line 135, replace:
```ts
    expect(result.lineItems.income).toBe(0);
```
with:
```ts
    expect(result.lineItems.incomeWE).toBe(0);
    expect(result.lineItems.incomeTE).toBe(0);
```

Line 244, replace:
```ts
    expect(january.lineItems.income).toBe(0);
    expect(january.statusLabels).toEqual([]);
```
with:
```ts
    expect(january.lineItems.incomeWE).toBe(0);
    expect(january.lineItems.incomeTE).toBe(0);
    expect(january.statusLabelsWE).toEqual([]);
    expect(january.statusLabelsTE).toEqual([]);
```

Line 252–253, replace:
```ts
    expect(june.statusLabels).toEqual(['vermietet']);
    expect(june.lineItems.income).toBeCloseTo(f.coldRentMonthly + f.parkingRentMonthly, 2);
```
with:
```ts
    expect(june.statusLabelsWE).toEqual(['vermietet']);
    expect(june.statusLabelsTE).toEqual(['vermietet']);
    expect(june.lineItems.incomeWE).toBeCloseTo(f.coldRentMonthly, 2);
    expect(june.lineItems.incomeTE).toBeCloseTo(f.parkingRentMonthly, 2);
```

Line 261, replace:
```ts
    expect(june.statusLabels).toEqual(['vermietet', 'mietgarantie']);
```
with:
```ts
    expect(june.statusLabelsWE).toEqual(['vermietet', 'mietgarantie']);
    expect(june.statusLabelsTE).toEqual(['vermietet', 'mietgarantie']);
```

Line 299 and 301, replace:
```ts
    expect(june.statusLabels).toEqual([]);
    expect(june.isProjection).toBe(true);
    expect(june.lineItems.income).toBeCloseTo(f.coldRentMonthly + f.parkingRentMonthly, 2);
```
with:
```ts
    expect(june.statusLabelsWE).toEqual([]);
    expect(june.statusLabelsTE).toEqual([]);
    expect(june.isProjection).toBe(true);
    expect(june.lineItems.incomeWE).toBeCloseTo(f.coldRentMonthly, 2);
    expect(june.lineItems.incomeTE).toBeCloseTo(f.parkingRentMonthly, 2);
```

In `function makeStatusEntry`, add `unit: 'wohnung',` after `created_at: '2026-01-01T00:00:00Z',` (same edit as Step 12, this file's own copy of the helper).

Add a new test proving the split at the data layer — inside `describe('computeCashflowYearTable', ...)`, after the last `it(...)`:
```ts
  it('Wohnung and Stellplatz with independently-tagged status entries produce independent income', () => {
    const wohnungOnly = [makeStatusEntry({ id: 'we-1', unit: 'wohnung', status: 'vermietet' })];
    const withStellplatzLeerstand = [
      ...wohnungOnly,
      makeStatusEntry({ id: 'te-1', unit: 'stellplatz', status: 'leerstand' }),
    ];
    const parkingProperty = makeProperty({ parking_type: 'tiefgarage' });
    const result = computeCashflowYearTable(parkingProperty, withStellplatzLeerstand, [], 2026, today);
    const june = result.months.find((m) => m.month === 6)!;
    expect(june.lineItems.incomeWE).toBeCloseTo(f.coldRentMonthly, 2);
    expect(june.lineItems.incomeTE).toBe(0); // Stellplatz leerstand — its rent doesn't flow
    expect(june.statusLabelsWE).toEqual(['vermietet']);
    expect(june.statusLabelsTE).toEqual(['leerstand']);
  });
```

### Step 16: Verify propertyCashflow tests pass

Run: `cd web && npx vitest run tests/data/propertyCashflow.test.ts`
Expected: PASS (all tests).

### Step 17: Update `propertyOverview.ts`

Update the import:
```ts
import { toUnitStatusHistories } from '@/lib/data/propertySummary';
```

Replace:
```ts
  const statusHistory = toStatusHistory(statusEntryRows);
```
with:
```ts
  const { wohnung: statusHistory, stellplatz: stellplatzStatusHistory } = toUnitStatusHistories(statusEntryRows);
```

(`ownershipAndVacancyDaysSinceTransfer(statusHistory, ...)` stays as-is, now explicitly Wohnung-only — this is the "Tatsächliche Leerstandsquote" KPI, which per the design spec stays scoped to the Wohnung.)

In the `annualCashflowBeforeTax({...})` call, add `stellplatzStatusHistory,` right after `statusHistory,`.

### Step 18: Verify propertyOverview tests pass unchanged

Run: `cd web && npx vitest run tests/data/propertyOverview.test.ts`
Expected: PASS with only the `makeStatusEntry` fixture edit needed (same `unit: 'wohnung',` addition as Step 12, this file's own copy).

### Step 19: Update `propertyTax.ts` and its test fixture

In `web/lib/data/propertyTax.ts`, replace:
```ts
  const statusHistory = toStatusHistory(statusEntryRows);
```
with:
```ts
  const { wohnung: statusHistory, stellplatz: stellplatzStatusHistory } = toUnitStatusHistories(statusEntryRows);
```
(update the import the same way as Step 17). In the `annualTaxableIncomeBreakdown({...})` call, add `stellplatzStatusHistory,` right after `statusHistory,`.

In `web/tests/data/propertyTax.test.ts`, add `unit: 'wohnung',` to `function makeStatusEntry` (same edit as Step 12).

In `web/tests/kpiCalculationText.test.ts`, add `unit: 'wohnung',` to `function makeStatusEntry` (same edit — this file doesn't call any of the changed functions directly but its `StatusEntryRow` literal must satisfy the new required field).

### Step 20: Run the full suite and commit

Run: `cd web && npm test`
Expected: PASS — all test files green.

Run: `cd web && npx tsc --noEmit`
Expected: no errors from any file touched in this task. (Errors from `propertyCashflow.ts`'s remaining `PropertyStatus` import, `statusEntryActions.ts`, wizard files, and UI components touched in later tasks are expected here — Task 2 only covers the calculation core. If `tsc` reports errors in files this task did NOT touch, stop and investigate before continuing to Task 3.)

```bash
git add web/lib/calculations/statusPeriodCalculator.ts web/tests/calculations/statusPeriodCalculator.test.ts \
  web/lib/calculations/cashflowCalculator.ts web/tests/calculations/cashflowCalculator.test.ts \
  web/lib/calculations/taxCalculator.ts \
  web/lib/data/propertySummary.ts web/tests/data/propertySummary.test.ts \
  web/lib/data/propertyCashflow.ts web/tests/data/propertyCashflow.test.ts \
  web/lib/data/propertyOverview.ts web/tests/data/propertyOverview.test.ts \
  web/lib/data/propertyTax.ts web/tests/data/propertyTax.test.ts \
  web/tests/kpiCalculationText.test.ts
git commit -m "$(cat <<'EOF'
feat(calculations): split income by Wohnung/Stellplatz unit

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Unit-aware validation in `statusEntryActions.ts`

**Files:**
- Modify: `web/lib/data/statusEntryActions.ts`

- [ ] **Step 1: Scope `assertNoDuplicateDate` by unit**

Replace:
```ts
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
```
with:
```ts
async function assertNoDuplicateDate(
  supabase: SupabaseClient,
  propertyId: string,
  unit: PropertyUnit,
  date: string,
  excludeId?: string
): Promise<void> {
  let query = supabase.from('status_entries').select('id').eq('property_id', propertyId).eq('unit', unit).eq('date', date);
  if (excludeId) query = query.neq('id', excludeId);
  const { data, error } = await query;
  if (error) throw error;
  if (data && data.length > 0) throw new Error('Für dieses Datum existiert bereits ein Statuseintrag.');
}
```

- [ ] **Step 2: Scope `assertFixedAmountPeriodConsistency` by unit**

Replace:
```ts
async function assertFixedAmountPeriodConsistency(
  supabase: SupabaseClient,
  propertyId: string,
  date: string,
  isFixedAmount: boolean,
  periodEndDate: string | null,
  excludeId?: string
): Promise<void> {
  if (isFixedAmount && (!periodEndDate || periodEndDate < date)) {
    throw new Error('Das Enddatum des Fixbetrag-Zeitraums muss gesetzt sein und darf nicht vor dem Startdatum liegen.');
  }

  let query = supabase
    .from('status_entries')
    .select('id, date, income_is_fixed_amount, income_period_end_date')
    .eq('property_id', propertyId);
  if (excludeId) query = query.neq('id', excludeId);
```
with:
```ts
async function assertFixedAmountPeriodConsistency(
  supabase: SupabaseClient,
  propertyId: string,
  unit: PropertyUnit,
  date: string,
  isFixedAmount: boolean,
  periodEndDate: string | null,
  excludeId?: string
): Promise<void> {
  if (isFixedAmount && (!periodEndDate || periodEndDate < date)) {
    throw new Error('Das Enddatum des Fixbetrag-Zeitraums muss gesetzt sein und darf nicht vor dem Startdatum liegen.');
  }

  let query = supabase
    .from('status_entries')
    .select('id, date, income_is_fixed_amount, income_period_end_date')
    .eq('property_id', propertyId)
    .eq('unit', unit);
  if (excludeId) query = query.neq('id', excludeId);
```

- [ ] **Step 3: Add a `PropertyUnit` alias and thread `unit` through `createStatusEntry`/`updateStatusEntry`**

Replace:
```ts
import type { TablesInsert, TablesUpdate } from '@/lib/supabase/types';
```
with (adding `Database` and a local alias, matching the `type PropertyStatus = Database['public']['Enums']['property_status'];` pattern already used in `StatusEntryModal.tsx`):
```ts
import type { TablesInsert, TablesUpdate, Database } from '@/lib/supabase/types';

type PropertyUnit = Database['public']['Enums']['property_unit'];
```

Replace `createStatusEntry`:
```ts
export async function createStatusEntry(
  propertyId: string,
  input: Omit<TablesInsert<'status_entries'>, 'property_id'>
): Promise<void> {
  const supabase = await createClient();
  const date = input.date;
  if (!date) throw new Error('Datum ist erforderlich.');
  const unit: PropertyUnit = input.unit ?? 'wohnung';

  await assertNoDuplicateDate(supabase, propertyId, unit, date);
  await assertNotBeforeTransfer(supabase, propertyId, date);
  await assertFixedAmountPeriodConsistency(
    supabase,
    propertyId,
    unit,
    date,
    input.income_is_fixed_amount ?? false,
    input.income_period_end_date ?? null
  );

  const { error } = await supabase.from('status_entries').insert({ ...input, property_id: propertyId });
  if (error) throw error;
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath(`/properties/${propertyId}/verlauf`);
}
```

Replace `updateStatusEntry` — it needs the entry's (immutable) `unit` passed in explicitly, since the patch itself never changes it:
```ts
export async function updateStatusEntry(
  id: string,
  propertyId: string,
  unit: PropertyUnit,
  patch: Omit<TablesUpdate<'status_entries'>, 'property_id' | 'id' | 'unit'>
): Promise<void> {
  const supabase = await createClient();

  if (patch.date) {
    await assertNoDuplicateDate(supabase, propertyId, unit, patch.date, id);
    await assertNotBeforeTransfer(supabase, propertyId, patch.date);
    await assertFixedAmountPeriodConsistency(
      supabase,
      propertyId,
      unit,
      patch.date,
      patch.income_is_fixed_amount ?? false,
      patch.income_period_end_date ?? null,
      id
    );
  }

  const { error } = await supabase.from('status_entries').update(patch).eq('id', id);
  if (error) throw error;
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath(`/properties/${propertyId}/verlauf`);
}
```

- [ ] **Step 4: Verify the file typechecks in isolation**

Run: `cd web && npx tsc --noEmit`
Expected: no errors originating from `statusEntryActions.ts`. (`StatusEntryModal.tsx` will now show a call-site error for `updateStatusEntry` — expected, fixed in Task 4.)

- [ ] **Step 5: Commit**

```bash
git add web/lib/data/statusEntryActions.ts
git commit -m "$(cat <<'EOF'
feat(verlauf): scope status entry validation by unit

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Verlauf tab — Wohnung/Stellplatz segmented control

**Files:**
- Modify: `web/components/property/verlauf/StatusEntryModal.tsx`
- Modify: `web/components/property/verlauf/VerlaufFeed.tsx`
- Modify: `web/app/(app)/properties/[id]/verlauf/page.tsx`

- [ ] **Step 1: Add a `unit` prop to `StatusEntryModal`**

Add the import and prop:
```ts
type PropertyUnit = Database['public']['Enums']['property_unit'];
```
(next to the existing `type PropertyStatus = Database['public']['Enums']['property_status'];`)

Change the component signature:
```ts
export function StatusEntryModal({
  open,
  onClose,
  propertyId,
  unit,
  entry,
}: {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  unit: PropertyUnit;
  entry: StatusEntryRow | null;
}) {
```

Replace `onSubmit`:
```ts
  function onSubmit(values: FormValues) {
    setSubmitError(null);
    startTransition(async () => {
      try {
        const isMietgarantie = values.status === 'mietgarantie';
        const isFixed = isMietgarantie && values.amountKind === 'fixed';
        const payload = {
          date: values.date,
          status: values.status,
          income_actual_monthly: isMietgarantie ? values.incomeActualMonthly : null,
          income_is_fixed_amount: isFixed,
          income_period_end_date: isFixed ? values.periodEndDate : null,
          notes: values.notes,
        };
        if (entry) {
          await updateStatusEntry(entry.id, propertyId, unit, payload);
        } else {
          await createStatusEntry(propertyId, { ...payload, unit });
        }
        onClose();
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
      }
    });
  }
```

- [ ] **Step 2: Add a Wohnung/Stellplatz segmented control and unit-filtered lists to `VerlaufFeed`**

Change the component signature to accept `hasParking`:
```ts
export function VerlaufFeed({
  propertyId,
  hasParking,
  statusEntries,
  extraordinaryCosts,
}: {
  propertyId: string;
  hasParking: boolean;
  statusEntries: StatusEntryRow[];
  extraordinaryCosts: ExtraordinaryCostRow[];
}) {
```

Add active-unit state right after the existing `useState` declarations:
```ts
  const [activeUnit, setActiveUnit] = useState<StatusEntryRow['unit']>('wohnung');
```

Replace the `ascendingStatus`/`endDateFor`/`items` block — filter status entries to the active unit before merging with costs (costs stay unfiltered, per the design spec):
```ts
  const unitStatusEntries = hasParking ? statusEntries.filter((e) => e.unit === activeUnit) : statusEntries;

  const ascendingStatus = [...unitStatusEntries].sort((a, b) => a.date.localeCompare(b.date));
  function endDateFor(row: StatusEntryRow): string | null {
    const idx = ascendingStatus.findIndex((e) => e.id === row.id);
    return idx >= 0 && idx + 1 < ascendingStatus.length ? ascendingStatus[idx + 1].date : null;
  }

  const items: FeedItem[] = sortFeed([
    ...unitStatusEntries.map((row): FeedItem => ({ kind: 'status', date: row.date, row })),
    ...extraordinaryCosts.map((row): FeedItem => ({ kind: 'cost', date: row.cost_month, row })),
  ]);
```

Add the segmented control right before the existing `<div className="mb-3 flex justify-end gap-2">` toolbar, and update the "+ Status" button and the empty-state button/text to use `activeUnit`:
```tsx
      {hasParking && (
        <div className="mb-3 inline-flex rounded-md bg-black/[0.04] p-0.5">
          <button
            type="button"
            onClick={() => setActiveUnit('wohnung')}
            className={`rounded px-3 py-1 text-sm font-semibold ${
              activeUnit === 'wohnung' ? 'bg-white shadow-sm text-text-primary' : 'text-text-secondary'
            }`}
          >
            Wohnung
          </button>
          <button
            type="button"
            onClick={() => setActiveUnit('stellplatz')}
            className={`rounded px-3 py-1 text-sm font-semibold ${
              activeUnit === 'stellplatz' ? 'bg-white shadow-sm text-text-primary' : 'text-text-secondary'
            }`}
          >
            Stellplatz
          </button>
        </div>
      )}
```

Update the "+ Status" button label and the empty-state copy to be unit-aware:
```tsx
          <Plus size={14} /> Status
```
stays as-is (the active tab already makes clear which unit it targets); but the empty-state text should be scoped, replace:
```tsx
          <p className="text-sm text-text-secondary">Noch kein Statusverlauf.</p>
```
with:
```tsx
          <p className="text-sm text-text-secondary">
            {hasParking ? `Noch kein Statusverlauf für ${activeUnit === 'wohnung' ? 'Wohnung' : 'Stellplatz'}.` : 'Noch kein Statusverlauf.'}
          </p>
```

Update the modal usage at the bottom of the component:
```tsx
      <StatusEntryModal
        open={statusModal.open}
        onClose={() => setStatusModal({ open: false, entry: null })}
        propertyId={propertyId}
        unit={activeUnit}
        entry={statusModal.entry}
      />
```

Also update the delete-status handler's DB access is unaffected (deletion doesn't need `unit`, `deleteStatusEntry` is unchanged).

- [ ] **Step 3: Pass `hasParking` down from the page**

In `web/app/(app)/properties/[id]/verlauf/page.tsx`, replace:
```tsx
  return (
    <VerlaufFeed propertyId={id} statusEntries={detail.statusEntries} extraordinaryCosts={detail.extraordinaryCosts} />
  );
```
with:
```tsx
  return (
    <VerlaufFeed
      propertyId={id}
      hasParking={detail.property.parking_type !== 'nicht_vorhanden'}
      statusEntries={detail.statusEntries}
      extraordinaryCosts={detail.extraordinaryCosts}
    />
  );
```

- [ ] **Step 4: Manual verification**

Run: `cd web && npx tsc --noEmit`
Expected: no errors in `StatusEntryModal.tsx`, `VerlaufFeed.tsx`, or `verlauf/page.tsx`.

Since this is a UI change, verify it visually per the project's usual workflow (start the dev server, open a property with `parking_type != 'nicht_vorhanden'`, confirm the Wohnung/Stellplatz toggle appears in the Verlauf tab, switching tabs shows separate histories, and adding a status entry while on the "Stellplatz" tab creates a row with `unit = 'stellplatz'`).

- [ ] **Step 5: Commit**

```bash
git add web/components/property/verlauf/StatusEntryModal.tsx web/components/property/verlauf/VerlaufFeed.tsx \
  "web/app/(app)/properties/[id]/verlauf/page.tsx"
git commit -m "$(cat <<'EOF'
feat(verlauf): add Wohnung/Stellplatz toggle for independent status history

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Cashflow-Jahrestabelle — split Einnahmen rows with per-row badges

**Files:**
- Modify: `web/components/property/cashflow/CashflowYearTable.tsx`
- Modify: `web/components/property/cashflow/ForecastMonthCard.tsx`

- [ ] **Step 1: Update `ForecastMonthCard.tsx`**

Replace:
```tsx
      <Row label="Einnahmen" value={lineItems.income} />
```
with:
```tsx
      <Row label="Einnahmen" value={lineItems.incomeWE + lineItems.incomeTE} />
```

(Card 1 stays a single combined "Einnahmen" row — it's a settings-only scenario blend with no per-unit status history, per the design spec.)

- [ ] **Step 2: Restructure `CashflowYearTable.tsx` — remove "Einnahmen" from the top group**

Add the `PropertyStatus` type import:
```ts
import type { PropertyStatus } from '@/lib/calculations/statusPeriodCalculator';
```

Replace:
```ts
  const top: RowDef[] = [
    { label: 'Einnahmen', select: (i) => i.income, sign: 1 },
    { label: 'Kreditrate', select: (i) => i.mortgage, sign: -1 },
  ];
```
with:
```ts
  const top: RowDef[] = [{ label: 'Kreditrate', select: (i) => i.mortgage, sign: -1 }];
```

- [ ] **Step 3: Add an `IncomeRow` component with per-month, per-unit badges**

Add after the `DataRow` function:
```tsx
function IncomeRow({
  months,
  avgColumn,
  totalColumn,
  select,
  statusLabelsFor,
}: {
  months: CashflowMonthColumn[];
  avgColumn: CashflowLineItems | null;
  totalColumn: CashflowLineItems | null;
  select: (items: CashflowLineItems) => number;
  statusLabelsFor: (col: CashflowMonthColumn) => PropertyStatus[];
}) {
  return (
    <tr className="border-t border-black/[0.04]">
      <td className="whitespace-nowrap py-1.5 text-text-secondary">Einnahmen</td>
      {months.map((col) => {
        const value = select(col.lineItems);
        const labels = statusLabelsFor(col);
        return (
          <td key={col.month} className={`px-1.5 text-right font-mono ${col.isOwned ? amountColorClass(value) : 'text-text-dim'}`}>
            <div>{col.isOwned ? formatCurrency(value) : '–'}</div>
            {labels.length > 0 && (
              <div className="mt-0.5 flex flex-wrap justify-end gap-1">
                {labels.map((status) => (
                  <StatusBadge key={status} status={status} />
                ))}
              </div>
            )}
          </td>
        );
      })}
      <td className={`bg-blue-50/50 px-1.5 text-right font-mono ${avgColumn ? amountColorClass(select(avgColumn)) : 'text-text-dim'}`}>
        {avgColumn ? formatCurrency(select(avgColumn)) : '–'}
      </td>
      <td className={`bg-blue-50/50 px-1.5 text-right font-mono ${totalColumn ? amountColorClass(select(totalColumn)) : 'text-text-dim'}`}>
        {totalColumn ? formatCurrency(select(totalColumn)) : '–'}
      </td>
    </tr>
  );
}
```

- [ ] **Step 4: Rename the category dividers and insert the income rows**

Replace:
```tsx
          {top.map((row) => (
            <DataRow key={`top-${row.label}`} row={row} months={result.months} avgColumn={result.avgColumn} totalColumn={result.totalColumn} />
          ))}

          <CategoryDivider label="Kosten Wohnung" columnCount={columnCount} />
          {wohnung.map((row) => (
            <DataRow key={`we-${row.label}`} row={row} months={result.months} avgColumn={result.avgColumn} totalColumn={result.totalColumn} />
          ))}

          {hasParking && (
            <>
              <CategoryDivider label="Kosten Stellplatz" columnCount={columnCount} />
              {stellplatz.map((row) => (
                <DataRow
                  key={`te-${row.label}`}
                  row={row}
                  months={result.months}
                  avgColumn={result.avgColumn}
                  totalColumn={result.totalColumn}
                />
              ))}
            </>
          )}
```
with:
```tsx
          {top.map((row) => (
            <DataRow key={`top-${row.label}`} row={row} months={result.months} avgColumn={result.avgColumn} totalColumn={result.totalColumn} />
          ))}

          <CategoryDivider label="Wohnung" columnCount={columnCount} />
          <IncomeRow
            months={result.months}
            avgColumn={result.avgColumn}
            totalColumn={result.totalColumn}
            select={(i) => i.incomeWE}
            statusLabelsFor={(col) => col.statusLabelsWE}
          />
          {wohnung.map((row) => (
            <DataRow key={`we-${row.label}`} row={row} months={result.months} avgColumn={result.avgColumn} totalColumn={result.totalColumn} />
          ))}

          {hasParking && (
            <>
              <CategoryDivider label="Stellplatz" columnCount={columnCount} />
              <IncomeRow
                months={result.months}
                avgColumn={result.avgColumn}
                totalColumn={result.totalColumn}
                select={(i) => i.incomeTE}
                statusLabelsFor={(col) => col.statusLabelsTE}
              />
              {stellplatz.map((row) => (
                <DataRow
                  key={`te-${row.label}`}
                  row={row}
                  months={result.months}
                  avgColumn={result.avgColumn}
                  totalColumn={result.totalColumn}
                />
              ))}
            </>
          )}
```

- [ ] **Step 5: Remove the old header-level combined status badges**

Replace:
```tsx
            {result.months.map((col) => (
              <th key={col.month} scope="col" className="w-28 px-1.5 text-right font-normal">
                <div className={col.isProjection ? 'italic text-text-dim' : 'text-text-primary'}>{MONTH_LABELS[col.month - 1]}</div>
                {col.statusLabels.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap justify-end gap-1">
                    {col.statusLabels.map((status) => (
                      <StatusBadge key={status} status={status} />
                    ))}
                  </div>
                )}
              </th>
            ))}
```
with:
```tsx
            {result.months.map((col) => (
              <th key={col.month} scope="col" className="w-28 px-1.5 text-right font-normal">
                <div className={col.isProjection ? 'italic text-text-dim' : 'text-text-primary'}>{MONTH_LABELS[col.month - 1]}</div>
              </th>
            ))}
```

- [ ] **Step 6: Verify**

Run: `cd web && npx tsc --noEmit`
Expected: no errors in `CashflowYearTable.tsx` or `ForecastMonthCard.tsx`.

Manually verify in the dev server: open a property's Cashflow tab. Without a Stellplatz, the table should look like before (single "Einnahmen" row under "Wohnung", badge inline with the value instead of in the header). With a Stellplatz whose status diverges from the Wohnung's, the "Stellplatz" group's "Einnahmen" row should show its own badge and its own (possibly zero) income, independent of the "Wohnung" row above it.

- [ ] **Step 7: Commit**

```bash
git add web/components/property/cashflow/CashflowYearTable.tsx web/components/property/cashflow/ForecastMonthCard.tsx
git commit -m "$(cat <<'EOF'
feat(cashflow): split Einnahmen row and status badges by Wohnung/Stellplatz

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Wizard onboarding creates both units' first status entry

**Files:**
- Modify: `web/lib/wizard/wizardLogic.ts`
- Modify: `web/tests/wizard/wizardLogic.test.ts`
- Modify: `web/components/wizard/PropertyWizard.tsx`
- Modify: `web/lib/data/propertyActions.ts`

- [ ] **Step 1: Rewrite the `mapToStatusEntryInsert` tests as `mapToStatusEntryInserts` (red)**

In `web/tests/wizard/wizardLogic.test.ts`, replace the import:
```ts
  mapToStatusEntryInserts,
```
(instead of `mapToStatusEntryInsert,`)

Replace the whole `describe('mapToStatusEntryInsert', ...)` block (lines 154–180) with:
```ts
describe('mapToStatusEntryInserts', () => {
  it('returns an empty array when the transfer date is in the future (no onboarding step)', () => {
    expect(mapToStatusEntryInserts(makeValues({ economicTransferDate: '2026-08-01' }), today)).toEqual([]);
  });

  it('maps a single Wohnung entry when the transfer date is in the past and there is no Stellplatz', () => {
    const values = makeValues({
      economicTransferDate: '2026-06-01',
      firstStatusDate: '2026-06-01',
      firstStatus: 'vermietet',
      parkingType: 'nicht_vorhanden',
    });
    expect(mapToStatusEntryInserts(values, today)).toEqual([
      { date: '2026-06-01', status: 'vermietet', income_actual_monthly: null, notes: '', unit: 'wohnung' },
    ]);
  });

  it('maps a matching Stellplatz entry in addition to the Wohnung entry when a Stellplatz exists', () => {
    const values = makeValues({
      economicTransferDate: '2026-06-01',
      firstStatusDate: '2026-06-01',
      firstStatus: 'vermietet',
      parkingType: 'tiefgarage',
    });
    const inserts = mapToStatusEntryInserts(values, today);
    expect(inserts).toHaveLength(2);
    expect(inserts[0]).toMatchObject({ unit: 'wohnung', status: 'vermietet', date: '2026-06-01' });
    expect(inserts[1]).toMatchObject({ unit: 'stellplatz', status: 'vermietet', date: '2026-06-01' });
  });

  it('includes income_actual_monthly only when status is mietgarantie', () => {
    const mietgarantie = makeValues({ economicTransferDate: '2026-06-01', firstStatus: 'mietgarantie', firstStatusIncome: 500 });
    expect(mapToStatusEntryInserts(mietgarantie, today)[0].income_actual_monthly).toBe(500);

    const vermietet = makeValues({ economicTransferDate: '2026-06-01', firstStatus: 'vermietet', firstStatusIncome: 500 });
    expect(mapToStatusEntryInserts(vermietet, today)[0].income_actual_monthly).toBeNull();
  });
});
```

- [ ] **Step 2: Verify it fails**

Run: `cd web && npx vitest run tests/wizard/wizardLogic.test.ts`
Expected: FAIL — `mapToStatusEntryInserts` is not exported yet.

- [ ] **Step 3: Implement `mapToStatusEntryInserts` in `wizardLogic.ts`**

Replace:
```ts
/** Returns null when the conditional Status-Onboarding step doesn't apply — no status_entries row is created. */
export function mapToStatusEntryInsert(
  values: WizardFormValues,
  today: Date
): Omit<TablesInsert<'status_entries'>, 'property_id'> | null {
  if (!requiresStatusOnboarding(values, today)) return null;

  return {
    date: values.firstStatusDate,
    status: values.firstStatus,
    income_actual_monthly: values.firstStatus === 'mietgarantie' ? nOrNull(values.firstStatusIncome) : null,
    notes: values.firstStatusNotes,
  };
}
```
with:
```ts
/**
 * Returns an empty array when the conditional Status-Onboarding step doesn't apply — no
 * status_entries rows are created. Returns one row (Wohnung) or two (Wohnung + an identical
 * Stellplatz row) depending on parkingType — mirrors the migration's own backfill semantics
 * so a brand-new property with a Stellplatz starts with matching histories, exactly like an
 * existing property does after the 2026-09-15 migration.
 */
export function mapToStatusEntryInserts(
  values: WizardFormValues,
  today: Date
): Array<Omit<TablesInsert<'status_entries'>, 'property_id'>> {
  if (!requiresStatusOnboarding(values, today)) return [];

  const wohnungEntry: Omit<TablesInsert<'status_entries'>, 'property_id'> = {
    date: values.firstStatusDate,
    status: values.firstStatus,
    income_actual_monthly: values.firstStatus === 'mietgarantie' ? nOrNull(values.firstStatusIncome) : null,
    notes: values.firstStatusNotes,
    unit: 'wohnung',
  };

  if (values.parkingType === 'nicht_vorhanden') return [wohnungEntry];
  return [wohnungEntry, { ...wohnungEntry, unit: 'stellplatz' }];
}
```

- [ ] **Step 4: Verify wizardLogic tests pass**

Run: `cd web && npx vitest run tests/wizard/wizardLogic.test.ts`
Expected: PASS.

- [ ] **Step 5: Update `PropertyWizard.tsx` and `propertyActions.ts` to insert the array**

In `web/components/wizard/PropertyWizard.tsx`, replace the import:
```ts
  mapToStatusEntryInserts,
```
and replace:
```ts
    const statusEntryInsert = mapToStatusEntryInsert(values, today);
    startTransition(async () => {
      try {
        await createProperty(propertyInsert, statusEntryInsert);
```
with:
```ts
    const statusEntryInserts = mapToStatusEntryInserts(values, today);
    startTransition(async () => {
      try {
        await createProperty(propertyInsert, statusEntryInserts);
```

In `web/lib/data/propertyActions.ts`, replace:
```ts
export async function createProperty(
  propertyInsert: Omit<TablesInsert<'properties'>, 'user_id'>,
  statusEntryInsert: Omit<TablesInsert<'status_entries'>, 'property_id'> | null
): Promise<string> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Nicht angemeldet.');

  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .insert({ ...propertyInsert, user_id: user.id })
    .select('id')
    .single();

  if (propertyError) throw propertyError;

  if (statusEntryInsert) {
    const { error: statusError } = await supabase
      .from('status_entries')
      .insert({ ...statusEntryInsert, property_id: property.id });
    if (statusError) throw statusError;
  }
```
with:
```ts
export async function createProperty(
  propertyInsert: Omit<TablesInsert<'properties'>, 'user_id'>,
  statusEntryInserts: Array<Omit<TablesInsert<'status_entries'>, 'property_id'>>
): Promise<string> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Nicht angemeldet.');

  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .insert({ ...propertyInsert, user_id: user.id })
    .select('id')
    .single();

  if (propertyError) throw propertyError;

  if (statusEntryInserts.length > 0) {
    const { error: statusError } = await supabase
      .from('status_entries')
      .insert(statusEntryInserts.map((entry) => ({ ...entry, property_id: property.id })));
    if (statusError) throw statusError;
  }
```

- [ ] **Step 6: Verify**

Run: `cd web && npx tsc --noEmit`
Expected: no errors in `wizardLogic.ts`, `PropertyWizard.tsx`, or `propertyActions.ts`.

- [ ] **Step 7: Commit**

```bash
git add web/lib/wizard/wizardLogic.ts web/tests/wizard/wizardLogic.test.ts \
  web/components/wizard/PropertyWizard.tsx web/lib/data/propertyActions.ts
git commit -m "$(cat <<'EOF'
feat(wizard): seed matching Stellplatz status entry on property creation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Dev seed data demonstrates the split

**Files:**
- Modify: `web/scripts/seed.ts`

- [ ] **Step 1: Give the seeded property a Stellplatz and a divergent status history**

Replace:
```ts
      purchase_price_unit: 263_600,
      purchase_price_parking: 15_000,
      land_transfer_tax: 15_323,
      notary_costs: 3_631.96,
      land_registry_costs: 1_180,
      cold_rent_monthly: 950,
      parking_rent_monthly: 48,
```
with:
```ts
      purchase_price_unit: 263_600,
      purchase_price_parking: 15_000,
      parking_type: 'tiefgarage',
      land_transfer_tax: 15_323,
      notary_costs: 3_631.96,
      land_registry_costs: 1_180,
      cold_rent_monthly: 950,
      parking_rent_monthly: 48,
```

Replace:
```ts
  const { error: statusError } = await admin.from('status_entries').insert({
    property_id: property.id,
    date: '2026-02-01',
    status: 'vermietet',
  });

  if (statusError) throw statusError;
```
with:
```ts
  const { error: statusError } = await admin.from('status_entries').insert([
    { property_id: property.id, date: '2026-02-01', status: 'vermietet', unit: 'wohnung' },
    { property_id: property.id, date: '2026-02-01', status: 'leerstand', unit: 'stellplatz' },
  ]);

  if (statusError) throw statusError;
```

- [ ] **Step 2: Commit**

```bash
git add web/scripts/seed.ts
git commit -m "$(cat <<'EOF'
chore(seed): demo property gets a Stellplatz with an independent (vacant) status

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

(This file requires `SUPABASE_SERVICE_ROLE_KEY`/`SEED_USER_EMAIL` in `web/.env.local` to actually run — `npm run seed` — which is a local, developer-specific step, not something to run as part of this plan's automated verification.)

---

## Task 8: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `cd web && npm test`
Expected: PASS — every test file green.

- [ ] **Step 2: Full typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `cd web && npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual smoke test**

Start the dev server and, for a property with `parking_type != 'nicht_vorhanden'`:
- Verlauf tab: confirm the Wohnung/Stellplatz toggle appears, each tab shows its own history, extraordinary costs still appear in both.
- Add a Stellplatz status entry with a status different from the Wohnung's current status.
- Cashflow tab: confirm the Jahrestabelle shows two "Einnahmen" rows (one under "Wohnung", one under "Stellplatz") with independent badges and independent amounts reflecting the divergent statuses.
- Übersicht tab: confirm "Tatsächliche Leerstandsquote" is unaffected by the Stellplatz's status (Wohnung-only, per the design spec).
- For a property with `parking_type == 'nicht_vorhanden'`: confirm the Verlauf tab shows no toggle and the Cashflow tab looks the same as before this feature (single "Einnahmen" row under "Wohnung", badge inline instead of in the header).

- [ ] **Step 5: Report completion**

Once all of the above pass, this feature is complete on this branch. Follow `superpowers:finishing-a-development-branch` to decide how to integrate it (merge, PR, or further cleanup) — note this branch is based on `fix/mietgarantie-fixbetrag`, not `main`, so integration should account for that dependency (e.g. `fix/mietgarantie-fixbetrag` merging first, or this branch being rebased onto `main` once it does).
