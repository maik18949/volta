import type { Database } from '@/lib/supabase/types';
import { addMonths, monthsBetween, yearOf } from '@/lib/calculations/dateHelpers';
import {
  remainingDebt,
  amortizationSchedule,
  groupAmortizationScheduleByYear,
  trimAmortizationScheduleToPayoff,
  stagedAmortizationSchedule,
  toAnnuityRows,
  type YearlyAmortizationRow,
} from '@/lib/calculations/amortizationCalculator';
import { toLoanDisbursements, type LoanDisbursementRow } from '@/lib/data/loanDisbursements';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

export type FinancingOverviewResult =
  | { hasFinancing: false }
  | {
      hasFinancing: true;
      loanAmount: number;
      remainingDebtNow: number;
      monthlyMortgage: number;
      interestRate: number;
      amortizationRate: number;
      fixedRateEndDate: Date;
      yearsRemainingUntilFixedRateEnd: number;
      remainingDebtAtFixedRateEnd: number;
    };

/**
 * Finanzierung tab Section 1 (Finanzierungsübersicht).
 *
 * `disbursementRows` is optional and additive: omitted or empty, this is
 * byte-identical to the original single-disbursement calculation (remainingDebt
 * off loan_start_date/loan_amount). When tranches are present, remaining debt
 * is read off stagedAmortizationSchedule instead, which credits the balance
 * building up in steps rather than being fully outstanding from day one.
 */
export function computeFinancingOverview(
  property: PropertyRow,
  today: Date = new Date(),
  disbursementRows: LoanDisbursementRow[] = []
): FinancingOverviewResult {
  if (property.loan_amount <= 0) return { hasFinancing: false };

  const loanStartDate = new Date(property.loan_start_date + 'T00:00:00Z');
  const fixedRateEndDate = addMonths(loanStartDate, property.fixed_interest_period_years * 12);
  const monthsUntilFixedRateEnd = monthsBetween(today, fixedRateEndDate) - 1;

  let remainingDebtNow: number;
  let remainingDebtAtFixedRateEnd: number;

  if (disbursementRows.length > 0) {
    const disbursements = toLoanDisbursements(disbursementRows);
    const sortedStart = [...disbursements].sort((a, b) => a.date.getTime() - b.date.getTime())[0].date;
    // stagedAmortizationSchedule's row at index i represents the (i+1)-th
    // calendar month since sortedStart, payment already applied. monthsBetween
    // counts calendar months inclusively, so it's already a 1-based count of
    // "today's" month position — the "- 1" below (when indexing into the
    // array) is the only count-to-index conversion needed. Clamped to at
    // least 1 so a lookup date in sortedStart's own month still reads that
    // first row instead of an empty/undefined one.
    const monthsToToday = Math.max(1, monthsBetween(sortedStart, today));
    const monthsToFixedRateEnd = Math.max(1, monthsBetween(sortedStart, fixedRateEndDate));
    const schedule = stagedAmortizationSchedule(
      disbursements,
      property.interest_rate,
      property.monthly_mortgage,
      Math.max(monthsToToday, monthsToFixedRateEnd)
    );
    remainingDebtNow = schedule[monthsToToday - 1]?.remainingDebtTotal ?? 0;
    remainingDebtAtFixedRateEnd = schedule[monthsToFixedRateEnd - 1]?.remainingDebtTotal ?? 0;
  } else {
    const monthsSinceLoanStart = monthsBetween(loanStartDate, today) - 1;
    remainingDebtNow = remainingDebt(property.loan_amount, property.interest_rate, property.monthly_mortgage, Math.max(0, monthsSinceLoanStart));
    const monthsFromStartToFixedRateEnd = monthsBetween(loanStartDate, fixedRateEndDate) - 1;
    remainingDebtAtFixedRateEnd = remainingDebt(
      property.loan_amount,
      property.interest_rate,
      property.monthly_mortgage,
      Math.max(0, monthsFromStartToFixedRateEnd)
    );
  }

  return {
    hasFinancing: true,
    loanAmount: property.loan_amount,
    remainingDebtNow,
    monthlyMortgage: property.monthly_mortgage,
    interestRate: property.interest_rate,
    amortizationRate: property.amortization_rate,
    fixedRateEndDate,
    yearsRemainingUntilFixedRateEnd: Math.max(0, Math.floor(monthsUntilFixedRateEnd / 12)),
    remainingDebtAtFixedRateEnd,
  };
}

const MAX_AMORTIZATION_HORIZON_YEARS = 40;

export type AmortizationYearRow = YearlyAmortizationRow & {
  isCurrentYear: boolean;
  isFixedRateEndYear: boolean;
  isPostFixedRatePeriod: boolean;
};

export type AmortizationYearTableResult =
  | { hasFinancing: false; rows: AmortizationYearRow[]; fixedRateEndYear: null }
  | { hasFinancing: true; rows: AmortizationYearRow[]; fixedRateEndYear: number };

/**
 * Finanzierung tab Section 2 (Tilgungsplan) — a yearly table spanning the
 * full schedule from loanStartDate (or, with tranches, the earliest
 * disbursement) to payoff, capped at MAX_AMORTIZATION_HORIZON_YEARS.
 *
 * `disbursementRows` is optional and additive, same contract as
 * computeFinancingOverview above.
 */
export function computeAmortizationYearTable(
  property: PropertyRow,
  today: Date = new Date(),
  disbursementRows: LoanDisbursementRow[] = []
): AmortizationYearTableResult {
  if (property.loan_amount <= 0) return { hasFinancing: false, rows: [], fixedRateEndYear: null };

  const loanStartDate = new Date(property.loan_start_date + 'T00:00:00Z');
  const fixedRateEndDate = addMonths(loanStartDate, property.fixed_interest_period_years * 12);

  let trimmedSchedule;
  let scheduleLoanAmount = property.loan_amount;

  if (disbursementRows.length > 0) {
    const disbursements = toLoanDisbursements(disbursementRows);
    const stagedFull = stagedAmortizationSchedule(
      disbursements,
      property.interest_rate,
      property.monthly_mortgage,
      MAX_AMORTIZATION_HORIZON_YEARS * 12
    );
    trimmedSchedule = trimAmortizationScheduleToPayoff(toAnnuityRows(stagedFull));
    scheduleLoanAmount = disbursements.reduce((sum, d) => sum + d.amount, 0);
  } else {
    const fullSchedule = amortizationSchedule(
      property.loan_amount,
      property.interest_rate,
      property.monthly_mortgage,
      loanStartDate,
      MAX_AMORTIZATION_HORIZON_YEARS * 12
    );
    trimmedSchedule = trimAmortizationScheduleToPayoff(fullSchedule);
  }

  const yearRows = groupAmortizationScheduleByYear(trimmedSchedule, scheduleLoanAmount);

  const fixedRateEndYear = yearOf(fixedRateEndDate);
  const currentYear = today.getUTCFullYear();

  const rows: AmortizationYearRow[] = yearRows.map((row) => ({
    ...row,
    isCurrentYear: row.year === currentYear,
    isFixedRateEndYear: row.year === fixedRateEndYear,
    isPostFixedRatePeriod: row.year > fixedRateEndYear,
  }));

  return { hasFinancing: true, rows, fixedRateEndYear };
}
