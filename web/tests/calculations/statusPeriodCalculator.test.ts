import { describe, it, expect } from 'vitest';
import { makeDate } from '@/lib/calculations/dateHelpers';
import type { StatusEntry } from '@/lib/calculations/statusPeriodCalculator';
import {
  incomeForMonth,
  leerstandDayFraction,
  ownershipDayFraction,
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
