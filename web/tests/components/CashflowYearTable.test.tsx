// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CashflowYearTable } from '@/components/property/cashflow/CashflowYearTable';
import type { CashflowMonthColumn, CashflowYearTableResult } from '@/lib/data/propertyCashflow';
import type { CashflowLineItems } from '@/lib/calculations/cashflowCalculator';

afterEach(cleanup);

const ZERO_LINE_ITEMS: CashflowLineItems = {
  incomeWE: 0,
  incomeTE: 0,
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

function makeMonth(month: number, overrides: Partial<CashflowMonthColumn> = {}): CashflowMonthColumn {
  return {
    month,
    isProjection: false,
    isOwned: false,
    hasMortgagePayment: false,
    statusLabelsWE: [],
    statusLabelsTE: [],
    lineItems: ZERO_LINE_ITEMS,
    extraordinaryCostRows: [],
    cashflowAfterTax: null,
    ...overrides,
  };
}

/** Parses a de-DE formatted EUR string (e.g. "-1.000,00 €") back into a number. */
function parseCurrency(text: string): number {
  const normalized = text
    .replace(/[^\d,.\-]/g, '') // strip currency symbol / nbsp
    .replace(/\./g, '') // strip thousands separators
    .replace(',', '.'); // decimal comma -> dot
  return Number(normalized);
}

describe('CashflowYearTable — Cashflow nach Steuern Ø/Total reconciliation', () => {
  it('keeps afterTaxAvg * mortgageMonthCount === afterTaxTotal when mortgageMonthCount !== ownershipMonthCount', () => {
    // Models a property whose loan started before its wirtschaftlicher Übergang:
    // 3 months of Kreditrate-only payments, 0 months of ownership in the year.
    const ownershipMonthCount = 0;
    const mortgageMonthCount = 3;
    const taxEffectMonthly = 300;
    const totalCashflowBeforeTax = -3000; // 3 mortgage-only months
    const avgCashflowBeforeTax = totalCashflowBeforeTax / mortgageMonthCount;

    const totalColumn: CashflowLineItems = { ...ZERO_LINE_ITEMS, mortgage: -3000, cashflowBeforeTax: totalCashflowBeforeTax };
    const avgColumn: CashflowLineItems = { ...ZERO_LINE_ITEMS, mortgage: -1000, cashflowBeforeTax: avgCashflowBeforeTax };

    const months: CashflowMonthColumn[] = [
      makeMonth(1, { hasMortgagePayment: true, lineItems: { ...ZERO_LINE_ITEMS, mortgage: -1000, cashflowBeforeTax: -1000 } }),
      makeMonth(2, { hasMortgagePayment: true, lineItems: { ...ZERO_LINE_ITEMS, mortgage: -1000, cashflowBeforeTax: -1000 } }),
      makeMonth(3, { hasMortgagePayment: true, lineItems: { ...ZERO_LINE_ITEMS, mortgage: -1000, cashflowBeforeTax: -1000 } }),
      ...Array.from({ length: 9 }, (_, i) => makeMonth(i + 4)),
    ];

    const result: CashflowYearTableResult = {
      year: 2025,
      isFutureYear: false,
      months,
      ownershipMonthCount,
      mortgageMonthCount,
      avgColumn,
      totalColumn,
      extraordinaryCostsTotalForYear: 0,
      extraordinaryCostsAvgForYear: null,
      extraordinaryCostsEntryCountForYear: 0,
      taxEffectMonthly,
      hoaUnitSplitWarning: false,
      hoaParkingSplitWarning: false,
    };

    render(<CashflowYearTable result={result} hasParking={false} />);

    const row = screen.getByText('Cashflow nach Steuern').closest('tr');
    expect(row).not.toBeNull();
    const cells = row!.querySelectorAll('td');
    // Last two cells of the row are the Ø Mon and Total summary cells.
    const avgText = cells[cells.length - 2].textContent ?? '';
    const totalText = cells[cells.length - 1].textContent ?? '';

    const avg = parseCurrency(avgText);
    const total = parseCurrency(totalText);

    expect(total).toBeCloseTo(totalCashflowBeforeTax + taxEffectMonthly * ownershipMonthCount, 2);
    expect(avg * mortgageMonthCount).toBeCloseTo(total, 2);
  });
});
