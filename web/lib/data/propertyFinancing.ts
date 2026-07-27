import type { Database } from '@/lib/supabase/types';
import { addMonths, monthsBetween, yearOf } from '@/lib/calculations/dateHelpers';
import {
  remainingDebt,
  amortizationSchedule,
  groupAmortizationScheduleByYear,
  trimAmortizationScheduleToPayoff,
  type YearlyAmortizationRow,
} from '@/lib/calculations/amortizationCalculator';

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

/** Finanzierung tab Section 1 (Finanzierungsübersicht). */
export function computeFinancingOverview(property: PropertyRow, today: Date = new Date()): FinancingOverviewResult {
  if (property.loan_amount <= 0) return { hasFinancing: false };

  const loanStartDate = new Date(property.loan_start_date + 'T00:00:00Z');
  const monthsSinceLoanStart = monthsBetween(loanStartDate, today) - 1;
  const remainingDebtNow = remainingDebt(property.loan_amount, property.interest_rate, property.monthly_mortgage, Math.max(0, monthsSinceLoanStart));

  const fixedRateEndDate = addMonths(loanStartDate, property.fixed_interest_period_years * 12);
  const monthsUntilFixedRateEnd = monthsBetween(today, fixedRateEndDate) - 1;
  const monthsFromStartToFixedRateEnd = monthsBetween(loanStartDate, fixedRateEndDate) - 1;
  const remainingDebtAtFixedRateEnd = remainingDebt(
    property.loan_amount,
    property.interest_rate,
    property.monthly_mortgage,
    Math.max(0, monthsFromStartToFixedRateEnd)
  );

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
 * full schedule from loanStartDate to payoff, capped at
 * MAX_AMORTIZATION_HORIZON_YEARS so a degenerate (near-interest-only) loan
 * can't produce an effectively unbounded table.
 */
export function computeAmortizationYearTable(property: PropertyRow, today: Date = new Date()): AmortizationYearTableResult {
  if (property.loan_amount <= 0) return { hasFinancing: false, rows: [], fixedRateEndYear: null };

  const loanStartDate = new Date(property.loan_start_date + 'T00:00:00Z');
  const fullSchedule = amortizationSchedule(
    property.loan_amount,
    property.interest_rate,
    property.monthly_mortgage,
    loanStartDate,
    MAX_AMORTIZATION_HORIZON_YEARS * 12
  );
  const trimmedSchedule = trimAmortizationScheduleToPayoff(fullSchedule);
  const yearRows = groupAmortizationScheduleByYear(trimmedSchedule, property.loan_amount);

  const fixedRateEndDate = addMonths(loanStartDate, property.fixed_interest_period_years * 12);
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
