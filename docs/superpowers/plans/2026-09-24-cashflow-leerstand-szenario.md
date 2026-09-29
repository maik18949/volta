# Cashflow-Jahresübersicht: Leerstandsquote-Szenario Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Not-yet-passed months in the Cashflow-Jahresübersicht (rest of the current year once the Leerstandsquote-Regler is moved away from default, and always for fully future years) compute Einnahmen/Status/leerstand-abhängige Kosten via the same Vollvermietung/Leerstand-Szenario-Blend the rest of the app already uses (Card 1, Steuer-Prognose) — instead of projecting the real/last-known status forward. The current-year Steuereffekt shares the same override so "Cashflow nach Steuern" stays internally consistent.

**Architecture:** A new shared helper `scenarioBlendLineItems` (extracted from Card 1's existing scenario-blend logic, now also used by Card 2) computes a month's line items at a given quote. `computeCashflowYearTable` gains a 9th, optional parameter `leerstandQuoteOverride?: number`. Per month: use the blend when the year is fully future (always, with the existing `forecastLeerstandQuote`) or when `leerstandQuoteOverride` is set AND the month is on/after the 1st of the month after "today" (the exact same cutoff `annualTaxableIncomeBreakdown`'s own `leerstandQuoteOverride` already uses) — otherwise, unchanged, the existing real/projected-status computation. The same `leerstandQuoteOverride` is also now passed into the function's existing `computeTaxCurrentYear` call (previously always `undefined`), mirroring exactly how Card 1 already does this.

**Tech Stack:** TypeScript, Vitest.

**Design doc:** `docs/superpowers/specs/2026-09-24-cashflow-leerstand-szenario-design.md`

---

### Task 1: `propertyCashflow.ts` — scenario blend for not-yet-passed months

**Files:**
- Modify: `web/lib/data/propertyCashflow.ts:1-443` (extract helper, wire `computeCashflowYearTable`, refactor `computeCashflowForecastMonth` to reuse the helper)
- Test: `web/tests/data/propertyCashflow.test.ts`

- [ ] **Step 1: Write the failing tests**

Add these two `describe` blocks to the end of `web/tests/data/propertyCashflow.test.ts`. The file already imports `fixtures as f`, `makeDate`, `computeCashflowYearTable`, `computeTaxCurrentYear`, `computeTaxForecastYear`, and has `makeProperty`/`makeStatusEntry` helpers — the default `makeProperty()` fixture has `economic_transfer_date: '2026-02-01'`, `loan_start_date: '2025-10-01'`; `makeStatusEntry()` defaults to `date: '2026-02-01', status: 'vermietet'`.

```ts
describe('computeCashflowYearTable — leerstandQuoteOverride (rest of current year)', () => {
  const property = makeProperty();
  const statusEntries = [makeStatusEntry()]; // vermietet from 2026-02-01
  const today = makeDate(2026, 8, 15); // August

  it('the current month itself is never overridden, even with leerstandQuoteOverride set', () => {
    const withOverride = computeCashflowYearTable(property, statusEntries, [], 2026, today, [], 0, 1);
    const withoutOverride = computeCashflowYearTable(property, statusEntries, [], 2026, today, [], 0);
    const augustWith = withOverride.months.find((m) => m.month === 8)!;
    const augustWithout = withoutOverride.months.find((m) => m.month === 8)!;
    expect(augustWith.lineItems.incomeWE).toBeCloseTo(augustWithout.lineItems.incomeWE, 2);
    expect(augustWith.statusLabelsWE).toEqual(augustWithout.statusLabelsWE);
  });

  it('months after the current month use the scenario blend once an override is set', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today, [], 0, 1); // 100% leerstand
    const september = result.months.find((m) => m.month === 9)!;
    expect(september.lineItems.incomeWE).toBe(0);
    expect(september.statusLabelsWE).toEqual([]);
  });

  it('without leerstandQuoteOverride, months after today keep projecting the last known status (regression guard)', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today);
    const december = result.months.find((m) => m.month === 12)!;
    expect(december.lineItems.incomeWE).toBeCloseTo(f.coldRentMonthly, 2);
    expect(december.statusLabelsWE).toEqual(['vermietet']);
  });

  it('a partial quote blends income proportionally, not discretely', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today, [], 0, 0.3);
    const september = result.months.find((m) => m.month === 9)!;
    expect(september.lineItems.incomeWE).toBeCloseTo(f.coldRentMonthly * 0.7, 2);
  });

  it('leerstandQuoteOverride also feeds the current-year tax effect, matching computeTaxCurrentYear with the same override', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today, [], 0, 1);
    const direct = computeTaxCurrentYear(property, statusEntries, [], today, 1);
    expect(result.taxEffectMonthly).toBe(direct.taxEffectMonthly);
  });

  it('omitting leerstandQuoteOverride keeps the whole result byte-identical to before (regression guard)', () => {
    const withExplicitUndefined = computeCashflowYearTable(property, statusEntries, [], 2026, today, [], 0, undefined);
    const withoutArg = computeCashflowYearTable(property, statusEntries, [], 2026, today, [], 0);
    expect(withExplicitUndefined).toEqual(withoutArg);
  });
});

describe('computeCashflowYearTable — fully future years always use the scenario blend', () => {
  const property = makeProperty();
  const statusEntries = [makeStatusEntry()];
  const today = makeDate(2026, 8, 15);

  it('a future year with no leerstandQuoteOverride still uses the scenario blend (forecastLeerstandQuote), not real status projection', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2027, today, [], 0.4);
    const june = result.months.find((m) => m.month === 6)!;
    expect(june.lineItems.incomeWE).toBeCloseTo(f.coldRentMonthly * 0.6, 2);
    expect(june.statusLabelsWE).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `cd web && npx vitest run tests/data/propertyCashflow.test.ts`
Expected: FAIL — `computeCashflowYearTable` doesn't accept an 8th positional argument (`leerstandQuoteOverride`) yet; September/December currently always use real status regardless of any override.

- [ ] **Step 3: Implement**

In `web/lib/data/propertyCashflow.ts`, add a new shared helper function right after the `CashflowForecastMonthResult` interface (before `computeCashflowForecastMonth`):

```ts
/**
 * A single month's line items for a hypothetical Vollvermietung/Leerstand blend at `quote`
 * (0 = vollvermietung, 1 = leerstand) — shared by Card 1 (always blended) and Card 2's
 * not-yet-passed months (blended only when a Leerstandsquote override applies). See
 * docs/superpowers/specs/2026-09-24-cashflow-leerstand-szenario-design.md.
 */
function scenarioBlendLineItems(
  property: PropertyRow,
  quote: number,
  extraordinaryCostsThisMonth: number,
  hoaFeeNonRecoverableMonthly: number,
  hoaFeeParkingNonRecoverableMonthly: number
): CashflowLineItems {
  const scenarioInputBase = {
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
  };
  const vollvermietungLineItems = cashflowLineItemsForScenario({ scenario: 'vollvermietung', ...scenarioInputBase });
  const leerstandLineItems = cashflowLineItemsForScenario({ scenario: 'leerstand', ...scenarioInputBase });
  return blendCashflowLineItems(vollvermietungLineItems, leerstandLineItems, quote);
}
```

Refactor `computeCashflowForecastMonth` to use it — replace:

```ts
  const scenarioInputBase = {
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
  };

  const vollvermietungLineItems = cashflowLineItemsForScenario({ scenario: 'vollvermietung', ...scenarioInputBase });
  const leerstandLineItems = cashflowLineItemsForScenario({ scenario: 'leerstand', ...scenarioInputBase });
  const lineItems = blendCashflowLineItems(vollvermietungLineItems, leerstandLineItems, leerstandQuote);
```

with:

```ts
  const lineItems = scenarioBlendLineItems(property, leerstandQuote, 0, hoaFeeNonRecoverableMonthly, hoaFeeParkingNonRecoverableMonthly);
```

(Card 1 never has an extraordinary cost for its hypothetical month, hence the literal `0` — matches the existing test `'Card 1 never includes an actual extraordinary cost (it is a hypothetical typical month)'`. `hoaFeeNonRecoverableMonthly`/`hoaFeeParkingNonRecoverableMonthly` are already computed above this point in the function, unchanged.)

Now update `computeCashflowYearTable`. Change the signature (currently ending `forecastLeerstandQuote: number = 0 // 0 = Vollvermietung...`) to add the 9th parameter:

```ts
export function computeCashflowYearTable(
  property: PropertyRow,
  statusEntryRows: StatusEntryRow[],
  extraordinaryCostRows: ExtraordinaryCostRow[],
  year: number,
  today: Date = new Date(),
  disbursementRows: LoanDisbursementRow[] = [],
  forecastLeerstandQuote: number = 0, // 0 = Vollvermietung (Cashflow-Tab hat keinen eigenen Regler für Zukunftsjahre)
  leerstandQuoteOverride?: number
): CashflowYearTableResult {
```

Change the `currentYearTaxEffectMonthly` call from:

```ts
  const { taxEffectMonthly: currentYearTaxEffectMonthly } = computeTaxCurrentYear(
    property,
    statusEntryRows,
    extraordinaryCostRows,
    today,
    undefined,
    disbursementRows
  );
```

to:

```ts
  const { taxEffectMonthly: currentYearTaxEffectMonthly } = computeTaxCurrentYear(
    property,
    statusEntryRows,
    extraordinaryCostRows,
    today,
    leerstandQuoteOverride,
    disbursementRows
  );
```

Right after the `mortgageStartDate`/`currentYear`/`isFutureYear` block (before the `hoaFeeNonRecoverableMonthly` computation), add:

```ts
  // Derselbe Umschaltpunkt wie annualTaxableIncomeBreakdown's leerstandQuoteOverride.fromMonth:
  // der laufende Monat selbst bleibt immer unangetastet, erst ab dem Folgemonat greift der
  // Override. Siehe docs/superpowers/specs/2026-09-24-cashflow-leerstand-szenario-design.md.
  const overrideFromMonth = makeDate(today.getUTCFullYear(), today.getUTCMonth() + 1, 1);
```

In the per-month loop's owned-months branch, change:

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
    const lineItems = scaleLineItems(rawLineItems, ownerFraction);

    ownershipMonthCount += ownerFraction;
    mortgageMonthCount += ownerFraction;
    sumLineItems = addLineItems(sumLineItems, lineItems);

    months.push({
      month: m,
      isProjection: statusHistory.length === 0 || monthDate.getTime() > firstDayOfMonth(today).getTime(),
      isOwned: true,
      hasMortgagePayment: true,
      statusLabelsWE: statusHistory.length === 0 ? [] : statusesForMonth(monthDate, statusHistory, today),
      statusLabelsTE: stellplatzStatusHistory.length === 0 ? [] : statusesForMonth(monthDate, stellplatzStatusHistory, today),
      lineItems,
      extraordinaryCostRows: monthCostRows,
      cashflowAfterTax: lineItems.cashflowBeforeTax + effectiveTaxEffectMonthly,
    });
```

to:

```ts
    const useScenarioBlend =
      isFutureYear || (leerstandQuoteOverride !== undefined && monthDate.getTime() >= overrideFromMonth.getTime());
    const rawLineItems = useScenarioBlend
      ? scenarioBlendLineItems(
          property,
          isFutureYear ? forecastLeerstandQuote : leerstandQuoteOverride!,
          extraordinaryCostsThisMonth,
          hoaFeeNonRecoverableMonthly,
          hoaFeeParkingNonRecoverableMonthly
        )
      : lineItemsForMonth(
          property,
          statusHistory,
          stellplatzStatusHistory,
          monthDate,
          today,
          extraordinaryCostsThisMonth,
          hoaFeeNonRecoverableMonthly,
          hoaFeeParkingNonRecoverableMonthly
        );
    const lineItems = scaleLineItems(rawLineItems, ownerFraction);

    ownershipMonthCount += ownerFraction;
    mortgageMonthCount += ownerFraction;
    sumLineItems = addLineItems(sumLineItems, lineItems);

    months.push({
      month: m,
      isProjection: statusHistory.length === 0 || monthDate.getTime() > firstDayOfMonth(today).getTime(),
      isOwned: true,
      hasMortgagePayment: true,
      statusLabelsWE: useScenarioBlend || statusHistory.length === 0 ? [] : statusesForMonth(monthDate, statusHistory, today),
      statusLabelsTE:
        useScenarioBlend || stellplatzStatusHistory.length === 0 ? [] : statusesForMonth(monthDate, stellplatzStatusHistory, today),
      lineItems,
      extraordinaryCostRows: monthCostRows,
      cashflowAfterTax: lineItems.cashflowBeforeTax + effectiveTaxEffectMonthly,
    });
```

Nothing else in the function changes — `effectiveTaxEffectMonthly`'s own computation (`isFutureYear ? computeTaxForecastYear(...) : currentYearTaxEffectMonthly`) is untouched, it just now receives an override-aware `currentYearTaxEffectMonthly`.

- [ ] **Step 4: Run the tests and verify they pass**

Run: `cd web && npx vitest run tests/data/propertyCashflow.test.ts`
Expected: PASS — all tests in the file, old and new (including all existing `computeCashflowForecastMonth` tests, confirming the extraction is behavior-preserving).

- [ ] **Step 5: Run the full suite and type-check**

Run: `cd web && npx vitest run && npx tsc --noEmit`
Expected: PASS, no errors.

- [ ] **Step 6: Commit**

```bash
git add web/lib/data/propertyCashflow.ts web/tests/data/propertyCashflow.test.ts
git commit -m "$(cat <<'EOF'
feat(cashflow): apply the Leerstandsquote scenario blend to not-yet-passed months

computeCashflowYearTable's Einnahmen/Status rows previously always
projected the real/last-known status forward, even once a
Leerstandsquote override existed for the current year's remaining
months or a fully future year's tax effect — a visible inconsistency
against Card 1 and the Steuer-effect row. Extracts the existing
Vollvermietung/Leerstand blend (already used by Card 1) into a shared
helper and applies it to any month on/after the cutoff
annualTaxableIncomeBreakdown's own leerstandQuoteOverride already
uses (the month after "today"), plus unconditionally for fully future
years. The same override now also feeds the current-year tax effect,
so "Cashflow nach Steuern" stays internally consistent per month.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `CashflowTab.tsx` — pass the shared Leerstandsquote override through

**Files:**
- Modify: `web/components/property/cashflow/CashflowTab.tsx:91-99`

- [ ] **Step 1: Wire it up**

Change (currently):

```tsx
  const yearTable = computeCashflowYearTable(
    property,
    statusEntries,
    extraordinaryCosts,
    year,
    today,
    loanDisbursements,
    forecastLeerstandQuote
  );
```

to:

```tsx
  // Gleiches Muster wie computeCashflowForecastMonth (Card 1): nur wenn der Regler vom
  // Standard abweicht, wird der Override überhaupt weitergegeben — bei unberührtem Regler
  // bleibt computeCashflowYearTable byte-identisch zu vorher.
  const leerstandQuoteOverride = quote === defaultQuote ? undefined : quote / 100;
  const yearTable = computeCashflowYearTable(
    property,
    statusEntries,
    extraordinaryCosts,
    year,
    today,
    loanDisbursements,
    forecastLeerstandQuote,
    leerstandQuoteOverride
  );
```

- [ ] **Step 2: Type-check and lint**

Run: `cd web && npx tsc --noEmit && npx eslint components/property/cashflow/CashflowTab.tsx`
Expected: no errors.

- [ ] **Step 3: Run the full test suite**

Run: `cd web && npx vitest run`
Expected: PASS (no direct test for this file, consistent with existing precedent — confirms nothing else broke).

- [ ] **Step 4: Commit**

```bash
git add web/components/property/cashflow/CashflowTab.tsx
git commit -m "$(cat <<'EOF'
feat(cashflow): pass the shared Leerstandsquote as computeCashflowYearTable's override

Same conditional-pass pattern Card 1 already uses for
computeTaxCurrentYear — only forwarded once the regler differs from
its computed default, so an untouched page load stays byte-identical.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Verifikation

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `cd web && npx vitest run`
Expected: PASS, every test file.

- [ ] **Step 2: Full type-check**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint the touched surface**

Run: `cd web && npx eslint lib/data/propertyCashflow.ts components/property/cashflow/CashflowTab.tsx`
Expected: no errors.

- [ ] **Step 4: Manual browser check**

Start the dev server and open a property's Cashflow tab. With today's date mid-year:
- Move the "Laufendes Jahr"-Regler (shared with the Steuer tab) away from its default. Confirm: the current month's own column is unchanged; every later month in the current year shows Einnahmen scaled by the quote (0€ at 100%, proportional at partial values) and no status badge; "Cashflow nach Steuern" for those months reflects both the new income AND a changed Steuererstattung consistently.
- Reset the regler to default — confirm the table returns exactly to what it showed before touching it.
- Navigate to a fully future year (e.g. next year) — confirm Einnahmen for every month are already scenario-based (matching the property's lifetime-average Leerstandsquote) with no status badge, even without touching any regler.
- Navigate back to a past year — confirm nothing changed there (still pure Ist).

- [ ] **Step 5: Report**

Summarize pass/fail for each of the above; fix and re-run before considering the task done.
