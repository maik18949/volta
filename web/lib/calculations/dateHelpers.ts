/**
 * All dates are constructed at UTC midnight so day/month arithmetic is
 * timezone-independent (calculation layer never deals in wall-clock time).
 */

export function makeDate(year: number, month: number, day: number = 1): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

export function yearOf(date: Date): number {
  return date.getUTCFullYear();
}

export function monthOf(date: Date): number {
  return date.getUTCMonth() + 1;
}

export function dayOfMonth(date: Date): number {
  return date.getUTCDate();
}

export function firstDayOfMonth(date: Date): Date {
  return makeDate(yearOf(date), monthOf(date), 1);
}

export function daysInMonth(date: Date): number {
  return new Date(Date.UTC(yearOf(date), monthOf(date), 0)).getUTCDate();
}

/** Returns the first day of the month that is `months` after `date`'s month (day component is not preserved). */
export function addMonths(date: Date, months: number): Date {
  const totalMonths = (yearOf(date) - 1) * 12 + (monthOf(date) - 1) + months;
  const year = Math.floor(totalMonths / 12) + 1;
  const month = (totalMonths % 12) + 1;
  return makeDate(year, month, 1);
}

/** Number of whole calendar months from `start`'s month to `end`'s month, inclusive. */
export function monthsBetween(start: Date, end: Date): number {
  const startTotal = yearOf(start) * 12 + (monthOf(start) - 1);
  const endTotal = yearOf(end) * 12 + (monthOf(end) - 1);
  return endTotal - startTotal + 1;
}
