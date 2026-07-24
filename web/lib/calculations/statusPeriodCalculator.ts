import { firstDayOfMonth, daysInMonth, dayOfMonth, yearOf, monthOf, makeDate } from './dateHelpers';

export type PropertyStatus = 'vermietet' | 'leerstand' | 'mietgarantie';

export interface StatusEntry {
  date: Date; // start date of this status
  status: PropertyStatus;
  incomeActualMonthly: number | null; // only populated for 'mietgarantie'
}

interface StatusSegment {
  status: PropertyStatus;
  incomeActualMonthly: number;
  dayFraction: number;
}

/**
 * Breaks a calendar month into StatusSegments based on status history.
 * Days after `today` within the current month are projected forward using
 * the last known status (so an in-progress month is part actual, part projection).
 */
function segments(month: Date, statusHistory: StatusEntry[], today: Date): StatusSegment[] {
  const totalDays = daysInMonth(month);
  const sorted = [...statusHistory].sort((a, b) => a.date.getTime() - b.date.getTime());
  const monthStart = firstDayOfMonth(month);

  const transitionDays = new Set<number>([1]);
  for (const e of sorted) {
    if (firstDayOfMonth(e.date).getTime() === monthStart.getTime()) {
      const d = dayOfMonth(e.date);
      if (d > 1) transitionDays.add(d);
    }
  }
  if (firstDayOfMonth(today).getTime() === monthStart.getTime()) {
    const tomorrow = dayOfMonth(today) + 1;
    if (tomorrow <= totalDays) transitionDays.add(tomorrow);
  }

  const sortedTransitions = [...transitionDays].sort((a, b) => a - b);
  const result: StatusSegment[] = [];

  for (let i = 0; i < sortedTransitions.length; i++) {
    const startDay = sortedTransitions[i];
    const endDay = i + 1 < sortedTransitions.length ? sortedTransitions[i + 1] - 1 : totalDays;
    const days = endDay - startDay + 1;

    const segmentDate = makeDate(yearOf(month), monthOf(month), startDay);
    const lookupDate = segmentDate.getTime() <= today.getTime() ? segmentDate : today;

    const active = [...sorted].reverse().find((e) => e.date.getTime() <= lookupDate.getTime());

    result.push({
      status: active?.status ?? 'leerstand',
      incomeActualMonthly: active?.incomeActualMonthly ?? 0,
      dayFraction: days / totalDays,
    });
  }

  return result;
}

/** Monthly income from all status segments (day-accurate). */
export function incomeForMonth(
  month: Date,
  statusHistory: StatusEntry[],
  today: Date,
  coldRentMonthly: number,
  parkingRentMonthly: number
): number {
  return segments(month, statusHistory, today).reduce((sum, seg) => {
    if (seg.status === 'vermietet') return sum + (coldRentMonthly + parkingRentMonthly) * seg.dayFraction;
    if (seg.status === 'mietgarantie') return sum + seg.incomeActualMonthly * seg.dayFraction;
    return sum; // leerstand
  }, 0);
}

/** Sum of day-fractions in the month where the status is NOT vermietet. */
export function leerstandDayFraction(month: Date, statusHistory: StatusEntry[], today: Date): number {
  return segments(month, statusHistory, today)
    .filter((seg) => seg.status !== 'vermietet')
    .reduce((sum, seg) => sum + seg.dayFraction, 0);
}

/**
 * Fraction of the month owned: 0 before acquisition, 1 for full months,
 * partial for the acquisition month itself.
 */
export function ownershipDayFraction(month: Date, economicTransferDate: Date): number {
  const monthStart = firstDayOfMonth(month);
  const transferMonth = firstDayOfMonth(economicTransferDate);

  if (monthStart.getTime() < transferMonth.getTime()) return 0;
  if (monthStart.getTime() > transferMonth.getTime()) return 1;

  const totalDays = daysInMonth(month);
  const transferDay = dayOfMonth(economicTransferDate);
  const ownedDays = totalDays - transferDay + 1;
  return ownedDays / totalDays;
}
