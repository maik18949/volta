import { describe, it, expect } from 'vitest';
import { fixtures as f } from './fixtures';
import { makeDate } from '@/lib/calculations/dateHelpers';
import {
  monthlyMortgageCalc,
  remainingDebt,
  amortizationSchedule,
  interestForCalendarYear,
} from '@/lib/calculations/amortizationCalculator';

describe('amortizationCalculator', () => {
  it('monthlyMortgageCalc: interest + principal components', () => {
    // interest: 230000 * 0.043/12 = 824.17, principal: 230000 * 0.01/12 = 191.67
    const result = monthlyMortgageCalc(f.loanAmount, f.interestRate, f.amortizationRate);
    expect(result).toBeCloseTo(1_015.83, 1);
  });

  it('remainingDebt at month 0 equals loanAmount', () => {
    const result = remainingDebt(f.loanAmount, f.interestRate, f.monthlyMortgage, 0);
    expect(result).toBeCloseTo(f.loanAmount, 1);
  });

  it('remainingDebt at month 1', () => {
    // 230000 * (1 + 0.043/12) - 1242.85 = 229581.32
    const result = remainingDebt(f.loanAmount, f.interestRate, f.monthlyMortgage, 1);
    expect(result).toBeCloseTo(229_581.32, 0);
  });

  it('remainingDebt decreases over time', () => {
    const r0 = remainingDebt(f.loanAmount, f.interestRate, f.monthlyMortgage, 0);
    const r12 = remainingDebt(f.loanAmount, f.interestRate, f.monthlyMortgage, 12);
    expect(r12).toBeLessThan(r0);
  });

  it('amortizationSchedule: first row starts at loanAmount', () => {
    const schedule = amortizationSchedule(f.loanAmount, f.interestRate, f.monthlyMortgage, f.loanStartDate, 12);
    expect(schedule).toHaveLength(12);
    expect(schedule[0].remainingDebt).toBeCloseTo(f.loanAmount - schedule[0].principal, 0);
  });

  it('amortizationSchedule: interest + principal always equal payment', () => {
    const schedule = amortizationSchedule(f.loanAmount, f.interestRate, f.monthlyMortgage, f.loanStartDate, 6);
    for (const row of schedule) {
      expect(row.interest + row.principal).toBeCloseTo(row.payment, 1);
    }
  });

  it('interestForCalendarYear: 2025, three months (Oct-Dec)', () => {
    const result = interestForCalendarYear(2025, f.loanStartDate, f.loanAmount, f.interestRate, f.monthlyMortgage);
    expect(result).toBeCloseTo(2467.99, 0);
  });

  it('interestForCalendarYear: 2026, full year', () => {
    const result = interestForCalendarYear(2026, f.loanStartDate, f.loanAmount, f.interestRate, f.monthlyMortgage);
    expect(result).toBeCloseTo(9734.81, 0);
  });

  it('interestForCalendarYear: before loanStartDate is zero', () => {
    const result = interestForCalendarYear(2024, f.loanStartDate, f.loanAmount, f.interestRate, f.monthlyMortgage);
    expect(result).toBe(0);
  });

  describe('payoff handling (regression)', () => {
    // The real fixture loan (230000 @ 4.3% with the fixed 1242.85 payment,
    // i.e. ~1% Tilgung) fully amortizes around month 305 (~Feb 2051) — a
    // realistic 30+ year German mortgage holding period. A window that runs
    // well past that must not let the balance (and therefore interest) go
    // negative once the loan is paid off.
    const PAYOFF_WINDOW_MONTHS = 320;

    it('amortizationSchedule: no negative interest or remainingDebt once the loan is paid off', () => {
      const schedule = amortizationSchedule(
        f.loanAmount,
        f.interestRate,
        f.monthlyMortgage,
        f.loanStartDate,
        PAYOFF_WINDOW_MONTHS
      );
      expect(schedule).toHaveLength(PAYOFF_WINDOW_MONTHS);
      for (const row of schedule) {
        expect(row.interest).toBeGreaterThanOrEqual(0);
        expect(row.remainingDebt).toBeGreaterThanOrEqual(0);
      }
      // Confirm the window actually reaches payoff (last row is zeroed out),
      // otherwise this test wouldn't be exercising the bug at all.
      expect(schedule[schedule.length - 1]).toMatchObject({
        interest: 0,
        principal: 0,
        payment: 0,
        remainingDebt: 0,
      });
    });

    it('amortizationSchedule: total principal across a full schedule never exceeds loanAmount', () => {
      const schedule = amortizationSchedule(
        f.loanAmount,
        f.interestRate,
        f.monthlyMortgage,
        f.loanStartDate,
        PAYOFF_WINDOW_MONTHS
      );
      const totalPrincipal = schedule.reduce((sum, row) => sum + row.principal, 0);
      expect(totalPrincipal).toBeLessThanOrEqual(f.loanAmount + 0.01);
      expect(totalPrincipal).toBeCloseTo(f.loanAmount, 1);
    });

    it('interestForCalendarYear: a year entirely after payoff returns exactly 0 (not negative)', () => {
      // The fixture loan pays off ~Feb 2051, so 2052 is fully post-payoff.
      const result = interestForCalendarYear(2052, f.loanStartDate, f.loanAmount, f.interestRate, f.monthlyMortgage);
      expect(result).toBe(0);
    });

    it('amortizationSchedule: synthetic quick payoff zeroes out subsequent months exactly', () => {
      // Small synthetic loan chosen to pay off in exactly 2 months so the
      // zero-row behavior can be verified with hand-checkable numbers:
      // month 1: interest 10, principal 590, debt 410
      // month 2: interest 4.1, principal capped at 410, debt 0
      // months 3-5: fully paid off, everything zeroed
      const start = makeDate(2025, 1, 1);
      const schedule = amortizationSchedule(1_000, 0.12, 600, start, 5);

      expect(schedule).toHaveLength(5);

      expect(schedule[0].interest).toBeCloseTo(10, 5);
      expect(schedule[0].principal).toBeCloseTo(590, 5);
      expect(schedule[0].remainingDebt).toBeCloseTo(410, 5);

      expect(schedule[1].interest).toBeCloseTo(4.1, 5);
      expect(schedule[1].principal).toBeCloseTo(410, 5);
      expect(schedule[1].payment).toBeCloseTo(414.1, 5);
      expect(schedule[1].remainingDebt).toBeCloseTo(0, 5);

      for (const row of schedule.slice(2)) {
        expect(row.interest).toBe(0);
        expect(row.principal).toBe(0);
        expect(row.payment).toBe(0);
        expect(row.remainingDebt).toBe(0);
      }
    });

    it('amortizationSchedule: months <= 0 returns an empty array', () => {
      expect(amortizationSchedule(f.loanAmount, f.interestRate, f.monthlyMortgage, f.loanStartDate, 0)).toEqual([]);
      expect(amortizationSchedule(f.loanAmount, f.interestRate, f.monthlyMortgage, f.loanStartDate, -5)).toEqual([]);
    });
  });
});
