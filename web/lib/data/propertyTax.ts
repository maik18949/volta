import type { Database } from '@/lib/supabase/types';
import { toStatusHistory } from '@/lib/data/propertySummary';
import { makeDate } from '@/lib/calculations/dateHelpers';
import { ownershipDayFraction } from '@/lib/calculations/statusPeriodCalculator';
import {
  annualTaxableIncomeBreakdown,
  taxEffectYearly,
  taxEffectMonthly as computeTaxEffectMonthly,
  type TaxLineItems,
} from '@/lib/calculations/taxCalculator';
import { afaBasis as computeAfaBasis } from '@/lib/calculations/depreciationCalculator';
import { closingCostsTotal as computeClosingCostsTotal } from '@/lib/calculations/kpiCalculator';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];
type ExtraordinaryCostRow = Database['public']['Tables']['extraordinary_costs']['Row'];

function deductibleExtraordinaryCostsForYear(extraordinaryCostRows: ExtraordinaryCostRow[], year: number): number {
  return extraordinaryCostRows
    .filter((row) => row.is_deductible && row.cost_month.slice(0, 4) === String(year))
    .reduce((sum, row) => sum + row.amount, 0);
}

export interface TaxCurrentYearResult {
  year: number;
  lineItems: TaxLineItems;
  taxEffectYearly: number;
  taxEffectMonthly: number;
  transferInFuture: boolean;
  hoaUnitSplitWarning: boolean;
  hoaParkingSplitWarning: boolean;
}

/**
 * Steuer tab Section 1 ("Laufendes Jahr") — Ist + Projektion for the current
 * calendar year. Also the shared source of truth for "current year tax
 * effect": the Cashflow tab's Card 1 and Card 2 must show this exact value
 * (spec-cashflow-tab.md requires them to agree), so propertyCashflow.ts
 * (Task 9/10) calls this function rather than recomputing it.
 */
export function computeTaxCurrentYear(
  property: PropertyRow,
  statusEntryRows: StatusEntryRow[],
  extraordinaryCostRows: ExtraordinaryCostRow[],
  today: Date = new Date()
): TaxCurrentYearResult {
  const statusHistory = toStatusHistory(statusEntryRows);
  const economicTransferDate = new Date(property.economic_transfer_date + 'T00:00:00Z');
  const loanStartDate = new Date(property.loan_start_date + 'T00:00:00Z');
  const year = today.getUTCFullYear();

  const hoaFeeNonRecoverableMonthly =
    property.hoa_fee_total_monthly - property.hoa_fee_recoverable_monthly - property.hoa_fee_maintenance_reserve_monthly;
  const hoaFeeParkingNonRecoverableMonthly =
    property.hoa_fee_parking_total_monthly -
    property.hoa_fee_parking_recoverable_monthly -
    property.hoa_fee_parking_maintenance_reserve_monthly;

  const totalPurchasePrice = property.purchase_price_unit + property.purchase_price_parking;
  const closingCosts = computeClosingCostsTotal(
    property.land_transfer_tax,
    property.notary_costs,
    property.land_registry_costs,
    property.agent_fee,
    property.appraisal_costs
  );
  const basis = computeAfaBasis(property.building_value, closingCosts, totalPurchasePrice, property.renovation_afa_eligible);

  const lineItems = annualTaxableIncomeBreakdown({
    year,
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
    propertyInsuranceMonthly: property.property_insurance_annual / 12,
    otherCostsMonthly: property.other_costs_monthly,
    coldRentMonthly: property.cold_rent_monthly,
    parkingRentMonthly: property.parking_rent_monthly,
    today,
    extraordinaryCostsDeductibleYearly: deductibleExtraordinaryCostsForYear(extraordinaryCostRows, year),
  });

  let ownershipMonthsThisYear = 0;
  for (let month = 1; month <= 12; month++) {
    ownershipMonthsThisYear += ownershipDayFraction(makeDate(year, month, 1), economicTransferDate);
  }

  const taxEffectYear = taxEffectYearly(lineItems.taxableIncome, property.marginal_tax_rate);
  const taxEffectMonth = computeTaxEffectMonthly(taxEffectYear, ownershipMonthsThisYear || 12);

  return {
    year,
    lineItems,
    taxEffectYearly: taxEffectYear,
    taxEffectMonthly: taxEffectMonth,
    transferInFuture: economicTransferDate.getTime() > today.getTime(),
    hoaUnitSplitWarning: !property.is_hoa_unit_split,
    hoaParkingSplitWarning: property.parking_type !== 'nicht_vorhanden' && !property.is_hoa_parking_split,
  };
}
