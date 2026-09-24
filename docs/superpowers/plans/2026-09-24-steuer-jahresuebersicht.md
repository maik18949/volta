# Steuer-Jahresübersicht Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Steuer-Tab's "Prognose" card with a navigable "Jahresübersicht" (past/current/future, mirroring the Cashflow tab's own "Jahresübersicht" card), fix the year-boundary gap that silently zeroes out real interest for a calendar year entirely before the wirtschaftliche Übergang, and give the Cashflow tab's future year a real (instead of `null`) tax effect, shared with the Steuer tab via URL state.

**Architecture:** Two small, additive data-layer changes (`annualTaxableIncomeBreakdown` computes interest independent of ownership; `computeTaxCurrentYear` accepts an optional `yearOverride`) let one existing function (`computeTaxCurrentYear`) serve any past-or-current year, not just today's. A new `YearOverviewCard` component in the Steuer tab wraps a `YearPicker` + (for future years only) a `QuoteSlider` around the three existing result-rendering pieces (`CurrentYearSection`, `ForecastSection`, both untouched) — no new rendering component needed, they're reused as-is. `computeCashflowYearTable` gets one new required-with-default parameter and calls the existing, unchanged `computeTaxForecastYear` for future years instead of leaving the tax effect `null`. `PropertySidebar.tsx` forwards two new URL params (`prognoseJahr`, `prognoseQuote`) alongside the existing `leerstand` param when switching between the Cashflow and Steuer tabs.

**Tech Stack:** Next.js App Router (client components + `useSearchParams`/`router.replace`), TypeScript, Vitest.

**Design doc:** `docs/superpowers/specs/2026-09-24-steuer-jahresuebersicht-design.md`

**One correction versus the design doc, discovered while reading the actual current code (flag this to the user when the plan is done, don't just silently deviate):** the design doc says the Jahresübersicht year-picker should go "unbegrenzt in die Zukunft," modeled on the OLD Steuer "Prognose" card's picker. But the Cashflow tab's OWN Jahresübersicht (`CashflowTab.tsx:78`) is already capped at `maxYear={currentYear + 1}` — and per the design, Cashflow's picker must stay untouched. For the `prognoseJahr` cross-tab sync to make sense (a year selected in one tab must be representable in the other), the new Steuer Jahresübersicht's picker is capped at `currentYear + 1` too, in Task 4 below — **not** left unbounded. This is the only deviation from the written spec in this plan.

---

## File Structure

| File | Responsibility |
|---|---|
| `web/lib/calculations/taxCalculator.ts` | Fix: `annualTaxableIncomeBreakdown` computes interest independent of ownership months |
| `web/lib/data/propertyTax.ts` | `computeTaxCurrentYear` accepts optional `yearOverride` |
| `web/lib/data/propertyCashflow.ts` | `computeCashflowYearTable` gets a real future-year tax effect via `computeTaxForecastYear` |
| `web/components/property/detail/PropertySidebar.tsx` | Forwards `prognoseJahr`/`prognoseQuote` alongside `leerstand` |
| `web/components/property/steuer/YearOverviewCard.tsx` | New — the Jahresübersicht card (year picker, future-year slider, reuses `CurrentYearSection`/`ForecastSection`) |
| `web/components/property/steuer/SteuerTab.tsx` | Drops "Prognose" card + state, renders `YearOverviewCard` instead |
| `web/components/property/cashflow/CashflowTab.tsx` | Computes `forecastLeerstandQuote`, reads/writes `prognoseJahr`/`prognoseQuote` for its own year picker |
| `web/components/property/cashflow/CashflowYearTable.tsx` | Drops the future-year "not implemented" warning branch |

Out of scope (confirmed not to change): `computeTaxForecastYear`'s own signature, `taxLineItemsForScenario`, `AfaBasisCard`, Cashflow Card 1 ("Prognose/Monat"), the Cashflow year-picker's `maxYear` bound, the tranche-based deductibility engine itself.

---

### Task 1: `annualTaxableIncomeBreakdown` — real interest for a year entirely before ownership

**Files:**
- Modify: `web/lib/calculations/taxCalculator.ts:91-193`
- Test: `web/tests/calculations/taxCalculator.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to the `describe('taxCalculator.annualTaxableIncomeBreakdown', ...)` block in `web/tests/calculations/taxCalculator.test.ts` (right after the existing `'a year entirely before ownership returns all-zero line items'` test, which stays — it uses year 2024, before `f.loanStartDate` (2025-10-01) too, so it keeps passing unchanged). The file already imports `interestForCalendarYear` from `@/lib/calculations/amortizationCalculator` and `f`/`makeDate`/`annualTaxableIncomeBreakdown` — reuse as-is.

```ts
  it('a year with the loan already running but zero ownership months still deducts real interest (Fall-B fix)', () => {
    // f.loanStartDate = 2025-10-01, f.economicTransferDate = 2026-02-01 (baseInput) -> 2025 has
    // an active loan for part of the year but zero ownership months all year.
    const interest2025 = interestForCalendarYear(2025, f.loanStartDate, f.loanAmount, f.interestRate, f.monthlyMortgage);
    const breakdown = annualTaxableIncomeBreakdown({
      ...baseInput,
      year: 2025,
      statusHistory: [],
      today: makeDate(2025, 12, 31),
      extraordinaryCostsDeductibleYearly: 0,
    });
    expect(interest2025).toBeGreaterThan(0);
    expect(breakdown.interest).toBeCloseTo(interest2025, 2);
    expect(breakdown.income).toBe(0);
    expect(breakdown.depreciation).toBe(0);
    expect(breakdown.hoaNonRecoverableWE).toBe(0);
    expect(breakdown.taxableIncome).toBeCloseTo(-interest2025, 2);
  });

  it('a year before the loan even started still returns zero interest (regression: Fall-B fix must not invent interest)', () => {
    // year 2024 is before both ownership AND f.loanStartDate (2025-10-01).
    const breakdown = annualTaxableIncomeBreakdown({
      ...baseInput,
      year: 2024,
      statusHistory: [],
      today: makeDate(2024, 12, 31),
      extraordinaryCostsDeductibleYearly: 0,
    });
    expect(breakdown.interest).toBe(0);
    expect(breakdown.taxableIncome).toBe(0);
  });

  it('disbursements: a year with only a non-deductible tranche and zero ownership months deducts nothing', () => {
    // Mirrors the existing 'disbursements: excludes non-deductible-tranche interest' test's
    // fixture, but queries 2025 — before economicTransferDate (2026-01-01) and before the
    // deductible Hauptkredit tranche (2026-01-20) landed, only the non-deductible Hyposchutz
    // tranche (2025-10-01) existed that year.
    const disbursements = [
      { date: makeDate(2025, 10, 1), amount: 2_734.45, deductible: false },
      { date: makeDate(2026, 1, 20), amount: 278_665.55, deductible: true },
    ];
    const breakdown = annualTaxableIncomeBreakdown({
      year: 2025,
      statusHistory: [],
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
      today: makeDate(2025, 12, 31),
      extraordinaryCostsDeductibleYearly: 0,
      disbursements,
    });
    expect(breakdown.interest).toBe(0);
    expect(breakdown.taxableIncome).toBe(0);
  });
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `cd web && npx vitest run tests/calculations/taxCalculator.test.ts`
Expected: FAIL — the first new test expects `breakdown.interest`/`breakdown.taxableIncome` to be nonzero, but the current code returns the flat `ZERO_TAX_LINE_ITEMS` for any zero-ownership year.

- [ ] **Step 3: Implement**

Replace `annualTaxableIncomeBreakdown` (`web/lib/calculations/taxCalculator.ts:91-193`) with:

```ts
export function annualTaxableIncomeBreakdown(input: AnnualTaxableIncomeBreakdownInput): TaxLineItems {
  const isAcquisitionYear = input.year === input.economicTransferDate.getUTCFullYear();

  const ownershipMonths: Date[] = [];
  for (let month = 1; month <= 12; month++) {
    const d = makeDate(input.year, month, 1);
    if (ownershipDayFraction(d, input.economicTransferDate) > 0) {
      ownershipMonths.push(d);
    }
  }

  const interestYear =
    input.disbursements && input.disbursements.length > 0
      ? stagedInterestForCalendarYear(input.year, input.disbursements, input.interestRate, input.monthlyMortgage).deductible
      : interestForCalendarYear(input.year, input.loanStartDate, input.loanAmount, input.interestRate, input.monthlyMortgage);

  if (ownershipMonths.length === 0) {
    // A calendar year entirely before economicTransferDate still deducts real interest if the
    // loan had already started that year (interestForCalendarYear/stagedInterestForCalendarYear
    // are computed purely from loan timing, independent of ownership) — everything
    // ownership-dependent (income, AfA, Nebenkosten) stays 0. Mirrors propertyCashflow.ts's
    // pre-transfer Kreditrate handling. See docs/superpowers/specs/2026-09-24-steuer-jahresuebersicht-design.md.
    return { ...ZERO_TAX_LINE_ITEMS, interest: interestYear, taxableIncome: -interestYear };
  }

  const stellplatzHistory = input.stellplatzStatusHistory ?? input.statusHistory;

  const afaYear = isAcquisitionYear
    ? (input.afaBasis * input.depreciationRate / 12) * ownershipMonths.length
    : input.afaBasis * input.depreciationRate;

  let totalIncome = 0;
  let ownershipMonthEquivalent = 0;
  let leerstandEquivalentMonths = 0;

  for (const month of ownershipMonths) {
    const ownerFraction = ownershipDayFraction(month, input.economicTransferDate);
    ownershipMonthEquivalent += ownerFraction;

    const useOverride =
      input.leerstandQuoteOverride !== undefined && month.getTime() >= input.leerstandQuoteOverride.fromMonth.getTime();
    const overrideQuote = input.leerstandQuoteOverride?.quote;

    const leerstandFraction = useOverride
      ? overrideQuote!
      : leerstandDayFraction(month, input.statusHistory, input.today);
    // KNOWN LIMITATION: for a mid-month economicTransferDate, this multiplication
    // is not exact — leerstandFraction is a whole-month fraction from
    // statusPeriodCalculator, which defaults days with no StatusEntry (including
    // pre-ownership days in the acquisition month) to 'leerstand'. This can
    // produce a small spurious leerstand-deduction for an acquisition month that
    // was actually fully rented from day one of ownership. Confirmed reachable
    // (e.g. economicTransferDate = day 15, StatusEntry='vermietet' from day 15
    // onward still yields a nonzero leerstand contribution for that month).
    // Fixing this properly requires ownership-window-aware day segmentation in
    // statusPeriodCalculator, not just here — tracked as a follow-up, not fixed
    // in this task.
    leerstandEquivalentMonths += ownerFraction * leerstandFraction;

    const monthIncome = useOverride
      ? (input.coldRentMonthly + input.parkingRentMonthly + input.otherIncomeMonthly) * (1 - overrideQuote!)
      : incomeForUnit(month, input.statusHistory, input.today, input.coldRentMonthly + input.otherIncomeMonthly) +
        incomeForUnit(month, stellplatzHistory, input.today, input.parkingRentMonthly);

    totalIncome += monthIncome * ownerFraction;
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
```

(Only two changes versus the current code: the `interestYear` computation moved above the `ownershipMonths.length === 0` check, and that check now returns a partial line-items object instead of the flat `ZERO_TAX_LINE_ITEMS`. Everything from `const stellplatzHistory = ...` onward is byte-identical to before.)

- [ ] **Step 4: Run the tests and verify they pass**

Run: `cd web && npx vitest run tests/calculations/taxCalculator.test.ts`
Expected: PASS — all tests in the file, old and new.

- [ ] **Step 5: Run the full suite (this function has several callers)**

Run: `cd web && npx vitest run`
Expected: PASS. If anything outside `taxCalculator.test.ts` fails, read the failure — it means some other test relied on the old all-zero behavior for a zero-ownership year; fix that test's expectation to match the new (correct) behavior rather than reverting the fix.

- [ ] **Step 6: Commit**

```bash
git add web/lib/calculations/taxCalculator.ts web/tests/calculations/taxCalculator.test.ts
git commit -m "$(cat <<'EOF'
fix(steuer): deduct real interest for a year entirely before ownership

annualTaxableIncomeBreakdown returned a flat zero for any calendar
year with no ownership months, discarding real deductible interest
if the loan had already started that year (e.g. a disbursement
tranche landed before the wirtschaftliche Übergang, in an earlier
calendar year). Interest is now computed independent of ownership,
matching the same "loan timing, not ownership timing" principle
already used for the Cashflow tab's pre-transfer Kreditrate.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `computeTaxCurrentYear` — `yearOverride` parameter

**Files:**
- Modify: `web/lib/data/propertyTax.ts:54-137`
- Test: `web/tests/data/propertyTax.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to the `describe('computeTaxCurrentYear', ...)` block in `web/tests/data/propertyTax.test.ts` (it already has `property`/`statusEntries`/`today` in scope — `property` uses `economic_transfer_date: '2026-02-01'`, `loan_start_date: '2025-10-01'`, `today = makeDate(2026, 6, 15)`):

```ts
  it('yearOverride switches which year is computed, without touching today-based defaults', () => {
    const result = computeTaxCurrentYear(property, statusEntries, [], today, undefined, [], 2025);
    expect(result.year).toBe(2025);
  });

  it('a past year (yearOverride) with the loan already running deducts real interest instead of returning zero (Fall-B fix reachable here too)', () => {
    const result = computeTaxCurrentYear(property, statusEntries, [], today, undefined, [], 2025);
    expect(result.lineItems.interest).toBeGreaterThan(0);
    expect(result.lineItems.taxableIncome).toBeLessThan(0);
  });

  it('leerstandQuoteOverride is ignored for any year other than the real current year', () => {
    // today is 2026-06-15, so 2026 is the real current year; 2025 is not, even though
    // yearOverride requests it explicitly.
    const withoutQuoteOverride = computeTaxCurrentYear(property, statusEntries, [], today, undefined, [], 2025);
    const withQuoteOverride = computeTaxCurrentYear(property, statusEntries, [], today, 1, [], 2025);
    expect(withQuoteOverride).toEqual(withoutQuoteOverride);
  });

  it('omitting yearOverride is byte-identical to before (regression guard)', () => {
    const withoutOverride = computeTaxCurrentYear(property, statusEntries, [], today);
    const withUndefinedOverride = computeTaxCurrentYear(property, statusEntries, [], today, undefined, [], undefined);
    expect(withUndefinedOverride).toEqual(withoutOverride);
  });
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `cd web && npx vitest run tests/data/propertyTax.test.ts`
Expected: FAIL — `computeTaxCurrentYear` doesn't accept a 7th argument yet (TypeScript error), or `result.year` is always the real current year (2026), not 2025.

- [ ] **Step 3: Implement**

In `web/lib/data/propertyTax.ts`, change the function signature (line 54-61) and the `year`/`leerstandQuoteOverride` lines (65 and 114-117):

```ts
export function computeTaxCurrentYear(
  property: PropertyRow,
  statusEntryRows: StatusEntryRow[],
  extraordinaryCostRows: ExtraordinaryCostRow[],
  today: Date = new Date(),
  leerstandQuoteOverride?: number,
  disbursementRows: LoanDisbursementRow[] = [],
  yearOverride?: number
): TaxCurrentYearResult {
  const { wohnung: statusHistory, stellplatz: stellplatzStatusHistory } = toUnitStatusHistories(statusEntryRows);
  const economicTransferDate = new Date(property.economic_transfer_date + 'T00:00:00Z');
  const loanStartDate = new Date(property.loan_start_date + 'T00:00:00Z');
  const year = yearOverride ?? today.getUTCFullYear();
```

and (the `leerstandQuoteOverride` field inside the `annualTaxableIncomeBreakdown({...})` call):

```ts
    leerstandQuoteOverride:
      leerstandQuoteOverride !== undefined && year === today.getUTCFullYear()
        ? { fromMonth: makeDate(today.getUTCFullYear(), today.getUTCMonth() + 1, 1), quote: leerstandQuoteOverride }
        : undefined,
```

Everything else in the function (lines 66-136) is unchanged — it already reads `year` from the local variable, so it automatically works for any requested year.

Also update the doc comment directly above the function (lines 37-53) — append one sentence after the existing `disbursementRows` paragraph:

```ts
 * `yearOverride` is optional and additive too — omitted, `year` is today's calendar year
 * (existing behavior, byte-identical). When provided, `year` becomes that value instead, and
 * `leerstandQuoteOverride` (the "rest of this year" what-if) is only actually applied when the
 * requested year is genuinely today's calendar year — a past year has no "rest of the year"
 * to project, it's plain Ist.
 */
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `cd web && npx vitest run tests/data/propertyTax.test.ts`
Expected: PASS — all tests in the file, old and new.

- [ ] **Step 5: Run the full suite**

Run: `cd web && npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/lib/data/propertyTax.ts web/tests/data/propertyTax.test.ts
git commit -m "$(cat <<'EOF'
feat(steuer): computeTaxCurrentYear accepts an optional yearOverride

Lets one function serve both the "Laufendes Jahr" card (unchanged,
no override = today's year) and the upcoming Jahresübersicht card's
past-year rows, instead of duplicating the Ist-computation logic.
The leerstandQuoteOverride "rest of this year" mechanism only applies
when the requested year is genuinely today's calendar year.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `computeCashflowYearTable` — real tax effect for future years

**Files:**
- Modify: `web/lib/data/propertyCashflow.ts:1-14` (imports), `:281-431` (`computeCashflowYearTable`)
- Test: `web/tests/data/propertyCashflow.test.ts`

- [ ] **Step 1: Write the failing tests**

Replace the existing test `'a future year (beyond the current year) blanks taxEffectMonthly and every month\'s cashflowAfterTax'` in `web/tests/data/propertyCashflow.test.ts` (inside `describe('computeCashflowYearTable', ...)`) — it asserted the OLD (now-wrong) behavior — with:

```ts
  it('a future year gets a real taxEffectMonthly from computeTaxForecastYear, using the passed forecastLeerstandQuote', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2027, today, [], 0.2);
    const forecast = computeTaxForecastYear(property, 2027, 0.2);
    expect(result.isFutureYear).toBe(true);
    expect(result.taxEffectMonthly).toBe(forecast.taxEffectMonthly);
    const june = result.months.find((m) => m.month === 6)!;
    expect(june.cashflowAfterTax).toBeCloseTo(june.lineItems.cashflowBeforeTax + forecast.taxEffectMonthly, 6);
  });

  it('omitting forecastLeerstandQuote defaults to 0 (Vollvermietung assumption)', () => {
    const withDefault = computeCashflowYearTable(property, statusEntries, [], 2027, today);
    const withExplicitZero = computeCashflowYearTable(property, statusEntries, [], 2027, today, [], 0);
    expect(withDefault).toEqual(withExplicitZero);
  });

  it('a different forecastLeerstandQuote changes the future year\'s taxEffectMonthly', () => {
    const vollvermietung = computeCashflowYearTable(property, statusEntries, [], 2027, today, [], 0);
    const volleLeerstand = computeCashflowYearTable(property, statusEntries, [], 2027, today, [], 1);
    expect(volleLeerstand.taxEffectMonthly).not.toBe(vollvermietung.taxEffectMonthly);
  });

  it('the current/past year path is unaffected by forecastLeerstandQuote (regression guard)', () => {
    const withoutQuote = computeCashflowYearTable(property, statusEntries, [], 2026, today);
    const withQuote = computeCashflowYearTable(property, statusEntries, [], 2026, today, [], 1);
    expect(withQuote).toEqual(withoutQuote);
  });
```

Add `computeTaxForecastYear` to the existing `import { computeTaxCurrentYear } from '@/lib/data/propertyTax';` line at the top of the test file (`web/tests/data/propertyCashflow.test.ts:6`) — change it to:

```ts
import { computeTaxCurrentYear, computeTaxForecastYear } from '@/lib/data/propertyTax';
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `cd web && npx vitest run tests/data/propertyCashflow.test.ts`
Expected: FAIL — `computeCashflowYearTable` doesn't accept a 7th argument yet, and/or `result.taxEffectMonthly`/`june.cashflowAfterTax` are `null` for a future year.

- [ ] **Step 3: Implement**

In `web/lib/data/propertyCashflow.ts`, add `computeTaxForecastYear` to the existing import (line 13):

```ts
import { computeTaxCurrentYear, computeTaxForecastYear } from '@/lib/data/propertyTax';
```

Change the `computeCashflowYearTable` signature (lines 281-288) to add the new parameter:

```ts
export function computeCashflowYearTable(
  property: PropertyRow,
  statusEntryRows: StatusEntryRow[],
  extraordinaryCostRows: ExtraordinaryCostRow[],
  year: number,
  today: Date = new Date(),
  disbursementRows: LoanDisbursementRow[] = [],
  forecastLeerstandQuote: number = 0
): CashflowYearTableResult {
```

Change the `currentYearTaxEffectMonthly` block (lines 318-325) to also compute an `effectiveTaxEffectMonthly`, right after it:

```ts
  const { taxEffectMonthly: currentYearTaxEffectMonthly } = computeTaxCurrentYear(
    property,
    statusEntryRows,
    extraordinaryCostRows,
    today,
    undefined,
    disbursementRows
  );
  // Zukunftsjahre bekommen einen echten (statt fehlenden) Steuereffekt über dieselbe
  // Funktion, die auch die Steuer-Tab-Jahresübersicht für Zukunftsjahre nutzt — mit der
  // vom Aufrufer übergebenen Standard-Leerstandsquote, nicht mit einem eigenen Regler
  // (der Cashflow-Tab hat keinen). Siehe docs/superpowers/specs/2026-09-24-steuer-jahresuebersicht-design.md.
  const effectiveTaxEffectMonthly = isFutureYear
    ? computeTaxForecastYear(property, year, forecastLeerstandQuote).taxEffectMonthly
    : currentYearTaxEffectMonthly;
```

Change line 391 (the owned-months branch's `cashflowAfterTax`) from:

```ts
      cashflowAfterTax: isFutureYear ? null : lineItems.cashflowBeforeTax + currentYearTaxEffectMonthly,
```

to:

```ts
      cashflowAfterTax: lineItems.cashflowBeforeTax + effectiveTaxEffectMonthly,
```

Change line 427 (the top-level result's `taxEffectMonthly`) from:

```ts
    taxEffectMonthly: isFutureYear ? null : currentYearTaxEffectMonthly,
```

to:

```ts
    taxEffectMonthly: effectiveTaxEffectMonthly,
```

Leave line 361 (`cashflowAfterTax: hasMortgagePayment && !isFutureYear ? -mortgageAmount : null,` — the pre-ownership branch) **unchanged** — a month that's both pre-ownership AND in a future year stays `null`, out of scope for this task (not covered by the design, an already-obscure edge case: a property not yet transferred, being viewed for a year beyond the next one).

- [ ] **Step 4: Run the tests and verify they pass**

Run: `cd web && npx vitest run tests/data/propertyCashflow.test.ts`
Expected: PASS — all tests in the file, old and new.

- [ ] **Step 5: Run the full suite and type-check**

Run: `cd web && npx vitest run && npx tsc --noEmit`
Expected: PASS, no errors. (`CashflowYearTable.tsx` will show a `tsc` non-issue here since `taxEffectMonthly`/`cashflowAfterTax` keep their `number | null` types — no consumer-side type break; Task 6 updates its rendering logic.)

- [ ] **Step 6: Commit**

```bash
git add web/lib/data/propertyCashflow.ts web/tests/data/propertyCashflow.test.ts
git commit -m "$(cat <<'EOF'
feat(cashflow): give future years a real tax effect via computeTaxForecastYear

Replaces the previous null/"not implemented" placeholder for a future
year's Steuereffekt with a real computation, using the same
computeTaxForecastYear the Steuer tab's new Jahresübersicht uses for
future years — with the caller-supplied default Leerstandsquote, since
the Cashflow tab has no slider of its own for this.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `PropertySidebar.tsx` — forward `prognoseJahr`/`prognoseQuote`

**Files:**
- Modify: `web/components/property/detail/PropertySidebar.tsx`

No test file exists for this component (confirmed: no `PropertySidebar.test.tsx` in `web/tests/`) — verified by type-check + manual check in Task 7.

- [ ] **Step 1: Forward the two new params alongside `leerstand`**

In `web/components/property/detail/PropertySidebar.tsx`, change:

```ts
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = `/properties/${propertyId}`;
  const leerstandParam = searchParams.get('leerstand');
```

to:

```ts
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = `/properties/${propertyId}`;
  const leerstandParam = searchParams.get('leerstand');
  const prognoseJahrParam = searchParams.get('prognoseJahr');
  const prognoseQuoteParam = searchParams.get('prognoseQuote');
```

and change the `hrefWithQuery` construction:

```ts
          const carriesQuote = href === '/cashflow' || href === '/steuer';
          const hrefWithQuery =
            carriesQuote && leerstandParam !== null ? `${fullHref}?leerstand=${encodeURIComponent(leerstandParam)}` : fullHref;
```

to:

```ts
          // Der Leerstandsquote-Regler lebt nur in Cashflow/Steuer — nur dorthin mitgeben,
          // damit ein Link zu z.B. "Verlauf" keinen ungenutzten Query-Parameter bekommt.
          const carriesQuote = href === '/cashflow' || href === '/steuer';
          const params = new URLSearchParams();
          if (carriesQuote && leerstandParam !== null) params.set('leerstand', leerstandParam);
          if (carriesQuote && prognoseJahrParam !== null) params.set('prognoseJahr', prognoseJahrParam);
          if (carriesQuote && prognoseQuoteParam !== null) params.set('prognoseQuote', prognoseQuoteParam);
          const query = params.toString();
          const hrefWithQuery = query ? `${fullHref}?${query}` : fullHref;
```

(The now-stale comment above the old `carriesQuote` line — "Der Leerstandsquote-Regler lebt nur in Cashflow/Steuer" — moves down with it since it still applies to all three params, all Cashflow/Steuer-only.)

- [ ] **Step 2: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/components/property/detail/PropertySidebar.tsx
git commit -m "$(cat <<'EOF'
feat(sidebar): forward prognoseJahr/prognoseQuote alongside leerstand

Lets a future-year Leerstandsquote "what if" set in one tab's
Jahresübersicht carry over when switching to the other tab's
Jahresübersicht, the same way the existing leerstand param already
does for the current year.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `YearOverviewCard` — the new Steuer-Tab Jahresübersicht

**Files:**
- Create: `web/components/property/steuer/YearOverviewCard.tsx`
- Modify: `web/components/property/steuer/SteuerTab.tsx`

No component tests exist for any Steuer-tab card today (confirmed: no `CurrentYearSection.test.tsx`/`ForecastSection.test.tsx`/`SteuerTab.test.tsx`) — this task is verified by type-check + the manual browser check in Task 7, consistent with that existing precedent.

- [ ] **Step 1: Create `YearOverviewCard.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { YearPicker } from '@/components/ui/YearPicker';
import { QuoteSlider } from '@/components/ui/QuoteSlider';
import { computeTaxCurrentYear, computeTaxForecastYear, type TaxCurrentYearResult } from '@/lib/data/propertyTax';
import type { OverviewMetrics } from '@/lib/data/propertyOverview';
import { CurrentYearSection } from './CurrentYearSection';
import { ForecastSection } from './ForecastSection';
import type { Database } from '@/lib/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];
type ExtraordinaryCostRow = Database['public']['Tables']['extraordinary_costs']['Row'];
type LoanDisbursementRow = Database['public']['Tables']['loan_disbursements']['Row'];

/**
 * Steuer-Tab "Jahresübersicht" — ersetzt die alte, zukunftsonly "Prognose"-Karte.
 * Vergangenheit + aktuelles Jahr: echte Ist-Werte über computeTaxCurrentYear(yearOverride).
 * Aktuelles Jahr speziell: identisches Ergebnis wie die "Laufendes Jahr"-Karte (übergeben via
 * `currentYearResult`, kein eigener Aufruf/Regler hier) — vermeidet zwei Regler für dieselbe Zahl.
 * Zukunft: computeTaxForecastYear mit einem eigenen, hier lokal + per URL geteilten Regler.
 */
export function YearOverviewCard({
  property,
  statusEntries,
  extraordinaryCosts,
  loanDisbursements,
  today,
  overview,
  currentYearResult,
  economicTransferDate,
}: {
  property: PropertyRow;
  statusEntries: StatusEntryRow[];
  extraordinaryCosts: ExtraordinaryCostRow[];
  loanDisbursements: LoanDisbursementRow[];
  today: Date;
  overview: OverviewMetrics;
  currentYearResult: TaxCurrentYearResult;
  economicTransferDate: Date;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentYear = today.getUTCFullYear();
  const hasParking = property.parking_type !== 'nicht_vorhanden';

  const loanStartDate = new Date(property.loan_start_date + 'T00:00:00Z');
  const minYear = Math.min(economicTransferDate.getUTCFullYear(), loanStartDate.getUTCFullYear());

  const prognoseJahrParam = searchParams.get('prognoseJahr');
  const initialYear =
    prognoseJahrParam !== null && Number(prognoseJahrParam) > currentYear && Number(prognoseJahrParam) <= currentYear + 1
      ? Number(prognoseJahrParam)
      : currentYear;
  const [year, setYear] = useState(initialYear);
  const isFuture = year > currentYear;

  const forecastDefaultQuote = overview.actualVacancyRate !== null ? Math.round(overview.actualVacancyRate * 100) : 0;
  const prognoseQuoteParam = searchParams.get('prognoseQuote');
  const sharedQuote =
    isFuture && prognoseJahrParam !== null && Number(prognoseJahrParam) === year && prognoseQuoteParam !== null
      ? Number(prognoseQuoteParam)
      : NaN;
  const forecastQuote = Number.isFinite(sharedQuote) ? Math.min(100, Math.max(0, sharedQuote)) : forecastDefaultQuote;
  const [liveForecastQuote, setLiveForecastQuote] = useState(forecastQuote);

  function updateUrl(nextYear: number, nextQuote: number | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextYear > currentYear) {
      params.set('prognoseJahr', String(nextYear));
      if (nextQuote !== null && nextQuote !== forecastDefaultQuote) {
        params.set('prognoseQuote', String(nextQuote));
      } else {
        params.delete('prognoseQuote');
      }
    } else {
      params.delete('prognoseJahr');
      params.delete('prognoseQuote');
    }
    const query = params.toString();
    router.replace(query ? `?${query}` : '?', { scroll: false });
  }

  function handleYearChange(nextYear: number) {
    setYear(nextYear);
    const nextDefaultQuote = overview.actualVacancyRate !== null ? Math.round(overview.actualVacancyRate * 100) : 0;
    setLiveForecastQuote(nextDefaultQuote);
    updateUrl(nextYear, null); // neues Jahr -> Standardannahme, kein Override übernehmen
  }

  function handleQuoteChange(nextQuote: number) {
    setLiveForecastQuote(nextQuote);
    updateUrl(year, nextQuote);
  }

  const pastOrCurrentResult = isFuture
    ? null
    : year === currentYear
      ? currentYearResult
      : computeTaxCurrentYear(property, statusEntries, extraordinaryCosts, today, undefined, loanDisbursements, year);
  const forecastResult = isFuture ? computeTaxForecastYear(property, year, liveForecastQuote / 100) : null;

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <SectionLabel className="mb-0">Jahresübersicht</SectionLabel>
          {isFuture ? (
            <span className="rounded-[5px] bg-accent/[0.12] px-2 py-[3px] text-[11px] font-bold text-section-label">Prognose</span>
          ) : (
            <span className="rounded-[5px] bg-slate-100 px-2 py-[3px] text-[11px] font-bold text-slate-700">Ist</span>
          )}
        </div>
        <YearPicker year={year} onChange={handleYearChange} minYear={minYear} maxYear={currentYear + 1} />
      </div>
      {isFuture && (
        <div className="mb-3">
          <QuoteSlider label="Leerstandsquote" value={liveForecastQuote} defaultValue={forecastDefaultQuote} onChange={handleQuoteChange} />
        </div>
      )}
      {isFuture ? (
        <ForecastSection result={forecastResult!} hasParking={hasParking} />
      ) : (
        <CurrentYearSection result={pastOrCurrentResult!} hasParking={hasParking} economicTransferDate={economicTransferDate} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `SteuerTab.tsx`, remove "Prognose"**

In `web/components/property/steuer/SteuerTab.tsx`:

Remove the `ForecastSection` import and `forecastYear`/`forecastQuote`/`forecastDefaultQuote`/`forecastResult` state and the whole second `<Card>` (the "Prognose" one, lines 149-161 in the current file). Add the `YearOverviewCard` import and render it in a new `<Card>` where "Prognose" used to be.

Concretely, change:

```ts
import { computeTaxCurrentYear, computeTaxForecastYear } from '@/lib/data/propertyTax';
import type { OverviewMetrics } from '@/lib/data/propertyOverview';
import { CurrentYearSection } from './CurrentYearSection';
import { ForecastSection } from './ForecastSection';
import { AfaBasisCard } from './AfaBasisCard';
```

to:

```ts
import { computeTaxCurrentYear } from '@/lib/data/propertyTax';
import type { OverviewMetrics } from '@/lib/data/propertyOverview';
import { CurrentYearSection } from './CurrentYearSection';
import { YearOverviewCard } from './YearOverviewCard';
import { AfaBasisCard } from './AfaBasisCard';
```

The `SteuerTab` props gain `loanDisbursements` if not already present — it's already there (`loanDisbursements: LoanDisbursementRow[]` is already a prop, used by `currentYearResult`'s computation, confirmed in the current file).

Remove entirely (lines 39, 111-114 in the current file):

```ts
  const [forecastYear, setForecastYear] = useState(currentYear + 1);
```

```ts
  // Prognose-Regler (Zukunftsjahre): Default = Leerstandsquote seit Kauf (Lebenszeit-Schnitt),
  // rein lokaler State — kein anderer Tab braucht diesen Wert.
  const forecastDefaultQuote = overview.actualVacancyRate !== null ? Math.round(overview.actualVacancyRate * 100) : 0;
  const [forecastQuote, setForecastQuote] = useState(forecastDefaultQuote);
```

and (line 128):

```ts
  const forecastResult = computeTaxForecastYear(property, forecastYear, forecastQuote / 100);
```

Replace the second `<Card>` (currently):

```tsx
        <Card className="flex flex-col">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <SectionLabel className="mb-0">Prognose</SectionLabel>
              <span className="rounded-[5px] bg-accent/[0.12] px-2 py-[3px] text-[11px] font-bold text-section-label">Prognose</span>
            </div>
            <YearPicker year={forecastYear} onChange={setForecastYear} minYear={currentYear + 1} />
          </div>
          <div className="mb-3">
            <QuoteSlider label="Leerstandsquote" value={forecastQuote} defaultValue={forecastDefaultQuote} onChange={setForecastQuote} />
          </div>
          <ForecastSection result={forecastResult} hasParking={hasParking} />
        </Card>
```

with:

```tsx
        <Card className="flex flex-col">
          <YearOverviewCard
            property={property}
            statusEntries={statusEntries}
            extraordinaryCosts={extraordinaryCosts}
            loanDisbursements={loanDisbursements}
            today={today}
            overview={overview}
            currentYearResult={currentYearResult}
            economicTransferDate={economicTransferDate}
          />
        </Card>
```

`YearPicker` and `QuoteSlider` imports in `SteuerTab.tsx` stay — still used by the (unchanged) "Laufendes Jahr" card's own slider (`QuoteSlider`) — wait, `YearPicker` was only used by the now-removed "Prognose" card. Remove the now-unused `YearPicker` import (`import { YearPicker } from '@/components/ui/YearPicker';`) — keep `QuoteSlider`, it's still used by "Laufendes Jahr".

- [ ] **Step 3: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: no errors — in particular, no "unused import" (`YearPicker`, `ForecastSection`, `computeTaxForecastYear`, `useState` for the removed forecast state — check `useState` is still used elsewhere in `SteuerTab.tsx` for `liveCurrentYearQuote` etc., so the import itself stays) and no "unused variable" errors in `SteuerTab.tsx`.

- [ ] **Step 4: Lint**

Run: `cd web && npx eslint components/property/steuer/YearOverviewCard.tsx components/property/steuer/SteuerTab.tsx`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add web/components/property/steuer/YearOverviewCard.tsx web/components/property/steuer/SteuerTab.tsx
git commit -m "$(cat <<'EOF'
feat(steuer): replace Prognose card with a past/current/future Jahresübersicht

Reuses the existing CurrentYearSection/ForecastSection rendering as-is
— only the orchestration (year picker, future-year Leerstandsquote
slider synced via prognoseJahr/prognoseQuote, which of the two result
shapes to compute) is new. The current year's row is byte-identical
to the "Laufendes Jahr" card (same computed result object, no second
call). Past years reach the Fall-B interest fix from the previous
commit for the first time in any UI.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Cashflow-Tab — future-year quote wiring, drop the warning

**Files:**
- Modify: `web/components/property/cashflow/CashflowTab.tsx`
- Modify: `web/components/property/cashflow/CashflowYearTable.tsx:268-304`

- [ ] **Step 1: `CashflowTab.tsx` — compute `forecastLeerstandQuote`, read/write `prognoseJahr`**

Change the `year` state initialization (currently `const [year, setYear] = useState(currentYear);`) to read `prognoseJahr` from the URL, mirroring `YearOverviewCard`:

```ts
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentYear = today.getUTCFullYear();
  const prognoseJahrParam = searchParams.get('prognoseJahr');
  const initialYear =
    prognoseJahrParam !== null && Number(prognoseJahrParam) > currentYear && Number(prognoseJahrParam) <= currentYear + 1
      ? Number(prognoseJahrParam)
      : currentYear;
  const [year, setYearState] = useState(initialYear);
```

(`useRouter` needs importing: change `import { useSearchParams } from 'next/navigation';` to `import { useRouter, useSearchParams } from 'next/navigation';`.)

Add a `setYear` wrapper that also updates `prognoseJahr` in the URL (mirroring `YearOverviewCard.handleYearChange`, but Cashflow never sets `prognoseQuote` itself — it has no slider):

```ts
  function setYear(nextYear: number) {
    setYearState(nextYear);
    const params = new URLSearchParams(searchParams.toString());
    if (nextYear > currentYear) {
      params.set('prognoseJahr', String(nextYear));
      params.delete('prognoseQuote'); // Cashflow hat keinen eigenen Regler -> immer Standardannahme
    } else {
      params.delete('prognoseJahr');
      params.delete('prognoseQuote');
    }
    const query = params.toString();
    router.replace(query ? `?${query}` : '?', { scroll: false });
  }
```

Compute the forecast quote to pass into `computeCashflowYearTable` — reads a matching `prognoseQuote` from the URL (set by the Steuer tab's `YearOverviewCard`) if the currently-shown year matches `prognoseJahr`, else the property's default (same `overview.actualVacancyRate` formula `YearOverviewCard` uses):

```ts
  const forecastDefaultQuote = overview.actualVacancyRate !== null ? Math.round(overview.actualVacancyRate * 100) : 0;
  const prognoseQuoteParam = searchParams.get('prognoseQuote');
  const sharedForecastQuote =
    year > currentYear && prognoseJahrParam !== null && Number(prognoseJahrParam) === year && prognoseQuoteParam !== null
      ? Number(prognoseQuoteParam)
      : NaN;
  const forecastLeerstandQuote = Number.isFinite(sharedForecastQuote) ? Math.min(100, Math.max(0, sharedForecastQuote)) / 100 : forecastDefaultQuote / 100;
```

Pass it into the existing `computeCashflowYearTable` call — change:

```ts
  const yearTable = computeCashflowYearTable(property, statusEntries, extraordinaryCosts, year, today, loanDisbursements);
```

to:

```ts
  const yearTable = computeCashflowYearTable(property, statusEntries, extraordinaryCosts, year, today, loanDisbursements, forecastLeerstandQuote);
```

The `<YearPicker year={year} onChange={setYear} minYear={minYear} maxYear={currentYear + 1} />` line is unchanged — `setYear` is now the new wrapper function, same call signature.

- [ ] **Step 2: `CashflowYearTable.tsx` — always render Steuererstattung/CF-nach-Steuern**

Replace (currently `web/components/property/cashflow/CashflowYearTable.tsx:268-304`):

```tsx
            {result.isFutureYear ? (
              <tr>
                <td colSpan={columnCount} className="px-1.5 pt-2 text-[11px] text-warning">
                  ⚠ Steuereffekt für Zukunftsjahre: Muss noch genauer nachgedacht werden wie wir das machen.
                </td>
              </tr>
            ) : (
              <>
                <tr className="text-accent">
                  <td className={`${TD_LABEL} text-accent`}>Steuererstattung Ø / Mon</td>
                  {result.months.map((col) => (
                    <td key={col.month} className={`${TD_VALUE} ${col.isOwned ? 'text-accent' : 'text-text-dim'}`}>
                      {col.isOwned && result.taxEffectMonthly !== null ? formatCurrency(result.taxEffectMonthly) : '–'}
                    </td>
                  ))}
                  <td className={TD_SUMMARY} />
                  <td className={TD_SUMMARY} />
                </tr>
                <tr className="font-bold [&>td]:border-t-2 [&>td]:border-accent/25">
                  <td className={`${TD_LABEL} text-text-primary`}>Cashflow nach Steuern</td>
                  {result.months.map((col) => (
                    <td
                      key={col.month}
                      className={`${TD_VALUE} ${col.cashflowAfterTax !== null ? amountColorClass(col.cashflowAfterTax) : 'text-text-dim'}`}
                    >
                      {col.cashflowAfterTax !== null ? formatCurrency(col.cashflowAfterTax) : '–'}
                    </td>
                  ))}
                  <td className={`${TD_SUMMARY} ${afterTaxAvg !== null ? amountColorClass(afterTaxAvg) : 'text-text-dim'}`}>
                    {afterTaxAvg !== null ? formatCurrency(afterTaxAvg) : '–'}
                  </td>
                  <td className={`${TD_SUMMARY} ${afterTaxTotal !== null ? amountColorClass(afterTaxTotal) : 'text-text-dim'}`}>
                    {afterTaxTotal !== null ? formatCurrency(afterTaxTotal) : '–'}
                  </td>
                </tr>
              </>
            )}
```

with:

```tsx
            <tr className="text-accent">
              <td className={`${TD_LABEL} text-accent`}>Steuererstattung Ø / Mon</td>
              {result.months.map((col) => (
                <td key={col.month} className={`${TD_VALUE} ${col.isOwned ? 'text-accent' : 'text-text-dim'}`}>
                  {col.isOwned && result.taxEffectMonthly !== null ? formatCurrency(result.taxEffectMonthly) : '–'}
                </td>
              ))}
              <td className={TD_SUMMARY} />
              <td className={TD_SUMMARY} />
            </tr>
            <tr className="font-bold [&>td]:border-t-2 [&>td]:border-accent/25">
              <td className={`${TD_LABEL} text-text-primary`}>Cashflow nach Steuern</td>
              {result.months.map((col) => (
                <td
                  key={col.month}
                  className={`${TD_VALUE} ${col.cashflowAfterTax !== null ? amountColorClass(col.cashflowAfterTax) : 'text-text-dim'}`}
                >
                  {col.cashflowAfterTax !== null ? formatCurrency(col.cashflowAfterTax) : '–'}
                </td>
              ))}
              <td className={`${TD_SUMMARY} ${afterTaxAvg !== null ? amountColorClass(afterTaxAvg) : 'text-text-dim'}`}>
                {afterTaxAvg !== null ? formatCurrency(afterTaxAvg) : '–'}
              </td>
              <td className={`${TD_SUMMARY} ${afterTaxTotal !== null ? amountColorClass(afterTaxTotal) : 'text-text-dim'}`}>
                {afterTaxTotal !== null ? formatCurrency(afterTaxTotal) : '–'}
              </td>
            </tr>
```

(`result.isFutureYear` stays used elsewhere in this file for the month-header italics/projection styling — don't remove that, only this one now-dead branch. `columnCount` may become unused if this was its only reference outside the `<CategoryDivider>` calls — check with `grep -n columnCount web/components/property/cashflow/CashflowYearTable.tsx` before assuming; if other usages remain, as expected, leave it.)

- [ ] **Step 3: Type-check and lint**

Run: `cd web && npx tsc --noEmit && npx eslint components/property/cashflow/CashflowTab.tsx components/property/cashflow/CashflowYearTable.tsx`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add web/components/property/cashflow/CashflowTab.tsx web/components/property/cashflow/CashflowYearTable.tsx
git commit -m "$(cat <<'EOF'
feat(cashflow): wire forecastLeerstandQuote, drop future-year warning

Cashflow's Jahresübersicht now reads a shared prognoseJahr/
prognoseQuote from the URL (set by the Steuer tab's Jahresübersicht)
when its own selected year matches, falling back to the property's
default Leerstandsquote otherwise — and always renders the same
Steuererstattung/Cashflow-nach-Steuern rows every other year gets,
instead of the previous future-year placeholder warning.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Verifikation

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `cd web && npx vitest run`
Expected: PASS, every test file.

- [ ] **Step 2: Full type-check**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint the whole touched surface**

Run: `cd web && npx eslint lib/calculations/taxCalculator.ts lib/data/propertyTax.ts lib/data/propertyCashflow.ts components/property/detail/PropertySidebar.tsx components/property/steuer/YearOverviewCard.tsx components/property/steuer/SteuerTab.tsx components/property/cashflow/CashflowTab.tsx components/property/cashflow/CashflowYearTable.tsx`
Expected: no errors.

- [ ] **Step 4: Manual browser check**

Start the dev server and open the Dresden-like property's Steuer tab (`economic_transfer_date` after `loan_start_date`'s year, e.g. transfer 2026-02-01, loan start 2025-10-01):
- "Laufendes Jahr" card unchanged, still shows 2026 Ist with its own Leerstandsquote-Regler.
- New "Jahresübersicht" card: year picker goes back to 2025 (loan-start year) and forward to `currentYear + 1`.
- Selecting 2025 shows real (nonzero) Zinsen/taxableIncome instead of an all-zero result, no Leerstandsquote-Regler shown.
- Selecting the current year shows the exact same numbers as "Laufendes Jahr".
- Selecting a future year shows a Leerstandsquote-Regler and `ForecastSection`'s layout; moving the slider updates the URL's `prognoseQuote`.
- Switch to the Cashflow tab (sidebar link) while a future year + non-default quote is selected in Steuer's Jahresübersicht — Cashflow's own Jahresübersicht should land on that same future year, and if its own year picker still shows that year, its "Steuererstattung"/"Cashflow nach Steuern" rows match what Steuer's Jahresübersicht showed for that quote (no more warning message).
- Navigate Cashflow's Jahresübersicht to a DIFFERENT future year — its Steuererstattung should fall back to the default (lifetime) Leerstandsquote, not the value left over from the other year.
- A property whose `loan_start_date` is on/after `economic_transfer_date` (the common case): "Jahresübersicht" year picker's lower bound is just the transfer year (unchanged from what the old "Prognose" card's forward-only range implied), everything else looks the same as before this branch existed except the future year now has real numbers instead of the warning.

- [ ] **Step 5: Report**

Summarize pass/fail for each of the above; fix and re-run before considering the task done.
