import type { Database } from '@/lib/supabase/types';
import { toStatusHistory } from '@/lib/data/propertySummary';
import { makeDate, firstDayOfMonth } from '@/lib/calculations/dateHelpers';
import { dominantStatusForMonth, ownershipDayFraction } from '@/lib/calculations/statusPeriodCalculator';
import type { StatusEntry, PropertyStatus } from '@/lib/calculations/statusPeriodCalculator';
import {
  cashflowLineItemsForScenario,
  cashflowLineItemsForActualMonth,
  type CashflowLineItems,
} from '@/lib/calculations/cashflowCalculator';
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

const ZERO_LINE_ITEMS: CashflowLineItems = {
  income: 0,
  mortgage: 0,
  hoaNonRecoverableWE: 0,
  maintenanceReserveWE: 0,
  insuranceWE: 0,
  managementWE: 0,
  otherCostsWE: 0,
  hoaRecoverableWE: 0,
  propertyTaxWE: 0,
  hoaNonRecoverableTE: 0,
  maintenanceReserveTE: 0,
  hoaRecoverableTE: 0,
  propertyTaxTE: 0,
  extraordinaryCosts: 0,
  cashflowBeforeTax: 0,
};

function addLineItems(a: CashflowLineItems, b: CashflowLineItems): CashflowLineItems {
  return {
    income: a.income + b.income,
    mortgage: a.mortgage + b.mortgage,
    hoaNonRecoverableWE: a.hoaNonRecoverableWE + b.hoaNonRecoverableWE,
    maintenanceReserveWE: a.maintenanceReserveWE + b.maintenanceReserveWE,
    insuranceWE: a.insuranceWE + b.insuranceWE,
    managementWE: a.managementWE + b.managementWE,
    otherCostsWE: a.otherCostsWE + b.otherCostsWE,
    hoaRecoverableWE: a.hoaRecoverableWE + b.hoaRecoverableWE,
    propertyTaxWE: a.propertyTaxWE + b.propertyTaxWE,
    hoaNonRecoverableTE: a.hoaNonRecoverableTE + b.hoaNonRecoverableTE,
    maintenanceReserveTE: a.maintenanceReserveTE + b.maintenanceReserveTE,
    hoaRecoverableTE: a.hoaRecoverableTE + b.hoaRecoverableTE,
    propertyTaxTE: a.propertyTaxTE + b.propertyTaxTE,
    extraordinaryCosts: a.extraordinaryCosts + b.extraordinaryCosts,
    cashflowBeforeTax: a.cashflowBeforeTax + b.cashflowBeforeTax,
  };
}

function divideLineItems(a: CashflowLineItems, n: number): CashflowLineItems {
  return {
    income: a.income / n,
    mortgage: a.mortgage / n,
    hoaNonRecoverableWE: a.hoaNonRecoverableWE / n,
    maintenanceReserveWE: a.maintenanceReserveWE / n,
    insuranceWE: a.insuranceWE / n,
    managementWE: a.managementWE / n,
    otherCostsWE: a.otherCostsWE / n,
    hoaRecoverableWE: a.hoaRecoverableWE / n,
    propertyTaxWE: a.propertyTaxWE / n,
    hoaNonRecoverableTE: a.hoaNonRecoverableTE / n,
    maintenanceReserveTE: a.maintenanceReserveTE / n,
    hoaRecoverableTE: a.hoaRecoverableTE / n,
    propertyTaxTE: a.propertyTaxTE / n,
    extraordinaryCosts: a.extraordinaryCosts / n,
    cashflowBeforeTax: a.cashflowBeforeTax / n,
  };
}

function scaleLineItems(a: CashflowLineItems, factor: number): CashflowLineItems {
  return {
    income: a.income * factor,
    mortgage: a.mortgage * factor,
    hoaNonRecoverableWE: a.hoaNonRecoverableWE * factor,
    maintenanceReserveWE: a.maintenanceReserveWE * factor,
    insuranceWE: a.insuranceWE * factor,
    managementWE: a.managementWE * factor,
    otherCostsWE: a.otherCostsWE * factor,
    hoaRecoverableWE: a.hoaRecoverableWE * factor,
    propertyTaxWE: a.propertyTaxWE * factor,
    hoaNonRecoverableTE: a.hoaNonRecoverableTE * factor,
    maintenanceReserveTE: a.maintenanceReserveTE * factor,
    hoaRecoverableTE: a.hoaRecoverableTE * factor,
    propertyTaxTE: a.propertyTaxTE * factor,
    extraordinaryCosts: a.extraordinaryCosts * factor,
    cashflowBeforeTax: a.cashflowBeforeTax * factor,
  };
}

/**
 * A single month's line items — falls back to the vollvermietung scenario
 * (ignoring statusHistory entirely) when there is no status history at all,
 * per spec-cashflow-tab.md ("Kein StatusEntry vorhanden"): "no data yet"
 * must not be read as "vacant" (which cashflowLineItemsForActualMonth would
 * otherwise do, since an empty history defaults every day to leerstand).
 */
function lineItemsForMonth(
  property: PropertyRow,
  statusHistory: StatusEntry[],
  monthDate: Date,
  today: Date,
  extraordinaryCostsThisMonth: number,
  hoaFeeNonRecoverableMonthly: number,
  hoaFeeParkingNonRecoverableMonthly: number
): CashflowLineItems {
  if (statusHistory.length === 0) {
    return cashflowLineItemsForScenario({
      scenario: 'vollvermietung',
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
      extraordinaryCostsThisMonth,
    });
  }
  return cashflowLineItemsForActualMonth({
    month: monthDate,
    statusHistory,
    today,
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
    extraordinaryCostsThisMonth,
  });
}

export interface CashflowMonthColumn {
  month: number;
  isProjection: boolean;
  isOwned: boolean;
  statusLabel: PropertyStatus | null;
  lineItems: CashflowLineItems;
  extraordinaryCostRows: ExtraordinaryCostRow[];
  cashflowAfterTax: number | null;
}

export interface CashflowYearTableResult {
  year: number;
  isFutureYear: boolean;
  months: CashflowMonthColumn[];
  ownershipMonthCount: number;
  avgColumn: CashflowLineItems | null;
  totalColumn: CashflowLineItems | null;
  extraordinaryCostsTotalForYear: number;
  extraordinaryCostsAvgForYear: number | null;
  extraordinaryCostsEntryCountForYear: number;
  taxEffectMonthly: number | null;
  hoaUnitSplitWarning: boolean;
  hoaParkingSplitWarning: boolean;
}

/** Cashflow tab Card 2 — the 12-month year table. */
export function computeCashflowYearTable(
  property: PropertyRow,
  statusEntryRows: StatusEntryRow[],
  extraordinaryCostRows: ExtraordinaryCostRow[],
  year: number,
  today: Date = new Date()
): CashflowYearTableResult {
  const statusHistory = toStatusHistory(statusEntryRows);
  const economicTransferDate = new Date(property.economic_transfer_date + 'T00:00:00Z');
  const currentYear = today.getUTCFullYear();
  const isFutureYear = year > currentYear;

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

  const extraordinaryCostsByMonth = new Map<string, ExtraordinaryCostRow[]>();
  for (const row of extraordinaryCostRows) {
    const key = row.cost_month.slice(0, 7);
    const existing = extraordinaryCostsByMonth.get(key) ?? [];
    existing.push(row);
    extraordinaryCostsByMonth.set(key, existing);
  }

  const { taxEffectMonthly: currentYearTaxEffectMonthly } = computeTaxCurrentYear(
    property,
    statusEntryRows,
    extraordinaryCostRows,
    today
  );

  const months: CashflowMonthColumn[] = [];
  let ownershipMonthCount = 0;
  let sumLineItems = ZERO_LINE_ITEMS;

  for (let m = 1; m <= 12; m++) {
    const monthDate = makeDate(year, m, 1);
    const ownerFraction = ownershipDayFraction(monthDate, economicTransferDate);
    const key = `${year}-${String(m).padStart(2, '0')}`;
    const monthCostRows = extraordinaryCostsByMonth.get(key) ?? [];
    const extraordinaryCostsThisMonth = monthCostRows.reduce((sum, row) => sum + row.amount, 0);

    if (ownerFraction <= 0) {
      months.push({
        month: m,
        isProjection: monthDate.getTime() > firstDayOfMonth(today).getTime(),
        isOwned: false,
        statusLabel: null,
        lineItems: ZERO_LINE_ITEMS,
        extraordinaryCostRows: monthCostRows,
        cashflowAfterTax: null,
      });
      continue;
    }

    const rawLineItems = lineItemsForMonth(
      property,
      statusHistory,
      monthDate,
      today,
      extraordinaryCostsThisMonth,
      hoaFeeNonRecoverableMonthly,
      hoaFeeParkingNonRecoverableMonthly
    );
    const lineItems = scaleLineItems(rawLineItems, ownerFraction);

    ownershipMonthCount += ownerFraction;
    sumLineItems = addLineItems(sumLineItems, lineItems);

    months.push({
      month: m,
      isProjection: statusHistory.length === 0 || monthDate.getTime() > firstDayOfMonth(today).getTime(),
      isOwned: true,
      statusLabel: statusHistory.length === 0 ? null : dominantStatusForMonth(monthDate, statusHistory, today),
      lineItems,
      extraordinaryCostRows: monthCostRows,
      cashflowAfterTax: isFutureYear ? null : lineItems.cashflowBeforeTax + currentYearTaxEffectMonthly,
    });
  }

  const yearCostRows = extraordinaryCostRows.filter((row) => row.cost_month.slice(0, 4) === String(year));
  const extraordinaryCostsTotalForYear = yearCostRows.reduce((sum, row) => sum + row.amount, 0);
  const extraordinaryCostsEntryCountForYear = yearCostRows.length;

  return {
    year,
    isFutureYear,
    months,
    ownershipMonthCount,
    avgColumn: ownershipMonthCount > 0 ? divideLineItems(sumLineItems, ownershipMonthCount) : null,
    totalColumn: ownershipMonthCount > 0 ? sumLineItems : null,
    extraordinaryCostsTotalForYear,
    extraordinaryCostsAvgForYear:
      extraordinaryCostsEntryCountForYear >= 2 ? extraordinaryCostsTotalForYear / extraordinaryCostsEntryCountForYear : null,
    extraordinaryCostsEntryCountForYear,
    taxEffectMonthly: isFutureYear ? null : currentYearTaxEffectMonthly,
    hoaUnitSplitWarning: !property.is_hoa_unit_split,
    hoaParkingSplitWarning: property.parking_type !== 'nicht_vorhanden' && !property.is_hoa_parking_split,
  };
}
