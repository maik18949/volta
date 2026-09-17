import { addMonths, yearOf, monthOf, monthsBetween, makeDate } from './dateHelpers';

export interface AnnuityRow {
  month: number; // 1-based index into the schedule
  date: Date;
  interest: number;
  principal: number;
  payment: number;
  remainingDebt: number;
}

/** Calculated monthly payment (interest + amortization) — used to prefill the wizard. */
export function monthlyMortgageCalc(loanAmount: number, interestRate: number, amortizationRate: number): number {
  const interestMonthly = loanAmount * (interestRate / 12);
  const principalMonthly = loanAmount * (amortizationRate / 12);
  return interestMonthly + principalMonthly;
}

/** Dynamic remaining debt after t months (annuity formula). t = 0 returns the original loan. */
export function remainingDebt(
  loanAmount: number,
  interestRate: number,
  monthlyPayment: number,
  t: number
): number {
  if (t <= 0) return loanAmount;
  const r = interestRate / 12;
  if (r === 0) return loanAmount - monthlyPayment * t;
  const factor = Math.pow(1 + r, t);
  return loanAmount * factor - (monthlyPayment * (factor - 1)) / r;
}

/**
 * Full amortization schedule as an array of AnnuityRow, starting at loanStartDate.
 * Once the loan balance reaches zero, remaining months in the window are
 * zeroed out (no more interest/principal/payment accrues) rather than going
 * negative — a fixed nominal payment will eventually exceed the shrinking
 * balance, and the loop must not carry that overpayment into the next month.
 */
export function amortizationSchedule(
  loanAmount: number,
  interestRate: number,
  monthlyPayment: number,
  loanStartDate: Date,
  months: number
): AnnuityRow[] {
  if (months <= 0) return [];

  const r = interestRate / 12;
  const rows: AnnuityRow[] = [];
  let currentDebt = loanAmount;

  for (let t = 1; t <= months; t++) {
    if (currentDebt <= 0) {
      rows.push({
        month: t,
        date: addMonths(loanStartDate, t - 1),
        interest: 0,
        principal: 0,
        payment: 0,
        remainingDebt: 0,
      });
      continue;
    }

    const interest = currentDebt * r;
    const rawPrincipal = monthlyPayment - interest;
    // Cap the payoff month so principal never exceeds the actual remaining
    // balance (the last real-world payment is smaller than the nominal one).
    const principal = Math.max(0, Math.min(rawPrincipal, currentDebt));
    const payment = interest + principal;
    currentDebt = Math.max(0, currentDebt - principal);

    rows.push({
      month: t,
      date: addMonths(loanStartDate, t - 1),
      interest,
      principal,
      payment,
      remainingDebt: currentDebt,
    });
  }
  return rows;
}

/**
 * Total interest paid within a calendar year, using the exact amortization
 * schedule (not an approximation). Years before loanStartDate return 0.
 */
export function interestForCalendarYear(
  year: number,
  loanStartDate: Date,
  loanAmount: number,
  interestRate: number,
  monthlyPayment: number
): number {
  if (loanAmount <= 0 || interestRate <= 0 || monthlyPayment <= 0) return 0;
  if (yearOf(loanStartDate) > year) return 0;

  const yearEnd = makeDate(year, 12, 31);
  const totalMonths = monthsBetween(loanStartDate, yearEnd);
  if (totalMonths <= 0) return 0;

  const schedule = amortizationSchedule(loanAmount, interestRate, monthlyPayment, loanStartDate, totalMonths);

  return schedule.filter((row) => yearOf(row.date) === year).reduce((sum, row) => sum + row.interest, 0);
}

/**
 * Total principal (Tilgung) paid within a calendar year, using the exact amortization
 * schedule (not an approximation). Mirrors interestForCalendarYear exactly — same
 * guard clauses, same schedule — just sums `principal` instead of `interest`.
 */
export function principalForCalendarYear(
  year: number,
  loanStartDate: Date,
  loanAmount: number,
  interestRate: number,
  monthlyPayment: number
): number {
  if (loanAmount <= 0 || interestRate <= 0 || monthlyPayment <= 0) return 0;
  if (yearOf(loanStartDate) > year) return 0;

  const yearEnd = makeDate(year, 12, 31);
  const totalMonths = monthsBetween(loanStartDate, yearEnd);
  if (totalMonths <= 0) return 0;

  const schedule = amortizationSchedule(loanAmount, interestRate, monthlyPayment, loanStartDate, totalMonths);

  return schedule.filter((row) => yearOf(row.date) === year).reduce((sum, row) => sum + row.principal, 0);
}

export interface YearlyAmortizationRow {
  year: number;
  remainingDebtStart: number;
  interest: number;
  principal: number;
  payment: number;
  remainingDebtEnd: number;
}

/** Groups a monthly AnnuityRow[] schedule into per-calendar-year totals for the Finanzierung tab's Tilgungsplan table. */
export function groupAmortizationScheduleByYear(schedule: AnnuityRow[], loanAmount: number): YearlyAmortizationRow[] {
  const byYear = new Map<number, AnnuityRow[]>();
  for (const row of schedule) {
    const y = yearOf(row.date);
    const existing = byYear.get(y) ?? [];
    existing.push(row);
    byYear.set(y, existing);
  }

  const years = [...byYear.keys()].sort((a, b) => a - b);
  const result: YearlyAmortizationRow[] = [];
  let previousYearEndDebt = loanAmount;

  for (const year of years) {
    const rows = byYear.get(year)!;
    const interest = rows.reduce((sum, r) => sum + r.interest, 0);
    const principal = rows.reduce((sum, r) => sum + r.principal, 0);
    const payment = rows.reduce((sum, r) => sum + r.payment, 0);
    const remainingDebtEnd = rows[rows.length - 1].remainingDebt;

    result.push({ year, remainingDebtStart: previousYearEndDebt, interest, principal, payment, remainingDebtEnd });
    previousYearEndDebt = remainingDebtEnd;
  }

  return result;
}

/** Slices off the trailing all-zero rows amortizationSchedule appends after a loan is fully paid off. */
export function trimAmortizationScheduleToPayoff(schedule: AnnuityRow[]): AnnuityRow[] {
  const lastPaymentIndex = schedule.reduce((lastIdx, row, idx) => (row.payment > 0 ? idx : lastIdx), -1);
  if (lastPaymentIndex === -1) return schedule;
  return schedule.slice(0, lastPaymentIndex + 1);
}

export interface LoanDisbursement {
  date: Date;
  amount: number;
  deductible: boolean;
}

export interface StagedAnnuityRow {
  month: number;
  date: Date;
  interestTotal: number;
  interestDeductible: number;
  interestNonDeductible: number;
  principalTotal: number;
  remainingDebtTotal: number;
  remainingDebtDeductible: number;
  remainingDebtNonDeductible: number;
}

/**
 * Like amortizationSchedule, but the balance builds up from a list of
 * disbursements instead of being fully outstanding from day one — for a loan
 * paid out in stages (e.g. a small insurance-premium tranche before the main
 * purchase-price tranche). Interest is computed per tranche against its own
 * outstanding balance (so a non-deductible tranche's interest stays isolated);
 * the fixed monthlyPayment's principal portion is then split across tranches
 * in proportion to their current balance share — the same split the
 * "Auszahlungstranchen" prototype validated against the real bank statement.
 * Disbursements are bucketed by calendar month (not day-exact), matching the
 * rest of this app's month-granularity financing model.
 */
export function stagedAmortizationSchedule(
  disbursements: LoanDisbursement[],
  interestRate: number,
  monthlyPayment: number,
  months: number
): StagedAnnuityRow[] {
  if (disbursements.length === 0 || months <= 0) return [];

  const sorted = [...disbursements].sort((a, b) => a.date.getTime() - b.date.getTime());
  const start = sorted[0].date;
  const r = interestRate / 12;
  let outDeductible = 0;
  let outNonDeductible = 0;
  const rows: StagedAnnuityRow[] = [];

  for (let t = 0; t < months; t++) {
    const date = addMonths(start, t);
    for (const d of sorted) {
      if (yearOf(d.date) === yearOf(date) && monthOf(d.date) === monthOf(date)) {
        if (d.deductible) outDeductible += d.amount;
        else outNonDeductible += d.amount;
      }
    }

    const total = outDeductible + outNonDeductible;
    if (total <= 0.005) {
      rows.push({
        month: t + 1,
        date,
        interestTotal: 0,
        interestDeductible: 0,
        interestNonDeductible: 0,
        principalTotal: 0,
        remainingDebtTotal: Math.max(0, total),
        remainingDebtDeductible: outDeductible,
        remainingDebtNonDeductible: outNonDeductible,
      });
      continue;
    }

    const interestDeductible = outDeductible * r;
    const interestNonDeductible = outNonDeductible * r;
    const interestTotal = interestDeductible + interestNonDeductible;
    const principalTotal = Math.max(0, Math.min(monthlyPayment - interestTotal, total));
    const deductibleShare = outDeductible / total;
    const principalDeductible = principalTotal * deductibleShare;
    const principalNonDeductible = principalTotal - principalDeductible;

    outDeductible = Math.max(0, outDeductible - principalDeductible);
    outNonDeductible = Math.max(0, outNonDeductible - principalNonDeductible);

    rows.push({
      month: t + 1,
      date,
      interestTotal,
      interestDeductible,
      interestNonDeductible,
      principalTotal,
      remainingDebtTotal: outDeductible + outNonDeductible,
      remainingDebtDeductible: outDeductible,
      remainingDebtNonDeductible: outNonDeductible,
    });
  }

  return rows;
}

export interface StagedInterestForYear {
  total: number;
  deductible: number;
  nonDeductible: number;
}

/** Mirrors interestForCalendarYear, but split by deductibility — feeds taxCalculator's Werbungskosten line. */
export function stagedInterestForCalendarYear(
  year: number,
  disbursements: LoanDisbursement[],
  interestRate: number,
  monthlyPayment: number
): StagedInterestForYear {
  const ZERO = { total: 0, deductible: 0, nonDeductible: 0 };
  if (disbursements.length === 0 || interestRate <= 0 || monthlyPayment <= 0) return ZERO;

  const sorted = [...disbursements].sort((a, b) => a.date.getTime() - b.date.getTime());
  const start = sorted[0].date;
  if (yearOf(start) > year) return ZERO;

  const yearEnd = makeDate(year, 12, 31);
  const totalMonths = monthsBetween(start, yearEnd);
  if (totalMonths <= 0) return ZERO;

  const schedule = stagedAmortizationSchedule(sorted, interestRate, monthlyPayment, totalMonths);
  return schedule
    .filter((row) => yearOf(row.date) === year)
    .reduce(
      (acc, row) => ({
        total: acc.total + row.interestTotal,
        deductible: acc.deductible + row.interestDeductible,
        nonDeductible: acc.nonDeductible + row.interestNonDeductible,
      }),
      ZERO
    );
}

/** Downcasts a StagedAnnuityRow[] to plain AnnuityRow[] so groupAmortizationScheduleByYear/trimAmortizationScheduleToPayoff (which only know the simple shape) can be reused unchanged. */
export function toAnnuityRows(rows: StagedAnnuityRow[]): AnnuityRow[] {
  return rows.map((r) => ({
    month: r.month,
    date: r.date,
    interest: r.interestTotal,
    principal: r.principalTotal,
    payment: r.interestTotal + r.principalTotal,
    remainingDebt: r.remainingDebtTotal,
  }));
}
