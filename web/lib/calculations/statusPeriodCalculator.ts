import { firstDayOfMonth, daysInMonth, dayOfMonth, yearOf, monthOf, makeDate, addMonths } from './dateHelpers';

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
 *
 * For a month entirely after `today` (a fully future month), every segment's
 * lookup clamps to `today` (see `lookupDate` below), not to the segment's own
 * date. That means a `StatusEntry` dated after `today` is NOT picked up until
 * `today` itself reaches that entry's month — future-dated entries don't
 * "kick in early" just because a later month is being projected. Segments can
 * still be split at a future entry's day-of-month (transition-day detection
 * below doesn't care whether the entry is before or after `today`), but until
 * `today` catches up, both sides of that split resolve to the same
 * as-of-`today` status.
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
  // Most-recent-first view of history, built once: `find` below walks it to pick
  // the active entry as of a lookup date. When multiple entries share the same
  // `date`, `sort` is stable, so the one that appeared LATER in the caller-supplied
  // `statusHistory` array sorts later within that tie and is reversed to the FRONT
  // here — i.e. later-in-input wins the tie. There's no explicit tiebreaker field
  // on StatusEntry, so callers relying on same-day entries must order them intentionally.
  const mostRecentFirst = [...sorted].reverse();

  for (let i = 0; i < sortedTransitions.length; i++) {
    const startDay = sortedTransitions[i];
    const endDay = i + 1 < sortedTransitions.length ? sortedTransitions[i + 1] - 1 : totalDays;
    const days = endDay - startDay + 1;

    const segmentDate = makeDate(yearOf(month), monthOf(month), startDay);
    const lookupDate = segmentDate.getTime() <= today.getTime() ? segmentDate : today;

    const active = mostRecentFirst.find((e) => e.date.getTime() <= lookupDate.getTime());

    result.push({
      status: active?.status ?? 'leerstand',
      incomeActualMonthly: active?.incomeActualMonthly ?? 0,
      dayFraction: days / totalDays,
    });
  }

  return result;
}

/** Monthly income from all status segments (day-accurate). otherIncomeMonthly counts only while vermietet — matches cashflowLineItemsForScenario's treatment of it as occupancy-tied. */
export function incomeForMonth(
  month: Date,
  statusHistory: StatusEntry[],
  today: Date,
  coldRentMonthly: number,
  parkingRentMonthly: number,
  otherIncomeMonthly: number
): number {
  return segments(month, statusHistory, today).reduce((sum, seg) => {
    if (seg.status === 'vermietet') return sum + (coldRentMonthly + parkingRentMonthly + otherIncomeMonthly) * seg.dayFraction;
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
 * Sum of day-fractions in the month where the status is genuinely 'leerstand' —
 * unlike leerstandDayFraction, this excludes 'mietgarantie' (guaranteed rent still
 * flows during that status, so it isn't vacancy in the sense the "Tatsächliche
 * Leerstandsquote" KPI means). Only feeds that KPI; owner-cost-bearing calculations
 * elsewhere (cashflow/tax) correctly keep using leerstandDayFraction instead.
 */
export function genuineVacancyDayFraction(month: Date, statusHistory: StatusEntry[], today: Date): number {
  return segments(month, statusHistory, today)
    .filter((seg) => seg.status === 'leerstand')
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

export interface OwnershipVacancyDays {
  ownershipDays: number;
  leerstandDays: number;
}

/**
 * Cumulative ownership days and (ownership-weighted) genuine-leerstand days from
 * economicTransferDate's month through today's month — feeds
 * kpiCalculator.actualVacancyRate. Uses the same ownerFraction-weighting as
 * taxCalculator.annualTaxableIncome so a mid-month acquisition month doesn't
 * overcount leerstand for days before the transfer. Deliberately uses
 * genuineVacancyDayFraction (not leerstandDayFraction) — 'mietgarantie' periods
 * have guaranteed rent flowing and shouldn't inflate this KPI's vacancy rate.
 */
export function ownershipAndVacancyDaysSinceTransfer(
  statusHistory: StatusEntry[],
  economicTransferDate: Date,
  today: Date
): OwnershipVacancyDays {
  let ownershipDays = 0;
  let leerstandDays = 0;
  let month = firstDayOfMonth(economicTransferDate);
  const lastMonth = firstDayOfMonth(today);

  while (month.getTime() <= lastMonth.getTime()) {
    const totalDays = daysInMonth(month);
    const ownerFraction = ownershipDayFraction(month, economicTransferDate);
    const vacancyFraction = genuineVacancyDayFraction(month, statusHistory, today);
    ownershipDays += ownerFraction * totalDays;
    leerstandDays += ownerFraction * vacancyFraction * totalDays;
    month = addMonths(month, 1);
  }

  return { ownershipDays: Math.round(ownershipDays), leerstandDays: Math.round(leerstandDays) };
}

/**
 * The status with the most cumulative days across all of `month`'s segments
 * (a status can appear in multiple non-adjacent segments within one month) —
 * feeds the Cashflow year table's per-column status badge. Ties keep
 * whichever status was encountered first while summing `monthSegments` in
 * order (the chronologically earliest one), since no explicit tiebreaker is
 * specified.
 */
export function dominantStatusForMonth(month: Date, statusHistory: StatusEntry[], today: Date): PropertyStatus {
  const monthSegments = segments(month, statusHistory, today);
  const totalsByStatus = new Map<PropertyStatus, number>();
  for (const seg of monthSegments) {
    totalsByStatus.set(seg.status, (totalsByStatus.get(seg.status) ?? 0) + seg.dayFraction);
  }
  let bestStatus: PropertyStatus = monthSegments[0].status;
  let bestTotal = -1;
  for (const [status, total] of totalsByStatus) {
    if (total > bestTotal) {
      bestStatus = status;
      bestTotal = total;
    }
  }
  return bestStatus;
}
