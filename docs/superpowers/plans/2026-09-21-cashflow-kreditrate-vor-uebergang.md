# Cashflow: Kreditrate vor wirtschaftlichem Übergang Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Cashflow-Tab's Jahrestabelle shows the "Kreditrate" line (and the "Cashflow vor/nach Steuern" derived from it) starting at `loan_start_date`, even when that's before `economic_transfer_date` — instead of blanking the whole month just because the wirtschaftlicher Übergang hasn't happened yet. All other rows (Einnahmen, Nebenkosten, Steuereffekt) stay exactly as they are today, gated only by `economic_transfer_date`.

**Architecture:** One new derived date (`mortgageStartDate = min(loanStartDate, economicTransferDate)`) and one new per-month day-fraction (`mortgageFraction`, computed with the existing `ownershipDayFraction` helper) feed a new `hasMortgagePayment` flag and a `mortgageMonthCount` counter in `computeCashflowYearTable` (`web/lib/data/propertyCashflow.ts`). Months that aren't yet "owned" but already have an active loan get a line-items object with only `mortgage`/`cashflowBeforeTax` populated (everything else stays 0) instead of the current all-zero object. The Ø/Total summary columns get `mortgage`/`cashflowBeforeTax` divided by `mortgageMonthCount` instead of `ownershipMonthCount`, while every other field keeps the existing divisor. Two UI files (`CashflowYearTable.tsx`, `CashflowTab.tsx`) then just swap one visibility check and widen the year-picker's lower bound — no new UI concepts.

**Tech Stack:** Next.js App Router, TypeScript, Vitest.

**Design doc:** `docs/superpowers/specs/2026-09-21-cashflow-kreditrate-vor-uebergang-design.md`

---

### Task 1: `computeCashflowYearTable` — Kreditrate ab `loan_start_date`

**Files:**
- Modify: `web/lib/data/propertyCashflow.ts:252-261` (`CashflowMonthColumn` interface)
- Modify: `web/lib/data/propertyCashflow.ts:263-276` (`CashflowYearTableResult` interface)
- Modify: `web/lib/data/propertyCashflow.ts:279-391` (`computeCashflowYearTable` function)
- Modify: `web/tests/data/propertyCashflow.test.ts:277-282` (existing test — its expected divisor changes)
- Test: `web/tests/data/propertyCashflow.test.ts` (new `describe` blocks)

- [ ] **Step 1: Write the failing tests**

Add these two new `describe` blocks to the end of `web/tests/data/propertyCashflow.test.ts` (after the last existing block, `computeCashflowForecastMonth / computeCashflowYearTable with disbursementRows`). The file already imports `fixtures as f`, `makeDate`, `computeCashflowYearTable`, and has `makeProperty`/`makeStatusEntry` helpers — reuse them as-is. The default `makeProperty()` fixture already has `economic_transfer_date: '2026-02-01'` and `loan_start_date: '2025-10-01'` (loan starts before the transfer), which is exactly the shape this feature targets.

```ts
describe('computeCashflowYearTable — Kreditrate before economic transfer (loan_start_date earlier)', () => {
  const property = makeProperty(); // economic_transfer_date 2026-02-01, loan_start_date 2025-10-01
  const statusEntries = [makeStatusEntry()];
  const today = makeDate(2026, 6, 15);

  it('a month before economic transfer but after loan_start_date shows the Kreditrate and hasMortgagePayment', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today);
    const january = result.months.find((m) => m.month === 1)!;
    expect(january.isOwned).toBe(false);
    expect(january.hasMortgagePayment).toBe(true);
    expect(january.lineItems.mortgage).toBeCloseTo(f.monthlyMortgage, 2);
    expect(january.lineItems.incomeWE).toBe(0);
  });

  it('cashflowBeforeTax for that month equals -Kreditrate (every other line item is 0)', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today);
    const january = result.months.find((m) => m.month === 1)!;
    expect(january.lineItems.cashflowBeforeTax).toBeCloseTo(-f.monthlyMortgage, 2);
  });

  it('cashflowAfterTax for that month equals cashflowBeforeTax (no tax effect applied pre-ownership)', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today);
    const january = result.months.find((m) => m.month === 1)!;
    expect(january.cashflowAfterTax).toBeCloseTo(january.lineItems.cashflowBeforeTax, 6);
  });

  it('a month before both loan_start_date and economic_transfer_date has no Kreditrate at all', () => {
    const lateLoanProperty = makeProperty({ loan_start_date: '2025-12-15' });
    const result = computeCashflowYearTable(lateLoanProperty, statusEntries, [], 2025, makeDate(2025, 12, 20));
    const november = result.months.find((m) => m.month === 11)!;
    expect(november.hasMortgagePayment).toBe(false);
    expect(november.lineItems.mortgage).toBe(0);
    expect(november.cashflowAfterTax).toBeNull();
  });

  it('when loan_start_date is on/after economic_transfer_date, pre-transfer months are unaffected (unchanged behavior)', () => {
    const lateLoanProperty = makeProperty({ loan_start_date: '2026-02-01' }); // same as transfer
    const result = computeCashflowYearTable(lateLoanProperty, statusEntries, [], 2026, today);
    const january = result.months.find((m) => m.month === 1)!;
    expect(january.hasMortgagePayment).toBe(false);
    expect(january.lineItems.mortgage).toBe(0);
    expect(january.cashflowAfterTax).toBeNull();
  });

  it('a mid-month loan start prorates the first Kreditrate month by day fraction', () => {
    // loan starts 2025-12-16 -> December has 31 days, owned days 16-31 = 16 days -> 16/31
    const midMonthLoanProperty = makeProperty({ loan_start_date: '2025-12-16' });
    const result = computeCashflowYearTable(midMonthLoanProperty, statusEntries, [], 2025, makeDate(2025, 12, 20));
    const december = result.months.find((m) => m.month === 12)!;
    const expectedFraction = (31 - 16 + 1) / 31;
    expect(december.lineItems.mortgage).toBeCloseTo(f.monthlyMortgage * expectedFraction, 4);
  });

  it('owned months are unaffected — isOwned, hasMortgagePayment and the mortgage amount stay as before', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today);
    const june = result.months.find((m) => m.month === 6)!;
    expect(june.isOwned).toBe(true);
    expect(june.hasMortgagePayment).toBe(true);
    expect(june.lineItems.mortgage).toBeCloseTo(f.monthlyMortgage, 2);
  });
});

describe('computeCashflowYearTable — Ø/Total include pre-ownership Kreditrate months', () => {
  const property = makeProperty(); // economic_transfer_date 2026-02-01, loan_start_date 2025-10-01
  const statusEntries = [makeStatusEntry()];
  const today = makeDate(2026, 6, 15);

  it('mortgageMonthCount is 12 when the loan already covered the whole year', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today);
    expect(result.mortgageMonthCount).toBeCloseTo(12, 4);
  });

  it("totalColumn.mortgage includes January's pre-ownership Kreditrate on top of the 11 owned months", () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today);
    expect(result.totalColumn!.mortgage).toBeCloseTo(f.monthlyMortgage * 12, 2);
  });

  it('avgColumn.mortgage divides by mortgageMonthCount (12), not ownershipMonthCount (11)', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today);
    expect(result.avgColumn!.mortgage).toBeCloseTo(f.monthlyMortgage, 2);
  });

  it('avgColumn.cashflowBeforeTax also divides by mortgageMonthCount', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today);
    expect(result.avgColumn!.cashflowBeforeTax).toBeCloseTo(result.totalColumn!.cashflowBeforeTax / result.mortgageMonthCount, 4);
  });

  it('non-mortgage fields in avgColumn still divide by ownershipMonthCount, unaffected', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today);
    expect(result.avgColumn!.incomeWE).toBeCloseTo(f.coldRentMonthly, 2);
  });

  it('a year entirely before the transfer, but with the loan already running, still produces a non-null avg/total for Kreditrate + CF vor Steuern', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2025, makeDate(2025, 12, 20));
    expect(result.ownershipMonthCount).toBe(0);
    expect(result.mortgageMonthCount).toBeCloseTo(3, 4); // Oct, Nov, Dec 2025
    expect(result.totalColumn).not.toBeNull();
    expect(result.totalColumn!.mortgage).toBeCloseTo(f.monthlyMortgage * 3, 2);
    expect(result.totalColumn!.cashflowBeforeTax).toBeCloseTo(-f.monthlyMortgage * 3, 2);
    expect(result.totalColumn!.incomeWE).toBe(0); // zero ownership months that year
    expect(result.avgColumn!.mortgage).toBeCloseTo(f.monthlyMortgage, 2);
  });

  it('a year with neither ownership nor an active loan still returns null avg/total (unchanged)', () => {
    const neverStartedProperty = makeProperty({ loan_start_date: '2027-01-01' });
    const result = computeCashflowYearTable(neverStartedProperty, statusEntries, [], 2025, makeDate(2025, 6, 15));
    expect(result.ownershipMonthCount).toBe(0);
    expect(result.mortgageMonthCount).toBe(0);
    expect(result.totalColumn).toBeNull();
    expect(result.avgColumn).toBeNull();
  });
});
```

Now update the existing test that this change intentionally breaks — replace it (same `describe('computeCashflowYearTable', ...)` block, currently at `web/tests/data/propertyCashflow.test.ts:277-282`):

```ts
  it('totalColumn sums cashflowBeforeTax across owned months; avgColumn divides by ownershipMonthCount', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today);
    expect(result.totalColumn).not.toBeNull();
    expect(result.avgColumn).not.toBeNull();
    expect(result.avgColumn!.cashflowBeforeTax).toBeCloseTo(result.totalColumn!.cashflowBeforeTax / result.ownershipMonthCount, 4);
  });
```

with:

```ts
  it('totalColumn sums cashflowBeforeTax across owned + pre-ownership Kreditrate months; avgColumn divides it by mortgageMonthCount', () => {
    const result = computeCashflowYearTable(property, statusEntries, [], 2026, today);
    expect(result.totalColumn).not.toBeNull();
    expect(result.avgColumn).not.toBeNull();
    expect(result.avgColumn!.cashflowBeforeTax).toBeCloseTo(result.totalColumn!.cashflowBeforeTax / result.mortgageMonthCount, 4);
  });
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `cd web && npx vitest run tests/data/propertyCashflow.test.ts`
Expected: FAIL — `hasMortgagePayment`/`mortgageMonthCount` don't exist yet (TypeScript errors) or assertions fail (e.g. `january.lineItems.mortgage` is `0`, not `1242.85`).

- [ ] **Step 3: Implement**

In `web/lib/data/propertyCashflow.ts`, add `hasMortgagePayment: boolean;` to `CashflowMonthColumn` (right after `isOwned: boolean;`, line 255):

```ts
export interface CashflowMonthColumn {
  month: number;
  isProjection: boolean;
  isOwned: boolean;
  hasMortgagePayment: boolean;
  statusLabelsWE: PropertyStatus[];
  statusLabelsTE: PropertyStatus[];
  lineItems: CashflowLineItems;
  extraordinaryCostRows: ExtraordinaryCostRow[];
  cashflowAfterTax: number | null;
}
```

Add `mortgageMonthCount: number;` to `CashflowYearTableResult` (right after `ownershipMonthCount: number;`, line 267):

```ts
export interface CashflowYearTableResult {
  year: number;
  isFutureYear: boolean;
  months: CashflowMonthColumn[];
  ownershipMonthCount: number;
  mortgageMonthCount: number;
  avgColumn: CashflowLineItems | null;
  totalColumn: CashflowLineItems | null;
  extraordinaryCostsTotalForYear: number;
  extraordinaryCostsAvgForYear: number | null;
  extraordinaryCostsEntryCountForYear: number;
  taxEffectMonthly: number | null;
  hoaUnitSplitWarning: boolean;
  hoaParkingSplitWarning: boolean;
}
```

Replace the whole `computeCashflowYearTable` function body (lines 279-391) with:

```ts
export function computeCashflowYearTable(
  property: PropertyRow,
  statusEntryRows: StatusEntryRow[],
  extraordinaryCostRows: ExtraordinaryCostRow[],
  year: number,
  today: Date = new Date(),
  disbursementRows: LoanDisbursementRow[] = []
): CashflowYearTableResult {
  const { wohnung: statusHistory, stellplatz: stellplatzStatusHistory } = toUnitStatusHistories(statusEntryRows);
  const economicTransferDate = new Date(property.economic_transfer_date + 'T00:00:00Z');
  const loanStartDate = new Date(property.loan_start_date + 'T00:00:00Z');
  // Kreditrate starts as soon as the loan does, even before the wirtschaftlicher Übergang —
  // every other line item stays gated by economicTransferDate. See
  // docs/superpowers/specs/2026-09-21-cashflow-kreditrate-vor-uebergang-design.md.
  const mortgageStartDate = loanStartDate.getTime() < economicTransferDate.getTime() ? loanStartDate : economicTransferDate;
  const currentYear = today.getUTCFullYear();
  const isFutureYear = year > currentYear;

  const hoaFeeNonRecoverableMonthly = hoaNonRecoverableMonthly(
    property.hoa_fee_total_monthly,
    property.hoa_fee_recoverable_monthly,
    property.hoa_fee_maintenance_reserve_monthly
  );
  const hoaFeeParkingNonRecoverableMonthly = hoaNonRecoverableMonthly(
    property.hoa_fee_parking_total_monthly,
    property.hoa_fee_parking_recoverable_monthly,
    property.hoa_fee_parking_maintenance_reserve_monthly
  );

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
    today,
    undefined,
    disbursementRows
  );

  const months: CashflowMonthColumn[] = [];
  let ownershipMonthCount = 0;
  let mortgageMonthCount = 0;
  let preOwnershipMortgageTotal = 0;
  let sumLineItems = ZERO_LINE_ITEMS;

  for (let m = 1; m <= 12; m++) {
    const monthDate = makeDate(year, m, 1);
    const ownerFraction = ownershipDayFraction(monthDate, economicTransferDate);
    // Only used on the pre-ownership branch below — once a month is owned, its mortgage
    // stays tied to ownerFraction exactly as before (a deliberate simplification for the
    // rare case a mid-month transfer falls after mortgageStartDate; see the design doc).
    const mortgageFraction = ownershipDayFraction(monthDate, mortgageStartDate);
    const key = `${year}-${String(m).padStart(2, '0')}`;
    const monthCostRows = extraordinaryCostsByMonth.get(key) ?? [];
    const extraordinaryCostsThisMonth = monthCostRows.reduce((sum, row) => sum + row.amount, 0);

    if (ownerFraction <= 0) {
      const hasMortgagePayment = mortgageFraction > 0;
      const mortgageAmount = property.monthly_mortgage * mortgageFraction;
      mortgageMonthCount += mortgageFraction;
      if (hasMortgagePayment) preOwnershipMortgageTotal += mortgageAmount;

      months.push({
        month: m,
        isProjection: monthDate.getTime() > firstDayOfMonth(today).getTime(),
        isOwned: false,
        hasMortgagePayment,
        statusLabelsWE: [],
        statusLabelsTE: [],
        lineItems: hasMortgagePayment
          ? { ...ZERO_LINE_ITEMS, mortgage: mortgageAmount, cashflowBeforeTax: -mortgageAmount }
          : ZERO_LINE_ITEMS,
        extraordinaryCostRows: monthCostRows,
        cashflowAfterTax: hasMortgagePayment && !isFutureYear ? -mortgageAmount : null,
      });
      continue;
    }

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
      cashflowAfterTax: isFutureYear ? null : lineItems.cashflowBeforeTax + currentYearTaxEffectMonthly,
    });
  }

  const yearCostRows = extraordinaryCostRows.filter((row) => row.cost_month.slice(0, 4) === String(year));
  const extraordinaryCostsTotalForYear = yearCostRows.reduce((sum, row) => sum + row.amount, 0);
  const extraordinaryCostsEntryCountForYear = yearCostRows.length;

  const hasAnyColumn = ownershipMonthCount > 0 || mortgageMonthCount > 0;
  const totalColumn: CashflowLineItems | null = hasAnyColumn
    ? {
        ...sumLineItems,
        mortgage: sumLineItems.mortgage + preOwnershipMortgageTotal,
        cashflowBeforeTax: sumLineItems.cashflowBeforeTax - preOwnershipMortgageTotal,
      }
    : null;
  const avgColumn: CashflowLineItems | null = hasAnyColumn
    ? {
        ...(ownershipMonthCount > 0 ? divideLineItems(sumLineItems, ownershipMonthCount) : ZERO_LINE_ITEMS),
        mortgage: mortgageMonthCount > 0 ? totalColumn!.mortgage / mortgageMonthCount : 0,
        cashflowBeforeTax: mortgageMonthCount > 0 ? totalColumn!.cashflowBeforeTax / mortgageMonthCount : 0,
      }
    : null;

  return {
    year,
    isFutureYear,
    months,
    ownershipMonthCount,
    mortgageMonthCount,
    avgColumn,
    totalColumn,
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

- [ ] **Step 4: Run the tests and verify they pass**

Run: `cd web && npx vitest run tests/data/propertyCashflow.test.ts`
Expected: PASS — all tests in the file, old and new.

- [ ] **Step 5: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: no new errors (the two UI files aren't updated yet — Task 2/3 fix their now-outdated usage of `CashflowMonthColumn`/`CashflowYearTableResult` if `tsc` flags anything there; if it does, note it and continue, Task 2/3 resolve it).

- [ ] **Step 6: Commit**

```bash
git add web/lib/data/propertyCashflow.ts web/tests/data/propertyCashflow.test.ts
git commit -m "$(cat <<'EOF'
feat(cashflow): show Kreditrate from loan_start_date, even before wirtschaftlichem Übergang

Kreditrate (and the CF vor/nach Steuern derived from it) now starts as
soon as the loan does, instead of waiting for economic_transfer_date.
Every other line item stays gated by the transfer date, unchanged. Ø/
Total for Kreditrate and CF vor Steuern now divide by the new
mortgageMonthCount instead of ownershipMonthCount, so a year entirely
before the transfer (but with the loan already running) still shows a
correct Kreditrate total instead of blank dashes.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `CashflowYearTable.tsx` — Kreditrate/CF vor Steuern sichtbar bei `hasMortgagePayment`

**Files:**
- Modify: `web/components/property/cashflow/CashflowYearTable.tsx`

No automated tests exist for this component (confirmed: no `CashflowYearTable`/`CashflowTab` test files in `web/tests/`) — Task 1's data-layer tests are what actually verify the numbers; this task only changes which of those numbers get displayed vs. blanked with "–". Verified visually in Task 4.

- [ ] **Step 1: Add an optional `visible` check to `RowDef` and use it in `DataRow`**

In `web/components/property/cashflow/CashflowYearTable.tsx`, change the `RowDef` interface (currently):

```ts
interface RowDef {
  label: string;
  select: (items: CashflowLineItems) => number;
  sign: -1 | 1;
}
```

to:

```ts
interface RowDef {
  label: string;
  select: (items: CashflowLineItems) => number;
  sign: -1 | 1;
  /** Defaults to `col.isOwned` when omitted — see the Kreditrate row below for the one override. */
  visible?: (col: CashflowMonthColumn) => boolean;
}
```

Change the `top` array inside `buildRowGroups` (currently `const top: RowDef[] = [{ label: 'Kreditrate', select: (i) => i.mortgage, sign: -1 }];`) to:

```ts
  const top: RowDef[] = [{ label: 'Kreditrate', select: (i) => i.mortgage, sign: -1, visible: (col) => col.hasMortgagePayment }];
```

Change `DataRow` (currently uses `col.isOwned` directly) to use the new per-row check:

```ts
function DataRow({
  row,
  months,
  avgColumn,
  totalColumn,
}: {
  row: RowDef;
  months: CashflowMonthColumn[];
  avgColumn: CashflowLineItems | null;
  totalColumn: CashflowLineItems | null;
}) {
  return (
    <tr>
      <td className={TD_LABEL}>{row.label}</td>
      {months.map((col) => {
        const value = row.sign * row.select(col.lineItems);
        const isVisible = row.visible ? row.visible(col) : col.isOwned;
        return (
          <td key={col.month} className={`${TD_VALUE} ${isVisible ? amountColorClass(value) : 'text-text-dim'}`}>
            {isVisible ? formatCurrency(value) : '–'}
          </td>
        );
      })}
      <SummaryCell items={avgColumn} select={row.select} sign={row.sign} />
      <SummaryCell items={totalColumn} select={row.select} sign={row.sign} />
    </tr>
  );
}
```

- [ ] **Step 2: Make "Cashflow vor Steuern" use the same check**

Find this block (the hand-rolled "Cashflow vor Steuern" row, not part of `buildRowGroups`):

```tsx
            <tr className="font-bold [&>td]:border-t-2 [&>td]:border-accent/25">
              <td className={`${TD_LABEL} text-text-primary`}>Cashflow vor Steuern</td>
              {result.months.map((col) => (
                <td key={col.month} className={`${TD_VALUE} ${col.isOwned ? amountColorClass(col.lineItems.cashflowBeforeTax) : 'text-text-dim'}`}>
                  {col.isOwned ? formatCurrency(col.lineItems.cashflowBeforeTax) : '–'}
                </td>
              ))}
              <SummaryCell items={result.avgColumn} select={(i) => i.cashflowBeforeTax} />
              <SummaryCell items={result.totalColumn} select={(i) => i.cashflowBeforeTax} />
            </tr>
```

Replace the two `col.isOwned` checks with `col.hasMortgagePayment`:

```tsx
            <tr className="font-bold [&>td]:border-t-2 [&>td]:border-accent/25">
              <td className={`${TD_LABEL} text-text-primary`}>Cashflow vor Steuern</td>
              {result.months.map((col) => (
                <td key={col.month} className={`${TD_VALUE} ${col.hasMortgagePayment ? amountColorClass(col.lineItems.cashflowBeforeTax) : 'text-text-dim'}`}>
                  {col.hasMortgagePayment ? formatCurrency(col.lineItems.cashflowBeforeTax) : '–'}
                </td>
              ))}
              <SummaryCell items={result.avgColumn} select={(i) => i.cashflowBeforeTax} />
              <SummaryCell items={result.totalColumn} select={(i) => i.cashflowBeforeTax} />
            </tr>
```

Leave the "Steuererstattung Ø / Mon" row and the "Cashflow nach Steuern" row exactly as they are — both already work correctly:
- "Steuererstattung Ø / Mon" already checks `col.isOwned` (stays "–" for pre-ownership months — correct, no tax effect applies there).
- "Cashflow nach Steuern" already checks `col.cashflowAfterTax !== null` (Task 1 already made that non-null for `hasMortgagePayment`-only months, equal to `cashflowBeforeTax`).

- [ ] **Step 3: Update the footer hint text**

Find:

```tsx
      <p className="mt-3 text-[11px] text-text-dim">
        <span className="italic">Kursive Monate</span> = projiziert · Ø und Total über Eigentumsmonate
      </p>
```

Replace with:

```tsx
      <p className="mt-3 text-[11px] text-text-dim">
        <span className="italic">Kursive Monate</span> = projiziert · Ø und Total über Eigentums- bzw. Kreditmonate
      </p>
```

- [ ] **Step 4: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add web/components/property/cashflow/CashflowYearTable.tsx
git commit -m "$(cat <<'EOF'
feat(cashflow): display Kreditrate/CF vor Steuern before wirtschaftlichem Übergang

Kreditrate and Cashflow-vor-Steuern now use hasMortgagePayment instead
of isOwned to decide whether to show a value or "–", so a month with
an already-running loan but no ownership yet shows its real Kreditrate
instead of a blank dash. Steuererstattung and Cashflow-nach-Steuern
were already correct as-is.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `CashflowTab.tsx` — Jahr-Picker erlaubt Jahre ab Darlehensbeginn

**Files:**
- Modify: `web/components/property/cashflow/CashflowTab.tsx:59-60`

- [ ] **Step 1: Widen `minYear`**

Find:

```ts
  const economicTransferDate = new Date(property.economic_transfer_date + 'T00:00:00Z');
  const minYear = economicTransferDate.getUTCFullYear();
```

Replace with:

```ts
  const economicTransferDate = new Date(property.economic_transfer_date + 'T00:00:00Z');
  const loanStartDate = new Date(property.loan_start_date + 'T00:00:00Z');
  // A year picker lower bound of just the transfer year would hide a year where the loan
  // was already running (Kreditrate) but ownership hadn't transferred yet.
  const minYear = Math.min(economicTransferDate.getUTCFullYear(), loanStartDate.getUTCFullYear());
```

- [ ] **Step 2: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/components/property/cashflow/CashflowTab.tsx
git commit -m "$(cat <<'EOF'
feat(cashflow): widen Jahr-Picker lower bound to loan_start_date's year

A property whose loan started the calendar year before the
wirtschaftliche Übergang couldn't have that earlier year selected at
all, hiding its Kreditrate-only months entirely.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Verifikation

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `cd web && npx vitest run`
Expected: PASS, no failing/skipped tests anywhere in the suite. `computeCashflowYearTable` has exactly one caller outside its own test file (`CashflowTab.tsx`) and one test file (`tests/data/propertyCashflow.test.ts`) — confirmed via `grep -rln computeCashflowYearTable web` — so this full-suite run is mainly a safety net, not expected to surface anything Task 1 didn't already catch.

- [ ] **Step 2: Full type-check**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `cd web && npx eslint lib/data/propertyCashflow.ts components/property/cashflow/CashflowYearTable.tsx components/property/cashflow/CashflowTab.tsx`
Expected: no errors.

- [ ] **Step 4: Manual browser check**

Start the dev server (`cd web && npm run dev`, or via the project's usual preview tooling) and open a property's Cashflow tab whose `loan_start_date` is before its `economic_transfer_date` — the Dresden property discussed while designing this (`economic_transfer_date` 01.02.2026, `loan_start_date` 01.12.2025) is a real example. Check:
- January 2026 (and, after selecting the 2025 year, November/December 2025) show a real Kreditrate value and a real "Cashflow vor Steuern" value, not "–".
- "Steuererstattung Ø / Mon" and "Cashflow nach Steuern" for those same months: Steuererstattung stays "–", Cashflow nach Steuern shows the same value as Cashflow vor Steuern.
- Einnahmen and every Kosten-row for those months still show "–" (unaffected).
- The Ø/Total columns for Kreditrate and Cashflow vor Steuern look sane (roughly `monthly_mortgage` for Ø, once every month of the shown year has a running loan).
- The year picker now allows navigating to 2025 for this property.
- A property whose `loan_start_date` is on/after `economic_transfer_date` (the common case) looks byte-identical to before this change.

- [ ] **Step 5: Report**

Summarize pass/fail for each of the above; fix and re-run before considering the task done.
