# Volta Web — Plan 9: Fix `incomeForMonth` Ignoring `other_income_monthly` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix a known, tracked bug (called out in [PR #14](https://github.com/maik18949/volta/pull/14)'s description): `incomeForMonth` (`web/lib/calculations/statusPeriodCalculator.ts:80`) computes monthly income from `coldRentMonthly + parkingRentMonthly` only, silently dropping `other_income_monthly`. `cashflowLineItemsForScenario` (the Cashflow tab's Jahresübersicht/Card 2, `cashflowCalculator.ts:224`) already includes `otherIncomeMonthly` — so for any property with "sonstige Einnahmen" set, the Cashflow tab's Prognose-Monat (Card 1) and Jahresübersicht (Card 2) currently disagree, and the Übersicht tab's cashflow KPI and the Steuer tab's taxable-income calculation (both of which call `incomeForMonth` transitively) both under-report income by the same amount.

**Architecture:** Add `otherIncomeMonthly` as a required 6th parameter to `incomeForMonth`, added only to the `'vermietet'` segment (mirrors `cashflowLineItemsForScenario`'s treatment of it as tied to occupancy, zeroed during `'leerstand'`) — `'mietgarantie'` segments are unaffected since their `incomeActualMonthly` already represents the full guaranteed income including everything. Update the 3 call sites that compose `incomeForMonth` (`propertySummary.ts`, `cashflowCalculator.ts`'s `cashflowLineItemsForActualMonth`, `taxCalculator.ts`'s `annualTaxableIncomeBreakdown`) to pass `other_income_monthly` through. No new files — every change is inside existing pure-calculation and data-composition modules.

**Tech Stack:** TypeScript, Vitest.

**Depends on:** Plan 1 (`statusPeriodCalculator.ts`, `cashflowCalculator.ts`, `taxCalculator.ts`, `propertySummary.ts` — all already exist and are being modified in place).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `web/lib/calculations/statusPeriodCalculator.ts` | Modify | `incomeForMonth` gains `otherIncomeMonthly` param |
| `web/lib/calculations/cashflowCalculator.ts` | Modify | `cashflowLineItemsForActualMonth` passes `otherIncomeMonthly` through |
| `web/lib/calculations/taxCalculator.ts` | Modify | `annualTaxableIncomeBreakdown` passes `otherIncomeMonthly` through |
| `web/lib/data/propertySummary.ts` | Modify | Passes `property.other_income_monthly` through |
| `web/tests/calculations/statusPeriodCalculator.test.ts` | Modify | Update existing calls + add new coverage |
| `web/tests/calculations/cashflowCalculator.test.ts` | Modify | Update any call sites exercising the changed input shape |
| `web/tests/calculations/taxCalculator.test.ts` | Modify | Update any call sites exercising the changed input shape |
| `web/tests/data/propertySummary.test.ts` | Modify | Update fixture/assertions if `other_income_monthly` is exercised |

---

### Task 1: `incomeForMonth` — add `otherIncomeMonthly`

**Files:**
- Modify: `web/lib/calculations/statusPeriodCalculator.ts`
- Test: `web/tests/calculations/statusPeriodCalculator.test.ts`

- [ ] **Step 1: Write the failing test**

Add these two tests into the existing `describe('statusPeriodCalculator', ...)` block in `web/tests/calculations/statusPeriodCalculator.test.ts`, right after the existing `'incomeForMonth: fully vermietet'` test:

```typescript
it('incomeForMonth: includes otherIncomeMonthly while vermietet', () => {
  const history = [entry('vermietet', 2026, 2)];
  const result = incomeForMonth(makeDate(2026, 6, 1), history, today, 950, 48, 75);
  expect(result).toBeCloseTo(998.0 + 75, 2);
});

it('incomeForMonth: otherIncomeMonthly is zero during leerstand', () => {
  const history = [entry('leerstand', 2026, 2)];
  const result = incomeForMonth(makeDate(2026, 6, 1), history, today, 950, 48, 75);
  expect(result).toBeCloseTo(0, 2);
});
```

Then update every existing call to `incomeForMonth` in this same file to pass a 6th argument of `0` (preserves their current behavior — none of them are testing `otherIncomeMonthly`):

```typescript
// Existing calls to update (5 total, all currently `incomeForMonth(..., 950, 48)`):
// 'incomeForMonth: fully vermietet' -> incomeForMonth(makeDate(2026, 6, 1), history, today, 950, 48, 0)
// 'incomeForMonth: fully leerstand is zero' -> incomeForMonth(makeDate(2026, 6, 1), history, today, 950, 48, 0)
// 'incomeForMonth: mietgarantie uses the entry income, not settings' -> incomeForMonth(makeDate(2026, 6, 1), history, today, 950, 48, 0)
// 'incomeForMonth: mid-month transition leerstand -> vermietet (30-day month)' -> incomeForMonth(makeDate(2026, 6, 1), history, today, 950, 48, 0)
// 'incomeForMonth: future month projects the last known status' -> incomeForMonth(makeDate(2026, 12, 1), history, makeDate(2026, 6, 1), 950, 48, 0)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/calculations/statusPeriodCalculator.test.ts`
Expected: FAIL — TypeScript error, `incomeForMonth` expects 5 arguments (or the two new tests fail on the assertion once TS is satisfied, depending on how the type error surfaces in vitest's transform step). Either way, this must fail before Step 3.

- [ ] **Step 3: Implement**

In `web/lib/calculations/statusPeriodCalculator.ts`, replace the `incomeForMonth` function:

```typescript
/** Monthly income from all status segments (day-accurate). otherIncomeMonthly counts only while vermietet — matches cashflowLineItemsForScenario's treatment of it as occupancy-tied. */
export function incomeForMonth(
  month: Date,
  statusHistory: StatusEntry[],
  today: Date,
  coldRentMonthly: number,
  parkingRentMonthly: number,
  otherIncomeMonthly: number
): number {
  return segments(month, statusHistory, today).reduce((sum, seg) => {
    if (seg.status === 'vermietet') return sum + (coldRentMonthly + parkingRentMonthly + otherIncomeMonthly) * seg.dayFraction;
    if (seg.status === 'mietgarantie') return sum + seg.incomeActualMonthly * seg.dayFraction;
    return sum; // leerstand
  }, 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/calculations/statusPeriodCalculator.test.ts`
Expected: PASS, all cases including the 2 new ones.

- [ ] **Step 5: Commit**

```bash
git add web/lib/calculations/statusPeriodCalculator.ts web/tests/calculations/statusPeriodCalculator.test.ts
git commit -m "fix(calculations): include other_income_monthly in incomeForMonth"
```

---

### Task 2: Update the 3 call sites

**Files:**
- Modify: `web/lib/calculations/cashflowCalculator.ts`
- Modify: `web/lib/calculations/taxCalculator.ts`
- Modify: `web/lib/data/propertySummary.ts`
- Test: `web/tests/calculations/cashflowCalculator.test.ts`
- Test: `web/tests/calculations/taxCalculator.test.ts`
- Test: `web/tests/data/propertySummary.test.ts`

- [ ] **Step 1: Write the failing tests**

First, read the current signatures of `CashflowActualMonthInput` (`cashflowCalculator.ts`, around line 248) and `AnnualTaxableIncomeInput`/`AnnualTaxableIncomeBreakdownInput` (`taxCalculator.ts`, around line 7) to confirm their exact current field lists before editing — both already have `coldRentMonthly`/`parkingRentMonthly` fields that `otherIncomeMonthly` joins.

In `web/tests/calculations/cashflowCalculator.test.ts`, find the existing test(s) that build a `CashflowActualMonthInput` and call `cashflowLineItemsForActualMonth`. Add one new test right after them:

```typescript
it('cashflowLineItemsForActualMonth: includes otherIncomeMonthly for a fully vermietet month', () => {
  const input = {
    // ...reuse the same base fields as the existing "fully vermietet" test in this file...
    otherIncomeMonthly: 75,
  };
  const before = cashflowLineItemsForActualMonth({ ...input, otherIncomeMonthly: 0 });
  const after = cashflowLineItemsForActualMonth(input);
  expect(after.income).toBeCloseTo(before.income + 75, 2);
});
```

In `web/tests/calculations/taxCalculator.test.ts`, find the existing test(s) that build an `AnnualTaxableIncomeBreakdownInput` (or `AnnualTaxableIncomeInput`) and call `annualTaxableIncomeBreakdown`/`annualTaxableIncome`. Add one new test right after them:

```typescript
it('annualTaxableIncomeBreakdown: includes otherIncomeMonthly for fully vermietet months', () => {
  const input = {
    // ...reuse the same base fields as an existing fully-vermietet-year test in this file...
    otherIncomeMonthly: 75,
  };
  const before = annualTaxableIncomeBreakdown({ ...input, otherIncomeMonthly: 0 });
  const after = annualTaxableIncomeBreakdown(input);
  expect(after.income).toBeCloseTo(before.income + 75 * 12, 2);
});
```

In `web/tests/data/propertySummary.test.ts`, find the existing property fixture (`makeProperty` or equivalent) used by `computePropertySummary`'s tests. Add one new test:

```typescript
it('incomeActualMonthly includes other_income_monthly while vermietet', () => {
  const property = makeProperty({ other_income_monthly: 75 });
  const withOther = computePropertySummary(property, [{ /* a vermietet status entry — reuse this file's existing fixture pattern */ }], today);
  const withoutOther = computePropertySummary(makeProperty({ other_income_monthly: 0 }), [/* same entry */], today);
  expect(withOther.incomeActualMonthly).toBeCloseTo(withoutOther.incomeActualMonthly + 75, 2);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run tests/calculations/cashflowCalculator.test.ts tests/calculations/taxCalculator.test.ts tests/data/propertySummary.test.ts`
Expected: FAIL — the input objects don't yet have an `otherIncomeMonthly` field accepted by the underlying `incomeForMonth` call (TypeScript won't error since these interfaces don't forward it yet, but the assertions will fail because the new field has no effect until Step 3).

- [ ] **Step 3: Implement**

In `web/lib/calculations/cashflowCalculator.ts`, add `otherIncomeMonthly: number` to `CashflowActualMonthInput` and pass it through in `cashflowLineItemsForActualMonth` (around line 277):

```typescript
// CashflowActualMonthInput gains a new field alongside coldRentMonthly/parkingRentMonthly:
export interface CashflowActualMonthInput {
  // ...existing fields...
  otherIncomeMonthly: number;
}

// Inside cashflowLineItemsForActualMonth, update the incomeForMonth call:
const income = incomeForMonth(input.month, input.statusHistory, input.today, input.coldRentMonthly, input.parkingRentMonthly, input.otherIncomeMonthly);
```

In `web/lib/calculations/taxCalculator.ts`, add `otherIncomeMonthly: number` to `AnnualTaxableIncomeInput` and pass it through in `annualTaxableIncomeBreakdown` (around line 124):

```typescript
export interface AnnualTaxableIncomeInput {
  // ...existing fields...
  otherIncomeMonthly: number;
}

// Inside annualTaxableIncomeBreakdown's ownership-months loop, update the incomeForMonth call:
totalIncome +=
  incomeForMonth(month, input.statusHistory, input.today, input.coldRentMonthly, input.parkingRentMonthly, input.otherIncomeMonthly) *
  ownerFraction;
```

In `web/lib/data/propertySummary.ts`, update both call sites that build these inputs to pass `property.other_income_monthly`:

```typescript
// The incomeForMonth call (around line 103):
const incomeThisMonth = incomeForMonth(
  currentMonth,
  statusHistory,
  today,
  property.cold_rent_monthly,
  property.parking_rent_monthly,
  property.other_income_monthly
);

// The annualTaxableIncome call (the AnnualTaxableIncomeInput object literal) — add:
otherIncomeMonthly: property.other_income_monthly,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run tests/calculations/cashflowCalculator.test.ts tests/calculations/taxCalculator.test.ts tests/data/propertySummary.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/calculations/cashflowCalculator.ts web/lib/calculations/taxCalculator.ts web/lib/data/propertySummary.ts web/tests/calculations/cashflowCalculator.test.ts web/tests/calculations/taxCalculator.test.ts web/tests/data/propertySummary.test.ts
git commit -m "fix(calculations): thread other_income_monthly through cashflow, tax, and summary"
```

---

### Task 3: Full-suite verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated test suite**

Run: `cd web && npm test`
Expected: All test files PASS — this specifically confirms no other caller of `incomeForMonth`, `cashflowLineItemsForActualMonth`, `annualTaxableIncomeBreakdown`/`annualTaxableIncome`, or `computePropertySummary` broke from the added required parameter.

- [ ] **Step 2: Run the linter and build**

Run: `cd web && npm run lint && npm run build`
Expected: No errors.

- [ ] **Step 3: Manual walkthrough**

Run: `cd web && npm run dev`

On a property with `other_income_monthly` set to a nonzero value and currently `vermietet`:

1. `/properties/[id]` (Übersicht) → note the "CF nach Steuern" KPI value.
2. `/properties/[id]/cashflow` → Prognose-Monat (Card 1) and the current year's row in the Jahresübersicht (Card 2) now agree on income (previously Card 1 was lower by exactly `other_income_monthly`).
3. `/properties/[id]/steuer` → "Laufendes Jahr" section's Einnahmen line now includes the other income.
4. Stop the dev server (`Ctrl+C`).

- [ ] **Step 4: Report results**

If anything in Step 3 doesn't match, fix it before considering this plan done.

---

## Self-Review Checklist

- [x] **Spec coverage:** The one bug named in PR #14's description — Card 1/Card 2 disagreement on `other_income_monthly` — is fixed at its root (`incomeForMonth`), which is transitively consumed by all three affected surfaces (Cashflow Card 1, Übersicht KPI via `propertySummary.ts`, Steuer tab via `taxCalculator.ts`), not patched at each surface independently.
- [x] **No placeholders:** Every task shows the exact function signature change and every call site that must be updated to match.
- [x] **Type consistency:** `incomeForMonth`'s new parameter is `otherIncomeMonthly: number`, matching the existing `otherIncomeMonthly: number` field already defined in `cashflowCalculator.ts`'s `CashflowScenarioInput` (line 199) — same name, same type, no naming drift between the scenario-based and actual-month-based code paths.
- [x] **Scope discipline:** `mietgarantie` segments are deliberately left unchanged (`incomeActualMonthly` already represents total actual income); only the `vermietet` branch gains the new term, matching `cashflowLineItemsForScenario`'s existing `vollvermietung`-only treatment of `otherIncomeMonthly`.
