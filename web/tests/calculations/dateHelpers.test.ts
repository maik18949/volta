import { describe, it, expect } from 'vitest';
import {
  firstDayOfMonth,
  makeDate,
  dayOfMonth,
  daysInMonth,
  addMonths,
  monthsBetween,
  yearOf,
  monthOf,
} from '@/lib/calculations/dateHelpers';

describe('dateHelpers', () => {
  it('daysInMonth returns 30 for June', () => {
    expect(daysInMonth(makeDate(2026, 6, 1))).toBe(30);
  });

  it('daysInMonth returns 28 for a non-leap February', () => {
    expect(daysInMonth(makeDate(2026, 2, 1))).toBe(28);
  });

  it('daysInMonth returns 29 for a leap February', () => {
    expect(daysInMonth(makeDate(2028, 2, 1))).toBe(29);
  });

  it('makeDate + dayOfMonth round-trip', () => {
    const d = makeDate(2026, 6, 16);
    expect(yearOf(d)).toBe(2026);
    expect(monthOf(d)).toBe(6);
    expect(dayOfMonth(d)).toBe(16);
  });

  it('firstDayOfMonth zeroes the day component', () => {
    const d = makeDate(2026, 6, 16);
    expect(dayOfMonth(firstDayOfMonth(d))).toBe(1);
  });

  it('addMonths advances by N calendar months', () => {
    const d = addMonths(makeDate(2025, 10, 1), 3);
    expect(yearOf(d)).toBe(2026);
    expect(monthOf(d)).toBe(1);
  });

  it('monthsBetween counts whole calendar months from start to end inclusive', () => {
    // Oct 2025 -> Dec 2025 = 3 months (Oct, Nov, Dec)
    expect(monthsBetween(makeDate(2025, 10, 1), makeDate(2025, 12, 31))).toBe(3);
  });
});
