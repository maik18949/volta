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

/** Filter out near-zero cost items (floating-point noise), not genuinely tiny real costs. */
const ZERO_AMOUNT_EPSILON_EUR = 0.005;

export interface RunningCostBreakdownItem {
  label: string;
  amountMonthly: number;
}

export interface PropertySummary {
  totalInvestment: number;
  totalPurchasePrice: number;
  purchasePricePerSqm: number;
  remainingDebtNow: number;
  netYield: number | null;
  netOperatingIncomeYearly: number;
  currentStatus: PropertyStatus;
  cashflowAfterTaxMonthly: number;
  incomeActualMonthly: number;
  cashflowBeforeTaxMonthly: number;
  taxEffectMonthly: number;
  taxEffectYearly: number;
  runningCostsBreakdown: RunningCostBreakdownItem[];
}

export function toStatusHistory(rows: StatusEntryRow[]): StatusEntry[] {
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

  // per spec-data-model.md: recoverable and reserve are both carved out of
  // the total ("davon") — reserve is added back separately below for
  // cashflow (real cash outflow) but stays excluded here for tax (not
  // deductible)
  const hoaFeeNonRecoverableMonthly =
    property.hoa_fee_total_monthly - property.hoa_fee_recoverable_monthly - property.hoa_fee_maintenance_reserve_monthly;
  const hoaFeeParkingNonRecoverableMonthly =
    property.hoa_fee_parking_total_monthly -
    property.hoa_fee_parking_recoverable_monthly -
    property.hoa_fee_parking_maintenance_reserve_monthly;

  const operatingCostsNonRecoverableMonthly =
    hoaFeeNonRecoverableMonthly +
    property.hoa_fee_maintenance_reserve_monthly +
    property.property_management_annual / 12 + // annual → monthly
    property.property_insurance_annual / 12 + // annual → monthly
    property.other_costs_monthly;

  const ownerBorneRecoverableWEMonthly = ownerBorneRecoverableWEForMonth(
    currentMonth,
    statusHistory,
    today,
    property.hoa_fee_recoverable_monthly,
    property.property_tax_annual
  );

  // Keep in sync with the cost terms cashflowBeforeTax() subtracts (see CashflowBeforeTaxInput
  // in cashflowCalculator.ts) — these are the same values, regrouped by display label instead of
  // tax-deductibility bucket.
  const runningCostsBreakdown: RunningCostBreakdownItem[] = [
    { label: 'Hausgeld (nicht umlagefähig)', amountMonthly: hoaFeeNonRecoverableMonthly },
    { label: 'Instandhaltungsrücklage', amountMonthly: property.hoa_fee_maintenance_reserve_monthly },
    { label: 'Hausverwaltung', amountMonthly: property.property_management_annual / 12 },
    { label: 'Gebäudeversicherung', amountMonthly: property.property_insurance_annual / 12 },
    { label: 'Sonstige Kosten', amountMonthly: property.other_costs_monthly },
    {
      // Stellplatz-Kosten bundles all 4 parking cost components into one display line
      // (deliberate UI simplification, not a calculation grouping).
      label: 'Stellplatz-Kosten',
      amountMonthly:
        hoaFeeParkingNonRecoverableMonthly +
        property.hoa_fee_parking_maintenance_reserve_monthly +
        property.hoa_fee_parking_recoverable_monthly +
        property.property_tax_parking_annual / 12,
    },
    { label: 'Umlagefähige Kosten während Leerstand', amountMonthly: ownerBorneRecoverableWEMonthly },
  ].filter((item) => Math.abs(item.amountMonthly) > ZERO_AMOUNT_EPSILON_EUR);

  const incomeThisMonth = incomeForMonth(
    currentMonth,
    statusHistory,
    today,
    property.cold_rent_monthly,
    property.parking_rent_monthly,
    property.other_income_monthly
  );

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
    propertyTaxUnitMonthly: property.property_tax_annual / 12, // annual → monthly
    propertyTaxParkingMonthly: property.property_tax_parking_annual / 12, // annual → monthly
    propertyManagementMonthly: property.property_management_annual / 12, // annual → monthly
    otherCostsMonthly: property.other_costs_monthly,
    propertyInsuranceMonthly: property.property_insurance_annual / 12, // annual → monthly
    coldRentMonthly: property.cold_rent_monthly,
    parkingRentMonthly: property.parking_rent_monthly,
    otherIncomeMonthly: property.other_income_monthly,
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
    propertyTaxParkingMonthly: property.property_tax_parking_annual / 12, // annual → monthly
    extraordinaryCostsThisMonth: 0,
  });
  const cashflowAfterTaxMonthly = cashflowAfterTax(cashflowBeforeTaxThisMonth, taxEffectThisMonth);

  const operatingCostsNonRecoverableYearly = operatingCostsNonRecoverableMonthly * 12;
  const effectiveGrossIncomeYearly =
    (property.cold_rent_monthly + property.parking_rent_monthly) * 12 * (1 - property.vacancy_rate_assumption);
  const netOperatingIncomeYearly = effectiveGrossIncomeYearly - operatingCostsNonRecoverableYearly;
  const netYield = computeNetYield(netOperatingIncomeYearly, totalInvestment);

  // Don't trust caller order (statusEntryRows may not arrive ascending-by-date) —
  // statusPeriodCalculator.ts sorts internally before doing this same reverse-find,
  // so this must too, for consistency.
  const sortedStatusHistory = [...statusHistory].sort((a, b) => a.date.getTime() - b.date.getTime());
  const currentStatus: PropertyStatus =
    [...sortedStatusHistory].reverse().find((e) => e.date.getTime() <= today.getTime())?.status ?? 'leerstand';

  return {
    totalInvestment,
    totalPurchasePrice,
    purchasePricePerSqm,
    remainingDebtNow,
    netYield,
    netOperatingIncomeYearly,
    currentStatus,
    cashflowAfterTaxMonthly,
    incomeActualMonthly: incomeThisMonth,
    cashflowBeforeTaxMonthly: cashflowBeforeTaxThisMonth,
    taxEffectMonthly: taxEffectThisMonth,
    taxEffectYearly: taxEffectYear,
    runningCostsBreakdown,
  };
}
