import { describe, it, expect } from 'vitest';
import { makeDate } from '@/lib/calculations/dateHelpers';
import type { StatusEntry } from '@/lib/calculations/statusPeriodCalculator';
import {
  incomeForUnit,
  leerstandDayFraction,
  genuineVacancyDayFraction,
  ownershipDayFraction,
  ownershipAndVacancyDaysSinceTransfer,
  statusesForMonth,
} from '@/lib/calculations/statusPeriodCalculator';

function entry(status: StatusEntry['status'], y: number, m: number, d = 1, income: number | null = null): StatusEntry {
  return { date: makeDate(y, m, d), status, incomeActualMonthly: income };
}

function fixedEntry(
  y: number,
  m: number,
  d: number,
  income: number,
  endY: number,
  endM: number,
  endD: number
): StatusEntry {
  return {
    date: makeDate(y, m, d),
    status: 'mietgarantie',
    incomeActualMonthly: income,
    isFixedAmount: true,
    periodEndDate: makeDate(endY, endM, endD),
  };
}

describe('statusPeriodCalculator', () => {
  const today = makeDate(2026, 12, 1);

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

  it('leerstandDayFraction: half the month vacant', () => {
    const history = [entry('leerstand', 2026, 2), entry('vermietet', 2026, 6, 16)];
    const result = leerstandDayFraction(makeDate(2026, 6, 1), history, today);
    expect(result).toBeCloseTo(15 / 30, 4);
  });

  it('leerstandDayFraction: fully vermietet is zero', () => {
    const history = [entry('vermietet', 2026, 2)];
    const result = leerstandDayFraction(makeDate(2026, 6, 1), history, today);
    expect(result).toBeCloseTo(0, 4);
  });

  it('leerstandDayFraction: mietgarantie counts as not-vermietet (owner-cost-bearing semantics)', () => {
    const history = [entry('mietgarantie', 2026, 2, 1, 999)];
    const result = leerstandDayFraction(makeDate(2026, 6, 1), history, today);
    expect(result).toBeCloseTo(1, 4);
  });

  it('genuineVacancyDayFraction: fully leerstand is 1', () => {
    const history = [entry('leerstand', 2026, 2)];
    const result = genuineVacancyDayFraction(makeDate(2026, 6, 1), history, today);
    expect(result).toBeCloseTo(1, 4);
  });

  it('genuineVacancyDayFraction: fully vermietet is zero', () => {
    const history = [entry('vermietet', 2026, 2)];
    const result = genuineVacancyDayFraction(makeDate(2026, 6, 1), history, today);
    expect(result).toBeCloseTo(0, 4);
  });

  it('genuineVacancyDayFraction: mietgarantie is NOT counted as vacancy, unlike leerstandDayFraction', () => {
    const history = [entry('mietgarantie', 2026, 2, 1, 999)];
    const result = genuineVacancyDayFraction(makeDate(2026, 6, 1), history, today);
    expect(result).toBeCloseTo(0, 4);
  });

  it('genuineVacancyDayFraction: mixed month — only the leerstand portion counts, not the mietgarantie portion', () => {
    const history = [entry('leerstand', 2026, 2), entry('mietgarantie', 2026, 6, 16, 999)];
    const result = genuineVacancyDayFraction(makeDate(2026, 6, 1), history, today);
    // leerstand for the first 15 of 30 days, mietgarantie for the rest -> only 15/30 counts
    expect(result).toBeCloseTo(15 / 30, 4);
  });

  it('ownershipDayFraction: acquisition mid-month (Feb 15, 28-day month)', () => {
    // 14 days owned out of 28 (Feb 15-28 inclusive)
    const result = ownershipDayFraction(makeDate(2026, 2, 1), makeDate(2026, 2, 15));
    expect(result).toBeCloseTo(14 / 28, 4);
  });

  it('ownershipDayFraction: full month after acquisition', () => {
    const result = ownershipDayFraction(makeDate(2026, 3, 1), makeDate(2026, 2, 1));
    expect(result).toBeCloseTo(1, 4);
  });

  it('ownershipDayFraction: month before acquisition is zero', () => {
    const result = ownershipDayFraction(makeDate(2026, 1, 1), makeDate(2026, 2, 1));
    expect(result).toBeCloseTo(0, 4);
  });
});

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

  it('mietgarantie days do NOT count as leerstandDays — only genuine leerstand does', () => {
    // Jan: leerstand (31 days). Feb: mietgarantie (28 days) -> guaranteed rent flows, not vacancy.
    const history = [entry('leerstand', 2026, 1, 1), entry('mietgarantie', 2026, 2, 1, 999)];
    const result = ownershipAndVacancyDaysSinceTransfer(history, makeDate(2026, 1, 1), makeDate(2026, 2, 28));
    expect(result.ownershipDays).toBe(31 + 28);
    expect(result.leerstandDays).toBe(31);
  });
});

describe('statusesForMonth', () => {
  const today = makeDate(2026, 12, 31);

  it('a mixed month returns every distinct status, in chronological order', () => {
    // Jun 1-9 leerstand, Jun 10-30 vermietet -> both should show up, leerstand first.
    const history = [entry('leerstand', 2026, 1, 1), entry('vermietet', 2026, 6, 10)];
    const result = statusesForMonth(makeDate(2026, 6, 1), history, today);
    expect(result).toEqual(['leerstand', 'vermietet']);
  });

  it('a fully vermietet month returns just vermietet', () => {
    const history = [entry('vermietet', 2026, 2, 1)];
    const result = statusesForMonth(makeDate(2026, 6, 1), history, today);
    expect(result).toEqual(['vermietet']);
  });

  it('no status history at all defaults to leerstand (single full-month segment)', () => {
    const result = statusesForMonth(makeDate(2026, 6, 1), [], today);
    expect(result).toEqual(['leerstand']);
  });

  it('a status that recurs in non-adjacent segments is only listed once', () => {
    // 30-day June: vermietet days 1-5, leerstand days 6-19, vermietet days 20-30 again.
    const history = [
      entry('vermietet', 2026, 6, 1),
      entry('leerstand', 2026, 6, 6),
      entry('vermietet', 2026, 6, 20),
    ];
    const result = statusesForMonth(makeDate(2026, 6, 1), history, today);
    expect(result).toEqual(['vermietet', 'leerstand']);
  });

  it('vermietet transitioning into mietgarantie mid-month returns both, matching the yearly-overview badge requirement', () => {
    const history = [entry('vermietet', 2026, 5, 1), entry('mietgarantie', 2026, 6, 16, 511.2)];
    const result = statusesForMonth(makeDate(2026, 6, 1), history, today);
    expect(result).toEqual(['vermietet', 'mietgarantie']);
  });
});
