import { describe, it, expect } from 'vitest';
import { makeDate } from '@/lib/calculations/dateHelpers';
import type { StatusEntry } from '@/lib/calculations/statusPeriodCalculator';
import {
  incomeForMonth,
  leerstandDayFraction,
  ownershipDayFraction,
  ownershipAndVacancyDaysSinceTransfer,
  dominantStatusForMonth,
} from '@/lib/calculations/statusPeriodCalculator';

function entry(status: StatusEntry['status'], y: number, m: number, d = 1, income: number | null = null): StatusEntry {
  return { date: makeDate(y, m, d), status, incomeActualMonthly: income };
}

describe('statusPeriodCalculator', () => {
  const today = makeDate(2026, 12, 1);

  it('incomeForMonth: fully vermietet', () => {
    const history = [entry('vermietet', 2026, 2)];
    const result = incomeForMonth(makeDate(2026, 6, 1), history, today, 950, 48);
    expect(result).toBeCloseTo(998.0, 2);
  });

  it('incomeForMonth: fully leerstand is zero', () => {
    const history = [entry('leerstand', 2026, 2)];
    const result = incomeForMonth(makeDate(2026, 6, 1), history, today, 950, 48);
    expect(result).toBeCloseTo(0, 2);
  });

  it('incomeForMonth: mietgarantie uses the entry income, not settings', () => {
    const history = [entry('mietgarantie', 2026, 2, 1, 999)];
    const result = incomeForMonth(makeDate(2026, 6, 1), history, today, 950, 48);
    expect(result).toBeCloseTo(999.0, 2);
  });

  it('incomeForMonth: mid-month transition leerstand -> vermietet (30-day month)', () => {
    const history = [entry('leerstand', 2026, 2), entry('vermietet', 2026, 6, 16)];
    const result = incomeForMonth(makeDate(2026, 6, 1), history, today, 950, 48);
    // vermietet 15/30 days: 998 * 15/30 = 499.00
    expect(result).toBeCloseTo(998.0 * (15 / 30), 2);
  });

  it('incomeForMonth: future month projects the last known status', () => {
    const history = [entry('vermietet', 2026, 2)];
    const result = incomeForMonth(makeDate(2026, 12, 1), history, makeDate(2026, 6, 1), 950, 48);
    expect(result).toBeCloseTo(998.0, 2);
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
});

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

  it('sums day-fractions across non-adjacent segments of the same status (not just the largest single segment)', () => {
    // 30-day June: vermietet days 1-5 (5), leerstand days 6-19 (14), vermietet days 20-30 (11).
    // vermietet totals 16 days vs leerstand's 14 -> vermietet wins, even though no single
    // vermietet segment individually exceeds the 14-day leerstand block.
    const history = [
      entry('vermietet', 2026, 6, 1),
      entry('leerstand', 2026, 6, 6),
      entry('vermietet', 2026, 6, 20),
    ];
    const result = dominantStatusForMonth(makeDate(2026, 6, 1), history, today);
    expect(result).toBe('vermietet');
  });
});
