import type { Database } from '@/lib/supabase/types';
import { makeDate, firstDayOfMonth, monthsBetween } from '@/lib/calculations/dateHelpers';
import { afaBasis } from '@/lib/calculations/depreciationCalculator';
import { remainingDebt } from '@/lib/calculations/amortizationCalculator';
import type { StatusEntry, PropertyStatus } from '@/lib/calculations/statusPeriodCalculator';
import { incomeForMonth, ownershipDayFraction } from '@/lib/calculations/statusPeriodCalculator';
import { cashflowBeforeTax, cashflowAfterTax, ownerBorneRecoverableWEForMonth } from '@/lib/calculations/cashflowCalculator';
import { annualTaxableIncome, taxEffectYearly, taxEffectMonthly } from '@/lib/calculations/taxCalculator';
import { netYield as computeNetYield, totalInvestment as computeTotalInvestment, closingCostsTotal as computeClosingCostsTotal } from '@/lib/calculations/kpiCalculator';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];

export interface PropertySummary {
  totalInvestment: number;
  totalPurchasePrice: number;
  purchasePricePerSqm: number;
  remainingDebtNow: number;
  netYield: number | null;
  currentStatus: PropertyStatus;
  cashflowAfterTaxMonthly: number;
}

function toStatusHistory(rows: StatusEntryRow[]): StatusEntry[] {
  return rows.map((row) => ({
    date: new Date(row.date + 'T00:00:00Z'),
    status: row.status as PropertyStatus,
    incomeActualMonthly: row.income_actual_monthly,
  }));
}

/**
 * Composes the pure lib/calculations/* functions against a real `properties` row
 * (DB-native units — mostly monthly, except property_tax_annual, property_management_annual,
 * property_insurance_annual, property_tax_parking_annual, which are annual).
 */
export function computePropertySummary(
  property: PropertyRow,
  statusEntryRows: StatusEntryRow[],
  today: Date = new Date()
): PropertySummary {
  const statusHistory = toStatusHistory(statusEntryRows);
  const economicTransferDate = new Date(property.economic_transfer_date + 'T00:00:00Z');
  const loanStartDate = new Date(property.loan_start_date + 'T00:00:00Z');

  const closingCostsTotal = computeClosingCostsTotal(
    property.land_transfer_tax,
    property.notary_costs,
    property.land_registry_costs,
    property.agent_fee,
    property.appraisal_costs
  );
  const totalPurchasePrice = property.purchase_price_unit + property.purchase_price_parking;
  const totalInvestment = computeTotalInvestment(
    totalPurchasePrice,
    closingCostsTotal,
    property.renovation_modernization_costs
  );
  const purchasePricePerSqm = property.living_area_sqm > 0 ? totalPurchasePrice / property.living_area_sqm : 0;

  const monthsSinceLoanStart = property.loan_amount > 0 ? monthsBetween(loanStartDate, today) - 1 : 0;
  const remainingDebtNow =
    property.loan_amount > 0
      ? remainingDebt(property.loan_amount, property.interest_rate, property.monthly_mortgage, Math.max(0, monthsSinceLoanStart))
      : 0;

  const basis = afaBasis(property.building_value, closingCostsTotal, totalPurchasePrice, property.renovation_afa_eligible);

  const currentMonth = firstDayOfMonth(today);
  const currentYear = currentMonth.getUTCFullYear();

  // NOTE: unlike the parking case below, this must NOT also subtract
  // hoa_fee_maintenance_reserve_monthly. The reserve is added back as its own
  // addend both here (operatingCostsNonRecoverableMonthly) and in the tax
  // composition (hoaUnitNonRecoverableMonthly), so subtracting it here would
  // cancel it out of both totals — confirmed against the already-tested,
  // frozen fixtures.ts (operatingCostsNonRecoverableMonthly: 192.76 = 125 +
  // 34.76 + 33) and taxCalculator.test.ts's baseInput
  // (hoaUnitNonRecoverableMonthly: 125.0), both of which use total -
  // recoverable only (125), not total - recoverable - reserve (90.24).
  const hoaFeeNonRecoverableMonthly = property.hoa_fee_total_monthly - property.hoa_fee_recoverable_monthly;
  // Parking DOES subtract its reserve here, because cashflowBeforeTax takes
  // hoaFeeParkingRecoverableMonthly and hoaFeeParkingMaintenanceReserveMonthly
  // as their own separate, independently-subtracted parameters (unlike the
  // unit case, which folds everything into one combined
  // operatingCostsNonRecoverableMonthly figure before calling cashflowBeforeTax).
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

  const ownerBorneRecoverableWEMonthly = ownerBorneRecoverableWEForMonth(
    currentMonth,
    statusHistory,
    today,
    property.hoa_fee_recoverable_monthly,
    property.property_tax_annual
  );

  const incomeThisMonth = incomeForMonth(currentMonth, statusHistory, today, property.cold_rent_monthly, property.parking_rent_monthly);

  const taxableIncomeYear = annualTaxableIncome({
    year: currentYear,
    statusHistory,
    economicTransferDate,
    loanStartDate,
    loanAmount: property.loan_amount,
    interestRate: property.interest_rate,
    monthlyMortgage: property.monthly_mortgage,
    afaBasis: basis,
    depreciationRate: property.depreciation_rate,
    hoaUnitNonRecoverableMonthly: hoaFeeNonRecoverableMonthly,
    hoaUnitRecoverableMonthly: property.hoa_fee_recoverable_monthly,
    hoaParkingNonRecoverableMonthly: hoaFeeParkingNonRecoverableMonthly,
    hoaParkingRecoverableMonthly: property.hoa_fee_parking_recoverable_monthly,
    propertyTaxUnitMonthly: property.property_tax_annual / 12,
    propertyTaxParkingMonthly: property.property_tax_parking_annual / 12,
    propertyManagementMonthly: property.property_management_annual / 12,
    otherCostsMonthly: property.other_costs_monthly,
    propertyInsuranceMonthly: property.property_insurance_annual / 12,
    coldRentMonthly: property.cold_rent_monthly,
    parkingRentMonthly: property.parking_rent_monthly,
    today,
  });
  // Sum of ownership day-fractions across the calendar year — matches taxCalculator's own
  // ownershipMonthEquivalent so the monthly divisor is consistent with the yearly figure it divides.
  let ownershipMonthsThisYear = 0;
  for (let month = 1; month <= 12; month++) {
    ownershipMonthsThisYear += ownershipDayFraction(makeDate(currentYear, month, 1), economicTransferDate);
  }
  const taxEffectYear = taxEffectYearly(taxableIncomeYear, property.marginal_tax_rate);
  const taxEffectThisMonth = taxEffectMonthly(taxEffectYear, ownershipMonthsThisYear || 12);

  const cashflowBeforeTaxThisMonth = cashflowBeforeTax({
    incomeActualMonthly: incomeThisMonth,
    monthlyMortgage: property.monthly_mortgage,
    operatingCostsNonRecoverableMonthly,
    ownerBorneRecoverableWEMonthly,
    hoaFeeParkingNonRecoverableMonthly,
    hoaFeeParkingMaintenanceReserveMonthly: property.hoa_fee_parking_maintenance_reserve_monthly,
    hoaFeeParkingRecoverableMonthly: property.hoa_fee_parking_recoverable_monthly,
    propertyTaxParkingMonthly: property.property_tax_parking_annual / 12,
    extraordinaryCostsThisMonth: 0,
  });
  const cashflowAfterTaxMonthly = cashflowAfterTax(cashflowBeforeTaxThisMonth, taxEffectThisMonth);

  const operatingCostsNonRecoverableYearly = operatingCostsNonRecoverableMonthly * 12;
  const effectiveGrossIncomeYearly =
    (property.cold_rent_monthly + property.parking_rent_monthly) * 12 * (1 - property.vacancy_rate_assumption);
  const netOperatingIncomeYearly = effectiveGrossIncomeYearly - operatingCostsNonRecoverableYearly;
  const netYield = computeNetYield(netOperatingIncomeYearly, totalInvestment);

  const currentStatus: PropertyStatus =
    [...statusHistory].reverse().find((e) => e.date.getTime() <= today.getTime())?.status ?? 'leerstand';

  return {
    totalInvestment,
    totalPurchasePrice,
    purchasePricePerSqm,
    remainingDebtNow,
    netYield,
    currentStatus,
    cashflowAfterTaxMonthly,
  };
}
