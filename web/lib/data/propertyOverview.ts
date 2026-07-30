import type { Database } from '@/lib/supabase/types';
import { toStatusHistory, type PropertySummary } from '@/lib/data/propertySummary';
import { ownershipAndVacancyDaysSinceTransfer } from '@/lib/calculations/statusPeriodCalculator';
import { annualCashflowBeforeTax } from '@/lib/calculations/cashflowCalculator';
import {
  grossYield,
  mietmultiplikator,
  dscrNOI,
  ltvRatio,
  equityUsed,
  breakEvenRentMonthly,
  cashOnCashReturn,
  actualVacancyRate,
} from '@/lib/calculations/kpiCalculator';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];
type ExtraordinaryCostRow = Database['public']['Tables']['extraordinary_costs']['Row'];

export interface OverviewMetrics {
  grossYield: number | null;
  cashOnCash: number | null;
  kaufpreisfaktor: number | null;
  dscr: number | null;
  ltv: number | null;
  actualVacancyRate: number | null;
  breakEvenRentMonthly: number;
  equityUsed: number;
  currentMarketValue: number | null;
  valueGain: number | null;
  valueGainPercent: number | null;
}

/**
 * Everything the Übersicht tab's fixed KPI bar and Card 2 (Rendite & Investment)
 * need on top of the already-existing PropertySummary — composed the same way
 * propertySummary.ts composes lib/calculations/* against a real properties row.
 */
export function computeOverviewMetrics(
  property: PropertyRow,
  statusEntryRows: StatusEntryRow[],
  extraordinaryCostRows: ExtraordinaryCostRow[],
  summary: PropertySummary,
  today: Date = new Date()
): OverviewMetrics {
  const statusHistory = toStatusHistory(statusEntryRows);
  const economicTransferDate = new Date(property.economic_transfer_date + 'T00:00:00Z');

  const coldRentYearly = property.cold_rent_monthly * 12;
  const parkingRentYearly = property.parking_rent_monthly * 12;

  const grossYieldValue = grossYield(coldRentYearly, parkingRentYearly, summary.totalPurchasePrice);
  const kaufpreisfaktorValue = mietmultiplikator(summary.totalPurchasePrice, coldRentYearly, parkingRentYearly);
  const debtServiceAnnual = property.monthly_mortgage * 12;
  const dscrValue = dscrNOI(summary.netOperatingIncomeYearly, debtServiceAnnual);
  const ltvValue = ltvRatio(summary.remainingDebtNow, summary.totalInvestment);
  const equityUsedValue = equityUsed(summary.totalInvestment, property.loan_amount);

  const { ownershipDays, leerstandDays } = ownershipAndVacancyDaysSinceTransfer(statusHistory, economicTransferDate, today);
  const actualVacancyRateValue = statusHistory.length === 0 ? null : actualVacancyRate(leerstandDays, ownershipDays);

  const hoaFeeNonRecoverableMonthly =
    property.hoa_fee_total_monthly - property.hoa_fee_recoverable_monthly - property.hoa_fee_maintenance_reserve_monthly;
  const hoaFeeParkingNonRecoverableMonthly =
    property.hoa_fee_parking_total_monthly -
    property.hoa_fee_parking_recoverable_monthly -
    property.hoa_fee_parking_maintenance_reserve_monthly;
  const operatingCostsNonRecoverableMonthly =
    hoaFeeNonRecoverableMonthly +
    property.hoa_fee_maintenance_reserve_monthly +
    property.property_management_annual / 12 +
    property.property_insurance_annual / 12 +
    property.other_costs_monthly;

  const breakEvenRentMonthlyValue = breakEvenRentMonthly(
    operatingCostsNonRecoverableMonthly +
      hoaFeeParkingNonRecoverableMonthly +
      property.hoa_fee_parking_recoverable_monthly +
      property.hoa_fee_parking_maintenance_reserve_monthly +
      property.property_tax_parking_annual / 12,
    property.monthly_mortgage
  );

  const extraordinaryCostsByMonth = new Map<string, number>();
  for (const row of extraordinaryCostRows) {
    const key = row.cost_month.slice(0, 7); // 'YYYY-MM'
    extraordinaryCostsByMonth.set(key, (extraordinaryCostsByMonth.get(key) ?? 0) + row.amount);
  }

  const currentYear = today.getUTCFullYear();
  const cashflowBeforeTaxYear = annualCashflowBeforeTax({
    year: currentYear,
    statusHistory,
    economicTransferDate,
    today,
    coldRentMonthly: property.cold_rent_monthly,
    parkingRentMonthly: property.parking_rent_monthly,
    otherIncomeMonthly: property.other_income_monthly,
    monthlyMortgage: property.monthly_mortgage,
    operatingCostsNonRecoverableMonthly,
    hoaFeeRecoverableMonthly: property.hoa_fee_recoverable_monthly,
    propertyTaxAnnual: property.property_tax_annual,
    hoaFeeParkingNonRecoverableMonthly,
    hoaFeeParkingMaintenanceReserveMonthly: property.hoa_fee_parking_maintenance_reserve_monthly,
    hoaFeeParkingRecoverableMonthly: property.hoa_fee_parking_recoverable_monthly,
    propertyTaxParkingMonthly: property.property_tax_parking_annual / 12,
    extraordinaryCostsByMonth,
  });
  const cashflowAfterTaxYear = cashflowBeforeTaxYear + summary.taxEffectYearly;
  // A separately-arranged broker commission (Eigenprovisions-Vereinbarung) is paid in cash
  // outside the notarized closing costs, so it's treated as additional invested equity here
  // (not folded into Gesamtinvestment/AfA-Basis) — it must count toward the Cash-on-Cash
  // denominator alongside equityContributed. Falls back to equityUsed when both are 0.
  const totalEquityContributed = property.equity_contributed + property.broker_commission_agreement;
  const cashOnCashDenominator = totalEquityContributed > 0 ? totalEquityContributed : equityUsedValue;
  const cashOnCashValue = cashOnCashReturn(cashflowAfterTaxYear, cashOnCashDenominator);

  const valueGain = property.current_market_value !== null ? property.current_market_value - summary.totalPurchasePrice : null;
  const valueGainPercent =
    property.current_market_value !== null && summary.totalPurchasePrice > 0
      ? (property.current_market_value - summary.totalPurchasePrice) / summary.totalPurchasePrice
      : null;

  return {
    grossYield: grossYieldValue,
    cashOnCash: cashOnCashValue,
    kaufpreisfaktor: kaufpreisfaktorValue,
    dscr: dscrValue,
    ltv: ltvValue,
    actualVacancyRate: actualVacancyRateValue,
    breakEvenRentMonthly: breakEvenRentMonthlyValue,
    equityUsed: equityUsedValue,
    currentMarketValue: property.current_market_value,
    valueGain,
    valueGainPercent,
  };
}
