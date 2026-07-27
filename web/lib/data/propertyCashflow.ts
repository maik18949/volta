import type { Database } from '@/lib/supabase/types';
import { cashflowLineItemsForScenario, type CashflowLineItems } from '@/lib/calculations/cashflowCalculator';
import { hoaNonRecoverableMonthly } from '@/lib/calculations/kpiCalculator';
import { computeTaxCurrentYear } from '@/lib/data/propertyTax';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];
type ExtraordinaryCostRow = Database['public']['Tables']['extraordinary_costs']['Row'];

export type CashflowScenario = 'vollvermietung' | 'leerstand';

export interface CashflowForecastMonthResult {
  scenario: CashflowScenario;
  lineItems: CashflowLineItems;
  taxEffectMonthly: number;
  cashflowAfterTax: number;
}

/**
 * Cashflow tab Card 1 ("Prognose / Monat") — a settings-only typical month
 * for the chosen scenario. taxEffectMonthly comes from computeTaxCurrentYear
 * (propertyTax.ts) so it's guaranteed to match the Steuer tab and Card 2's
 * "Steuererstattung Ø/Mon" row exactly, per spec-cashflow-tab.md.
 */
export function computeCashflowForecastMonth(
  property: PropertyRow,
  statusEntryRows: StatusEntryRow[],
  extraordinaryCostRows: ExtraordinaryCostRow[],
  scenario: CashflowScenario,
  today: Date = new Date()
): CashflowForecastMonthResult {
  const hoaFeeNonRecoverableMonthly = hoaNonRecoverableMonthly(
    property.hoa_fee_total_monthly,
    property.hoa_fee_recoverable_monthly,
    property.hoa_fee_maintenance_reserve_monthly
  );
  const hoaFeeParkingNonRecoverableMonthly = hoaNonRecoverableMonthly(
    property.hoa_fee_parking_total_monthly,
    property.hoa_fee_parking_recoverable_monthly,
    property.hoa_fee_parking_maintenance_reserve_monthly
  );

  const lineItems = cashflowLineItemsForScenario({
    scenario,
    coldRentMonthly: property.cold_rent_monthly,
    parkingRentMonthly: property.parking_rent_monthly,
    otherIncomeMonthly: property.other_income_monthly,
    monthlyMortgage: property.monthly_mortgage,
    hoaFeeNonRecoverableMonthly,
    hoaFeeMaintenanceReserveMonthly: property.hoa_fee_maintenance_reserve_monthly,
    hoaFeeRecoverableMonthly: property.hoa_fee_recoverable_monthly,
    propertyTaxAnnual: property.property_tax_annual,
    propertyInsuranceAnnual: property.property_insurance_annual,
    propertyManagementAnnual: property.property_management_annual,
    otherCostsMonthly: property.other_costs_monthly,
    hoaFeeParkingNonRecoverableMonthly,
    hoaFeeParkingMaintenanceReserveMonthly: property.hoa_fee_parking_maintenance_reserve_monthly,
    hoaFeeParkingRecoverableMonthly: property.hoa_fee_parking_recoverable_monthly,
    propertyTaxParkingAnnual: property.property_tax_parking_annual,
    extraordinaryCostsThisMonth: 0,
  });

  const { taxEffectMonthly } = computeTaxCurrentYear(property, statusEntryRows, extraordinaryCostRows, today);

  return { scenario, lineItems, taxEffectMonthly, cashflowAfterTax: lineItems.cashflowBeforeTax + taxEffectMonthly };
}
